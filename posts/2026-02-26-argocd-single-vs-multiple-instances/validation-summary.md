# Validation Summary: ArgoCD Single Instance vs Multiple Instances: Decision Guide

## Status
validated

## Post Type
Technical decision guide

## Technologies Covered
- Argo CD
- Argo CD AppProject and Application CRDs
- Argo CD RBAC
- Kubernetes
- Helm
- GitOps architecture

## Sources Consulted
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Project specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo Helm charts repository: https://github.com/argoproj/argo-helm
- Argo CD Helm chart values reference: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/README.md
- Helm install command documentation: https://helm.sh/docs/helm/helm_install/
- Helm upgrade command documentation: https://helm.sh/docs/v3/helm/helm_upgrade/

## Issues Found
- The multiple-instance Helm install commands used `-n` with new namespaces but did not create those namespaces. Added `--create-namespace` to the install examples because Helm requires that flag when the release namespace may not already exist.
- The independent lifecycle example said chart version `6.6.0` upgraded Team A to Argo CD `v2.11`, but the official chart metadata for `argo-cd-6.6.0` has `appVersion: v2.10.2`. Updated the example to Argo CD `v3.4.1` using chart version `9.5.13`, whose official chart metadata matches `appVersion: v3.4.1`.
- The Team A values example used an old Argo CD image tag. Updated it from `v2.10.2` to `v3.4.1` to match the corrected chart version example.
- The 10-instance upgrade loop used release name `argocd` and `values-$ns.yaml`, which did not match the earlier install examples (`argocd-team-a`, `values-team-a.yaml`, etc.). Updated the loop to iterate by team suffix and use matching release names, namespaces, and values files.
- The App-of-Apps `Application` manifest omitted `spec.project`. Added `project: default` to match Argo CD's documented minimal Application spec.

## Review Notes
- The sizing numbers and team/application thresholds are reasonable illustrative guidance, not vendor-backed hard limits. They should be treated as decision heuristics rather than guarantees.
- The local environment did not have Helm installed, so Helm command validation was performed against official Helm documentation instead of local `helm --help` output.
