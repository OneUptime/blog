# Validation Summary: How to Require Signed Commits for ArgoCD Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD AppProject source integrity policies
- GnuPG / OpenPGP commit signing
- Git signed commits and tags
- GitHub Actions
- Argo CD Image Updater
- GitHub branch protection
- GitLab push rules
- Kubernetes ConfigMaps and Deployments
- Prometheus alert rules

## Sources Consulted
- Argo CD Git GnuPG signature verification documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/source-integrity-git-gpg/
- Argo CD `argocd gpg add` command reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/commands/argocd_gpg_add/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD Image Updater update methods and commit signing documentation: https://argocd-image-updater.readthedocs.io/en/latest/basics/update-methods/
- GitHub protected branches documentation: https://docs.github.com/en/enterprise-cloud@latest/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- GitHub signing key documentation: https://docs.github.com/en/authentication/managing-commit-signature-verification/telling-git-about-your-signing-key
- GitLab push rules documentation: https://docs.gitlab.com/user/project/repository/push_rules/
- Git pretty formats documentation: https://git-scm.com/docs/pretty-formats.html

## Issues Found
- The post used the legacy Argo CD `spec.signatureKeys` AppProject field. Current Argo CD documentation says `signatureKeys` is supported for compatibility but deprecated in favor of `spec.sourceIntegrity.git.policies`. I changed the production and staging examples to use source integrity GPG policies with `mode: "head"` and the same trusted key IDs.
- The post described Argo CD as requiring every change to be signed. With `head` verification, Argo CD verifies the target revision, not the full ancestry. I changed the wording to say the deployed revision or target revision must be signed.
- The Argo CD Image Updater example used an unsupported `GIT_COMMIT_SIGNING_KEY` environment variable. Official Image Updater documentation configures signing through the `argocd-image-updater-config` ConfigMap keys `git.commit-signing-method` and `git.commit-signing-key`. I replaced the environment variable with the documented ConfigMap configuration.
- The migration and emergency override examples still referred to removing or restoring `signatureKeys`. I updated them to remove and restore `spec.sourceIntegrity` instead.
- The GitHub branch protection guidance used the older "Include administrators" label. Current GitHub documentation uses "Do not allow bypassing the above settings" for applying protections to administrators and bypass-capable roles, so I updated the text.
- The summary still told readers to configure `signatureKeys`. I changed it to refer to source integrity policies.

## Review Notes
- The examples use `mode: "head"`, which matches legacy Argo CD signature key behavior by checking the target revision. Teams that need every ancestor commit verified should consider `mode: "strict"` and Argo CD seal commits, but that is a stronger policy with more migration impact.
- Argo CD GnuPG verification applies to Git sources. It is not supported for Helm or OCI application sources.
