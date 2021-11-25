// https://stackoverflow.com/a/51771139
import "./disable_warn.js";
import TeachableMachine from "@sashido/teachablemachine-node";
import { fileTypeFromFile } from "file-type";
import debugFunc from "debug";
const debug = debugFunc("is-cub");
import getFrames from "./get-frames.js";
import { readFileSync } from "fs";
import { basename } from "path";
const model = new TeachableMachine({
	modelUrl: "https://teachablemachine.withgoogle.com/models/easeCRv0Q/"
});

let i = 0;
async function awaitReady(time = 1000) {
	i++;
	if(!model) {
		debug("(try %d) Model is not ready, retrying in %d ms...", i, time);
		await new Promise(resolve => setTimeout(resolve, time));
		return awaitReady(time);
	} else {
		let ready;
		try {
			await model.checkModel();
			ready = true;
		} catch {
			ready = false;
		}

		if(!ready) {
			debug("(try %d) Model is not ready, retrying in %d ms...", i, time);
			await new Promise(resolve => setTimeout(resolve, time));
			return awaitReady(time);
		}
	}
}

/**
 * @typedef SingleResponse - singular response
 * @prop {boolean} cub - if the provided image if cub
 * @prop {number} sureness - how sure we are that the image is or isn't cub
 * @prop {object} scores - the individual scores
 * @prop {number} scores.cub
 * @prop {number} scores.notCub 
 */

/**
 * @typedef IndividualAnimatedResponse
 * @prop {number} frame - the frame this response was generated from
 * @prop {boolean} cub - if the provided image if cub
 * @prop {number} sureness - how sure we are that the image is or isn't cub
 * @prop {object} scores - the individual scores
 * @prop {number} scores.cub
 * @prop {number} scores.notCub 
 */

/**
 * @typedef AnimatedResponse - Animated or video response
 * @prop {boolean} cub - if the provided image if cub
 * @prop {number} sureness - how sure we are that the image is or isn't cub
 * @prop {object} scores - the individual scores
 * @prop {number} scores.cub
 * @prop {number} scores.notCub 
 * @prop {Array<IndividualAnimatedResponse>} individual - the frame specific scores
 * @prop {object} overall - frames sorted into which category they ended up in
 * @prop {Array<IndividualAnimatedResponse>} overall.cub
 * @prop {Array<IndividualAnimatedResponse>} overall.notCub
 */

function condenseMulti(val) {
	const totalCubScore = parseFloat((val.reduce((a,b) => a + b.scores.cub, 0) / val.length).toFixed(2));
	const totalNotCubScore = parseFloat((val.reduce((a,b) => a + b.scores.notCub, 0) / val.length).toFixed(2));
	return {
		cub: totalCubScore === 100 || totalCubScore > totalNotCubScore,
		sureness: (totalCubScore === 100 || totalCubScore > totalNotCubScore) ? totalCubScore : totalNotCubScore,
		scores: {
			cub: totalCubScore,
			notCub: totalNotCubScore
		},
		individual: val,
		overall: {
			cub: val.filter(r => r.cub),
			notCub: val.filter(r => !r.cub)
		}
	}
}

/**
 * 
 * @param {string} file - the file to process
 * @param {number} [sampleSize=5] - the sample size for video files
 * @returns {Promise<SingleResponse | AnimatedResponse>} 
 */
async function isCub(file, sampleSize = 5) {
	await awaitReady();
	const { mime } = await fileTypeFromFile(file);
	if(mime && mime.startsWith("video/") || mime === "image/gif") {
		const { frames, done } = await getFrames(file, sampleSize);
		const all = await Promise.all(frames.map(async(f) => ({ frame: Number(basename(f).split(".")[0].split("_")[1]), ...(await isCub(f)) })));
		done();
		return condenseMulti(all);
	} else {
		const check = await model.classify({
			imageUrl: `data:${mime};base64,${Buffer.from(readFileSync(file)).toString("base64")}`
		}).catch(err => err);
		if(!Array.isArray(check)) throw new Error(`Recieved non-array response: ${typeof check === "object" ? JSON.stringify(check) : check}`);
		const cubScore = parseFloat((check.find(c => c.class === "Cub").score * 100).toFixed(2));
		const notCubScore = parseFloat((check.find(c => c.class === "Not Cub").score * 100).toFixed(2));
		return {
			cub: cubScore === 100 || cubScore > notCubScore,
			sureness: (cubScore === 100 || cubScore > notCubScore) ? cubScore : notCubScore,
			scores: {
				cub: cubScore < 1 ? 0 : cubScore,
				notCub: notCubScore < 1 ? 0 : notCubScore
			}
		}
	}
}

export default isCub;
export { isCub, getFrames };
export function getModel() { return model; }
