# How to Migrate from Spinnaker Pipelines to Flux GitOps

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Spinnaker, Migration, GitOps, Kubernetes, CI/CD, Pipeline

Description: Learn how to migrate from Spinnaker deployment pipelines to Flux CD GitOps workflows, mapping Spinnaker stages to GitOps equivalents.

---

## Introduction

Spinnaker is a mature, multi-cloud CD platform with rich pipeline primitives: stages, conditions, parallel branches, approval gates, and deployment strategies. Migrating from Spinnaker to Flux CD is a significant architectural shift—from imperative pipeline execution to declarative GitOps reconciliation. Understanding the mapping between Spinnaker concepts and Flux CD primitives is the first step.

## Prerequisites

- Spinnaker instance managing Kubernetes deployments
- Kubernetes clusters accessible with kubectl
- Flux CD bootstrapped on target clusters
- A Git repository for fleet configuration

## Step 1: Inventory Spinnaker Pipelines

```bash
# Export all Spinnaker applications and pipelines via the Gate API
curl -X GET https://spinnaker-gate.your-org.com/applications \
  -H "Authorization: Bearer $SPINNAKER_TOKEN" > spinnaker-apps.json

# Export pipelines for each application
for app in $(cat spinnaker-apps.json | jq -r '.[].name'); do
  curl -X GET "https://spinnaker-gate.your-org.com/applications/$app/pipelineConfigs" \
    -H "Authorization: Bearer $SPINNAKER_TOKEN" > pipelines/$app.json
  echo "Exported: $app"
done
```

## Step 2: Map Spinnaker Stages to Flux Concepts

```
Spinnaker Stage                   Flux CD Equivalent
──────────────────────────────    ──────────────────────────────────
Deploy (Manifest)         ──►     Kustomization or HelmRelease
Deploy (Helm Chart)       ──►     HelmRelease
Bake (Helm)               ──►     CI builds chart, HelmRepository
Wait for Judgment         ──►     Manual PR approval or suspend/resume
Check Preconditions       ──►     Kustomization dependsOn + health checks
Run Job                   ──►     Separate Kustomization with Job
Webhook                   ──►     Flux Notification Controller
Find Image from Tag       ──►     ImageRepository + ImagePolicy
Rollback Cluster          ──►     git revert + Flux reconcile
Canary Analysis           ──►     Flagger Canary resource
```

## Step 3: Convert a Basic Deploy Stage

**Spinnaker Deploy Manifest Stage**:

```json
{
  "type": "deployManifest",
  "name": "Deploy myapp",
  "account": "production-k8s",
  "cloudProvider": "kubernetes",
  "namespaceOverride": "myapp",
  "manifests": [
    {
      "apiVersion": "apps/v1",
      "kind": "Deployment",
      "metadata": {"name": "myapp"},
      "spec": {"template": {"spec": {"containers": [{"name": "myapp", "image": "your-org/myapp:${ trigger.tag }"}]}}}
    }
  ]
}
```

**Flux CD Equivalent**:

```yaml
# Fleet repo structure: apps/myapp/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: myapp
spec:
  template:
    spec:
      containers:
        - name: myapp
          image: ghcr.io/your-org/myapp:1.0.0 # {"$imagepolicy": "flux-system:myapp"}
---
# Flux Kustomization
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/myapp
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  targetNamespace: myapp
```

## Step 4: Convert Manual Judgment Stage

Spinnaker's Manual Judgment stage pauses the pipeline for human approval. In Flux, implement this as a PR approval gate:

```yaml
# Branch protection rule in GitHub: require PR review before merging to main
# The CI pipeline updates image tags in a PR, not directly to main
# A human reviews and merges the PR, which triggers Flux reconciliation
```

Or use Flux's suspend/resume for operational gates:

```bash
# Operations team suspends Flux during business review
flux suspend kustomization myapp-staging -n flux-system

# After approval, resume
flux resume kustomization myapp-staging -n flux-system
```

## Step 5: Convert Spinnaker Pipelines Stages to Flux Ordering

```yaml
# Spinnaker pipeline: stage1 → stage2 → stage3
# Flux equivalent using dependsOn

apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: stage-1-infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: stage-2-database
  namespace: flux-system
spec:
  interval: 10m
  path: ./databases
  dependsOn:
    - name: stage-1-infrastructure
  sourceRef:
    kind: GitRepository
    name: fleet-repo
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: stage-3-application
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/myapp
  dependsOn:
    - name: stage-2-database
  sourceRef:
    kind: GitRepository
    name: fleet-repo
```

## Step 6: Migrate Canary Deployments

Spinnaker has a built-in Canary Analysis stage. Replace with Flagger:

```yaml
# Replace Spinnaker Canary Analysis stage with Flagger Canary
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: myapp
  namespace: myapp
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
```

## Best Practices

- Map Spinnaker Applications to Git repository paths in the fleet repository for clear organization.
- Replace Spinnaker secrets (Kubernetes account credentials) with in-cluster Flux operation using service accounts.
- Migrate staging pipelines first; Spinnaker's multi-environment pipeline model maps to separate fleet repository paths or branches.
- Keep Spinnaker running in read-only mode during the migration to compare deployment histories.
- Document the mapping between Spinnaker pipeline IDs and Flux Kustomization names for the operations team.

## Conclusion

Migrating from Spinnaker to Flux CD is a fundamental change in deployment philosophy: from a pipeline that executes imperatively to a reconciliation loop that applies declaratively. The gains are significant—no more pipeline server to maintain, no single point of failure for deployments, and a full Git audit trail. The migration requires redesigning deployment workflows as GitOps structures rather than converting pipelines one-to-one.
