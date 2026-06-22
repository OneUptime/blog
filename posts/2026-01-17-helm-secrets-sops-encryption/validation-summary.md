# Validation Summary: How to Manage Secrets in Helm with helm-secrets and SOPS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- helm-secrets
- SOPS
- age
- AWS KMS
- GCP KMS
- HashiCorp Vault transit
- Kubernetes Secrets
- GitHub Actions
- GitLab CI
- Argo CD

## Sources Consulted
- SOPS official documentation: https://getsops.io/docs/
- SOPS official GitHub repository and releases: https://github.com/getsops/sops
- helm-secrets official repository: https://github.com/jkroepke/helm-secrets
- helm-secrets installation documentation: https://github.com/jkroepke/helm-secrets/wiki/Installation
- helm-secrets usage documentation: https://github.com/jkroepke/helm-secrets/wiki/Usage
- helm-secrets Argo CD integration documentation: https://github.com/jkroepke/helm-secrets/wiki/ArgoCD-Integration
- Helm chart template documentation: https://helm.sh/docs/howto/charts_tips_and_tricks/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Azure setup-helm action documentation: https://github.com/Azure/setup-helm
- Helm release information: https://github.com/helm/helm/releases

## Issues Found
- The post described SOPS as "Mozilla's tool" and used "Mozilla SOPS" in the description. SOPS was originally launched at Mozilla but is now maintained under getsops/CNCF, so the wording was updated to refer to SOPS directly.
- The SOPS Linux install examples used SOPS v3.8.1, which is outdated. Updated examples and the sample encrypted metadata version to v3.13.1.
- The helm-secrets install command installed the latest main branch for Helm 3. Updated it to pin v4.7.7 and added the Helm 4 OCI plugin installation commands required by current helm-secrets documentation.
- The Ubuntu age install command omitted `sudo`. Updated it to `sudo apt install age`.
- AWS ARN examples used a 9-digit placeholder account ID. Updated them to a 12-digit placeholder account ID.
- The GitHub Actions Helm setup used `azure/setup-helm@v3`. Updated it to `azure/setup-helm@v5.0.0` and pinned Helm v3.21.2 because the workflow uses the Helm 3 plugin install form.
- The GitHub Actions `KUBECONFIG` export was scoped only to the configure step. Updated it to write `KUBECONFIG` to `$GITHUB_ENV` so the deploy step can use it.
- The AWS KMS CI/CD text implied the deploy snippet was complete without installing Helm, SOPS, and helm-secrets. Updated the text to state those setup steps are still required.
- The GitLab CI example installed only `curl`, but helm-secrets installation needs shell and Git support in the Alpine Helm image. Updated the package install to include `bash`, `curl`, and `git`, and pinned helm-secrets v4.7.7.
- The Argo CD repo-server patch installed helm-secrets inside the init container without sharing the plugin directory with the repo-server container, and it attempted to run `helm plugin install` from an Alpine image without Helm. Replaced it with a shared plugin volume and direct helm-secrets release tarball extraction.
- The Argo CD Application example used `secrets://` without the required `argocd-cm` `helm.valuesFileSchemes` configuration. Added the required ConfigMap snippet.
- The manual re-encryption example piped plaintext to `sops --encrypt /dev/stdin`, which would not select the intended `.sops.yaml` creation rule. Updated it to use `--filename-override secrets.yaml`.

## Review Notes
- The examples now include both Helm 3 and Helm 4 helm-secrets installation paths. CI examples using `helm plugin install ... --version` intentionally pin Helm 3 because that install form is not supported by Helm 4.
- Kubernetes Secret `data` and `stringData` usage is technically correct. Kubernetes notes that `stringData` does not work well with server-side apply, but the post does not rely on server-side apply.
