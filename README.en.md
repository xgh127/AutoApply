# AutoApply

<p align="center">
  <img src="icons/autoapply-mark.svg" alt="AutoApply" width="112" />
</p>

AutoApply is a privacy-first browser extension for job application forms. It keeps a structured resume profile locally, helps populate application fields, and never submits an application for you.

## Features

- Stores profile data in the existing profileV2 structure.
- Imports complex resumes through a user-controlled AI prompt bridge.
- Validates AI JSON, previews concrete fields, shows unmapped content, and deduplicates repeated records.
- Fills high-confidence application fields and marks the rest for review.
- Has no npm, Python, build, or runtime dependencies.

## AI Resume Import

Open Settings and use the AI Resume Import section:

1. Select Copy Prompt.
2. Send the prompt and your resume to Doubao, Qwen, ChatGPT, or another AI service you trust.
3. Ask the model to return only AutoApplyResumeImportV1 JSON.
4. Paste the JSON into the response box.
5. Select Parse and Preview.
6. Review the fields and unmapped content.
7. Select Apply to Profile Editor, then Save Profile.

The prompt contains supported section keys and field names, but never your existing profile values. Content that cannot be mapped safely is shown separately for review.

Your resume is sent to the AI service only when you copy it there yourself. AutoApply does not upload the resume or read the AI conversation.

## Install

Download or clone this repository, open the Chrome, Edge, or Brave extension manager, enable Developer mode, and choose Load unpacked. Select this repository directory. No npm install is required.

## Browser Guides

- [Microsoft Edge installation and usage guide](docs/guides/edge.md)

Additional Chrome and Brave guides can be added under docs/guides/.

## Privacy

- Resume data, AI import results, and API settings stay in local extension storage.
- AI import starts only through explicit user copy and paste actions.
- Optional page-analysis AI receives page-field metadata and profile field names, not actual resume values.
- The extension never clicks the final submission button.

## License

AutoApply is available under the [MIT License](LICENSE). It is derived from OpenJobAutofill; the original copyright and license notice are retained in LICENSE.

## Development Checks

~~~powershell
node tests/ai-resume-import.test.mjs
node --check src/ai-resume-import.mjs
node --experimental-default-type=module --check src/options.js
~~~
