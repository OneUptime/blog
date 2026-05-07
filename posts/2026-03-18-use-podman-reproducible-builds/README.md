# How to Use Podman for Reproducible Builds

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, Reproducible Builds, DevOps, Supply Chain Security

Description: Learn how to use Podman to achieve fully reproducible builds where the same source code always produces identical artifacts, improving security and auditability.

---

> Reproducible builds with Podman ensure that given the same source code and build instructions, you get bit-for-bit identical output every time, on any machine.

Reproducible builds are a critical practice for software supply chain security. When a build is reproducible, anyone can verify that a binary was genuinely produced from the claimed source code. This makes it much harder for attackers to inject malicious code during the build process. Podman helps achieve reproducibility by providing an isolated, well-defined build environment that eliminates the environmental variability that causes non-deterministic builds.

---

## What Makes Builds Non-Reproducible

Before solving the problem, it helps to understand what causes builds to differ between runs. Common sources of non-determinism include timestamps embedded in binaries, file ordering that varies across filesystems, locale and timezone differences, randomized hash seeds, different versions of compilers and libraries, and network fetches that return different content over time.

Podman addresses the environmental factors by providing a consistent, isolated container. But you also need to handle the application-level sources of non-determinism.

## Pinning the Build Environment

The foundation of reproducible builds is a precisely defined build environment. Start by pinning your base image to a specific digest rather than a tag:

```dockerfile
# Bad: tag can change

FROM golang:1.22

# Good: digest is immutable
FROM golang:1.22@sha256:1cf6c45ba39db9fd6db16922041d074a63c935556a05c5ccb62d181034df7f02
```

Find the digest of an image:

```bash
podman image inspect --format='{{.Digest}}' golang:1.22
```

## Locking Dependencies

Every external dependency must be version-locked. Here are examples for different ecosystems.

For Go:

```bash
# go.sum already provides cryptographic verification
# Ensure vendor directory is committed
go mod vendor
```

```dockerfile
FROM golang:1.22@sha256:1cf6c45ba39db9fd6db16922041d074a63c935556a05c5ccb62d181034df7f02

WORKDIR /src
COPY go.mod go.sum ./
COPY vendor/ ./vendor/
COPY . .

# Build using vendored dependencies only
RUN go build -mod=vendor -o /app ./cmd/server
```

For Node.js:

```dockerfile
FROM node:20@sha256:8f693eaa7e0a8e71560c9a82b55fd54c2ae920a2ba5d2cde28bac7d1c01c9ba5

WORKDIR /src
COPY package.json package-lock.json ./

# Use ci for deterministic installs
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build
```

For Python:

```dockerfile
FROM python:3.12@sha256:29cdc34ede8cd9716d1f40a8200447355ae210c05a539c1b0262ccc5fcaf183c

WORKDIR /src
COPY requirements.txt ./

# Use hash verification
RUN python -m pip install --no-cache-dir --require-hashes -r requirements.txt
RUN python -m pip install --no-cache-dir build

COPY . .
RUN python -m build
```

Generate a requirements file with hashes:

```bash
pip install pip-tools
pip-compile --generate-hashes requirements.in -o requirements.txt
```

## Eliminating Timestamps

Many build tools embed timestamps in their output. Strip them for reproducibility.

For Go:

```dockerfile
RUN CGO_ENABLED=0 go build \
    -trimpath \
    -ldflags="-s -w -buildid=" \
    -o /app ./cmd/server
```

The `-trimpath` flag removes filesystem paths from the binary, and `-buildid=` clears the Go toolchain build ID from the linked binary.

For C/C++ with GCC:

```dockerfile
ENV SOURCE_DATE_EPOCH=1700000000

RUN gcc -o myapp main.c \
    -ffile-prefix-map=/build=. \
    -fno-guess-branch-probability \
    -frandom-seed=reproducible
```

The `SOURCE_DATE_EPOCH` environment variable is recognized by many build tools as a way to set a deterministic timestamp.

## Deterministic Container Builds

Podman itself can introduce non-determinism through layer timestamps and metadata. Use these techniques to minimize it:

```bash
# Set a fixed timestamp for the build
export SOURCE_DATE_EPOCH=$(git log -1 --format=%ct)

# Build with timestamp clamping
podman build \
  --timestamp "$SOURCE_DATE_EPOCH" \
  --build-arg SOURCE_DATE_EPOCH="$SOURCE_DATE_EPOCH" \
  -t myapp:reproducible .
```

The `--timestamp` flag tells Podman to use a specific timestamp for the image creation metadata.

## A Complete Reproducible Build Pipeline

Here is a full example that brings all the techniques together:

```dockerfile
# Containerfile.reproducible
FROM rust:1.77@sha256:83101f6985c93e1e6501b3375de188ee3d2cbb89968bcc91611591f9f447bd42 AS builder

# Set deterministic build environment
ARG SOURCE_DATE_EPOCH
ENV SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH}
ENV CARGO_INCREMENTAL=0
ENV RUSTFLAGS="-C debuginfo=0"

WORKDIR /src

# Copy and lock dependencies first
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && \
    cargo build --release --locked && \
    rm -rf src

# Copy source and build
COPY src/ ./src/
RUN cargo build --release --locked

# Minimal runtime image
FROM debian:bookworm-slim@sha256:f9c6a2fd2ddbc23e336b6257a5245e31f996953ef06cd13a59fa0a1df2d5c252
COPY --from=builder /src/target/release/myapp /myapp
ENTRYPOINT ["/myapp"]
```

The build script:

```bash
#!/bin/bash
# reproducible-build.sh

set -euo pipefail

# Use the git commit timestamp as the epoch
export SOURCE_DATE_EPOCH=$(git log -1 --format=%ct)
COMMIT_SHA=$(git rev-parse HEAD)

echo "Building from commit $COMMIT_SHA"
echo "Source date epoch: $SOURCE_DATE_EPOCH"

# Build the image
podman build \
  --timestamp "$SOURCE_DATE_EPOCH" \
  --build-arg SOURCE_DATE_EPOCH="$SOURCE_DATE_EPOCH" \
  --no-cache \
  -t "myapp:$COMMIT_SHA" \
  -f Containerfile.reproducible \
  .

# Generate and save the image digest
DIGEST=$(podman image inspect --format='{{.Digest}}' "myapp:$COMMIT_SHA")
echo "Image digest: $DIGEST"
echo "$DIGEST" > build-digest.txt

# Export the image for verification
podman save "myapp:$COMMIT_SHA" -o "myapp-$COMMIT_SHA.tar"
SHA256=$(sha256sum "myapp-$COMMIT_SHA.tar" | awk '{print $1}')
echo "Archive SHA256: $SHA256"
echo "$SHA256" > build-sha256.txt
```

## Verifying Reproducibility

The ultimate test of reproducibility is building the same commit on different machines and comparing the results:

```bash
#!/bin/bash
# verify-reproducible.sh

set -euo pipefail

COMMIT_SHA=$(git rev-parse HEAD)

# Build twice
echo "First build..."
./reproducible-build.sh
DIGEST_1=$(cat build-digest.txt)
SHA256_1=$(cat build-sha256.txt)

# Clean up
podman rmi "myapp:$COMMIT_SHA" -f
podman system prune -f

echo "Second build..."
./reproducible-build.sh
DIGEST_2=$(cat build-digest.txt)
SHA256_2=$(cat build-sha256.txt)

# Compare
echo ""
echo "Build 1 digest: $DIGEST_1"
echo "Build 2 digest: $DIGEST_2"
echo "Build 1 SHA256: $SHA256_1"
echo "Build 2 SHA256: $SHA256_2"

if [ "$SHA256_1" = "$SHA256_2" ]; then
    echo "PASS: Builds are reproducible"
else
    echo "FAIL: Builds differ"
    exit 1
fi
```

## Handling Unavoidable Non-Determinism

Some non-determinism is difficult to eliminate. In those cases, document it and work around it:

```dockerfile
# Sort file listings to avoid filesystem ordering differences
RUN find /app/static -type f | sort | xargs sha256sum > /app/static-manifest.txt

# Use a fixed locale
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

# Set a fixed timezone
ENV TZ=UTC
```

## Recording Build Provenance

Even with reproducible builds, recording provenance metadata adds an extra layer of trust:

```bash
#!/bin/bash
# generate-provenance.sh

set -euo pipefail

COMMIT_SHA=$(git rev-parse HEAD)
BUILDER=$(hostname)
BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
SOURCE_DATE_EPOCH=${SOURCE_DATE_EPOCH:-$(git log -1 --format=%ct)}
DIGEST=$(podman image inspect --format='{{.Digest}}' "myapp:$COMMIT_SHA")

cat > provenance.json <<EOF
{
  "builder": "$BUILDER",
  "buildTime": "$BUILD_TIME",
  "source": {
    "repository": "$(git remote get-url origin)",
    "commit": "$COMMIT_SHA",
    "branch": "$(git rev-parse --abbrev-ref HEAD)"
  },
  "image": {
    "digest": "$DIGEST"
  },
  "reproducible": true,
  "sourceDateEpoch": $SOURCE_DATE_EPOCH
}
EOF

echo "Provenance recorded in provenance.json"
```

## Conclusion

Reproducible builds are essential for software supply chain security, and Podman provides the foundational isolation needed to achieve them. By pinning base images to digests, locking all dependencies, eliminating timestamps, and using deterministic build flags, you can produce builds that are verifiably identical across machines and time. The combination of Podman containers for environmental consistency and language-specific reproducibility techniques gives you a practical path to builds that anyone can independently verify.
