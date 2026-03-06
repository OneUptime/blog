# How to Deploy Cilium with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Cilium, Kubernetes, GitOps, Networking, CNI, eBPF, Network Policy

Description: A practical guide to deploying and managing Cilium CNI in Kubernetes using Flux CD for GitOps-driven network management with eBPF.

---

## Introduction

Cilium is a powerful open-source networking, observability, and security solution for Kubernetes built on eBPF (extended Berkeley Packet Filter). It provides high-performance networking, advanced network policies, transparent encryption, and deep observability without sidecars. Deploying Cilium through Flux CD ensures your entire network configuration is version-controlled and automatically reconciled.

This guide covers deploying Cilium using Flux CD, configuring network policies, and enabling observability with Hubble.

## Prerequisites

- A Kubernetes cluster (v1.24 or later) without a CNI plugin installed, or with the ability to replace the existing CNI
- Flux CD installed and bootstrapped
- kubectl configured for your cluster
- A Git repository connected to Flux CD

## Adding the Cilium Helm Repository

```yaml
# clusters/my-cluster/sources/cilium-helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: cilium
  namespace: flux-system
spec:
  interval: 1h
  url: https://helm.cilium.io/
```

## Creating the Namespace

```yaml
# clusters/my-cluster/namespaces/cilium-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kube-system
  labels:
    toolkit.fluxcd.io/tenant: networking
```

## Deploying Cilium via HelmRelease

```yaml
# clusters/my-cluster/helm-releases/cilium-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cilium
  namespace: kube-system
spec:
  interval: 30m
  chart:
    spec:
      chart: cilium
      version: "1.16.x"
      sourceRef:
        kind: HelmRepository
        name: cilium
        namespace: flux-system
      interval: 12h
  values:
    # Use eBPF-based kube-proxy replacement
    kubeProxyReplacement: true

    # Kubernetes API server address
    k8sServiceHost: "kubernetes.default.svc.cluster.local"
    k8sServicePort: 443

    # Enable Hubble for observability
    hubble:
      enabled: true
      relay:
        enabled: true
        replicas: 1
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
      ui:
        enabled: true
        replicas: 1
      metrics:
        enabled:
          - dns
          - drop
          - tcp
          - flow
          - port-distribution
          - icmp
          - httpV2:exemplars=true;labelsContext=source_ip,source_namespace,source_workload,destination_ip,destination_namespace,destination_workload

    # IP Address Management
    ipam:
      mode: kubernetes

    # Enable bandwidth manager for better performance
    bandwidthManager:
      enabled: true

    # Enable host firewall
    hostFirewall:
      enabled: true

    # Resource limits for the Cilium agent
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 1000m
        memory: 1Gi

    # Operator configuration
    operator:
      replicas: 2
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 256Mi

    # Enable transparent encryption with WireGuard
    encryption:
      enabled: true
      type: wireguard
      nodeEncryption: true
```

## Configuring Cilium Network Policies

Cilium extends standard Kubernetes NetworkPolicy with its own CiliumNetworkPolicy CRD, which provides Layer 7 filtering and DNS-aware policies.

### Basic L3/L4 Network Policy

```yaml
# apps/my-app/network-policies/deny-all.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      app: my-app
  ingressDeny:
    # Deny all ingress traffic
    - fromEntities:
        - all
```

### Allow Specific Traffic

```yaml
# apps/my-app/network-policies/allow-frontend.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-frontend-to-api
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      app: api-server
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: frontend
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
          rules:
            # Layer 7 HTTP filtering
            http:
              - method: GET
                path: "/api/v1/.*"
              - method: POST
                path: "/api/v1/users"
```

### DNS-Aware Policy

```yaml
# apps/my-app/network-policies/dns-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-external-dns
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      app: my-app
  egress:
    # Allow DNS resolution
    - toEndpoints:
        - matchLabels:
            io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: ANY
          rules:
            dns:
              - matchPattern: "*.example.com"
    # Allow HTTPS to specific external services
    - toFQDNs:
        - matchName: "api.external-service.com"
      toPorts:
        - ports:
            - port: "443"
              protocol: TCP
```

## Cluster-Wide Network Policy

CiliumClusterwideNetworkPolicy applies across all namespaces.

```yaml
# clusters/my-cluster/cilium-policies/cluster-deny-external.yaml
apiVersion: cilium.io/v2
kind: CiliumClusterwideNetworkPolicy
metadata:
  name: default-deny-external-egress
spec:
  endpointSelector:
    matchExpressions:
      - key: io.kubernetes.pod.namespace
        operator: NotIn
        values:
          - kube-system
          - flux-system
  egressDeny:
    - toCIDR:
        - "0.0.0.0/0"
      exceptCIDRs:
        # Allow cluster and private network ranges
        - "10.0.0.0/8"
        - "172.16.0.0/12"
        - "192.168.0.0/16"
```

## Enabling Cilium Ingress

Cilium can also function as an ingress controller.

```yaml
# Update the HelmRelease values to enable ingress
# Add this to the cilium-helmrelease.yaml values section
spec:
  values:
    ingressController:
      enabled: true
      default: true
      loadbalancerMode: shared
      enforceHttps: true
```

Then create Ingress resources that Cilium will handle.

```yaml
# apps/my-app/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  namespace: default
  annotations:
    ingress.cilium.io/loadbalancer-mode: shared
spec:
  ingressClassName: cilium
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app-service
                port:
                  number: 80
  tls:
    - hosts:
        - app.example.com
      secretName: app-tls-secret
```

## Flux Kustomization

```yaml
# clusters/my-cluster/cilium-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cilium-config
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/cilium-policies
  prune: true
  dependsOn:
    - name: cilium-helm
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: cilium
      namespace: kube-system
  timeout: 10m
```

## Verifying the Deployment

```bash
# Check Cilium status
kubectl -n kube-system exec ds/cilium -- cilium status

# Verify connectivity
kubectl -n kube-system exec ds/cilium -- cilium connectivity test

# Check Hubble flows
kubectl -n kube-system exec ds/cilium -- hubble observe

# View network policies
kubectl get ciliumnetworkpolicies -A

# Check Cilium endpoints
kubectl -n kube-system exec ds/cilium -- cilium endpoint list

# Access Hubble UI (port-forward)
kubectl port-forward -n kube-system svc/hubble-ui 12000:80
```

## Troubleshooting

```bash
# Check Cilium agent logs
kubectl logs -n kube-system -l k8s-app=cilium

# Check Cilium operator logs
kubectl logs -n kube-system -l name=cilium-operator

# Verify eBPF programs are loaded
kubectl -n kube-system exec ds/cilium -- cilium bpf ct list global

# Check policy enforcement
kubectl -n kube-system exec ds/cilium -- cilium policy get

# Monitor dropped packets
kubectl -n kube-system exec ds/cilium -- hubble observe --type drop
```

## Conclusion

Deploying Cilium with Flux CD provides a powerful, eBPF-based networking stack that is fully managed through GitOps. Cilium's advanced features like Layer 7 filtering, DNS-aware policies, transparent encryption, and deep observability through Hubble make it an excellent choice for production Kubernetes clusters. With Flux CD handling the reconciliation, your network configuration stays consistent and auditable across all environments.
