# How to Configure Image Trust Policies in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Security, Trust Policies, Image Signing

Description: Learn how to configure and manage image trust policies in Podman to control which container images are allowed to run.

---

> Trust policies are the gatekeepers of your container infrastructure. They determine which images are allowed in and which are turned away at the door.

Podman uses a policy-based system to decide whether an image is trustworthy before pulling or running it. These policies can require cryptographic signatures, allow specific registries, or reject all unsigned images. This guide covers how to configure image trust policies from simple setups to production-grade configurations.

---

## The Policy Configuration File

Podman reads trust policies from `~/.config/containers/policy.json` if it exists; otherwise it uses `/etc/containers/policy.json` for system-wide settings.

```bash
# View the system-wide policy

cat /etc/containers/policy.json

# View the user-level policy (if it exists)
cat ~/.config/containers/policy.json 2>/dev/null || echo "No user-level policy found"
```

## Policy Types

There are four main policy types you can use.

```bash
# 1. insecureAcceptAnything - Accept all images (default, least secure)
# 2. reject - Reject all images (most secure default)
# 3. signedBy - Require images signed by specific GPG keys
# 4. sigstoreSigned - Require Sigstore/cosign signatures
```

## Creating a Reject-by-Default Policy

The most secure starting point is to reject everything and whitelist trusted sources.

```bash
# Back up existing policy
sudo cp /etc/containers/policy.json /etc/containers/policy.json.backup

# Create a strict reject-by-default policy
sudo tee /etc/containers/policy.json > /dev/null << 'EOF'
{
  "default": [
    {
      "type": "reject"
    }
  ],
  "transports": {
    "docker": {
      "docker.io/library": [
        {
          "type": "insecureAcceptAnything"
        }
      ],
      "quay.io/podman": [
        {
          "type": "insecureAcceptAnything"
        }
      ]
    },
    "docker-daemon": {
      "": [
        {
          "type": "insecureAcceptAnything"
        }
      ]
    }
  }
}
EOF
```

```bash
# Test: pulling from an allowed registry should work
podman pull docker.io/library/alpine:latest

# Test: pulling from a non-whitelisted source should fail
podman pull docker.io/someuser/random:latest 2>&1 || echo "Rejected by trust policy"
```

## Requiring GPG Signatures

For production environments, require images to be signed with GPG keys.

```bash
# Generate a GPG key for signing (if you do not already have one)
gpg --batch --gen-key << 'EOF'
%no-protection
Key-Type: RSA
Key-Length: 4096
Name-Real: Container Signer
Name-Email: signer@example.com
Expire-Date: 2y
%commit
EOF

# Export the public key for verification
gpg --export --armor signer@example.com > /tmp/container-signer.gpg
sudo mkdir -p /etc/pki/containers
sudo cp /tmp/container-signer.gpg /etc/pki/containers/
```

```bash
# Configure policy to require GPG signatures for your private registry
sudo tee /etc/containers/policy.json > /dev/null << 'EOF'
{
  "default": [
    {
      "type": "reject"
    }
  ],
  "transports": {
    "docker": {
      "docker.io/library": [
        {
          "type": "insecureAcceptAnything"
        }
      ],
      "registry.example.com": [
        {
          "type": "signedBy",
          "keyType": "GPGKeys",
          "keyPath": "/etc/pki/containers/container-signer.gpg"
        }
      ]
    }
  }
}
EOF
```

## Configuring Sigstore-Based Policies

For modern signing workflows using cosign and Sigstore.

```bash
# Configure policy requiring Sigstore signatures
sudo tee /etc/containers/policy.json > /dev/null << 'EOF'
{
  "default": [
    {
      "type": "reject"
    }
  ],
  "transports": {
    "docker": {
      "docker.io/library": [
        {
          "type": "insecureAcceptAnything"
        }
      ],
      "ghcr.io/myorg": [
        {
          "type": "sigstoreSigned",
          "keyPath": "/etc/pki/containers/cosign-public.key",
          "signedIdentity": {
            "type": "matchRepository"
          }
        }
      ]
    }
  }
}
EOF
```

## Configuring Signature Lookup Locations

Podman needs to know where to find image signatures.

```bash
# Create a signature lookup configuration
sudo mkdir -p /etc/containers/registries.d

# Configure the signature source for your registry
sudo tee /etc/containers/registries.d/myregistry.yaml > /dev/null << 'EOF'
docker:
  registry.example.com:
    lookaside: https://sigstore.example.com/signatures
    lookaside-staging: file:///var/lib/containers/sigstore
  ghcr.io/myorg:
    use-sigstore-attachments: true
EOF
```

```bash
# View all configured registries and their signature sources
ls -la /etc/containers/registries.d/
```

## Using podman image trust to Manage Policies

```bash
# Show current trust settings
podman image trust show

# Set trust for a specific registry using the CLI
sudo podman image trust set --signature-policy /etc/containers/policy.json -t signedBy \
  --pubkeysfile /etc/pki/containers/container-signer.gpg \
  registry.example.com

# Set a default reject policy via CLI
sudo podman image trust set --signature-policy /etc/containers/policy.json -t reject default
```

## Per-User Trust Policies

```bash
# Create user-level directories
mkdir -p ~/.config/containers/registries.d

# Create a user-level policy
cat > ~/.config/containers/policy.json << 'EOF'
{
  "default": [{"type": "insecureAcceptAnything"}],
  "transports": {
    "docker": {
      "registry.internal.example.com": [
        {
          "type": "signedBy",
          "keyType": "GPGKeys",
          "keyPath": "/home/user/keys/internal-registry.gpg"
        }
      ]
    }
  }
}
EOF
```

## Restoring Defaults

```bash
# Restore the backup
sudo cp /etc/containers/policy.json.backup /etc/containers/policy.json 2>/dev/null
```

## Summary

Image trust policies in Podman give you granular control over which container images are permitted in your environment. A reject-by-default approach with explicit allowlists for trusted registries is the strongest foundation. Combine this with GPG or Sigstore signature requirements for your private registries, and you have a robust defense against supply chain attacks. Use `podman image trust` commands for quick adjustments and the JSON policy file for comprehensive configuration.
