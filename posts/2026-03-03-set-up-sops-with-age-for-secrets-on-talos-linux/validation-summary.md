# Validation Summary: How to Set Up SOPS with Age for Secrets on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SOPS
- Age
- Talos Linux
- Kubernetes Secrets
- Flux Kustomizations
- Argo CD config management plugins
- GitOps secrets management

## Sources Consulted
- SOPS official documentation: https://getsops.io/docs/
- SOPS official GitHub repository and release metadata: https://github.com/getsops/sops
- Age official GitHub repository and release metadata: https://github.com/FiloSottile/age
- age-keygen manual page: https://manpages.debian.org/testing/age/age-keygen.1.en.html
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Argo CD config management plugin documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/config-management-plugins/

## Issues Found
- The post described SOPS as a Mozilla tool. SOPS was initially launched at Mozilla, but the project is now under the getsops/CNCF stewardship, so the wording was updated to "originally launched at Mozilla" and the description no longer calls it "Mozilla SOPS."
- The Age key setup used the Linux SOPS default path as if it applied everywhere. SOPS checks a different default path on macOS, so the macOS key path was added while keeping the `SOPS_AGE_KEY_FILE` option.
- The `.sops.yaml` rule that matched `my-app-secrets.yaml` did not include `encrypted_regex`, so the example command would encrypt all YAML values instead of only `data` and `stringData`. The matching rule was updated to include `encrypted_regex: "^(data|stringData)$"`.
- The Argo CD example used the removed `argocd-cm` `configManagementPlugins` configuration style. Current Argo CD releases require config management plugins to be installed through a repo-server sidecar, so the snippet was changed to a sidecar-mounted `plugin.yaml` using `ConfigManagementPlugin`.
- The key rotation section described `sops updatekeys` as rotating encrypted files. `updatekeys` updates recipients according to `.sops.yaml`; SOPS data-key rotation is done with `sops rotate`. The wording was corrected and a note was added for `sops rotate -i`.

## Review Notes
The Linux SOPS and Age release download URL patterns were checked against current GitHub release metadata and remain valid for amd64 systems. The examples are still architecture-specific and could be expanded in the future for arm64 users.
