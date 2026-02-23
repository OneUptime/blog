# How to Publish Custom Terraform Providers to Registry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, Terraform Registry, Publishing, Infrastructure as Code

Description: Learn how to publish your custom Terraform provider to the Terraform Registry, including GPG signing, GitHub releases, and registry configuration requirements.

---

Publishing your custom Terraform provider to the Terraform Registry makes it available to everyone in the Terraform community. The Registry is the primary way users discover and install providers, and getting listed there significantly increases your provider's visibility and adoption.

In this guide, we will walk through the entire process of publishing a custom Terraform provider to the Terraform Registry, from preparing your repository to managing ongoing releases.

## Prerequisites

Before you can publish a provider, you need the following:

- A GitHub account and a public GitHub repository
- A Terraform Cloud account (for Registry access)
- A GPG key for signing releases
- GoReleaser for building release binaries
- A properly structured provider repository

## Repository Requirements

The Terraform Registry has specific requirements for provider repositories:

### Naming Convention

Your repository must follow this naming pattern:

```
terraform-provider-<NAME>
```

For example, `terraform-provider-example`. The `<NAME>` portion becomes the provider name that users reference in their configurations.

### Repository Structure

Your repository should have this structure:

```
terraform-provider-example/
  main.go                       # Entry point
  internal/
    provider/                   # Provider implementation
  docs/                         # Generated documentation
  examples/                     # Usage examples
  .goreleaser.yml               # GoReleaser config
  .github/
    workflows/
      release.yml               # Release automation
  LICENSE                       # Required: must be an OSI-approved license
```

## Setting Up GPG Signing

The Terraform Registry requires that all provider releases are signed with a GPG key. This ensures that users can verify the authenticity of the provider binaries.

### Generate a GPG Key

```bash
# Generate a new GPG key pair
gpg --full-generate-key

# When prompted:
# - Key type: RSA and RSA
# - Key size: 4096
# - Expiration: choose based on your needs
# - Name and email: use your organization details
```

### Export the Public Key

```bash
# List your GPG keys to find the key ID
gpg --list-secret-keys --keyid-format=long

# Export the public key in ASCII format
gpg --armor --export YOUR_KEY_ID > public-key.asc

# The output looks like:
# -----BEGIN PGP PUBLIC KEY BLOCK-----
# ... (base64 encoded key data) ...
# -----END PGP PUBLIC KEY BLOCK-----
```

### Add GPG Key to Terraform Registry

1. Sign in to the Terraform Registry at registry.terraform.io
2. Go to your organization settings
3. Navigate to GPG Keys
4. Add the public key you exported

### Add GPG Key to GitHub

The private key needs to be available to your GitHub Actions for signing releases:

```bash
# Export the private key
gpg --armor --export-secret-keys YOUR_KEY_ID | base64 > private-key-base64.txt

# Add this as a GitHub repository secret named GPG_PRIVATE_KEY
# Also add the passphrase as a secret named GPG_PASSPHRASE
```

## Configuring GoReleaser

GoReleaser handles building binaries for multiple platforms and creating GitHub releases. Create a `.goreleaser.yml` file:

```yaml
# .goreleaser.yml
# GoReleaser configuration for Terraform provider releases

# Version of the GoReleaser configuration format
version: 2

before:
  hooks:
    # Run go mod tidy to ensure dependencies are clean
    - go mod tidy

builds:
  - env:
      - CGO_ENABLED=0
    mod_timestamp: '{{ .CommitTimestamp }}'
    flags:
      - -trimpath
    ldflags:
      - '-s -w -X main.version={{.Version}}'
    goos:
      - freebsd
      - windows
      - linux
      - darwin
    goarch:
      - amd64
      - '386'
      - arm
      - arm64
    ignore:
      - goos: darwin
        goarch: '386'
    binary: '{{ .ProjectName }}_v{{ .Version }}'

archives:
  - format: zip
    name_template: '{{ .ProjectName }}_{{ .Version }}_{{ .Os }}_{{ .Arch }}'

checksum:
  name_template: '{{ .ProjectName }}_{{ .Version }}_SHA256SUMS'
  algorithm: sha256

signs:
  - artifacts: checksum
    args:
      - "--batch"
      - "--local-user"
      - "{{ .Env.GPG_FINGERPRINT }}"
      - "--output"
      - "${signature}"
      - "--detach-sign"
      - "${artifact}"

release:
  extra_files:
    - glob: 'terraform-registry-manifest.json'
      name_template: '{{ .ProjectName }}_{{ .Version }}_manifest.json'

changelog:
  sort: asc
  filters:
    exclude:
      - '^docs:'
      - '^test:'
      - '^chore:'
```

## Creating the Registry Manifest

Create a `terraform-registry-manifest.json` file at the root of your repository:

```json
{
  "version": 1,
  "metadata": {
    "protocol_versions": ["6.0"]
  }
}
```

The `protocol_versions` field tells the Registry which Terraform protocol versions your provider supports.

## Setting Up GitHub Actions for Releases

Create a GitHub Actions workflow that builds and publishes releases automatically when you create a Git tag:

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  goreleaser:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version-file: 'go.mod'

      - name: Import GPG key
        id: import_gpg
        uses: crazy-max/ghaction-import-gpg@v6
        with:
          gpg_private_key: ${{ secrets.GPG_PRIVATE_KEY }}
          passphrase: ${{ secrets.GPG_PASSPHRASE }}

      - name: Run GoReleaser
        uses: goreleaser/goreleaser-action@v5
        with:
          args: release --clean
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GPG_FINGERPRINT: ${{ steps.import_gpg.outputs.fingerprint }}
```

## Publishing to the Registry

### Connect Your Repository

1. Sign in to the Terraform Registry
2. Click "Publish" and select "Provider"
3. Select your GitHub organization
4. Choose the repository `terraform-provider-example`
5. The Registry will verify the repository structure

### Create Your First Release

```bash
# Tag a release following semantic versioning
git tag v1.0.0
git push origin v1.0.0
```

This triggers the GitHub Actions workflow, which builds binaries, signs checksums, and creates a GitHub release. The Terraform Registry automatically picks up new releases.

### Verify the Publication

After the release is published on GitHub, it may take a few minutes for the Terraform Registry to index it. You can verify by visiting:

```
https://registry.terraform.io/providers/<NAMESPACE>/<NAME>/latest
```

## Testing the Published Provider

Verify that users can install your provider:

```hcl
# main.tf
terraform {
  required_providers {
    example = {
      source  = "<NAMESPACE>/example"
      version = "~> 1.0"
    }
  }
}

provider "example" {
  api_key = var.api_key
}
```

```bash
# Initialize and verify the provider downloads
terraform init
```

## Managing Subsequent Releases

For future releases, the process is straightforward:

```bash
# Make your changes and commit them
git add .
git commit -m "Add new resource: example_database"

# Tag the new version
git tag v1.1.0
git push origin v1.1.0

# The GitHub Actions workflow handles the rest
```

## Best Practices

**Follow semantic versioning.** Use major versions for breaking changes, minor versions for new features, and patch versions for bug fixes.

**Write release notes.** GoReleaser automatically generates changelogs from commit messages, but consider writing additional notes for major releases.

**Test before releasing.** Run your full acceptance test suite before creating a release tag.

**Keep documentation updated.** Regenerate docs with `tfplugindocs` before each release.

**Monitor Registry metrics.** The Terraform Registry provides download statistics that can help you understand how your provider is being used.

## Conclusion

Publishing your custom Terraform provider to the Registry makes it accessible to the entire Terraform community. By following the repository conventions, setting up GPG signing, configuring GoReleaser, and automating releases with GitHub Actions, you can create a smooth publishing workflow that makes releasing new versions effortless.

For more on provider development, see our guides on [signing custom providers](https://oneuptime.com/blog/post/2026-02-23-how-to-sign-custom-terraform-providers/view) and [versioning custom providers](https://oneuptime.com/blog/post/2026-02-23-how-to-version-custom-terraform-providers/view).
