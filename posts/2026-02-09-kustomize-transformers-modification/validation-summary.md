# Validation Summary: How to implement Kustomize transformers for custom resource modification

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kustomize
- KRM exec functions
- YAML
- Python

## Sources Consulted
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize, https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization
- Kubernetes kubectl reference: kubectl kustomize, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kustomize reference: The Kustomization File, https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/
- Kustomize reference: commonLabels, https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/commonlabels/
- Kustomize reference: labels, https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/labels/
- Kustomize reference: images, https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/images/
- Kustomize reference: replicas, https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/replicas/
- Kustomize reference: namePrefix and nameSuffix, https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/nameprefix/ and https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/namesuffix/
- Kustomize transformer configuration examples, https://github.com/kubernetes-sigs/kustomize/blob/master/examples/transformerconfigs/README.md
- Kubernetes Ingress documentation, https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kustomize v5.8.1 CLI help and local smoke tests using the official GitHub release binary.

## Issues Found
- Replaced deprecated `commonLabels` kustomization examples with the current `labels` field and `includeSelectors: true`, because Kustomize deprecated `commonLabels` in v5.0.0.
- Clarified selector-label warnings. Kubernetes selectors are immutable for several workload fields, so selector label changes can be rejected or require resource recreation.
- Replaced the placeholder image digest with a syntactically valid SHA-256 digest.
- Updated the custom exec transformer example to use the KRM `ResourceList` wire format with `functionConfig` and `items`, and added the required function annotation path.
- Updated the Python transformer to process both `containers` and `initContainers`, parse `functionConfig`, and emit a modified `ResourceList`.
- Updated the debug command for raw exec functions to include `--enable-exec` as required by current Kustomize.
- Replaced deprecated `bases` overlay usage with `resources`.
- Corrected the replica/name-prefix explanation. Current Kustomize can match the replicas entry by the original resource name or transformed name.
- Updated the custom `nameReference` Ingress field paths from the old `spec/serviceName` shape to current `networking.k8s.io/v1` service backend paths.
- Clarified namespace behavior to say Kustomize applies the namespace to namespaced resources, not only resources that already contain a namespace field.

## Review Notes
The revised examples were smoke-tested with Kustomize v5.8.1. The Python transformer snippet compiles with Python 3 and successfully mutates a Deployment through Kustomize's raw exec function support when run with `--enable-alpha-plugins --enable-exec`.
