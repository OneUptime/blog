# Why Native Modules Fail in a Chainguard Runtime After Building

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chainguard, Python, Node.js, Native Module, Container

Description: Diagnose native Python and Node.js modules that build successfully but fail in a minimal Chainguard runtime because of ABI or library mismatches.

---

A successful builder stage proves that a compiler produced or installed an artifact in the builder. It does not prove that the artifact can load in the final runtime.

Native Python extensions (`.so` files inside wheels) and Node.js addons (`.node` files) depend on combinations of language ABI, CPU architecture, libc, dynamic loader, and shared libraries. A development image contains build tools and libraries that its standard runtime intentionally omits.

## Recognize the failure class

Common messages include:

```text
ImportError: libpq.so.5: cannot open shared object file
ImportError: undefined symbol: ...
Error: Module did not self-register
Error: The module was compiled against a different Node.js version
exec format error
```

They point to different layers:

- `cannot open shared object file`: a runtime library is absent or not on the loader path;
- `undefined symbol` or `GLIBC_x.y not found`: the library exists but exposes an incompatible ABI;
- Node module version mismatch: builder and runtime use different Node ABIs;
- Python module suffix or initialization mismatch: CPython version or ABI differs;
- `exec format error`: the artifact was built for another architecture or is not a valid executable for the target.

## Never copy host dependencies

Do not build `node_modules` or a Python virtual environment on macOS, Windows, Alpine, or a different CPU and then copy it into a Wolfi-based Linux image.

Build inside a target-platform Chainguard stage:

```dockerfile
FROM cgr.dev/chainguard/node:latest-dev AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

FROM cgr.dev/chainguard/node:latest

WORKDIR /app
COPY --from=build --chown=65532:65532 /app /app
ENTRYPOINT ["/usr/bin/node", "/app/server.js"]
```

Add `node_modules` and `.venv` to `.dockerignore` so local artifacts cannot shadow the container build.

## Match the language version exactly

Floating `latest-dev` and `latest` tags are convenient for examples, but production builds should use a reviewed version stream and digests. Confirm the ABIs in the builder:

```bash
node -p 'process.version + " modules=" + process.versions.modules'

python -c 'import sys, sysconfig; print(sys.version); print(sysconfig.get_config_var("SOABI"))'
```

Run the same commands against the final image by replacing its entrypoint:

```bash
docker run --rm \
  --entrypoint /usr/bin/node \
  app:test \
  -p 'process.version + " modules=" + process.versions.modules'

docker run --rm \
  --entrypoint /usr/bin/python \
  app:test \
  -c 'import sys, sysconfig; print(sys.version); print(sysconfig.get_config_var("SOABI"))'
```

Major or minor language equality is not always sufficient. Compare the actual ABI output.

## Inspect native dependencies in the builder

Install diagnostic tools as root in the disposable builder, then switch back to the non-root user:

```dockerfile
USER root
RUN apk add --no-cache file binutils cmd:ldd
USER 65532
```

```bash
file path/to/extension.so
readelf -d path/to/extension.so
ldd path/to/extension.so
```

Look for:

- the expected `x86-64` or `aarch64` machine;
- `NEEDED` entries for runtime libraries;
- `not found` in `ldd`;
- RPATH or RUNPATH entries tied to a builder-only directory.

Shared objects do not normally contain a `PT_INTERP` entry. The Python or Node.js executable selects the dynamic loader.

`ldd` evaluates loading behavior, so use it only on artifacts you trust. `readelf -d` is a safer static first look.

Next compare the required libraries with the runtime SBOM. Search the APK index by shared-object capability as root in a disposable matching `-dev` image:

```bash
docker run --rm \
  --user root \
  --entrypoint /bin/sh \
  cgr.dev/chainguard/node:latest-dev \
  -c "apk update && apk search 'so:libpq.so.5' && apk search 'so:libvips.so*'"
```

The `-dev` package normally supplies headers and linker metadata. The package without `-dev` normally supplies runtime libraries, but confirm through the package index rather than relying on naming alone.

## Add only demonstrated runtime libraries

If the runtime needs an APK, use Chainguard Custom Assembly or the documented multi-stage method for adding APKs to a distroless filesystem. Do not retain `gcc`, headers, `npm`, `pip`, or `apk` merely because they were needed to build.

Also check whether the dependency offers a compatible prebuilt wheel or addon. Wolfi uses glibc, so a `manylinux` Python wheel can be a better fit than a musl-targeted artifact. Wheel filenames carry Python, ABI, and platform tags; a `manylinux_x_y_arch` platform tag encodes the minimum supported glibc version and architecture. A filename ending in `aarch64.whl` cannot run on `x86_64`.

## Test the import in the final stage

Make native imports a build or CI gate. When Psycopg was installed with its `c` extra, force that implementation so it cannot fall back to the pure-Python implementation:

```bash
docker run --rm \
  --env PSYCOPG_IMPL=c \
  --entrypoint /app/venv/bin/python \
  python-app:test \
  -c 'import psycopg; from cryptography.hazmat.primitives import hashes; hashes.Hash(hashes.SHA256()); print("native imports ok")'

docker run --rm \
  --entrypoint /usr/bin/node \
  node-app:test \
  -e 'const db = require("better-sqlite3")(":memory:"); db.close(); console.log("native imports ok")'
```

Run one test image per deployment architecture. A multi-platform manifest can contain a correct `amd64` image and a broken `arm64` image while a local test exercises only one.

If rebuilds begin failing without a source change, compare the builder and runtime digests and SBOMs. Chainguard tags move as nightly rebuilds take in package updates. Pinning both stages gives reproducibility, while automated reviewed digest updates keep security fixes flowing.

## Official Documentation

- [Getting started with the Python Chainguard Container](https://edu.chainguard.dev/chainguard/chainguard-images/getting-started/python/)
- [Migrating to Node.js Chainguard Containers](https://edu.chainguard.dev/get-started/migration/migration-guides/migrating-node/)
- [glibc versus musl](https://edu.chainguard.dev/chainguard/chainguard-images/about/images-compiled-programs/glibc-vs-musl/)
- [Chainguard package and image name mappings](https://edu.chainguard.dev/chainguard/chainguard-images/about/package-name-mappings/)
