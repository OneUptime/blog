# Validation Summary: How to Configure Velero Resource Modifiers to Transform Resources During Restore

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Velero
- Velero restore resource modifiers
- Kubernetes JSON Patch
- Velero restore hooks
- Pod Security Standards

## Sources Consulted
- Velero Restore Resource Modifiers documentation: https://velero.io/docs/v1.18/restore-resource-modifiers/
- Velero Restore API Type documentation: https://velero.io/docs/main/api-types/restore/
- Velero Restore Reference documentation: https://velero.io/docs/v1.18/restore-reference/
- Kubernetes API Concepts, patch operations: https://kubernetes.io/docs/reference/using-api/api-concepts/
- RFC 6902, JSON Patch: https://www.rfc-editor.org/rfc/rfc6902.html
- Kubernetes Pod Security Standards namespace labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/

## Issues Found
- Fixed `labelSelector` examples that used string selector syntax such as `"app=web-frontend"` and `"type=external"`. Velero resource modifier conditions use Kubernetes `LabelSelector` object syntax, so these were changed to `matchLabels`.
- Fixed JSON Patch `test` usage in the image example. The post used a regex-like value, but RFC 6902 `test` checks exact value equality, so the example now tests for the exact image name.
- Fixed Deployment replica patch values from strings to numbers. Kubernetes `spec.replicas` is an integer field, so JSON Patch replacement values should be numeric.
- Replaced a service LoadBalancer selector example that tried to use labels to match `spec.type`. The example now uses Velero's documented `conditions.matches` field to match `/spec/type`.
- Corrected the API migration section. The original example implied deprecated Ingress API migration and PodSecurityPolicy-to-Pod-Security-Standards conversion could be handled by simply replacing `apiVersion` or annotating a PodSecurityPolicy. The section now uses namespace Pod Security Standards labels and notes that schema-changing API migrations should be converted before restore.
- Updated the troubleshooting command comment from "Test JSON patch syntax" to "Test an equivalent field transformation locally" because the `jq` command demonstrates a value transformation, not JSON Patch syntax.

## Review Notes
- The resource modifier ConfigMap labels shown in the examples are not required when the ConfigMap is passed with `--resource-modifier-configmap`, but they do not make the manifests invalid.
- Several JSON Patch examples target array index `0`, which is technically valid but only modifies the first container or first rule. Multi-container workloads may need additional patches or a different patch strategy.
