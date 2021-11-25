import { execSync } from "child_process";
import crypto from "crypto";
import { existsSync, mkdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import debugFunc from "debug";
import { basename } from "path";
const dir = `${tmpdir()}/cub-detector`;
if(!existsSync(dir)) mkdirSync(dir);
export default async function getFrames(vid, totalFrames = 10) {
	const name = basename(vid);
	const rand = crypto.randomBytes(16).toString("hex");
	const shortRand = rand.slice(0, 6);
	const debug = debugFunc(`is-cub:get-frames:${shortRand}`);
	debug("Processing %s (%s) - Chosen Random ID: %s (%s)", vid, name, rand, shortRand);
	mkdirSync(`${dir}/${rand}`);
	const frames = Number(execSync(`ffprobe -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets -of csv=p=0 ${vid}`).toString().slice(0, -1));
	debug("Found %d frames.", frames);
	const selected = [], res = [];
	let i = 0;
	function selectFrames() {
		const sel = Math.floor(Math.random() * frames) + 1;
		if(selected.includes(sel)) return selectFrames();
		else {
			try {
				i++;
				selected.push(sel);
				debug("Selected frame %d (%d/%d), extracting to %s", sel, i, totalFrames, `${dir}/${rand}/frame_${sel}.png`);
				execSync(`ffmpeg -i ${vid} -vf select='between(n\\,${sel}\\,${sel})' -vsync 0 ${dir}/${rand}/frame_${sel}.png`, { stdio: "ignore" });
				res.push(`${dir}/${rand}/frame_${sel}.png`);
			} catch {
				i--;
				selected.splice(selected.indexOf(sel), 1);
			}
			// this can be increased as needed to improve accuracy
			if(selected.length < totalFrames) return selectFrames();
		}
	}
	if(frames <= 10) {
		debug("Recieved 10 or less frames, selecting a maximum of 1 frame.");
		totalFrames = 1;
	}
	else if(frames <= 50) {
		debug("Recieved 50 or less frames, selecting a maximum of 3 frames.");
		if(totalFrames > 3) totalFrames = 3;
	}
	selectFrames();
	debug("using frame(s) %o", selected.sort((a, b) => a - b));
	return {
		frames: res,
		done: () => rmSync(`${dir}/${rand}`, { recursive: true, force: true })
	};
}
