# How to Add a New Worker Node to a Talos Linux Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Worker Nodes, Kubernetes, Cluster Management, Scaling

Description: A focused guide to adding a new worker node to an existing Talos Linux Kubernetes cluster, covering configuration, provisioning, and verification steps.

---

Worker nodes are the backbone of your Kubernetes cluster. They run your application pods, handle data processing, serve web traffic, and execute batch jobs. Adding a new worker node to a Talos Linux cluster is one of the most common operations you will perform as your workloads grow. The process is clean and repeatable because Talos uses declarative machine configurations - you prepare the config, apply it to the new machine, and the node joins the cluster automatically.

This guide provides a focused walkthrough of adding a single worker node to an existing Talos Linux cluster, with all the details you need to get it right.

## Prerequisites

Before adding a worker node, make sure you have:

- An existing Talos Linux cluster that is healthy
- The `talosctl` CLI configured with access to the cluster
- The worker machine configuration file (worker.yaml)
- A machine to use as the new worker (physical server or VM)
- Network connectivity between the new machine and existing cluster nodes

```bash
# Verify your cluster is healthy
talosctl -n <any-existing-node-ip> health

# Check current nodes
kubectl get nodes

# Verify you have the worker config
ls worker.yaml
```

## Step 1: Prepare the Machine

The new worker machine needs to boot into Talos Linux. There are several ways to do this depending on your environment.

### Bare Metal via ISO

```bash
# Download the Talos ISO (standard or custom)
curl -Lo talos.iso \
  "https://github.com/siderolabs/talos/releases/download/v1.7.0/metal-amd64.iso"

# Or use Image Factory for a custom ISO with extensions
SCHEMATIC_ID="your-schematic-id"
curl -Lo talos.iso \
  "https://factory.talos.dev/image/${SCHEMATIC_ID}/v1.7.0/metal-amd64.iso"

# Write to USB drive
sudo dd if=talos.iso of=/dev/sdX bs=4M status=progress
sync

# Boot the machine from the USB drive
# It will enter maintenance mode and wait for configuration
```

### Virtual Machine

```bash
# For Proxmox
qm create 104 \
  --name talos-worker-04 \
  --memory 8192 \
  --cores 4 \
  --agent enabled=1 \
  --net0 virtio,bridge=vmbr0 \
  --scsi0 local-lvm:50 \
  --cdrom local:iso/talos.iso

qm start 104

# For QEMU/KVM
qemu-system-x86_64 \
  -m 8192 \
  -cpu host \
  -enable-kvm \
  -smp 4 \
  -cdrom talos.iso \
  -boot d \
  -drive file=worker-04.qcow2,format=qcow2,if=virtio,size=50G \
  -net nic,model=virtio -net bridge,br=br0

# For libvirt
virt-install \
  --name talos-worker-04 \
  --ram 8192 \
  --vcpus 4 \
  --disk path=worker-04.qcow2,size=50 \
  --cdrom talos.iso \
  --os-variant generic \
  --network network=default \
  --graphics none \
  --console pty,target_type=serial
```

### PXE Boot

For PXE environments, the machine boots from the network and enters maintenance mode automatically.

```bash
# Configure your PXE server with the Talos kernel and initramfs
# The machine will boot and wait for configuration via the API
```

### Pre-Built Disk Image

```bash
# If using a pre-built disk image
xz -d metal-amd64.raw.xz

# Write to disk for bare metal
sudo dd if=metal-amd64.raw of=/dev/sda bs=4M status=progress

# Or use as a VM disk
cp metal-amd64.raw worker-04.raw
```

## Step 2: Identify the New Machine

Once the machine boots into Talos maintenance mode, find its IP address.

```bash
# The machine will display its IP on the console
# Or discover it via your DHCP server
# Or use talosctl to discover it

# If you know the network range, scan for Talos nodes
talosctl -n 10.0.0.0/24 disks 2>/dev/null
```

Note the IP address of the new machine. We will use `10.0.0.40` in this guide as an example.

## Step 3: Prepare the Worker Configuration

If you have the original worker.yaml from cluster creation, you can use it directly. If you need to customize it for this specific node, create a patched version.

### Using the Original Config

```bash
# The standard worker.yaml works for nodes that use DHCP
cat worker.yaml | head -20

# Verify it has the right cluster settings
grep -A2 "cluster:" worker.yaml
```

### Customizing for the Node

```bash
# Create a patch for node-specific settings
cat > worker-04-patch.yaml << 'EOF'
machine:
  network:
    hostname: worker-04
    interfaces:
      - interface: eth0
        addresses:
          - 10.0.0.40/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.0.1
    nameservers:
      - 8.8.8.8
      - 8.8.4.4
  install:
    disk: /dev/sda
EOF

# Apply the patch to create a node-specific config
talosctl machineconfig patch worker.yaml \
  --patch @worker-04-patch.yaml \
  --output worker-04.yaml
```

### Adding Extensions

If the new worker needs specific extensions that were not in the original config.

```yaml
# Add to the worker config
machine:
  install:
    extensions:
      - image: ghcr.io/siderolabs/iscsi-tools:v0.1.4
      - image: ghcr.io/siderolabs/qemu-guest-agent:v8.2.0
```

## Step 4: Apply the Configuration

Apply the machine configuration to the new node.

```bash
# Apply the worker configuration
# --insecure flag is needed because the node is in maintenance mode
talosctl apply-config --insecure \
  --nodes 10.0.0.40 \
  --file worker.yaml

# Or with the customized config
talosctl apply-config --insecure \
  --nodes 10.0.0.40 \
  --file worker-04.yaml
```

After applying the configuration, the node will:

1. Install Talos to the specified disk
2. Reboot
3. Start Talos services
4. Contact the Kubernetes API server
5. Generate a bootstrap TLS certificate
6. Join the cluster as a worker node

## Step 5: Monitor the Join Process

Watch the node as it joins the cluster.

```bash
# Wait for the node to finish installation and reboot
# This typically takes 2-5 minutes

# Monitor the node's health
talosctl -n 10.0.0.40 health --wait-timeout 10m

# Watch the Kubernetes node list
kubectl get nodes -w

# Check the node's status in detail
talosctl -n 10.0.0.40 services

# View logs during the join process
talosctl -n 10.0.0.40 logs kubelet -f
```

## Step 6: Verify the Node

Once the node shows as Ready in Kubernetes, verify everything is working.

```bash
# Check node status
kubectl get node worker-04

# Expected output:
# NAME        STATUS   ROLES    AGE   VERSION
# worker-04   Ready    <none>   1m    v1.29.0

# Check node details
kubectl describe node worker-04

# Verify allocatable resources
kubectl get node worker-04 -o json | jq '.status.allocatable'

# Check that system pods are running on the new node
kubectl get pods -A --field-selector spec.nodeName=worker-04

# You should see DaemonSet pods like:
# - kube-proxy
# - kube-flannel (or your CNI)
# - Any other DaemonSets in your cluster
```

### Test Pod Scheduling

```bash
# Deploy a test pod specifically on the new node
kubectl run worker-04-test \
  --image=nginx \
  --overrides='{
    "spec": {
      "nodeName": "worker-04",
      "containers": [{
        "name": "nginx",
        "image": "nginx:1.25",
        "ports": [{"containerPort": 80}]
      }]
    }
  }'

# Verify the pod is running
kubectl get pod worker-04-test -o wide

# Check it is actually on the new node
kubectl get pod worker-04-test -o jsonpath='{.spec.nodeName}'

# Clean up the test pod
kubectl delete pod worker-04-test
```

### Verify Extensions

If you installed system extensions, verify they are loaded.

```bash
# List installed extensions
talosctl -n 10.0.0.40 get extensions

# Check for specific functionality
# For example, iSCSI tools
talosctl -n 10.0.0.40 read /proc/modules | grep iscsi

# For QEMU guest agent
talosctl -n 10.0.0.40 services | grep qemu
```

## Step 7: Label the Node (Optional)

Apply labels to the new node for scheduling purposes.

```bash
# Add labels for workload targeting
kubectl label node worker-04 node-role.kubernetes.io/worker=""
kubectl label node worker-04 topology.kubernetes.io/zone=zone-a
kubectl label node worker-04 node-type=general-purpose

# Add taints if needed (e.g., for GPU nodes)
# kubectl taint nodes worker-04 nvidia.com/gpu=present:NoSchedule

# Verify labels
kubectl get node worker-04 --show-labels
```

## Troubleshooting

If the node does not join the cluster, check these common issues.

### Node Not Installing

```bash
# Check if the config was received
talosctl -n 10.0.0.40 disks

# Verify disk is available for installation
talosctl -n 10.0.0.40 get installerconfig
```

### Node Not Joining Kubernetes

```bash
# Check kubelet logs
talosctl -n 10.0.0.40 logs kubelet

# Common issues:
# - API server not reachable (network/firewall)
# - Certificate issues (wrong cluster secrets)
# - DNS resolution failures

# Check network connectivity
talosctl -n 10.0.0.40 read /proc/net/route

# Verify the node can reach the API server
talosctl -n 10.0.0.40 logs machined | grep -i "api\|connect\|error"
```

### Node Shows NotReady

```bash
# Check node conditions
kubectl describe node worker-04 | grep -A5 "Conditions:"

# Common causes:
# - CNI plugin not installed
# - kubelet not fully started
# - Resource pressure

# Check kubelet status
talosctl -n 10.0.0.40 services | grep kubelet
```

## Adding Multiple Workers

If you need to add several workers at once, parallelize the process.

```bash
# Apply configs in parallel
for ip in 10.0.0.40 10.0.0.41 10.0.0.42; do
  talosctl apply-config --insecure \
    --nodes ${ip} \
    --file worker.yaml &
done
wait

# Monitor all nodes
for ip in 10.0.0.40 10.0.0.41 10.0.0.42; do
  talosctl -n ${ip} health --wait-timeout 10m &
done
wait

# Verify all joined
kubectl get nodes
```

## Conclusion

Adding a new worker node to a Talos Linux cluster is a well-defined process: boot the machine, apply the configuration, and wait for it to join. The declarative nature of Talos means every worker node is configured identically (unless you specifically customize individual nodes), which makes scaling predictable and repeatable. Whether you are adding one node or twenty, the steps are the same. Boot, apply config, verify. Once the node shows as Ready in Kubernetes, it is available for scheduling workloads, and your cluster's capacity has increased.
