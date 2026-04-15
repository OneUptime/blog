# Validation Summary: How to Deploy Dapr on Google Kubernetes Engine (GKE)

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Dapr 1.13.0
- Google Kubernetes Engine (GKE)
- Google Cloud SDK (`gcloud` CLI)
- Helm v3
- Kubernetes
- Dapr Dashboard (separate Helm chart)
- Workload Identity Federation for GKE

## Sources Consulted
- Dapr Helm chart source (v1.13.0) — Chart.yaml, values.yaml, and subchart templates at https://github.com/dapr/dapr/tree/v1.13.0/charts/dapr
- Dapr HA mode documentation at https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/#high-availability-mode
- Dapr Dashboard Helm chart (separate from main dapr/dapr chart) at https://github.com/dapr/dashboard
- GKE documentation for `gcloud container clusters create` flags and Workload Identity at https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Dapr Kubernetes annotations reference at https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Configuration CRD (mTLS settings) at https://docs.dapr.io/operations/configuration/configuration-overview/

## Issues Found

### 1. HA mode expected pod output showed single replicas (FIXED)
**What was wrong:** The blog installed Dapr with `--set global.ha.enabled=true` but the expected `kubectl get pods` output showed only one replica of each control plane component (operator, sentry, sidecar-injector, placement-server). In HA mode, Dapr runs 3 replicas of each.

**What was changed:** Updated the expected output to show 3 replicas of dapr-operator, dapr-sentry, dapr-sidecar-injector, and 3 placement-server StatefulSet pods (placement-server-0, -1, -2).

**Why:** Showing single-replica output for an HA install is misleading — readers would think their HA setup is broken when they see 12+ pods instead of 5.

### 2. Dapr Dashboard listed as part of main Helm chart install (FIXED)
**What was wrong:** The expected pod output included `dapr-dashboard`, and Step 5 assumed the dashboard was already installed. However, the Dapr Dashboard is NOT included in the `dapr/dapr` Helm chart — it is a separate chart (`dapr/dapr-dashboard`).

**What was changed:** Removed `dapr-dashboard` from the expected pod output. Updated Step 5 to include the separate `helm install dapr-dashboard dapr/dapr-dashboard` command before the port-forward step.

**Why:** Without the separate install step, readers would not have the dashboard service available and the port-forward command would fail.

## Review Notes
- The post pins Dapr version 1.13.0. Newer versions (1.14+) are available. The Dapr Dashboard was deprecated in 1.14. Authors may want to update the version in a future revision.
- The `--num-nodes=3` flag on a regional GKE cluster applies per zone (3 zones), resulting in 9 total nodes. This is technically correct but could surprise readers unfamiliar with regional cluster behavior. A brief note could help.
- The `gcloud` command uses `--workload-pool=my-project.svc.id.goog` as a placeholder. Readers need to replace `my-project` with their actual GCP project ID. Similarly, `gcr.io/my-project/hello-dapr:latest` in Step 4 needs substitution.
- The Helm value paths `dapr_operator.logLevel` and `dapr_sentry.logLevel` were verified as correct for the Dapr 1.13.0 chart.
- The mTLS Configuration CRD YAML is correct for `dapr.io/v1alpha1`.
- All Dapr sidecar annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`, `dapr.io/log-level`) are correct.
