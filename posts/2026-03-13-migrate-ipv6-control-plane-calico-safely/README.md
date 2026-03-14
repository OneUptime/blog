# Migrate IPv6 Control Plane in Calico Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPv6, Control-plane, Kubernetes, Migration, Networking, Dual-Stack

Description: Learn how to safely migrate Calico's control plane to IPv6, enabling IPv6 BGP sessions, Felix communications, and API server connectivity in a dual-stack or IPv6-only cluster.

---

## Introduction

Calico's control plane-Felix, BIRD, and Typha-can operate over IPv6, enabling clusters to use IPv6 for both pod networking and internal component communication. Migrating the control plane to IPv6 is a prerequisite for fully IPv6-native Kubernetes deployments where IPv4 is either not available or being phased out.

The control plane migration must be done in coordination with Kubernetes API server and etcd IPv6 configuration. A dual-stack intermediate state (running both IPv4 and IPv6 control plane traffic) is the safest migration path, allowing rollback if issues are discovered.

This guide covers the steps to migrate Calico's control plane components to IPv6 operation.

## Prerequisites

- Kubernetes cluster v1.21+ with IPv6 addresses on all nodes
- Calico v3.18+ installed
- Kubernetes API server accessible on IPv6 addresses
- `calicoctl` CLI configured
- All nodes have IPv6 addresses and IPv6 routing is functional between nodes

## Step 1: Verify IPv6 Readiness Across the Cluster

Before migrating Calico's control plane, confirm that all cluster components support IPv6.

```bash
# Verify nodes have IPv6 addresses
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .status.addresses[*]}{.type}={.address}{" "}{end}{"\n"}{end}'

# Test IPv6 connectivity between nodes
# Run on node 1, targeting node 2's IPv6 address
ping6 -c 5 fd00::2

# Verify the Kubernetes API server is listening on IPv6
kubectl get endpoints kubernetes -o yaml | grep -A 5 "addresses"

# Check that CoreDNS supports IPv6 responses
kubectl run dns-test --image=busybox --rm -it -- nslookup kubernetes.default.svc.cluster.local
```

## Step 2: Configure Calico to Listen on IPv6 for Typha

Typha is the Calico datastore fan-out component. Configure it to accept connections on IPv6 addresses.

```yaml
# calico-config/typha-ipv6.yaml - Configure Typha to bind on IPv6 addresses
apiVersion: v1
kind: ConfigMap
metadata:
  name: calico-config
  namespace: kube-system
data:
  # Instruct Typha to listen on all IPv6 addresses
  typha_service_name: "calico-typha"
  # Typha binds to all interfaces including IPv6
  typha_endpoint: "[::]:5473"
```

## Step 3: Enable IPv6 in FelixConfiguration

Update Felix's configuration to use IPv6 for its communications.

```yaml
# calico-config/felix-ipv6.yaml - Enable IPv6 support in Felix
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  # Enable IPv6 routing in Felix
  ipv6Support: true
  # Use IPv6 for Felix's health check endpoint if nodes have IPv6 addresses
  healthHost: "::"
  # Enable IPv6 for iptables (ip6tables)
  ipv6Enabled: true
```

```bash
# Apply the Felix configuration
calicoctl apply -f felix-ipv6.yaml
```

## Step 4: Configure BGP for IPv6 Peers

Update Calico's BGP configuration to establish IPv6 BGP sessions for pod route advertisement.

```yaml
# calico-bgp/bgp-configuration-ipv6.yaml - Enable IPv6 BGP in the global configuration
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  # Enable IPv6 BGP sessions
  serviceClusterIPs:
    - cidr: fd00:10:96::/112  # IPv6 Service CIDR
  # Advertise IPv6 pod routes
  nodeMeshEnabled: true
---
# calico-bgp/bgp-peer-ipv6.yaml - IPv6 BGP peer for upstream router
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: ipv6-upstream-router
spec:
  # IPv6 peer address of upstream router
  peerIP: "fd00:10:0::1"
  asNumber: 65000
```

## Step 5: Validate IPv6 Control Plane Operation

After applying all configuration changes, validate that Calico's control plane is operating on IPv6.

```bash
# Check Felix logs for IPv6-related messages
kubectl logs -n calico-system -l k8s-app=calico-node --since=5m | grep -i "ipv6"

# Verify IPv6 BGP sessions are established
calicoctl node status

# Confirm IPv6 routes are in the kernel routing table
ip -6 route show | grep "fd00"

# Test IPv6 pod-to-pod connectivity
kubectl run ipv6-test-1 --image=busybox -- sleep 3600
kubectl run ipv6-test-2 --image=busybox -- sleep 3600
POD2_IPV6=$(kubectl get pod ipv6-test-2 -o jsonpath='{.status.podIPs[1].ip}')
kubectl exec ipv6-test-1 -- ping6 -c 5 "$POD2_IPV6"
```

## Best Practices

- Run in dual-stack mode (both IPv4 and IPv6 control plane) initially to enable rollback
- Validate IPv6 node-to-node connectivity before enabling IPv6 in Calico's control plane
- Update monitoring and alerting tools to scrape Calico metrics over IPv6 endpoints
- Ensure all firewall rules allow ICMPv6 (Neighbor Discovery Protocol is required for IPv6 routing)
- Test DNS resolution for IPv6 addresses before fully migrating control plane traffic
- Keep IPv4 control plane active as a fallback until IPv6 operation is fully validated

## Conclusion

Migrating Calico's control plane to IPv6 is a systematic process that requires readiness validation, incremental configuration changes, and thorough testing. By enabling IPv6 in Felix, Typha, and BGP while maintaining IPv4 as a fallback, you can safely migrate to an IPv6-native Kubernetes networking configuration.
