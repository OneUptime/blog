# Test IPv6 Control Plane with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPv6, Control-plane, Kubernetes, Networking, Testing

Description: Validate Calico's IPv6 control plane components, including BGP peering over IPv6, Felix configuration for IPv6, and network policy enforcement on IPv6 traffic.

---

## Introduction

Running Kubernetes and Calico over IPv6 (or in dual-stack mode with an IPv6 control plane) introduces a set of unique validation requirements beyond standard IPv4 testing. The control plane components - the Kubernetes API server, etcd, Calico Felix, and the BGP router daemon BIRD - must all be configured to use IPv6 addresses for communication, and each component has its own IPv6-specific configuration.

Testing the IPv6 control plane before production catches issues specific to IPv6 operation: BIRD not binding to IPv6 interfaces, Felix choosing wrong IPv6 addresses for tunnel endpoints, or network policies not correctly handling IPv6 source and destination addresses. These issues are invisible in IPv4-only testing but can cause complete cluster failure in IPv6 deployments.

This guide covers validating each component of Calico's IPv6 control plane and testing end-to-end IPv6 packet flow with network policy enforcement.

## Prerequisites

- Kubernetes cluster with IPv6-only or dual-stack configuration
- Calico v3.23+ with IPv6 support enabled
- Nodes with IPv6 addresses configured on their primary interfaces
- `calicoctl` CLI installed
- `ping6`, `curl`, and network diagnostic tools available on nodes

## Step 1: Validate Calico Node IPv6 Configuration

Confirm that each Calico node has correctly detected its IPv6 address.

```bash
# Check IPv6 addresses Calico has detected for each node
calicoctl get nodes -o yaml | grep -A5 "ipv6"

# Verify the IPv6 BGP address assigned to each node
calicoctl get nodes -o json | jq -r '.items[] |
  "\(.metadata.name): IPv6=\(.spec.bgp.ipv6Address)"'

# Check that the IP autodetection method works for IPv6
# Calico should detect the primary IPv6 interface address
kubectl get node -o jsonpath='{.items[*].status.addresses}' | \
  python3 -c "
import sys, json
addresses = json.loads(input())
for addr in addresses:
    if ':' in addr.get('address', ''):
        print(f'IPv6: {addr[\"address\"]}')
"
```

```yaml
# felixconfig-ipv6.yaml - Configure Felix for IPv6 control plane operation
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  # Enable IPv6 interface detection and routing
  ipv6Support: true
  # IPv6 autodetection method for node IP selection
  ipv6AutodetectionMethod: "first-found"
  # Enable WireGuard for IPv6 inter-node encryption (optional)
  wireguardEnabledV6: false
```

## Step 2: Test IPv6 BGP Peering

Validate that Calico establishes BGP sessions over IPv6.

```yaml
# bgp-peer-ipv6.yaml - Configure BGP peer using IPv6 address
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: router-ipv6-peer
spec:
  # IPv6 address of the BGP peer router
  peerIP: "2001:db8:1::1"
  asNumber: 65001
  # Apply to all nodes that have IPv6 addresses
  nodeSelector: all()
```

```bash
# Apply IPv6 BGP peer configuration
calicoctl apply -f bgp-peer-ipv6.yaml

# Check BGP session status for IPv6 peers
calicoctl node status

# Verify BIRD6 (IPv6 BGP daemon) is running on nodes
kubectl exec -n calico-system \
  $(kubectl get pods -n calico-system -l k8s-app=calico-node -o name | head -1) \
  -- birdc6 show protocols

# Check IPv6 routes are being advertised
kubectl exec -n calico-system \
  $(kubectl get pods -n calico-system -l k8s-app=calico-node -o name | head -1) \
  -- birdc6 show route
```

## Step 3: Test IPv6 Network Policy Enforcement

Verify that Calico network policies correctly enforce rules on IPv6 traffic.

```yaml
# ipv6-network-policy.yaml - Network policy applied to IPv6 traffic
# Calico automatically applies the same policy to IPv6 and IPv4 traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ipv6-web-traffic
  namespace: test
spec:
  podSelector:
    matchLabels:
      app: web-server
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          role: client
    ports:
    - protocol: TCP
      port: 80
```

```bash
# Apply the policy
kubectl apply -f ipv6-network-policy.yaml

# Get IPv6 addresses of test pods
SERVER_IPV6=$(kubectl get pod web-server -n test \
  -o jsonpath='{.status.podIPs[?(@.ip=~"::")].ip}')
echo "Server IPv6: $SERVER_IPV6"

# Test allowed client can reach server via IPv6
kubectl exec -n test allowed-client -- \
  curl --max-time 5 "http://[$SERVER_IPV6]/"
# Expected: HTTP 200

# Test denied client is blocked on IPv6
kubectl exec -n test denied-client -- \
  curl --max-time 5 "http://[$SERVER_IPV6]/"
# Expected: connection timeout
```

## Step 4: Validate IPv6 DNS Resolution

Test that CoreDNS resolves AAAA records correctly for IPv6 connectivity.

```bash
# Test IPv6 DNS resolution from a pod
kubectl run ipv6-dns-test \
  --image=nicolaka/netshoot \
  --rm -it \
  -- sh -c "
    echo '=== Testing AAAA record resolution ==='
    dig kubernetes.default.svc.cluster.local AAAA

    echo '=== Testing IPv6 service reachability via DNS ==='
    # Test connecting to a service using IPv6 address from DNS
    SVC_IPV6=\$(dig +short AAAA web-server.test.svc.cluster.local)
    echo 'Service IPv6: '\$SVC_IPV6

    echo '=== Testing external IPv6 DNS resolution ==='
    dig google.com AAAA
  "
```

## Best Practices

- Verify that all cluster infrastructure components (API server, etcd, load balancers) support IPv6 before enabling it in Calico
- Use `calicoctl node status` to confirm BIRD6 sessions are Established, not just configured
- Test network policy enforcement explicitly against IPv6 source and destination addresses since some tools default to IPv4 testing
- Monitor IPv6-specific metrics in Calico (Felix IPv6 packet counts) separately from IPv4
- Validate DNS AAAA record resolution before assuming IPv6 connectivity - missing AAAA records cause IPv6-preferred clients to fall back to IPv4
- Test IPv6 control plane components after each Kubernetes or Calico upgrade since IPv6 support can regress between versions

## Conclusion

Validating Calico's IPv6 control plane before production deployment ensures that all components - BGP daemons, Felix, IPAM, and network policy enforcement - operate correctly with IPv6 traffic. By systematically testing each control plane component and end-to-end traffic flow, you build confidence that your IPv6 deployment will behave reliably when production workloads depend on it.
