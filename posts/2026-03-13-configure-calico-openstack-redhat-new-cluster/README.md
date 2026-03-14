# How to Configure Calico on OpenStack Red Hat for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Red Hat, RHEL, Networking, Configuration

Description: A guide to configuring Calico's BGP, IP pools, and Felix settings for a new Red Hat-based OpenStack deployment.

---

## Introduction

Configuring Calico for a Red Hat-based OpenStack cluster involves the same core settings as Ubuntu — IP pools, BGP configuration, and Felix tuning — but RHEL-specific considerations include firewalld management for BGP port access, SELinux policy configuration for Felix's iptables operations, and compatibility with RHEL 8/9's iptables-nft backend.

RHEL 8 and 9 use nftables as the backend for iptables by default, which can conflict with Felix's iptables management. Understanding how to configure Felix to work correctly with either iptables-legacy or iptables-nft is an important step in the RHEL-specific configuration.

## Prerequisites

- Calico installed on an RHEL OpenStack cluster
- `calicoctl` installed
- firewalld and SELinux in appropriate states for Calico

## Step 1: Configure iptables Backend

RHEL 8+ uses iptables-nft. Felix can work with either backend, but must be configured consistently.

```bash
# Option 1: Use iptables-legacy
sudo alternatives --set iptables /usr/sbin/iptables-legacy
sudo alternatives --set ip6tables /usr/sbin/ip6tables-legacy

# Option 2: Configure Felix for iptables-nft
# In /etc/calico/felix.cfg
echo "IptablesBackend = nft" | sudo tee -a /etc/calico/felix.cfg
```

## Step 2: Configure Tenant IP Pool

```bash
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: openstack-redhat-pool
spec:
  cidr: 10.66.0.0/16
  blockSize: 24
  natOutgoing: true
  disabled: false
EOF
```

## Step 3: Configure BGP

```bash
cat <<EOF | calicoctl apply -f -
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Warning
  nodeToNodeMeshEnabled: true
  asNumber: 64512
EOF
```

## Step 4: Configure firewalld for BGP

```bash
# On all compute nodes
sudo firewall-cmd --permanent --add-port=179/tcp
sudo firewall-cmd --permanent --add-port=2379/tcp  # etcd client port
sudo firewall-cmd --reload
```

## Step 5: Configure SELinux for Felix Prometheus Port

```bash
sudo semanage port -a -t http_port_t -p tcp 9091
sudo firewall-cmd --permanent --add-port=9091/tcp
sudo firewall-cmd --reload
```

## Step 6: Verify Configuration

```bash
calicoctl get ippool -o wide
calicoctl node status
sudo systemctl status calico-felix
sudo journalctl -u calico-felix --since "5 minutes ago" | grep -iE "error|warn"
```

## Conclusion

Configuring Calico on RHEL-based OpenStack requires resolving the iptables backend compatibility (legacy vs nft), opening BGP and etcd ports through firewalld, and configuring SELinux for Felix's Prometheus port. Once these RHEL-specific steps are complete, the standard Calico configuration — IP pools, BGP, Felix tuning — applies as on any other platform.
