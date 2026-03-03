# How to Create Ephemeral Talos Clusters for Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Ephemeral Clusters, Testing, Kubernetes, DevOps

Description: Learn how to create short-lived Talos Linux clusters for testing and validation, with automatic creation and teardown to keep environments clean and costs low.

---

Ephemeral clusters are disposable Kubernetes environments that exist only for the duration of a test run, a review session, or a development task. They solve the persistent problem of shared test environments where one team's broken deployment ruins another team's testing. With Talos Linux, creating and destroying clusters is fast enough to make ephemeral environments practical for everyday use.

This guide covers the patterns and tools for creating short-lived Talos clusters that spin up when needed and disappear when done.

## Why Ephemeral Clusters

Shared Kubernetes clusters for testing create several problems:

- Namespace collisions between teams
- Leftover resources from previous test runs
- Configuration changes that affect other users
- No way to test cluster-level changes (CNI, admission webhooks, CRDs)
- Debugging is difficult when the environment keeps changing

Ephemeral clusters eliminate these issues because each test gets a fresh, isolated environment. When the test is done, the cluster is destroyed along with all its state.

## Quick Ephemeral Cluster with Docker Provider

The fastest path to an ephemeral Talos cluster:

```bash
# Create a cluster with a unique name
CLUSTER_NAME="test-$(date +%s)"

talosctl cluster create \
  --provisioner docker \
  --name "$CLUSTER_NAME" \
  --controlplanes 1 \
  --workers 1 \
  --wait-timeout 5m

# Export kubeconfig
export KUBECONFIG="/tmp/${CLUSTER_NAME}.kubeconfig"
talosctl kubeconfig --force "$KUBECONFIG" --merge=false

# Use the cluster
kubectl get nodes

# When done, destroy it
talosctl cluster destroy --name "$CLUSTER_NAME"
```

This entire lifecycle takes about 3-5 minutes, with most of that time spent on cluster creation.

## Wrapper Script for Team Use

Create a simple CLI tool that your team can use to manage ephemeral clusters:

```bash
#!/bin/bash
# ephemeral-cluster - Create and manage throwaway Talos clusters

set -euo pipefail

CLUSTER_DIR="${HOME}/.ephemeral-clusters"
mkdir -p "$CLUSTER_DIR"

cmd_create() {
  local name="${1:-$(openssl rand -hex 4)}"
  local workers="${2:-1}"
  local ttl="${3:-3600}"  # Default 1 hour TTL

  echo "Creating ephemeral cluster: ${name}"
  echo "Workers: ${workers}, TTL: ${ttl}s"

  talosctl cluster create \
    --provisioner docker \
    --name "eph-${name}" \
    --controlplanes 1 \
    --workers "$workers" \
    --wait-timeout 5m

  local kubeconfig="${CLUSTER_DIR}/${name}.kubeconfig"
  talosctl kubeconfig --force "$kubeconfig" --merge=false

  # Store metadata
  cat > "${CLUSTER_DIR}/${name}.meta" <<EOF
CLUSTER_NAME=eph-${name}
CREATED=$(date +%s)
TTL=${ttl}
KUBECONFIG=${kubeconfig}
CREATOR=${USER}
EOF

  echo ""
  echo "Cluster ready!"
  echo "  export KUBECONFIG=${kubeconfig}"
  echo "  kubectl get nodes"
  echo ""
  echo "Destroy with: ephemeral-cluster destroy ${name}"
}

cmd_destroy() {
  local name="$1"
  echo "Destroying cluster: eph-${name}"
  talosctl cluster destroy --name "eph-${name}" || true
  rm -f "${CLUSTER_DIR}/${name}.kubeconfig"
  rm -f "${CLUSTER_DIR}/${name}.meta"
  echo "Cluster destroyed."
}

cmd_list() {
  echo "Active ephemeral clusters:"
  echo "---"
  for meta in "${CLUSTER_DIR}"/*.meta; do
    [ -f "$meta" ] || continue
    source "$meta"
    local age=$(( $(date +%s) - CREATED ))
    local remaining=$(( TTL - age ))
    echo "  Name: ${CLUSTER_NAME}"
    echo "  Creator: ${CREATOR}"
    echo "  Age: $((age / 60))m"
    echo "  TTL remaining: $((remaining / 60))m"
    echo "  KUBECONFIG: ${KUBECONFIG}"
    echo "  ---"
  done
}

cmd_gc() {
  echo "Garbage collecting expired clusters..."
  for meta in "${CLUSTER_DIR}"/*.meta; do
    [ -f "$meta" ] || continue
    source "$meta"
    local age=$(( $(date +%s) - CREATED ))
    if [ "$age" -gt "$TTL" ]; then
      local name=$(basename "$meta" .meta)
      echo "  Destroying expired cluster: ${name}"
      cmd_destroy "$name"
    fi
  done
  echo "Done."
}

case "${1:-help}" in
  create)  cmd_create "${2:-}" "${3:-1}" "${4:-3600}" ;;
  destroy) cmd_destroy "${2:?Usage: ephemeral-cluster destroy <name>}" ;;
  list)    cmd_list ;;
  gc)      cmd_gc ;;
  *)       echo "Usage: ephemeral-cluster {create|destroy|list|gc}" ;;
esac
```

## Ephemeral Clusters with Custom Configurations

Different tests need different cluster configurations. Create template configurations:

```bash
# templates/minimal.sh - Single node, no workers
talosctl cluster create \
  --provisioner docker \
  --name "$CLUSTER_NAME" \
  --controlplanes 1 \
  --workers 0 \
  --config-patch '[{"op": "add", "path": "/cluster/allowSchedulingOnControlPlanes", "value": true}]'
```

```bash
# templates/ha.sh - HA cluster with 3 control planes
talosctl cluster create \
  --provisioner docker \
  --name "$CLUSTER_NAME" \
  --controlplanes 3 \
  --workers 2 \
  --wait-timeout 10m
```

```bash
# templates/with-cilium.sh - Cluster with Cilium CNI
talosctl cluster create \
  --provisioner docker \
  --name "$CLUSTER_NAME" \
  --controlplanes 1 \
  --workers 2 \
  --config-patch '[{"op": "replace", "path": "/cluster/network/cni/name", "value": "none"}]' \
  --wait-timeout 5m

# Install Cilium after cluster is up
export KUBECONFIG="/tmp/${CLUSTER_NAME}.kubeconfig"
cilium install
cilium status --wait
```

## Automatic TTL and Garbage Collection

Prevent orphaned clusters from consuming resources by implementing automatic cleanup:

```bash
# Run as a cron job every 15 minutes
# crontab entry: */15 * * * * /path/to/ephemeral-cluster gc

# Or use a systemd timer
cat <<EOF > /etc/systemd/system/ephemeral-gc.timer
[Unit]
Description=Garbage collect ephemeral Talos clusters

[Timer]
OnCalendar=*:0/15
Persistent=true

[Install]
WantedBy=timers.target
EOF
```

## Ephemeral Clusters with Terraform

For more structured ephemeral environments, use Terraform with the Talos provider:

```hcl
# main.tf
terraform {
  required_providers {
    talos = {
      source  = "siderolabs/talos"
      version = "~> 0.5"
    }
  }
}

variable "cluster_name" {
  default = "ephemeral"
}

resource "talos_machine_secrets" "this" {}

data "talos_machine_configuration" "cp" {
  cluster_name     = var.cluster_name
  machine_type     = "controlplane"
  cluster_endpoint = "https://10.5.0.2:6443"
  machine_secrets  = talos_machine_secrets.this.machine_secrets
}

data "talos_machine_configuration" "worker" {
  cluster_name     = var.cluster_name
  machine_type     = "worker"
  cluster_endpoint = "https://10.5.0.2:6443"
  machine_secrets  = talos_machine_secrets.this.machine_secrets
}

# Output kubeconfig
data "talos_cluster_kubeconfig" "this" {
  depends_on = [talos_machine_bootstrap.this]
  client_configuration = talos_machine_secrets.this.client_configuration
  node                 = "10.5.0.2"
}

output "kubeconfig" {
  value     = data.talos_cluster_kubeconfig.this.kubeconfig_raw
  sensitive = true
}
```

```bash
# Create
terraform apply -var="cluster_name=test-$(date +%s)" -auto-approve

# Use
terraform output -raw kubeconfig > /tmp/ephemeral.kubeconfig

# Destroy
terraform destroy -auto-approve
```

## Pre-warming Ephemeral Clusters

If 3-5 minutes is too long to wait, pre-warm a pool of ready clusters:

```bash
#!/bin/bash
# cluster-pool.sh - Maintain a pool of ready clusters

POOL_SIZE=3
POOL_DIR="${HOME}/.cluster-pool"
mkdir -p "$POOL_DIR"

maintain_pool() {
  local ready=$(ls "${POOL_DIR}"/*.ready 2>/dev/null | wc -l)
  local needed=$((POOL_SIZE - ready))

  for i in $(seq 1 $needed); do
    local name="pool-$(openssl rand -hex 4)"
    echo "Pre-creating cluster: ${name}"

    talosctl cluster create \
      --provisioner docker \
      --name "${name}" \
      --controlplanes 1 \
      --workers 1 \
      --wait-timeout 5m &

    # Mark as ready when done
    wait $!
    talosctl kubeconfig --force "${POOL_DIR}/${name}.kubeconfig" --merge=false
    touch "${POOL_DIR}/${name}.ready"
  done
}

claim_cluster() {
  local ready_file=$(ls "${POOL_DIR}"/*.ready 2>/dev/null | head -1)
  if [ -z "$ready_file" ]; then
    echo "No ready clusters in pool. Creating one..."
    maintain_pool
    ready_file=$(ls "${POOL_DIR}"/*.ready 2>/dev/null | head -1)
  fi

  local name=$(basename "$ready_file" .ready)
  mv "$ready_file" "${POOL_DIR}/${name}.claimed"
  echo "Claimed cluster: ${name}"
  echo "KUBECONFIG=${POOL_DIR}/${name}.kubeconfig"
}
```

## Testing Patterns

### Smoke Tests

Quick validation that deployments work:

```bash
# Deploy and verify basic functionality
kubectl apply -f manifests/
kubectl rollout status deployment/app --timeout=60s
kubectl run test --image=busybox --rm -it -- wget -qO- http://app-service/health
```

### Upgrade Testing

Test application upgrades on a fresh cluster:

```bash
# Deploy old version
kubectl apply -f manifests/v1/
kubectl rollout status deployment/app --timeout=60s

# Upgrade to new version
kubectl apply -f manifests/v2/
kubectl rollout status deployment/app --timeout=120s

# Verify no downtime during upgrade
# (run a load test during the upgrade)
```

### Chaos Testing

Test resilience on an isolated cluster where it does not matter if things break:

```bash
# Delete random pods
kubectl delete pod -l app=myapp --field-selector=status.phase=Running --force

# Drain a node
kubectl drain <node-name> --force --delete-emptydir-data

# Verify recovery
kubectl wait --for=condition=Available deployment/app --timeout=120s
```

## Wrapping Up

Ephemeral Talos clusters change how teams approach testing and development. Instead of sharing fragile persistent environments, each developer or CI job gets a fresh, isolated cluster that exists only as long as needed. The Docker provider makes creation fast enough for interactive use, and proper TTL management prevents resource waste. Combined with automation through scripts or Terraform, ephemeral clusters become a natural part of the development workflow rather than a special occasion.
