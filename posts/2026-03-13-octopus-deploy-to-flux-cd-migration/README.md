# How to Migrate from Octopus Deploy to Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Octopus Deploy, Migration, GitOps, Kubernetes, CI/CD, Deployment

Description: Learn how to migrate from Octopus Deploy to Flux CD GitOps for Kubernetes workloads, covering tentacle removal, Helm chart migration, and environment promotion.

---

## Introduction

Octopus Deploy is a mature CD platform traditionally used for Windows and .NET deployments, increasingly adopted for Kubernetes through its Kubernetes step library. Migrating to Flux CD shifts Kubernetes deployments to a GitOps model without tentacles or a central Octopus server, reducing infrastructure overhead and removing the last non-GitOps piece of your Kubernetes deployment stack.

## Prerequisites

- Octopus Deploy instance with Kubernetes deployment targets
- Kubernetes clusters with kubectl access
- Flux CD bootstrapped on target clusters
- Understanding of Octopus projects, channels, and environments

## Step 1: Inventory Octopus Kubernetes Deployments

```bash
# Use Octopus REST API to inventory Kubernetes deployments
curl -H "X-Octopus-ApiKey: API-XXXXXXXX" \
  https://your-octopus.example.com/api/deploymentprocesses \
  | jq '.Items[] | select(.Steps[].Actions[].ActionType | contains("Kubernetes"))' \
  > kubernetes-deployments.json

# Document per project:
# - Helm chart source URL and version
# - Values files location
# - Environment-specific variable values
# - Deployment step type (Helm, Kubectl, Raw YAML)
```

## Step 2: Map Octopus Concepts to Flux

```
Octopus Concept                 Flux CD Equivalent
──────────────────────────────  ───────────────────────────────
Project                    ──►  GitRepository + set of Kustomizations
Environment                ──►  Cluster path in fleet repo
Channel                    ──►  Git branch or SemVer range
Lifecycle (Env promotion)  ──►  Git-based promotion (PR flow)
Variable sets              ──►  Flux postBuild.substitute + Secrets
Deployment Step (Helm)     ──►  HelmRelease
Deployment Step (Kubectl)  ──►  Kustomization
Manual Intervention        ──►  Fleet repo PR approval
Runbooks                   ──►  Separate Kustomizations or Jobs
```

## Step 3: Convert Octopus Helm Step to Flux HelmRelease

**Octopus Helm Upgrade Step** (configuration):

```
Chart: myapp
Repository: https://charts.your-org.com
Version: #{Octopus.Release.Number}
Values:
  image.tag: #{Octopus.Release.Number}
  replicaCount: #{ReplicaCount}
  ingress.host: #{IngressHost}
```

**Flux HelmRelease equivalent**:

```yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: myapp
  namespace: production
spec:
  interval: 10m
  chart:
    spec:
      chart: myapp
      version: "1.5.3"  # Pinned version (was #{Octopus.Release.Number})
      sourceRef:
        kind: HelmRepository
        name: your-org-charts
  values:
    image:
      tag: "1.5.3"      # Updated by Flux Image Automation
    replicaCount: 3       # Was #{ReplicaCount}
    ingress:
      host: myapp.production.example.com  # Was #{IngressHost}
```

## Step 4: Replace Octopus Variable Sets with Flux Secrets

Octopus variable sets store environment-specific configuration. In Flux, use ConfigMaps and Secrets:

```yaml
# Replace Octopus variable set with Flux variable substitution
apiVersion: v1
kind: ConfigMap
metadata:
  name: environment-vars
  namespace: flux-system
data:
  REPLICA_COUNT: "3"
  INGRESS_HOST: "myapp.production.example.com"
  LOG_LEVEL: "info"
---
# Secret for sensitive values (use SOPS to encrypt)
apiVersion: v1
kind: Secret
metadata:
  name: environment-secrets
  namespace: flux-system
stringData:
  DB_PASSWORD: "encrypted-with-sops"
  API_KEY: "encrypted-with-sops"
```

Reference in Kustomization:

```yaml
spec:
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: environment-vars
      - kind: Secret
        name: environment-secrets
```

## Step 5: Replace Octopus Lifecycle (Environment Promotion)

Octopus Lifecycles define which environments a release can be promoted through. In Flux, model this as a fleet repository branch or directory promotion strategy:

```bash
#!/bin/bash
# promote.sh - Promote image from staging to production
# This replaces Octopus Deploy lifecycle promotion

IMAGE_TAG=$1
echo "Promoting myapp:$IMAGE_TAG from staging to production"

# Clone fleet repo
git clone https://github.com/your-org/fleet-repo.git /tmp/fleet
cd /tmp/fleet

# Create promotion branch
git checkout -b "promote/myapp-${IMAGE_TAG}-to-production"

# Update production HelmRelease
sed -i "s/tag: .*/tag: \"$IMAGE_TAG\"/" apps/myapp/production/helmrelease.yaml

# Commit and create PR
git add apps/myapp/production/helmrelease.yaml
git commit -m "chore: promote myapp to $IMAGE_TAG in production"
git push origin "promote/myapp-${IMAGE_TAG}-to-production"

gh pr create \
  --title "Promote myapp $IMAGE_TAG to production" \
  --body "Automated promotion from staging. Verified by smoke tests." \
  --base main
```

## Step 6: Remove Octopus Tentacles

After migrating all deployments to Flux:

```bash
# Disable Octopus deployment targets (Kubernetes namespaces)
# In Octopus UI: Infrastructure → Deployment Targets → disable each K8s target

# Verify Flux is managing all resources
kubectl get all -n production \
  -l 'kustomize.toolkit.fluxcd.io/name' --no-headers | wc -l

# After full validation, remove Octopus Kubernetes health check Jobs
kubectl delete jobs -n production -l 'octopus/deployment-target'

# Unregister tentacle worker if present
# kubectl delete deployment octopus-tentacle -n octopus
```

## Best Practices

- Run Octopus and Flux in parallel for 2-4 weeks before removing Octopus from Kubernetes targets.
- Map Octopus channels to Git branches only if you actually need branch-based deployment strategies; most teams can use a single main branch with environment paths.
- Replace Octopus Runbooks with Kubernetes Jobs managed by Flux or with separate operational scripts.
- Document the Octopus variable name to Flux ConfigMap/Secret key mapping for the operations team.

## Conclusion

Migrating from Octopus Deploy to Flux CD removes a central CD server from your Kubernetes infrastructure stack. The GitOps model is a natural evolution for teams already using Kubernetes, and the fleet repository provides a cleaner audit trail than Octopus deployment logs. The migration effort is proportional to the number of Octopus variable sets and lifecycle stages used; simpler setups migrate faster.
