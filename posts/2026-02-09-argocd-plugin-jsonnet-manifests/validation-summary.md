# Validation Summary: How to Build an ArgoCD Plugin That Renders Jsonnet Manifests for Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD Config Management Plugins
- Argo CD Application manifests
- Jsonnet
- jsonnet-bundler
- k8s-libsonnet
- Kubernetes manifests
- Docker
- kubectl

## Sources Consulted
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- Argo CD Jsonnet user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/jsonnet/
- Jsonnet getting started and YAML stream documentation: https://jsonnet.org/learning/getting_started.html
- k8s-libsonnet documentation: https://jsonnet-libs.github.io/k8s-libsonnet/
- k8s-libsonnet 1.35 API documentation for Deployment, Service, ConfigMap, Container, and ContainerPort helpers: https://jsonnet-libs.github.io/k8s-libsonnet/1.35/
- jsonnet-bundler package spec documentation: https://pkg.go.dev/github.com/jsonnet-bundler/jsonnet-bundler/spec/v1

## Issues Found
- The introduction incorrectly implied Jsonnet support was only for older Argo CD versions. Updated it to state that Argo CD still has native Jsonnet support, while custom plugins are useful when extra control is needed.
- The plugin script read `JSONNET_MAIN_FILE` directly, but Argo CD prefixes user-supplied plugin environment variables with `ARGOCD_ENV_`. Updated the script to read `ARGOCD_ENV_JSONNET_MAIN_FILE`.
- The plugin script did not pass the documented `environment` external variable to Jsonnet. Added `--ext-str environment="${ARGOCD_ENV_environment:-}"`.
- The Jsonnet command combined `--yaml-stream` with examples that returned Kubernetes `List` objects. Jsonnet YAML stream mode expects an array, so the main examples now return arrays of resources.
- The plugin ConfigManagementPlugin discovery syntax used `discover.command`, which is not the current sidecar CMP schema. Updated it to `discover.find.command`.
- The sidecar container did not run `/var/run/argocd/argocd-cmp-server`, which Argo CD requires for sidecar CMPs. Added the required sidecar command.
- The ConfigMap was mounted as a directory instead of mounting `plugin.yaml` at `/home/argocd/cmp-server/config/plugin.yaml`. Updated the mount path and `subPath`.
- The sidecar `/tmp` mount used a generic shared-looking volume name. Updated it to a CMP-specific `cmp-tmp` volume to match Argo CD's guidance to avoid sharing the repo-server `/tmp`.
- The Application snippets used `name: jsonnet` while the plugin declared `spec.version: v1.0`. Argo CD expects the explicit sidecar plugin name to be `jsonnet-v1.0` when a version is set, so the Application snippets were updated.
- The Application environment-specific example used `ARGOCD_ENV_environment` as the env var name. User-supplied env names should be provided without the prefix because Argo CD adds it before command execution. Updated it to `environment`.
- The k8s-libsonnet dependency referenced `subdir: "1.29"`, which is no longer present on the current main branch. Updated the example to `1.35`.
- The k8s-libsonnet import used `k.libsonnet`, which does not match the modern import style with `legacyImports: false`. Updated imports to `github.com/jsonnet-libs/k8s-libsonnet/1.35/main.libsonnet`.
- The `containerPort.new('http', params.port)` call had the wrong argument order and helper for k8s-libsonnet. Updated it to `containerPort.newNamed(params.port, 'http')`.
- The local render command did not pass the environment ext var used in the advanced example. Added `--ext-str environment=production`.

## Review Notes
The tutorial is now technically aligned with current Argo CD sidecar CMP behavior and Jsonnet stream output expectations. Future maintenance should keep the k8s-libsonnet Kubernetes version and container base image versions current.
