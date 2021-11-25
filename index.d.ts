import TeachableMachine from "@sashido/teachablemachine-node";

declare namespace IsCub {
	export function isCub(file: string, sampleSize?: number): Promise<SingleResponse | AnimatedResponse>;
	export default isCub;

	export interface SingleResponse {
		cub: boolean;
		sureness: number;
		scores: Record<"cub" | "notCub", number>;
	}

	export interface IndividualAnimatedResponse extends SingleResponse {
		frame: number;
	}

	export interface AnimatedResponse extends SingleResponse {
		individual: Array<IndividualAnimatedResponse>;
		overall: Record<"cub" | "notCub", Array<IndividualAnimatedResponse>>;
	}

	export function getModel(): TeachableMachine; 
	export function getFrames(vid: string, totalFrames?: number): Promise<{ frames: Array<string>; done(): undefined; }>;
}

export = IsCub;
