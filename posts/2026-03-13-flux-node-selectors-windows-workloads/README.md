# How to Use Node Selectors for Windows Workloads with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, Windows Containers, Node Selectors, GitOps, Scheduling

Description: Configure node selectors for Windows workloads in Flux-managed deployments, ensuring correct scheduling and leveraging Kustomize for DRY configuration.

---

## Introduction

Node selectors are the primary mechanism for directing Windows container workloads to Windows nodes in a Kubernetes cluster. Without explicit node selectors, Kubernetes may attempt to schedule a Windows container on a Linux node (or vice versa), causing immediate scheduling failure and confusing error messages.

In a Flux-managed environment, node selectors should be consistently applied across all Windows workloads. Kustomize's strategic merge patches and component overlays make it possible to define OS targeting once and apply it across many deployments without duplication.

This guide covers every type of node selector relevant to Windows workloads, from basic OS targeting to hardware-specific selectors for GPU or specialized Windows hardware, and shows how to apply them consistently through Flux.

## Prerequisites

- Kubernetes cluster with Windows node pools
- Flux CD managing the cluster
- `kubectl` access to verify node labels
- Git repository with Flux manifests

## Step 1: Understand Windows Node Labels

Windows nodes in Kubernetes carry specific labels that you can use for targeting.

```bash
# List all labels on a Windows node
kubectl describe node windows-worker-1 | grep -A 30 Labels

# Key labels for Windows targeting:
# kubernetes.io/os=windows               - OS type (most important)
# kubernetes.io/arch=amd64               - CPU architecture
# node.kubernetes.io/windows-build=10.0.20348  - Windows Server 2022 build number
# node.kubernetes.io/windows-build=10.0.17763  - Windows Server 2019 build number
# agentpool=winsystem                    - AKS node pool name (AKS-specific)
# kubernetes.azure.com/node-image-version=...  - AKS image version

# Common Windows build numbers:
# 10.0.17763 = Windows Server 2019
# 10.0.20348 = Windows Server 2022
```

## Step 2: Basic OS Node Selector

The minimum required node selector for any Windows workload:

```yaml
# apps/base/windows-workloads/base-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-app
  namespace: windows-workloads
spec:
  replicas: 2
  selector:
    matchLabels:
      app: windows-app
  template:
    metadata:
      labels:
        app: windows-app
    spec:
      # MINIMUM REQUIRED for Windows workloads
      nodeSelector:
        kubernetes.io/os: windows

      tolerations:
        - key: os
          value: windows
          effect: NoSchedule

      containers:
        - name: windows-app
          image: my-registry.example.com/windows/my-app:v1.0.0
          imagePullPolicy: IfNotPresent
```

## Step 3: Windows Server Version-Specific Selectors

Windows container images must match the host OS version. Target specific Windows Server builds to prevent scheduling mismatches.

```yaml
# Target Windows Server 2022 specifically
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: windows
        node.kubernetes.io/windows-build: "10.0.20348"  # Server 2022
```

```yaml
# Target Windows Server 2019 for older images
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: windows
        node.kubernetes.io/windows-build: "10.0.17763"  # Server 2019
```

## Step 4: Create a Reusable Kustomize Component for Windows Targeting

Instead of repeating node selector configuration in every deployment, create a Kustomize component.

```yaml
# components/windows-scheduling/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component
resources: []
patches:
  - patch: |-
      - op: add
        path: /spec/template/spec/nodeSelector
        value:
          kubernetes.io/os: windows
      - op: add
        path: /spec/template/spec/tolerations
        value:
          - key: os
            value: windows
            effect: NoSchedule
    target:
      kind: Deployment
      labelSelector: "os=windows"
```

Apply the component in overlays:

```yaml
# apps/overlays/production-windows/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/windows-workloads

# Apply the windows scheduling component to all matching deployments
components:
  - ../../../components/windows-scheduling
```

## Step 5: AKS-Specific Node Pool Targeting

In AKS, you may have multiple Windows node pools with different VM sizes (e.g., `Standard_D4s_v3` for general workloads, `Standard_NC6s_v3` for GPU workloads). Use `agentpool` labels to target specific pools.

```yaml
# Target a specific AKS node pool for GPU-enabled Windows workloads
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: windows
        agentpool: wingpu              # AKS GPU Windows node pool name
        accelerator: nvidia-gpu        # Hardware label for GPU nodes

      tolerations:
        - key: os
          value: windows
          effect: NoSchedule
        - key: nvidia.com/gpu
          operator: Exists
          effect: NoSchedule
```

## Step 6: Validate Node Selector Configuration via Flux

Add CI validation to catch missing or incorrect node selectors before they reach the cluster.

```yaml
# .github/workflows/validate-windows-workloads.yml
name: Validate Windows Workload Node Selectors

on:
  pull_request:
    paths:
      - 'apps/**/windows-*/**'
      - 'apps/base/windows-workloads/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check Windows deployments have node selectors
        run: |
          # Find all deployments labeled with os=windows
          MISSING_SELECTORS=0

          for file in $(grep -rl "os: windows" apps/ --include="*.yaml"); do
            if grep -q "kind: Deployment" "$file"; then
              if ! grep -q "kubernetes.io/os: windows" "$file"; then
                echo "ERROR: $file has os=windows label but missing nodeSelector"
                MISSING_SELECTORS=$((MISSING_SELECTORS + 1))
              fi
              if ! grep -q "tolerations:" "$file"; then
                echo "WARN: $file may be missing Windows tolerations"
              fi
            fi
          done

          if [ "$MISSING_SELECTORS" -gt 0 ]; then
            echo "Found $MISSING_SELECTORS deployments missing Windows node selectors"
            exit 1
          fi
          echo "All Windows deployments have correct node selectors"
```

Use Kyverno to enforce node selectors at the cluster level:

```yaml
# Kyverno policy managed by Flux to enforce Windows node selectors
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-windows-nodeselector
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-windows-nodeselector
      match:
        resources:
          kinds: ["Pod"]
          selector:
            matchLabels:
              os: windows
      validate:
        message: "Windows pods must include nodeSelector kubernetes.io/os: windows"
        pattern:
          spec:
            nodeSelector:
              kubernetes.io/os: windows
```

## Best Practices

- Always target a specific Windows Server build version to prevent image-host OS mismatches.
- Use Kustomize components for Windows scheduling configuration to avoid repeating it in every deployment.
- Validate node selectors in CI so incorrect configuration is caught before reaching the cluster.
- Use Kyverno or OPA policies to enforce correct node selectors at the admission level.
- Label Windows deployments with `os: windows` consistently so components and policies can target them.
- Document your node pool names and their hardware profiles in your repository README.

## Conclusion

Node selectors are the foundation of correct Windows workload scheduling in Kubernetes. By using Kustomize components to apply selectors consistently, validating in CI, and enforcing via admission policies, you eliminate an entire class of scheduling errors from your Windows container deployments. Flux's GitOps model means every Windows workload in the cluster always has the correct node targeting as defined in your Git repository.
