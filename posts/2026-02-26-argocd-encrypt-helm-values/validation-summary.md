# Validation Summary: How to Encrypt Helm Values Files for ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Config Management Plugins
- Kubernetes
- Helm
- Helm values files
- SOPS
- age encryption
- helm-secrets

## Sources Consulted
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- SOPS documentation / repository: https://github.com/getsops/sops
- helm-secrets Argo CD integration documentation: https://github.com/jkroepke/helm-secrets/wiki/ArgoCD-Integration
- Helm plugin documentation: https://helm.sh/docs/topics/plugins/
- Kubernetes `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- The Argo CD CMP sidecar snippet did not mount the plugin ConfigMap at `/home/argocd/cmp-server/config/plugin.yaml`, which Argo CD requires for sidecar plugins. Updated the deployment patch to add the ConfigMap volume and mount.
- The CMP sidecar could not access the SOPS and Helm binaries downloaded by the init container because the `custom-tools` volume was not defined or mounted into the sidecar. Added the shared `emptyDir`, sidecar mount, and `PATH` update.
- The deployment patch mounted `cmp-tmp` without defining it in the snippet. Added a separate `emptyDir` volume, matching Argo CD's sidecar guidance.
- The CMP plugin declared `spec.version: v1.0` while the Application referenced `plugin.name: helm-sops`. Argo CD requires `<plugin name>-<version>` when a version is specified. Removed the version field so the Application name remains correct.
- The CMP init script wrote decrypted files as `values-production.yaml.dec`, but the generate script looked for `values-production.enc.yaml.dec`. Changed decryption output to `$f.dec`.
- The CMP generate script used `[[ ... ]]` and `eval`, which are avoidable for `/bin/sh` plugin commands and unsafe with generated command strings. Replaced them with POSIX shell-compatible `case` logic and argument-array construction via `set --`.
- The custom repo-server Dockerfile downloaded the age tarball to `/usr/local/bin/age` and then tried to extract that same path, which would not install a usable age binary. Replaced it with tar extraction into `/gitops-tools`.
- The custom repo-server Dockerfile installed `helm-secrets` via `helm plugin install` as root, which can install into root's Helm plugin directory instead of the `argocd` user's runtime plugin directory. Updated it to install the released `helm-secrets.tar.gz` under an explicit `HELM_PLUGINS` path owned by `argocd`.
- The helm-secrets Argo CD example omitted the required `helm.valuesFileSchemes` setting for `secrets://` value files. Added the `argocd-cm` ConfigMap snippet.

## Review Notes
The post uses older pinned versions such as Argo CD v2.10.0, SOPS v3.8.1, Helm v3.14.0, age v1.1.1, and helm-secrets v4.5.1. These are not inherently invalid for the workflow shown, but future revisions should consider updating the pinned versions and checking the current helm-secrets Argo CD installation guidance.
