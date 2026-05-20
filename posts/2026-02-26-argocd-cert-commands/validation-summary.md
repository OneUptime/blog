# Validation Summary: How to Use argocd cert Commands for Certificate Management

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Argo CD CLI
- Argo CD repository TLS certificate management
- Argo CD SSH known hosts management
- Kubernetes ConfigMaps
- OpenSSH ssh-keyscan
- OpenSSL certificate inspection

## Sources Consulted
- Argo CD command reference: `argocd cert` - https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cert/
- Argo CD command reference: `argocd cert add-tls` - https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cert_add-tls/
- Argo CD command reference: `argocd cert add-ssh` - https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cert_add-ssh/
- Argo CD command reference: `argocd cert list` - https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cert_list/
- Argo CD command reference: `argocd cert rm` - https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cert_rm/
- Argo CD private repositories documentation - https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/
- Argo CD declarative setup documentation for repository TLS certificates and SSH known hosts - https://argo-cd.readthedocs.io/en/release-2.4/operator-manual/declarative-setup/

## Issues Found
- The post described `argocd cert` as managing certificate verification for Kubernetes API server connections. Argo CD documents this command family as managing repository TLS certificates and SSH known hosts, so the cluster references were removed from the description, introduction, certificate type explanation, and summary.
- The post said certificate data is stored in ConfigMaps/Secrets. Current Argo CD documentation stores repository TLS certificates in `argocd-tls-certs-cm` and SSH known hosts in `argocd-ssh-known-hosts-cm`, so the wording was corrected to ConfigMaps.
- The sample `argocd cert list` output used `FINGERPRINT/INFO`. The current Argo CD CLI documentation uses `FINGERPRINT/SUBJECT`, so the output headers were updated.
- The declarative ConfigMap examples omitted the `app.kubernetes.io/part-of: argocd` label that Argo CD documents as required for using ConfigMap resources. The label was added to both ConfigMap snippets.

## Review Notes
The CLI commands and flags shown for `argocd cert list`, `add-tls`, `add-ssh`, and `rm` are current in the official Argo CD command reference. The `ssh-keyscan` and OpenSSL examples are syntactically valid, but operators should verify scanned SSH host keys through an independent trusted channel before adding them.
