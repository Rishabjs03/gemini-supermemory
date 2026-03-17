import crypto from "node:crypto";
import path from "node:path";
import { getGitRepoName, getGitRoot } from "./git-utils.js";
import { validateContainerTag } from "./validate.js";
import { getProjectContainerOverrides } from "./project-config.js";

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 16);
}

export function sanitizeTagPart(value) {
  if (!value || typeof value !== "string") {
    return "unknown";
  }

  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  return sanitized || "unknown";
}

function buildValidatedTag(prefix, rawValue, fallbackSeed) {
  const candidate = `${prefix}_${sanitizeTagPart(rawValue)}`;
  const candidateCheck = validateContainerTag(candidate);

  if (candidateCheck.valid) {
    return candidate;
  }

  const fallback = `${prefix}_${sha256(fallbackSeed)}`;
  const fallbackCheck = validateContainerTag(fallback);

  if (!fallbackCheck.valid) {
    throw new Error(`Failed to generate valid container tag: ${fallbackCheck.reason}`);
  }

  return fallback;
}

export function getProjectBasePath(cwd = process.cwd()) {
  return getGitRoot(cwd) ?? cwd;
}

export function getProjectName(cwd = process.cwd()) {
  const basePath = getProjectBasePath(cwd);
  return getGitRepoName(basePath) || path.basename(basePath) || "unknown";
}

export function getPersonalContainerTag(cwd = process.cwd()) {
  const overrides = getProjectContainerOverrides(cwd);
  if (overrides.personalContainerTag) return overrides.personalContainerTag;
  const basePath = getProjectBasePath(cwd);
  return buildValidatedTag("gemini_user", sha256(basePath), basePath);
}

export function getRepoContainerTag(cwd = process.cwd()) {
  const overrides = getProjectContainerOverrides(cwd);
  if (overrides.repoContainerTag) return overrides.repoContainerTag;
  const projectName = getProjectName(cwd);
  return buildValidatedTag("repo", projectName, `${cwd}:${projectName}`);
}

export function getContainerContext(cwd = process.cwd()) {
  const projectName = getProjectName(cwd);
  const personalTag = getPersonalContainerTag(cwd);
  const repoTag = getRepoContainerTag(cwd);

  return {
    basePath: getProjectBasePath(cwd),
    projectName,
    personalTag,
    repoTag,
  };
}
