# Validation Summary: How to Create Custom Helm Charts for Talos Linux Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm 3 (chart authoring, packaging, distribution)
- Kubernetes (Deployment, Service, ConfigMap, Ingress, ServiceAccount, HPA)
- Talos Linux (security-context oriented defaults)
- OCI registries for chart distribution
- ChartMuseum / helm-push plugin (`cm-push`)
- Go template language (used by Helm templates)

## Sources Consulted
- Helm documentation — Charts: https://helm.sh/docs/topics/charts/
- Helm documentation — Chart.yaml fields and `apiVersion: v2`: https://helm.sh/docs/topics/charts/#the-chartyaml-file
- Helm documentation — `helm create` scaffolding: https://helm.sh/docs/helm/helm_create/
- Helm documentation — CLI reference for `lint`, `template`, `install`, `package`, `repo index`, `push`, `test`: https://helm.sh/docs/helm/
- Helm documentation — Registries / OCI support (GA in 3.8): https://helm.sh/docs/topics/registries/
- helm-push plugin (`cm-push` command after rename to avoid conflict with native `helm push`): https://github.com/chartmuseum/helm-push
- Kubernetes — Common labels (`app.kubernetes.io/*`, `helm.sh/chart`): https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/
- Kubernetes — Pod / Container SecurityContext (`runAsNonRoot`, `seccompProfile.type: RuntimeDefault`, `capabilities.drop`, `readOnlyRootFilesystem`, `allowPrivilegeEscalation`): https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes — Ingress `ingressClassName` (stable since 1.18): https://kubernetes.io/docs/concepts/services-networking/ingress/
- Talos Linux documentation: https://www.talos.dev/latest/

## Issues Found
No technical issues found.

The Helm template syntax (Go template actions, pipelines, `include`, `define`, `with`, `range`, `nindent`, `toYaml`, `sha256sum`, `trunc`, `trimSuffix`) is valid. Chart.yaml uses the correct `apiVersion: v2` schema for Helm 3 with valid fields (`name`, `description`, `type`, `version`, `appVersion`, `maintainers`, `keywords`, `home`, `sources`). The deployment template correctly uses `apps/v1`, valid pod/container security context fields, `envFrom.configMapRef`, probe fields (`httpGet`, `initialDelaySeconds`, `periodSeconds`), and the configmap-checksum annotation pattern. The CLI commands (`helm lint`, `helm template`, `helm install --dry-run --debug`, `helm test`, `helm package`, `helm repo index`, `helm cm-push`, `helm push oci://...`, `--namespace`, `--create-namespace`, `-f`) are all current and correct.

## Review Notes
- The `helm create` scaffold listing omits `.helmignore`, which the real scaffold also generates. Not incorrect, just not exhaustive.
- The standard scaffolded `_helpers.tpl` labels block typically also includes `app.kubernetes.io/version` (gated on `.Chart.AppVersion`). The post's variant omits it, which is valid but slightly less complete than what `helm create` produces today.
- `helm cm-push` requires the `helm-push` plugin (`helm plugin install https://github.com/chartmuseum/helm-push`); the post doesn't call this out explicitly, but the command itself is correct.
- Native `helm push` to OCI registries became GA in Helm 3.8 (experimental in 3.7). Anyone on a much older Helm release would need to upgrade — worth flagging for readers but not technically wrong.
- `readOnlyRootFilesystem: true` paired with no writable `emptyDir` mount for `/tmp` or similar can cause some applications to fail at startup. This is an application-specific concern, not a chart authoring error, but worth noting as a real-world gotcha.
