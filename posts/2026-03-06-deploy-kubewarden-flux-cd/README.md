# How to Deploy Kubewarden with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, kubewarden, policy engine, kubernetes, gitops, security

Description: A practical guide to deploying and managing Kubewarden policy engine using Flux CD for GitOps-driven policy enforcement in Kubernetes.

---

## Introduction

Kubewarden is a Kubernetes policy engine that uses WebAssembly (Wasm) modules to define and enforce policies. By combining Kubewarden with Flux CD, you can manage your policy infrastructure entirely through Git, ensuring that policy changes are version-controlled, auditable, and automatically reconciled.

This guide walks you through deploying Kubewarden using Flux CD, configuring policies declaratively, and managing the full lifecycle of your policy engine through GitOps.

## Prerequisites

Before getting started, make sure you have:

- A running Kubernetes cluster (v1.25+)
- Flux CD installed and bootstrapped
- kubectl configured to access your cluster
- A Git repository connected to Flux CD

## Setting Up the Repository Structure

Organize your Git repository to separate Kubewarden infrastructure from policy definitions.

```yaml
# Directory structure
# clusters/
#   my-cluster/
#     kubewarden/
#       namespace.yaml
#       helm-repository.yaml
#       helm-release-controller.yaml
#       helm-release-defaults.yaml
#       policies/
#         pod-privileged.yaml
#         trusted-registries.yaml
```

## Creating the Namespace

Start by creating a dedicated namespace for Kubewarden components.

```yaml
# clusters/my-cluster/kubewarden/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kubewarden
  labels:
    app.kubernetes.io/managed-by: flux
    app.kubernetes.io/part-of: kubewarden
```

## Adding the Kubewarden Helm Repository

Define the Helm repository source so Flux CD can pull the Kubewarden charts.

```yaml
# clusters/my-cluster/kubewarden/helm-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kubewarden
  namespace: kubewarden
spec:
  interval: 1h
  url: https://charts.kubewarden.io
```

## Deploying the Kubewarden Controller

The Kubewarden controller is the core component that manages policy servers and cluster admission policies.

```yaml
# clusters/my-cluster/kubewarden/helm-release-controller.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: kubewarden-controller
  namespace: kubewarden
spec:
  interval: 30m
  chart:
    spec:
      chart: kubewarden-controller
      version: ">=2.0.0 <3.0.0"
      sourceRef:
        kind: HelmRepository
        name: kubewarden
        namespace: kubewarden
      interval: 12h
  values:
    # Enable telemetry for monitoring policy decisions
    telemetry:
      enabled: true
      metrics:
        port: 8080
    # Configure resource limits for the controller
    resources:
      limits:
        cpu: 500m
        memory: 256Mi
      requests:
        cpu: 100m
        memory: 128Mi
```

## Deploying the Kubewarden Defaults

The defaults chart installs a default PolicyServer and recommended policies.

```yaml
# clusters/my-cluster/kubewarden/helm-release-defaults.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: kubewarden-defaults
  namespace: kubewarden
spec:
  interval: 30m
  # Ensure the controller is deployed first
  dependsOn:
    - name: kubewarden-controller
  chart:
    spec:
      chart: kubewarden-defaults
      version: ">=2.0.0 <3.0.0"
      sourceRef:
        kind: HelmRepository
        name: kubewarden
        namespace: kubewarden
      interval: 12h
  values:
    # Configure the default PolicyServer
    policyServer:
      replicas: 2
      resources:
        limits:
          cpu: "1"
          memory: 512Mi
        requests:
          cpu: 250m
          memory: 256Mi
```

## Defining a Custom PolicyServer

For production environments, you may want separate policy servers for different workload types.

```yaml
# clusters/my-cluster/kubewarden/policy-server-production.yaml
apiVersion: policies.kubewarden.io/v1
kind: PolicyServer
metadata:
  name: production
  namespace: kubewarden
spec:
  image: ghcr.io/kubewarden/policy-server:v1.15.0
  replicas: 3
  # Ensure high availability
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchLabels:
                app: kubewarden-policy-server-production
            topologyKey: kubernetes.io/hostname
  resources:
    limits:
      cpu: "2"
      memory: 1Gi
    requests:
      cpu: 500m
      memory: 512Mi
```

## Creating ClusterAdmissionPolicies

Define policies that enforce security standards across your cluster.

### Preventing Privileged Containers

```yaml
# clusters/my-cluster/kubewarden/policies/pod-privileged.yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: no-privileged-containers
  annotations:
    # Document the policy purpose
    kubewarden.io/description: "Prevents running privileged containers"
spec:
  policyServer: production
  module: registry://ghcr.io/kubewarden/policies/pod-privileged:v0.8.0
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations:
        - CREATE
        - UPDATE
  mutating: false
  # Apply to all namespaces except system namespaces
  namespaceSelector:
    matchExpressions:
      - key: kubernetes.io/metadata.name
        operator: NotIn
        values:
          - kube-system
          - kubewarden
```

### Enforcing Trusted Registries

```yaml
# clusters/my-cluster/kubewarden/policies/trusted-registries.yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: trusted-registries
  annotations:
    kubewarden.io/description: "Only allow images from trusted registries"
spec:
  policyServer: production
  module: registry://ghcr.io/kubewarden/policies/trusted-repos:v0.3.0
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations:
        - CREATE
        - UPDATE
  mutating: false
  settings:
    registries:
      - "ghcr.io/myorg/"
      - "docker.io/library/"
      - "registry.k8s.io/"
```

### Enforcing Resource Requests

```yaml
# clusters/my-cluster/kubewarden/policies/resource-requests.yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: require-resource-requests
  annotations:
    kubewarden.io/description: "Require CPU and memory requests on all containers"
spec:
  policyServer: production
  module: registry://ghcr.io/kubewarden/policies/container-resources:v0.3.0
  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations:
        - CREATE
  mutating: false
  settings:
    requireRequests: true
    requireLimits: false
    # Set default limits if not specified
    defaultRequests:
      cpu: "100m"
      memory: "128Mi"
```

## Wiring Everything Together with Kustomization

Use a Flux Kustomization to manage the deployment order and dependencies.

```yaml
# clusters/my-cluster/kubewarden/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kubewarden
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/kubewarden
  prune: true
  # Wait for resources to be ready before marking as reconciled
  wait: true
  timeout: 5m
  # Health checks to verify deployment
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: kubewarden-controller
      namespace: kubewarden
```

## Monitoring Policy Decisions

Create a Flux-managed monitoring configuration for Kubewarden.

```yaml
# clusters/my-cluster/kubewarden/monitoring/service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kubewarden-policy-server
  namespace: kubewarden
  labels:
    app: kubewarden
spec:
  selector:
    matchLabels:
      app: kubewarden-policy-server
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

## Verifying the Deployment

After committing and pushing your changes, verify that Flux has reconciled everything.

```bash
# Check the Flux Kustomization status
flux get kustomizations kubewarden

# Check the HelmRelease status
flux get helmreleases -n kubewarden

# Verify Kubewarden components are running
kubectl get pods -n kubewarden

# Check the policy server status
kubectl get policyservers

# List all cluster admission policies
kubectl get clusteradmissionpolicies

# Test a policy by trying to create a privileged pod
kubectl run test-privileged --image=nginx --privileged=true
# Expected: admission webhook denied the request
```

## Updating Policies Through Git

To update a policy, simply modify the YAML in your Git repository. Flux CD will detect the change and reconcile it automatically.

```bash
# Check the reconciliation status after a Git push
flux reconcile kustomization kubewarden --with-source

# View the events for a specific policy
kubectl describe clusteradmissionpolicy no-privileged-containers
```

## Troubleshooting

Common issues and their solutions:

```bash
# If the policy server is not starting, check its logs
kubectl logs -n kubewarden -l app=kubewarden-policy-server-production

# If policies are not being enforced, verify the policy status
kubectl get clusteradmissionpolicies -o wide
# The STATUS should be "active"

# If Flux is not reconciling, check for errors
flux get kustomizations kubewarden -o yaml

# Force a reconciliation
flux reconcile kustomization kubewarden --with-source
```

## Conclusion

Deploying Kubewarden with Flux CD brings the full power of GitOps to your Kubernetes policy management. Every policy change is tracked in Git, automatically applied, and continuously reconciled. This approach ensures your cluster security policies are consistent, auditable, and recoverable. With Kubewarden's WebAssembly-based policies and Flux CD's reconciliation loop, you have a robust foundation for enforcing security standards across your Kubernetes infrastructure.
