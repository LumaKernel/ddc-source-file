import { asserts, fromA, path } from "./deps.ts";
import * as util from "./util.ts";

const createVirtualDirReader: (
  virtualStorage: Record<string, string[]>,
) => util.DirReader = (virtualStorage) => (abs: string) =>
  fromA(virtualStorage[abs] ?? []);

Deno.test({
  name: "findMarkers() for posix",
  async fn() {
    const reader = createVirtualDirReader({
      "/": ["1", "3"],
      "/a": ["x"],
      "/a/b": ["3"],
      "/a/b/c": [],
      "/a/b/c/d": ["2", "y"],
    });
    asserts.assertEquals(
      await util.findMarkers(
        0,
        "/a/b/c/d",
        ["1", "2", "3"],
        path.posix,
        reader,
      ),
      [],
    );
    asserts.assertEquals(
      await util.findMarkers(
        1,
        "/a/b/c/d",
        ["1", "2", "3"],
        path.posix,
        reader,
      ),
      ["/a/b/c/d"],
    );
    asserts.assertEquals(
      await util.findMarkers(
        2,
        "/a/b/c/d",
        ["1", "2", "3"],
        path.posix,
        reader,
      ),
      ["/a/b/c/d", "/a/b"],
    );
    asserts.assertEquals(
      await util.findMarkers(
        3,
        "/a/b/c/d",
        ["1", "2", "3"],
        path.posix,
        reader,
      ),
      ["/a/b/c/d", "/a/b", "/"],
    );
    asserts.assertEquals(
      await util.findMarkers(
        4,
        "/a/b/c/d",
        ["1", "2", "3"],
        path.posix,
        reader,
      ),
      ["/a/b/c/d", "/a/b", "/"],
    );
  },
});

Deno.test({
  name: "findMarkers() for win32 C:\\...",
  async fn() {
    const reader = createVirtualDirReader({
      "C:\\": ["1", "3"],
      "C:\\a": ["x"],
      "C:\\a\\b": ["2"],
    });
    asserts.assertEquals(
      await util.findMarkers(
        1,
        "C:\\a\\b",
        ["1", "2", "3"],
        path.win32,
        reader,
      ),
      ["C:\\a\\b"],
    );
    asserts.assertEquals(
      await util.findMarkers(
        3,
        "C:\\a\\b",
        ["1", "2", "3"],
        path.win32,
        reader,
      ),
      ["C:\\a\\b", "C:\\"],
    );
  },
});

Deno.test({
  name: "findMarkers() for win32 \\\\dir\\to\\path...",
  async fn() {
    // \\dir is root
    const reader = createVirtualDirReader({
      "\\\\": ["1", "3"],
      "\\\\dir\\to": ["x"],
      "\\\\dir\\to\\path": ["2"],
    });
    asserts.assertEquals(
      await util.findMarkers(
        1,
        "\\\\dir\\to\\path",
        ["1", "2", "3"],
        path.win32,
        reader,
      ),
      ["\\\\dir\\to\\path"],
    );
    asserts.assertEquals(
      await util.findMarkers(
        3,
        "\\\\dir\\to\\path",
        ["1", "2", "3"],
        path.win32,
        reader,
      ),
      ["\\\\dir\\to\\path"],
    );
  },
});
