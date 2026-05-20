# Validation Summary: How to Use RBAC CSV vs RBAC ConfigMap in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD RBAC
- Kubernetes ConfigMaps
- Kubernetes AppProject resources
- GitOps
- Kustomize / Helm policy composition
- Argo CD CLI RBAC validation commands
- Python

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd-rbac-cm.yaml` example: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/argocd-rbac-cm-yaml/
- Argo CD `argocd admin settings rbac validate` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_validate/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/

## Issues Found
- The post described mounted external RBAC policy files as an Argo CD server configuration approach. Current Argo CD documentation describes global RBAC configuration through `argocd-rbac-cm`, AppProject roles, and additional `policy.<any string>.csv` keys inside `argocd-rbac-cm`. I replaced the external-file section with the documented ConfigMap policy composition model.
- The combining example placed `policy.default` inside the `policy.csv` literal block, which would make it part of the CSV text instead of a ConfigMap key. I moved `policy.default` out to the `data` map.
- The post said `policy.default` was the default role for unauthenticated users. Argo CD documents it as the default role granted to authenticated users; anonymous users only assume it when anonymous access is enabled. I corrected the comment.
- The post claimed external policy file changes require pod restart and can use multiple ConfigMaps or Secrets. Those claims do not apply to Argo CD's documented `policy.<name>.csv` composition, so I replaced them with the correct limitations and trade-offs.
- The Python generation example imported `yaml` without using it, which would unnecessarily require PyYAML. I removed the unused import.
- The description and summary still referred to the external file approach after the technical corrections. I updated them to match the documented ConfigMap fragment approach.

## Review Notes
The Argo CD CLI command examples match the documented `argocd admin settings rbac validate` and `argocd admin settings rbac can` command forms. The local environment did not have the `argocd` CLI installed, so CLI verification was performed against official Argo CD command references rather than local `--help` output.
