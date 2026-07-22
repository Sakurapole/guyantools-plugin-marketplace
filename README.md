# GuYanTools Plugin Marketplace

This repository contains only the reviewable marketplace catalog and schema. It does not copy plugin source, grant permissions automatically, or contain site-specific parsing logic.

Every entry must use an HTTPS repository, a branch/tag/commit ref, a full resolved commit hash, a manifest path, an explicit `sandboxed` trust level, known permissions, and a capability summary. CI optionally fetches the manifest at the pinned commit and rejects mismatched IDs, versions, permissions, capabilities, non-semver versions, duplicate IDs, non-HTTPS repositories, floating refs, `trusted` plugins, and unknown permissions.

Third-party plugins run in GuYanTools' sandboxed runtime. Site-specific URL parsing, API response handling, stream selection, and media orchestration belong in the plugin repository. Do not submit cookies, tokens, host absolute paths, build artifacts, or arbitrary command scripts. Catalog metadata is never an authorization grant; users confirm permissions against the resolved manifest.
