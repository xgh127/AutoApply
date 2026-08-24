const IMPORT_FORMAT = "AutoApplyResumeImportV1";
const MAX_TEXT_LENGTH = 5000;
const MAX_ITEMS = 50;
const SECTION_META_KEYS = new Set(["key", "title", "kind", "values", "items", "custom"]);
const ITEM_META_KEYS = new Set(["title", "values", "custom"]);

export function buildResumeImportPrompt(fieldCatalog = []) {
  const catalog = sanitizeCatalog(fieldCatalog);
  const canonicalShapeExample = {
    profileV2: {
      schemaVersion: 2,
      sections: {
        basic: {
          key: "basic",
          title: "基本信息",
          kind: "simple",
          values: {},
          custom: []
        },
        education: {
          key: "education",
          title: "教育经历",
          kind: "repeat",
          items: [{ title: "教育经历 1", values: {}, custom: [] }]
        }
      },
      customSections: []
    }
  };
  return [
    "你是 AutoApply 的简历结构化助手。",
    "请把用户随后提供的简历转换为 AutoApplyResumeImportV1 JSON。",
    "Do not invent information. Do not infer values that are not present in the resume.",
    "Do not include explanations, Markdown, or code fences outside the JSON object.",
    "这是严格的 profileV2 schema，不要自行改变字段层级或字段名。",
    "禁止把 sections 中的某个 section 直接写成数组。",
    "simple section 的字段只能放在 section.values 对象中，不能直接放在 section 下。",
    "repeat section 的数组只能放在 section.items 中，每条经历的字段只能放在 item.values 对象中。",
    "每个 simple section 必须使用 key、title、kind=\"simple\"、values、custom；每个 repeat section 必须使用 key、title、kind=\"repeat\"、items。",
    "Use the exact section keys and field labels from the catalog below.",
    "没有匹配字段的内容放入 unmapped，不要创建新的 section key、不要把未知字段直接塞进 section。",
    "Normalize dates to YYYY-MM when the source contains a month.",
    "Put content that cannot be mapped safely into unmapped with its original text and a short reason.",
    "只输出有实际内容的 section；没有内容的 section 可以省略。customSections 没有内容时必须是空数组。",
    "",
    "Return exactly this top-level shape:",
    JSON.stringify({
      format: IMPORT_FORMAT,
      profileV2: { schemaVersion: 2, sections: {}, customSections: [] },
      unmapped: [{ text: "original text", reason: "why it was not mapped" }]
    }, null, 2),
    "",
    "Canonical profileV2 shape (these empty objects are structure examples; replace them with actual resume values):",
    JSON.stringify(canonicalShapeExample, null, 2),
    "",
    "Supported profile field catalog (field names only, no saved values):",
    JSON.stringify(catalog, null, 2),
    "",
    "Now transform the resume pasted below. Return JSON only."
  ].join("\n");
}

export function parseResumeImportResponse(text, existingProfileV2 = null) {
  const parsed = parseJsonResponse(text);
  if (parsed?.format !== IMPORT_FORMAT) {
    throw new Error("AI response format must be AutoApplyResumeImportV1.");
  }
  if (!isObject(parsed?.profileV2)) {
    throw new Error("AI response must contain a profileV2 object.");
  }

  const imported = sanitizeProfile(parsed.profileV2);
  return {
    profileV2: mergeProfiles(existingProfileV2, imported),
    unmapped: sanitizeUnmapped(parsed.unmapped),
    importedCount: countProfileValues(imported),
    changedFields: collectChangedFields(imported)
  };
}

function sanitizeCatalog(catalog) {
  if (!Array.isArray(catalog)) {
    return [];
  }
  return catalog.slice(0, MAX_ITEMS).map((section) => ({
    key: safeText(section?.key, 80),
    title: safeText(section?.title, 120),
    kind: section?.kind === "repeat" ? "repeat" : "simple",
    fields: Array.isArray(section?.fields)
      ? section.fields.slice(0, MAX_ITEMS).map((field) => ({
          label: safeText(field?.label, 120),
          type: safeText(field?.type || "text", 40)
        }))
      : []
  }));
}

function parseJsonResponse(text) {
  const source = String(text || "").trim();
  if (!source) {
    throw new Error("AI response is empty.");
  }

  const fence = String.fromCharCode(96).repeat(3);
  const fenced = source.match(new RegExp(
    fence + "(?:json)?\\s*([\\s\\S]*?)\\s*" + fence,
    "i"
  ));
  const candidates = [fenced?.[1], source].filter(Boolean);

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      const start = candidate.indexOf("{");
      const end = candidate.lastIndexOf("}");
      if (start >= 0 && end > start) {
        try {
          return JSON.parse(candidate.slice(start, end + 1));
        } catch {
          continue;
        }
      }
    }
  }
  throw new Error("AI response is not valid JSON. Please copy the JSON object only.");
}

function sanitizeProfile(profile) {
  if (!isObject(profile.sections)) {
    throw new Error("AI response profileV2.sections must be an object.");
  }

  const sections = {};
  for (const [key, section] of Object.entries(profile.sections).slice(0, MAX_ITEMS)) {
    if (!isObject(section) && !Array.isArray(section)) {
      continue;
    }
    const isRepeat = Array.isArray(section)
      || section.kind === "repeat"
      || Array.isArray(section.items);
    const normalized = {
      key: safeText(section.key || key, 80),
      title: safeText(section.title || key, 120),
      kind: isRepeat ? "repeat" : "simple"
    };
    if (isRepeat) {
      const rawItems = Array.isArray(section) ? section : section.items;
      normalized.items = (Array.isArray(rawItems) ? rawItems : [])
        .slice(0, MAX_ITEMS)
        .filter(isObject)
        .map(sanitizeItem)
        .filter((item) => Object.keys(item.values).length || item.custom.length);
    } else {
      const values = isObject(section.values)
        ? section.values
        : extractDirectValues(section, SECTION_META_KEYS);
      normalized.values = sanitizeValues(values);
      if (Array.isArray(section.custom)) {
        normalized.custom = sanitizeCustomRows(section.custom);
      }
    }
    sections[key] = normalized;
  }

  return {
    schemaVersion: 2,
    updatedAt: safeText(profile.updatedAt, 80),
    sections,
    customSections: Array.isArray(profile.customSections)
      ? profile.customSections.slice(0, MAX_ITEMS).filter(isObject).map(sanitizeSimpleSection)
      : []
  };
}

function sanitizeSimpleSection(section) {
  return {
    key: safeText(section.key || "custom", 80),
    title: safeText(section.title || "Custom", 120),
    kind: "simple",
    values: sanitizeValues(section.values),
    custom: sanitizeCustomRows(section.custom)
  };
}

function sanitizeItem(item) {
  const values = isObject(item.values)
    ? { ...extractDirectValues(item, ITEM_META_KEYS), ...item.values }
    : extractDirectValues(item, ITEM_META_KEYS);
  return {
    title: safeText(item.title, 120),
    values: sanitizeValues(values),
    custom: sanitizeCustomRows(item.custom)
  };
}

function extractDirectValues(source, metaKeys) {
  return Object.fromEntries(
    Object.entries(source || {}).filter(([key]) => !metaKeys.has(key))
  );
}

function sanitizeValues(values) {
  if (!isObject(values)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(values)
      .slice(0, MAX_ITEMS)
      .map(([label, value]) => [safeText(label, 120), safeText(value, MAX_TEXT_LENGTH)])
      .filter(([label, value]) => label && value)
  );
}

function sanitizeCustomRows(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows
    .slice(0, MAX_ITEMS)
    .filter(isObject)
    .map((row) => ({
      label: safeText(row.label, 120),
      value: safeText(row.value, MAX_TEXT_LENGTH)
    }))
    .filter((row) => row.label && row.value);
}

function sanitizeUnmapped(unmapped) {
  if (!Array.isArray(unmapped)) {
    return [];
  }
  return unmapped
    .slice(0, MAX_ITEMS)
    .map((item) => typeof item === "string"
      ? { text: safeText(item, MAX_TEXT_LENGTH), reason: "" }
      : { text: safeText(item?.text, MAX_TEXT_LENGTH), reason: safeText(item?.reason, 300) })
    .filter((item) => item.text);
}

function mergeProfiles(existing, imported) {
  const profileV2 = cloneProfile(existing);
  profileV2.schemaVersion = 2;
  profileV2.updatedAt = new Date().toISOString();
  profileV2.sections ||= {};

  for (const [key, incoming] of Object.entries(imported.sections)) {
    const current = profileV2.sections[key];
    if (incoming.items) {
      profileV2.sections[key] = {
        ...(current || {}),
        ...incoming,
        items: mergeItems(Array.isArray(current?.items) ? current.items : [], incoming.items)
      };
      continue;
    }
    profileV2.sections[key] = {
      ...(current || {}),
      ...incoming,
      values: { ...(current?.values || {}), ...(incoming.values || {}) },
      custom: mergeCustomRows(current?.custom, incoming.custom)
    };
  }

  profileV2.customSections = mergeSimpleSections(
    Array.isArray(profileV2.customSections) ? profileV2.customSections : [],
    imported.customSections
  );
  return profileV2;
}

function mergeItems(existing, incoming) {
  const merged = Array.isArray(existing) ? existing.map(clone) : [];
  for (const item of incoming) {
    const index = merged.findIndex((candidate) => itemIdentity(candidate) === itemIdentity(item));
    if (index >= 0) {
      merged[index] = item;
    } else {
      merged.push(item);
    }
  }
  return merged.slice(0, MAX_ITEMS);
}

function mergeSimpleSections(existing, incoming) {
  const merged = existing.map(clone);
  for (const section of incoming) {
    const index = merged.findIndex((candidate) => candidate.key === section.key);
    if (index >= 0) {
      merged[index] = {
        ...merged[index],
        ...section,
        values: { ...(merged[index].values || {}), ...(section.values || {}) },
        custom: mergeCustomRows(merged[index].custom, section.custom)
      };
    } else {
      merged.push(section);
    }
  }
  return merged.slice(0, MAX_ITEMS);
}

function mergeCustomRows(existing = [], incoming = []) {
  const merged = Array.isArray(existing) ? existing.map(clone) : [];
  for (const row of Array.isArray(incoming) ? incoming : []) {
    const index = merged.findIndex((candidate) => candidate.label === row.label);
    if (index >= 0) {
      merged[index] = row;
    } else {
      merged.push(row);
    }
  }
  return merged.slice(0, MAX_ITEMS);
}

function itemIdentity(item) {
  return JSON.stringify({ title: item?.title || "", values: item?.values || {} });
}

function collectChangedFields(profile) {
  const fields = [];
  for (const [sectionKey, section] of Object.entries(profile.sections || {})) {
    for (const label of Object.keys(section.values || {})) {
      fields.push({
        path: sectionKey + ".values." + label,
        value: section.values[label]
      });
    }
    for (const [index, row] of (section.custom || []).entries()) {
      fields.push({
        path: sectionKey + ".custom." + index + ".value",
        value: row.value
      });
    }
    for (const [index, item] of (section.items || []).entries()) {
      for (const label of Object.keys(item.values || {})) {
        fields.push({
          path: sectionKey + ".items." + index + ".values." + label,
          value: item.values[label]
        });
      }
      for (const [customIndex, row] of (item.custom || []).entries()) {
        fields.push({
          path: sectionKey + ".items." + index + ".custom." + customIndex + ".value",
          value: row.value
        });
      }
    }
  }
  for (const [sectionIndex, section] of (profile.customSections || []).entries()) {
    for (const label of Object.keys(section.values || {})) {
      fields.push({
        path: "customSections." + sectionIndex + ".values." + label,
        value: section.values[label]
      });
    }
    for (const [customIndex, row] of (section.custom || []).entries()) {
      fields.push({
        path: "customSections." + sectionIndex + ".custom." + customIndex + ".value",
        value: row.value
      });
    }
  }
  return fields;
}

function countProfileValues(profile) {
  let count = 0;
  for (const section of Object.values(profile.sections || {})) {
    count += Object.keys(section.values || {}).length;
    count += (section.custom || []).length;
    for (const item of section.items || []) {
      count += Object.keys(item.values || {}).length + item.custom.length;
    }
  }
  for (const section of profile.customSections || []) {
    count += Object.keys(section.values || {}).length + section.custom.length;
  }
  return count;
}

function safeText(value, maxLength) {
  if (typeof value === "number" || typeof value === "boolean") {
    value = String(value);
  }
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, maxLength);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function cloneProfile(profile) {
  if (!isObject(profile)) {
    return { schemaVersion: 2, updatedAt: "", sections: {}, customSections: [] };
  }
  return clone(profile);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
