# How to Troubleshoot Installation Issues with Calico on Bare Metal with Binaries

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Binaries, Troubleshooting

Description: A diagnostic guide for identifying and fixing common Calico binary installation failures on bare metal Kubernetes nodes.

---

## Introduction

Binary-installed Calico on bare metal has a different set of failure modes than container-based deployments. The calico-node process runs directly on the host, which means OS-level issues - missing library dependencies, incorrect file permissions, and systemd configuration errors - become the primary troubleshooting surface. The Kubernetes API still provides information about workload endpoint state, but the root causes live in the OS.

Understanding how to move between `journalctl`, `systemctl`, and `calicoctl` to triangulate issues is the core skill for troubleshooting binary-installed Calico. This guide walks through the most common failures and their resolutions.

## Prerequisites

- Calico binary installation attempted on bare metal nodes
- Root access to all nodes
- `kubectl` and `calicoctl` available

## Step 1: Check calico-node Service Status

```bash
sudo systemctl status calico-node
sudo journalctl -u calico-node -n 100 --no-pager
```

Common errors in the log:
- `exec format error` - wrong binary architecture (use `amd64` vs `arm64`)
- `permission denied on /opt/cni/bin` - CNI directory permissions issue
- `connection refused` - cannot reach the Kubernetes API

## Step 2: Verify Binary Architecture and Permissions

```bash
file /usr/local/bin/calico-node
file /opt/cni/bin/calico
ls -la /usr/local/bin/calico-node /opt/cni/bin/calico /opt/cni/bin/calico-ipam
```

If permissions are wrong:

```bash
sudo chmod 755 /usr/local/bin/calico-node
sudo chmod 755 /opt/cni/bin/calico /opt/cni/bin/calico-ipam
```

## Step 3: Verify Kubernetes API Connectivity

The calico-node binary needs to reach the Kubernetes API to read node information.

```bash
# Check the kubeconfig path in the service unit
cat /etc/systemd/system/calico-node.service | grep KUBECONFIG
kubectl --kubeconfig /etc/kubernetes/admin.conf get nodes
```

## Step 4: Check CNI Configuration Syntax

```bash
cat /etc/cni/net.d/10-calico.conflist | python3 -m json.tool
```

Invalid JSON causes every pod creation to fail silently with a CNI error.

## Step 5: Inspect CNI Execution Logs

The CNI plugin writes to a log file when it executes.

```bash
ls /var/log/calico/cni/
tail -50 /var/log/calico/cni/cni.log
```

## Step 6: Check Datastore Connectivity

If calico-node cannot write to the Kubernetes datastore, IPAM fails.

```bash
KUBECONFIG=/etc/kubernetes/admin.conf calicoctl get nodes
KUBECONFIG=/etc/kubernetes/admin.conf calicoctl ipam show
```

If these fail, the issue is Kubernetes API authentication or RBAC permissions for the calico-node service account.

## Conclusion

Troubleshooting binary-installed Calico on bare metal centers on systemd service logs, binary architecture and permission verification, Kubernetes API connectivity, CNI configuration JSON validity, and CNI execution logs. These OS-level checks differ from container-based troubleshooting but provide equally direct insight into failure root causes.
