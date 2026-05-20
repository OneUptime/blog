# Validation Summary: How to Export ArgoCD Applications for Backup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes custom resources
- kubectl
- Argo CD CLI
- Argo CD REST API
- Bash
- jq
- Python
- YAML / JSON
- Git

## Sources Consulted
- Argo CD `argocd admin export` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_export/
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Python 3.12 datetime documentation / deprecations: https://docs.python.org/3.12/whatsnew/3.12.html

## Issues Found
- The metadata cleanup `jq` filter used `.metadata.annotations | to_entries`, which fails when an Application has no annotations. Changed it to `(.metadata.annotations // {}) | to_entries` so exports work for unannotated Applications.
- The API export command wrote one JSON object per Application to a `.json` file, which is not a single valid JSON document. Changed the `jq` filter to emit a JSON array of Applications.
- The Python usage example referenced `token` without defining it. Added `token = os.environ["ARGOCD_TOKEN"]` before constructing the exporter.
- The Python script used `datetime.utcnow()`, which is deprecated in Python 3.12. Replaced it with `datetime.now(timezone.utc).isoformat()` and imported `timezone`.
- The Python `export_diff` method did not check the HTTP status before reading the applications response. Added `resp.raise_for_status()` to match the safer handling used in `export_all`.

## Review Notes
- `kubectl` and `argocd` were not installed in the local environment, so CLI command verification was performed against the official Kubernetes and Argo CD command references.
- The examples assume the Argo CD control plane namespace is `argocd`; this is common but deployments using another namespace should pass or update the namespace value.
- The API examples use `-k` / `verify = False`, which is acceptable for lab environments with self-signed certificates but should be replaced with certificate verification in production.
