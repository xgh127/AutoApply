# AutoApply

<p align="center">
  <img src="icons/autoapply-mark.svg" alt="AutoApply" width="112" />
</p>

AutoApply 是一个隐私优先的浏览器扩展：把简历资料保存在本地，辅助填写招聘网站的申请表。它不会自动提交申请，最终内容始终由你确认。

## 功能

- 使用现有的 profileV2 结构保存基本信息、教育、工作、项目和技能等资料。
- 通过 AI 提示词桥接导入复杂简历：AutoApply 生成提示词，用户把提示词和简历发送给自己选择的 AI，再把结构化 JSON 粘贴回来。
- 对 AI 返回结果进行格式校验、字段预览、待确认内容展示和重复经历去重。
- 一键填写招聘页面中可以确定的字段，其余字段标记为待处理。
- 不需要 npm、Python、构建工具或运行时依赖。

## AI 简历导入

在设置页的“用 AI 导入简历”区域：

1. 点击“复制提示词”。
2. 把提示词和简历一起发送给豆包、通义、ChatGPT 或其他你信任的模型。
3. 要求模型只返回 AutoApplyResumeImportV1 JSON。
4. 把 JSON 粘贴回第二个文本框。
5. 点击“解析并预览”，检查具体字段和值。
6. 点击“应用到资料编辑器”。
7. 检查资料后点击“保存资料”。

提示词会包含 AutoApply 支持的 section key 和字段名称，但不会包含你现有资料的实际值。无法安全归类的内容会显示在“待确认内容”中。

使用此方式时，简历内容会由你主动复制到所选 AI 服务。AutoApply 不会自动上传简历，也不会读取 AI 对话内容。

## 安装

下载或克隆仓库后，在 Chrome、Edge 或 Brave 的扩展管理页开启开发者模式，选择“加载已解压的扩展程序”，然后选中本项目目录。不需要运行 npm install。

## 浏览器教程

- [Microsoft Edge 安装与使用指南](docs/guides/edge.md)

后续可以在 docs/guides/ 下增加 Chrome、Brave 等浏览器的教程。

## 填表

1. 打开招聘网站的申请表页面。
2. 点击 AutoApply 图标。
3. 点击“开始填写”。
4. 检查绿色已填写字段和橙色待处理字段。
5. 手动确认日期、选项、证件和声明等敏感字段。
6. AutoApply 不会自动点击最终提交按钮。

## 隐私

- 简历资料、AI 导入结果和 API 配置保存在浏览器扩展本地存储中。
- AI 导入完全由用户手动复制和粘贴触发。
- 可选的表单分析 AI 只接收页面字段和资料字段名称，不接收实际简历值。
- 更新检查只访问项目 Release 页面。

## 开源

本项目基于 MIT 许可证发布，详见 [LICENSE](LICENSE)。它是从 OpenJobAutofill 派生而来，原始版权与 MIT 许可声明保留在 LICENSE 中。

## 开发检查

~~~powershell
node tests/ai-resume-import.test.mjs
node --check src/ai-resume-import.mjs
node --experimental-default-type=module --check src/options.js
~~~
