# Troubleshoot IPv6 Control Plane in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPv6, Kubernetes, Control Plane, Networking, Troubleshooting

Description: A guide to diagnosing and resolving IPv6 control plane issues in Calico, covering BGP IPv6 peering, etcd IPv6 connectivity, and Kubernetes API server IPv6 communication.

---

## Introduction

Running Calico's control plane over IPv6 introduces specific challenges beyond the standard IPv6 data plane configuration. The control plane includes Calico's connectivity to the Kubernetes API server, etcd (when using etcd backend), and BGP sessions between nodes — all of which must function correctly over IPv6 for the cluster to operate.

IPv6 control plane issues often manifest as BGP sessions failing to establish, Calico nodes unable to sync policies from the API server, or Felix (Calico's policy agent) reporting connectivity failures to the Typha proxy. These failures can be difficult to diagnose because IPv4 control plane connectivity may still work, giving a false sense of cluster health.

This guide covers the key diagnostic steps for IPv6 control plane issues in Calico.

## Prerequisites

- `calicoctl` CLI installed
- `kubectl` access to the cluster
- IPv6 enabled on all control plane and worker nodes
- Calico configured for IPv6 operation

## Step 1: Verify IPv6 Connectivity to the Kubernetes API Server

Calico's Felix agent must be able to reach the Kubernetes API server. In an IPv6-only cluster, this requires the API server to listen on an IPv6 address and the node to have a route to it.

Test API server IPv6 connectivity:

```bash
# Get the API server IPv6 address from the Calico node logs
kubectl -n calico-system logs -l app=calico-node -c calico-node | grep "api-server\|apiserver"

# From a node, test connectivity to the API server IPv6 address
APISERVER_IP=$(kubectl get svc kubernetes -o jsonpath='{.spec.clusterIP}')
echo "API Server IP: $APISERVER_IP"

# Test reachability from a calico-node pod
NODE_POD=$(kubectl -n calico-system get pods -l app=calico-node -o name | head -1)
kubectl -n calico-system exec -it $NODE_POD -- \
  curl -k -6 https://[$APISERVER_IP]:6443/healthz
```

## Step 2: Check BGP IPv6 Session Status

Calico uses BIRD for BGP. For IPv6 routing, BIRD6 handles the IPv6 address family. BGP sessions must be established in both IPv4 and IPv6 (for dual-stack) or IPv6 only (for IPv6-only deployments).

Inspect BGP IPv6 session state:

```bash
# Check BIRD6 protocol status for IPv6 BGP sessions
NODE_POD=$(kubectl -n calico-system get pods -l app=calico-node -o name | head -1)
kubectl -n calico-system exec -it $NODE_POD -- birdcl6 show protocols

# List IPv6 BGP peers configured in Calico
calicoctl get bgppeer -o yaml | grep -A5 "peerIP" | grep ":"

# Check the Calico node configuration for IPv6 BGP settings
calicoctl get node <node-name> -o yaml | grep -A10 "bgp:"
```

## Step 3: Diagnose Felix-to-Typha IPv6 Connectivity

When Typha is deployed for large clusters, Felix connects to Typha over the cluster network. If this connection fails in an IPv6 environment, Felix cannot sync network policies.

Verify Typha is accessible over IPv6:

```bash
# Get Typha pod and its IPv6 address
kubectl -n calico-system get pods -l app=calico-typha -o wide

# Check Felix logs for connection errors to Typha
kubectl -n calico-system logs -l app=calico-node -c calico-node | grep -i "typha\|connection"

# Verify Typha service IPv6 endpoint
kubectl -n calico-system get endpoints calico-typha -o yaml
```

Update Calico configuration to use IPv6 for Typha connections:

```yaml
# calico-config-ipv6.yaml — Configure Calico to use IPv6 for Typha and Felix communication
# Apply using: kubectl apply -f calico-config-ipv6.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: calico-config
  namespace: calico-system
data:
  # Set the Typha service name for Felix to use for IPv6 communication
  typha_service_name: "calico-typha"
  # Configure Felix to prefer IPv6 for Typha connections
  felix_ipv6_support: "true"
```

## Step 4: Validate IPv6 Route Distribution via BGP

After confirming control plane connectivity, verify that IPv6 pod routes are being distributed correctly to all nodes.

Check IPv6 route propagation:

```bash
# View the IPv6 routing table on a node
kubectl -n calico-system exec -it $NODE_POD -- ip -6 route show

# Verify that other nodes' pod subnets appear in the IPv6 route table
kubectl -n calico-system exec -it $NODE_POD -- birdcl6 show route | head -30

# Test IPv6 pod-to-pod connectivity across nodes
kubectl run ipv6-test --image=nicolaka/netshoot --restart=Never -- sleep 300
kubectl exec ipv6-test -- ping6 -c 3 <pod-ipv6-address-on-other-node>
kubectl delete pod ipv6-test
```

## Best Practices

- Enable `felix_ipv6_support` in the Calico ConfigMap when operating in IPv6-only mode
- Ensure all nodes have their IPv6 addresses configured before starting the calico-node DaemonSet
- Use Link-Local Addresses (LLAs) for BGP peering on point-to-point links to simplify routing
- Configure `BGPPeer` resources with explicit IPv6 addresses rather than relying on autodetection in complex topologies
- Monitor both BIRD and BIRD6 BGP session metrics for dual-stack clusters

## Conclusion

IPv6 control plane issues in Calico require verifying connectivity at each level: API server reachability, BGP IPv6 session state, Felix-to-Typha communication, and IPv6 route distribution. Most failures trace back to missing IPv6 routes on nodes, firewalls blocking IPv6 traffic on control plane ports, or Calico not being explicitly configured for IPv6 operation. Systematic validation of each layer quickly identifies the specific gap.
