# AI Resume Import Implementation Plan

> **For agentic workers:** Implement this plan task-by-task with test-first checks.

**Goal:** Replace local resume guessing with a user-controlled prompt bridge that converts model-produced JSON into a validated, previewable `profileV2` import.

**Architecture:** A dependency-free module owns the prompt contract, tolerant JSON extraction, schema validation, and profile merge. The options page owns clipboard actions, preview rendering, and the existing save workflow. The prompt contains field names only; the user manually supplies the resume to their chosen model.

**Tech Stack:** Browser-native ES modules, DOM APIs, Node built-in `assert` tests, existing MV3 extension storage.

**Spec:** User-approved AI-only import workflow in the conversation.

## Global Constraints

- No npm, Python, PDF, DOCX, OCR, or runtime dependencies.
- No automatic network request for resume parsing.
- Do not save imported data until the user confirms the preview and clicks the existing save action.
- Preserve unrelated existing `profileV2` data.
- Reject invented or structurally invalid values at the import boundary.

---

### Task 1: Define the AI import contract

**Files:**
- Create: `src/ai-resume-import.mjs`
- Test: `tests/ai-resume-import.test.mjs`

**Interfaces:**
- `buildResumeImportPrompt(fieldCatalog)` returns a copyable prompt string.
- `parseResumeImportResponse(text, existingProfileV2)` returns `{ profileV2, unmapped, importedCount, changedFields }` or throws a user-facing validation error.

- [ ] Write failing tests for prompt privacy, JSON fence parsing, profile merge, and rejection of missing `profileV2`.
- [ ] Run `node tests/ai-resume-import.test.mjs` and confirm the module is missing.
- [ ] Implement the minimal module with strict object/array/string validation, JSON fence stripping, and deep merge preserving unrelated sections.
- [ ] Run the focused test until green.

### Task 2: Replace the settings import surface

**Files:**
- Modify: `src/options.html`
- Modify: `src/options.js`
- Modify: `src/options.css`
- Delete: `src/resume-parser.mjs`
- Modify: `tests/resume-parser.test.mjs`

**Interfaces:**
- Import `buildResumeImportPrompt` and `parseResumeImportResponse`.
- UI flow: copy prompt -> paste model JSON -> preview -> apply to editor -> existing Save Profile.

- [ ] Replace the plain-text textarea with prompt copy and JSON response textareas.
- [ ] Add a visible external-AI privacy warning and retry/error state.
- [ ] Render actual changed fields, unmapped content, and section counts in the preview.
- [ ] Remove direct local parser event handlers and its obsolete test.
- [ ] Run syntax and focused tests.

### Task 3: Add the Edge guide and README entry

**Files:**
- Create: `docs/guides/edge.md`
- Modify: `README.md`
- Modify: `README.en.md`

**Interfaces:**
- Guide embeds `assets/edge_tutorial/step1.png`, `step2.png`, and `step3.png`.
- README links to the Chinese Edge guide and states that more browser guides can be added alongside it.

- [ ] Document installation, developer mode, loading the unpacked extension, pinning AutoApply, opening Settings, and AI import.
- [ ] Add a “Browser Guides” section to both READMEs.
- [ ] Check all relative image links.

### Task 4: Final verification

**Files:**
- No additional production files.

- [ ] Run all Node tests.
- [ ] Run `node --check` for the new module and `options.js` module syntax.
- [ ] Validate `manifest.json`.
- [ ] Run `git diff --check` and confirm no dependency manifest was introduced.
