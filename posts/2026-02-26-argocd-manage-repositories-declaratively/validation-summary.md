# Validation Summary: How to Manage ArgoCD Repositories Declaratively

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD repository configuration
- Kubernetes Secrets
- Git and SSH repository authentication
- Helm chart repositories
- OCI registries for Helm charts
- Argo CD repository credential templates
- GitHub App authentication
- Bitnami Sealed Secrets
- External Secrets Operator
- Argo CD Applications

## Sources Consulted
- Argo CD Declarative Setup: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD repository Secret examples: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-repositories-yaml/
- Argo CD repository credential template examples: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-repo-creds-yaml/
- Argo CD Private Repositories guide: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD repo command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo/
- Argo CD repo list command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_list/
- External Secrets Operator templating documentation: https://external-secrets.io/main/guides/templating/
- External Secrets Operator API reference: https://pkg.go.dev/github.com/external-secrets/external-secrets/apis/externalsecrets/v1
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets

## Issues Found
- The HTTPS Git repository section suggested using a GitHub App installation token as a static password. GitHub App authentication is documented separately by Argo CD using `githubAppID`, `githubAppInstallationID`, and `githubAppPrivateKey`; static installation tokens are short-lived and are not appropriate for declarative repository secrets. Changed the text to recommend GitHub personal access tokens for HTTPS password authentication and leave GitHub App authentication to the dedicated section.
- The Sealed Secrets example created an HTTPS repository Secret with only `password`. Argo CD and Git hosting documentation describe token-based HTTPS authentication as username plus password/token. Added `username: argocd-bot` to match the earlier HTTPS example.
- The External Secrets Operator example used `external-secrets.io/v1beta1`. Current External Secrets documentation uses `external-secrets.io/v1` and templating engine v2. Updated the API version and added `engineVersion: v2` under `target.template`.
- The verification section labeled a `kubectl get secrets` command as checking connection errors. That command only lists Kubernetes Secret objects and does not test repository connectivity. Updated the comment to say it inspects the repository secrets Argo CD is watching.

## Review Notes
The Argo CD repository Secret labels, `repo-creds` credential templates, prefix matching behavior, GitHub App key names, Helm repository fields, Helm OCI `enableOCI` usage, and `argocd repo` commands were consistent with official Argo CD documentation.
