# Execute CNI Chaining with Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, CNI Chaining, Migration, eBPF

Description: Understand CNI chaining with Cilium - what it is, when to use it, and how to configure Cilium as a secondary CNI plugin on top of any primary CNI for enhanced network policy enforcement and...

---

## Introduction

CNI (Container Network Interface) chaining allows multiple CNI plugins to run in sequence when a pod is created. The primary CNI handles IP allocation and basic network connectivity; secondary plugins add capabilities on top of that foundation. Cilium's chaining mode makes it a secondary plugin, adding eBPF-based policy enforcement and observability without replacing the existing CNI.

This pattern is particularly useful for teams that want to adopt Cilium's advanced features incrementally-without the risk and operational overhead of a full CNI migration. It is also a common option for managed Kubernetes services where the primary CNI is managed by the cloud provider.

## Prerequisites

- Kubernetes cluster with an existing CNI (AWS VPC CNI, Azure CNI, Calico, Flannel, etc.)
- Linux kernel 5.10+ on all nodes, or an equivalent distribution kernel such as RHEL 8.10's 4.18 kernel
- `kubectl`, `cilium`, and `helm` CLIs installed

## Understanding the CNI Chain Architecture

```mermaid
flowchart LR
    A[Pod Creation] --> B[Primary CNI\nIP Allocation &\nBasic Connectivity]
    B --> C[Cilium CNI\neBPF Policy\nEnforcement & Observability]
    C --> D[Pod Running\nwith VPC/Native IP]
```

When a pod starts, the kubelet calls the CNI chain sequentially:
1. The primary CNI allocates an IP and sets up the veth pair.
2. Cilium's CNI plugin attaches eBPF programs to the pod's network interface for policy enforcement.

## Step 1: Check Kernel Version on Nodes

```bash
# Verify all nodes meet Cilium's kernel requirements

kubectl get nodes -o custom-columns='NAME:.metadata.name,KERNEL:.status.nodeInfo.kernelVersion'
```

## Step 2: Identify Your Primary CNI

Identify the existing CNI conflist file to understand the chaining setup.

```bash
# Check the CNI configuration directory on a node
kubectl debug node/<node-name> -it --image=ubuntu -- ls /host/etc/cni/net.d/

# Read the primary CNI configuration
kubectl debug node/<node-name> -it --image=ubuntu -- cat /host/etc/cni/net.d/10-*.conf*
```

## Step 3: Install Cilium in Generic Chaining Mode

The generic chaining mode works with any primary CNI that creates a standard veth pair. Create a CNI ConfigMap by copying your primary CNI plugin configuration into the first plugin entry and appending the Cilium plugin.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cni-configuration
  namespace: kube-system
data:
  cni-config: |-
    {
      "name": "generic-veth",
      "cniVersion": "0.3.1",
      "plugins": [
        {
          "type": "<primary-cni-type>"
        },
        {
          "type": "cilium-cni",
          "chaining-mode": "generic-veth"
        }
      ]
    }
```

```bash
# Apply the CNI chaining configuration
kubectl apply -f chaining.yaml

# Add the Cilium Helm repository
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install Cilium in generic-veth chaining mode
helm install cilium cilium/cilium \
  --version 1.19.3 \
  --namespace kube-system \
  --set cni.chainingMode=generic-veth \
  --set cni.customConf=true \
  --set cni.configMap=cni-configuration \
  --set routingMode=native \
  --set enableIPv4Masquerade=false
```

## Step 4: Verify the Chain

```bash
# Confirm Cilium pods are running on all nodes
kubectl get pods -n kube-system -l k8s-app=cilium

# Check Cilium status
cilium status --wait

# Verify the CNI conflist shows both plugins
# The primary CNI conflist should now include a Cilium entry
kubectl debug node/<node-name> -it --image=ubuntu -- \
  cat /host/etc/cni/net.d/05-cilium.conflist
```

## Step 5: Validate with a CiliumNetworkPolicy

Test that Cilium's policy enforcement works on top of the primary CNI.

```yaml
# Test policy: only allow TCP/80 from labeled pods
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: test-chaining-policy
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      app: test-server
  ingress:
    - fromEndpoints:
        - matchLabels:
            role: allowed-client
      toPorts:
        - ports:
            - port: "80"
              protocol: TCP
```

```bash
# Apply and check policy status
kubectl apply -f test-chaining-policy.yaml
cilium endpoint list
cilium policy get
```

## CNI-Specific Chaining Modes

Different primary CNIs have dedicated Cilium chaining modes:

| Primary CNI | Cilium chaining mode |
|---|---|
| AWS VPC CNI | `aws-cni` |
| Azure CNI | `generic-veth` |
| Calico | `generic-veth` |
| Flannel | `flannel` |
| Generic (veth-based) | `generic-veth` |
| Portmap | `portmap` |

## Best Practices

- Use CNI chaining as a transitional step, not a permanent state; a single CNI with full eBPF datapath performs better.
- Set `cni.exclusive=false` when Cilium is modifying an existing primary CNI configuration, or use `cni.customConf=true` with a CNI ConfigMap when you provide the full chained configuration yourself.
- Test with `cilium connectivity test` after installation before applying production network policies.
- Use the CNI-specific chaining mode (`aws-cni`, `flannel`) when available; otherwise use the documented `generic-veth` setup for veth-based CNIs.
- Monitor the `cilium_drop_count_total` metric to detect policy denials introduced by the new chain.

## Conclusion

CNI chaining with Cilium provides a pragmatic, low-risk path to adopting eBPF-based network security on clusters running any primary CNI. By chaining rather than replacing, you can validate Cilium policies and Hubble observability in production before committing to a full CNI migration.
