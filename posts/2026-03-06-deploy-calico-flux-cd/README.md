# How to Deploy Calico with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Calico, Kubernetes, GitOps, Networking, CNI, Network Policy, Security

Description: A hands-on guide to deploying and managing Project Calico in Kubernetes using Flux CD for GitOps-driven network policy enforcement.

---

## Introduction

Project Calico is a widely adopted open-source networking and network security solution for Kubernetes. It provides a pure Layer 3 networking approach, high-performance data plane options (iptables, eBPF, or Windows HNS), and a rich network policy model that extends beyond standard Kubernetes NetworkPolicy. Deploying Calico with Flux CD ensures your network infrastructure and security policies are version-controlled and automatically applied.

This guide covers deploying Calico using Flux CD, configuring network policies, and managing IP pools.

## Prerequisites

- A Kubernetes cluster (v1.24 or later)
- Flux CD installed and bootstrapped
- kubectl configured for your cluster
- A Git repository connected to Flux CD

## Adding the Calico Helm Repository

```yaml
# clusters/my-cluster/sources/calico-helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: projectcalico
  namespace: flux-system
spec:
  interval: 1h
  url: https://docs.tigera.io/calico/charts
```

## Deploying the Tigera Operator

Calico is best deployed using the Tigera Operator, which manages the lifecycle of all Calico components.

```yaml
# clusters/my-cluster/helm-releases/tigera-operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: tigera-operator
  namespace: tigera-operator
spec:
  interval: 30m
  chart:
    spec:
      chart: tigera-operator
      version: "3.28.x"
      sourceRef:
        kind: HelmRepository
        name: projectcalico
        namespace: flux-system
      interval: 12h
  install:
    createNamespace: true
    crds: CreateReplace
  upgrade:
    crds: CreateReplace
  values:
    # Installation configuration
    installation:
      enabled: true
    # Resource limits for the operator
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 256Mi
```

## Configuring the Calico Installation

The Installation custom resource defines how Calico is configured on the cluster.

```yaml
# clusters/my-cluster/calico-config/installation.yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  # Use Calico networking
  cni:
    type: Calico
  # Calico networking configuration
  calicoNetwork:
    # Use BGP for routing
    bgp: Enabled
    # IP pools configuration
    ipPools:
      - cidr: 10.244.0.0/16
        # Use VXLAN encapsulation
        encapsulation: VXLANCrossSubnet
        natOutgoing: Enabled
        nodeSelector: all()
        blockSize: 26
    # Multi-networking support
    linuxDataplane: Iptables
    # Node address auto-detection
    nodeAddressAutodetectionV4:
      firstFound: true
  # Control plane replicas
  controlPlaneReplicas: 2
  # Component resource limits
  componentResources:
    - componentName: Node
      resourceRequirements:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 512Mi
    - componentName: KubeControllers
      resourceRequirements:
        requests:
          cpu: 50m
          memory: 128Mi
        limits:
          cpu: 250m
          memory: 256Mi
```

## Configuring Calico API Server

The API server allows you to use kubectl to manage Calico resources.

```yaml
# clusters/my-cluster/calico-config/apiserver.yaml
apiVersion: operator.tigera.io/v1
kind: APIServer
metadata:
  name: default
spec: {}
```

## Network Policies with Calico

### Default Deny Policy

Start with a default deny policy for all namespaces.

```yaml
# clusters/my-cluster/calico-policies/default-deny.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: default-deny
spec:
  # Apply to all non-system namespaces
  namespaceSelector: >-
    projectcalico.org/name != "kube-system" &&
    projectcalico.org/name != "calico-system" &&
    projectcalico.org/name != "flux-system"
  types:
    - Ingress
    - Egress
```

### Allow DNS Egress

```yaml
# clusters/my-cluster/calico-policies/allow-dns.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-dns-egress
spec:
  # Apply to all pods
  namespaceSelector: has(projectcalico.org/name)
  types:
    - Egress
  egress:
    # Allow DNS queries to kube-dns
    - action: Allow
      protocol: UDP
      destination:
        selector: k8s-app == "kube-dns"
        namespaceSelector: projectcalico.org/name == "kube-system"
        ports:
          - 53
    - action: Allow
      protocol: TCP
      destination:
        selector: k8s-app == "kube-dns"
        namespaceSelector: projectcalico.org/name == "kube-system"
        ports:
          - 53
```

### Application-Specific Policy

```yaml
# apps/my-app/network-policies/app-policy.yaml
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: default
spec:
  selector: app == "backend"
  types:
    - Ingress
  ingress:
    - action: Allow
      protocol: TCP
      source:
        selector: app == "frontend"
      destination:
        ports:
          - 8080
    # Allow health checks from kubelet
    - action: Allow
      protocol: TCP
      destination:
        ports:
          - 8080
      source:
        nets:
          - 10.0.0.0/8
```

### Network Sets for External Access Control

```yaml
# clusters/my-cluster/calico-policies/trusted-networks.yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkSet
metadata:
  name: trusted-external-networks
  labels:
    network-type: trusted
spec:
  nets:
    - 203.0.113.0/24
    - 198.51.100.0/24
---
# Allow egress only to trusted networks
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: restrict-external-egress
spec:
  namespaceSelector: projectcalico.org/name == "restricted"
  types:
    - Egress
  egress:
    - action: Allow
      destination:
        selector: network-type == "trusted"
```

## Host Endpoint Protection

Calico can also protect the host endpoints (nodes) themselves.

```yaml
# clusters/my-cluster/calico-policies/host-endpoint.yaml
apiVersion: projectcalico.org/v3
kind: HostEndpoint
metadata:
  name: worker-node-eth0
  labels:
    role: worker
spec:
  interfaceName: eth0
  node: worker-node-1
  expectedIPs:
    - 10.0.1.10
---
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-ssh-to-workers
spec:
  selector: role == "worker"
  types:
    - Ingress
  ingress:
    - action: Allow
      protocol: TCP
      source:
        nets:
          - 10.0.0.0/24
      destination:
        ports:
          - 22
  applyOnForward: false
  preDNAT: false
```

## Flux Kustomization

```yaml
# clusters/my-cluster/calico-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: calico-policies
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/calico-policies
  prune: true
  dependsOn:
    - name: tigera-operator
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: calico-node
      namespace: calico-system
  timeout: 10m
```

## Verifying the Deployment

```bash
# Check Calico node status
kubectl get pods -n calico-system

# Check Tigera operator
kubectl get pods -n tigera-operator

# Verify the installation resource
kubectl get installation default -o yaml

# List all Calico network policies
kubectl get globalnetworkpolicies
kubectl get networkpolicies.projectcalico.org -A

# Check Calico node status via calicoctl
kubectl calico node status

# View IP pools
kubectl get ippools -o yaml
```

## Troubleshooting

```bash
# View Calico node logs
kubectl logs -n calico-system -l k8s-app=calico-node

# Check Calico kube-controllers logs
kubectl logs -n calico-system -l k8s-app=calico-kube-controllers

# Verify BGP peering (if enabled)
kubectl calico node status

# Check Felix configuration
kubectl get felixconfiguration default -o yaml

# Debug policy enforcement
kubectl logs -n calico-system -l k8s-app=calico-node -c calico-node | grep -i policy
```

## Conclusion

Deploying Calico with Flux CD provides a robust, GitOps-managed networking and network security solution for Kubernetes. Calico's rich network policy model, combined with Flux CD's automated reconciliation, ensures that your security policies are consistently applied and auditable. Whether you need basic network segmentation or advanced features like host endpoint protection and network sets, this approach keeps everything version-controlled and reproducible.
