# How to Generate SBOMs with Syft

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Security, SBOM, Syft, Software Supply Chain, Compliance, DevSecOps, Container Security

Description: Learn how to use Syft to generate Software Bills of Materials for your applications and container images, enabling vulnerability tracking and compliance with software supply chain requirements.

---

A Software Bill of Materials (SBOM) is an inventory of all components in your software. Just as a physical product has a parts list, an SBOM lists every library, framework, and dependency your application includes. Syft, from Anchore, generates SBOMs in standard formats. This guide covers installation, scanning techniques, format options, and integration into your build pipeline.

## Why SBOMs Matter

SBOMs enable:

- **Vulnerability response**: Quickly identify if you use a vulnerable component (like Log4j)
- **License compliance**: Know which open source licenses you are subject to
- **Regulatory compliance**: Meet requirements from Executive Order 14028, FDA, and others
- **Supply chain visibility**: Understand what you ship to customers
- **Incident investigation**: Determine which applications need patching

Without an SBOM, answering "do we use package X?" requires scanning every system.

## Installing Syft

Syft is a single binary available for all major platforms:

```bash
# macOS with Homebrew
brew install syft

# Linux (download from GitHub releases)
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin

# Using Docker
docker run --rm anchore/syft:latest --help

# Verify installation
syft version
# syft 0.100.0
```

## Scanning Container Images

The most common use case is generating an SBOM for a container image:

```bash
# Scan an image from a registry
syft nginx:1.25

# Scan a locally built image
docker build -t myapp:v1.0 .
syft myapp:v1.0

# Scan an image archive (tar file)
docker save nginx:1.25 -o nginx.tar
syft docker-archive:nginx.tar
```

Default output shows package names, versions, and types:

```
NAME                   VERSION        TYPE
adduser                3.134          deb
apt                    2.6.1          deb
base-files             12.4+deb12u5   deb
bash                   5.2.15-2       deb
...
nginx                  1.25.3         deb
openssl                3.0.11-1       deb
```

## Scanning Directories and Files

Syft scans more than just containers:

```bash
# Scan a directory (finds package manifests)
syft dir:/path/to/project

# Scan a specific file
syft file:/path/to/project/package-lock.json

# Scan source code repository
syft dir:. --source-name="my-project" --source-version="1.0.0"
```

Syft detects package manifests automatically:

- `package.json` and `package-lock.json` (npm)
- `requirements.txt`, `Pipfile.lock`, `poetry.lock` (Python)
- `pom.xml`, `build.gradle` (Java)
- `go.mod`, `go.sum` (Go)
- `Gemfile.lock` (Ruby)
- `Cargo.lock` (Rust)
- And many more

## Output Formats

Syft supports multiple SBOM formats. Choose based on your tooling requirements.

### SPDX (ISO Standard)

```bash
# SPDX JSON format
syft nginx:1.25 -o spdx-json > sbom.spdx.json

# SPDX tag-value format
syft nginx:1.25 -o spdx > sbom.spdx
```

Example SPDX JSON output:

```json
{
  "spdxVersion": "SPDX-2.3",
  "dataLicense": "CC0-1.0",
  "SPDXID": "SPDXRef-DOCUMENT",
  "name": "nginx:1.25",
  "packages": [
    {
      "SPDXID": "SPDXRef-Package-deb-nginx-1.25.3",
      "name": "nginx",
      "versionInfo": "1.25.3",
      "supplier": "Organization: Debian",
      "licenseConcluded": "BSD-2-Clause",
      "externalRefs": [
        {
          "referenceCategory": "SECURITY",
          "referenceType": "cpe23Type",
          "referenceLocator": "cpe:2.3:a:nginx:nginx:1.25.3:*:*:*:*:*:*:*"
        }
      ]
    }
  ]
}
```

### CycloneDX (OWASP Standard)

```bash
# CycloneDX JSON format
syft nginx:1.25 -o cyclonedx-json > sbom.cdx.json

# CycloneDX XML format
syft nginx:1.25 -o cyclonedx-xml > sbom.cdx.xml
```

Example CycloneDX output:

```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "version": 1,
  "metadata": {
    "component": {
      "name": "nginx",
      "version": "1.25",
      "type": "container"
    }
  },
  "components": [
    {
      "type": "library",
      "name": "nginx",
      "version": "1.25.3",
      "purl": "pkg:deb/debian/nginx@1.25.3?arch=amd64",
      "licenses": [
        {
          "license": {
            "id": "BSD-2-Clause"
          }
        }
      ]
    }
  ]
}
```

### Syft Native Format

```bash
# Syft JSON (most detailed)
syft nginx:1.25 -o syft-json > sbom.syft.json

# Table format (default, human-readable)
syft nginx:1.25 -o syft-table
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/sbom.yml
name: Generate SBOM

on:
  push:
    branches: [main]
  release:
    types: [published]

jobs:
  sbom:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          image: myapp:${{ github.sha }}
          format: spdx-json
          output-file: sbom.spdx.json

      - name: Upload SBOM as artifact
        uses: actions/upload-artifact@v3
        with:
          name: sbom
          path: sbom.spdx.json

      - name: Attach SBOM to release
        if: github.event_name == 'release'
        uses: softprops/action-gh-release@v1
        with:
          files: sbom.spdx.json
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - build
  - sbom

build:
  stage: build
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

generate-sbom:
  stage: sbom
  image: anchore/syft:latest
  script:
    - syft $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA -o spdx-json > sbom.spdx.json
    - syft $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA -o cyclonedx-json > sbom.cdx.json
  artifacts:
    paths:
      - sbom.spdx.json
      - sbom.cdx.json
    expire_in: 1 year
```

## Combining with Vulnerability Scanning

Pair Syft with Grype (also from Anchore) for vulnerability scanning:

```bash
# Generate SBOM
syft nginx:1.25 -o syft-json > sbom.json

# Scan SBOM for vulnerabilities
grype sbom:sbom.json

# Or scan directly (Grype uses Syft internally)
grype nginx:1.25
```

This separation allows you to store SBOMs and rescan them when new vulnerabilities are discovered, without rebuilding images.

## Attesting SBOMs

Attach SBOMs to container images as attestations using Cosign:

```bash
# Generate SBOM
syft myapp:v1.0 -o spdx-json > sbom.spdx.json

# Create attestation (signs and attaches to image)
cosign attest --predicate sbom.spdx.json \
  --type spdxjson \
  myapp:v1.0

# Verify attestation
cosign verify-attestation \
  --type spdxjson \
  myapp:v1.0
```

## Docker BuildKit Integration

Generate SBOMs during docker build:

```bash
# Enable BuildKit SBOM generation
DOCKER_BUILDKIT=1 docker build \
  --sbom=true \
  --output type=local,dest=./output \
  -t myapp:v1.0 .

# The SBOM is in ./output/sbom.spdx.json
```

Or use buildx:

```bash
docker buildx build \
  --sbom=true \
  --output type=image,name=myapp:v1.0,push=true \
  .
```

## Cataloging and Storage

Store SBOMs alongside your artifacts:

```bash
# Store in S3
aws s3 cp sbom.spdx.json s3://my-bucket/sboms/myapp/v1.0/sbom.spdx.json

# Store in OCI registry as artifact
oras push registry.example.com/myapp:v1.0-sbom \
  --artifact-type application/spdx+json \
  sbom.spdx.json:application/spdx+json
```

## Configuration File

Create a Syft configuration for consistent scanning:

```yaml
# .syft.yaml
# Output format
output:
  - "spdx-json"
  - "cyclonedx-json"

# Cataloger settings
package:
  cataloger:
    enabled: true
    scope: "all-layers"

# File classifications
file:
  content:
    skip-files-above-size: 1048576  # Skip files larger than 1MB

# Source metadata
source:
  name: "myapp"
  version: "${VERSION}"

# Exclude patterns
exclude:
  - "**/test/**"
  - "**/node_modules/**"
```

Run with config:

```bash
syft nginx:1.25 -c .syft.yaml
```

## Querying SBOMs

Use tools like `jq` to query SBOM contents:

```bash
# List all packages
jq '.packages[].name' sbom.spdx.json

# Find specific package
jq '.packages[] | select(.name == "openssl")' sbom.spdx.json

# Count packages by type
jq '.artifacts | group_by(.type) | map({type: .[0].type, count: length})' sbom.syft.json

# Extract all licenses
jq '[.packages[].licenseConcluded] | unique' sbom.spdx.json
```

---

SBOMs transform software transparency from aspiration to practice. Generate them during build, store them with your releases, and use them to respond quickly when vulnerabilities emerge. Syft makes generation straightforward; the challenge is building the organizational habit of treating SBOMs as essential build artifacts.
