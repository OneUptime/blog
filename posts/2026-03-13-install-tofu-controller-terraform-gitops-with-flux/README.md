# How to Install Tofu Controller for Terraform GitOps with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Tofu Controller, Terraform, OpenTofu, GitOps, Kubernetes, Infrastructure as Code

Description: Install the Tofu Controller to enable Terraform and OpenTofu GitOps workflows with Flux CD, bringing infrastructure-as-code reconciliation into Kubernetes.

---

## Introduction

The Tofu Controller (formerly Terraform Controller) brings Terraform and OpenTofu execution into the Kubernetes reconciliation loop. Rather than running `terraform apply` in a CI/CD pipeline as an imperative step, the Tofu Controller watches Terraform resource objects and continuously reconciles actual infrastructure against the desired state declared in your Terraform modules. This is GitOps for Terraform.

Originally part of the Weave GitOps project, the Tofu Controller introduces a `Terraform` custom resource (using the `infra.contrib.fluxcd.io/v1alpha2` API) that references a Terraform module from a Flux source (a Git repository or an OCI artifact). When changes are pushed to the module, Flux detects them and the Tofu Controller plans and applies the changes automatically or waits for approval, depending on your configuration.

This guide installs the Tofu Controller using a Flux HelmRelease, setting up the foundation for Terraform GitOps workflows.

## Prerequisites

- Kubernetes cluster (v1.26 or later)
- Flux CD bootstrapped on the cluster
- `kubectl` and `flux` CLIs installed
- Git repository tracked by Flux

## Step 1: Add the Tofu Controller Helm Repository

```yaml
# infrastructure/tofu-controller/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: tofu-controller
  namespace: flux-system
spec:
  # Official Tofu Controller Helm chart repository
  url: https://weaveworks.github.io/tf-controller/
  interval: 10m
```

## Step 2: Create the Tofu Controller HelmRelease

```yaml
# infrastructure/tofu-controller/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: tofu-controller
  namespace: flux-system
spec:
  interval: 10m
  chart:
    spec:
      chart: tofu-controller
      # Pin to a specific version for reproducibility
      version: "0.16.x"
      sourceRef:
        kind: HelmRepository
        name: tofu-controller
        namespace: flux-system
  values:
    # Number of concurrent Terraform reconciliations
    concurrency: 4
    # Log verbosity (0=error, 1=warn, 2=info, 4=debug)
    logLevel: info
    # Resource requests and limits for the controller pod
    resources:
      limits:
        cpu: 1000m
        memory: 1Gi
      requests:
        cpu: 200m
        memory: 256Mi
    # Runner pods execute Terraform plans and applies
    runner:
      image:
        repository: ghcr.io/flux-iac/tofu-controller
        tag: ""  # Inherits from chart appVersion
      # Resource limits for runner pods
      resources:
        limits:
          cpu: 500m
          memory: 512Mi
        requests:
          cpu: 100m
          memory: 128Mi
    # Enable branch planner for PR-based plan previews
    branchPlanner:
      enabled: false  # Enable if you want plans on pull requests
```

## Step 3: Create the Flux Kustomization

```yaml
# clusters/my-cluster/infrastructure/tofu-controller.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tofu-controller
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/tofu-controller
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: tofu-controller
      namespace: flux-system
```

## Step 4: Verify the Installation

```bash
# Check that Flux reconciles the HelmRelease
flux get helmrelease tofu-controller -n flux-system

# Verify the controller pod is running
kubectl get pods -n flux-system -l app.kubernetes.io/name=tofu-controller

# Check the CRD was installed
kubectl get crd | grep infra.contrib.fluxcd.io

# List the Terraform API resources available
kubectl api-resources | grep infra.contrib.fluxcd.io
```

Expected CRDs after installation:
```
terraforms.infra.contrib.fluxcd.io
```

## Step 5: Create a Test Terraform Resource

Verify the controller works with a simple Terraform configuration.

```yaml
# First, create a GitRepository source pointing to a Terraform module
# infrastructure/tofu-controller/test-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: terraform-modules
  namespace: flux-system
spec:
  interval: 1m
  url: https://github.com/your-org/terraform-modules
  ref:
    branch: main
```

```yaml
# Test a simple Terraform resource (plan-only, no apply)
# infrastructure/tofu-controller/test-terraform.yaml
apiVersion: infra.contrib.fluxcd.io/v1alpha2
kind: Terraform
metadata:
  name: hello-world
  namespace: flux-system
spec:
  interval: 5m
  # Path to the Terraform module within the Git repository
  path: ./modules/hello-world
  sourceRef:
    kind: GitRepository
    name: terraform-modules
    namespace: flux-system
  # approvePlan: auto means auto-apply; set to manual for approval workflow
  approvePlan: "auto"
  # Workspace name (defaults to "default")
  workspace: hello-world
```

## Step 6: Check Tofu Controller Logs

```bash
# View controller logs to verify it is processing Terraform resources
kubectl logs -n flux-system \
  -l app.kubernetes.io/name=tofu-controller \
  --tail=50

# Check the status of a Terraform resource
kubectl get terraform hello-world -n flux-system

# Get detailed status including plan output
kubectl describe terraform hello-world -n flux-system
```

## Best Practices

- Set `concurrency` based on your cluster capacity. Each concurrent reconciliation spawns a runner pod that runs `terraform plan` or `terraform apply`.
- Use `version: "0.16.x"` with a patch wildcard to receive bug fixes automatically while avoiding minor version changes that could include breaking changes.
- Start with `approvePlan: manual` in staging environments to review plans before they are applied. Switch to `approvePlan: auto` in lower environments for faster iteration.
- Configure runner resource limits conservatively. Terraform operations that download large provider plugins can temporarily spike memory usage.
- Enable the branch planner if your team uses pull requests for infrastructure changes. It posts plan output as PR comments, enabling review before merge.

## Conclusion

The Tofu Controller is now installed and managed through Flux CD. You can begin defining Terraform resources as Kubernetes objects and the controller will continuously reconcile them. The next step is to create Terraform modules in your Git repository and reference them from Terraform custom resources, bringing your entire Terraform infrastructure under GitOps control.
