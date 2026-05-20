# Validation Summary: How to Debug GPG Verification Failures in ArgoCD

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Argo CD / ArgoCD
- Git GnuPG signature verification
- GnuPG / OpenPGP keys
- Kubernetes and kubectl
- Git CLI
- jq

## Sources Consulted
- Argo CD stable GnuPG signature verification documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/gpg-verification/
- Argo CD latest Git GnuPG Source Integrity Verification documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/source-integrity-git-gpg/
- Argo CD CLI documentation for `argocd gpg add`: https://argo-cd.readthedocs.io/en/release-2.5/user-guide/commands/argocd_gpg_add/
- Argo CD CLI source for `argocd gpg add`, confirming `--from` reads a filesystem path: https://raw.githubusercontent.com/argoproj/argo-cd/master/cmd/argocd/commands/gpg.go
- Git pretty formats documentation via local `git log --help` for `%G?`, `%GK`, and `%GS`.
- GitHub web-flow public key endpoint: https://github.com/web-flow.gpg

## Issues Found
- The Git `%G?` status legend incorrectly described `E` as expired. Updated it to match Git's documented status codes: `X` for expired signature, `Y` for expired key, `R` for revoked key, `E` for cannot check, and `N` for no signature.
- The repo-server keyring inspection commands used the default GnuPG home. Updated them to set `GNUPGHOME=/app/config/gpg/keys`, which is the documented Argo CD keyring location inside repo-server pods.
- The GitHub web-flow import example piped data into `argocd gpg add --from -`. Updated it to download the key to a temporary file and pass that path to `--from`, because the Argo CD CLI expects a file path.
- The tag verification section said ArgoCD verifies the commit signature rather than the tag signature. Updated it to distinguish lightweight tags from annotated tags: lightweight tags verify the pointed-to commit, while annotated tags verify the signed tag object.
- The project configuration section only mentioned legacy `.spec.signatureKeys`. Added a short caveat for newer Source Integrity Verification configurations using `.spec.sourceIntegrity.git.policies[].gpg.keys`.

## Review Notes
The post remains focused on legacy project-level `signatureKeys` troubleshooting, which is still supported but is the older declaration format in current Argo CD documentation. A future broader update could add a parallel troubleshooting checklist for `sourceIntegrity` policies and verification modes (`none`, `head`, and `strict`).
