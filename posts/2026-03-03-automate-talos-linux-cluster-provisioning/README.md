# How to Automate Talos Linux Cluster Provisioning

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Automation, Cluster Provisioning, Kubernetes, Infrastructure as Code, PXE Boot

Description: Automate the entire Talos Linux cluster provisioning process from bare metal or cloud VMs to a running Kubernetes cluster.

---

Provisioning a Talos Linux cluster manually works fine for a single cluster, but when you need to spin up multiple clusters, rebuild environments, or provision on demand, automation is essential. Talos Linux was designed with automation in mind. There is no interactive installer, no SSH to configure, and the entire OS configuration is a single YAML file. This makes it one of the easiest operating systems to automate. In this guide, we will build an automated provisioning pipeline that takes you from bare machines to a running Kubernetes cluster.

## The Provisioning Workflow

A fully automated Talos Linux cluster provisioning flow consists of these stages:

1. **Configuration generation**: Create machine configurations for each node
2. **OS installation**: Boot machines with Talos and install to disk
3. **Cluster bootstrap**: Initialize the cluster on the first control plane node
4. **Node joining**: Remaining nodes join the cluster automatically
5. **Validation**: Verify cluster health and readiness
6. **Post-bootstrap setup**: Install CNI, storage, and other cluster add-ons

## Step 1: Automate Configuration Generation

Create a script that generates all the configuration needed for a cluster:

```bash
#!/bin/bash
# provision.sh - Automated Talos Linux cluster provisioning

set -euo pipefail

# Cluster parameters
CLUSTER_NAME="${CLUSTER_NAME:-my-cluster}"
CLUSTER_ENDPOINT="${CLUSTER_ENDPOINT:-https://10.0.0.100:6443}"
TALOS_VERSION="${TALOS_VERSION:-v1.6.0}"
KUBERNETES_VERSION="${KUBERNETES_VERSION:-v1.29.0}"

# Node definitions
CONTROLPLANE_NODES=("10.0.0.10" "10.0.0.11" "10.0.0.12")
WORKER_NODES=("10.0.0.20" "10.0.0.21" "10.0.0.22" "10.0.0.23")

OUTPUT_DIR="./generated/${CLUSTER_NAME}"
mkdir -p "${OUTPUT_DIR}"

echo "=== Generating Talos Configuration for ${CLUSTER_NAME} ==="

# Generate secrets (only once, reuse for rebuilds)
if [ ! -f "${OUTPUT_DIR}/secrets.yaml" ]; then
    echo "Generating cluster secrets..."
    talosctl gen secrets -o "${OUTPUT_DIR}/secrets.yaml"
fi

# Generate base configuration from secrets
talosctl gen config "${CLUSTER_NAME}" "${CLUSTER_ENDPOINT}" \
    --from "${OUTPUT_DIR}/secrets.yaml" \
    --kubernetes-version "${KUBERNETES_VERSION}" \
    --install-image "ghcr.io/siderolabs/installer:${TALOS_VERSION}" \
    --output-dir "${OUTPUT_DIR}/base"

echo "Base configuration generated"
```

## Step 2: Create Node-Specific Configurations

Generate per-node configurations with appropriate patches:

```bash
# Continue from provision.sh

generate_controlplane_config() {
    local node_ip=$1
    local node_index=$2
    local hostname="cp${node_index}.${CLUSTER_NAME}"

    cat > "${OUTPUT_DIR}/patch-${hostname}.yaml" <<EOF
machine:
  network:
    hostname: ${hostname}
    interfaces:
      - interface: eth0
        addresses:
          - ${node_ip}/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.0.1
  install:
    disk: /dev/sda
  certSANs:
    - ${node_ip}
    - ${hostname}
cluster:
  allowSchedulingOnControlPlanes: false
EOF

    talosctl machineconfig patch "${OUTPUT_DIR}/base/controlplane.yaml" \
        --patch @"${OUTPUT_DIR}/patch-${hostname}.yaml" \
        --output "${OUTPUT_DIR}/${hostname}.yaml"

    echo "Generated config for ${hostname} (${node_ip})"
}

generate_worker_config() {
    local node_ip=$1
    local node_index=$2
    local hostname="worker${node_index}.${CLUSTER_NAME}"

    cat > "${OUTPUT_DIR}/patch-${hostname}.yaml" <<EOF
machine:
  network:
    hostname: ${hostname}
    interfaces:
      - interface: eth0
        addresses:
          - ${node_ip}/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.0.1
  install:
    disk: /dev/sda
  nodeLabels:
    node.kubernetes.io/role: worker
EOF

    talosctl machineconfig patch "${OUTPUT_DIR}/base/worker.yaml" \
        --patch @"${OUTPUT_DIR}/patch-${hostname}.yaml" \
        --output "${OUTPUT_DIR}/${hostname}.yaml"

    echo "Generated config for ${hostname} (${node_ip})"
}

# Generate all configurations
for i in "${!CONTROLPLANE_NODES[@]}"; do
    generate_controlplane_config "${CONTROLPLANE_NODES[$i]}" "$((i+1))"
done

for i in "${!WORKER_NODES[@]}"; do
    generate_worker_config "${WORKER_NODES[$i]}" "$((i+1))"
done
```

## Step 3: Automate PXE Boot Installation

For bare metal provisioning, set up a PXE boot environment:

```yaml
# matchbox/groups/talos-controlplane.json
{
  "id": "talos-controlplane",
  "name": "Talos Control Plane",
  "profile": "talos-controlplane",
  "selector": {
    "mac": "00:11:22:33:44:*"
  }
}
```

```yaml
# matchbox/profiles/talos-controlplane.json
{
  "id": "talos-controlplane",
  "name": "Talos Control Plane",
  "boot": {
    "kernel": "/assets/vmlinuz",
    "initrd": ["/assets/initramfs.xz"],
    "args": [
      "initrd=initramfs.xz",
      "talos.platform=metal",
      "talos.config=http://matchbox.example.com:8080/config/controlplane"
    ]
  }
}
```

Deploy the matchbox server for PXE serving:

```yaml
# matchbox-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: matchbox
  namespace: provisioning
spec:
  replicas: 1
  selector:
    matchLabels:
      app: matchbox
  template:
    metadata:
      labels:
        app: matchbox
    spec:
      containers:
        - name: matchbox
          image: quay.io/poseidon/matchbox:latest
          args:
            - -address=0.0.0.0:8080
            - -assets-path=/var/lib/matchbox/assets
          ports:
            - containerPort: 8080
          volumeMounts:
            - name: data
              mountPath: /var/lib/matchbox
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: matchbox-data
```

## Step 4: Automate the Bootstrap Process

After nodes boot with Talos, bootstrap the cluster:

```bash
#!/bin/bash
# bootstrap.sh - Cluster bootstrap automation

set -euo pipefail

CLUSTER_NAME="${CLUSTER_NAME:-my-cluster}"
OUTPUT_DIR="./generated/${CLUSTER_NAME}"
FIRST_CP="${CONTROLPLANE_NODES[0]}"

# Configure talosctl
export TALOSCONFIG="${OUTPUT_DIR}/base/talosconfig"
talosctl config endpoint "${FIRST_CP}"
talosctl config node "${FIRST_CP}"

echo "=== Waiting for first control plane node to be ready ==="
wait_for_node() {
    local node_ip=$1
    local max_attempts=60
    local attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if talosctl --nodes "${node_ip}" health --wait-timeout 10s 2>/dev/null; then
            echo "Node ${node_ip} is ready"
            return 0
        fi
        attempt=$((attempt + 1))
        echo "Waiting for ${node_ip}... (${attempt}/${max_attempts})"
        sleep 10
    done
    echo "Timeout waiting for ${node_ip}"
    return 1
}

# Apply configuration to all nodes
echo "=== Applying configurations ==="
for i in "${!CONTROLPLANE_NODES[@]}"; do
    node_ip="${CONTROLPLANE_NODES[$i]}"
    hostname="cp$((i+1)).${CLUSTER_NAME}"
    echo "Applying config to ${hostname} (${node_ip})..."
    talosctl apply-config --insecure --nodes "${node_ip}" --file "${OUTPUT_DIR}/${hostname}.yaml"
done

for i in "${!WORKER_NODES[@]}"; do
    node_ip="${WORKER_NODES[$i]}"
    hostname="worker$((i+1)).${CLUSTER_NAME}"
    echo "Applying config to ${hostname} (${node_ip})..."
    talosctl apply-config --insecure --nodes "${node_ip}" --file "${OUTPUT_DIR}/${hostname}.yaml"
done

# Wait for first control plane node
wait_for_node "${FIRST_CP}"

# Bootstrap the cluster
echo "=== Bootstrapping cluster ==="
talosctl bootstrap --nodes "${FIRST_CP}"

# Wait for all nodes
echo "=== Waiting for all nodes to join ==="
ALL_NODES=("${CONTROLPLANE_NODES[@]}" "${WORKER_NODES[@]}")
for node_ip in "${ALL_NODES[@]}"; do
    wait_for_node "${node_ip}"
done

# Get kubeconfig
echo "=== Retrieving kubeconfig ==="
talosctl kubeconfig --nodes "${FIRST_CP}" -f "${OUTPUT_DIR}/kubeconfig"
export KUBECONFIG="${OUTPUT_DIR}/kubeconfig"

# Wait for Kubernetes API
echo "=== Waiting for Kubernetes API ==="
kubectl wait --for=condition=Ready nodes --all --timeout=600s

echo "=== Cluster is ready ==="
kubectl get nodes -o wide
```

## Step 5: Post-Bootstrap Automation

Install essential cluster components after bootstrap:

```bash
#!/bin/bash
# post-bootstrap.sh - Install cluster essentials

set -euo pipefail

CLUSTER_NAME="${CLUSTER_NAME:-my-cluster}"
export KUBECONFIG="./generated/${CLUSTER_NAME}/kubeconfig"

echo "=== Installing cluster essentials ==="

# Install Cilium CNI
echo "Installing Cilium..."
helm repo add cilium https://helm.cilium.io/
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set ipam.mode=kubernetes \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true

# Wait for Cilium to be ready
kubectl wait --for=condition=Ready pods -l app.kubernetes.io/name=cilium-agent -n kube-system --timeout=300s

# Install Metrics Server
echo "Installing Metrics Server..."
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/
helm install metrics-server metrics-server/metrics-server \
  --namespace kube-system \
  --set args[0]="--kubelet-insecure-tls"

# Install cert-manager
echo "Installing cert-manager..."
helm repo add jetstack https://charts.jetstack.io
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set installCRDs=true

# Install storage provisioner (example with local-path)
echo "Installing storage provisioner..."
kubectl apply -f https://raw.githubusercontent.com/rancher/local-path-provisioner/v0.0.26/deploy/local-path-storage.yaml

echo "=== Post-bootstrap setup complete ==="
kubectl get pods --all-namespaces
```

## Step 6: Full Orchestration Script

Combine everything into a single orchestration script:

```bash
#!/bin/bash
# orchestrate.sh - Full cluster provisioning pipeline

set -euo pipefail

source ./config.env  # Load cluster configuration

echo "============================================"
echo "Provisioning Talos Linux Cluster: ${CLUSTER_NAME}"
echo "============================================"

# Step 1: Generate configurations
echo "[1/5] Generating configurations..."
bash scripts/provision.sh

# Step 2: Validate configurations
echo "[2/5] Validating configurations..."
bash scripts/validate.sh

# Step 3: Bootstrap cluster
echo "[3/5] Bootstrapping cluster..."
bash scripts/bootstrap.sh

# Step 4: Post-bootstrap setup
echo "[4/5] Installing cluster essentials..."
bash scripts/post-bootstrap.sh

# Step 5: Validate cluster health
echo "[5/5] Validating cluster health..."
bash scripts/health-check.sh

echo "============================================"
echo "Cluster ${CLUSTER_NAME} is ready!"
echo "KUBECONFIG: ./generated/${CLUSTER_NAME}/kubeconfig"
echo "============================================"
```

## Conclusion

Automating Talos Linux cluster provisioning transforms a manual, error-prone process into a repeatable, reliable pipeline. The key enabler is Talos Linux's declarative design. Every aspect of the OS is a YAML file, which means scripts can generate, validate, and apply configurations without any interactive steps. Whether you are provisioning bare metal servers via PXE boot or cloud VMs through APIs, the automation pattern is the same: generate configurations, apply them, bootstrap, and validate. Store your provisioning scripts and configuration templates in Git alongside your cluster workloads for a complete infrastructure-as-code workflow.
