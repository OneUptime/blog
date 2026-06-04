# Validation Summary: How to Configure ArgoCD Config Management Plugins for Custom Manifest Generation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Config Management Plugins
- Kubernetes Deployments, ConfigMaps, Secrets, and kubectl
- Docker containers
- CUE
- Python
- Bash

## Sources Consulted
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/application-specification/
- CUE `cue export` command reference: https://cuelang.org/docs/reference/command/cue-help-export/
- CUE injection reference: https://cuelang.org/docs/reference/command/cue-help-injection/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The post described "v1" and "v2" plugins as active plugin-system versions. Updated this to reflect the current Argo CD documentation: `argocd-cm` plugin configuration was deprecated in Argo CD 2.4 and removed in Argo CD 2.8, and the current model is sidecar-based CMP configuration.
- The post said every plugin must implement `discover`, `init`, and `generate`. Updated this because Argo CD requires `generate`, while `init` and discovery configuration are optional.
- The post said Argo CD calls `discover`, `init`, and `generate` in sequence. Updated this to clarify that discovery is used to match repositories, and `init` runs immediately before `generate`.
- The ConfigManagementPlugin example used `discover.command`, which is not the current documented schema. Changed it to `discover.find.command`.
- The sidecar Deployment omitted the required `/var/run/argocd/argocd-cmp-server` command and instead implied the plugin executable should be the container entrypoint. Updated the sidecar patch and Dockerfile comments so the sidecar runs `argocd-cmp-server` while the plugin executable remains available in the image.
- The sidecar ConfigMap mount targeted the config directory. Updated it to mount `plugin.yaml` at `/home/argocd/cmp-server/config/plugin.yaml` with `subPath`, matching the documented layout.
- The sidecar patch omitted a separate `/tmp` volume. Added `cmp-tmp` because Argo CD documentation warns not to share the repo-server `/tmp` volume with sidecar CMPs starting with v2.4.
- The Application example used `plugin.name: cue` while the ConfigManagementPlugin specified `version: v1.0`. Updated it to `cue-v1.0`, which is the documented name format when a plugin version is specified.
- The Application example omitted `project` and `destination`. Added `project: default` and an in-cluster destination so the manifest is a complete, valid Argo CD Application example.
- The secrets section said to use Secrets mounted as volumes, but the example also used `env[].valueFrom.secretKeyRef`. Updated the wording to cover both supported Kubernetes Secret consumption methods.

## Review Notes
- The CUE examples use documented `cue export --out yaml` and `--inject` flags. The injected values require matching `@tag(...)` attributes in the CUE files.
- The CUE image example pins CUE v0.6.0, which is old but still a specific valid release. Consider updating the article in the future to a newer CUE version for freshness.
