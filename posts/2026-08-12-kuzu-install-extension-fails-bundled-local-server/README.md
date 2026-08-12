# Why Does `INSTALL` Fail in Kuzu Now? Using Bundled Extensions or a Local Extension Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, Extensions, Local Repository, Docker, Troubleshooting

Description: Fix Kuzu extension installation after the public server shutdown by using 0.11.3's bundled extensions or a pinned local extension repository.

---

Kuzu's public extension server went away when the project was archived. As a result, an `INSTALL` statement that used to download an official extension can now fail even though general network connectivity and the Cypher syntax are fine. The correct fix depends on the engine version and extension name—not on repeatedly retrying the retired endpoint.

Kuzu `0.11.3` is the special case. Its final release pre-installs and pre-loads four extensions: `algo`, `fts`, `json`, and `vector`. For those four, remove the runtime `INSTALL` and `LOAD` calls. For an older Kuzu version, or for any other official extension on `0.11.3`, run the archived Kuzu extension-repository image locally and use the documented `FROM` URL.

## First, Identify the Exact Failure

Capture the engine version and the literal statement before changing infrastructure:

~~~bash
kuzu --version
python -c 'import kuzu; print(kuzu.__version__)'
~~~

Then ask Kuzu what it knows in the affected process:

~~~cypher
CALL SHOW_OFFICIAL_EXTENSIONS() RETURN *;
CALL SHOW_LOADED_EXTENSIONS() RETURN *;
~~~

These answer different questions. The official list is a hard-coded list of official extensions for that release. In `0.11.3`, it omits `vector` even though `vector` is bundled, so do not treat it as a complete capability check. The loaded list shows the extensions available in the current session. A downloaded extension may still need `LOAD`; conversely, the four bundled `0.11.3` extensions are already loaded and need neither operation.

Avoid relying on a developer workstation where `~/.kuzu/extension` contains artifacts from old experiments. Reproduce with the same container image, user, home directory, OS, architecture, and Kuzu package used in production.

## Case 1: Kuzu 0.11.3 and a Bundled Extension

If the extension is `algo`, `fts`, `json`, or `vector`, use it directly:

~~~cypher
CALL SHOW_LOADED_EXTENSIONS() RETURN *;

-- Example: the JSON extension is already available.
RETURN to_json({service: 'checkout', healthy: true});
~~~

Do not run these as mandatory startup steps on `0.11.3`:

~~~cypher
INSTALL json;
LOAD json;
~~~

On `0.11.3`, both statements stop at the static-link check and return an informational message that the extension is already linked into the Kuzu core. Neither downloads nor loads anything, and both are unnecessary for the bundled set. If a bundled function is unavailable, verify that the running native library really is `0.11.3`; a package manifest alone is insufficient. Also check that the application did not load a different `libkuzu` through its dynamic-library search path.

The final release notes are authoritative about the bundle. They say `0.11.3` combines the `0.11.2` engine with `algo`, `fts`, `json`, and `vector` so users do not need to install them. The final docs additionally say they are pre-loaded.

## Case 2: An Older Kuzu Version

On `0.11.2` and earlier, even those four extensions are not covered by the final bundle. The old plain form:

~~~cypher
INSTALL json;
~~~

cannot use Kuzu's retired public server. You have two defensible choices:

1. upgrade and validate `0.11.3`, gaining the four bundled extensions; or
2. keep the pinned older engine and serve matching artifacts from the local repository image.

Upgrading is usually simpler for those four extensions, but do not perform an untested binary swap against the only database file. Create a Kuzu logical export, restore a disposable candidate using the target version, and replay application queries.

## Case 3: A Non-Bundled Extension on 0.11.3

Extensions such as `httpfs`, `postgres`, `sqlite`, `duckdb`, `iceberg`, or `neo4j` are not among the four final bundled names. The official archive instructions provide this image:

~~~bash
docker pull ghcr.io/kuzudb/extension-repo:latest
docker run -d --name kuzu-extension-repo \
  --restart unless-stopped \
  -p 127.0.0.1:8080:80 \
  ghcr.io/kuzudb/extension-repo:latest
~~~

Then point the install statement at the server, including the trailing slash used in the official example:

~~~cypher
INSTALL httpfs FROM 'http://localhost:8080/';
LOAD httpfs;
CALL SHOW_LOADED_EXTENSIONS() RETURN *;
~~~

`localhost` is relative to the Kuzu process. If Kuzu runs in another container, `localhost:8080` points back to that container, not the repository container or host. Put both containers on a private network and use the repository service name:

~~~yaml
services:
  extension-repo:
    image: ghcr.io/kuzudb/extension-repo:latest
    networks: [graph-internal]

  app:
    image: registry.example.com/graph-api:2026-08-12
    networks: [graph-internal]

networks:
  graph-internal:
    internal: true
~~~

~~~cypher
INSTALL httpfs FROM 'http://extension-repo/';
~~~

The example uses readable tags. Resolve each selected tag to an immutable digest in your own registry workflow before deploying it. The important operational point is to stop relying on a floating image once you have selected and tested the artifacts.

## Make the Local Server Reproducible

The official command uses `latest` as a convenient starting point. A production archive strategy should resolve that tag once, record the immutable digest, mirror it if policy permits, and retain checksums. The Kuzu repository and extension service are archived dependencies; a future registry cleanup must not become an outage.

Record this tuple for every artifact:

~~~text
Kuzu engine version
Kuzu extension/repository version
extension name
extension binary checksum
Kuzu platform identifier (OS, CPU architecture, and Linux C++ ABI where applicable)
extension repository image digest
installation date and owner
~~~

Native extensions are not portable JavaScript bundles. Do not copy an artifact between macOS and Linux, x86-64 and ARM64, Linux C++ ABIs, or unmatched Kuzu extension/repository versions. An extension that happens to load against a different engine build has not thereby become supported or safe.

## Separate Install Time from Runtime

`INSTALL` downloads an extension into Kuzu's per-user, extension-version- and platform-specific location under `~/.kuzu/extension/<extension-version>/<platform>/`. The archived on-disk-files page incorrectly shows the plural path `~/.kuzu/extensions`; the `0.11.3` source and released binaries use the singular, versioned path. `LOAD` makes a previously installed extension available to a session. For non-bundled extensions, loading is session-scoped, so a new CLI or application process must load it again.

Prefer installing during an image-build or controlled provisioning phase, then starting the runtime without permission to modify the extension directory. This avoids making application availability depend on a repository server during every restart.

A startup capability check can fail clearly:

~~~python
import kuzu

db = kuzu.Database("/var/lib/graph/app.kuzu")
conn = kuzu.Connection(db)
conn.execute("LOAD httpfs")

loaded = conn.execute("CALL SHOW_LOADED_EXTENSIONS() RETURN *")
for row in loaded:
    print(row)
~~~

Do not accept extension names or paths from an HTTP request. `LOAD EXTENSION '/path/to/library'` loads native code; keep it in trusted configuration and make the directory read-only to the service user.

## Diagnose the Local Path Methodically

If `INSTALL ... FROM` still fails, test from the same network namespace as Kuzu:

~~~bash
curl --fail --show-error --head http://extension-repo/
getent hosts extension-repo
~~~

Then check:

- the URL ends at the repository root expected by Kuzu;
- the engine version is exactly the one selected;
- the engine's extension/repository version and exact platform identifier have a matching artifact;
- a proxy is not rewriting the URL or blocking plain HTTP;
- the service user can create its `~/.kuzu/extension/<extension-version>/<platform>/` tree;
- its home directory is stable across restarts;
- old partial files are not shadowing the intended extension;
- container read-only filesystem settings provide a deliberate writable install location.

Use the Kuzu error body and repository access logs. A Kuzu-reported `404` for the required extension library is a path or artifact mismatch; a repository-log `404` for Kuzu's optional `_installer` probe can be normal. Connection refusal is a routing/listener issue; permission denied points to the local extension directory. Treating every case as “the extension server is down” wastes time.

## Do Not Mix Kuzu and Ladybug Extension Repositories

LadybugDB, the active successor, has its own image at `ghcr.io/ladybugdb/extension-repo`. Current Ladybug releases store downloaded extensions in an extension-version- and platform-specific tree under `~/.lbdb/extension/` and build `.lbug_extension` libraries. Those are not replacements for Kuzu `.kuzu_extension` binaries. If migrating, install target-native extensions and verify or recreate extension-backed indexes as part of target validation.

## Official Documentation

- [Kuzu archive and local extension-server announcement](https://github.com/kuzudb/kuzu)
- [Kuzu 0.11.3 release notes](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3)
- [Kuzu extension catalog and lifecycle](https://kuzudb.github.io/docs/extensions/)
- [Kuzu 0.11.3 on-disk extension location](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/main/client_context.cpp#L195-L198)
- [Kuzu installation](https://kuzudb.github.io/docs/installation/)
- [Kuzu JSON extension](https://kuzudb.github.io/docs/extensions/json/)
- [Kuzu HTTPFS extension](https://kuzudb.github.io/docs/extensions/httpfs/)
- [Ladybug extension documentation for migration comparison](https://docs.ladybugdb.com/extensions/)
- [Ladybug 0.19.1 on-disk extension location](https://github.com/LadybugDB/ladybug/blob/v0.19.1/src/main/client_context.cpp#L191-L194)

## Conclusion

On Kuzu `0.11.3`, use `algo`, `fts`, `json`, and `vector` directly because they are bundled and pre-loaded. For older Kuzu versions or any other official extension, host the archived Kuzu repository image locally and install from its explicit URL. Pin the engine and repository artifacts together, keep native-extension paths trusted, and verify the capability in the real runtime environment.
