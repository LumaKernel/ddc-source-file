import type { Denops } from "jsr:@denops/std@^7.0.1";
import * as fn from "jsr:@denops/std@^7.0.1/function";

// deno-lint-ignore no-explicit-any
const createCaller = (name: string): any => {
  return async (denops: Denops, ...args: unknown[]) => {
    return await fn.call(denops, name, args);
  };
};

export type Info = (
  denops: Denops,
  inputLine: string,
  filenameChars: string,
  isPosix: boolean,
) => Promise<[
  string,
  string,
  string,
]>;
export const info = createCaller(
  "ddc_file#internal#info",
) as Info;
