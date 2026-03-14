# How to Troubleshoot Installation Issues with Calico with Binary Management on Bare Metal

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Binary Management, Troubleshooting

Description: A guide to diagnosing and fixing Calico installation issues in binary-managed deployments on bare metal Kubernetes nodes.

---

## Introduction

When Calico is installed and managed by Ansible or another configuration management tool on bare metal, troubleshooting requires checking both the configuration management layer and the underlying Calico processes. An Ansible playbook may report success even when the resulting configuration has a subtle error that only manifests during runtime. Similarly, a correctly installed binary may fail due to an environment variable misconfiguration in the service unit.

The diagnostic workflow for binary-managed Calico combines Ansible ad-hoc commands for fleet-wide checks with node-level OS diagnostics for deep investigation of specific failures.

This guide covers the most common installation issues in binary-managed Calico on bare metal.

## Prerequisites

- Calico binary installation managed by Ansible on bare metal
- Ansible control node with SSH access
- `kubectl` and `calicoctl` installed

## Step 1: Run Fleet-Wide Health Check

Use Ansible to check service state across all nodes simultaneously.

```bash
ansible all -i inventory.ini -m shell \
  -a "systemctl status calico-node --no-pager | head -20"
```

Identify which nodes are failing and focus investigation on those.

## Step 2: Check for Idempotency Issues in Ansible

Re-run the installation playbook with verbose output to see what changed.

```bash
ansible-playbook -i inventory.ini install-calico.yml -vv --check
```

If the playbook shows unexpected changes, the current state on nodes has drifted from the desired state.

## Step 3: Inspect Service Logs on Failing Nodes

```bash
ansible failing-nodes -i inventory.ini -m shell \
  -a "journalctl -u calico-node -n 50 --no-pager"
```

Common errors:
- `failed to read kubeconfig` — kubeconfig path in service unit is wrong
- `failed to connect to datastore` — network connectivity to API server
- `address already in use` — port conflict with another process

## Step 4: Verify Templated Configuration

Check that Ansible templates produced valid output on the nodes.

```bash
ansible all -i inventory.ini -m shell \
  -a "cat /etc/systemd/system/calico-node.service"

ansible all -i inventory.ini -m shell \
  -a "python3 -m json.tool /etc/cni/net.d/10-calico.conflist"
```

## Step 5: Check Binary Integrity

Verify that binaries were not corrupted during download.

```bash
ansible all -i inventory.ini -m shell \
  -a "file /usr/local/bin/calico-node && /usr/local/bin/calico-node --version 2>&1 || echo FAILED"
```

## Step 6: Re-apply Configuration on Failing Nodes

Target the failing nodes specifically.

```bash
ansible failing-nodes -i inventory.ini -m shell \
  -a "systemctl daemon-reload && systemctl restart calico-node && systemctl status calico-node"
```

## Conclusion

Troubleshooting binary-managed Calico on bare metal combines Ansible fleet-wide commands for rapid identification of failing nodes with node-level journalctl and file inspection for root cause analysis. The configuration management layer adds the ability to re-apply configuration idempotently across all affected nodes once the root cause is identified and the playbook is corrected.
