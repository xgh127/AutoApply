import assert from "node:assert/strict";
import {
  buildResumeImportPrompt,
  parseResumeImportResponse
} from "../src/ai-resume-import.mjs";

const fieldCatalog = [
  {
    key: "basic",
    title: "Basic information",
    kind: "simple",
    fields: [
      { label: "Name", type: "text" },
      { label: "Email", type: "text" }
    ]
  },
  {
    key: "education",
    title: "Education",
    kind: "repeat",
    fields: [
      { label: "School", type: "text" },
      { label: "Major", type: "text" }
    ]
  }
];

const prompt = buildResumeImportPrompt(fieldCatalog);
assert.match(prompt, /AutoApplyResumeImportV1/);
assert.match(prompt, /Name/);
assert.match(prompt, /Do not invent/);
assert.match(prompt, /section\.values/);
assert.match(prompt, /section\.items/);
assert.match(prompt, /禁止把 sections 中的某个 section 直接写成数组/);
assert.match(prompt, /字段只能放在 section\.values/);
assert.match(prompt, /数组只能放在 section\.items/);
assert.match(prompt, /"customSections": \[\]/);
assert.match(prompt, /"kind": "repeat"/);
assert.match(prompt, /"items": \[/);
assert.doesNotMatch(prompt, /Keep repeated .* as arrays/);
assert.doesNotMatch(prompt, /Jane Doe|jane@example\.com/);

const existing = {
  schemaVersion: 2,
  sections: {
    basic: {
      values: { Name: "Old name", GitHub: "https://github.com/existing" },
      custom: []
    }
  },
  customSections: []
};

const payload = {
  format: "AutoApplyResumeImportV1",
  profileV2: {
    schemaVersion: 2,
    sections: {
      basic: {
        values: { Name: "Jane Doe", Email: "jane@example.com" },
        custom: [{ label: "Portfolio", value: "https://example.com" }]
      },
      education: {
        items: [
          {
            title: "Example University",
            values: { School: "Example University", Major: "Computer Science" },
            custom: []
          }
        ]
      }
    },
    customSections: []
  },
  unmapped: [{ text: "Top 10%", reason: "No matching catalog field" }]
};
const fence = String.fromCharCode(96).repeat(3);
const response = parseResumeImportResponse(
  fence + "json\n" + JSON.stringify(payload) + "\n" + fence,
  existing
);

assert.equal(response.profileV2.sections.basic.values.Name, "Jane Doe");
assert.equal(response.profileV2.sections.basic.values.GitHub, "https://github.com/existing");
assert.equal(response.profileV2.sections.education.items[0].values.School, "Example University");
assert.equal(response.unmapped[0].text, "Top 10%");
assert.equal(response.importedCount, 5);
assert.ok(response.changedFields.some((field) => field.path === "basic.values.Email"));
assert.ok(response.changedFields.some((field) => field.path === "basic.custom.0.value"));

assert.throws(
  () => parseResumeImportResponse('{"format":"AutoApplyResumeImportV1"}', existing),
  /profileV2/
);
assert.throws(
  () => parseResumeImportResponse(JSON.stringify({ format: "OtherFormat", profileV2: payload.profileV2 }), existing),
  /format/
);

const directProfileResponse = parseResumeImportResponse(JSON.stringify({
  format: "AutoApplyResumeImportV1",
  profileV2: {
    schemaVersion: 2,
    sections: {
      basic: { 姓名: "示例用户", 邮箱: "user@example.com" },
      education: [{ 学校: "示例大学", 学历: "硕士" }]
    },
    customSections: []
  },
  unmapped: []
}));
assert.equal(directProfileResponse.profileV2.sections.basic.values.姓名, "示例用户");
assert.equal(directProfileResponse.profileV2.sections.education.items[0].values.学校, "示例大学");
assert.equal(directProfileResponse.importedCount, 4);

console.log("AI resume import tests passed");
