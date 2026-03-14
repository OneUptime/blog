# How to Add a New Control Plane Node to a Talos Linux Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Control Plane, etcd, Kubernetes, High Availability

Description: Detailed guide to adding a new control plane node to a Talos Linux cluster for improved high availability, including etcd membership and load balancer configuration.

---

Control plane nodes are the brains of your Kubernetes cluster. They run the API server, scheduler, controller manager, and etcd - the critical components that make everything else work. Starting with a single control plane node is fine for development, but production clusters need at least three control plane nodes for high availability. If one node goes down, the remaining nodes maintain quorum and the cluster keeps running.

This guide covers the complete process of adding a new control plane node to an existing Talos Linux cluster, including the etcd considerations that make this operation different from adding a worker node.

## Why Add Control Plane Nodes

The primary reason to add control plane nodes is high availability. Here is how quorum works with different numbers:

- **1 node** - No fault tolerance. If it fails, the cluster is down.
- **3 nodes** - Can tolerate 1 failure. This is the minimum for production.
- **5 nodes** - Can tolerate 2 failures. For critical workloads or large clusters.
- **7 nodes** - Can tolerate 3 failures. Rarely needed.

The most common scaling operation is going from 1 to 3 control plane nodes, which takes a development setup to production-ready.

## Prerequisites

Before starting, verify your cluster is healthy and you have the necessary configuration.

```bash
# Check cluster health
talosctl -n <existing-cp-ip> health

# Check current control plane nodes
kubectl get nodes -l node-role.kubernetes.io/control-plane

# Check etcd member list
talosctl -n <existing-cp-ip> etcd members

# Verify you have the control plane configuration
ls controlplane.yaml

# Check current etcd cluster health
talosctl -n <existing-cp-ip> etcd status
```

## Step 1: Prepare the Configuration

The control plane configuration contains the cluster secrets and etcd settings that allow the new node to join the existing control plane.

### Using the Original Configuration

If you still have the original `controlplane.yaml` from when you created the cluster, you can use it directly.

```bash
# The original controlplane.yaml contains everything needed
# for a new control plane node to join
cat controlplane.yaml | head -30
```

### Extracting Configuration from a Running Node

If you have lost the original configuration, extract it from a running control plane node.

```bash
# Get the machine config from an existing control plane node
talosctl -n <existing-cp-ip> get machineconfig -o yaml > controlplane-extracted.yaml

# You may need to clean up node-specific settings
# like hostname and network addresses
```

### Customizing for the New Node

Create a node-specific configuration with custom network settings.

```bash
# Create a patch for the new control plane node
cat > cp-03-patch.yaml << 'EOF'
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
        vip:
          ip: 10.0.0.100
    nameservers:
      - 8.8.8.8
      - 8.8.4.4
  install:
    disk: /dev/sda
EOF

# Apply the patch to generate the final config
talosctl machineconfig patch controlplane.yaml \
  --patch @cp-03-patch.yaml \
  --output cp-03.yaml
```

Note the VIP (Virtual IP) configuration. If your cluster uses a shared VIP for the API server endpoint, each control plane node should be configured to participate in the VIP.

## Step 2: Boot the New Machine

Boot the machine that will become the new control plane node.

### For Virtual Machines

```bash
# Proxmox example
qm create 103 \
  --name talos-cp-03 \
  --memory 4096 \
  --cores 2 \
  --agent enabled=1 \
  --net0 virtio,bridge=vmbr0 \
  --scsi0 local-lvm:50 \
  --cdrom local:iso/talos.iso

qm start 103

# QEMU/KVM example
qemu-system-x86_64 \
  -m 4096 \
  -cpu host \
  -enable-kvm \
  -smp 2 \
  -cdrom talos.iso \
  -boot d \
  -drive file=cp-03.qcow2,format=qcow2,if=virtio,size=50G \
  -net nic,model=virtio -net bridge,br=br0
```

### For Bare Metal

Write the Talos ISO to a USB drive or configure PXE boot. The machine will boot into maintenance mode and wait for configuration.

## Step 3: Apply the Configuration

Apply the control plane configuration to the new machine.

```bash
# Apply the configuration
# --insecure flag needed because the node is in maintenance mode
talosctl apply-config --insecure \
  --nodes 10.0.0.13 \
  --file cp-03.yaml

# The node will:
# 1. Install Talos to the specified disk
# 2. Reboot
# 3. Start Talos services
# 4. Join the etcd cluster
# 5. Start control plane components
```

Do NOT run `talosctl bootstrap` on this node. The bootstrap command is only for the very first control plane node in a new cluster. Subsequent control plane nodes join the existing cluster automatically.

## Step 4: Monitor the Join Process

The new control plane node needs to join both the etcd cluster and the Kubernetes control plane. Monitor the process carefully.

```bash
# Monitor the installation (after applying config)
# Wait for the node to reboot and come up
sleep 120

# Check if the node is responding
talosctl -n 10.0.0.13 version

# Watch the services start
talosctl -n 10.0.0.13 services

# Monitor etcd specifically
talosctl -n 10.0.0.13 logs etcd -f

# Watch for the node to appear in the etcd member list
talosctl -n <existing-cp-ip> etcd members

# Monitor the Kubernetes node join
kubectl get nodes -w
```

### Timeline of Events

After applying the configuration, here is what happens:

1. **Minutes 0-2**: Talos installs to disk and reboots
2. **Minutes 2-3**: Talos services start, machined initializes
3. **Minutes 3-5**: The node contacts the existing control plane and requests to join etcd
4. **Minutes 5-7**: etcd member joins and begins syncing
5. **Minutes 7-10**: Kubernetes control plane components start (API server, scheduler, controller manager)
6. **Minutes 10-12**: The node registers with Kubernetes and becomes Ready

The total process typically takes 5-15 minutes depending on hardware and network speed.

## Step 5: Verify etcd Membership

This is the most important verification step.

```bash
# List etcd members
talosctl -n 10.0.0.10 etcd members

# Expected output for a 3-node control plane:
# MEMBER ID         HOSTNAME   PEER URLS                   CLIENT URLS
# 8e9e05c52164694d  cp-01      https://10.0.0.10:2380      https://10.0.0.10:2379
# 502c5ba1e05d0f2f  cp-02      https://10.0.0.11:2380      https://10.0.0.11:2379
# a1b2c3d4e5f60718  cp-03      https://10.0.0.13:2380      https://10.0.0.13:2379

# Check etcd cluster health
talosctl -n 10.0.0.10 etcd status

# Verify the new member is in sync
talosctl -n 10.0.0.13 etcd status
```

## Step 6: Verify Kubernetes Control Plane

Check that all control plane components are running on the new node.

```bash
# Check the node is Ready
kubectl get node cp-03

# Check control plane pods on the new node
kubectl get pods -n kube-system --field-selector spec.nodeName=cp-03

# Expected pods:
# kube-apiserver-cp-03
# kube-controller-manager-cp-03
# kube-scheduler-cp-03
# etcd-cp-03 (if running as static pod)
# kube-proxy-xxxxx

# Verify the API server on the new node is healthy
curl -k https://10.0.0.13:6443/healthz
# Expected: ok
```

## Step 7: Update the Load Balancer

If you use a load balancer in front of the API servers, add the new control plane node.

### HAProxy

```bash
# Edit /etc/haproxy/haproxy.cfg
# Add to the k8s-api backend:
#   server cp-03 10.0.0.13:6443 check

# Verify and reload
haproxy -c -f /etc/haproxy/haproxy.cfg
sudo systemctl reload haproxy
```

### Nginx

```bash
# Edit your nginx upstream config
# upstream k8s_api {
#   server 10.0.0.10:6443;
#   server 10.0.0.11:6443;
#   server 10.0.0.13:6443;  # New node
# }

sudo nginx -t
sudo systemctl reload nginx
```

### DNS-Based Load Balancing

```bash
# Update your DNS record to include the new IP
# api.k8s.example.com -> 10.0.0.10, 10.0.0.11, 10.0.0.13
```

## Step 8: Update kubeconfig

If your kubeconfig references specific control plane node IPs, update it to include or use the new node.

```bash
# If using a load balancer VIP, no change needed
# If referencing individual nodes:
kubectl config set-cluster my-cluster \
  --server=https://10.0.0.100:6443  # VIP address

# Verify connectivity through the load balancer
kubectl get nodes
```

## Step 9: Full Health Check

Run a comprehensive health check after the new node has settled.

```bash
# Overall cluster health
talosctl -n 10.0.0.10 health

# Check all etcd members are healthy
talosctl -n 10.0.0.10 etcd members
talosctl -n 10.0.0.10 etcd status

# Verify all nodes are Ready
kubectl get nodes

# Check system pods
kubectl get pods -n kube-system

# Test API server failover
# Temporarily stop the API server on one node and verify the cluster still works
# (Only do this in non-production environments)

# Test writing to etcd
kubectl create configmap test-etcd --from-literal=key=value
kubectl get configmap test-etcd
kubectl delete configmap test-etcd
```

## Troubleshooting

### Node Not Joining etcd

```bash
# Check etcd logs on the new node
talosctl -n 10.0.0.13 logs etcd

# Common issues:
# - Network connectivity to existing etcd members
# - Cluster token mismatch (wrong configuration)
# - Port 2380 blocked by firewall

# Verify connectivity
talosctl -n 10.0.0.13 read /proc/net/tcp
```

### API Server Not Starting

```bash
# Check API server logs
talosctl -n 10.0.0.13 logs kube-apiserver

# Verify etcd is accessible from the API server
talosctl -n 10.0.0.13 logs etcd | grep "ready to serve"
```

### Certificate Issues

```bash
# Check certificate status
talosctl -n 10.0.0.13 get machineconfig -o yaml | grep -A5 "ca:"

# Verify the machine config has the correct cluster CA
talosctl -n 10.0.0.13 logs machined | grep -i cert
```

## Special Case: Scaling from 1 to 3

Going from a single control plane node to three is the most common scaling operation. Here is the recommended approach.

```bash
# 1. Verify the single-node cluster is healthy
talosctl -n 10.0.0.10 health

# 2. Add the second control plane node
talosctl apply-config --insecure --nodes 10.0.0.11 --file controlplane.yaml
# Wait for it to join
talosctl -n 10.0.0.10 etcd members

# 3. Add the third control plane node
talosctl apply-config --insecure --nodes 10.0.0.13 --file controlplane.yaml
# Wait for it to join
talosctl -n 10.0.0.10 etcd members

# 4. Verify the full 3-node control plane
talosctl -n 10.0.0.10 etcd status
kubectl get nodes
```

Add them one at a time and wait for each to fully join before adding the next. This ensures etcd membership transitions are smooth.

## Conclusion

Adding a new control plane node to a Talos Linux cluster strengthens your cluster's resilience against node failures. The process is straightforward but requires attention to etcd membership and load balancer configuration. Always verify the etcd cluster health after adding the new node, update your load balancer to distribute API server traffic to the new node, and run a full health check before considering the operation complete. With three or five healthy control plane nodes, your Kubernetes cluster can survive node failures without any impact on your running workloads.
