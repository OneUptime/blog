# How to Manage Talos Linux Configuration with GitOps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, GitOps, Configuration Management, Kubernetes, Infrastructure as Code, Version Control

Description: Learn how to version control and manage your Talos Linux machine configurations using GitOps principles and automation.

---

Talos Linux is already declarative by design. Every aspect of the operating system is defined in a machine configuration file. But if you are managing those configuration files by hand, passing them around in Slack messages, or storing them on someone's laptop, you are not getting the full benefit. By applying GitOps principles to your Talos Linux configuration, you get version control, change tracking, peer review, and automated rollouts. This guide shows you how to manage your entire Talos Linux cluster configuration through Git.

## Why GitOps for Talos Configuration

Talos machine configurations contain everything about your nodes: network settings, cluster endpoints, kubelet arguments, kernel parameters, and more. Changes to these configurations can break your cluster if applied incorrectly. GitOps gives you:

- **Version history**: See exactly what changed, when, and who approved it
- **Peer review**: Configuration changes go through pull requests before being applied
- **Rollback capability**: Revert to any previous configuration state
- **Audit trail**: Meet compliance requirements with a full change log
- **Reproducibility**: Rebuild your entire cluster from the Git repository

## Repository Structure

Organize your Talos configuration repository:

```text
talos-config/
  /clusters/
    /production/
      /controlplane.yaml     # Control plane machine config template
      /worker.yaml            # Worker machine config template
      /patches/
        /all-nodes.yaml       # Patches applied to all nodes
        /controlplane/
          /cp1.yaml           # Node-specific patch for cp1
          /cp2.yaml           # Node-specific patch for cp2
          /cp3.yaml           # Node-specific patch for cp3
        /workers/
          /worker1.yaml       # Node-specific patch for worker1
          /worker2.yaml       # Node-specific patch for worker2
      /talosconfig            # Talos client configuration
    /staging/
      /controlplane.yaml
      /worker.yaml
      /patches/
        /...
  /scripts/
    /apply-config.sh          # Automation script
    /validate-config.sh       # Validation script
  /.github/
    /workflows/
      /validate.yaml          # CI validation pipeline
      /apply.yaml             # CD apply pipeline
```

## Step 1: Generate and Store Base Configuration

Generate your Talos configuration and commit it to Git:

```bash
# Generate cluster configuration
talosctl gen config production-cluster https://10.0.0.100:6443 \
  --output-dir ./clusters/production

# This creates:
# - controlplane.yaml
# - worker.yaml
# - talosconfig
```

Before committing, remove secrets from the configuration. You do not want cluster secrets in your Git repository:

```bash
# Extract secrets to a separate file (store securely, NOT in Git)
talosctl gen secrets -o clusters/production/secrets.yaml

# Add secrets file to .gitignore
echo "clusters/*/secrets.yaml" >> .gitignore
echo "clusters/*/talosconfig" >> .gitignore
```

## Step 2: Use Configuration Patches

Instead of editing the base configuration directly, use patches. This keeps the base configuration clean and makes changes trackable:

```yaml
# clusters/production/patches/all-nodes.yaml
# Applied to all nodes in the cluster
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.6.0
  network:
    nameservers:
      - 8.8.8.8
      - 8.8.4.4
  time:
    servers:
      - time.cloudflare.com
  kubelet:
    extraArgs:
      rotate-server-certificates: "true"
  sysctls:
    net.core.somaxconn: "65535"
    vm.max_map_count: "262144"
```

```yaml
# clusters/production/patches/controlplane/cp1.yaml
# Specific to control plane node 1
machine:
  network:
    hostname: cp1.production.example.com
    interfaces:
      - interface: eth0
        addresses:
          - 10.0.0.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.0.1
```

```yaml
# clusters/production/patches/workers/worker1.yaml
# Specific to worker node 1
machine:
  network:
    hostname: worker1.production.example.com
    interfaces:
      - interface: eth0
        addresses:
          - 10.0.0.20/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.0.1
  # Worker-specific settings
  nodeLabels:
    node.kubernetes.io/pool: general
    topology.kubernetes.io/zone: zone-a
```

## Step 3: Create Configuration Generation Script

Write a script that assembles the final configuration from base + patches:

```bash
#!/bin/bash
# scripts/generate-configs.sh

set -euo pipefail

CLUSTER=${1:-production}
BASE_DIR="clusters/${CLUSTER}"
OUTPUT_DIR="clusters/${CLUSTER}/generated"

mkdir -p "${OUTPUT_DIR}"

echo "Generating configurations for cluster: ${CLUSTER}"

# Generate control plane configs with patches
for patch_file in "${BASE_DIR}/patches/controlplane/"*.yaml; do
    node_name=$(basename "${patch_file}" .yaml)
    echo "Generating config for control plane node: ${node_name}"

    talosctl machineconfig patch "${BASE_DIR}/controlplane.yaml" \
        --patch @"${BASE_DIR}/patches/all-nodes.yaml" \
        --patch @"${patch_file}" \
        --output "${OUTPUT_DIR}/${node_name}.yaml"
done

# Generate worker configs with patches
for patch_file in "${BASE_DIR}/patches/workers/"*.yaml; do
    node_name=$(basename "${patch_file}" .yaml)
    echo "Generating config for worker node: ${node_name}"

    talosctl machineconfig patch "${BASE_DIR}/worker.yaml" \
        --patch @"${BASE_DIR}/patches/all-nodes.yaml" \
        --patch @"${patch_file}" \
        --output "${OUTPUT_DIR}/${node_name}.yaml"
done

echo "All configurations generated in ${OUTPUT_DIR}/"
```

## Step 4: Create Validation Script

Validate configurations before applying them:

```bash
#!/bin/bash
# scripts/validate-config.sh

set -euo pipefail

CLUSTER=${1:-production}
CONFIG_DIR="clusters/${CLUSTER}/generated"
ERRORS=0

echo "Validating configurations in ${CONFIG_DIR}"

for config_file in "${CONFIG_DIR}"/*.yaml; do
    node_name=$(basename "${config_file}" .yaml)
    echo -n "Validating ${node_name}... "

    if talosctl validate --config "${config_file}" --mode metal 2>/dev/null; then
        echo "OK"
    else
        echo "FAILED"
        ERRORS=$((ERRORS + 1))
    fi
done

if [ ${ERRORS} -gt 0 ]; then
    echo "Validation failed with ${ERRORS} errors"
    exit 1
fi

echo "All configurations are valid"
```

## Step 5: Set Up CI/CD Pipeline

Create a GitHub Actions workflow for validation and application:

```yaml
# .github/workflows/validate.yaml
name: Validate Talos Configuration

on:
  pull_request:
    paths:
      - 'clusters/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install talosctl
        run: |
          curl -sL https://talos.dev/install | sh

      - name: Generate configurations
        run: |
          bash scripts/generate-configs.sh production

      - name: Validate configurations
        run: |
          bash scripts/validate-config.sh production

      - name: Check for drift
        run: |
          # Compare generated configs with what is in the repo
          git diff --exit-code clusters/production/generated/ || \
            echo "Warning: Generated configs differ from committed configs"
```

```yaml
# .github/workflows/apply.yaml
name: Apply Talos Configuration

on:
  push:
    branches: [main]
    paths:
      - 'clusters/production/**'

jobs:
  apply:
    runs-on: self-hosted  # Must run on a machine with cluster access
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Install talosctl
        run: |
          curl -sL https://talos.dev/install | sh

      - name: Generate configurations
        run: bash scripts/generate-configs.sh production

      - name: Validate configurations
        run: bash scripts/validate-config.sh production

      - name: Apply configurations
        env:
          TALOS_CONFIG: ${{ secrets.TALOS_CONFIG }}
        run: |
          # Write talosconfig from secret
          echo "${TALOS_CONFIG}" > /tmp/talosconfig

          # Apply to each node
          for config_file in clusters/production/generated/*.yaml; do
            node_name=$(basename "${config_file}" .yaml)
            node_ip=$(grep -A1 'addresses:' "${config_file}" | tail -1 | tr -d ' -' | cut -d/ -f1)
            echo "Applying config to ${node_name} (${node_ip})"
            talosctl apply-config --nodes "${node_ip}" --file "${config_file}" --talosconfig /tmp/talosconfig
          done
```

## Step 6: Handle Secret Management

Use SOPS or sealed secrets for any sensitive configuration values:

```bash
# Encrypt the secrets file with SOPS
sops --encrypt --age age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  clusters/production/secrets.yaml > clusters/production/secrets.enc.yaml

# Decrypt when needed
sops --decrypt clusters/production/secrets.enc.yaml > clusters/production/secrets.yaml
```

Add a `.sops.yaml` configuration to your repository:

```yaml
# .sops.yaml
creation_rules:
  - path_regex: .*secrets.*\.yaml$
    age: age1xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Step 7: Implement Change Management

Use Git branching for configuration changes:

```bash
# Create a branch for the configuration change
git checkout -b config/update-kubelet-args

# Make changes to patches
vim clusters/production/patches/all-nodes.yaml

# Regenerate configurations
bash scripts/generate-configs.sh production

# Validate
bash scripts/validate-config.sh production

# Commit and push
git add -A
git commit -m "Update kubelet args for certificate rotation"
git push origin config/update-kubelet-args

# Create a pull request for peer review
```

The pull request shows exactly what changed in the generated configurations, making review straightforward.

## Conclusion

Managing Talos Linux configuration with GitOps transforms cluster operations from ad-hoc commands to a structured, reviewable, and auditable process. Your Git repository becomes the single source of truth for your cluster's desired state. Every change goes through a pull request, gets validated in CI, and is applied automatically after approval. This approach scales from a single cluster to dozens and gives your team confidence that configuration changes will not break things. Combined with GitOps tools like Flux or ArgoCD for the workload layer, you get a fully declarative infrastructure stack from OS to applications.
