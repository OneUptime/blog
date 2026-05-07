# How to Use podman image trust to Manage Trust Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Security, Trust Policies, CLI

Description: Learn how to use the podman image trust command to view, set, and manage container image trust policies directly from the command line.

---

> The podman image trust command puts much of trust policy management at your fingertips without needing to edit JSON files by hand.

Managing trust policies through JSON configuration files can be error-prone and tedious. Podman provides the `podman image trust` command to view and modify trust policies directly from the command line. This guide covers the most common ways to manage your image trust configuration.

---

## Understanding podman image trust

The `podman image trust` command provides two subcommands: `show` to display current trust settings, and `set` to configure `accept`, `reject`, `signedBy`, or `sigstoreSigned` policies for specific registries or repositories. Podman reads `$HOME/.config/containers/policy.json` if it exists, otherwise `/etc/containers/policy.json`; the examples below update `/etc/containers/policy.json` explicitly with `--signature-policy`.

## Viewing Current Trust Policies

```bash
# Display the current trust configuration

podman image trust show
```

```bash
# Show trust policies in a table format
podman image trust show --signature-policy /etc/containers/policy.json

# The table includes TRANSPORT, NAME, TYPE, ID, and STORE columns
# when those fields apply to a given policy entry.
```

```bash
# Show trust entries as machine-readable JSON
podman image trust show --json --signature-policy /etc/containers/policy.json

# Show the raw policy file as JSON
podman image trust show --raw --signature-policy /etc/containers/policy.json

# Alternatively, pretty-print the policy file directly
python3 -m json.tool /etc/containers/policy.json
```

## Setting Trust to Accept All Images

For development environments, you may want to accept all images from a registry.

```bash
# Accept all images from a specific registry
sudo podman image trust set --signature-policy /etc/containers/policy.json \
  -t accept registry.example.com

# Verify the change
podman image trust show --signature-policy /etc/containers/policy.json
```

```bash
# Accept all images from Docker Hub official library
sudo podman image trust set --signature-policy /etc/containers/policy.json \
  -t accept docker.io/library
```

## Setting Trust to Reject Images

Block images from untrusted registries.

```bash
# Reject all images from an untrusted registry
sudo podman image trust set --signature-policy /etc/containers/policy.json \
  -t reject untrusted-registry.com

# Set the default policy to reject
sudo podman image trust set --signature-policy /etc/containers/policy.json \
  -t reject default

# Verify
podman image trust show --signature-policy /etc/containers/policy.json
```

## Requiring Signed Images

Configure a registry to require GPG-signed images. If the registry stores simple-signing signatures outside the default location, configure `/etc/containers/registries.d/*.yaml` separately; `podman image trust set` only updates the trust policy.

```bash
# First, ensure you have the public key available
sudo mkdir -p /etc/pki/containers

# Set signedBy trust for a registry
sudo podman image trust set --signature-policy /etc/containers/policy.json \
  -t signedBy \
  --pubkeysfile /etc/pki/containers/signer.gpg \
  registry.example.com

# Verify the configuration
podman image trust show --signature-policy /etc/containers/policy.json
```

```bash
# Set signedBy trust for another registry
sudo podman image trust set --signature-policy /etc/containers/policy.json \
  -t signedBy \
  --pubkeysfile /etc/pki/containers/signer.gpg \
  registry.secure.example.com
```

## Managing Multiple Registries

Configure trust policies for several registries at once.

```bash
#!/bin/bash
# setup-trust.sh - Configure trust policies for multiple registries

# Set default policy to reject
sudo podman image trust set --signature-policy /etc/containers/policy.json \
  -t reject default

# Allow official Docker Hub images
sudo podman image trust set --signature-policy /etc/containers/policy.json \
  -t accept docker.io/library

# Allow Red Hat images with signature verification
sudo podman image trust set --signature-policy /etc/containers/policy.json \
  -t signedBy \
  --pubkeysfile /etc/pki/rpm-gpg/RPM-GPG-KEY-redhat-release \
  registry.access.redhat.com

# Allow internal registry with signature verification
sudo podman image trust set --signature-policy /etc/containers/policy.json \
  -t signedBy \
  --pubkeysfile /etc/pki/containers/internal-signer.gpg \
  registry.internal.example.com

# Allow development images without signatures
sudo podman image trust set --signature-policy /etc/containers/policy.json \
  -t accept dev-registry.example.com

# Show the final configuration
echo "=== Final Trust Configuration ==="
podman image trust show --signature-policy /etc/containers/policy.json
```

```bash
chmod +x setup-trust.sh
sudo ./setup-trust.sh
```

## Comparing CLI Changes with policy.json

```bash
# View the policy file before changes
echo "=== Before ==="
python3 -m json.tool /etc/containers/policy.json

# Make a trust change via CLI
sudo podman image trust set --signature-policy /etc/containers/policy.json \
  -t accept quay.io/myorg

# View the policy file after changes
echo "=== After ==="
python3 -m json.tool /etc/containers/policy.json
```

## Removing Trust Settings

```bash
# Podman does not provide a remove subcommand.
# To make a registry follow the default policy again,
# remove its specific entry from policy.json.
sudo python3 -c "
import json
with open('/etc/containers/policy.json', 'r') as f:
    policy = json.load(f)
docker_transport = policy.get('transports', {}).get('docker', {})
if 'quay.io/myorg' in docker_transport:
    del docker_transport['quay.io/myorg']
with open('/etc/containers/policy.json', 'w') as f:
    json.dump(policy, f, indent=2)
print('Registry trust entry removed')
"
```

## Auditing Trust Configuration

```bash
#!/bin/bash
# audit-trust.sh - Audit the current trust configuration

echo "========================================"
echo "Podman Image Trust Audit"
echo "Date: $(date)"
echo "========================================"

# Show current trust settings
echo ""
echo "--- Current Trust Policies ---"
podman image trust show --signature-policy /etc/containers/policy.json 2>/dev/null

# Check for overly permissive defaults
echo ""
echo "--- Default Policy Check ---"
default_type=$(python3 -c "
import json
with open('/etc/containers/policy.json') as f:
    p = json.load(f)
print(p.get('default', [{}])[0].get('type', 'unknown'))
")

if [ "$default_type" = "insecureAcceptAnything" ]; then
  echo "[WARN] Default policy accepts all images (consider setting to reject)"
elif [ "$default_type" = "reject" ]; then
  echo "[PASS] Default policy blocks images unless a more specific scope allows them"
else
  echo "[INFO] Default policy type: $default_type"
fi

# Check for key files
echo ""
echo "--- Key File Verification ---"
python3 - <<'PY' | while read -r keyfile; do
import json

with open('/etc/containers/policy.json') as f:
    policy = json.load(f)

seen = set()
for transport in policy.get('transports', {}).values():
    for rules in transport.values():
        for rule in rules:
            for path in [rule.get('keyPath'), *rule.get('keyPaths', [])]:
                if path and path not in seen:
                    seen.add(path)
                    print(path)
PY
  if [ -f "$keyfile" ]; then
    echo "[PASS] Key exists: $keyfile"
  else
    echo "[FAIL] Key missing: $keyfile"
  fi
done

echo ""
echo "Audit complete."
```

```bash
chmod +x audit-trust.sh
./audit-trust.sh
```

## Cleanup

```bash
rm -f setup-trust.sh audit-trust.sh
```

## Summary

The `podman image trust` command provides a convenient CLI interface for managing image trust policies without manually editing JSON files. Use `podman image trust show` to review your current configuration and `podman image trust set --signature-policy /etc/containers/policy.json` to add or modify policies for specific registries or repositories. Combine this with scripted setups for consistent policy deployment across your infrastructure, and regularly audit your trust configuration to ensure it matches your security requirements.
