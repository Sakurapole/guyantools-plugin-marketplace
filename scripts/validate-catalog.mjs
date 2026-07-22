import fs from 'node:fs';

const catalog = JSON.parse(fs.readFileSync(new URL('../catalog.json', import.meta.url), 'utf8'));
if (catalog.schemaVersion !== '1.0' || !Array.isArray(catalog.plugins)) throw new Error('invalid catalog envelope');
const ids = new Set();
for (const plugin of catalog.plugins) {
  if (ids.has(plugin.id)) throw new Error(`duplicate plugin id: ${plugin.id}`);
  ids.add(plugin.id);
  const url = new URL(plugin.repository);
  if (url.protocol !== 'https:') throw new Error(`repository must be HTTPS: ${plugin.id}`);
  if (!['branch', 'tag', 'commit'].includes(plugin.refType) || !/^[0-9a-f]{7,64}$/i.test(plugin.resolvedCommit)) throw new Error(`un-pinned plugin: ${plugin.id}`);
}
console.log(`validated ${catalog.plugins.length} plugin(s)`);
