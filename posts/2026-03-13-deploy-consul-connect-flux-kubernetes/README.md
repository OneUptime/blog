# How to Deploy Consul Connect with Flux on Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Consul, Consul Connect, Service Mesh, HashiCorp

Description: Deploy HashiCorp Consul service mesh on Kubernetes using Flux CD for multi-platform service discovery, mTLS, and traffic management.

---

## Introduction

HashiCorp Consul Connect is a service mesh that extends across Kubernetes, VMs, and bare metal - making it the go-to choice for hybrid and multi-cloud environments where not all services run on Kubernetes. Consul provides service discovery, health checking, mTLS via Envoy proxies, and intentions-based access control.

Managing Consul Connect through Flux CD brings GitOps governance to your service mesh deployment. Consul version upgrades, configuration changes, and feature enablement all flow through pull requests, giving your platform team full auditability and control.

This guide covers deploying Consul Connect on Kubernetes using Flux CD HelmRelease, including service discovery, sidecar injection, and basic configuration.

## Prerequisites

- Kubernetes cluster (1.25+)
- Flux CD v2 bootstrapped to your Git repository
- Sufficient resources for Consul servers (3 server pods recommended for production)

## Step 1: Create Namespace and HelmRepository

```yaml
# clusters/my-cluster/consul/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: consul
  labels:
    app.kubernetes.io/managed-by: flux
---
# clusters/my-cluster/consul/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: hashicorp
  namespace: flux-system
spec:
  interval: 12h
  url: https://helm.releases.hashicorp.com
```

## Step 2: Deploy Consul via HelmRelease

```yaml
# clusters/my-cluster/consul/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: consul
  namespace: consul
spec:
  interval: 1h
  chart:
    spec:
      chart: consul
      version: "1.4.*"
      sourceRef:
        kind: HelmRepository
        name: hashicorp
        namespace: flux-system
      interval: 12h
  values:
    global:
      name: consul
      # Datacenter name
      datacenter: dc1
      # Enable Consul Connect service mesh
      enabled: true
      # Enable mTLS between all services
      tls:
        enabled: true
        # Auto-rotate certificates
        enableAutoEncrypt: true
      # Enable Consul ACLs
      acls:
        manageSystemACLs: true
      # Enable gossip encryption
      gossipEncryption:
        autoGenerate: true
      # Metrics
      metrics:
        enabled: true
        enableAgentMetrics: true
        agentMetricsRetentionTime: 1m

    # Server configuration
    server:
      replicas: 3
      # Storage for Consul's Raft log
      storage: 10Gi
      storageClass: fast-ssd
      resources:
        requests:
          memory: "100Mi"
          cpu: "100m"
        limits:
          memory: "256Mi"
          cpu: "200m"
      # Distribute server pods across nodes
      affinity: |
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  app: consul
                  component: server
              topologyKey: kubernetes.io/hostname

    # Client (DaemonSet) configuration
    client:
      enabled: true
      grpc: true
      resources:
        requests:
          memory: "100Mi"
          cpu: "100m"

    # Consul Connect (service mesh) configuration
    connectInject:
      enabled: true
      # Default to inject Connect sidecar in all namespaces
      default: false
      # Metrics via Envoy
      metrics:
        defaultEnabled: true
        defaultEnableMerging: true

    # Consul UI
    ui:
      enabled: true
      service:
        type: ClusterIP

    # DNS configuration
    dns:
      enabled: true
```

## Step 3: Create the Flux Kustomization

```yaml
# clusters/my-cluster/consul/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease.yaml
---
# clusters/my-cluster/flux-kustomization-consul.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: consul
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/consul
  prune: false   # Never prune Consul servers
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: consul-server
      namespace: consul
    - apiVersion: apps/v1
      kind: DaemonSet
      name: consul-client
      namespace: consul
```

## Step 4: Enable Connect Injection for Namespaces

```yaml
# clusters/my-cluster/apps/consul-injection.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    # Enable Consul Connect sidecar injection
    consul.hashicorp.com/connect-inject: "true"
```

## Step 5: Deploy a Consul-Meshed Service

```yaml
# clusters/my-cluster/apps/meshed-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
      annotations:
        # Enable Connect injection for this pod
        consul.hashicorp.com/connect-inject: "true"
        # Upstream services this pod needs to call
        consul.hashicorp.com/connect-service-upstreams: "user-service:8080"
    spec:
      containers:
        - name: api
          image: myregistry/api:v1.0.0
          env:
            # Connect to user-service via local Envoy proxy
            - name: USER_SERVICE_URL
              value: "http://localhost:8080"
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
```

## Step 6: Validate Consul Connect

```bash
# Check Consul deployment
flux get kustomizations consul

# Verify all Consul components
kubectl get pods -n consul

# Check Consul cluster health
kubectl exec -n consul consul-server-0 -- consul members

# Access the Consul UI
kubectl port-forward svc/consul-ui 8500:80 -n consul
# Open http://localhost:8500

# Verify mTLS is active between services
kubectl exec -n production deploy/api-service -c consul-dataplane -- \
  curl -sv http://localhost:8080/health

# Check service registrations
kubectl exec -n consul consul-server-0 -- \
  consul catalog services
```

## Best Practices

- Deploy 3 Consul server replicas with pod anti-affinity to distribute them across nodes, preventing a single node failure from losing Consul quorum.
- Enable ACLs (`acls.manageSystemACLs: true`) from the start - adding ACLs to an existing Consul cluster with data in it is significantly more complex.
- Use `connectInject.default: false` and enable injection per namespace with labels - this prevents accidental injection into system namespaces.
- Store the Consul gossip encryption key and root CA in Kubernetes Secrets managed by Flux's SOPS integration - never commit unencrypted secrets.
- Use Consul's built-in health checks alongside Kubernetes readiness probes for comprehensive service health visibility across both platforms.

## Conclusion

Deploying Consul Connect on Kubernetes with Flux CD gives your team a GitOps-managed service mesh that extends beyond Kubernetes to VMs and bare metal. Consul's configuration, server topology, and injection policies are all version-controlled, making infrastructure changes auditable and reproducible across the full breadth of your hybrid infrastructure.
