# How to Perform Automated CA Rotation in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Certificate Automation, PKI, Security, DevOps

Description: Learn how to automate certificate authority rotation in Talos Linux using scripts, CI/CD pipelines, and monitoring to keep your cluster secure.

---

Manually rotating CA certificates in a Talos Linux cluster works fine for small environments, but it does not scale. When you have dozens of nodes and multiple clusters, you need automation. Automated CA rotation reduces human error, ensures consistency, and makes it possible to rotate certificates on a regular schedule without disrupting operations.

This guide covers building an automated CA rotation pipeline for Talos Linux, from certificate generation to rolling deployment and validation.

## Why Automate CA Rotation

Manual certificate rotation is tedious and error-prone. Teams often delay it because the process is complicated, which leads to certificates expiring unexpectedly. Automation solves several problems:

- Certificates get rotated on schedule without human intervention
- Every step is consistent and repeatable
- Health checks happen automatically between each step
- Rollback is built into the process
- The entire rotation is logged and auditable

## Architecture of an Automated Rotation Pipeline

The pipeline has four main stages:

1. **Certificate Generation**: Create new CA certificates and the CA bundle
2. **Bundle Deployment**: Roll out the CA bundle to all nodes (trust both old and new)
3. **Final Deployment**: Roll out the configuration with only the new CA
4. **Validation**: Verify the entire cluster is healthy

```
[Generate Certs] -> [Deploy Bundle] -> [Validate] -> [Deploy Final] -> [Validate]
                          |                                |
                     [Rollback if                    [Rollback if
                      unhealthy]                      unhealthy]
```

## Step 1: Certificate Generation Script

Start with a script that generates the new CA and creates the bundle.

```bash
#!/bin/bash
# generate-new-ca.sh
# Generates new CA certificates and creates the transition bundle

set -euo pipefail

OUTPUT_DIR="${1:-./ca-rotation-$(date +%Y%m%d)}"
mkdir -p "$OUTPUT_DIR"

echo "Generating new Talos CA..."
cd "$OUTPUT_DIR"

# Generate new Talos API CA
openssl genrsa -out talos-ca-new.key 4096
openssl req -x509 -new -nodes \
  -key talos-ca-new.key \
  -sha256 \
  -days 3650 \
  -out talos-ca-new.crt \
  -subj "/O=talos/CN=talos"

# Generate new Kubernetes CA
openssl genrsa -out k8s-ca-new.key 4096
openssl req -x509 -new -nodes \
  -key k8s-ca-new.key \
  -sha256 \
  -days 3650 \
  -out k8s-ca-new.crt \
  -subj "/CN=kubernetes"

# Extract current CAs from the running cluster
echo "Extracting current CAs from the cluster..."
CONTROL_PLANE_IP="${CONTROL_PLANE_IP:-10.0.1.10}"

talosctl -n "$CONTROL_PLANE_IP" get machineconfig -o yaml > current-config.yaml

# Extract current Talos CA
yq '.machine.ca.crt' current-config.yaml | base64 -d > talos-ca-old.crt

# Extract current Kubernetes CA
yq '.cluster.ca.crt' current-config.yaml | base64 -d > k8s-ca-old.crt

# Create CA bundles
cat talos-ca-old.crt talos-ca-new.crt > talos-ca-bundle.crt
cat k8s-ca-old.crt k8s-ca-new.crt > k8s-ca-bundle.crt

# Encode everything to base64
base64 -w0 talos-ca-bundle.crt > talos-ca-bundle.b64
base64 -w0 talos-ca-new.crt > talos-ca-new.b64
base64 -w0 talos-ca-new.key > talos-ca-new-key.b64
base64 -w0 k8s-ca-bundle.crt > k8s-ca-bundle.b64
base64 -w0 k8s-ca-new.crt > k8s-ca-new.b64
base64 -w0 k8s-ca-new.key > k8s-ca-new-key.b64

echo "Certificate generation complete. Files in: $OUTPUT_DIR"
ls -la "$OUTPUT_DIR"
```

## Step 2: Configuration Template Generator

Create a script that builds the machine configurations for each phase.

```bash
#!/bin/bash
# generate-configs.sh
# Generates machine configurations for bundle phase and final phase

set -euo pipefail

CA_DIR="$1"
NODES_FILE="${2:-nodes.yaml}"

# Read node definitions
# nodes.yaml format:
# control_plane:
#   - ip: 10.0.1.10
#     name: cp-1
#   - ip: 10.0.1.11
#     name: cp-2
# workers:
#   - ip: 10.0.2.10
#     name: worker-1

BUNDLE_DIR="${CA_DIR}/configs-bundle"
FINAL_DIR="${CA_DIR}/configs-final"
mkdir -p "$BUNDLE_DIR" "$FINAL_DIR"

# Read base configs from the cluster
FIRST_CP=$(yq '.control_plane[0].ip' "$NODES_FILE")
talosctl -n "$FIRST_CP" get machineconfig -o yaml > "${CA_DIR}/base-config.yaml"

# Generate bundle phase configs
generate_bundle_config() {
  local node_ip=$1
  local node_name=$2
  local node_type=$3

  # Get the current config for this node
  talosctl -n "$node_ip" get machineconfig -o yaml > "${BUNDLE_DIR}/${node_name}-original.yaml"

  # Patch with CA bundle
  yq eval ".machine.ca.crt = \"$(cat ${CA_DIR}/talos-ca-bundle.b64)\"" \
    "${BUNDLE_DIR}/${node_name}-original.yaml" > "${BUNDLE_DIR}/${node_name}-temp1.yaml"

  if [ "$node_type" = "controlplane" ]; then
    yq eval ".cluster.ca.crt = \"$(cat ${CA_DIR}/k8s-ca-bundle.b64)\"" \
      "${BUNDLE_DIR}/${node_name}-temp1.yaml" > "${BUNDLE_DIR}/${node_name}.yaml"
  else
    cp "${BUNDLE_DIR}/${node_name}-temp1.yaml" "${BUNDLE_DIR}/${node_name}.yaml"
  fi

  # Clean up temp files
  rm -f "${BUNDLE_DIR}/${node_name}-temp1.yaml" "${BUNDLE_DIR}/${node_name}-original.yaml"
}

# Generate configs for all nodes
for row in $(yq -o=json '.control_plane[]' "$NODES_FILE" | jq -c '.'); do
  ip=$(echo "$row" | jq -r '.ip')
  name=$(echo "$row" | jq -r '.name')
  generate_bundle_config "$ip" "$name" "controlplane"
done

for row in $(yq -o=json '.workers[]' "$NODES_FILE" | jq -c '.'); do
  ip=$(echo "$row" | jq -r '.ip')
  name=$(echo "$row" | jq -r '.name')
  generate_bundle_config "$ip" "$name" "worker"
done

echo "Bundle phase configs generated in: $BUNDLE_DIR"
echo "Final phase configs generated in: $FINAL_DIR"
```

## Step 3: Rolling Deployment Script

The deployment script applies configurations one node at a time with health checks.

```bash
#!/bin/bash
# rolling-deploy.sh
# Applies configurations to nodes in a rolling fashion

set -euo pipefail

CONFIG_DIR="$1"
NODES_FILE="${2:-nodes.yaml}"
MAX_RETRIES=30
RETRY_INTERVAL=10

check_node_health() {
  local node_ip=$1
  local attempt=0

  while [ $attempt -lt $MAX_RETRIES ]; do
    if talosctl -n "$node_ip" health --wait-timeout 10s 2>/dev/null; then
      echo "  Node $node_ip is healthy"
      return 0
    fi
    attempt=$((attempt + 1))
    echo "  Waiting for $node_ip (attempt $attempt/$MAX_RETRIES)..."
    sleep $RETRY_INTERVAL
  done

  echo "  ERROR: Node $node_ip did not become healthy"
  return 1
}

check_cluster_health() {
  echo "Checking overall cluster health..."

  # Check Kubernetes nodes
  NOT_READY=$(kubectl get nodes --no-headers 2>/dev/null | grep -cv "Ready" || echo "999")
  if [ "$NOT_READY" -gt 0 ]; then
    echo "  WARNING: $NOT_READY nodes not Ready"
    return 1
  fi

  # Check etcd
  if ! talosctl -n "$(yq '.control_plane[0].ip' $NODES_FILE)" etcd status > /dev/null 2>&1; then
    echo "  WARNING: etcd is unhealthy"
    return 1
  fi

  echo "  Cluster is healthy"
  return 0
}

# Deploy to workers first (less risk)
echo "=== Deploying to worker nodes ==="
for row in $(yq -o=json '.workers[]' "$NODES_FILE" | jq -c '.'); do
  ip=$(echo "$row" | jq -r '.ip')
  name=$(echo "$row" | jq -r '.name')

  echo "Deploying to worker: $name ($ip)"
  talosctl -n "$ip" apply-config --file "${CONFIG_DIR}/${name}.yaml"

  if ! check_node_health "$ip"; then
    echo "ABORT: Worker $name failed health check. Stopping deployment."
    exit 1
  fi
done

# Deploy to control plane nodes one at a time
echo "=== Deploying to control plane nodes ==="
for row in $(yq -o=json '.control_plane[]' "$NODES_FILE" | jq -c '.'); do
  ip=$(echo "$row" | jq -r '.ip')
  name=$(echo "$row" | jq -r '.name')

  echo "Deploying to control plane: $name ($ip)"
  talosctl -n "$ip" apply-config --file "${CONFIG_DIR}/${name}.yaml"

  # Extra wait for control plane nodes
  sleep 30

  if ! check_node_health "$ip"; then
    echo "ABORT: Control plane $name failed health check. Stopping deployment."
    exit 1
  fi

  if ! check_cluster_health; then
    echo "ABORT: Cluster health check failed after updating $name."
    exit 1
  fi
done

echo "=== Deployment complete ==="
check_cluster_health
```

## Step 4: CI/CD Pipeline Integration

Here is a GitHub Actions workflow that orchestrates the entire rotation.

```yaml
# .github/workflows/ca-rotation.yaml
name: CA Certificate Rotation

on:
  schedule:
    # Run quarterly
    - cron: '0 6 1 */3 *'
  workflow_dispatch:  # Allow manual trigger

env:
  CONTROL_PLANE_IP: 10.0.1.10

jobs:
  generate-certificates:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4

      - name: Generate new CA certificates
        run: ./scripts/generate-new-ca.sh ./ca-rotation

      - name: Store certificates as artifacts
        uses: actions/upload-artifact@v4
        with:
          name: ca-rotation-certs
          path: ./ca-rotation/

  deploy-bundle:
    needs: generate-certificates
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: ca-rotation-certs
          path: ./ca-rotation/

      - name: Generate bundle configs
        run: ./scripts/generate-configs.sh ./ca-rotation

      - name: Deploy CA bundle
        run: ./scripts/rolling-deploy.sh ./ca-rotation/configs-bundle

      - name: Validate bundle deployment
        run: ./scripts/validate-cluster.sh

  deploy-final:
    needs: deploy-bundle
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          name: ca-rotation-certs
          path: ./ca-rotation/

      - name: Deploy final CA config
        run: ./scripts/rolling-deploy.sh ./ca-rotation/configs-final

      - name: Full validation
        run: ./scripts/validate-cluster.sh --comprehensive
```

## Step 5: Certificate Expiry Monitoring

Set up monitoring to alert before certificates expire.

```bash
#!/bin/bash
# check-cert-expiry.sh
# Run daily via cron to check certificate expiration

WARNING_DAYS=90
CRITICAL_DAYS=30

check_expiry() {
  local cert_name=$1
  local cert_data=$2
  local expiry_date

  expiry_date=$(echo "$cert_data" | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
  if [ -z "$expiry_date" ]; then
    echo "ERROR: Could not parse certificate: $cert_name"
    return
  fi

  local expiry_epoch=$(date -d "$expiry_date" +%s)
  local now_epoch=$(date +%s)
  local days_remaining=$(( (expiry_epoch - now_epoch) / 86400 ))

  if [ "$days_remaining" -lt "$CRITICAL_DAYS" ]; then
    echo "CRITICAL: $cert_name expires in $days_remaining days ($expiry_date)"
  elif [ "$days_remaining" -lt "$WARNING_DAYS" ]; then
    echo "WARNING: $cert_name expires in $days_remaining days ($expiry_date)"
  else
    echo "OK: $cert_name expires in $days_remaining days ($expiry_date)"
  fi
}

# Check Talos API CA
TALOS_CA=$(talosctl -n 10.0.1.10 get machineconfig -o yaml | yq '.machine.ca.crt' | base64 -d)
check_expiry "Talos API CA" "$TALOS_CA"

# Check Kubernetes CA
K8S_CA=$(talosctl -n 10.0.1.10 get machineconfig -o yaml | yq '.cluster.ca.crt' | base64 -d)
check_expiry "Kubernetes CA" "$K8S_CA"
```

## Rollback Strategy

Every automated rotation needs a rollback plan. Store the original configurations so you can revert if something goes wrong.

```bash
#!/bin/bash
# rollback.sh
# Emergency rollback to pre-rotation configuration

BACKUP_DIR="$1"

if [ -z "$BACKUP_DIR" ]; then
  echo "Usage: rollback.sh <backup-directory>"
  exit 1
fi

echo "Rolling back to configurations in: $BACKUP_DIR"

for config in "$BACKUP_DIR"/*.yaml; do
  NODE_IP=$(yq '.machine.network.interfaces[0].addresses[0]' "$config" | cut -d/ -f1)
  echo "Rolling back $NODE_IP..."
  talosctl -n "$NODE_IP" apply-config --file "$config"
  sleep 30
done

echo "Rollback complete. Verify cluster health manually."
```

## Conclusion

Automating CA rotation in Talos Linux transforms a risky manual process into a reliable, repeatable pipeline. The key components are: scripted certificate generation, templated configuration updates, rolling deployments with health checks, CI/CD integration for scheduling, and monitoring for certificate expiration. Build the automation incrementally - start with the generation and deployment scripts, test them in staging, then add the CI/CD pipeline and monitoring. Once the automation is in place, certificate rotation becomes a non-event rather than a high-stress operation.
