# Validation Summary: How to Prevent Secrets from Being Stored in Git with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes Secrets
- Gitleaks and pre-commit hooks
- Bitnami Sealed Secrets
- External Secrets Operator
- HashiCorp Vault
- SOPS with age
- GitHub Actions
- OPA Gatekeeper
- git-filter-repo

## Sources Consulted
- Gitleaks official repository and configuration documentation: https://github.com/gitleaks/gitleaks
- Gitleaks Action official documentation: https://github.com/gitleaks/gitleaks-action
- Bitnami Sealed Secrets official documentation: https://github.com/bitnami-labs/sealed-secrets
- Argo CD Config Management Plugin documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- External Secrets Operator Vault provider documentation: https://external-secrets.io/latest/provider/hashicorp-vault/
- SOPS official documentation: https://github.com/getsops/sops
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper usage documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/howto
- GitHub documentation for removing sensitive data from repositories: https://docs.github.com/articles/removing-sensitive-data-from-a-repository

## Issues Found
- The Gitleaks pre-commit example used an older pinned release and the deprecated global `[allowlist]` configuration key. Updated the pre-commit revision to `v8.30.1` and changed `[allowlist]` to `[[allowlists]]`, matching current Gitleaks configuration guidance.
- The Gitleaks GitHub Action example omitted the organization-license caveat required by the official action for repositories owned by GitHub Organizations. Added a commented `GITLEAKS_LICENSE` line and note.
- The Sealed Secrets example generated a Secret without explicitly setting the `production` namespace, while the resulting `SealedSecret` manifest showed `production`. Added `--namespace production` to make the command and output consistent.
- The External Secrets Operator examples used `external-secrets.io/v1beta1`. Updated them to `external-secrets.io/v1` to match current official examples.
- The post referred to "Mozilla SOPS"; the actively maintained project is now under `getsops/sops`. Updated the wording to "SOPS".
- The SOPS encryption command wrote encrypted content back to `secrets.yaml`, but the Argo CD plugin example only decrypted `*.enc.yaml`. Changed the command to write `secrets.enc.yaml` and remove the plaintext source file.
- The Argo CD Config Management Plugin example used the deprecated and removed `argocd-cm` `configManagementPlugins` configuration path. Replaced it with a current sidecar-mounted `ConfigManagementPlugin` `plugin.yaml` example.
- The CI grep check would flag SOPS-encrypted Kubernetes Secret manifests as plaintext and the `grep -v` filters did not actually exclude other resource kinds from a `kind: Secret` match. Replaced it with a file loop that flags only `kind: Secret` YAML files without a `sops:` metadata block.
- The Gatekeeper example only defined a `ConstraintTemplate`, so it would not enforce anything by itself. Added the required structural schema for a v1 template and a matching `K8sBlockRawSecrets` constraint.
- The cleanup example used `git filter-branch`, which current GitHub guidance no longer recommends for sensitive-data removal. Replaced it with `git-filter-repo --sensitive-data-removal`.

## Review Notes
- YAML snippets were parsed successfully with Python's YAML parser after edits.
- The SOPS Config Management Plugin example is a minimal plugin generator. A production Argo CD installation still needs the repo-server sidecar, SOPS binary, and age private key mounted securely.
