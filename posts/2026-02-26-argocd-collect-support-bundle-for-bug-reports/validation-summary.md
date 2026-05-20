# Validation Summary: How to Collect ArgoCD Support Bundle for Bug Reports

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Bash
- jq
- Prometheus metrics endpoints

## Sources Consulted
- Argo CD `argocd admin export` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_export/
- Argo CD `argocd version` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_version/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Kubernetes `kubectl version` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The script used `kubectl version --short`, but the current Kubernetes `kubectl version` reference lists `--client` and `-o json|yaml`, not `--short`. Updated the script to read client and server versions from JSON with `jq`.
- The script used `set -e` while collecting optional resources such as metrics, ingress, optional Argo CD components, and previous logs. A missing optional resource could abort the whole bundle collection. Added `|| true` to these collection commands so the script records errors in the output files and continues.
- The error summary used `grep -c ... || echo 0`, which can produce a multi-line value when there are zero matches and then break the integer comparison. Updated it to use `grep -E -c`, preserve the single count, and default empty output to `0`.
- The script labeled ConfigMaps as safe to share, but Argo CD configuration can contain sensitive values depending on installation choices. Changed the comment to say ConfigMaps should be reviewed before sharing.
- The performance metrics examples port-forwarded deployments for metrics. Argo CD documents application-controller metrics on `argocd-metrics:8082`, API server metrics on `argocd-server-metrics:8083`, and repo-server metrics on `argocd-repo-server:8084`. Updated the examples to port-forward the corresponding services.

## Review Notes
The local workspace does not have `kubectl` or `argocd` installed, so CLI behavior was verified against official generated command references instead of local `--help` output. The first Bash script was extracted from the Markdown and passed `bash -n` after edits.
