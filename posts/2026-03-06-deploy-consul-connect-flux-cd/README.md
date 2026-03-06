# How to Deploy Consul Connect with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Consul, Consul Connect, Service Mesh, GitOps, Kubernetes, HashiCorp

Description: A practical guide to deploying HashiCorp Consul Connect service mesh on Kubernetes using Flux CD and GitOps workflows.

---

## Introduction

Consul Connect is HashiCorp's service mesh solution that provides service-to-service networking capabilities including mTLS encryption, traffic management, and service discovery. When combined with Flux CD, you can manage your entire Consul Connect deployment through GitOps, ensuring consistent and auditable infrastructure changes.

This guide walks you through setting up Consul Connect on Kubernetes using Flux CD, from bootstrapping the Helm repository to configuring sidecar proxies and service intentions.

## Prerequisites

Before getting started, ensure you have the following:

- A Kubernetes cluster (v1.25 or later)
- Flux CD bootstrapped on the cluster
- kubectl configured to access your cluster
- A Git repository connected to Flux CD

## Setting Up the Consul Helm Repository

First, define a HelmRepository source so Flux can pull the official Consul Helm chart.

```yaml
# clusters/my-cluster/consul/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: hashicorp
  namespace: flux-system
spec:
  interval: 1h
  url: https://helm.releases.hashicorp.com
```

## Creating the Consul Namespace

Create a dedicated namespace for Consul components.

```yaml
# clusters/my-cluster/consul/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: consul
  labels:
    # Label for Flux to manage this namespace
    toolkit.fluxcd.io/tenant: infrastructure
```

## Deploying Consul with HelmRelease

Define the HelmRelease to deploy Consul with Connect enabled.

```yaml
# clusters/my-cluster/consul/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: consul
  namespace: consul
spec:
  interval: 30m
  chart:
    spec:
      chart: consul
      version: "1.4.x"
      sourceRef:
        kind: HelmRepository
        name: hashicorp
        namespace: flux-system
      interval: 12h
  values:
    # Global settings for the Consul deployment
    global:
      name: consul
      # Enable Consul datacenter awareness
      datacenter: dc1
      # Enable TLS for all Consul communication
      tls:
        enabled: true
        # Automatically manage TLS certificates
        enableAutoEncrypt: true
      # Enable access control lists for security
      acls:
        manageSystemACLs: true
    # Consul server configuration
    server:
      replicas: 3
      # Use persistent storage for server data
      storage: 10Gi
      storageClass: standard
      resources:
        requests:
          memory: "256Mi"
          cpu: "250m"
        limits:
          memory: "512Mi"
          cpu: "500m"
    # Enable Connect service mesh
    connectInject:
      enabled: true
      # Automatically inject Connect sidecars
      default: false
      # Configure resource limits for sidecar proxies
      sidecarProxy:
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "128Mi"
            cpu: "200m"
    # Consul client configuration
    client:
      enabled: true
      grpc: true
    # Enable the Consul UI
    ui:
      enabled: true
      service:
        type: ClusterIP
```

## Configuring a Kustomization for Consul

Use a Flux Kustomization to orchestrate the deployment order.

```yaml
# clusters/my-cluster/consul/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: consul
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: consul
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/consul
  prune: true
  # Wait for resources to become ready
  wait: true
  timeout: 10m
  # Health checks to verify the deployment
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: consul-consul-server
      namespace: consul
    - apiVersion: apps/v1
      kind: Deployment
      name: consul-consul-connect-injector
      namespace: consul
```

## Deploying a Service with Connect Sidecar

Once Consul Connect is running, annotate your application pods to inject the Connect sidecar proxy.

```yaml
# apps/my-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
      annotations:
        # Enable Connect sidecar injection for this pod
        consul.hashicorp.com/connect-inject: "true"
        # Define the upstream service to connect to
        consul.hashicorp.com/connect-service-upstreams: "api-service:8081"
    spec:
      containers:
        - name: web-app
          image: my-registry/web-app:v1.0.0
          ports:
            - containerPort: 8080
          env:
            # Connect to the upstream service via localhost
            - name: API_URL
              value: "http://localhost:8081"
          resources:
            requests:
              memory: "128Mi"
              cpu: "100m"
```

## Defining Service Intentions

Service intentions control which services are allowed to communicate with each other.

```yaml
# clusters/my-cluster/consul/intentions.yaml
apiVersion: consul.hashicorp.com/v1alpha1
kind: ServiceIntentions
metadata:
  name: api-service-intentions
  namespace: default
spec:
  # The destination service that traffic flows to
  destination:
    name: api-service
  sources:
    # Allow traffic from web-app to api-service
    - name: web-app
      action: allow
    # Deny all other traffic by default
    - name: "*"
      action: deny
```

## Configuring Service Defaults

Set default protocol and mesh gateway settings for your services.

```yaml
# clusters/my-cluster/consul/service-defaults.yaml
apiVersion: consul.hashicorp.com/v1alpha1
kind: ServiceDefaults
metadata:
  name: api-service
  namespace: default
spec:
  # Set the protocol for this service
  protocol: http
  # Configure mesh gateway mode
  meshGateway:
    mode: local
  # Expose health check endpoints through the proxy
  expose:
    checks: true
    paths:
      - path: /health
        localPathPort: 8080
        listenerPort: 20200
        protocol: http
```

## Managing Proxy Configuration

Define global proxy defaults that apply to all Connect sidecar proxies.

```yaml
# clusters/my-cluster/consul/proxy-defaults.yaml
apiVersion: consul.hashicorp.com/v1alpha1
kind: ProxyDefaults
metadata:
  name: global
  namespace: consul
spec:
  # Configure the default proxy behavior
  config:
    # Set the protocol for all proxies
    protocol: http
    # Configure Envoy access logging
    envoy_extra_static_clusters_json: |
      {
        "connect_timeout": "3.000s",
        "dns_lookup_family": "V4_ONLY"
      }
  # Configure mesh gateway defaults
  meshGateway:
    mode: local
  # Set default proxy resource exposure
  expose:
    checks: true
```

## Monitoring the Deployment

After committing the manifests, verify the deployment status using Flux CLI.

```bash
# Check the Kustomization reconciliation status
flux get kustomizations consul

# Check the HelmRelease status
flux get helmreleases -n consul

# Verify Consul server pods are running
kubectl get pods -n consul -l app=consul,component=server

# Check Connect injector is ready
kubectl get pods -n consul -l app=consul,component=connect-injector

# Verify service intentions are synced
kubectl get serviceintentions --all-namespaces
```

## Upgrading Consul with Flux CD

To upgrade Consul, update the chart version in the HelmRelease manifest.

```yaml
# Update the version constraint in helmrelease.yaml
spec:
  chart:
    spec:
      # Bump to the next minor version
      version: "1.5.x"
```

Commit and push this change. Flux will detect the update and perform a rolling upgrade of the Consul deployment.

## Troubleshooting Common Issues

If pods are not getting sidecar proxies injected, check the following:

```bash
# Verify the connect-injector webhook is registered
kubectl get mutatingwebhookconfigurations | grep consul

# Check connect-injector logs for errors
kubectl logs -n consul -l component=connect-injector --tail=50

# Ensure the pod annotation is correct
kubectl get pod <pod-name> -o jsonpath='{.metadata.annotations}'

# Force Flux to reconcile immediately
flux reconcile kustomization consul --with-source
```

## Summary

Deploying Consul Connect with Flux CD gives you a fully GitOps-managed service mesh. By storing all Consul configuration as Kubernetes manifests in Git, you gain version control, audit trails, and automated reconciliation. Key takeaways include using HelmRelease for the Consul deployment, ServiceIntentions for access control, and Flux health checks to ensure reliable rollouts.
