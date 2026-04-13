# Validation Summary: How to Use Helm Charts for MongoDB Deployment

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Helm 3.x
- Kubernetes (StatefulSets, Services, PVCs, Secrets)
- Bitnami MongoDB Helm chart
- Prometheus metrics / ServiceMonitor
- AWS Network Load Balancer (external access example)

## Sources Consulted
- Bitnami MongoDB Helm chart official values.yaml: https://github.com/bitnami/charts/tree/main/bitnami/mongodb
- Helm 3 official documentation: https://helm.sh/docs/
- Kubernetes StatefulSet and Service documentation: https://kubernetes.io/docs/

## Issues Found
1. **Deprecated auth fields (singular form)**: The values.yaml example used `auth.username`, `auth.password`, and `auth.database` (singular string fields), which are deprecated in recent Bitnami MongoDB chart versions (13.x+). Changed to the current plural/array form: `auth.usernames`, `auth.passwords`, and `auth.databases`. The singular forms still exist for backward compatibility but are explicitly marked deprecated in the chart's values.yaml.

## Review Notes
- The `--reuse-values` flag combined with `--values` in Step 6 is valid Helm syntax, but can produce unexpected merge behavior. For a fully declarative approach, using `--values` alone (without `--reuse-values`) is often preferred when providing a complete values file.
- Passwords are hardcoded in the values.yaml example for clarity. In production, users should use Kubernetes Secrets, `--set` with CI/CD variables, or external secrets management (e.g., Sealed Secrets, External Secrets Operator).
- The `base64 -d` flag in Step 5 is Linux-specific. macOS users need `base64 -D` or `base64 --decode`.
- All Helm commands (`repo add`, `install`, `upgrade`, `rollback`, `uninstall`, `history`, `search repo`) use correct syntax and flags.
- The Kubernetes commands (`kubectl exec`, `rollout status`, `get secret`, `delete pvc`) are all correct.
- The external access configuration and Prometheus annotations are accurate for the Bitnami chart.
