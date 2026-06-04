# Validation Summary: How to Create Binary Data ConfigMaps for Non-UTF8 Content

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ConfigMaps
- Kubernetes `binaryData` and `data` fields
- `kubectl create configmap`
- Kubernetes Deployment manifests
- Linux/macOS base64 and shell commands

## Sources Consulted
- Kubernetes ConfigMaps concept documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes ConfigMap API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/config-map-v1/
- Kubernetes `kubectl create configmap` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- Kubernetes "Configure a Pod to Use a ConfigMap" task documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/

## Issues Found
- Several `apps/v1` Deployment snippets omitted the required `spec.selector` and matching `template.metadata.labels`. Added selectors and labels to the `api-server`, `photo-app`, and `deployment-tool` examples so the manifests are valid Deployment resources.
- The embedded binaries example used base64 placeholders beginning with `H4sI`, which indicates gzip-compressed content, while the preceding commands base64-encoded raw binaries. Replaced the placeholders with generic base64 strings that do not imply gzip compression.
- The ConfigMap size limit was described as `1MB`. Updated it to `1 MiB`, matching the Kubernetes documentation, and clarified that base64 expansion can make files below 1 MiB exceed the stored ConfigMap limit.

## Review Notes
- `kubectl` was not installed in the local workspace, so CLI behavior was verified against the official generated Kubernetes `kubectl create configmap` reference and Kubernetes task documentation.
- The examples are otherwise consistent with current Kubernetes documentation: ConfigMaps support `data` for UTF-8 strings, `binaryData` for base64-encoded non-UTF-8 byte sequences, and `kubectl create configmap --from-file` places non-UTF-8 input into `binaryData`.
