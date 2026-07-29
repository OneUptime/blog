# Validation Summary: Why Native Modules Fail in a Chainguard Runtime After Building

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Chainguard Containers and Wolfi
- Docker multi-stage and multi-platform builds
- APK package management
- ELF shared objects and the glibc dynamic loader
- Python, CPython extension modules, virtual environments, and wheels
- Psycopg and cryptography
- Node.js native addons and Node ABI
- better-sqlite3

## Sources Consulted

- [Chainguard: Getting Started with the Python Container](https://edu.chainguard.dev/chainguard/chainguard-images/getting-started/python/)
- [Chainguard: Migrating to Node.js Containers](https://edu.chainguard.dev/get-started/migration/migration-guides/migrating-node/)
- [Chainguard Node Container overview and compatibility notes](https://images.chainguard.dev/directory/image/node/overview)
- [Chainguard Node Container specifications](https://images.chainguard.dev/directory/image/node/specifications)
- [Chainguard: glibc vs. musl](https://edu.chainguard.dev/chainguard/chainguard-images/about/images-compiled-programs/glibc-vs-musl/)
- [Chainguard: Migrating Dockerfiles and searching APK package capabilities](https://edu.chainguard.dev/get-started/migration/migrating-to-chainguard-images/)
- [Chainguard: Installing APK packages in distroless variants](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/install-apks-in-distroless-variants/)
- [Chainguard Containers product release lifecycle](https://edu.chainguard.dev/chainguard/chainguard-images/about/versions/)
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Docker container run documentation](https://docs.docker.com/engine/containers/run/)
- [Docker build-context and `.dockerignore` documentation](https://docs.docker.com/build/concepts/context/)
- [Docker multi-platform build documentation](https://docs.docker.com/build/building/multi-platform/)
- [Node.js `process.versions` documentation](https://nodejs.org/api/process.html#processversions)
- [Node.js C++ addon documentation](https://nodejs.org/api/addons.html)
- [Node-API ABI stability documentation](https://nodejs.org/api/n-api.html)
- [Python `sysconfig` documentation](https://docs.python.org/3/library/sysconfig.html)
- [Python C API stability documentation](https://docs.python.org/3/c-api/stable.html)
- [Python Packaging User Guide: platform compatibility tags](https://packaging.python.org/en/latest/specifications/platform-compatibility-tags/)
- [GNU Binutils `readelf` documentation](https://sourceware.org/binutils/docs/binutils/readelf.html)
- [Linux `ldd(1)` manual](https://man7.org/linux/man-pages/man1/ldd.1.html)
- [Linux `execve(2)` manual](https://man7.org/linux/man-pages/man2/execve.2.html)
- [Psycopg installation and implementation documentation](https://www.psycopg.org/psycopg3/docs/basic/install.html)
- [Psycopg `pq` implementation documentation](https://www.psycopg.org/psycopg3/docs/api/pq.html)
- [better-sqlite3 API documentation](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)
- [better-sqlite3 native binding loader source](https://github.com/WiseLibs/better-sqlite3/blob/master/lib/database.js)
- [cryptography hash primitive source](https://github.com/pyca/cryptography/blob/main/src/cryptography/hazmat/primitives/hashes.py)
- [Current Wolfi aarch64 APK repository index](https://packages.wolfi.dev/os/aarch64/APKINDEX.tar.gz)

## Issues Found

- The diagnostic APK installation and package-index update omitted the required privilege changes. Current Chainguard Node and Python images run as UID 65532, so these operations fail unless they run as root. Added `USER root` around the builder install and moved the index searches into an explicitly root-run, disposable matching `-dev` container.
- The ELF inspection checklist implied that a Python or Node.js shared library should contain a program interpreter. Shared objects do not normally have a `PT_INTERP` entry; the Python or Node.js executable selects the dynamic loader. Removed the misleading checklist item and added the correct explanation.
- The wheel-tag explanation stated too broadly that wheel tags encode a minimum glibc version. Wheel filenames contain Python, ABI, and platform tags, but the minimum glibc version is specifically encoded by `manylinux_x_y_arch` platform tags. Corrected the wording.
- The CI commands did not reliably exercise every native component. Psycopg can fall back to its pure-Python implementation, importing top-level `cryptography` does not itself guarantee that its Rust binding is loaded, and `better-sqlite3` loads its addon when a database is opened. The Python probe now forces `PSYCOPG_IMPL=c` and constructs a cryptography hash, while the Node.js probe opens and closes an in-memory database.

## Review Notes

- The four documentation links already present in the post resolve to the intended Chainguard resources.
- Current Chainguard image metadata confirms UID 65532, `/usr/bin/node`, `/usr/bin/python`, and `amd64` plus `arm64` manifests. The current Wolfi APK index confirms the `cmd:ldd`, `so:libpq.so.5`, and `so:libvips.so.42` capabilities used by the commands.
- Node-API addons and CPython Stable ABI (`abi3`) extensions can legitimately work across language versions. The post's exact-version recommendation is conservative; its instruction to compare the actual ABI remains the decisive check for version-specific extensions.
