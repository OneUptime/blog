# How to Troubleshoot Installation Issues with Calico on OpenStack Red Hat

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Red Hat, RHEL, Networking, Troubleshooting

Description: A diagnostic guide for resolving Calico installation and networking failures on Red Hat-based OpenStack deployments.

---

## Introduction

Troubleshooting Calico on RHEL OpenStack requires checking SELinux, firewalld, iptables backend compatibility, and etcd connectivity in addition to the standard Calico diagnostics. RHEL's layered security model means that a correctly installed and configured Calico can still fail silently if SELinux policies or firewall rules are blocking its operations.

The diagnostic sequence prioritizes SELinux checks first because SELinux denials can be easy to miss - Calico appears to be running but cannot manage network rules.

## Prerequisites

- Calico partially installed on RHEL OpenStack
- Root access to controller and compute nodes

## Step 1: Check SELinux Audit Log

```bash
sudo ausearch -m AVC,USER_AVC -ts recent | grep -iE "felix|calico|iptables|etcd" | head -20
```

If relevant denials are present, they may indicate the root cause. Generate an allow policy only after confirming the denied access is expected for Calico:

```bash
sudo ausearch -m AVC -ts recent | audit2allow -M calico-local
sudo semodule -i calico-local.pp
```

Or set SELinux to permissive mode temporarily for diagnosis:

```bash
sudo setenforce 0  # Temporarily - revert after diagnosis
```

## Step 2: Check firewalld Rules

Calico recommends disabling firewalld or other host firewall managers because they can interfere with rules added by Calico. If your deployment requires firewalld to remain enabled, verify the required Calico traffic:

```bash
sudo firewall-cmd --list-all
sudo firewall-cmd --query-port=179/tcp
sudo firewall-cmd --query-port=2379/tcp
sudo firewall-cmd --query-protocol=ipencap  # Required if IP-in-IP is enabled
```

If required ports or protocols are not open:

```bash
sudo firewall-cmd --permanent --add-port=179/tcp
sudo firewall-cmd --permanent --add-port=2379/tcp
sudo firewall-cmd --permanent --add-protocol=ipencap  # Required if IP-in-IP is enabled
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
ETCDCTL_API=3 etcdctl --endpoints=http://<controller-ip>:2379 get /calico --prefix --keys-only
```

## Step 5: Read Felix Logs

```bash
sudo journalctl -u calico-felix -n 100 --no-pager | grep -iE "error|fatal|warn"
sudo tail -f /var/log/calico/felix.log | grep -iE "error|fatal"
```

## Step 6: Check Neutron Plugin Logs

```bash
sudo journalctl -u neutron-server --since "30 minutes ago" | grep -iE "calico|error"
```

## Conclusion

Troubleshooting Calico on RHEL OpenStack prioritizes SELinux audit log checking above all else, followed by firewalld verification when firewalld is enabled, iptables backend compatibility, and etcd connectivity. The RHEL-specific security layers (SELinux and firewalld) can cause Calico failures on this platform that do not occur on Ubuntu, making them important diagnostic stops.
