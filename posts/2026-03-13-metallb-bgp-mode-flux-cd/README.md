# MetalLB BGP Mode with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: MetalLB, BGP, Flux-cd, GitOps, Kubernetes, Load-balancer, Bare-metal, Networking

Description: Learn how to deploy and configure MetalLB in BGP mode on bare-metal Kubernetes clusters using Flux CD, enabling dynamic load balancer IP advertisement to physical routers.

---

## Introduction

MetalLB provides Kubernetes LoadBalancer services on bare metal and on-premises clusters that lack cloud provider load balancers. BGP mode is a common production configuration for MetalLB, where it peers with network routers to advertise Service VIPs using the Border Gateway Protocol, enabling router-side ECMP load balancing and failover across multiple nodes.

Managing MetalLB and its BGP configuration through Flux CD ensures that load balancer configuration changes are tracked in Git and consistently applied across cluster recreations.

## Prerequisites

- A Kubernetes cluster on bare metal or a VM environment
- A BGP-capable router or switch that you control
- Flux CD bootstrapped
- Understanding of BGP concepts (AS numbers, peer configuration)
- MetalLB-compatible CNI

## Step 1: Add MetalLB Helm Repository

```yaml
# clusters/production/sources/metallb-helm.yaml

apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: metallb
  namespace: flux-system
spec:
  interval: 1h
  url: https://metallb.github.io/metallb
```

## Step 2: Deploy MetalLB via Flux HelmRelease

```yaml
# clusters/production/infrastructure/metallb.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: metallb-system
  labels:
    pod-security.kubernetes.io/enforce: privileged
    pod-security.kubernetes.io/audit: privileged
    pod-security.kubernetes.io/warn: privileged
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: metallb
  namespace: metallb-system
spec:
  interval: 1h
  chart:
    spec:
      chart: metallb
      version: "0.15.x"
      sourceRef:
        kind: HelmRepository
        name: metallb
        namespace: flux-system
  install:
    crds: CreateReplace
  upgrade:
    crds: CreateReplace
  values:
    # Speaker configuration (runs on each node)
    speaker:
      # FRR mode is required for BFD-backed BGP sessions
      frr:
        enabled: true
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
          effect: NoSchedule
      resources:
        requests:
          cpu: 100m
          memory: 100Mi
        limits:
          cpu: 200m
          memory: 200Mi
    # Controller configuration
    controller:
      resources:
        requests:
          cpu: 100m
          memory: 100Mi
        limits:
          cpu: 200m
          memory: 200Mi
```

## Step 3: Configure BGP Address Pool

```yaml
# clusters/production/infrastructure/metallb-config.yaml
# IP pool for LoadBalancer services
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: production-pool
  namespace: metallb-system
spec:
  addresses:
    - 192.168.10.100-192.168.10.200  # Range of IPs to assign to Services
  autoAssign: true
---
# BGP advertisement configuration
apiVersion: metallb.io/v1beta1
kind: BGPAdvertisement
metadata:
  name: production-bgp
  namespace: metallb-system
spec:
  ipAddressPools:
    - production-pool
  # Advertise individual service IPs; use a lower value such as 24 to aggregate a larger pool
  aggregationLength: 32
  # Communities to tag routes with (optional)
  communities:
    - 65000:100  # Custom community tag
```

## Step 4: Configure BGP Peers

```yaml
# clusters/production/infrastructure/metallb-bgp-peers.yaml
# BFD profile for faster failure detection
apiVersion: metallb.io/v1beta1
kind: BFDProfile
metadata:
  name: default
  namespace: metallb-system
spec:
  receiveInterval: 300
  transmitInterval: 300
  detectMultiplier: 3
---
# Primary router peer
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: router-primary
  namespace: metallb-system
spec:
  myASN: 65001          # Your Kubernetes cluster AS number
  peerASN: 65000        # Your router's AS number
  peerAddress: 192.168.1.1  # Router IP
  keepaliveTime: 30s
  holdTime: 90s
  # Enable BFD for faster failure detection (optional)
  bfdProfile: default
---
# Secondary router peer (for redundancy)
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: router-secondary
  namespace: metallb-system
spec:
  myASN: 65001
  peerASN: 65000
  peerAddress: 192.168.1.2  # Secondary router IP
  keepaliveTime: 30s
  holdTime: 90s
```

## Step 5: Wire Together with Flux Kustomization and dependsOn

```yaml
# clusters/production/infrastructure/metallb-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: metallb
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/metallb
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: metallb
      namespace: metallb-system
  timeout: 5m
---
# MetalLB config depends on MetalLB being deployed
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: metallb-config
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/metallb-config
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  dependsOn:
    - name: metallb  # MetalLB CRDs must exist first
  targetNamespace: metallb-system
```

## Step 6: Test LoadBalancer Service

```bash
# Create a test service
kubectl create deployment test --image=nginx --port=80

kubectl apply -f - << 'EOF'
apiVersion: v1
kind: Service
metadata:
  name: test-lb
  namespace: default
spec:
  type: LoadBalancer
  selector:
    app: test
  ports:
    - port: 80
      targetPort: 80
EOF

# Check that MetalLB assigned an IP
kubectl get service test-lb
# EXTERNAL-IP should show an IP from the 192.168.10.100-200 range

# Verify BGP advertisement
kubectl logs -n metallb-system \
  -l app.kubernetes.io/name=metallb,app.kubernetes.io/component=speaker \
  -c speaker --tail=30 | grep -i bgp

# Check BGP peer status in FRR mode
kubectl exec -n metallb-system ds/metallb-speaker -c frr -- \
  vtysh -c "show bgp summary"
```

## Best Practices

- Use private AS numbers (64512-65534 or 4200000000-4294967294) for your cluster to avoid conflicts with public BGP infrastructure.
- Configure BGP peer authentication (MD5 password) to prevent unauthorized BGP sessions.
- Deploy MetalLB speakers on all nodes (including control plane) to ensure VIPs can be advertised from any node.
- Use BFD (Bidirectional Forwarding Detection) alongside BGP for sub-second failover detection.
- Assign a dedicated IP pool for each application tier (web, API, admin) to maintain IP address organization.
- Test failover by draining a node and verifying the route converges on another node within your BGP/BFD timers.

## Conclusion

MetalLB in BGP mode deployed via Flux CD provides production-ready load balancing for bare metal Kubernetes clusters. BGP integration enables router-side multi-path load balancing and failover when nodes become unavailable, with faster failure detection when FRR mode and BFD are configured. Managing MetalLB configuration (IP pools, BGP peers, advertisements) through Flux CD makes your network configuration as auditable and reproducible as your application deployments.
