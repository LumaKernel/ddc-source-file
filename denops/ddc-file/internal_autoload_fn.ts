import { Denops, fn } from "./deps.ts";
export type { Denops };
export { fn };

// deno-lint-ignore no-explicit-any
const createCaller = (name: string): any => {
  return async (denops: Denops, ...args: unknown[]) => {
    return await fn.call(denops, name, args);
  };
};

export type Info = (
  denops: Denops,
  pat: string,
) => Promise<[
  string,
  string,
]>;
export const info = createCaller(
  "ddc_file#internal#info",
) as Info;
