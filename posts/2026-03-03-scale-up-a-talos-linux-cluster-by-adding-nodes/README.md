# How to Scale Up a Talos Linux Cluster by Adding Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Cluster Scaling, Kubernetes, Node Management, Infrastructure

Description: Learn how to scale up your Talos Linux Kubernetes cluster by adding new control plane and worker nodes, including configuration, bootstrapping, and verification.

---

As your workloads grow, your Kubernetes cluster needs to grow with them. Scaling up a Talos Linux cluster means adding new nodes - either worker nodes for more compute capacity or control plane nodes for better availability. Because Talos is configured declaratively through machine configurations rather than manual SSH commands, adding nodes is a consistent and repeatable process. You generate the configuration, apply it to the new machine, and the node joins the cluster automatically.

This guide covers the full process of scaling up a Talos Linux cluster, from preparing configurations to verifying the new nodes are healthy and ready for workloads.

## Planning Your Scale-Up

Before adding nodes, consider what you need:

**Worker nodes** - Add these when you need more compute capacity for pods. Worker nodes are stateless from a Kubernetes perspective and can be added or removed freely.

**Control plane nodes** - Add these for improved availability and fault tolerance. Kubernetes control plane nodes run etcd, the API server, and other control plane components. You generally want 3 or 5 control plane nodes for production clusters.

```bash
# Check current cluster state
kubectl get nodes
talosctl -n <any-node-ip> get members
```

## Preparing the Configuration

Every Talos node needs a machine configuration. If you generated configs during the initial cluster setup, you already have the templates you need.

### Using Existing Configuration

```bash
# If you still have the original generated configs
ls controlplane.yaml worker.yaml talosconfig

# These files are reusable for new nodes of the same role
```

### Generating New Configuration

If you have lost the original files or need to generate fresh ones, you can extract the configuration from a running node.

```bash
# Get the machine config from a running node
talosctl -n 10.0.0.10 get machineconfig -o yaml > existing-config.yaml

# Or regenerate configs from the cluster secrets
# If you saved the secrets during initial setup
talosctl gen config my-cluster https://10.0.0.1:6443 \
  --with-secrets secrets.yaml
```

### Customizing Configuration for New Nodes

Each node may need slightly different settings, like a unique hostname or network configuration.

```bash
# Create a config patch for the new node
cat > node-patch.yaml << 'EOF'
machine:
  network:
    hostname: worker-04
    interfaces:
      - interface: eth0
        dhcp: true
EOF

# Generate the final config with the patch
talosctl gen config my-cluster https://10.0.0.1:6443 \
  --with-secrets secrets.yaml \
  --config-patch-worker @node-patch.yaml
```

## Adding Worker Nodes

Worker nodes are the simplest to add. They do not participate in the control plane, so adding them has no impact on cluster coordination.

### Step 1: Prepare the Machine

Boot the new machine with a Talos installation medium (ISO, PXE, or disk image).

```bash
# If using a custom ISO with extensions
# Download from Image Factory or use your custom ISO
curl -Lo talos-worker.iso \
  "https://factory.talos.dev/image/${SCHEMATIC_ID}/v1.7.0/metal-amd64.iso"

# Write to USB or mount in VM
# The machine will boot into maintenance mode
```

### Step 2: Apply Configuration

Once the machine is booted, apply the worker configuration.

```bash
# Apply worker config to the new node
talosctl apply-config --insecure \
  --nodes <new-node-ip> \
  --file worker.yaml

# The node will install Talos, reboot, and join the cluster
```

### Step 3: Monitor the Join Process

```bash
# Watch the node join
talosctl -n <new-node-ip> health --wait-timeout 10m

# Check Kubernetes sees the new node
kubectl get nodes -w

# Verify the node is Ready
kubectl get nodes | grep worker-04
```

### Step 4: Verify the Node

```bash
# Check node details
kubectl describe node worker-04

# Verify the node has the expected resources
kubectl get node worker-04 -o jsonpath='{.status.capacity}'

# Check that pods can be scheduled on the new node
kubectl run test-pod --image=nginx --overrides='
{
  "spec": {
    "nodeName": "worker-04"
  }
}'
kubectl get pod test-pod
kubectl delete pod test-pod
```

## Adding Control Plane Nodes

Adding control plane nodes is more involved because they run etcd and need to join the etcd cluster.

### Considerations for Control Plane Scaling

- Always scale to an odd number of control plane nodes (1, 3, 5, 7)
- Adding a fourth control plane node to a three-node cluster improves availability but does not improve quorum
- The recommended number for production is 3 or 5 control plane nodes
- Scaling from 1 to 3 is the most common operation

### Step 1: Prepare Configuration

```bash
# The control plane configuration includes etcd cluster information
# This is handled automatically by the Talos bootstrap process

# If you need to customize the new control plane node
cat > cp-patch.yaml << 'EOF'
machine:
  network:
    hostname: cp-03
    interfaces:
      - interface: eth0
        addresses:
          - 10.0.0.13/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.0.1
EOF

# Apply the patch to the controlplane config
talosctl machineconfig patch controlplane.yaml \
  --patch @cp-patch.yaml \
  --output cp-03.yaml
```

### Step 2: Boot and Apply

```bash
# Boot the new machine with Talos
# Then apply the control plane configuration
talosctl apply-config --insecure \
  --nodes <new-cp-ip> \
  --file controlplane.yaml
```

### Step 3: Monitor etcd Join

```bash
# Watch the etcd member join
talosctl -n 10.0.0.10 etcd members

# You should see the new member appear
# NAME       ID                  PEER URLS
# cp-01      xxxxxxxxxxxx        https://10.0.0.10:2380
# cp-02      xxxxxxxxxxxx        https://10.0.0.11:2380
# cp-03      xxxxxxxxxxxx        https://10.0.0.13:2380

# Monitor health
talosctl -n <new-cp-ip> health --wait-timeout 15m
```

### Step 4: Verify Control Plane

```bash
# Check all control plane pods are running
kubectl get pods -n kube-system

# Verify etcd cluster health
talosctl -n 10.0.0.10 etcd status

# Check the API server endpoint
kubectl cluster-info

# Verify all nodes are ready
kubectl get nodes
```

## Scaling Multiple Nodes at Once

For larger scale-ups, you can add multiple nodes in parallel.

```bash
#!/bin/bash
# scale-up-workers.sh

# List of new worker node IPs
NEW_WORKERS=(
  "10.0.0.30"
  "10.0.0.31"
  "10.0.0.32"
  "10.0.0.33"
  "10.0.0.34"
)

# Apply config to all new workers in parallel
for ip in "${NEW_WORKERS[@]}"; do
  echo "Configuring worker at ${ip}..."
  talosctl apply-config --insecure \
    --nodes ${ip} \
    --file worker.yaml &
done

# Wait for all apply operations to complete
wait

echo "All configurations applied. Waiting for nodes to join..."

# Wait for all nodes to be ready
for ip in "${NEW_WORKERS[@]}"; do
  echo "Waiting for ${ip}..."
  talosctl -n ${ip} health --wait-timeout 15m
done

echo "All nodes joined successfully."
kubectl get nodes
```

## Updating Load Balancers

If you are using a load balancer in front of the control plane, update it to include new control plane nodes.

```bash
# Example: Update HAProxy configuration
# Add the new control plane node to the backend

# haproxy.cfg addition:
# backend k8s-api
#   server cp-01 10.0.0.10:6443 check
#   server cp-02 10.0.0.11:6443 check
#   server cp-03 10.0.0.13:6443 check  # New node

# Reload HAProxy
sudo systemctl reload haproxy
```

## Post-Scale Verification

After adding nodes, perform a thorough verification.

```bash
# Check all nodes are Ready
kubectl get nodes -o wide

# Verify pod distribution
kubectl get pods -A -o wide

# Check cluster events
kubectl get events --sort-by='.lastTimestamp' | tail -20

# Verify DNS resolution works on new nodes
kubectl run dns-test --image=busybox --rm -it \
  --overrides='{"spec":{"nodeName":"worker-04"}}' -- \
  nslookup kubernetes.default

# Run a scaling test
kubectl create deployment test-scale --image=nginx --replicas=10
kubectl get pods -o wide | grep test-scale
kubectl delete deployment test-scale
```

## Automating Scale-Up with Terraform

For infrastructure-as-code workflows, automate node provisioning with Terraform.

```hcl
# talos-workers.tf
resource "proxmox_vm_qemu" "talos_worker" {
  count       = var.worker_count
  name        = "talos-worker-${count.index + 1}"
  target_node = "pve1"

  cores  = 4
  memory = 8192
  agent  = 1

  disk {
    type    = "scsi"
    storage = "local-lvm"
    size    = "50G"
  }

  network {
    model  = "virtio"
    bridge = "vmbr0"
  }
}

# Apply Talos config to new workers
resource "null_resource" "talos_config" {
  count = var.worker_count

  provisioner "local-exec" {
    command = <<-EOT
      talosctl apply-config --insecure \
        --nodes ${proxmox_vm_qemu.talos_worker[count.index].default_ipv4_address} \
        --file worker.yaml
    EOT
  }

  depends_on = [proxmox_vm_qemu.talos_worker]
}
```

## Conclusion

Scaling up a Talos Linux cluster is a straightforward process thanks to the declarative configuration model. Worker nodes can be added in parallel with minimal risk, while control plane nodes require more care around etcd membership. The key is having your machine configurations prepared, applying them to new machines, and verifying each node joins the cluster healthy. With the right automation, you can scale from a handful of nodes to hundreds, all using the same repeatable process.
