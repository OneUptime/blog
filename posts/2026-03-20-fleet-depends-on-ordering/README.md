# How to Configure Fleet Depends-On for Deployment Ordering - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, Rancher, GitOps, Kubernetes, Deployment Ordering, Dependencies, SUSE Rancher

Description: Learn how to use Fleet's dependsOn feature to control the deployment order of bundles so that infrastructure components are deployed before the applications that depend on them.

---

Fleet's `dependsOn` feature allows you to specify that one bundle must reach an accepted state before another bundle starts deploying. By default, Fleet treats `Ready` as the accepted state. This is essential when applications depend on infrastructure components like databases, operators, or CRDs.

---

## Why Deployment Ordering Matters

Without ordering control, Fleet may deploy an application before its database is ready, causing startup failures. Common ordering requirements:

- Deploy CRDs before operators that use them
- Deploy a database before the application that connects to it
- Deploy cert-manager before applications that require certificates
- Deploy ingress controller before ingress resources

---

## Step 1: Configure dependsOn in fleet.yaml

The `dependsOn` directive tells Fleet to wait for named bundles to reach an accepted state before deploying this bundle. By default, the accepted state is `Ready`:

```yaml
# apps/my-api/fleet.yaml

defaultNamespace: my-app

# This bundle depends on the database bundle being deployed first
dependsOn:
  - name: my-database   # name of the Bundle resource (set via `name:` or computed from GitRepo + path)

helm:
  chart: ./chart
  releaseName: my-api
  valuesFiles:
    - values.yaml
```

---

## Step 2: Structure Your GitRepo for Ordered Deployment

Organize your repository paths to map to separate bundles. If you want stable, human-readable dependency names, set `name:` explicitly in each `fleet.yaml`:

```text
infrastructure/
  cert-manager/
    fleet.yaml          # Example explicit name: infra-cert-manager
  ingress-nginx/
    fleet.yaml          # Example explicit name: infra-ingress-nginx, depends on cert-manager

databases/
  postgres/
    fleet.yaml          # Example explicit name: db-postgres, depends on infra-*

apps/
  api-service/
    fleet.yaml          # Example explicit name: app-api-service, depends on db-postgres
  frontend/
    fleet.yaml          # Example explicit name: app-frontend, depends on app-api-service
```

---

## Step 3: Multi-Level Dependencies

```yaml
# apps/frontend/fleet.yaml
defaultNamespace: frontend

# Frontend depends on both the API and ingress being ready
dependsOn:
  - name: app-api-service
  - name: infra-ingress-nginx

helm:
  chart: ./chart
```

---

## Step 4: Referencing Bundles from Other Repos

If you do not set `name:` explicitly and need to depend on a bundle from a different `GitRepo`, use the full computed bundle name:

```bash
# By default, Fleet bundle names are computed from the GitRepo name and bundle path
# Format: <gitrepo-name>-<path-slug>

# List bundle names to find the correct reference
kubectl get bundle -n fleet-default

# Example output if the GitRepo names are "infrastructure" and "databases":
# infrastructure-cert-manager
# infrastructure-ingress-nginx
# databases-postgres
```

```yaml
# apps/my-api/fleet.yaml
dependsOn:
  - name: databases-postgres   # Full bundle name
```

---

## Step 5: Monitor Dependency Resolution

```bash
# Check bundle status, ready targets, and current Ready condition message
kubectl get bundles.fleet.cattle.io -n fleet-default \
  -o custom-columns='NAME:.metadata.name,READY_CLUSTERS:.status.display.readyClusters,READY:.status.conditions[?(@.type=="Ready")].status,MESSAGE:.status.conditions[?(@.type=="Ready")].message'

# Describe a bundle to see why it's waiting
kubectl describe bundle app-api-service -n fleet-default | grep -A 10 "Conditions"
```

---

## Best Practices

- Keep dependency chains shallow - deep dependency chains are harder to debug and can cause long deployment delays.
- Use `dependsOn` for hard dependencies (app cannot start without it), not soft dependencies.
- Test your dependency ordering by deploying to a clean cluster and watching the bundle deployment sequence.
- Document the dependency graph in your repository README so the ordering is visible to all team members.
