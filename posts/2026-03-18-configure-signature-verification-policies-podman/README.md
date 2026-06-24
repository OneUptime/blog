# How to Configure Signature Verification Policies in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Security, Signature Verification, Policy

Description: Learn how to configure granular signature verification policies in Podman to enforce image trust at the registry, repository, and tag level.

---

> A well-crafted verification policy turns Podman into a gatekeeper that only allows cryptographically verified images through.

Podman's signature verification policies provide fine-grained control over which images are trusted. You can configure different verification requirements per registry, per repository, or even for a fully expanded image reference such as `registry.example.com/myorg/myapp:stable`. This guide covers advanced policy configurations that go beyond basic allow/reject rules.

---

## Policy Configuration Overview

Podman evaluates policies from most specific to least specific. A rule for `registry.example.com/myorg/myapp:stable` takes precedence over `registry.example.com/myorg/myapp`, which takes precedence over `registry.example.com/myorg`, which takes precedence over `registry.example.com`.

```bash
# View the current policy configuration

cat /etc/containers/policy.json

# Check user-level overrides
cat ~/.config/containers/policy.json 2>/dev/null || echo "No user policy"
```

## Building a Multi-Registry Policy

Configure different verification requirements for different registries.

```bash
# Back up existing policy
sudo cp /etc/containers/policy.json /etc/containers/policy.json.bak

# Create a comprehensive multi-registry policy
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
      "registry.access.redhat.com": [
        {
          "type": "signedBy",
          "keyType": "GPGKeys",
          "keyPath": "/etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release"
        }
      ],
      "registry.internal.example.com": [
        {
          "type": "signedBy",
          "keyType": "GPGKeys",
          "keyPath": "/etc/pki/containers/internal-signer.gpg"
        }
      ],
      "ghcr.io/myorg": [
        {
          "type": "sigstoreSigned",
          "keyPath": "/etc/pki/containers/cosign-myorg.pub"
        }
      ]
    },
    "atomic": {
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

## Repository-Level Policies

Apply different rules to different repositories within the same registry.

```bash
# Configure per-repository policies
sudo tee /etc/containers/policy.json > /dev/null << 'EOF'
{
  "default": [
    {
      "type": "reject"
    }
  ],
  "transports": {
    "docker": {
      "registry.example.com/production": [
        {
          "type": "signedBy",
          "keyType": "GPGKeys",
          "keyPath": "/etc/pki/containers/production-signer.gpg"
        }
      ],
      "registry.example.com/staging": [
        {
          "type": "signedBy",
          "keyType": "GPGKeys",
          "keyPath": "/etc/pki/containers/staging-signer.gpg"
        }
      ],
      "registry.example.com/dev": [
        {
          "type": "insecureAcceptAnything"
        }
      ]
    }
  }
}
EOF
```

## Multiple Signer Requirements

Require images to be signed by multiple parties for high-security environments.

```bash
# Configure multiple required signers
sudo tee /etc/containers/policy.json > /dev/null << 'EOF'
{
  "default": [
    {
      "type": "reject"
    }
  ],
  "transports": {
    "docker": {
      "registry.example.com/critical": [
        {
          "type": "signedBy",
          "keyType": "GPGKeys",
          "keyPath": "/etc/pki/containers/team-lead.gpg"
        },
        {
          "type": "signedBy",
          "keyType": "GPGKeys",
          "keyPath": "/etc/pki/containers/security-team.gpg"
        }
      ],
      "docker.io/library": [
        {
          "type": "insecureAcceptAnything"
        }
      ]
    }
  }
}
EOF
```

## Configuring Signature Mirrors

Set up signature lookup locations for each registry.

```bash
# Create registry-specific signature configurations
sudo mkdir -p /etc/containers/registries.d

# Internal registry with simple-signing signature storage
sudo tee /etc/containers/registries.d/internal.yaml > /dev/null << 'EOF'
docker:
  registry.internal.example.com:
    lookaside: https://signatures.internal.example.com/sigstore
    lookaside-staging: file:///var/lib/containers/sigstore
EOF

# GitHub Container Registry with sigstore attachments stored in the registry
sudo tee /etc/containers/registries.d/ghcr.yaml > /dev/null << 'EOF'
docker:
  ghcr.io:
    use-sigstore-attachments: true
EOF
```

## Validating Your Policy Configuration

```bash
#!/bin/bash
# validate-policy.sh - Validate the Podman trust policy

POLICY_FILE="/etc/containers/policy.json"

# Check if the file exists
if [ ! -f "$POLICY_FILE" ]; then
  echo "ERROR: Policy file not found at $POLICY_FILE"
  exit 1
fi

# Validate JSON syntax
if python3 -m json.tool "$POLICY_FILE" > /dev/null 2>&1; then
  echo "[PASS] Policy file is valid JSON"
else
  echo "[FAIL] Policy file has invalid JSON syntax"
  exit 1
fi

# Check for required default policy
if grep -q '"default"' "$POLICY_FILE"; then
  echo "[PASS] Default policy is defined"
else
  echo "[WARN] No default policy found"
fi

# Check for reject-by-default
if grep -q '"type": "reject"' "$POLICY_FILE"; then
  echo "[INFO] Policy uses reject-by-default (recommended)"
fi

# Check for referenced key files
grep -o '"keyPath": "[^"]*"' "$POLICY_FILE" | while read line; do
  keyfile=$(echo "$line" | cut -d'"' -f4)
  if [ -f "$keyfile" ]; then
    echo "[PASS] Key file exists: $keyfile"
  else
    echo "[FAIL] Key file missing: $keyfile"
  fi
done

echo ""
echo "Policy validation complete."
```

```bash
chmod +x validate-policy.sh
./validate-policy.sh
```

## Testing Policy Enforcement

```bash
# Test pulling from an allowed registry
podman pull docker.io/library/alpine:latest && \
  echo "PASS: Allowed pull succeeded"

# Test pulling from a blocked registry
if podman pull quay.io/podman/hello:latest > /tmp/podman-policy-test.log 2>&1; then
  echo "UNEXPECTED: Pull should have been blocked"
elif grep -qi "rejected" /tmp/podman-policy-test.log; then
  echo "PASS: Blocked pull was rejected by policy"
else
  echo "FAIL: Pull failed for a reason other than policy rejection"
  cat /tmp/podman-policy-test.log
fi
```

## Viewing Effective Trust Configuration

```bash
# Display the effective trust configuration
podman image trust show

# Show trust configuration in JSON format
podman image trust show --json 2>/dev/null
```

## Restoring Default Policy

```bash
# Restore the backup
sudo cp /etc/containers/policy.json.bak /etc/containers/policy.json 2>/dev/null

# Clean up
rm -f validate-policy.sh
```

## Summary

Signature verification policies in Podman provide layered trust enforcement that can be tailored to your organization's security requirements. By configuring policies at the registry, repository, and image level, you create a defense-in-depth approach to container supply chain security. Use reject-by-default policies, require signatures from your build pipeline, and validate your policy configuration regularly to maintain a strong security posture.
