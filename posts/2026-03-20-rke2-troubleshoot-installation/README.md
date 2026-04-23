# How to Troubleshoot RKE2 Installation Failures - Part 3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Troubleshooting, Installation, Kubernetes, Debugging, SUSE Rancher

Description: Learn how to diagnose and fix common RKE2 installation failures including service startup issues, networking problems, etcd failures, and agent join failures.

---

RKE2 installation failures typically occur during service startup, node join, or networking initialization. This guide covers systematic diagnosis for each failure type.

---

## Step 1: Check RKE2 Service Status

```bash
# Check if the service is running

systemctl status rke2-server
# or for agent nodes:
systemctl status rke2-agent

# Follow live logs
journalctl -u rke2-server -f

# View the last 200 log lines
journalctl -u rke2-server -n 200 --no-pager
```

---

## Step 2: Check the RKE2 Log File

```bash
# RKE2 service logs are in journald; component file logs are separate
tail -n 100 /var/lib/rancher/rke2/agent/containerd/containerd.log
tail -n 100 /var/lib/rancher/rke2/agent/logs/kubelet.log

# For server nodes, check control-plane pod logs
/var/lib/rancher/rke2/bin/kubectl --kubeconfig /etc/rancher/rke2/rke2.yaml logs -n kube-system -l component=kube-apiserver --tail=100
ls /var/log/pods/
```

---

## Common Issue 1: Port Conflicts

RKE2 requires specific ports. Check for conflicts:

```bash
# Check if required ports are available
ss -tulnp | grep -E ':(6443|9345|2379|2380|2381|10250|8472)([[:space:]]|$)'

# If a port is in use, identify the process
ss -tulnp | grep 6443
# Kill conflicting service or change configuration
```

Required ports:
- 6443: Kubernetes API server
- 9345: RKE2 supervisor API
- 2379-2380: etcd client and peer traffic between server nodes
- 2381: etcd metrics between server nodes
- 10250: kubelet metrics
- 8472/udp: Canal VXLAN traffic when using the default Canal CNI
- 30000-32767: NodePort services if used

Exact CNI ports depend on the selected CNI plugin.

---

## Common Issue 2: Firewall Blocking Traffic

```bash
# Check firewall rules
firewall-cmd --list-all
# or
iptables -L -n | grep DROP

# Open required ports (firewalld)
firewall-cmd --permanent --add-port=6443/tcp
firewall-cmd --permanent --add-port=9345/tcp
firewall-cmd --permanent --add-port=10250/tcp
firewall-cmd --permanent --add-port=2379-2380/tcp
firewall-cmd --permanent --add-port=2381/tcp
firewall-cmd --permanent --add-port=8472/udp
firewall-cmd --reload
```

---

## Common Issue 3: etcd Startup Failure

```bash
# Check etcd-specific logs
journalctl -u rke2-server | grep etcd
/var/lib/rancher/rke2/bin/kubectl --kubeconfig /etc/rancher/rke2/rke2.yaml logs -n kube-system -l component=etcd --tail=100

# Check if etcd data directory has corruption
ls -la /var/lib/rancher/rke2/server/db/etcd/

# If etcd is corrupted, reset and restore from snapshot
systemctl stop rke2-server
rke2 server --cluster-reset --cluster-reset-restore-path=<PATH-TO-SNAPSHOT>
systemctl start rke2-server

# To reset cluster membership without restoring a snapshot:
# rke2 server --cluster-reset
```

---

## Common Issue 4: Agent Cannot Join the Cluster

When agent nodes fail to join:

```bash
# Check agent logs
journalctl -u rke2-agent -n 100 --no-pager

# Verify the server token matches
cat /var/lib/rancher/rke2/server/node-token  # on server
cat /etc/rancher/rke2/config.yaml            # on agent - check token field

# Verify the server URL is reachable from the agent
curl -k https://<server-ip>:9345/v1-rke2/readyz

# Check the agent configuration
cat /etc/rancher/rke2/config.yaml
```

---

## Common Issue 5: CNI Plugin Not Starting

```bash
# Check CNI-related pod status
kubectl get pods -n kube-system | grep -E "canal|calico|cilium|flannel"

# View CNI pod logs
kubectl logs -n kube-system -l k8s-app=canal

# Check if CNI binaries are present
ls /opt/cni/bin/
ls /var/lib/rancher/rke2/data/current/bin/

# Check node conditions for network issues
kubectl describe node <node-name> | grep -A 5 Conditions
```

---

## Common Issue 6: Resource Constraints

```bash
# Check system resources
free -h        # Memory available (minimum 4GB; 8GB recommended)
df -h          # Disk space (SSD recommended; size depends on workload and etcd data)
nproc          # CPU cores (minimum 2; 4 recommended)

# Check swap; Linux kubelet fails on swap by default unless configured to tolerate it
swapon --show
# Disable swap if active:
swapoff -a
sed -i '/swap/d' /etc/fstab
```

---

## Common Issue 7: Wrong System Configuration

```bash
# Check required kernel modules
lsmod | grep -E "br_netfilter|overlay"

# Load missing modules
modprobe br_netfilter
modprobe overlay

# Check sysctl settings
sysctl net.bridge.bridge-nf-call-iptables
sysctl net.ipv4.ip_forward

# Apply if missing
cat > /etc/sysctl.d/99-kubernetes.conf << EOF
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF
sysctl --system
```

---

## Step 3: Clean Reinstall

If the installation is in an unrecoverable state:

```bash
# Run the RKE2 uninstall script
/usr/local/bin/rke2-uninstall.sh
# or, depending on the install location:
/opt/rke2/bin/rke2-uninstall.sh

# Clean up remaining files
rm -rf /var/lib/rancher/rke2/
rm -rf /etc/rancher/rke2/
rm -rf /run/k3s/

# Reinstall
curl -sfL https://get.rke2.io | sh -
```

---

## Best Practices

- Always check port availability and firewall rules before installation - these are the most common causes of failure.
- Verify system prerequisites (kernel modules, sysctl settings, and swap behavior) before starting the installer.
- For multi-node clusters, always get the first server node fully healthy before joining additional nodes or agents.
