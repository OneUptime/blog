# How to Secure Go Binaries with Code Signing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Security, Code Signing, Supply Chain, DevOps

Description: Secure Go binaries with code signing for supply chain security, covering GPG signing, Sigstore/cosign, and verification workflows.

---

Supply chain attacks have become one of the most significant threats to software security. When users download your Go binaries, they need assurance that the code comes from you and has not been tampered with. Code signing provides this cryptographic guarantee, establishing trust between developers and end users.

This guide covers comprehensive approaches to securing your Go binaries through code signing, from traditional GPG methods to modern keyless signing with Sigstore. We will explore practical implementations for CI/CD pipelines, verification workflows, and complementary security measures like SBOM generation and reproducible builds.

## Understanding Code Signing Fundamentals

Code signing uses asymmetric cryptography to create a digital signature that proves two things: the identity of the signer and the integrity of the signed content. When you sign a binary, you use your private key to generate a signature. Anyone with access to your public key can verify that signature, confirming the binary came from you and has not been modified.

### Why Code Signing Matters for Go Binaries

Go produces statically linked binaries that are easy to distribute but also easy to tamper with. Without verification mechanisms, users cannot distinguish between legitimate releases and malicious ones. Code signing addresses several critical concerns:

- **Authenticity**: Confirms the binary comes from the claimed source
- **Integrity**: Detects any modifications after signing
- **Non-repudiation**: The signer cannot deny having signed the content
- **Trust chain**: Enables verification without direct communication

### Components of a Signing Infrastructure

A complete signing infrastructure includes:

1. **Key management**: Secure storage and access control for signing keys
2. **Signing process**: Automated and reproducible signing workflows
3. **Distribution**: Publishing signatures alongside binaries
4. **Verification**: Tools and documentation for users to verify signatures
5. **Revocation**: Mechanisms to invalidate compromised keys

## GPG Signing for Go Binaries

GPG (GNU Privacy Guard) provides a mature, widely-understood approach to signing. Many organizations already have GPG infrastructure in place, making it a practical choice for binary signing.

### Setting Up GPG Keys for Signing

First, generate a dedicated signing key for your project. Using a separate key from your personal one improves security and simplifies key management.

```bash
# Generate a new GPG key specifically for code signing
# Use RSA with 4096 bits for strong security
# Set an expiration date to limit exposure if compromised
gpg --full-generate-key

# During the interactive prompts:
# - Select RSA and RSA (option 1)
# - Choose 4096 bits
# - Set expiration (recommend 2 years)
# - Enter your project identity

# List your keys to get the key ID
gpg --list-secret-keys --keyid-format LONG

# Example output:
# sec   rsa4096/ABC123DEF456GHI7 2026-01-07 [SC] [expires: 2028-01-07]
#       ABCDEF1234567890ABCDEF1234567890ABC123DE
# uid                 [ultimate] Project Release Signing <releases@example.com>
```

### Creating Detached Signatures

Detached signatures are stored separately from the binary, allowing users to download and verify independently.

```bash
# Build your Go binary with version information
# Using ldflags embeds build metadata for traceability
go build -ldflags="-X main.version=1.2.3 -X main.commit=$(git rev-parse HEAD)" \
    -o myapp ./cmd/myapp

# Create a detached ASCII-armored signature
# ASCII armor makes the signature easy to distribute and inspect
gpg --armor --detach-sign --output myapp.asc myapp

# Alternatively, create a binary signature (smaller but not human-readable)
gpg --detach-sign --output myapp.sig myapp

# Generate checksums alongside signatures for additional verification
sha256sum myapp > myapp.sha256
sha512sum myapp > myapp.sha512
```

### Verifying GPG Signatures

Users need your public key to verify signatures. Publish it on key servers and your website.

```bash
# Export your public key for distribution
gpg --armor --export releases@example.com > release-signing-key.asc

# Upload to key servers for discovery
gpg --keyserver keys.openpgp.org --send-keys ABC123DEF456GHI7

# Users import your key before verification
gpg --import release-signing-key.asc

# Or fetch from keyserver
gpg --keyserver keys.openpgp.org --recv-keys ABC123DEF456GHI7

# Verify the signature against the binary
# A successful verification shows "Good signature from..."
gpg --verify myapp.asc myapp
```

### Automating GPG Signing in Scripts

For automated builds, you need to handle GPG non-interactively. This requires careful key management.

```bash
#!/bin/bash
# sign-release.sh - Automated GPG signing script

set -euo pipefail

BINARY_NAME="${1:?Binary name required}"
GPG_KEY_ID="${GPG_KEY_ID:?GPG key ID must be set}"

# Ensure GPG agent is available for passphrase handling
export GPG_TTY=$(tty)

# Sign the binary with the specified key
# --batch enables non-interactive mode
# --yes overwrites existing signatures
gpg --batch --yes --armor --detach-sign \
    --local-user "${GPG_KEY_ID}" \
    --output "${BINARY_NAME}.asc" \
    "${BINARY_NAME}"

# Generate checksums
sha256sum "${BINARY_NAME}" > "${BINARY_NAME}.sha256"

# Verify the signature we just created
gpg --verify "${BINARY_NAME}.asc" "${BINARY_NAME}"

echo "Successfully signed ${BINARY_NAME}"
```

## Sigstore and Cosign: Modern Keyless Signing

Sigstore represents a paradigm shift in code signing. Instead of managing long-lived keys, Sigstore uses ephemeral keys tied to identity providers like GitHub, Google, or Microsoft. This eliminates the burden of key management while providing strong cryptographic guarantees.

### Understanding Sigstore Architecture

Sigstore consists of several components:

- **Fulcio**: A certificate authority that issues short-lived certificates based on OIDC identity
- **Rekor**: A transparency log that records signing events immutably
- **Cosign**: A tool for signing and verifying containers and blobs

When you sign with cosign, it authenticates you via OIDC, requests a certificate from Fulcio, signs your artifact, and records the event in Rekor. The transparency log provides an auditable record of all signing events.

### Installing and Configuring Cosign

```bash
# Install cosign using Go
go install github.com/sigstore/cosign/v2/cmd/cosign@latest

# Alternatively, download a release binary
# Verify the cosign binary itself using the bootstrap key
curl -LO https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64
curl -LO https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64.sig
curl -LO https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64.pem

# Verify cosign installation
cosign verify-blob \
    --certificate cosign-linux-amd64.pem \
    --signature cosign-linux-amd64.sig \
    --certificate-identity keyless@projectsigstore.iam.gserviceaccount.com \
    --certificate-oidc-issuer https://accounts.google.com \
    cosign-linux-amd64

chmod +x cosign-linux-amd64
sudo mv cosign-linux-amd64 /usr/local/bin/cosign
```

### Keyless Signing with Cosign

Keyless signing eliminates the need to manage private keys. Your identity (from GitHub, Google, etc.) becomes your signing credential.

```bash
# Build your Go binary
go build -o myapp ./cmd/myapp

# Sign using keyless mode (opens browser for OIDC authentication)
# This creates myapp.sig (signature) and myapp.pem (certificate)
cosign sign-blob --output-signature myapp.sig \
    --output-certificate myapp.pem \
    myapp

# For headless environments, use device flow
COSIGN_EXPERIMENTAL=1 cosign sign-blob \
    --output-signature myapp.sig \
    --output-certificate myapp.pem \
    --oidc-device-flow \
    myapp
```

### Verifying Keyless Signatures

Verification requires specifying the expected identity, providing defense against signing by unauthorized parties.

```bash
# Verify a blob signed with keyless signing
# Must specify the expected certificate identity and OIDC issuer
cosign verify-blob \
    --signature myapp.sig \
    --certificate myapp.pem \
    --certificate-identity developer@example.com \
    --certificate-oidc-issuer https://accounts.google.com \
    myapp

# For GitHub Actions workflows, the identity is the workflow file
cosign verify-blob \
    --signature myapp.sig \
    --certificate myapp.pem \
    --certificate-identity https://github.com/org/repo/.github/workflows/release.yml@refs/tags/v1.2.3 \
    --certificate-oidc-issuer https://token.actions.githubusercontent.com \
    myapp
```

### Using Keypair Mode with Cosign

For environments where you prefer traditional key management, cosign supports generating and using keypairs.

```bash
# Generate a new keypair
# Stores keys as cosign.key (private) and cosign.pub (public)
cosign generate-key-pair

# Sign with your private key
cosign sign-blob --key cosign.key \
    --output-signature myapp.sig \
    myapp

# Verify with the public key
cosign verify-blob --key cosign.pub \
    --signature myapp.sig \
    myapp

# Store keys in cloud KMS for better security
# Supports AWS KMS, GCP KMS, Azure Key Vault, HashiCorp Vault
cosign generate-key-pair --kms gcpkms://projects/myproject/locations/global/keyRings/myring/cryptoKeys/mykey

# Sign using cloud KMS
cosign sign-blob --key gcpkms://projects/myproject/locations/global/keyRings/myring/cryptoKeys/mykey \
    --output-signature myapp.sig \
    myapp
```

## CI/CD Pipeline Integration

Automating code signing in CI/CD pipelines ensures every release is signed without manual intervention. This section covers integration with GitHub Actions, GitLab CI, and general patterns.

### GitHub Actions with Keyless Signing

GitHub Actions provides OIDC tokens that Sigstore accepts, enabling fully automated keyless signing.

```yaml
# .github/workflows/release.yml
name: Release with Code Signing

on:
  push:
    tags:
      - 'v*'

# Required permissions for OIDC token and release creation
permissions:
  contents: write
  id-token: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Install cosign
        uses: sigstore/cosign-installer@v3

      # Build binaries for multiple platforms
      - name: Build binaries
        run: |
          # Define target platforms
          platforms=("linux/amd64" "linux/arm64" "darwin/amd64" "darwin/arm64" "windows/amd64")

          for platform in "${platforms[@]}"; do
            GOOS="${platform%/*}"
            GOARCH="${platform#*/}"
            output="myapp-${GOOS}-${GOARCH}"

            if [ "$GOOS" = "windows" ]; then
              output="${output}.exe"
            fi

            echo "Building for $GOOS/$GOARCH..."
            CGO_ENABLED=0 GOOS=$GOOS GOARCH=$GOARCH go build \
              -ldflags="-s -w -X main.version=${{ github.ref_name }}" \
              -o "dist/${output}" \
              ./cmd/myapp
          done

      # Sign all binaries using keyless signing
      # GitHub's OIDC token is automatically used
      - name: Sign binaries
        run: |
          cd dist
          for binary in myapp-*; do
            echo "Signing ${binary}..."
            cosign sign-blob "${binary}" \
              --output-signature "${binary}.sig" \
              --output-certificate "${binary}.pem" \
              --yes

            # Generate checksum
            sha256sum "${binary}" > "${binary}.sha256"
          done

      # Create release with all artifacts
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            dist/myapp-*
            dist/*.sig
            dist/*.pem
            dist/*.sha256
          generate_release_notes: true
```

### GitHub Actions with GPG Signing

For organizations preferring GPG, import the key securely using secrets.

```yaml
# .github/workflows/release-gpg.yml
name: Release with GPG Signing

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      # Import GPG key from secrets
      # Store the base64-encoded private key in GPG_PRIVATE_KEY secret
      - name: Import GPG key
        run: |
          echo "${{ secrets.GPG_PRIVATE_KEY }}" | base64 -d | gpg --batch --import
          echo "${{ secrets.GPG_PASSPHRASE }}" | gpg --batch --yes --pinentry-mode loopback \
            --passphrase-fd 0 --sign --armor /dev/null

      - name: Build and sign binaries
        env:
          GPG_PASSPHRASE: ${{ secrets.GPG_PASSPHRASE }}
          GPG_KEY_ID: ${{ secrets.GPG_KEY_ID }}
        run: |
          mkdir -p dist

          platforms=("linux/amd64" "linux/arm64" "darwin/amd64" "darwin/arm64")

          for platform in "${platforms[@]}"; do
            GOOS="${platform%/*}"
            GOARCH="${platform#*/}"
            output="myapp-${GOOS}-${GOARCH}"

            CGO_ENABLED=0 GOOS=$GOOS GOARCH=$GOARCH go build \
              -ldflags="-s -w -X main.version=${{ github.ref_name }}" \
              -o "dist/${output}" \
              ./cmd/myapp

            # Sign with GPG using passphrase from stdin
            echo "${GPG_PASSPHRASE}" | gpg --batch --yes \
              --pinentry-mode loopback --passphrase-fd 0 \
              --local-user "${GPG_KEY_ID}" \
              --armor --detach-sign \
              --output "dist/${output}.asc" \
              "dist/${output}"

            sha256sum "dist/${output}" > "dist/${output}.sha256"
          done

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: dist/*
```

### GitLab CI with Cosign

GitLab CI also supports OIDC tokens for Sigstore integration.

```yaml
# .gitlab-ci.yml
stages:
  - build
  - sign
  - release

variables:
  GO_VERSION: "1.22"

build:
  stage: build
  image: golang:${GO_VERSION}
  script:
    - mkdir -p dist
    - |
      for GOOS in linux darwin; do
        for GOARCH in amd64 arm64; do
          output="myapp-${GOOS}-${GOARCH}"
          CGO_ENABLED=0 GOOS=$GOOS GOARCH=$GOARCH go build \
            -ldflags="-s -w -X main.version=${CI_COMMIT_TAG}" \
            -o "dist/${output}" \
            ./cmd/myapp
        done
      done
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour
  rules:
    - if: $CI_COMMIT_TAG

sign:
  stage: sign
  image: alpine:latest
  # Enable OIDC token generation for Sigstore
  id_tokens:
    SIGSTORE_ID_TOKEN:
      aud: sigstore
  before_script:
    - apk add --no-cache curl
    - curl -LO https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64
    - chmod +x cosign-linux-amd64
    - mv cosign-linux-amd64 /usr/local/bin/cosign
  script:
    - cd dist
    - |
      for binary in myapp-*; do
        cosign sign-blob "${binary}" \
          --output-signature "${binary}.sig" \
          --output-certificate "${binary}.pem" \
          --yes
        sha256sum "${binary}" > "${binary}.sha256"
      done
  artifacts:
    paths:
      - dist/
  rules:
    - if: $CI_COMMIT_TAG

release:
  stage: release
  image: registry.gitlab.com/gitlab-org/release-cli:latest
  script:
    - echo "Creating release for ${CI_COMMIT_TAG}"
  release:
    tag_name: $CI_COMMIT_TAG
    description: "Release ${CI_COMMIT_TAG}"
    assets:
      links:
        - name: "Linux AMD64 Binary"
          url: "${CI_PROJECT_URL}/-/jobs/${CI_JOB_ID}/artifacts/file/dist/myapp-linux-amd64"
        - name: "Linux AMD64 Signature"
          url: "${CI_PROJECT_URL}/-/jobs/${CI_JOB_ID}/artifacts/file/dist/myapp-linux-amd64.sig"
  rules:
    - if: $CI_COMMIT_TAG
```

## Verification Workflows

Providing clear verification instructions helps users trust your releases. Document the process thoroughly and provide helper scripts.

### Creating a Verification Script

```bash
#!/bin/bash
# verify-release.sh - Verify downloaded release binaries

set -euo pipefail

# Configuration
BINARY="${1:?Usage: verify-release.sh <binary-file>}"
EXPECTED_IDENTITY="${EXPECTED_IDENTITY:-https://github.com/yourorg/yourrepo/.github/workflows/release.yml@refs/tags/*}"
EXPECTED_ISSUER="${EXPECTED_ISSUER:-https://token.actions.githubusercontent.com}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "Verifying ${BINARY}..."

# Check if cosign is installed
if ! command -v cosign &> /dev/null; then
    echo -e "${RED}Error: cosign is not installed${NC}"
    echo "Install from: https://github.com/sigstore/cosign/releases"
    exit 1
fi

# Check for signature and certificate files
SIGNATURE="${BINARY}.sig"
CERTIFICATE="${BINARY}.pem"
CHECKSUM="${BINARY}.sha256"

if [[ ! -f "${SIGNATURE}" ]]; then
    echo -e "${RED}Error: Signature file not found: ${SIGNATURE}${NC}"
    exit 1
fi

if [[ ! -f "${CERTIFICATE}" ]]; then
    echo -e "${RED}Error: Certificate file not found: ${CERTIFICATE}${NC}"
    exit 1
fi

# Verify checksum first (quick integrity check)
if [[ -f "${CHECKSUM}" ]]; then
    echo "Verifying SHA256 checksum..."
    if sha256sum -c "${CHECKSUM}"; then
        echo -e "${GREEN}Checksum verification passed${NC}"
    else
        echo -e "${RED}Checksum verification failed!${NC}"
        exit 1
    fi
fi

# Verify Sigstore signature
echo "Verifying cryptographic signature..."
if cosign verify-blob \
    --signature "${SIGNATURE}" \
    --certificate "${CERTIFICATE}" \
    --certificate-identity-regexp "${EXPECTED_IDENTITY}" \
    --certificate-oidc-issuer "${EXPECTED_ISSUER}" \
    "${BINARY}"; then
    echo -e "${GREEN}Signature verification passed${NC}"

    # Display certificate information
    echo ""
    echo "Certificate details:"
    openssl x509 -in "${CERTIFICATE}" -noout -text | grep -A1 "Subject:"
else
    echo -e "${RED}Signature verification failed!${NC}"
    echo "The binary may have been tampered with or signed by an unauthorized party."
    exit 1
fi

echo ""
echo -e "${GREEN}All verifications passed. Binary is authentic.${NC}"
```

### GPG Verification Script

```bash
#!/bin/bash
# verify-gpg.sh - Verify GPG-signed releases

set -euo pipefail

BINARY="${1:?Usage: verify-gpg.sh <binary-file>}"
KEY_URL="${KEY_URL:-https://example.com/release-signing-key.asc}"
KEY_ID="${KEY_ID:-ABC123DEF456GHI7}"

echo "Verifying ${BINARY} with GPG..."

# Import the signing key if not already present
if ! gpg --list-keys "${KEY_ID}" &> /dev/null; then
    echo "Importing signing key..."
    curl -sSL "${KEY_URL}" | gpg --import
fi

# Check for signature file
SIGNATURE="${BINARY}.asc"
if [[ ! -f "${SIGNATURE}" ]]; then
    SIGNATURE="${BINARY}.sig"
fi

if [[ ! -f "${SIGNATURE}" ]]; then
    echo "Error: No signature file found"
    exit 1
fi

# Verify the signature
if gpg --verify "${SIGNATURE}" "${BINARY}"; then
    echo ""
    echo "Verification successful! Binary is authentic."
else
    echo ""
    echo "Verification FAILED! Do not use this binary."
    exit 1
fi
```

### Go-Based Verification Tool

Provide a Go tool for programmatic verification in user applications.

```go
// verify/verify.go
package verify

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"

	"github.com/sigstore/cosign/v2/pkg/cosign"
	"github.com/sigstore/sigstore/pkg/fulcioroots"
	"github.com/sigstore/sigstore/pkg/signature"
)

// VerificationResult contains the outcome of signature verification
type VerificationResult struct {
	Valid       bool
	SignerEmail string
	Issuer      string
	Error       error
}

// VerifyBinary verifies a binary against its Sigstore signature
func VerifyBinary(binaryPath, sigPath, certPath string, expectedIdentity, expectedIssuer string) (*VerificationResult, error) {
	// Read the binary
	binaryData, err := os.ReadFile(binaryPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read binary: %w", err)
	}

	// Read the signature
	sigData, err := os.ReadFile(sigPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read signature: %w", err)
	}

	// Read the certificate
	certData, err := os.ReadFile(certPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read certificate: %w", err)
	}

	// Get Fulcio roots for verification
	ctx := context.Background()
	roots, err := fulcioroots.Get()
	if err != nil {
		return nil, fmt.Errorf("failed to get Fulcio roots: %w", err)
	}

	// Configure verification options
	checkOpts := &cosign.CheckOpts{
		RootCerts:         roots,
		CertIdentity:      expectedIdentity,
		CertOidcIssuer:    expectedIssuer,
	}

	// Verify the signature
	// This validates the certificate chain, signature, and identity claims
	verifier, err := signature.LoadVerifierFromPEM(certData)
	if err != nil {
		return &VerificationResult{Valid: false, Error: err}, nil
	}

	err = verifier.VerifySignature(sigData, binaryData)
	if err != nil {
		return &VerificationResult{Valid: false, Error: err}, nil
	}

	return &VerificationResult{
		Valid:       true,
		SignerEmail: expectedIdentity,
		Issuer:      expectedIssuer,
	}, nil
}

// ComputeChecksum calculates the SHA256 checksum of a file
func ComputeChecksum(filePath string) (string, error) {
	f, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer f.Close()

	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}

	return hex.EncodeToString(h.Sum(nil)), nil
}
```

## SBOM Generation for Supply Chain Transparency

Software Bill of Materials (SBOM) documents all components in your binary. Combined with code signing, SBOMs provide complete supply chain transparency.

### Generating SBOM with syft

```bash
# Install syft for SBOM generation
go install github.com/anchore/syft/cmd/syft@latest

# Generate SBOM in SPDX format
syft packages ./cmd/myapp -o spdx-json > myapp.spdx.json

# Generate SBOM in CycloneDX format
syft packages ./cmd/myapp -o cyclonedx-json > myapp.cdx.json

# Include the Go module information
syft packages . --source-name myapp --source-version v1.2.3 \
    -o spdx-json > myapp.spdx.json
```

### Signing SBOMs with Cosign

```bash
# Sign the SBOM along with the binary
cosign sign-blob myapp.spdx.json \
    --output-signature myapp.spdx.json.sig \
    --output-certificate myapp.spdx.json.pem \
    --yes

# Attach SBOM to container images (if applicable)
cosign attach sbom --sbom myapp.spdx.json myregistry/myapp:v1.2.3

# Sign the attached SBOM
cosign sign --attachment sbom myregistry/myapp:v1.2.3
```

### Integrated SBOM Workflow

```yaml
# GitHub Actions workflow with SBOM generation and signing
- name: Generate and sign SBOM
  run: |
    # Install syft
    curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s -- -b /usr/local/bin

    # Generate SBOMs for each platform
    for binary in dist/myapp-*; do
      if [[ ! "${binary}" =~ \.(sig|pem|sha256|spdx|cdx)$ ]]; then
        echo "Generating SBOM for ${binary}..."

        # Generate SPDX SBOM
        syft packages "${binary}" -o spdx-json > "${binary}.spdx.json"

        # Sign the SBOM
        cosign sign-blob "${binary}.spdx.json" \
          --output-signature "${binary}.spdx.json.sig" \
          --output-certificate "${binary}.spdx.json.pem" \
          --yes
      fi
    done
```

## Reproducible Builds

Reproducible builds ensure that the same source code produces identical binaries. This allows third parties to verify that released binaries match the published source.

### Configuring Go for Reproducibility

```bash
# Set build flags for reproducibility
# -trimpath removes file system paths from binary
# -buildvcs=false excludes VCS information that might vary
# CGO_ENABLED=0 ensures static linking

export CGO_ENABLED=0

go build -trimpath -buildvcs=false \
    -ldflags="-s -w -X main.version=1.2.3 -buildid=" \
    -o myapp ./cmd/myapp
```

### Reproducible Build Script

```bash
#!/bin/bash
# build-reproducible.sh - Build reproducible Go binaries

set -euo pipefail

VERSION="${1:?Version required}"
OUTPUT_DIR="${2:-dist}"
SOURCE_DATE_EPOCH="${SOURCE_DATE_EPOCH:-$(git log -1 --format=%ct)}"

# Export for reproducibility
export CGO_ENABLED=0
export SOURCE_DATE_EPOCH

mkdir -p "${OUTPUT_DIR}"

# Build for all target platforms
platforms=(
    "linux/amd64"
    "linux/arm64"
    "darwin/amd64"
    "darwin/arm64"
    "windows/amd64"
)

for platform in "${platforms[@]}"; do
    GOOS="${platform%/*}"
    GOARCH="${platform#*/}"

    output="${OUTPUT_DIR}/myapp-${GOOS}-${GOARCH}"
    if [[ "${GOOS}" == "windows" ]]; then
        output="${output}.exe"
    fi

    echo "Building ${output}..."

    # Build with reproducibility flags
    # -trimpath: Remove file system paths
    # -buildvcs=false: Exclude VCS metadata
    # -ldflags with empty buildid: Remove unique build ID
    GOOS="${GOOS}" GOARCH="${GOARCH}" go build \
        -trimpath \
        -buildvcs=false \
        -ldflags="-s -w -X main.version=${VERSION} -buildid=" \
        -o "${output}" \
        ./cmd/myapp

    # Set consistent timestamps for reproducibility
    touch -d "@${SOURCE_DATE_EPOCH}" "${output}"

    # Generate checksum
    sha256sum "${output}" > "${output}.sha256"
done

echo "Build complete. Artifacts in ${OUTPUT_DIR}/"
```

### Verifying Reproducibility

```bash
#!/bin/bash
# verify-reproducibility.sh - Verify builds are reproducible

set -euo pipefail

VERSION="${1:?Version required}"

# Build twice in different directories
mkdir -p /tmp/build1 /tmp/build2

echo "First build..."
cp -r . /tmp/build1/
(cd /tmp/build1 && ./build-reproducible.sh "${VERSION}" dist1)

echo "Second build..."
cp -r . /tmp/build2/
(cd /tmp/build2 && ./build-reproducible.sh "${VERSION}" dist2)

# Compare checksums
echo "Comparing builds..."
for binary in /tmp/build1/dist1/myapp-*; do
    if [[ ! "${binary}" =~ \.sha256$ ]]; then
        name=$(basename "${binary}")
        hash1=$(sha256sum "${binary}" | cut -d' ' -f1)
        hash2=$(sha256sum "/tmp/build2/dist2/${name}" | cut -d' ' -f1)

        if [[ "${hash1}" == "${hash2}" ]]; then
            echo "PASS: ${name}"
        else
            echo "FAIL: ${name}"
            echo "  Build 1: ${hash1}"
            echo "  Build 2: ${hash2}"
            exit 1
        fi
    fi
done

echo ""
echo "All builds are reproducible!"
```

### Go Module Verification

```go
// main.go - Include build information for verification

package main

import (
	"fmt"
	"runtime/debug"
)

// Set via ldflags
var version = "dev"

func main() {
	// Print version information
	if len(os.Args) > 1 && os.Args[1] == "version" {
		printVersionInfo()
		return
	}

	// Main application logic
	run()
}

func printVersionInfo() {
	fmt.Printf("Version: %s\n", version)

	// Include Go module and build information
	if info, ok := debug.ReadBuildInfo(); ok {
		fmt.Printf("Go version: %s\n", info.GoVersion)
		fmt.Printf("Module: %s\n", info.Main.Path)

		// Print VCS information if available
		for _, setting := range info.Settings {
			switch setting.Key {
			case "vcs.revision":
				fmt.Printf("Commit: %s\n", setting.Value)
			case "vcs.time":
				fmt.Printf("Build time: %s\n", setting.Value)
			case "vcs.modified":
				if setting.Value == "true" {
					fmt.Println("Warning: Built from modified source")
				}
			}
		}

		// Print dependencies for verification
		fmt.Println("\nDependencies:")
		for _, dep := range info.Deps {
			fmt.Printf("  %s %s\n", dep.Path, dep.Version)
		}
	}
}
```

## Complete Release Pipeline

Here is a comprehensive release pipeline combining all security measures.

```yaml
# .github/workflows/secure-release.yml
name: Secure Release Pipeline

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write
  id-token: write

env:
  GO_VERSION: '1.22'

jobs:
  build:
    runs-on: ubuntu-latest
    outputs:
      hashes: ${{ steps.hash.outputs.hashes }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: ${{ env.GO_VERSION }}

      - name: Install tools
        run: |
          go install github.com/anchore/syft/cmd/syft@latest

      - name: Build reproducible binaries
        env:
          SOURCE_DATE_EPOCH: ${{ github.event.repository.pushed_at }}
        run: |
          mkdir -p dist

          platforms=("linux/amd64" "linux/arm64" "darwin/amd64" "darwin/arm64" "windows/amd64")

          for platform in "${platforms[@]}"; do
            GOOS="${platform%/*}"
            GOARCH="${platform#*/}"
            output="myapp-${GOOS}-${GOARCH}"

            if [[ "$GOOS" == "windows" ]]; then
              output="${output}.exe"
            fi

            echo "Building ${output}..."
            CGO_ENABLED=0 GOOS=$GOOS GOARCH=$GOARCH go build \
              -trimpath \
              -buildvcs=false \
              -ldflags="-s -w -X main.version=${{ github.ref_name }} -buildid=" \
              -o "dist/${output}" \
              ./cmd/myapp
          done

      - name: Generate SBOMs
        run: |
          cd dist
          for binary in myapp-*; do
            if [[ ! "${binary}" =~ \. ]]; then
              syft packages "${binary}" -o spdx-json > "${binary}.spdx.json"
            fi
          done

      - name: Generate checksums
        id: hash
        run: |
          cd dist
          sha256sum myapp-* > checksums.sha256
          echo "hashes=$(cat checksums.sha256 | base64 -w0)" >> "$GITHUB_OUTPUT"

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: binaries
          path: dist/
          retention-days: 1

  sign:
    needs: build
    runs-on: ubuntu-latest

    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          name: binaries
          path: dist/

      - name: Install cosign
        uses: sigstore/cosign-installer@v3

      - name: Sign all artifacts
        run: |
          cd dist

          # Sign binaries
          for binary in myapp-*; do
            if [[ ! "${binary}" =~ \.(sig|pem|sha256|spdx\.json)$ ]]; then
              echo "Signing ${binary}..."
              cosign sign-blob "${binary}" \
                --output-signature "${binary}.sig" \
                --output-certificate "${binary}.pem" \
                --yes
            fi
          done

          # Sign SBOMs
          for sbom in *.spdx.json; do
            echo "Signing ${sbom}..."
            cosign sign-blob "${sbom}" \
              --output-signature "${sbom}.sig" \
              --output-certificate "${sbom}.pem" \
              --yes
          done

          # Sign checksum file
          cosign sign-blob checksums.sha256 \
            --output-signature checksums.sha256.sig \
            --output-certificate checksums.sha256.pem \
            --yes

      - name: Upload signed artifacts
        uses: actions/upload-artifact@v4
        with:
          name: signed-binaries
          path: dist/
          retention-days: 5

  release:
    needs: sign
    runs-on: ubuntu-latest

    steps:
      - name: Download signed artifacts
        uses: actions/download-artifact@v4
        with:
          name: signed-binaries
          path: dist/

      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: dist/*
          generate_release_notes: true
          body: |
            ## Verification

            All binaries are signed using Sigstore. To verify:

            ```bash
            # Install cosign
            go install github.com/sigstore/cosign/v2/cmd/cosign@latest

            # Download binary, signature, and certificate
            # Then verify:
            cosign verify-blob myapp-linux-amd64 \
              --signature myapp-linux-amd64.sig \
              --certificate myapp-linux-amd64.pem \
              --certificate-identity-regexp "https://github.com/${{ github.repository }}/.github/workflows/.*" \
              --certificate-oidc-issuer https://token.actions.githubusercontent.com
            ```

            ## Checksums

            SHA256 checksums are provided in `checksums.sha256`.

            ## SBOM

            Software Bill of Materials in SPDX format is provided for each binary.

  provenance:
    needs: build
    permissions:
      actions: read
      id-token: write
      contents: write
    uses: slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v1.9.0
    with:
      base64-subjects: "${{ needs.build.outputs.hashes }}"
      upload-assets: true
```

## Security Best Practices

### Key Management Guidelines

1. **Use hardware security modules (HSM)** for production signing keys
2. **Rotate keys regularly** - at least annually for long-lived keys
3. **Use separate keys** for different purposes (release signing, commit signing)
4. **Document key recovery procedures** and test them periodically
5. **Monitor key usage** through logging and alerting

### Signing Process Security

```bash
# Example secure signing environment setup
#!/bin/bash

# Verify we're in a clean environment
if [[ -n "$(git status --porcelain)" ]]; then
    echo "Error: Working directory not clean"
    exit 1
fi

# Verify tag signature if using GPG-signed tags
git verify-tag "${TAG}" || {
    echo "Error: Tag signature verification failed"
    exit 1
}

# Verify we're building from the tagged commit
if [[ "$(git rev-parse HEAD)" != "$(git rev-parse ${TAG}^{commit})" ]]; then
    echo "Error: HEAD does not match tag"
    exit 1
fi

# Proceed with build and signing
./build-reproducible.sh "${TAG}"
./sign-release.sh
```

### Verification Documentation

Always provide clear documentation for users to verify your releases:

```markdown
# Verifying Releases

## Prerequisites

Install cosign:
```bash
go install github.com/sigstore/cosign/v2/cmd/cosign@latest
```

## Verification Steps

1. Download the binary, signature (.sig), and certificate (.pem)
2. Run verification:

```bash
cosign verify-blob myapp-linux-amd64 \
    --signature myapp-linux-amd64.sig \
    --certificate myapp-linux-amd64.pem \
    --certificate-identity-regexp "https://github.com/yourorg/yourrepo/.github/workflows/.*" \
    --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

3. Verify checksum:

```bash
sha256sum -c checksums.sha256
```

## Transparency Log

All signing events are recorded in the Rekor transparency log. You can search for entries:

```bash
rekor-cli search --artifact myapp-linux-amd64
```
```

## Conclusion

Code signing is essential for establishing trust in your Go binaries. By implementing the practices covered in this guide, you create a verifiable chain of custody from your source code to your users' systems.

Key takeaways:

- **Start with Sigstore/cosign** for modern, keyless signing that eliminates key management burden
- **Use GPG signing** when you need compatibility with existing infrastructure
- **Automate signing in CI/CD** to ensure consistent, reproducible security
- **Generate and sign SBOMs** for complete supply chain transparency
- **Enable reproducible builds** so others can verify your binaries match source
- **Document verification** to help users validate your releases

The investment in proper code signing pays dividends in user trust, security incident prevention, and compliance requirements. As supply chain attacks continue to evolve, having cryptographic proof of authenticity becomes increasingly valuable.

Start with the basics and gradually adopt more comprehensive measures. Even simple signature verification significantly raises the bar for attackers and demonstrates your commitment to security.
