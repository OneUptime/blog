# How to Deploy Cilium Service Mesh with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Cilium, Service Mesh, GitOps, Kubernetes, EBPF, Networking

Description: Learn how to deploy and configure Cilium service mesh on Kubernetes using Flux CD for eBPF-powered networking and security.

---

## Introduction

Cilium is a Kubernetes networking and security solution that uses eBPF (extended Berkeley Packet Filter) to provide high-performance service mesh capabilities without traditional sidecar proxies. By leveraging Flux CD for deployment, you can manage Cilium's configuration through GitOps, ensuring reproducible and auditable network infrastructure.

This guide covers deploying Cilium as a service mesh with Flux CD, configuring network policies, enabling Hubble observability, and managing Layer 7 traffic policies.

## Prerequisites

Ensure you have the following before starting:

- A Kubernetes cluster (v1.25 or later) without a pre-installed CNI (or with Cilium-compatible CNI replacement)
- Flux CD bootstrapped on the cluster
- kubectl configured for cluster access
- Linux kernel 5.10 or later for full eBPF support

## Adding the Cilium Helm Repository

Register the Cilium Helm chart repository with Flux.

```yaml
# infrastructure/sources/cilium-helmrepo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: cilium
  namespace: flux-system
spec:
  interval: 1h
  url: https://helm.cilium.io/
```

## Deploying Cilium with HelmRelease

Deploy Cilium with service mesh features enabled.

```yaml
# infrastructure/cilium/helmrelease.yaml
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
  install:
    remediation:
      retries: 5
  upgrade:
    remediation:
      retries: 5
  values:
    # Enable Cilium as the cluster CNI
    ipam:
      mode: kubernetes
    # Enable the Cilium service mesh features
    serviceMesh:
      enabled: true
    # Enable Envoy proxy for L7 policies (sidecar-free mode)
    envoyConfig:
      enabled: true
    # Enable mutual TLS for service-to-service communication
    authentication:
      mutual:
        spire:
          enabled: true
          install:
            enabled: true
            server:
              replicas: 1
    # Enable Hubble for observability
    hubble:
      enabled: true
      relay:
        enabled: true
        replicas: 1
      ui:
        enabled: true
        replicas: 1
      metrics:
        enabled:
          # Enable specific Hubble metrics
          - dns:query;ignoreAAAA
          - drop
          - tcp
          - flow
          - icmp
          - http
        serviceMonitor:
          enabled: false
    # Configure the Cilium operator
    operator:
      replicas: 2
      resources:
        requests:
          memory: "128Mi"
          cpu: "100m"
        limits:
          memory: "256Mi"
          cpu: "200m"
    # Configure the Cilium agent
    resources:
      requests:
        memory: "256Mi"
        cpu: "200m"
      limits:
        memory: "512Mi"
        cpu: "500m"
    # Enable bandwidth management
    bandwidthManager:
      enabled: true
      bbr: true
    # Enable host routing for improved performance
    routingMode: native
    autoDirectNodeRoutes: true
    # Enable Kubernetes endpoint slices
    enableK8sEndpointSlice: true
```

## Creating the Flux Kustomization

Manage the Cilium deployment with a Flux Kustomization.

```yaml
# clusters/my-cluster/infrastructure/cilium.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cilium
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/cilium
  prune: true
  wait: true
  timeout: 15m
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: cilium
      namespace: kube-system
    - apiVersion: apps/v1
      kind: Deployment
      name: cilium-operator
      namespace: kube-system
    - apiVersion: apps/v1
      kind: Deployment
      name: hubble-relay
      namespace: kube-system
```

## Configuring Cilium Network Policies

Define Layer 3/4 network policies using CiliumNetworkPolicy.

```yaml
# apps/policies/l3-l4-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: backend-api-policy
  namespace: demo-app
spec:
  # Apply this policy to pods with the backend-api label
  endpointSelector:
    matchLabels:
      app: backend-api
  ingress:
    # Allow traffic from frontend on port 3000
    - fromEndpoints:
        - matchLabels:
            app: frontend
      toPorts:
        - ports:
            - port: "3000"
              protocol: TCP
  egress:
    # Allow DNS resolution
    - toEndpoints:
        - matchLabels:
            io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
          rules:
            dns:
              - matchPattern: "*.cluster.local"
    # Allow access to the database service
    - toEndpoints:
        - matchLabels:
            app: postgres
      toPorts:
        - ports:
            - port: "5432"
              protocol: TCP
```

## Layer 7 HTTP Traffic Policies

Define application-level traffic policies for HTTP services.

```yaml
# apps/policies/l7-http-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-l7-policy
  namespace: demo-app
spec:
  endpointSelector:
    matchLabels:
      app: backend-api
  ingress:
    - fromEndpoints:
        - matchLabels:
            app: frontend
      toPorts:
        - ports:
            - port: "3000"
              protocol: TCP
          rules:
            http:
              # Allow GET requests to the /api/v1 path prefix
              - method: GET
                path: "/api/v1/.*"
              # Allow POST requests to specific endpoints
              - method: POST
                path: "/api/v1/orders"
              # Allow health check endpoint from any source
              - method: GET
                path: "/health"
```

## Configuring CiliumEnvoyConfig for Advanced L7

Use CiliumEnvoyConfig for advanced L7 load balancing without sidecars.

```yaml
# infrastructure/cilium/envoy-config.yaml
apiVersion: cilium.io/v2
kind: CiliumEnvoyConfig
metadata:
  name: backend-api-lb
  namespace: demo-app
spec:
  # Target the backend-api service
  services:
    - name: backend-api
      namespace: demo-app
  backendServices:
    - name: backend-api
      namespace: demo-app
  resources:
    - "@type": type.googleapis.com/envoy.config.listener.v3.Listener
      name: backend-api-listener
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: backend-api
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: backend-api
                      domains: ["*"]
                      routes:
                        - match:
                            prefix: "/"
                          route:
                            # Configure retry policy
                            retry_policy:
                              retry_on: "5xx"
                              num_retries: 3
                            weighted_clusters:
                              clusters:
                                # Split traffic between stable and canary
                                - name: "demo-app/backend-api"
                                  weight: 90
                                - name: "demo-app/backend-api-canary"
                                  weight: 10
                http_filters:
                  - name: envoy.filters.http.router
                    typed_config:
                      "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router
```

## Configuring Cluster-Wide Network Policies

Apply cluster-wide policies using CiliumClusterwideNetworkPolicy.

```yaml
# infrastructure/cilium/clusterwide-policy.yaml
apiVersion: cilium.io/v2
kind: CiliumClusterwideNetworkPolicy
metadata:
  name: default-deny-all
spec:
  # Apply to all endpoints in the cluster
  endpointSelector: {}
  ingress:
    # Allow traffic from within the cluster only
    - fromEntities:
        - cluster
  egress:
    # Allow DNS resolution
    - toEntities:
        - kube-apiserver
    - toEndpoints:
        - matchLabels:
            io.kubernetes.pod.namespace: kube-system
            k8s-app: kube-dns
      toPorts:
        - ports:
            - port: "53"
              protocol: UDP
```

## Enabling Hubble for Observability

Hubble provides deep visibility into network flows. Access the Hubble UI.

```yaml
# infrastructure/cilium/hubble-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hubble-ui
  namespace: kube-system
  annotations:
    # Configure TLS termination
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  rules:
    - host: hubble.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: hubble-ui
                port:
                  number: 80
  tls:
    - hosts:
        - hubble.example.com
      secretName: hubble-ui-tls
```

## Verifying the Deployment

Check that Cilium and all components are working correctly.

```bash
# Check Flux reconciliation
flux get kustomizations cilium

# Verify Cilium pods are running
kubectl get pods -n kube-system -l k8s-app=cilium

# Check Cilium status
kubectl exec -n kube-system ds/cilium -- cilium status

# Verify Hubble is working
kubectl exec -n kube-system ds/cilium -- hubble observe --last 10

# Check CiliumNetworkPolicies are applied
kubectl get cnp --all-namespaces

# Verify service mesh connectivity
kubectl exec -n kube-system ds/cilium -- cilium service list
```

## Troubleshooting

Common troubleshooting steps for Cilium with Flux.

```bash
# Check Cilium agent logs
kubectl logs -n kube-system -l k8s-app=cilium --tail=50

# Verify eBPF programs are loaded
kubectl exec -n kube-system ds/cilium -- cilium bpf policy list

# Check endpoint connectivity
kubectl exec -n kube-system ds/cilium -- cilium endpoint list

# Debug network policy enforcement
kubectl exec -n kube-system ds/cilium -- cilium policy get

# Force Flux reconciliation
flux reconcile kustomization cilium --with-source
```

## Summary

Deploying Cilium service mesh with Flux CD delivers a powerful combination of eBPF-based networking and GitOps automation. Cilium's sidecar-free architecture reduces overhead while providing L3/L4/L7 network policies, mTLS via SPIRE, and deep observability through Hubble. Managing all of this through Flux ensures every network configuration change is version-controlled, peer-reviewed, and automatically reconciled.
