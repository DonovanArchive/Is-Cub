#!/usr/bin/env node
import debug from "debug";
import { isCub } from "./index.js";
debug.enable("is-cub:get-frames*");

const file = process.argv[2];
let sampleSize = process.argv[3];

if(!file) {
	console.log("No File Provided.");
	process.exit(-1);
}

if(sampleSize) {
	sampleSize = Number(sampleSize);
	if(isNaN(sampleSize) || sampleSize < 1) {
		console.log("Invalid Sample Size Provided.");
		process.exit(-1);
	}
}

const res = await isCub(file, sampleSize);

console.log("Is Cub: %s (%d)", res.cub ? "Yes" : "No", res.sureness);
