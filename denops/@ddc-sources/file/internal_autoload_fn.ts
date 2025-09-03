import type { Denops } from "@denops/std";
import * as fn from "@denops/std/function";

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
