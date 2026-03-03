# How to Migrate from CoreOS/Flatcar to Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, CoreOS, Flatcar Linux, Migration, Container OS, Infrastructure

Description: A practical guide to migrating from CoreOS or Flatcar Linux to Talos Linux for your Kubernetes nodes with detailed comparison and migration steps.

---

If you have been running Kubernetes on CoreOS (now discontinued) or Flatcar Linux, you are already familiar with the concept of a minimal, container-focused operating system. Talos Linux takes that philosophy further by removing everything that is not strictly necessary for running Kubernetes. Moving from CoreOS or Flatcar to Talos is a natural progression, and this guide covers how to make that transition smoothly.

## CoreOS, Flatcar, and Talos: The Lineage

CoreOS Container Linux pioneered the idea of a minimal, auto-updating operating system designed for running containers. When Red Hat acquired CoreOS and eventually discontinued Container Linux in favor of Fedora CoreOS, the Kinvolk team forked it into Flatcar Linux to maintain the original vision.

Talos Linux, while sharing the same philosophical goals, is a completely different implementation. It was built from scratch specifically for Kubernetes, not just containers in general. Here are the key differences:

| Feature | CoreOS/Flatcar | Talos Linux |
|---|---|---|
| SSH Access | Yes | No |
| Shell | Yes (bash) | No |
| Package Manager | No (but you have a shell) | No |
| Init System | systemd | Custom (machined) |
| Configuration | Ignition/cloud-init | Talos Machine Config |
| Update Mechanism | Nebraska/Omaha protocol | talosctl upgrade |
| Container Runtime | Docker or containerd | containerd only |
| Kubernetes Bootstrap | External (kubeadm, etc.) | Built-in |
| Management API | SSH + systemd | Talos API (gRPC) |

The biggest shift in mindset is that Talos has no interactive access at all. On CoreOS or Flatcar, you could SSH in and run commands if needed. On Talos, everything goes through the Talos API or Kubernetes API.

## Step 1: Document Your Current Setup

Before migrating, capture how your CoreOS/Flatcar nodes are configured:

```bash
# On each CoreOS/Flatcar node, document the configuration

# Check the Ignition config (CoreOS/Flatcar)
cat /etc/ignition.json 2>/dev/null || \
cat /usr/share/oem/config.ign 2>/dev/null

# List systemd units (custom services you may have added)
systemctl list-unit-files --state=enabled | grep -v '@'

# Check network configuration
networkctl status
ip addr show
ip route show

# Document kernel parameters
cat /proc/cmdline
sysctl -a > sysctl-dump.txt

# Check mounted filesystems and storage
lsblk
mount | grep -v cgroup

# Document any custom scripts or configurations
ls /opt/bin/
ls /etc/systemd/system/

# Check etcd configuration if running etcd directly
systemctl cat etcd 2>/dev/null

# Document container runtime configuration
cat /etc/containerd/config.toml 2>/dev/null
cat /etc/docker/daemon.json 2>/dev/null
```

## Step 2: Translate Ignition Config to Talos Machine Config

The Ignition configuration used by CoreOS/Flatcar and the Talos Machine Configuration serve similar purposes but have completely different formats. Here is how to translate common Ignition settings:

```yaml
# Example Ignition config (CoreOS/Flatcar)
# {
#   "ignition": { "version": "3.3.0" },
#   "storage": {
#     "filesystems": [{
#       "device": "/dev/sdb",
#       "format": "ext4",
#       "path": "/var/data"
#     }]
#   },
#   "systemd": {
#     "units": [{
#       "name": "kubelet.service",
#       "enabled": true
#     }]
#   },
#   "networkd": {
#     "units": [{
#       "name": "00-eth0.network",
#       "contents": "[Match]\nName=eth0\n[Network]\nAddress=10.0.0.10/24\nGateway=10.0.0.1"
#     }]
#   }
# }

# Equivalent Talos Machine Configuration
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.9.0
  network:
    hostname: talos-node-01
    interfaces:
      - interface: eth0
        dhcp: false
        addresses:
          - 10.0.0.10/24
        routes:
          - network: 0.0.0.0/0
            gateway: 10.0.0.1
    nameservers:
      - 8.8.8.8
      - 8.8.4.4
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/data
  kubelet:
    extraMounts:
      - destination: /var/mnt/data
        type: bind
        source: /var/mnt/data
        options:
          - bind
          - rshared
          - rw
  kernel:
    modules:
      - name: br_netfilter
      - name: overlay
  sysctls:
    net.ipv4.ip_forward: "1"
    net.bridge.bridge-nf-call-iptables: "1"
```

## Step 3: Handle Custom Systemd Units

One of the biggest differences between CoreOS/Flatcar and Talos is that Talos does not support custom systemd units. If you were running custom services on your CoreOS/Flatcar nodes, you have two options:

1. **Containerize them**: Run the service as a Kubernetes DaemonSet or Deployment.
2. **Use Talos extensions**: For system-level functionality, Talos supports extensions that get baked into the OS image.

```bash
# Check what custom services you are running
systemctl list-units --type=service --state=running | grep -v systemd

# Common services that need to be migrated:
# - Log forwarders (fluentd, filebeat) -> Run as DaemonSet
# - Monitoring agents (node_exporter) -> Run as DaemonSet
# - Custom scripts -> Containerize or use Talos extensions
# - NTP configuration -> Built into Talos machine config
```

For example, if you were running node-exporter as a systemd service:

```yaml
# Instead of a systemd unit, run as a Kubernetes DaemonSet
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
    spec:
      hostNetwork: true
      hostPID: true
      containers:
        - name: node-exporter
          image: prom/node-exporter:latest
          ports:
            - containerPort: 9100
              hostPort: 9100
          args:
            - --path.rootfs=/host
          volumeMounts:
            - name: rootfs
              mountPath: /host
              readOnly: true
      volumes:
        - name: rootfs
          hostPath:
            path: /
```

## Step 4: Generate Talos Configs and Provision Nodes

Generate your cluster configuration:

```bash
# Install talosctl
curl -sL https://talos.dev/install | sh

# Generate configs
talosctl gen secrets -o secrets.yaml
talosctl gen config my-cluster https://10.0.0.100:6443 \
  --with-secrets secrets.yaml \
  --output-dir _out

# Apply your translated configuration patches
talosctl machineconfig patch _out/controlplane.yaml \
  --patch @translated-config.yaml \
  --output _out/controlplane-patched.yaml
```

## Step 5: Perform the Rolling Migration

The safest approach is a rolling migration where you replace CoreOS/Flatcar nodes one at a time with Talos nodes. This works well if you already have a Kubernetes cluster running on your CoreOS/Flatcar nodes:

```bash
# 1. Drain the first CoreOS/Flatcar worker node
kubectl drain flatcar-worker-01 --ignore-daemonsets --delete-emptydir-data

# 2. Remove it from the cluster
kubectl delete node flatcar-worker-01

# 3. Reprovision the machine with Talos
# Boot from the Talos image (ISO, PXE, or cloud image)
# Apply the worker configuration
talosctl apply-config --insecure \
  --nodes 10.0.0.20 \
  --file _out/worker.yaml

# 4. Verify the new Talos node joins the cluster
kubectl get nodes -w

# 5. Repeat for each worker node
# 6. Then migrate control plane nodes one at a time
# (make sure to update etcd membership as you go)
```

For control plane nodes, the process requires more care:

```bash
# Before removing a control plane node, ensure etcd quorum
# Check etcd member list
kubectl exec -n kube-system etcd-cp-01 -- etcdctl member list \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key

# Remove the old member, add the new Talos control plane,
# and update your load balancer configuration
```

## Step 6: Migrate Auto-Update Configuration

CoreOS and Flatcar use the Nebraska/Omaha update protocol for automatic OS updates. Talos handles upgrades differently:

```bash
# On Talos, upgrade the OS with talosctl
talosctl upgrade --nodes 10.0.0.20 \
  --image ghcr.io/siderolabs/installer:v1.9.1

# Upgrade Kubernetes version
talosctl upgrade-k8s --to 1.31.0

# For automated upgrades, consider the Talos System Upgrade Controller
# This watches for new Talos releases and applies them automatically
kubectl apply -f https://raw.githubusercontent.com/siderolabs/talos/main/website/content/v1.9/talos-guides/upgrading-talos/system-upgrade-controller.yaml
```

## Step 7: Verify the Migration

After all nodes are migrated:

```bash
# Verify all nodes are running Talos
talosctl version --nodes 10.0.0.10,10.0.0.20,10.0.0.21

# Check cluster health
kubectl get nodes -o wide
kubectl get pods --all-namespaces | grep -v Running | grep -v Completed

# Verify your workloads are running correctly
kubectl get deploy --all-namespaces
kubectl get sts --all-namespaces

# Test node management through the Talos API
talosctl dmesg --nodes 10.0.0.20
talosctl logs kubelet --nodes 10.0.0.20
```

## Wrapping Up

Migrating from CoreOS or Flatcar to Talos Linux is a natural evolution if you already believe in the minimal container OS philosophy. The main adjustment is moving from an OS that gives you SSH and a shell for edge cases to one that strictly enforces API-driven management. This feels restrictive at first, but it eliminates entire categories of operational issues. No more configuration drift, no more "someone SSH'd in and changed something", no more worrying about OS-level vulnerabilities in packages you do not need. The migration is best done as a rolling replacement, and once complete, you will find that managing your cluster becomes more predictable and less error-prone.
