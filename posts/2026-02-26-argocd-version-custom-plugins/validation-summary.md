# Validation Summary: How to Version Custom Plugins for ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Config Management Plugins
- Kubernetes Deployments and image pull policies
- kubectl patch
- Docker image tags and pushes
- SOPS
- GitHub Actions

## Sources Consulted
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/release-2.14/operator-manual/config-management-plugins/
- Kubernetes image pull policy documentation: https://kubernetes.io/docs/concepts/containers/images/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Docker image tag reference: https://docs.docker.com/engine/reference/commandline/tag/
- Docker image push reference: https://docs.docker.com/reference/cli/docker/image/push/
- SOPS documentation: https://getsops.io/docs/
- SOPS GitHub releases: https://github.com/getsops/sops/releases
- Docker build-push-action documentation: https://github.com/docker/build-push-action

## Issues Found
- The post stated that the Argo CD CMP `spec.version` field was informational only. Argo CD documentation says that when `spec.version` is set, an explicitly referenced Application plugin name must be `<metadata.name>-<spec.version>`. Updated the explanation and all Application examples to use version-suffixed plugin names.
- Several SOPS examples used `sops --decrypt .`, which attempts to decrypt a directory rather than a SOPS-encrypted file. Updated the examples to decrypt `secrets.enc.yaml`.
- The sidecar examples omitted the required `argocd-cmp-server` entrypoint and the documented `runAsUser: 999` security context. Added both to the sidecar snippets.
- The JSON patch example mounted `/tmp` from `cmp-tmp` for the second sidecar without adding a separate volume. Updated it to mount and add `cmp-tmp-v2`, matching Argo CD guidance to avoid sharing the repo-server `/tmp` volume with CMP sidecars.
- The changelog example referenced SOPS `v4.0.0` and a new encryption format, but the current SOPS release line is still `v3.x`. Updated the example to reference `v3.13.1` and changed the migration note to testing encrypted manifests with the new release.
- The GitHub Actions example used an older Docker build action and pushed without a registry login step. Updated it to the current Docker action versions and added a `docker/login-action` step.

## Review Notes
The annotation injection example remains intentionally simple and the post already recommends a more robust Kustomize-based approach. For production use, a YAML-aware annotation tool is safer than `sed`, especially for resources with existing annotations or nested `metadata` fields.
