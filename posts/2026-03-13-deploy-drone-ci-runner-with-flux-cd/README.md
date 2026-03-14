# How to Deploy Drone CI Runner with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Drone CI, CI/CD, Continuous Integration

Description: Deploy Drone CI runners on Kubernetes using Flux CD so your pipeline workloads run in autoscaling pods fully managed through Git.

---

## Introduction

Drone CI is a lightweight, container-native CI/CD platform that executes each pipeline step inside its own Docker container. Its Kubernetes runner variant schedules pipeline jobs as native Kubernetes pods, making it an excellent fit for teams that want CI workloads to participate in cluster scheduling and resource management.

Using Flux CD to manage Drone runners means your runner fleet configuration is stored in Git alongside the rest of your infrastructure. Whether you are scaling from one runner to ten or adjusting CPU limits for build pods, every change goes through a pull request, is reviewed, and is applied by Flux without manual `helm upgrade` commands.

This guide deploys the Drone Kubernetes runner using its official Helm chart and wires the deployment to an existing Drone server.

## Prerequisites

- Kubernetes cluster (v1.26+) with Flux CD bootstrapped
- A running Drone server (self-hosted or Drone Cloud) with an RPC secret
- `flux` and `kubectl` CLIs configured
- Sealed Secrets or External Secrets Operator for managing the RPC secret

## Step 1: Create Namespace and RPC Secret

The Drone runner authenticates to the Drone server using a shared RPC secret. Store it as a Kubernetes secret.

```bash
kubectl create namespace drone

# Store the RPC secret (must match the Drone server's DRONE_RPC_SECRET)
kubectl create secret generic drone-rpc-secret \
  --namespace drone \
  --from-literal=DRONE_RPC_SECRET=your-shared-rpc-secret-here
```

## Step 2: Add the Drone Helm Repository

```yaml
# clusters/my-cluster/drone/helm-repository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: drone
  namespace: flux-system
spec:
  url: https://charts.drone.io
  interval: 12h
```

## Step 3: Deploy the Drone Kubernetes Runner

```yaml
# clusters/my-cluster/drone/drone-runner-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: drone-runner-kube
  namespace: drone
spec:
  interval: 10m
  chart:
    spec:
      chart: drone-runner-kube
      version: ">=0.1.0 <1.0.0"
      sourceRef:
        kind: HelmRepository
        name: drone
        namespace: flux-system
  values:
    # Drone server connection
    env:
      DRONE_RPC_HOST: drone.example.com
      DRONE_RPC_PROTO: https
      # Namespace where pipeline pods will be scheduled
      DRONE_NAMESPACE_DEFAULT: drone
      # How many concurrent pipelines the runner handles
      DRONE_RUNNER_CAPACITY: "4"
      # Use the runner name as a label for targeting
      DRONE_RUNNER_NAME: kube-runner

    # Load the RPC secret from the pre-created Kubernetes secret
    extraEnvFrom:
      - secretRef:
          name: drone-rpc-secret

    # RBAC so the runner can create/watch pods in the drone namespace
    rbac:
      buildNamespaces:
        - drone

    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 256Mi

    # Replica count — scale for higher concurrency
    replicaCount: 2
```

## Step 4: Configure Default Pipeline Pod Settings

You can supply a `drone-runner-kube` config map to define default resource requests for pipeline pods:

```yaml
# clusters/my-cluster/drone/runner-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: drone-runner-kube-config
  namespace: drone
data:
  config.yaml: |
    kind: pipeline
    type: kubernetes
    # Default resource profile applied to all steps
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: "1"
        memory: 1Gi
```

## Step 5: Create the Kustomization

```yaml
# clusters/my-cluster/drone/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: drone
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/drone
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: drone-runner-kube
      namespace: drone
```

## Step 6: Verify and Test

```bash
# Check Flux reconciliation
flux get helmreleases -n drone --watch

# Verify runner pods are running
kubectl get pods -n drone

# Check runner logs for successful registration with Drone server
kubectl logs -n drone -l app.kubernetes.io/name=drone-runner-kube -f
```

Create a `.drone.yml` in a repository connected to your Drone server:

```yaml
# .drone.yml
kind: pipeline
type: kubernetes
name: default

steps:
  - name: greeting
    image: alpine:3.19
    commands:
      - echo "Hello from Drone CI on Kubernetes!"
      - uname -a
```

Push a commit and watch pipeline pods appear in the `drone` namespace.

## Best Practices

- Set `DRONE_RUNNER_CAPACITY` based on your cluster's available CPU and memory—overcommitting leads to pending pods.
- Use `node_selector` in your `.drone.yml` to target specific node pools for builds that need GPU or high-memory nodes.
- Enable `DRONE_TRACE=true` temporarily on the runner pod to debug connectivity issues with the Drone server.
- Use `DRONE_LIMIT_REPOS` to restrict which repositories the runner will accept jobs from.
- Rotate the `DRONE_RPC_SECRET` periodically; update the Kubernetes secret and Flux will roll the runner pods.

## Conclusion

Drone CI runners are now deployed on Kubernetes and reconciled by Flux CD. Your runner fleet scales through Git—add replicas, adjust resource limits, or change the RPC host by opening a pull request. Pipeline pods appear and disappear automatically as builds are triggered, keeping your cluster resources efficient and your build infrastructure fully auditable.
