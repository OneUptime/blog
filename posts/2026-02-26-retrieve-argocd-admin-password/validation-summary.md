# Validation Summary: How to Retrieve the ArgoCD Admin Password After Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Kubernetes Secrets
- kubectl
- Helm / argo-helm chart
- Bash, PowerShell, and Windows Command Prompt

## Sources Consulted
- Argo CD Getting Started documentation: https://argo-cd.readthedocs.io/en/release-2.0/getting_started/
- Argo CD FAQ, admin password reset: https://argo-cd.readthedocs.io/en/latest/faq/
- Argo CD `argocd admin initial-password` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_initial-password/
- Argo CD `argocd admin` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin/
- Argo CD `argocd account bcrypt` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_account_bcrypt/
- Argo CD `argocd account update-password` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_update-password/
- argo-helm `argo-cd` chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- argo-helm `argo-cd` chart README: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/README.md
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference

## Issues Found
- The post implied every ArgoCD installation always creates the same default admin secret in the `argocd` namespace. Updated the wording to describe default installs, Argo CD v1.9 and later behavior, and the fact that `argocd` is the common installation namespace rather than a hard requirement.
- The post said clusters might use different base64 encoding. Kubernetes Secret `data` is represented as base64; the practical difference is local decoder flags. Updated that sentence accordingly.
- The standard `base64 -d` pipeline was described as working on all platforms, but Windows requires different commands and macOS may use `-D`. Updated the scope to Linux and Unix-like systems.
- The pod-based method included reading the service account token and vague Kubernetes API guidance. Removed that misleading step and kept the direct `argocd admin initial-password` command from the server pod.
- The Argo CD CLI command was described as v2.6+ only. Current official command references document the command without that version constraint, so the text now says current ArgoCD versions.
- The Helm custom password example omitted `configs.secret.argocdServerAdminPasswordMtime`. Added it because the chart exposes it and Argo CD uses `admin.passwordMtime` with password changes.
- The reset examples generated bcrypt hashes with a Python `bcrypt` module that is not guaranteed to be installed. Replaced those examples with the documented `argocd account bcrypt --password` command.
- The generated-password reset example embedded a shell variable inside Python bytes syntax, which could break for some generated values. Replaced it with `argocd account bcrypt --password "$NEW_PASSWORD"`.

## Review Notes
The Windows Command Prompt `certutil` flow is functional but verbose and may print certificate utility status text around the decoded output. PowerShell is the cleaner Windows option. The `argocd admin initial-password reset` command is shown in the current Argo CD admin command examples; the FAQ-documented bcrypt patch remains the most explicit recovery path for setting a specific admin password.
