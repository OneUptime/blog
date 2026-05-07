# How to Create an RKE2 Cluster in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, RKE2, Cluster Management

Description: A complete guide to creating an RKE2 cluster through the Rancher UI with production-ready configuration.

RKE2, also known as RKE Government, is Rancher's enterprise-ready next-generation Kubernetes distribution. It combines the ease of use of RKE with the security focus of K3s, providing defaults and configuration options for CIS hardening while enabling FIPS 140-2 compliance, and it does not depend on Docker. This guide walks you through creating an RKE2 cluster using the Rancher management UI.

## Prerequisites

- A supported Rancher Manager release
- Linux nodes with:
  - Minimum 4 GB RAM and 2 CPUs
  - Unique hostnames
  - A supported Linux distribution (see the RKE2 support matrix)
  - Systemd-based init system
  - SSH or console access
- Network connectivity between nodes and to the Rancher server
- If NetworkManager is enabled, configure it to ignore CNI-managed interfaces
- No Docker required (RKE2 uses containerd)

## Step 1: Prepare the Nodes

### System Requirements

Ensure each node meets the following requirements:

```bash
# Disable swap

sudo swapoff -a
sudo sed -i '/swap/d' /etc/fstab

# Load kernel modules
cat <<EOF | sudo tee /etc/modules-load.d/rke2.conf
br_netfilter
overlay
EOF

sudo modprobe br_netfilter
sudo modprobe overlay

# Set sysctl parameters
cat <<EOF | sudo tee /etc/sysctl.d/rke2.conf
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF

sudo sysctl --system
```

### Open Required Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 9345 | TCP | RKE2 supervisor API |
| 6443 | TCP | Kubernetes API |
| 10250 | TCP | kubelet metrics |
| 2379-2380 | TCP | etcd |
| 8472 | UDP | Canal VXLAN (if using Canal) |
| 30000-32767 | TCP | NodePort services |

Additional CNI-specific ports may be required for Calico, Cilium, Flannel, or WireGuard; review the RKE2 requirements for the plugin you select.

## Step 2: Create the Cluster in Rancher

1. Log in to the Rancher UI
2. Navigate to **Cluster Management**
3. Click **Create**
4. Select **Custom**

## Step 3: Configure Cluster Settings

### Basic Configuration

- **Cluster Name**: Enter a name (e.g., `production-rke2`)
- **Description**: Optional description
- **Kubernetes Version**: Select an RKE2 Kubernetes version

### Cluster Configuration

Under the cluster configuration section, set:

#### Container Network Interface (CNI)

Select the network plugin:

- **Canal** (default): Flannel networking with Calico network policies
- **Calico**: Networking and network policy with BGP or VXLAN options
- **Cilium**: eBPF-based networking
- **Flannel**: Simple VXLAN-based pod networking
- **Multus**: Secondary CNI for multiple interfaces per pod; use it alongside a primary CNI

#### Cloud Provider

Select your cloud provider if applicable:

- **None**: No cloud provider integration
- **AWS**: Enables AWS cloud features
- **Azure**: Enables Azure cloud features
- **GCE**: Enables Google Compute Engine cloud features
- **vSphere**: Enables vSphere integration
- **Custom**: Configure another cloud provider in cluster YAML if needed

#### Pod Security Admission Configuration Template

Rancher lets you assign a Pod Security Admission configuration template:

- **rancher-privileged**: Most permissive built-in template
- **rancher-restricted**: Heavily restricted built-in template
- **Custom template**: Use a custom PSA template if your Rancher admins created one

### Registry Mirror

For custom-node clusters, place this in `/etc/rancher/rke2/registries.yaml` on each node that will pull images:

```yaml
mirrors:
  docker.io:
    endpoint:
      - https://registry.yourdomain.com
```

## Step 4: Configure Advanced Options

### etcd Configuration

```yaml
# Automatic snapshots
etcd-snapshot-schedule-cron: "0 */12 * * *"
etcd-snapshot-retention: 6
```

For S3 backup:

```yaml
etcd-s3: true
etcd-s3-bucket: rancher-etcd-backups
etcd-s3-region: us-east-1
etcd-s3-access-key: <ACCESS_KEY>
etcd-s3-secret-key: <SECRET_KEY>
```

### Audit Logging

Enable Kubernetes audit logging by providing an audit policy file and kube-apiserver arguments:

```yaml
kube-apiserver-arg:
  - audit-policy-file=/etc/rancher/rke2/audit-policy.yaml
  - audit-log-path=/var/lib/rancher/rke2/server/logs/audit.log
  - audit-log-maxage=30
  - audit-log-maxbackup=10
  - audit-log-maxsize=100
```

Make sure `/etc/rancher/rke2/audit-policy.yaml` exists on the control-plane nodes, or provide it through Rancher cluster YAML.

### Agent Environment Variables

Add environment variables for the cluster agent and system agent if needed (for example, proxy settings):

```yaml
agentEnvVars:
  - name: HTTP_PROXY
    value: http://proxy.company.com:3128
  - name: HTTPS_PROXY
    value: http://proxy.company.com:3128
```

## Step 5: Register Nodes

After configuring the cluster, Rancher provides registration commands.

### Register Control Plane Nodes

Select the **etcd** and **Control Plane** roles. Rancher generates a command:

```bash
curl -fL https://rancher.yourdomain.com/system-agent-install.sh | sudo sh -s - \
  --server https://rancher.yourdomain.com \
  --label 'cattle.io/os=linux' \
  --token <TOKEN> \
  --etcd --controlplane
```

Run this on 3 nodes for high availability.

### Register Worker Nodes

Select only the **Worker** role:

```bash
curl -fL https://rancher.yourdomain.com/system-agent-install.sh | sudo sh -s - \
  --server https://rancher.yourdomain.com \
  --label 'cattle.io/os=linux' \
  --token <TOKEN> \
  --worker
```

Run this on each worker node.

Depending on your Rancher certificate setup, the generated command may also include `--ca-checksum <CHECKSUM>`.

## Step 6: Monitor Provisioning

Watch the cluster provisioning in the Rancher UI:

1. Go to your cluster
2. Monitor node registration and role assignment
3. Watch the status change from `Provisioning` to `Active`

You can also check the system-agent logs on each node:

```bash
sudo journalctl -u rancher-system-agent -f
```

And once RKE2 starts:

```bash
sudo journalctl -u rke2-server -f  # On server nodes
sudo journalctl -u rke2-agent -f   # On worker nodes
```

## Step 7: Verify the Cluster

Once the cluster is Active, get the kubeconfig from Rancher and verify:

```bash
kubectl get nodes -o wide
kubectl get pods -n kube-system
```

Expected system pods include:

- `rke2-coredns`
- `rke2-ingress-nginx` or `rke2-traefik`
- `rke2-metrics-server`
- `cloud-controller-manager` (if cloud provider is configured)
- Canal/Calico/Cilium/Flannel pods (based on CNI selection)
- Multus pods (if enabled)

## Step 8: Post-Creation Setup

### Install Monitoring

Navigate to the cluster in Rancher, go to **Apps**, and install the **Monitoring** chart for Prometheus and Grafana.

### Configure Storage

Install a CSI driver or storage provisioner appropriate for your platform. For local storage, Rancher's `local-path-provisioner` is a common option.

### Set Up Projects and RBAC

Organize namespaces into projects and configure user access through the Rancher UI.

## Troubleshooting

- **Node not registering**: Check the system-agent service with `systemctl status rancher-system-agent`. Verify network connectivity to the Rancher server.
- **RKE2 service failing**: Check `journalctl -u rke2-server` for errors. Common issues include port conflicts and SELinux policies.
- **Cluster stuck in Provisioning**: Look at the Rancher server logs and the provisioning logs in the cluster view.
- **CNI issues**: Verify that the CNI-specific ports required by your selected plugin are open between all nodes.

## Conclusion

Creating an RKE2 cluster in Rancher provides a production-ready Kubernetes distribution with minimal setup. RKE2 does not require Docker, supports CIS hardening profiles, and enables FIPS 140-2 compliance, making it a strong choice for enterprise and government environments. The Rancher UI simplifies the entire process to configuring options, running registration commands on your nodes, and waiting for the cluster to become active.
