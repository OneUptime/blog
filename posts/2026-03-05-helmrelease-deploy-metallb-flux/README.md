# How to Use HelmRelease for Deploying MetalLB with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, MetalLB, Load Balancer, Bare Metal

Description: Learn how to deploy MetalLB on bare-metal Kubernetes clusters using a Flux HelmRelease for GitOps-managed load balancer services.

---

MetalLB provides a network load balancer implementation for bare-metal Kubernetes clusters. Without MetalLB or a similar solution, Services of type LoadBalancer remain in a perpetual Pending state on bare-metal clusters because there is no cloud provider to allocate external IP addresses. Deploying MetalLB through a Flux HelmRelease brings GitOps management to your load balancer infrastructure.

## Prerequisites

- A bare-metal Kubernetes cluster with Flux CD installed
- A GitOps repository connected to Flux
- A pool of IP addresses available for MetalLB to assign
- If using kube-proxy in IPVS mode, strict ARP must be enabled

## Preparing the Cluster

If your cluster uses kube-proxy in IPVS mode, you need to enable strict ARP before deploying MetalLB.

```bash
# Edit the kube-proxy ConfigMap to enable strict ARP
kubectl edit configmap -n kube-system kube-proxy

# Set strictARP: true under ipvs configuration
```

## Creating the HelmRepository

MetalLB publishes its Helm chart through its official repository.

```yaml
# helmrepository-metallb.yaml - MetalLB Helm chart repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: metallb
  namespace: flux-system
spec:
  interval: 1h
  url: https://metallb.github.io/metallb
```

## Deploying MetalLB with HelmRelease

The following HelmRelease deploys MetalLB with its controller and speaker components.

```yaml
# helmrelease-metallb.yaml - MetalLB deployment via Flux
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: metallb
  namespace: metallb-system
spec:
  interval: 15m
  chart:
    spec:
      chart: metallb
      version: "0.x"
      sourceRef:
        kind: HelmRepository
        name: metallb
        namespace: flux-system
      interval: 15m
  install:
    createNamespace: true
    atomic: true
    timeout: 10m
    remediation:
      retries: 3
    crds: CreateReplace
  upgrade:
    atomic: true
    timeout: 10m
    cleanupOnFail: true
    remediation:
      retries: 3
      strategy: rollback
    crds: CreateReplace
  values:
    # Controller deployment configuration
    controller:
      resources:
        requests:
          cpu: 50m
          memory: 64Mi
        limits:
          cpu: 200m
          memory: 128Mi

    # Speaker DaemonSet configuration
    speaker:
      resources:
        requests:
          cpu: 50m
          memory: 64Mi
        limits:
          cpu: 200m
          memory: 128Mi
      # Tolerate control-plane nodes if needed
      tolerations: []
      # Use memberlist for speaker communication
      secretName: metallb-memberlist

    # Prometheus monitoring
    prometheus:
      serviceMonitor:
        enabled: true
      prometheusRule:
        enabled: true
```

## Configuring IP Address Pools

After MetalLB is deployed, configure IP address pools and L2 or BGP advertisements using MetalLB custom resources. These should be stored in your GitOps repository alongside the HelmRelease.

```yaml
# ipaddresspool.yaml - IP address pool for MetalLB
apiVersion: metallb.io/v1beta1
kind: IPAddressPool
metadata:
  name: default-pool
  namespace: metallb-system
spec:
  addresses:
    - 192.168.1.200-192.168.1.250
  autoAssign: true
---
# l2advertisement.yaml - L2 advertisement for the IP pool
apiVersion: metallb.io/v1beta1
kind: L2Advertisement
metadata:
  name: default-l2
  namespace: metallb-system
spec:
  ipAddressPools:
    - default-pool
```

## BGP Configuration

For environments using BGP peering, configure BGP peers and advertisements instead of L2.

```yaml
# bgppeer.yaml - BGP peer configuration
apiVersion: metallb.io/v1beta2
kind: BGPPeer
metadata:
  name: router-peer
  namespace: metallb-system
spec:
  myASN: 64500
  peerASN: 64501
  peerAddress: 10.0.0.1
  keepaliveTime: 30s
  holdTime: 90s
---
# bgpadvertisement.yaml - BGP advertisement configuration
apiVersion: metallb.io/v1beta1
kind: BGPAdvertisement
metadata:
  name: default-bgp
  namespace: metallb-system
spec:
  ipAddressPools:
    - default-pool
  aggregationLength: 32
```

## Using LoadBalancer Services

With MetalLB configured, Services of type LoadBalancer will automatically receive an external IP from the configured pool.

```yaml
# service.yaml - LoadBalancer service using MetalLB
apiVersion: v1
kind: Service
metadata:
  name: my-web-app
  namespace: apps
  annotations:
    # Request a specific IP (optional)
    metallb.universe.tf/loadBalancerIPs: "192.168.1.200"
spec:
  type: LoadBalancer
  ports:
    - port: 80
      targetPort: 8080
  selector:
    app: my-web-app
```

## Verifying the Deployment

```bash
# Check HelmRelease status
flux get helmrelease metallb -n metallb-system

# Verify MetalLB pods are running
kubectl get pods -n metallb-system

# Check CRDs are installed
kubectl get crds | grep metallb

# Verify IP address pools
kubectl get ipaddresspool -n metallb-system

# Test with a LoadBalancer service
kubectl get svc -A --field-selector spec.type=LoadBalancer
```

## Summary

Deploying MetalLB through a Flux HelmRelease from `https://metallb.github.io/metallb` brings load balancer capabilities to bare-metal Kubernetes clusters under full GitOps control. By managing both the MetalLB deployment and its IP address pool configurations in Git, you ensure that your cluster networking layer is reproducible, auditable, and automatically reconciled by Flux.
