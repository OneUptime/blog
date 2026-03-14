# How to Configure Resource Requests and Limits Best Practices with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Resource Management, Cost Management, LimitRange, ResourceQuota, Kustomize

Description: Enforce resource request and limit best practices across Flux-managed Kubernetes workloads using LimitRange, ResourceQuota, and policy validation to prevent cost overruns.

---

## Introduction

Misconfigured resource requests and limits are one of the most common causes of both cost overruns and cluster instability in Kubernetes. Without requests, the scheduler cannot make informed placement decisions. Without limits, a single misbehaving pod can starve neighboring workloads of memory. In large clusters running dozens of applications, tracking these settings manually across teams is impractical.

Flux CD gives you the tools to enforce resource governance at scale. By committing LimitRange and ResourceQuota resources to Git alongside your application manifests, you ensure that every namespace has sensible defaults and hard caps before any workload is ever scheduled. Changes to these policies go through code review, providing a governance layer that manual kubectl commands never can.

This guide demonstrates how to implement a complete resource governance strategy using Flux CD Kustomizations, including default LimitRanges, namespace-level ResourceQuotas, and validation tooling that prevents under-specified workloads from reaching production.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- kubectl with cluster-admin access
- A Git repository connected to Flux CD
- Basic understanding of Kubernetes resource concepts (requests, limits, QoS classes)
- Kustomize installed locally for testing overlays

## Step 1: Define a Base LimitRange

Create a base LimitRange that applies sensible defaults to every container in a namespace. This prevents pods without explicit resource settings from consuming unbounded resources.

```yaml
# infrastructure/policies/base/limitrange.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-resource-limits
  # Namespace will be set by Kustomize overlays
spec:
  limits:
    # Default container limits and requests
    - type: Container
      default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      max:
        cpu: "4"
        memory: 4Gi
      min:
        cpu: 10m
        memory: 16Mi
    # Limit individual Pod totals
    - type: Pod
      max:
        cpu: "8"
        memory: 8Gi
    # Limit PersistentVolumeClaim sizes
    - type: PersistentVolumeClaim
      max:
        storage: 50Gi
      min:
        storage: 1Gi
```

## Step 2: Define ResourceQuotas per Team Namespace

ResourceQuotas enforce hard limits on total resource consumption within a namespace, protecting other tenants in a shared cluster.

```yaml
# infrastructure/policies/base/resourcequota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: namespace-quota
spec:
  hard:
    # Compute resource limits
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    # Object count limits
    pods: "50"
    services: "20"
    persistentvolumeclaims: "10"
    secrets: "50"
    configmaps: "50"
    # Restrict LoadBalancer services (cost impact)
    services.loadbalancers: "2"
    services.nodeports: "0"
```

## Step 3: Create Kustomize Overlays for Different Teams

Use Kustomize overlays to apply different quota tiers to different teams without duplicating YAML.

```yaml
# infrastructure/policies/teams/backend/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base/limitrange.yaml
  - ../../base/resourcequota.yaml
namespace: backend
patches:
  - target:
      kind: ResourceQuota
      name: namespace-quota
    patch: |
      - op: replace
        path: /spec/hard/requests.cpu
        value: "20"
      - op: replace
        path: /spec/hard/requests.memory
        value: 40Gi
      - op: replace
        path: /spec/hard/limits.cpu
        value: "40"
      - op: replace
        path: /spec/hard/limits.memory
        value: 80Gi
```

## Step 4: Apply Policies with Flux Kustomizations

Create Flux Kustomization resources for each team's policy set, ensuring policies are applied before application workloads.

```yaml
# clusters/production/policies-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-policies
  namespace: flux-system
spec:
  interval: 5m
  path: ./infrastructure/policies/teams
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # Policies must be applied before any application workloads
  # Application Kustomizations should declare dependsOn: team-policies
  healthChecks:
    - apiVersion: v1
      kind: ResourceQuota
      name: namespace-quota
      namespace: backend
    - apiVersion: v1
      kind: ResourceQuota
      name: namespace-quota
      namespace: frontend
```

## Step 5: Validate Workloads Before Commit

Add a CI validation step that rejects manifests missing resource specifications.

```bash
#!/bin/bash
# scripts/validate-resources.sh
# Run this in CI to catch missing resource specs before they reach Git

set -euo pipefail

echo "Validating resource requests and limits..."

# Use kubeval or kubeconform to validate manifests
find ./apps -name "*.yaml" | while read -r file; do
  # Check for containers without resource requests
  if grep -q "containers:" "$file"; then
    if ! grep -q "resources:" "$file"; then
      echo "ERROR: $file contains containers without resource specifications"
      exit 1
    fi
  fi
done

echo "All manifests pass resource validation"
```

```yaml
# .github/workflows/validate.yaml
name: Validate Kubernetes Manifests
on: [pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate resource specs
        run: bash scripts/validate-resources.sh
      - name: Run kubeconform
        run: |
          kubeconform -strict -summary ./apps/
```

## Best Practices

- Always set both requests and limits; pods with only requests but no limits receive Burstable QoS and can be evicted under memory pressure.
- Use the same value for CPU requests and limits only when you need Guaranteed QoS; for most web services, CPU throttling is preferable to OOMKills.
- Regularly audit namespace quotas with `kubectl describe resourcequota -A` and adjust based on actual usage data from Kubecost or OpenCost.
- Apply LimitRanges before deploying applications - once pods are running without resources, restarting them to apply defaults can cause brief outages.
- Use Kyverno or OPA Gatekeeper as a complement to LimitRanges to enforce that all manifests explicitly specify resources rather than relying on defaults.
- Tag all ResourceQuotas and LimitRanges with team and cost-center labels to enable chargeback reporting.

## Conclusion

Resource governance through Flux CD transforms an often-neglected operational concern into a first-class GitOps workflow. Every quota change is reviewed, every default is documented in code, and every team's resource consumption is bounded by policy. Combined with cost monitoring tools like Kubecost or OpenCost, this approach gives your organization both the guardrails to prevent runaway costs and the visibility to optimize what remains.
