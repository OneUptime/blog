# Validation Summary: Fix Kuzu `INSTALL` with Bundled or Local Extensions

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Kuzu 0.11.3 and earlier Kuzu releases
- Kuzu extensions and Cypher `INSTALL` / `LOAD` statements
- Kuzu CLI and Python API
- Docker, Docker Compose, and NGINX-based local extension repositories
- Native extension ABI and platform compatibility
- LadybugDB extension migration

## Sources Consulted

- [Kuzu repository archive notice and local extension-server instructions](https://github.com/kuzudb/kuzu)
- [Kuzu v0.11.3 release notes](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu extension catalog and lifecycle documentation](https://kuzudb.github.io/docs/extensions/)
- [Kuzu v0.11.3 statically linked extension configuration](https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/extension_config.cmake#L4-L13)
- [Kuzu v0.11.3 `SHOW_OFFICIAL_EXTENSIONS` implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/function/table/show_official_extensions.cpp#L14-L27)
- [Kuzu v0.11.3 `SHOW_LOADED_EXTENSIONS` implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/function/table/show_loaded_extensions.cpp#L38-L75)
- [Kuzu v0.11.3 static-link handling for `INSTALL`](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/processor/operator/simple/install_extension.cpp#L33-L44)
- [Kuzu v0.11.3 static-link handling for `LOAD`](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/processor/operator/simple/load_extension.cpp#L18-L30)
- [Kuzu v0.11.3 extension downloader and optional installer probe](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/extension/extension_installer.cpp#L48-L90)
- [Kuzu v0.11.3 extension URL, platform, and filename implementation](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/extension/extension.cpp#L18-L117)
- [Kuzu v0.11.3 on-disk extension location](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/main/client_context.cpp#L195-L198)
- [Kuzu CLI documentation](https://kuzudb.github.io/docs/client-apis/cli/)
- [Kuzu Python API documentation](https://kuzudb.github.io/api-docs/python/kuzu.html)
- [Kuzu JSON extension documentation](https://kuzudb.github.io/docs/extensions/json/)
- [Kuzu database migration documentation](https://kuzudb.github.io/docs/migrate/)
- [Kuzu extension-repository container package](https://github.com/orgs/kuzudb/packages/container/package/extension-repo)
- [Docker Compose networking documentation](https://docs.docker.com/compose/how-tos/networking/)
- [Docker Compose `internal` network reference](https://docs.docker.com/reference/compose-file/networks/#internal)
- [LadybugDB extension documentation](https://docs.ladybugdb.com/extensions/)
- [LadybugDB v0.19.1 on-disk extension location](https://github.com/LadybugDB/ladybug/blob/v0.19.1/src/main/client_context.cpp#L191-L194)
- [LadybugDB migration documentation](https://docs.ladybugdb.com/migrate/)

## Issues Found

1. The post used a generic `<version>` path component and recorded only the Kuzu engine version, OS, and CPU architecture. Kuzu actually selects artifacts with its compile-time extension/repository version and exact platform identifier; these can differ from the engine patch version, and Linux distinguishes C++ ABIs. Changed the path placeholder to `<extension-version>`, added the extension/repository version and exact platform identifier to the reproducibility tuple, and updated the compatibility checks accordingly.
2. The post treated every repository `404` as a path or artifact mismatch. Kuzu also probes for an optional `_installer` library and deliberately ignores a non-200 response when an extension has no installer. Changed the diagnostic guidance to distinguish a Kuzu-reported 404 for the required extension library from a normal repository-log 404 for the optional installer probe.

## Review Notes

- The official Kuzu v0.11.3 CLI confirmed that `algo`, `fts`, `json`, and `vector` are loaded as static extensions; `SHOW_OFFICIAL_EXTENSIONS()` omits `vector`; the `to_json` example works; and `INSTALL json` and `LOAD json` return the documented no-op informational messages.
- The archived extension documentation confirms the local GHCR image, `INSTALL ... FROM 'http://localhost:8080/';` syntax, pre-installed/pre-loaded bundle, and session scope of `LOAD`. The image remains available for Linux AMD64 and ARM64, but its `latest` tag is mutable as the post correctly warns.
- The Python `Database`, `Connection`, `execute`, query-result iteration, and `kuzu.__version__` APIs are valid for Kuzu 0.11.3.
- The archived Kuzu on-disk-files page still shows the stale plural path `~/.kuzu/extensions`; version-pinned source confirms the singular `~/.kuzu/extension/<extension-version>/<platform>/` tree used by the release.
- When using a logical export for migration, extension-dependent indexes are exported only when their extensions are loaded. Operators should confirm this before relying on the export as a complete index migration.
- LadybugDB v0.19.1 uses the separate `~/.lbdb/extension/<extension-version>/<platform>/` tree and `.lbug_extension` suffix described in the post; Kuzu extension binaries are not interchangeable with it.
- Every external link in the post returned HTTP 200 and pointed to the intended official resource during validation.
