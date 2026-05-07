# How to Use Content Trust with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Security, Content Trust, Image Verification

Description: Learn how to enable and use content trust in Podman to ensure that only verified and trusted container images are pulled and run.

---

> Content trust can ensure that images you pull match signatures from trusted publishers, protecting you from supply chain attacks and tampered images.

Content trust in Podman verifies that container images come from trusted sources and have not been modified since they were published. This mechanism protects against supply chain attacks where an attacker replaces a legitimate image with a malicious one. Podman uses signature verification policies to implement content trust.

---

## Understanding Content Trust

Content trust establishes a chain of verification between the image publisher and the consumer. When you pull an image, Podman can check that the image was signed by a trusted party and that the image content matches the signature. This prevents pulling tampered or unauthorized images.

## How Podman Implements Content Trust

Unlike Docker which uses Notary, Podman relies on image signature verification through its policy configuration. Podman checks signatures against a policy defined in `/etc/containers/policy.json`.

```bash
# View the current image trust policy

cat /etc/containers/policy.json
```

```bash
# A typical default policy looks like this:
# {
#   "default": [{"type": "insecureAcceptAnything"}],
#   "transports": {
#     "docker-daemon": {
#       "": [{"type": "insecureAcceptAnything"}]
#     }
#   }
# }
```

## Configuring a Basic Trust Policy

Create a policy that requires signatures for specific registries.

```bash
# Back up the current policy
sudo cp /etc/containers/policy.json /etc/containers/policy.json.bak

# Create a policy requiring signatures for a specific registry
sudo tee /etc/containers/policy.json > /dev/null << 'EOF'
{
  "default": [{"type": "insecureAcceptAnything"}],
  "transports": {
    "docker": {
      "registry.example.com": [
        {
          "type": "signedBy",
          "keyType": "GPGKeys",
          "keyPath": "/etc/pki/containers/registry-example.gpg"
        }
      ]
    }
  }
}
EOF
```

## Rejecting Unsigned Images

You can configure Podman to reject all unsigned images by default.

```bash
# Create a strict policy that rejects unsigned images
sudo tee /etc/containers/policy.json > /dev/null << 'EOF'
{
  "default": [{"type": "reject"}],
  "transports": {
    "docker": {
      "docker.io/library": [{"type": "insecureAcceptAnything"}],
      "registry.access.redhat.com": [
        {
          "type": "signedBy",
          "keyType": "GPGKeys",
          "keyPath": "/etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release"
        }
      ]
    }
  }
}
EOF
```

```bash
# Test pulling from an allowed source
podman pull docker.io/library/alpine:latest

# Test pulling from a disallowed source (should fail)
podman pull docker.io/someuser/untrusted-image:latest 2>&1 || echo "Pull rejected by policy"
```

## Configuring Signature Sources

Tell Podman where to find signatures for images.

```bash
# View the registries configuration directory
ls /etc/containers/registries.d/

# Create a signature source configuration
sudo tee /etc/containers/registries.d/registry-example.yaml > /dev/null << 'EOF'
docker:
  registry.example.com:
    lookaside: https://signatures.example.com/sigstore
EOF
```

## Using Red Hat's Trusted Content

Red Hat Container Catalog images are signed and verifiable.

```bash
# Red Hat's signature configuration is often pre-installed
cat /etc/containers/registries.d/default.yaml 2>/dev/null

# Pull a signed Red Hat image (on RHEL/Fedora systems)
podman pull registry.access.redhat.com/ubi9/ubi-minimal:latest
```

## Verifying Trust Status

```bash
# Check the trust settings for different registries
podman image trust show

# Show trust configuration in detail
podman image trust show --json 2>/dev/null || podman image trust show
```

## Creating a User-Level Trust Policy

You can define trust policies per user without modifying system files.

```bash
# Create user-level policy directory
mkdir -p ~/.config/containers

# Create a user-level policy
cat > ~/.config/containers/policy.json << 'EOF'
{
  "default": [{"type": "insecureAcceptAnything"}],
  "transports": {
    "docker": {
      "registry.example.com": [
        {
          "type": "signedBy",
          "keyType": "GPGKeys",
          "keyPath": "/home/user/.config/containers/trusted-key.gpg"
        }
      ]
    }
  }
}
EOF
```

## Testing Your Trust Configuration

```bash
# Attempt to pull an image and observe the policy decision
podman pull --log-level debug docker.io/library/alpine:latest 2>&1 | grep -i "policy\|signature\|trust"
```

## Restoring the Default Policy

```bash
# Restore the backup if you made changes
sudo cp /etc/containers/policy.json.bak /etc/containers/policy.json 2>/dev/null

# Or reset to the default permissive policy
sudo tee /etc/containers/policy.json > /dev/null << 'EOF'
{
  "default": [{"type": "insecureAcceptAnything"}],
  "transports": {
    "docker-daemon": {
      "": [{"type": "insecureAcceptAnything"}]
    }
  }
}
EOF
```

## Summary

Content trust in Podman protects your container supply chain by verifying image signatures when images are pulled, including when `podman run` needs to pull an image. By configuring trust policies in `policy.json` and setting up signature sources, you can ensure that only images from verified publishers enter your environment. Start with a permissive policy for known registries and progressively tighten it as you establish signing workflows for your own images.
