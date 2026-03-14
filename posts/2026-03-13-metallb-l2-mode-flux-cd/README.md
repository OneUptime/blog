# How to Deploy MetalLB with L2 Mode via Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, MetalLB, L2, Layer 2, Load Balancer, Kubernetes, GitOps, Bare Metal

Description: Learn how to deploy MetalLB in Layer 2 mode using Flux CD for simple, ARP-based load balancing on bare metal or on-premises Kubernetes clusters.

---

## Introduction

MetalLB's Layer 2 (L2) mode uses ARP (for IPv4) or NDP (for IPv6) to advertise Service VIPs on the local network. Unlike BGP mode, L2 mode does not require BGP-capable routers, making it the simplest MetalLB configuration for homelab, development, and small production environments. Managing MetalLB L2 configuration through Flux CD keeps your load balancer configuration in Git alongside your application manifests.

## Prerequisites

- Kubernetes cluster on bare metal, VMs, or a development environment (minikube, k3s, etc.)
- All nodes on the same Layer 2 network segment
- Flux CD bootstrapped
- kubectl and flux CLI installed

## Step 1: Deploy MetalLB via Flux HelmRelease

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
---
# clusters/production/infrastructure/metallb.yaml
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
      version: "0.14.x"
      sourceRef:
        kind: HelmRepository
        name: metallb
        namespace: flux-system
  install:
    crds: CreateReplace
  upgrade:
    crds: CreateReplace
  values:
    controller:
      resources:
        requests:
          cpu: 100m
          memory: 64Mi
    speaker:
      # Allow MetalLB speaker to run on all nodes
      tolerations:
        - key: node-role.kubernetes.io/control-plane
          effect: NoSchedule
          operator: Exists
      resources:
        requests:
          cpu: 100m
          memory: 64Mi
```

## Step 2: Configure L2 IP Address Pool

```yaml
# infrastructure/metallb-config/ip-pool.yaml
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: l2-pool
  namespace: metallb-system
spec:
  # IPs in the same subnet as your nodes
  # Choose IPs not used by DHCP
  addresses:
    - 192.168.1.200-192.168.1.250
  autoAssign: true
---
# L2 advertisement (enables L2/ARP mode for this pool)
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: l2-advertisement
  namespace: metallb-system
spec:
  ipAddressPools:
    - l2-pool
  # Optionally, limit which nodes can advertise (become the "leader")
  nodeSelectors:
    - matchLabels:
        kubernetes.io/role: worker  # Only worker nodes advertise VIPs
  # Interfaces to use for ARP responses (optional)
  interfaces:
    - eth0
```

## Step 3: Multiple IP Pools for Different Service Tiers

```yaml
# Separate pools for web, API, and admin services
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: web-pool
  namespace: metallb-system
spec:
  addresses:
    - 192.168.1.200-192.168.1.209
---
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: api-pool
  namespace: metallb-system
spec:
  addresses:
    - 192.168.1.210-192.168.1.219
---
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: multi-pool-advertisement
  namespace: metallb-system
spec:
  ipAddressPools:
    - web-pool
    - api-pool
```

## Step 4: Flux Kustomization Setup

```yaml
# clusters/production/infrastructure/metallb-l2.yaml
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
    - apiVersion: apps/v1
      kind: Deployment
      name: metallb-controller
      namespace: metallb-system
    - apiVersion: apps/v1
      kind: DaemonSet
      name: metallb-speaker
      namespace: metallb-system
  timeout: 5m
---
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
    - name: metallb
  targetNamespace: metallb-system
```

## Step 5: Request a Specific IP from the Pool

```yaml
# Service requesting a specific IP from the pool
apiVersion: v1
kind: Service
metadata:
  name: nginx-ingress
  namespace: ingress-nginx
  annotations:
    # Request a specific IP from the pool
    metallb.universe.tf/loadBalancerIPs: "192.168.1.200"
    # Or specify which pool to use
    metallb.universe.tf/address-pool: "web-pool"
spec:
  type: LoadBalancer
  selector:
    app.kubernetes.io/name: ingress-nginx
  ports:
    - name: http
      port: 80
      targetPort: 80
    - name: https
      port: 443
      targetPort: 443
```

## Step 6: Verify MetalLB L2 Operation

```bash
# Check MetalLB is running
kubectl get pods -n metallb-system

# Verify IP pool configuration
kubectl get ipaddresspools -n metallb-system
kubectl get l2advertisements -n metallb-system

# Create a test service
kubectl apply -f - << 'EOF'
apiVersion: v1
kind: Service
metadata:
  name: test-lb
spec:
  type: LoadBalancer
  selector:
    app: test
  ports:
    - port: 80
      targetPort: 80
EOF

# Check IP assignment
kubectl get service test-lb
# Should show an IP from 192.168.1.200-250

# Test ARP from outside the cluster (on a host in the same network)
# arp -n 192.168.1.200  # Should show the MAC of a cluster node

# Check MetalLB speaker logs for ARP activity
kubectl logs -n metallb-system -l app=metallb,component=speaker --tail=20 | grep -i arp
```

## Best Practices

- Only use L2 mode when all your nodes are on the same Layer 2 broadcast domain.
- L2 mode has a single-node bottleneck: all traffic to a VIP goes to the "leader" node. For high-traffic services, use BGP mode instead.
- Reserve the IP range in your DHCP server to prevent address conflicts.
- Use specific IP annotations on critical services (like ingress-nginx) to prevent IP changes after cluster recreation.
- Test failover by rebooting the current leader node; the VIP should move to another node within seconds.
- Monitor MetalLB speaker logs for "failover" messages indicating which node holds each VIP.

## Conclusion

MetalLB in L2 mode deployed via Flux CD is the simplest path to Kubernetes LoadBalancer services on bare metal. The ARP-based approach requires no special network infrastructure and works on any Layer 2 network. For production workloads that need true load balancing across nodes (not just a single-node leader), consider BGP mode. For development clusters, homelab, or low-traffic production services, L2 mode with Flux CD management is an excellent choice.
