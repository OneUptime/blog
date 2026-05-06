# How to Configure Calico for IPv6 in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Calico, IPv6, Kubernetes, CNI, BGP, NetworkPolicy, Dual-Stack

Description: Configure Calico CNI for IPv6 and dual-stack Kubernetes clusters, including BGP-based routing, IPPool configuration, and NetworkPolicy for IPv6.

## Introduction

Calico is a popular CNI for Kubernetes that supports BGP-based pod routing. It has strong IPv6 support including IPv6 IPPools, BGP peering, and dual-stack networking. Calico's network policies work natively with IPv6 addresses.
For dual-stack clusters, Kubernetes itself must already be configured with matching IPv4 and IPv6 pod and service CIDRs before installing Calico.

## Step 1: Install Calico with IPv6 Support

```bash
# Install the Calico operator CRDs and operator

kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.31.4/manifests/operator-crds.yaml
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.31.4/manifests/tigera-operator.yaml

# Configure dual-stack installation for a cluster that already has matching
# Kubernetes pod and service CIDRs configured on the control plane
kubectl create -f - << 'EOF'
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
      - name: default-ipv4-pool
        blockSize: 26
        cidr: 10.244.0.0/16
        encapsulation: VXLANCrossSubnet
        natOutgoing: Enabled
        nodeSelector: all()
      - name: default-ipv6-pool
        blockSize: 122
        cidr: fd00:10:244::/48
        encapsulation: None
        natOutgoing: Enabled
        nodeSelector: all()
  # Dual-stack
  serviceCIDRs:
    - 10.96.0.0/12
    - fd00:10:96::/108
EOF
```

## Step 2: Configure IPv6 IPPool

If you manage IP pools with `calicoctl` or `kubectl` instead of `spec.calicoNetwork.ipPools`, use an IPv6 pool like this:

```yaml
# calico-ipv6-pool.yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv6-pool
spec:
  cidr: fd00:10:244::/48
  blockSize: 122       # /122 = 64 addresses per block
  ipipMode: Never      # No IPIP for IPv6
  vxlanMode: Never     # No VXLAN for IPv6
  natOutgoing: true    # Recommended for ULA/private IPv6 ranges such as fd00::/8
  nodeSelector: all()
  disabled: false
```

```bash
# Apply the pool
calicoctl apply -f calico-ipv6-pool.yaml

# Verify pools
calicoctl get ippools

# Check IPv6 allocation blocks
calicoctl ipam show --show-blocks
```

## Step 3: BGP Configuration for IPv6

```yaml
# calico-bgp-config.yaml
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Info
  nodeToNodeMeshEnabled: true
  asNumber: 65000
  # Advertise IPv6 Service CIDRs over BGP
  serviceClusterIPs:
    - cidr: fd00:10:96::/108  # IPv6 service CIDR

---
apiVersion: projectcalico.org/v3
kind: BGPPeer
metadata:
  name: ipv6-upstream-peer
spec:
  peerIP: 2001:db8::1
  asNumber: 65001
  # Peer over IPv6
```

## Step 4: NetworkPolicy for IPv6

```yaml
# netpolicy-ipv6.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ipv6-external
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow from IPv6 clients
    - from:
        - ipBlock:
            cidr: 2001:db8:100::/48
      ports:
        - protocol: TCP
          port: 8080
  egress:
    # Allow to IPv6 DNS
    - to:
        - ipBlock:
            cidr: 2001:db8::53/128
      ports:
        - protocol: UDP
          port: 53
```

## Step 5: Calico GlobalNetworkPolicy for IPv6

```yaml
# calico-global-policy.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: deny-ipv6-link-local
spec:
  selector: all()
  order: 100
  ingress:
    # Block IPv6 link-local source addresses
    - action: Deny
      source:
        nets:
          - "fe80::/10"
      destination: {}
  egress:
    - action: Allow
```

## Step 6: Verify and Test

```bash
# Check Calico status
calicoctl node status

# Verify IPv6 addresses on pods
kubectl get pod pod-a -o go-template --template='{{range .status.podIPs}}{{printf "%s\n" .ip}}{{end}}'
# In a dual-stack cluster, this should print both an IPv4 and an IPv6 address

# Test IPv6 pod-to-pod
kubectl exec -it pod-a -- ping -6 <pod-ipv6>

# Inspect Service IP families and cluster IPs
kubectl describe svc my-service
# A Service needs ipFamilyPolicy: PreferDualStack or RequireDualStack
# to receive both IPv4 and IPv6 cluster IPs

# Test IPv6 service access
kubectl exec -it pod-a -- curl -6 http://[<service-ipv6>]:8080/

# Review BGP peers and advertised IPv6 Service CIDRs
calicoctl get bgppeer
calicoctl get bgpconfig default -o yaml
```

## Conclusion

Calico supports IPv6 via dedicated IPPools with IPv6 CIDRs and BGP advertisement of IPv6 pod routes. Configure `blockSize: 122` for IPv6 blocks (/122 = 64 addresses per allocation block). Use `serviceClusterIPs` in `BGPConfiguration` when you also want to advertise IPv6 Service CIDRs. NetworkPolicy works with IPv6 `ipBlock` CIDRs. Monitor Calico agent health, BGP session state, and IPv6 IPAM utilization with OneUptime's infrastructure checks.
