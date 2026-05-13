# How to Deploy Windows Container Workloads with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Windows Containers, GitOps, Windows Server, AKS

Description: Deploy Windows container workloads to Kubernetes using Flux CD, with correct node targeting, tolerations, and OS-specific configuration.

---

## Introduction

Windows containers enable organizations to run legacy Windows applications - IIS websites, .NET Framework services, Windows Communication Foundation APIs - in Kubernetes alongside Linux workloads. Microsoft Azure Kubernetes Service (AKS) and other managed Kubernetes platforms support mixed Windows and Linux node pools, making it possible to manage the entire application portfolio through a single orchestration platform.

Flux CD manages Windows container workloads the same way it manages Linux workloads - through GitOps reconciliation of Kubernetes manifests. The key differences are in the deployment manifests themselves: Windows workloads require specific node selectors, matching tolerations when Windows nodes are tainted, and Windows-compatible base images.

This guide covers the fundamentals of deploying Windows container workloads with Flux CD, from configuring the correct node targeting to managing Windows-specific resources.

## Prerequisites

- Kubernetes cluster with Windows node pools (AKS, EKS, or on-premises Windows Server nodes)
- Windows nodes running a currently supported Windows Server version, such as Windows Server 2022 or 2025 depending on your Kubernetes provider
- Flux CD bootstrapped on the cluster
- Git repository for manifests
- Container registry with Windows container images
- `flux` and `kubectl` CLI tools

## Step 1: Verify Windows Nodes Are Available

```bash
# Check that Windows nodes are present and ready

kubectl get nodes -L kubernetes.io/os

# Expected output:
# NAME                    STATUS   ROLES    AGE   VERSION   KUBERNETES.IO/OS
# linux-worker-1          Ready    <none>   10d   v1.35.0   linux
# linux-worker-2          Ready    <none>   10d   v1.35.0   linux
# windows-worker-1        Ready    <none>   10d   v1.35.0   windows
# windows-worker-2        Ready    <none>   10d   v1.35.0   windows

# Check Windows node taints, if your cluster taints Windows nodes
kubectl describe node windows-worker-1 | grep -A5 Taints
# Example: Taints: os=windows:NoSchedule
```

## Step 2: Repository Structure for Mixed Workloads

```plaintext
apps/
  base/
    windows-workloads/
      iis-app/
        deployment.yaml
        service.yaml
      dotnet-framework-service/
        deployment.yaml
        service.yaml
    linux-workloads/
      api-gateway/
        deployment.yaml
  overlays/
    production/
      windows-workloads/
        kustomization.yaml
      linux-workloads/
        kustomization.yaml
```

## Step 3: Create a Windows Deployment Manifest

Windows deployments require specific node selectors to schedule on Windows nodes. If your Windows nodes are tainted, include a matching toleration.

```yaml
# apps/base/windows-workloads/iis-app/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iis-app
  namespace: windows-workloads
  labels:
    app: iis-app
    os: windows
spec:
  replicas: 2
  selector:
    matchLabels:
      app: iis-app
  template:
    metadata:
      labels:
        app: iis-app
        os: windows
    spec:
      # REQUIRED: Target Windows nodes specifically
      nodeSelector:
        kubernetes.io/os: windows
        # Optionally target specific Windows Server versions
        # node.kubernetes.io/windows-build: "10.0.20348"  # Server 2022

      # REQUIRED when Windows nodes are tainted this way
      tolerations:
        - key: os
          operator: Equal
          value: windows
          effect: NoSchedule

      containers:
        - name: iis
          # Use a Windows Server Core or Nano Server base image
          image: mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 80
              protocol: TCP
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
            limits:
              cpu: 1000m
              memory: 2Gi
          readinessProbe:
            httpGet:
              path: /
              port: 80
            # Windows containers have longer startup times
            initialDelaySeconds: 60
            periodSeconds: 15
            failureThreshold: 5
          livenessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 90
            periodSeconds: 30
            failureThreshold: 3
      # Init containers, if used, must also use Windows-compatible images
```

## Step 4: Configure Flux Kustomization for Windows Workloads

```yaml
# clusters/production/windows-workloads.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: windows-workloads
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/overlays/production/windows-workloads
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Windows pods take longer to start - generous health check timeouts
  timeout: 10m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: iis-app
      namespace: windows-workloads
    - apiVersion: apps/v1
      kind: Deployment
      name: dotnet-framework-service
      namespace: windows-workloads
```

## Step 5: Handle Windows-Specific Image Pull Configuration

Windows container images are significantly larger than Linux images. Configure appropriate shutdown grace periods and image pull policies.

```yaml
# apps/base/windows-workloads/iis-app/deployment.yaml additions
spec:
  template:
    spec:
      # Shutdown grace period for Windows containers
      terminationGracePeriodSeconds: 120  # Windows containers need more time to shut down

      containers:
        - name: iis
          image: my-registry.example.com/windows/my-iis-app:v1.2.3
          # IfNotPresent avoids re-pulling large Windows images
          imagePullPolicy: IfNotPresent
```

Configure the registry credentials for Windows node image pulls:

```bash
# Create registry credential secret
kubectl create secret docker-registry windows-registry-secret \
  -n windows-workloads \
  --docker-server=my-registry.example.com \
  --docker-username="$REGISTRY_USER" \
  --docker-password="$REGISTRY_PASSWORD"
```

```yaml
# Reference in deployment
spec:
  template:
    spec:
      imagePullSecrets:
        - name: windows-registry-secret
```

## Step 6: Validate Deployment on Windows Nodes

```bash
# Verify pods are scheduled on Windows nodes
kubectl get pods -n windows-workloads -o wide
# The NODE column should show windows-worker nodes

# Check Windows pod status
kubectl describe pod iis-app-xxx -n windows-workloads

# Test connectivity
kubectl port-forward svc/iis-app 8080:80 -n windows-workloads
curl http://localhost:8080/

# Watch Flux reconciliation
flux get kustomizations -A --watch
```

## Best Practices

- Always include `nodeSelector: kubernetes.io/os: windows`, and include the matching OS toleration when your Windows nodes are tainted.
- Use currently supported Windows Server images, such as Windows Server 2022 or 2025 where your Kubernetes provider supports them.
- Set generous `initialDelaySeconds` for probes - Windows containers typically take 60-120 seconds to start.
- Use `IfNotPresent` image pull policy; Windows images are often several GB and repulling is expensive.
- Keep Windows workload manifests in a dedicated directory separate from Linux workloads for clarity.
- Test Windows deployments in a staging environment first - the image version must match the node OS version.

## Conclusion

Deploying Windows container workloads with Flux CD follows the same GitOps principles as Linux workloads, with the critical addition of Windows-specific node selectors and matching tolerations when nodes are tainted. Flux manages the reconciliation loop, ensuring Windows workloads are always running the correct version as defined in Git. The longer startup times and larger image sizes of Windows containers require some configuration adjustments, but the overall workflow is consistent and manageable.
