# How to Troubleshoot Installation Issues with Calico on OpenStack Red Hat

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Red Hat, RHEL, Networking, Troubleshooting

Description: A diagnostic guide for resolving Calico installation and networking failures on Red Hat-based OpenStack deployments.

---

## Introduction

Troubleshooting Calico on RHEL OpenStack requires checking SELinux, firewalld, iptables backend compatibility, and etcd connectivity in addition to the standard Calico diagnostics. RHEL's layered security model means that a correctly installed and configured Calico can still fail silently if SELinux policies or firewall rules are blocking its operations.

The diagnostic sequence prioritizes SELinux checks first because SELinux failures are silent by default - Calico appears to be running but cannot manage network rules.

## Prerequisites

- Calico partially installed on RHEL OpenStack
- Root access to controller and compute nodes

## Step 1: Check SELinux Audit Log

```bash
sudo ausearch -m AVC,USER_AVC -ts recent | grep -iE "felix|calico|iptables|etcd" | head -20
```

If denials are present, they indicate the root cause. Generate an allow policy:

```bash
sudo ausearch -m AVC -ts recent | audit2allow -M calico-local
sudo semodule -i calico-local.pp
```

Or set Felix to permissive mode temporarily for diagnosis:

```bash
sudo setenforce 0  # Temporarily - revert after diagnosis
```

## Step 2: Check firewalld Rules

```bash
sudo firewall-cmd --list-all
sudo firewall-cmd --query-port=179/tcp
sudo firewall-cmd --query-port=2379/tcp
```

If ports are not open:

```bash
sudo firewall-cmd --permanent --add-port=179/tcp
sudo firewall-cmd --permanent --add-port=2379/tcp
sudo firewall-cmd --reload
```

## Step 3: Check iptables Backend

```bash
# Identify which backend is active
sudo iptables --version
# iptables v1.8.x (legacy) or iptables v1.8.x (nf_tables)
```

If the backend doesn't match Felix's configuration:

```bash
# Switch to legacy iptables
sudo alternatives --set iptables /usr/sbin/iptables-legacy
# Or configure Felix for nft
sudo crudini --set /etc/calico/felix.cfg global IptablesBackend nft
sudo systemctl restart calico-felix
```

## Step 4: Check etcd Connectivity

```bash
ETCDCTL_API=3 etcdctl --endpoints=http://<controller-ip>:2379 endpoint health
ETCDCTL_API=3 etcdctl --endpoints=http://<controller-ip>:2379 ls /calico
```

## Step 5: Read Felix Logs

```bash
sudo journalctl -u calico-felix -n 100 --no-pager | grep -iE "error|fatal|warn"
sudo tail -f /var/log/calico/felix.log | grep -iE "error|fatal"
```

## Step 6: Check Neutron Plugin Logs

```bash
sudo journalctl -u openstack-neutron --since "30 minutes ago" | grep -iE "calico|error"
```

## Conclusion

Troubleshooting Calico on RHEL OpenStack prioritizes SELinux audit log checking above all else, followed by firewalld port verification, iptables backend compatibility, and etcd connectivity. The RHEL-specific security layers (SELinux and firewalld) account for the majority of Calico failures on this platform that do not occur on Ubuntu, making them the first diagnostic stops.
