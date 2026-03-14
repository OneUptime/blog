# How to Troubleshoot Installation Issues with Calico on On-Prem Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, On-Premise, Troubleshooting

Description: A diagnostic guide for identifying and resolving common Calico installation failures on on-premises Kubernetes clusters.

---

## Introduction

On-premises Kubernetes clusters present unique troubleshooting challenges for Calico installations. Physical network misconfigurations, firewall rules blocking BGP port 179, incorrect IP auto-detection on multi-homed servers, and mismatched pod CIDR values can all prevent Calico from starting correctly. Unlike cloud environments, there is no managed network layer to fall back on - every failure must be traced to a specific configuration or connectivity issue.

Calico's diagnostic surface is broad: the Tigera Operator, the `calico-node` DaemonSet, the `calico-kube-controllers` Deployment, and the CNI plugin binary each have their own logs and failure modes. Knowing which layer is failing tells you which logs to read.

This guide walks through the most common on-prem Calico installation failures and how to resolve them.

## Prerequisites

- Calico partially or fully installed on an on-prem Kubernetes cluster
- Cluster admin `kubectl` access
- SSH access to worker nodes
- `calicoctl` installed

## Step 1: Check Operator and Calico Pod Health

```bash
kubectl get pods -n tigera-operator
kubectl get pods -n calico-system
kubectl get tigerastatus
```

Look for pods stuck in `Pending`, `CrashLoopBackOff`, or `Init:Error`.

## Step 2: Read Component Logs

```bash
# Tigera Operator logs
kubectl logs -n tigera-operator deploy/tigera-operator --tail=50

# calico-node logs on a specific node
kubectl logs -n calico-system -l k8s-app=calico-node --tail=50
```

## Step 3: Diagnose IP Auto-Detection Failures

On multi-homed servers with management, storage, and production interfaces, Calico may select the wrong IP.

```bash
kubectl logs -n calico-system -l k8s-app=calico-node | grep "IP address"
```

Fix by setting the auto-detection method explicitly:

```bash
kubectl patch ds calico-node -n calico-system --type merge \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"calico-node","env":[{"name":"IP_AUTODETECTION_METHOD","value":"interface=bond0"}]}]}}}}'
```

## Step 4: Diagnose BGP Failures

```bash
calicoctl node status
```

If BGP sessions show `Idle` or `Active` but not `Established`:

1. Check TCP port 179 is open between nodes
2. Verify AS numbers match between BGP configuration and peers
3. Check physical router BGP configuration

```bash
# Test BGP port reachability from one node to another
nc -zv <peer-node-ip> 179
```

## Step 5: Check IPAM and CNI Config

```bash
calicoctl ipam show
ls -la /etc/cni/net.d/
cat /etc/cni/net.d/10-calico.conflist
ls -la /opt/cni/bin/calico
```

If the CNI binary is missing, the Calico node pod has not completed initialization. Check its logs for download or permission errors.

## Step 6: Validate Node CIDR Overlap

Ensure the pod CIDR does not overlap with your node or service CIDRs.

```bash
kubectl cluster-info dump | grep -E "cluster-cidr|service-cidr"
kubectl get node -o jsonpath='{.items[*].spec.podCIDR}'
```

## Conclusion

Troubleshooting Calico on on-prem Kubernetes means working through the Tigera Operator, calico-node DaemonSet, BGP sessions, IPAM, and CNI configuration in sequence. The most common root causes are incorrect IP auto-detection on multi-homed nodes, firewall rules blocking BGP, and mismatched pod CIDR configuration. Addressing each in turn resolves the vast majority of installation failures.
