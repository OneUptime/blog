# How to Use OCI Artifacts for Binary Distribution with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, OCI Artifacts, Binary Distribution, Release Management

Description: Learn how to use OCI artifacts with Podman to distribute compiled binaries, CLI tools, and release archives through container registries.

---

> OCI artifacts turn your container registry into a universal distribution platform for binaries, CLI tools, and release packages alongside your container images.

Distributing compiled binaries and release archives is traditionally done through dedicated artifact repositories, file servers, or package managers. OCI artifacts offer an alternative that leverages your existing container registry infrastructure. With Podman, you can package binaries as OCI artifacts, version them with tags, and distribute them through any OCI-compliant registry. This post demonstrates the full workflow.

---

## Why Distribute Binaries as OCI Artifacts

Using OCI artifacts for binary distribution gives you:

- A single registry for both container images and binaries
- Content-addressable storage with SHA256 digests for integrity
- Tag-based versioning for releases
- Authentication and access control from the registry
- Cross-platform distribution without platform-specific package managers

## Packaging a Single Binary

Start by packaging a compiled binary as an OCI artifact.

```bash
# Simulate building a Go binary

cat > hello.go <<EOF
package main

import "fmt"

func main() {
    fmt.Println("Hello from myapp v1.0")
}
EOF

# Initialize a module so package-based builds work later in the tutorial
go mod init example.com/myapp

# Build the binary
go build -o myapp hello.go

# Add the binary to the Podman artifact store
podman artifact add --replace registry.example.com/myorg/myapp-binary:v1.0-linux-amd64 myapp

# Verify the artifact was added
podman artifact ls | grep myapp-binary
```

## Packaging a Release Archive

For releases with multiple files, create an archive first.

```bash
# Create a release directory structure
mkdir -p release/bin release/config release/docs

# Add release contents
cp myapp release/bin/
cat > release/config/default.yaml <<EOF
server:
  port: 8080
  host: 0.0.0.0
logging:
  level: info
EOF
echo "# MyApp v1.0 Release Notes" > release/docs/CHANGELOG.txt

# Create a tarball
tar -czf myapp-v1.0-linux-amd64.tar.gz -C release .

# Add the archive as an artifact
podman artifact add --replace registry.example.com/myorg/myapp-release:v1.0-linux-amd64 \
    myapp-v1.0-linux-amd64.tar.gz
```

## Multi-Platform Binary Distribution

Distribute binaries for multiple platforms using platform-specific tags.

```bash
# Build and package for each platform
# Linux AMD64
GOOS=linux GOARCH=amd64 go build -o myapp-linux-amd64 hello.go
podman artifact add --replace registry.example.com/myorg/myapp-binary:v1.0-linux-amd64 \
    myapp-linux-amd64

# Linux ARM64
GOOS=linux GOARCH=arm64 go build -o myapp-linux-arm64 hello.go
podman artifact add --replace registry.example.com/myorg/myapp-binary:v1.0-linux-arm64 \
    myapp-linux-arm64

# macOS AMD64
GOOS=darwin GOARCH=amd64 go build -o myapp-darwin-amd64 hello.go
podman artifact add --replace registry.example.com/myorg/myapp-binary:v1.0-darwin-amd64 \
    myapp-darwin-amd64

# Push all platform variants
podman artifact push registry.example.com/myorg/myapp-binary:v1.0-linux-amd64
podman artifact push registry.example.com/myorg/myapp-binary:v1.0-linux-arm64
podman artifact push registry.example.com/myorg/myapp-binary:v1.0-darwin-amd64
```

## Including Checksums with Binaries

Bundle checksums alongside the binary for verification.

```bash
# Generate checksums
sha256sum myapp-linux-amd64 > checksums.txt
sha256sum myapp-linux-arm64 >> checksums.txt
sha256sum myapp-darwin-amd64 >> checksums.txt

# Add checksums as a separate artifact
podman artifact add --replace registry.example.com/myorg/myapp-checksums:v1.0 checksums.txt

# Or bundle the binary and checksum together
sha256sum myapp-linux-amd64 > myapp-linux-amd64.sha256
podman artifact add --replace registry.example.com/myorg/myapp-binary:v1.0-linux-amd64-verified \
    myapp-linux-amd64 myapp-linux-amd64.sha256
```

## Pushing Binaries to a Registry

Push all binary artifacts to make them available for download.

```bash
# Log in to the registry
podman login registry.example.com

# Push the release archive
podman artifact push registry.example.com/myorg/myapp-release:v1.0-linux-amd64

# Push checksums
podman artifact push registry.example.com/myorg/myapp-checksums:v1.0

echo "Release artifacts pushed to registry"
```

## Downloading Binaries from a Registry

On the consumer side, pull the binary artifact and extract it.

```bash
#!/bin/bash
# Download script: fetch myapp from the OCI registry

REGISTRY="registry.example.com"
VERSION="v1.0"
OS="linux"
ARCH="amd64"
ARTIFACT="${REGISTRY}/myorg/myapp-binary:${VERSION}-${OS}-${ARCH}"
TARGET="./myapp"

echo "Downloading myapp ${VERSION} for ${OS}/${ARCH}..."

# Pull the binary artifact into the local artifact store
podman artifact pull "$ARTIFACT"

# Extract the single-file artifact to a local executable
podman artifact extract "$ARTIFACT" "$TARGET"
chmod +x "$TARGET"

echo "Binary artifact extracted to ${TARGET}"
```

## Release Automation Script

Automate the entire release process in a CI/CD pipeline.

```bash
#!/bin/bash
# CI/CD release script: build, package, and push binary artifacts

VERSION="${RELEASE_VERSION:-v0.0.1}"
REGISTRY="registry.example.com"
REPO="myorg/myapp"

echo "Starting release ${VERSION}..."

# Build for all platforms
PLATFORMS=("linux/amd64" "linux/arm64" "darwin/amd64")

for platform in "${PLATFORMS[@]}"; do
    OS=$(echo "$platform" | cut -d/ -f1)
    ARCH=$(echo "$platform" | cut -d/ -f2)
    BINARY="myapp-${OS}-${ARCH}"

    echo "Building for ${OS}/${ARCH}..."
    GOOS=$OS GOARCH=$ARCH go build -o "$BINARY" .

    echo "Adding artifact..."
    podman artifact add --replace "${REGISTRY}/${REPO}-binary:${VERSION}-${OS}-${ARCH}" "$BINARY"

    echo "Pushing artifact..."
    podman artifact push "${REGISTRY}/${REPO}-binary:${VERSION}-${OS}-${ARCH}"
done

echo "Release ${VERSION} complete for all platforms"
```

## Summary

OCI artifacts with Podman provide a powerful way to distribute compiled binaries, CLI tools, and release archives through container registries. You can package single binaries or full release archives, support multiple platforms with tagged variants, include checksums for integrity verification, and automate the entire release process in CI/CD pipelines. This approach consolidates your container images and binary distributions into a single registry, simplifying infrastructure and access control.
