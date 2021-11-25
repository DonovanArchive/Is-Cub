#!/usr/bin/env node
import debug from "debug";
import { program } from "commander";
import { isCub } from "./index.js";
import { existsSync } from "fs";
import fetch from "node-fetch";

program
	.argument("<input>", "The file or url to classify")
	.option("-s, --sample-size <amount>", "Amount of frames to sample from gif & video", undefined)
	.option("-j, --json", "If the raw json should be output", false)
	.parse(process.argv);

const [input] = program.args;
const { sampleSize, json } = program.opts();
if(!input) {
	console.log("No Input  Provided.");
	process.exit(-1);
}

if(isNaN(sampleSize) || sampleSize < 1) {
	console.log("Invalid Sample Size Provided.");
	process.exit(-1);
}
if(!json) debug.enable("is-cub:get-frames*");

const res = await isCub(input, sampleSize);

if(json) process.stdout.write(JSON.stringify(res));
else console.log("Is Cub: %s (%d)", res.cub ? "Yes" : "No", res.sureness);
