# Validation Summary: How to Version Dapr Components in Git

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (component manifests, state stores, pub/sub)
- Kubernetes (CRDs, namespaces, kubectl)
- Kustomize (base/overlay pattern, patches)
- External Secrets Operator
- Sealed Secrets (kubeseal)
- ArgoCD (GitOps deployment)
- GitHub Actions (CI validation)
- Git (tagging, version control)

## Sources Consulted
- Dapr Redis State Store documentation: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Redis Pub/Sub documentation: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Kustomize `bases` deprecation reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/bases/
- Kustomize GitHub issue #2243 on `bases` replacement: https://github.com/kubernetes-sigs/kustomize/issues/2243
- External Secrets Operator API reference: https://external-secrets.io/latest/api/externalsecret/
- ArgoCD Application specification: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Dapr components-contrib source code (redis settings): https://github.com/dapr/components-contrib

## Issues Found

### 1. Invalid `replicaCount` metadata field on Redis state store component
- **What was wrong:** The production overlay `statestore-patch.yaml` example included `replicaCount` as a metadata field on the `state.redis` Dapr component. This is not a valid metadata field for the Redis state store component. Redis replication is managed at the Redis server/cluster level, not through Dapr component metadata.
- **What was changed:** Removed the `replicaCount` metadata entry from the production overlay example.
- **Why:** Including an invalid field could mislead readers into thinking Dapr controls Redis replication, and Dapr silently ignores unrecognized metadata fields.

### 2. Deprecated `bases` field in Kustomize overlay
- **What was wrong:** The production overlay `kustomization.yaml` used the `bases` field to reference the base directory. The `bases` field has been deprecated since Kustomize v2.1.0 in favor of `resources`.
- **What was changed:** Replaced `bases:` with `resources:` in the overlay kustomization.yaml example.
- **Why:** Using deprecated fields in a guide about best practices is misleading. The `bases` field will not be included in the upcoming `kustomize.config.k8s.io/v1` API version.

### 3. Validation script path filter mismatch
- **What was wrong:** The validation script used `find . -name "*.yaml" -path "*/components/*"` but the proposed repository structure uses a directory named `dapr-components/`, not `components/`. The `-path "*/components/*"` glob would not match paths under `dapr-components/` because it looks for a directory literally named `components`.
- **What was changed:** Removed the `-path "*/components/*"` filter from the `find` command, relying on the existing `grep -q "kind: Component"` check inside the loop to filter for Dapr component files.
- **Why:** The original script would find zero files when used with the proposed directory structure, making the entire validation step a no-op.

## Review Notes
- The `kubectl apply --dry-run=client` validation in the CI workflow performs client-side validation only and does not require Dapr CRDs to be installed. It will validate basic YAML structure but not Dapr-specific field names or values. For deeper validation, consider using `dapr components validate` (if available) or a custom schema validation tool.
- The External Secrets Operator example uses `apiVersion: external-secrets.io/v1beta1`. The v1beta1 API is current but users should watch for GA promotion to v1.
- The ArgoCD Application uses `apiVersion: argoproj.io/v1alpha1` which is the current and correct API version.
