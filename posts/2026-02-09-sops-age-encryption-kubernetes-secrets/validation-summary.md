# Validation Summary: How to Use SOPS with Age Encryption for Kubernetes Secrets in Git

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SOPS
- age encryption
- Kubernetes Secrets
- GitOps
- Argo CD
- Kustomize
- KSOPS

## Sources Consulted
- SOPS official documentation: https://getsops.io/docs/
- SOPS GitHub repository and CLI source: https://github.com/getsops/sops
- age official README and usage documentation: https://github.com/FiloSottile/age
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- Argo CD Kustomize build options documentation: https://argo-cd.readthedocs.io/en/release-2.4/user-guide/kustomize/
- KSOPS official README: https://github.com/viaduct-ai/kustomize-sops

## Issues Found
- The post referred to "Mozilla SOPS", which is outdated because SOPS is now maintained under the getsops project and is a CNCF Sandbox project. Changed the description to "SOPS".
- The install commands used older age and SOPS release versions. Updated age to v1.3.1 and SOPS to v3.13.0 based on current official releases.
- The age private-key setup moved the key into `~/.config/sops/age/keys.txt` without creating the directory first, and implied that path was always the automatic lookup path. Added `mkdir -p`, exported `SOPS_AGE_KEY_FILE`, and clarified that `~/.config/sops/age/keys.txt` is the Linux fallback path when `XDG_CONFIG_HOME` is unset.
- The partial-encryption example used `encrypted_regex: ^(password|apiKey|token|secret)$`, which would not match the shown `database_password` or `api_key` fields. Updated the regex so the displayed encrypted output matches SOPS behavior.
- The Argo CD repo-server patch mounted `custom-tools` without defining the `custom-tools` volume. Added the missing `emptyDir` volume and updated the SOPS binary URL.
- The Argo CD section described the ConfigMap as installing a SOPS plugin. Changed the wording to accurately describe enabling Kustomize exec plugins and making the SOPS binary and Age key available.
- The KSOPS install and generator examples were incomplete for current KSOPS usage. Replaced the manual plugin-directory extraction with the official install script, added the required `config.kubernetes.io/function` exec annotation, and added `--enable-exec` to the `kustomize build` command.

## Review Notes
The remaining examples are technically sound for a tutorial, but production Argo CD deployments should usually prefer a fully defined KSOPS/Config Management Plugin sidecar or custom repo-server image rather than downloading binaries at pod startup.
