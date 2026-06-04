# Validation Summary: How to use Kustomize namePrefix and nameSuffix for resource naming

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kustomize
- Kubernetes YAML manifests
- kubectl apply -k
- yq

## Sources Consulted
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization
- Kustomize official repository README - https://github.com/kubernetes-sigs/kustomize
- Kustomize transformer configuration documentation - https://github.com/kubernetes-sigs/kustomize/blob/master/examples/transformerconfigs/README.md
- Kubernetes StatefulSet API reference - https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Kubernetes labels and selectors documentation - https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kustomize commonLabels deprecation issue and edit fix guidance - https://github.com/kubernetes-sigs/kustomize/issues/5653

## Issues Found
- The post claimed Kustomize updates "all references" and included Service selectors as name references. Kustomize updates built-in name reference fields, while Service selectors are label selectors and are not renamed by namePrefix or nameSuffix. Updated the wording to say "built-in name references" and replaced Service selectors with Ingress service backends.
- The post claimed ClusterRoles and ClusterRoleBindings do not transform. Kustomize applies namePrefix/nameSuffix to metadata.name for all resources, including cluster-scoped resources, and updates supported RBAC references. Rewrote the section to explain that cluster-scoped resources are transformed but remain cluster-wide.
- The post used `commonLabels`, which is deprecated in current Kustomize in favor of `labels`. Updated the example to use `labels` with `pairs`.

## Review Notes
The examples use `apiVersion: kustomize.config.k8s.io/v1beta1`, current Kubernetes resource API versions, and modern Ingress backend syntax. Local `kustomize`, `kubectl`, and `yq` binaries were not preinstalled, so CLI syntax was checked against official docs and Kustomize behavior was spot-checked with `npx kustomize` v4.5.4 for RBAC name transformation.
