import type { Denops } from "@denops/std";
import * as fn from "@denops/std/function";

const createCaller = <T>(name: string): T =>
  (async (denops: Denops, ...args: unknown[]) =>
    await fn.call(denops, name, args)) as unknown as T;

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
export const info: Info = createCaller<Info>(
  "ddc_file#internal#info",
);
