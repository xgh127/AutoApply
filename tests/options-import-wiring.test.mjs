import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/options.js", import.meta.url), "utf8");

assert.match(source, /function setResumeImportFeedback\(message, state = ""\)/);
assert.match(source, /setResumeImportFeedback\("提示词已复制。/);
assert.match(source, /setResumeImportFeedback\(\n\s+"已生成导入预览。/);

console.log("Options import wiring test passed");
