# How to Verify Node Installation in a Hard Way Calico Cluster Before Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Node, Verification, Installation

Description: A detailed guide to verifying that Calico components are correctly installed and functioning on every node in a manually deployed cluster, covering Felix, BIRD, CNI plugin, and interface validation.

---

## Introduction

In a hard-way Calico installation, each node must have multiple components correctly configured: the Felix agent for policy enforcement, the BIRD daemon for route distribution when BGP is enabled, the CNI plugin binary and configuration, and the appropriate network interfaces. A single misconfigured node can cause intermittent connectivity issues that are difficult to diagnose.

This guide provides a node-by-node verification procedure that confirms every Calico component is properly installed and communicating with the rest of the cluster. We check binaries, configuration files, running processes, network interfaces, and route tables on each node.

Verifying at the node level is especially important for hard-way installations because there is no operator automatically reconciling the installation. Even when `calico/node` runs as a DaemonSet, manually copied CNI files and backend-specific configuration remain your responsibility.

## Prerequisites

- A Kubernetes cluster with Calico installed manually
- SSH access to all cluster nodes
- Root or sudo access on each node
- `calicoctl` installed on your workstation, and on each node if you want to run `calicoctl node` commands
- `kubectl` configured with cluster-admin access

## Verifying Calico Binaries and Configuration

SSH into each node and verify that all required binaries and configuration files are present.

```bash
#!/bin/bash
# verify-node-binaries.sh

# Run this script on each cluster node via SSH

echo "=== Calico Binary Verification ==="

# Check CNI plugin binaries
echo "CNI plugin binary:"
ls -la /opt/cni/bin/calico
ls -la /opt/cni/bin/calico-ipam

# Check CNI configuration
echo ""
echo "CNI configuration:"
ls -la /etc/cni/net.d/10-calico.conflist
cat /etc/cni/net.d/10-calico.conflist | python3 -m json.tool > /dev/null 2>&1 \
  && echo "CNI config: valid JSON" || echo "CNI config: INVALID JSON"

# Check calico-node binary (if running as a system service)
echo ""
echo "calico-node binary:"
which calico-node 2>/dev/null || echo "calico-node not in PATH (may be in container)"

# Verify Felix configuration file
echo ""
echo "Felix configuration:"
if [ -f /etc/calico/felix.cfg ]; then
  echo "Felix config file exists"
else
  echo "Felix config file not found (may use datastore config)"
fi
```

## Verifying Running Processes and Services

Check that all Calico processes are running correctly on each node.

```bash
#!/bin/bash
# verify-node-processes.sh
# Verify Calico processes on each node

echo "=== Calico Process Verification ==="

NODE_NAME=${NODE_NAME:-$(hostname | tr '[:upper:]' '[:lower:]')}

# Check if calico-node container/pod is running
echo "calico-node pod status:"
CALICO_POD=$(kubectl get pods -n kube-system -l k8s-app=calico-node \
  --field-selector spec.nodeName="${NODE_NAME}" -o name | head -1)

if [ -z "${CALICO_POD}" ]; then
  echo "No calico-node pod found on ${NODE_NAME}"
  exit 1
fi

# Check Felix process inside calico-node
echo ""
echo "Felix process:"
kubectl exec -n kube-system ${CALICO_POD} -c calico-node -- pgrep -la felix

# Check BIRD process for BGP route distribution, if BGP is enabled
echo ""
echo "BIRD process (BGP-enabled clusters only):"
kubectl exec -n kube-system ${CALICO_POD} -c calico-node -- pgrep -la bird \
  || echo "BIRD not running (expected for VXLAN-only or BGP-disabled clusters)"

# Verify Felix readiness
echo ""
echo "Felix readiness:"
kubectl exec -n kube-system ${CALICO_POD} -c calico-node -- calico-node -felix-ready
echo "Exit code: $?"

# Verify BIRD readiness, if BGP is enabled
echo ""
echo "BIRD readiness (BGP-enabled clusters only):"
kubectl exec -n kube-system ${CALICO_POD} -c calico-node -- calico-node -bird-ready
echo "Exit code: $?"
```

```mermaid
graph TD
    A[Node Verification] --> B[Binary Check]
    A --> C[Process Check]
    A --> D[Interface Check]
    A --> E[Route Check]
    B --> B1[CNI Plugin]
    B --> B2[CNI Config]
    B --> B3[Felix Config]
    C --> C1[Felix Running]
    C --> C2[BIRD Running if BGP enabled]
    C --> C3[Health Endpoints]
    D --> D1[tunl0 / vxlan.calico]
    D --> D2[cali* interfaces]
    E --> E1[Pod Routes]
    E --> E2[BGP or overlay routes]
```

## Verifying Network Interfaces and Routes

Check that Calico has created the expected network interfaces and routes on each node.

```bash
#!/bin/bash
# verify-node-networking.sh
# Verify network interfaces and routes on each node

echo "=== Network Interface Verification ==="

# Check for Calico tunnel interface (IP-in-IP mode)
echo "Tunnel interface (tunl0):"
ip link show tunl0 2>/dev/null || echo "tunl0 not found (may use VXLAN or native routing)"

# Check for VXLAN interface (VXLAN mode)
echo ""
echo "VXLAN interface:"
ip link show vxlan.calico 2>/dev/null || echo "vxlan.calico not found (may use IPIP or native routing)"

# List all Calico virtual interfaces (one per local pod)
echo ""
echo "Calico pod interfaces (cali*):"
ip link show | grep cali | wc -l
echo "interfaces found"

# Verify routes to other nodes' pod CIDRs
echo ""
echo "=== Route Table Verification ==="
echo "Routes via Calico tunnel:"
ip route show | grep -E "(tunl0|vxlan.calico)"

# Show routes to pod subnets on other nodes
echo ""
echo "Routes to remote pod subnets:"
ip route show proto bird 2>/dev/null || true
ip route show | grep -E "dev (tunl0|vxlan.calico|cali)" || true
```

## Verifying Datastore Connectivity from Each Node

Ensure each node can communicate with the Calico datastore.

```bash
# Verify datastore connectivity from calico-node pod
NODE_NAME=${NODE_NAME:-$(hostname | tr '[:upper:]' '[:lower:]')}
CALICO_POD=$(kubectl get pods -n kube-system -l k8s-app=calico-node \
  --field-selector spec.nodeName="${NODE_NAME}" -o name | head -1)

# Check calico-node logs for datastore connection
echo "=== Datastore Connectivity ==="
kubectl logs -n kube-system ${CALICO_POD} -c calico-node --tail=20 | grep -i "datastore\|syncer\|ready"

# Verify node is registered in Calico datastore
echo ""
echo "Node registration in Calico:"
calicoctl get node "${NODE_NAME}" -o yaml
```

## Verification

Run the complete node verification across all nodes:

```bash
#!/bin/bash
# verify-all-nodes.sh
# Run verification across all cluster nodes

echo "Full Cluster Node Verification"
echo "==============================="

for node in $(kubectl get nodes -o name | sed 's|node/||'); do
  echo ""
  echo "========== Node: ${node} =========="

  # Get calico-node pod for this node
  POD=$(kubectl get pods -n kube-system -l k8s-app=calico-node \
    --field-selector spec.nodeName="${node}" -o name 2>/dev/null)

  if [ -z "${POD}" ]; then
    echo "WARNING: No calico-node pod found on ${node}"
    continue
  fi

  # Felix ready check
  echo -n "Felix ready: "
  kubectl exec -n kube-system ${POD} -c calico-node -- calico-node -felix-ready 2>/dev/null \
    && echo "YES" || echo "NO"

  # BIRD ready check, if BGP is enabled
  echo -n "BIRD ready (BGP-enabled clusters only): "
  kubectl exec -n kube-system ${POD} -c calico-node -- calico-node -bird-ready 2>/dev/null \
    && echo "YES" || echo "NO/N/A"

  # Pod count on this node
  echo -n "Pods on node: "
  kubectl get pods --all-namespaces --field-selector spec.nodeName="${node}" --no-headers | wc -l
done

echo ""
echo "=== Calico Node Summary ==="
kubectl get pods -n kube-system -l k8s-app=calico-node -o wide
echo "For BGP-enabled clusters, run 'sudo calicoctl node status' directly on each node to see BGP peering state."
```

## Troubleshooting

- **CNI plugin not found**: Verify that `/opt/cni/bin/calico` and `/opt/cni/bin/calico-ipam` exist and are executable. Re-copy them from the Calico release archive if missing.
- **Felix not ready**: Check Felix logs for certificate errors or datastore connection failures. Verify that the Felix configuration points to the correct datastore endpoint.
- **BIRD not ready**: For BGP-enabled clusters, check BIRD logs inside the calico-node container. A common issue is BGP port 179 being blocked by host firewall. Verify with `ss -tlnp | grep 179`. For VXLAN-only clusters, BIRD may be disabled because Calico does not use BGP for VXLAN overlays.
- **Missing tunnel interfaces**: Verify IPPool encapsulation mode matches the expected interface (IPIP uses tunl0, VXLAN uses vxlan.calico).
- **No routes to remote pods**: In BGP-enabled clusters, check that BIRD is establishing BGP sessions with other nodes. Run `sudo calicoctl node status` directly on a node to see BGP peering state. In VXLAN clusters, verify the `vxlan.calico` interface and that UDP 4789 is allowed between nodes.

## Conclusion

Node-level verification is the foundation of a reliable hard-way Calico installation. By checking binaries, processes, interfaces, routes, and datastore connectivity on every node, you catch issues that cluster-level checks might miss. Automate these checks as part of your node provisioning pipeline and run them after any node maintenance or Calico upgrade.
