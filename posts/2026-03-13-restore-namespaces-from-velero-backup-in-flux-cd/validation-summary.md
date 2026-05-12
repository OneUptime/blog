# Validation Summary: How to Restore Namespaces from Velero Backup in Flux CD

## Status
validated

## Post Type
Tutorial / Operational guide

## Technologies Covered
- Velero (backup and restore for Kubernetes)
- Flux CD (GitOps continuous delivery)
- Kubernetes (namespaces, ConfigMaps, PVCs, deployments)
- kubectl CLI
- Disaster recovery workflow

## Sources Consulted
- Velero CLI documentation: https://velero.io/docs/main/
- Velero restore reference: https://velero.io/docs/main/restore-reference/
- Velero backup reference: https://velero.io/docs/main/resource-filtering/
- Flux CD CLI documentation: https://fluxcd.io/flux/cmd/
- `flux suspend kustomization` reference: https://fluxcd.io/flux/cmd/flux_suspend_kustomization/
- `flux resume kustomization` reference: https://fluxcd.io/flux/cmd/flux_resume_kustomization/
- `flux bootstrap github` reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/

## Issues Found
No technical issues found.

All Velero subcommands and flags (`backup get/describe`, `restore create/describe/get/logs/delete`, `--from-backup`, `--include-namespaces`, `--exclude-namespaces`, `--include-cluster-resources`, `--include-resources`, `--selector`, `--existing-resource-policy` with values `none` and `update`, `--wait`, `--details`) match the official Velero CLI. The `flux suspend/resume kustomization`, `flux get kustomization`, and `flux bootstrap github` commands and their flags (`--owner`, `--repository`, `--branch`, `--path`) match the Flux CLI reference. The ConfigMap YAML is syntactically valid. The recommended workflow (suspend Flux → restore via Velero → verify → resume Flux) reflects the standard approach for coordinating Velero with a GitOps controller.

## Review Notes
- The default value of `--existing-resource-policy` when omitted from the CLI is an empty string, which Velero treats as the legacy "skip existing resources" behavior. Explicitly passing `none` produces the same practical effect, so the post's claim that `none` reflects "default behavior" is accurate in effect.
- `flux get kustomization <name>` (singular) is accepted by the Flux CLI; the docs more commonly show the plural form `flux get kustomizations`. Both work; no change needed.
- The post uses a placeholder backup name with a date suffix (`20260313020000`) — readers should substitute their own backup names from `velero backup get`.
- The `curl` health-check `kubectl exec` example assumes `curl` is present in the application container; that is a reasonable example but environment-specific.
