# How to Configure Calico on OpenStack Red Hat for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Red Hat, RHEL, Networking, Configuration

Description: A guide to configuring Calico's BGP, IP pools, and Felix settings for a new Red Hat-based OpenStack deployment.

---

## Introduction

Configuring Calico for a Red Hat-based OpenStack cluster involves the same core settings as Ubuntu - IP pools, BGP configuration, and Felix tuning - but RHEL-specific considerations include disabling firewalld where possible or carefully allowing required Calico traffic, SELinux policy configuration for non-standard service ports, and compatibility with RHEL 8/9's iptables-nft backend.

RHEL 8 and 9 use nftables as the backend for iptables by default, which can conflict with Felix's iptables management. Understanding how to configure Felix to work correctly with either iptables-legacy or iptables-nft is an important step in the RHEL-specific configuration.

## Prerequisites

- Calico installed on an RHEL OpenStack cluster
- `calicoctl` installed
- firewalld disabled as recommended by Calico for OpenStack, or configured to allow the required Calico traffic
- SELinux in an appropriate state for Calico

## Step 1: Configure iptables Backend

RHEL 8+ uses the nftables-backed iptables tools by default. Felix can work with either backend, but must be configured consistently with the backend available on the host.

```bash
# Confirm the backend reported by the RHEL iptables tools.
iptables --version
ip6tables --version

# Configure Felix for the nftables-backed iptables tools.
# In /etc/calico/felix.cfg
echo "IptablesBackend = NFT" | sudo tee -a /etc/calico/felix.cfg
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

Calico for OpenStack recommends disabling firewalld where possible because it can interfere with rules added by Calico. If your RHEL deployment requires firewalld to remain enabled, allow the required Calico traffic in the appropriate zones.

```bash
# On every host that participates in Calico BGP
sudo firewall-cmd --permanent --add-port=179/tcp

# On hosts running etcd, or in the zone that protects access to etcd
sudo firewall-cmd --permanent --add-port=2379/tcp
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

Configuring Calico on RHEL-based OpenStack requires resolving the iptables backend compatibility, disabling firewalld where possible or allowing BGP and etcd traffic through it, and configuring SELinux for Felix's Prometheus port if metrics are exposed on that port. Once these RHEL-specific steps are complete, the standard Calico configuration - IP pools, BGP, Felix tuning - applies as on any other platform.
