# Validation Summary: How to Use Build Environment in Custom Plugins

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Config Management Plugins
- Argo CD build environment variables
- Kubernetes Application and Deployment manifests
- Python manifest generation
- Kubernetes HorizontalPodAutoscaler API version selection

## Sources Consulted
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/release-2.11/operator-manual/config-management-plugins/
- Argo CD Build Environment documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/build-environment/
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/

## Issues Found
- `ARGOCD_APP_NAMESPACE` was described and defaulted as the Argo CD Application namespace. Argo CD documents it as the destination namespace, so the description, Python fallback, and local debugging example were corrected.
- The post implied any custom variables prefixed with `ARGOCD_ENV_` are automatically available from the repo-server container. For sidecar CMPs, Application plugin `env` values are prefixed by Argo CD before commands receive them, while system environment variables come from the sidecar container. The examples and explanation were updated.
- The versioned plugin example used `name: env-aware-generator` in the Application. Argo CD requires `<metadata.name>-<spec.version>` when `spec.version` is set, so the examples now use `env-aware-generator-v1.0`.
- The discovery example used a shell command to test for `plugin-config.yaml`, but Argo CD's `discover.fileName` is the direct documented mechanism for matching files in the Application source directory. The plugin definition now uses `fileName: plugin-config.yaml`.
- The sidecar setup mounted a ConfigMap without explaining that the plugin configuration must be present under the `plugin.yaml` key. A clarifying sentence was added.
- The HPA API compatibility example fell back to `autoscaling/v2beta2`, which is deprecated in Kubernetes 1.23 and no longer served as of Kubernetes 1.26. The example now uses `autoscaling/v2` when available and raises an error otherwise.
- The debugging section said to check repo server logs for plugin output. Since generate output must be valid manifests on stdout, the wording was corrected to check sidecar logs for CMP server errors.

## Review Notes
The Python example is syntactically valid but depends on PyYAML being included in the plugin image. That is acceptable for a custom plugin image, but a future revision could call out the image dependency explicitly.
