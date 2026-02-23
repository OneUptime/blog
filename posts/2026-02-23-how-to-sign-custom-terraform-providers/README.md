# How to Sign Custom Terraform Providers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider Development, GPG Signing, Security, Infrastructure as Code

Description: Learn how to sign custom Terraform provider releases with GPG keys for verification by the Terraform Registry and users, including key generation, management, and CI automation.

---

Code signing is a critical part of publishing Terraform providers. The Terraform Registry requires that all provider releases are signed with a GPG key, and Terraform CLI verifies these signatures when downloading providers. This ensures that the binaries users install have not been tampered with and come from a trusted source.

In this guide, we will cover the complete process of setting up GPG signing for your Terraform provider, from key generation through automated signing in CI/CD pipelines.

## Why Signing Matters

When a user runs `terraform init`, Terraform downloads provider binaries from the Registry. Without signature verification, an attacker could potentially replace the binary with a malicious version. GPG signing provides a chain of trust:

1. You sign the release checksums with your private key
2. You register the public key with the Terraform Registry
3. Users download the provider and checksums
4. Terraform verifies the checksums against the signature
5. If the signature is valid, the provider is trusted

## Generating a GPG Key

### Create the Key Pair

```bash
# Generate a new GPG key pair
gpg --full-generate-key

# When prompted, choose:
# (1) RSA and RSA
# Key size: 4096
# Expiration: 0 (does not expire) or set an appropriate date
# Real name: Your Name or Organization Name
# Email: your-email@example.com
# Comment: Terraform Provider Signing Key
```

### Verify the Key

```bash
# List your GPG keys
gpg --list-secret-keys --keyid-format=long

# Output will look like:
# sec   rsa4096/ABCDEF1234567890 2026-01-01 [SC]
#       FINGERPRINT1234567890ABCDEF1234567890ABCDEF
# uid                 [ultimate] Your Name (Terraform Provider Signing Key) <your-email@example.com>
# ssb   rsa4096/0987654321FEDCBA 2026-01-01 [E]
```

The key ID is the part after `rsa4096/` on the `sec` line: `ABCDEF1234567890`.

## Exporting Keys

### Export the Public Key

The public key goes to the Terraform Registry so it can verify your signatures:

```bash
# Export in ASCII armor format
gpg --armor --export ABCDEF1234567890 > terraform-provider-signing-key.asc

# View the exported key
cat terraform-provider-signing-key.asc
# -----BEGIN PGP PUBLIC KEY BLOCK-----
# ... base64 encoded key data ...
# -----END PGP PUBLIC KEY BLOCK-----
```

### Export the Private Key for CI

The private key needs to be available in your CI environment for automated signing:

```bash
# Export the private key
gpg --armor --export-secret-keys ABCDEF1234567890 > private-key.asc

# Encode it for safe storage as a CI secret
base64 < private-key.asc > private-key-base64.txt

# IMPORTANT: Delete the plaintext private key file after storing it securely
rm private-key.asc
```

## Registering the Key with Terraform Registry

1. Go to https://registry.terraform.io
2. Sign in with your GitHub account
3. Navigate to your organization settings
4. Go to the "Signing Keys" section
5. Click "Add GPG Key"
6. Paste the contents of your public key file (`terraform-provider-signing-key.asc`)
7. Save the key

The Registry will now use this key to verify signatures on your releases.

## Configuring GoReleaser for Signing

GoReleaser handles the signing process during releases. Configure it in your `.goreleaser.yml`:

```yaml
# .goreleaser.yml
version: 2

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
      - arm64
    binary: '{{ .ProjectName }}_v{{ .Version }}'

archives:
  - format: zip
    name_template: '{{ .ProjectName }}_{{ .Version }}_{{ .Os }}_{{ .Arch }}'

# Generate checksums for all archives
checksum:
  name_template: '{{ .ProjectName }}_{{ .Version }}_SHA256SUMS'
  algorithm: sha256

# Sign the checksum file with GPG
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
```

The signing configuration tells GoReleaser to:
1. Sign the `SHA256SUMS` file (which contains checksums for all binaries)
2. Use the GPG key identified by the `GPG_FINGERPRINT` environment variable
3. Create a detached signature file (`SHA256SUMS.sig`)

## Setting Up GitHub Actions for Signed Releases

Configure your release workflow to import the GPG key and use it for signing:

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
          cache: true

      # Import the GPG private key into the CI environment
      - name: Import GPG key
        id: import_gpg
        uses: crazy-max/ghaction-import-gpg@v6
        with:
          gpg_private_key: ${{ secrets.GPG_PRIVATE_KEY }}
          passphrase: ${{ secrets.PASSPHRASE }}

      # Run GoReleaser with the GPG fingerprint
      - name: Run GoReleaser
        uses: goreleaser/goreleaser-action@v5
        with:
          args: release --clean
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GPG_FINGERPRINT: ${{ steps.import_gpg.outputs.fingerprint }}
```

### Setting Up Repository Secrets

Add these secrets to your GitHub repository:

1. **GPG_PRIVATE_KEY** - The base64-encoded private key from `private-key-base64.txt`
2. **PASSPHRASE** - The passphrase for your GPG key

```bash
# To set secrets via the GitHub CLI:
gh secret set GPG_PRIVATE_KEY < private-key-base64.txt
gh secret set PASSPHRASE
```

## Verifying Signatures Locally

Users can verify provider signatures manually:

```bash
# Download the release files
wget https://github.com/example/terraform-provider-example/releases/download/v1.0.0/terraform-provider-example_1.0.0_SHA256SUMS
wget https://github.com/example/terraform-provider-example/releases/download/v1.0.0/terraform-provider-example_1.0.0_SHA256SUMS.sig

# Import the provider's public key
gpg --import terraform-provider-signing-key.asc

# Verify the signature
gpg --verify terraform-provider-example_1.0.0_SHA256SUMS.sig terraform-provider-example_1.0.0_SHA256SUMS

# Expected output:
# gpg: Signature made Mon 01 Jan 2026 12:00:00 PM UTC
# gpg:                using RSA key FINGERPRINT1234567890
# gpg: Good signature from "Your Name (Terraform Provider Signing Key)"
```

## Key Management Best Practices

### Key Storage

Store your GPG private key securely:

- Use a hardware security module (HSM) for production keys when possible
- Store backup copies in encrypted form
- Use CI/CD secret management features (GitHub Secrets, Vault) for CI access
- Never commit private keys to version control

### Key Rotation

Plan for key rotation:

```bash
# Generate a new key before the old one expires
gpg --full-generate-key

# Add the new public key to the Terraform Registry
# Keep the old key until all supported releases signed with it are still in use

# Update CI secrets with the new private key
gh secret set GPG_PRIVATE_KEY < new-private-key-base64.txt
```

### Key Revocation

If your key is compromised:

```bash
# Generate a revocation certificate (do this when you first create the key)
gpg --gen-revoke ABCDEF1234567890 > revoke-cert.asc

# If compromised, publish the revocation
gpg --import revoke-cert.asc
gpg --keyserver keys.openpgp.org --send-keys ABCDEF1234567890
```

Then:
1. Remove the compromised key from the Terraform Registry
2. Add a new key
3. Re-release affected versions with the new key

## Troubleshooting Common Issues

### "gpg: signing failed: No secret key"

The GPG key is not available in the CI environment. Verify that:
- The GPG_PRIVATE_KEY secret is correctly set
- The key import step succeeded
- The GPG_FINGERPRINT matches the imported key

### "gpg: signing failed: Inappropriate ioctl for device"

GPG is trying to prompt for a passphrase interactively. Ensure the `--batch` flag is set in the GoReleaser signing configuration.

### Signature verification fails on Registry

Make sure the public key registered with the Terraform Registry matches the private key used for signing. Export and compare the fingerprints.

## Best Practices

**Generate a dedicated signing key.** Do not use your personal GPG key for provider signing. Create a separate key for this purpose.

**Back up your key securely.** Losing the signing key means you cannot release new versions until you set up a new one.

**Use strong key parameters.** RSA 4096-bit or Ed25519 keys provide good security.

**Plan for key rotation.** Set expiration dates and have a process for rotating keys before they expire.

**Document your key fingerprint.** Include the GPG fingerprint in your provider documentation so users can verify they have the right key.

**Test signing in a staging environment.** Before your first release, test the entire signing process with a pre-release tag.

## Conclusion

GPG signing is a required and important security measure for Terraform providers. It ensures that users can trust the binaries they download and that releases have not been tampered with. By generating a strong GPG key, integrating signing into your CI/CD pipeline, and following key management best practices, you build trust with your users and meet the Terraform Registry's requirements.

For more on the release process, see our guides on [publishing to the Registry](https://oneuptime.com/blog/post/2026-02-23-how-to-publish-custom-terraform-providers-to-registry/view) and [handling provider releases and CI/CD](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-provider-releases-and-cicd/view).
