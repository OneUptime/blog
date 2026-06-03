# Validation Summary: How to Use Strategic Merge Patch vs JSON Merge Patch for Resource Updates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes patch operations
- kubectl patch
- Strategic Merge Patch
- JSON Merge Patch (RFC 7386)
- JSON Patch (RFC 6902)
- Go controller-runtime client

## Sources Consulted
- Kubernetes docs: Update API Objects in Place Using kubectl patch - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/
- Kubernetes kubectl reference: kubectl patch - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes API concepts: PATCH operations and custom resource caveats - https://kubernetes.io/docs/reference/using-api/api-concepts/
- controller-runtime client package documentation - https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/client
- Kubernetes apimachinery strategicpatch package documentation - https://pkg.go.dev/k8s.io/apimachinery/pkg/util/strategicpatch
- RFC 7386: JSON Merge Patch - https://www.rfc-editor.org/rfc/rfc7386
- RFC 6902: JSON Patch - https://www.rfc-editor.org/rfc/rfc6902

## Issues Found
- The initial controller-runtime Pod patch examples created `&corev1.Pod{}` without `metadata.name` or `metadata.namespace`. A raw patch through controller-runtime needs to identify the target object, so I added `ObjectMeta` with `Name: "mypod"` and `Namespace: "default"` and imported `metav1`.
- The post said built-in Kubernetes resources have merge key annotations. This was too broad because strategic merge behavior is field-specific. I changed it to say many built-in resource fields define patch strategies and merge keys.
- The post recommended JSON merge patch for "CRDs without merge annotations," which could imply strategic merge patch works for some CRDs. Kubernetes documents that strategic merge patch is not supported for custom resources, so I changed the guidance to use JSON merge patch or JSON Patch for CRDs.

## Review Notes
- The main explanation of strategic merge patch list behavior, JSON merge patch array replacement, map merging, JSON Patch operations, and kubectl `--type` values matches the Kubernetes documentation and the relevant RFCs.
- `kubectl` was not installed in the local workspace, so CLI verification was performed against the official Kubernetes command reference instead of local `kubectl --help` output.
