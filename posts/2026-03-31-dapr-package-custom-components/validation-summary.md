# Validation Summary: How to Package Custom Dapr Components for Distribution

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (pluggable components, Component CRD)
- Docker (multi-stage builds, distroless images)
- Helm (chart creation, OCI registry publishing, chart installation)
- Go (static binary compilation)
- Kubernetes (ConfigMaps, Secrets, volume mounts, sidecar pattern)

## Sources Consulted
- Dapr pluggable components documentation — https://docs.dapr.io/developing-applications/develop-components/pluggable-components/
- Dapr Component YAML schema — https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr secrets in component metadata — https://docs.dapr.io/operations/components/component-secrets/
- Google distroless container images — https://github.com/GoogleContainerTools/distroless
- Helm OCI registry support — https://helm.sh/docs/topics/registries/
- Helm `create` command reference — https://helm.sh/docs/helm/helm_create/
- Helm `package` command reference — https://helm.sh/docs/helm/helm_package/

## Issues Found
- **Missing Secret template in Helm chart**: The Dapr Component YAML template references a Secret via `secretKeyRef` (`{{ include "dapr-custom-state.fullname" . }}-secret`), and the `helm install` example sets `component.config.connectionString`, which triggers this code path. However, no Secret template was included in the chart, meaning the referenced Secret would not exist at runtime, causing the Dapr component to fail to initialize. **Fix:** Added a `templates/secret.yaml` section that conditionally creates the Secret from the `connectionString` value using `stringData`.

## Review Notes
- The `socketFolder` metadata field in the Dapr Component YAML is not a standard documented Dapr metadata field. The Dapr sidecar discovers pluggable components by scanning the socket folder (configured via `--components-sockets-folder` flag, defaulting to `/tmp/dapr-components-sockets`). Including it as custom metadata is not harmful and could be useful if the custom component reads it, but readers should understand it is not a built-in Dapr field.
- The ConfigMap-based sidecar patch approach (`component-sidecar.yaml`) stores a strategic merge patch but does not apply it automatically. Readers would need to use this in conjunction with a tool like Kustomize or a mutating admission webhook to apply the patch to their deployments. The blog does not fully explain this mechanism.
- The `values.yaml` does not define `component.name`, though the templates reference `.Values.component.name | default "custom-state"`. This works due to the `default` function but could confuse users who want to customize the component name. Adding it to `values.yaml` as a commented-out or explicit field would improve clarity.
- Helm OCI support requires Helm 3.8+. The post does not mention version requirements, which could cause confusion for users on older Helm versions.
