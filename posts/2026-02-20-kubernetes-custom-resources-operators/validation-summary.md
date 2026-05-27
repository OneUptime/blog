# Validation Summary: How to Build Kubernetes Custom Resources and Operators

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes CustomResourceDefinitions
- Kubernetes custom resources
- Kubernetes Deployments and Services
- Kubernetes RBAC
- kubectl
- Kopf
- Python Kubernetes client
- OneUptime

## Sources Consulted
- Kubernetes CustomResourceDefinition API reference: https://kubernetes.io/docs/reference/kubernetes-api/apiextensions/custom-resource-definition-v1/
- Kubernetes CustomResourceDefinition task documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes owners and dependents documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/owners-dependents/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kopf command-line options documentation: https://docs.kopf.dev/en/stable/cli/
- Kopf deployment and RBAC documentation: https://docs.kopf.dev/en/stable/deployment/
- Kopf handler decorator documentation: https://docs.kopf.dev/en/stable/packages/kopf.on/
- Kopf hierarchy and owner-reference documentation: https://docs.kopf.dev/en/stable/hierarchies/
- Kubernetes Python client repository: https://github.com/kubernetes-client/python

## Issues Found
- The post description said the tutorial used the Operator SDK, but the implementation uses the Kopf framework. Changed the description to say Kopf.
- The generated Deployment and Service objects did not include `managed-by=webapp-operator` metadata labels, so the documented `kubectl get ... -l managed-by=webapp-operator` verification commands would not find them. Added matching metadata labels to both generated objects.
- The update handler rebuilt only the Deployment. If `spec.port` changed, the Service would remain on the old port. Added a Service patch in the update handler.
- The operator manifest deployed resources into the `operators` namespace but did not create that namespace. Added a Namespace manifest before the namespaced resources.

## Review Notes
The Python example was syntax-checked with `python3 -m py_compile`, and all YAML snippets were parsed successfully with PyYAML. `kubectl` is not installed in this workspace, so CLI behavior was verified against the official Kubernetes command reference instead of local `kubectl --help` output. The example remains intentionally minimal; production operators should add owner references, status updates, more idempotent create-or-patch behavior, and more complete RBAC for Kopf discovery or explicitly disable discovery.
