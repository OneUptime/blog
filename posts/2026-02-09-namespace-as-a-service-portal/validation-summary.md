# Validation Summary: How to Implement Namespace-as-a-Service Self-Service Portals on Kubernetes

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes Namespaces
- Kubernetes ResourceQuota
- Kubernetes RBAC
- Kubernetes Services and Deployments
- Kubernetes Python client
- FastAPI
- React
- Argo Workflows
- Slack Web API

## Sources Consulted
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes API reference for Namespaces: https://kubernetes.io/docs/reference/kubernetes-api/core/namespace-v1/
- Kubernetes Python client repository and examples: https://github.com/kubernetes-client/python
- Kubernetes Python client configuration docs: https://k8s-python.readthedocs.io/en/stable/kubernetes.config.html
- FastAPI query parameter docs: https://fastapi.tiangolo.com/tutorial/query-params/
- React useState docs: https://react.dev/reference/react/useState
- Argo Workflows suspend template docs: https://argo-workflows.readthedocs.io/en/latest/walk-through/suspending/
- Argo Workflows intermediate parameters docs: https://argo-workflows.readthedocs.io/en/latest/intermediate-inputs/

## Issues Found
- The backend used `config.load_kube_config()` even though the deployment runs the portal inside Kubernetes. Changed the snippet to try `config.load_incluster_config()` first and fall back to kubeconfig for local development.
- The frontend initialized `name` in the request payload but did not provide a namespace name field, and the backend ignored `request.name` when creating the namespace. Added the form field and used the requested name in backend namespace, quota, RBAC, and response logic.
- The Argo Workflows approval condition referenced `steps.wait-for-approval.outputs.result`, but a suspend template does not automatically produce that result. Added an intermediate approval parameter with `valueFrom.supplied` and updated the `when` expressions to use `steps.wait-for-approval.outputs.parameters.approval`.
- The Argo workflow configured resources even if namespace creation was skipped. Added the same approval condition to the resource configuration step.
- The Kubernetes Service exposed only the frontend container's port while the application includes a backend API. Updated the Service to expose named frontend and backend ports.
- The deployment referenced `naas-portal-sa` but did not define the ServiceAccount or RBAC needed for namespace, quota, RoleBinding, and NetworkPolicy operations. Added ServiceAccount, ClusterRole, and ClusterRoleBinding manifests.
- The cost tracking snippet referenced `parse_cpu` and `parse_memory` without definitions. Added helper functions for common Kubernetes CPU and memory quantity formats.

## Review Notes
- Several helper functions remain intentionally application-specific placeholders, including request persistence, notifications, network policy creation, and kubeconfig generation.
- The Argo intermediate parameter approval pattern requires Argo Workflows v3.4 or later.
- `bitnami/kubectl:latest` is valid as an example image reference, but production manifests should pin immutable image tags or digests.
