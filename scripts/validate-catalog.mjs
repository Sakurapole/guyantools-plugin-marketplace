import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const catalog = JSON.parse(fs.readFileSync(new URL('catalog.json', root), 'utf8'));
const knownPermissions = new Set([
  'workspace.read', 'data.user.read', 'data.project.read', 'data.project.write', 'data.settings.read', 'data.settings.write',
  'storage.self', 'navigation.open', 'ui.contribute', 'commands.execute', 'system.dialog', 'system.clipboard',
  'system.notifications', 'system.shortcuts', 'background.run', 'network.fetch', 'downloads.manage', 'jobs.manage',
  'files.read', 'files.write', 'tools.ffmpeg', 'media.preview', 'media.transcode', 'media.tag', 'secrets.self', 'observability.logs',
]);
const semver = /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/;
const idPattern = /^[a-z0-9][a-z0-9.-]*$/;
const capabilityKinds = new Set(['media-source', 'metadata-provider', 'transformer', 'importer']);

function fail(message) { throw new Error(`invalid catalog: ${message}`); }
function requireString(value, label) { if (typeof value !== 'string' || !value.trim()) fail(`${label} is required`); }
function sameJson(left, right) { return JSON.stringify(left) === JSON.stringify(right); }

if (!catalog || catalog.schemaVersion !== '1.0' || !idPattern.test(catalog.marketplaceId ?? '') || !Array.isArray(catalog.plugins)) fail('invalid envelope');
const ids = new Set();
for (const plugin of catalog.plugins) {
  requireString(plugin.id, 'plugin id');
  if (!idPattern.test(plugin.id) || ids.has(plugin.id)) fail(`duplicate or invalid plugin id: ${plugin.id}`);
  ids.add(plugin.id);
  requireString(plugin.name, `${plugin.id}.name`);
  if (!semver.test(plugin.version ?? '')) fail(`invalid semver: ${plugin.id}`);
  let repository;
  try { repository = new URL(plugin.repository); } catch { fail(`invalid repository: ${plugin.id}`); }
  if (repository.protocol !== 'https:' || repository.username || repository.password) fail(`repository must be HTTPS: ${plugin.id}`);
  if (!['branch', 'tag', 'commit'].includes(plugin.refType) || !plugin.ref || !/^[0-9a-f]{40}$/i.test(plugin.resolvedCommit ?? '')) fail(`ref and full resolvedCommit are required: ${plugin.id}`);
  if (plugin.trustLevel !== 'sandboxed') fail(`only sandboxed plugins are allowed: ${plugin.id}`);
  requireString(plugin.manifestPath, `${plugin.id}.manifestPath`);
  if (!Array.isArray(plugin.permissions) || plugin.permissions.some(permission => !knownPermissions.has(permission))) fail(`unknown permission: ${plugin.id}`);
  if (!Array.isArray(plugin.capabilities)) fail(`capabilities are required: ${plugin.id}`);
  const capabilityIds = new Set();
  for (const capability of plugin.capabilities) {
    if (!capability || !idPattern.test(capability.id ?? '') || capabilityIds.has(capability.id) || !capabilityKinds.has(capability.kind) || !Array.isArray(capability.operations) || capability.operations.length === 0) fail(`invalid capability: ${plugin.id}`);
    capabilityIds.add(capability.id);
  }

  if (process.env.CATALOG_VALIDATE_REMOTE === '1') {
    const rawUrl = `https://raw.githubusercontent.com/${repository.pathname.replace(/^\//, '')}/${plugin.resolvedCommit}/${plugin.manifestPath}`;
    const response = await fetch(rawUrl);
    if (!response.ok) fail(`manifest fetch failed (${response.status}): ${plugin.id}`);
    const manifest = await response.json();
    if (manifest.id !== plugin.id || manifest.version !== plugin.version || manifest.trustLevel !== 'sandboxed') fail(`manifest summary mismatch: ${plugin.id}`);
    if (!sameJson(manifest.permissions, plugin.permissions) || !sameJson(manifest.capabilities, plugin.capabilities)) fail(`manifest permission/capability mismatch: ${plugin.id}`);
  }
}
console.log(`validated ${catalog.plugins.length} plugin(s)`);
