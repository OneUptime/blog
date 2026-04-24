# Validation Summary: How to Filter Applications by Namespace in Portainer - Apps

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer Business Edition
- Kubernetes namespaces
- `kubectl`
- `jq`

## Sources Consulted
- Portainer Applications documentation: https://docs.portainer.io/user/kubernetes/applications
- Portainer namespace access management documentation: https://docs.portainer.io/2.33-lts/user/kubernetes/namespaces/access
- Portainer Kubernetes roles and bindings documentation: https://docs.portainer.io/sts/advanced/kubernetes-roles-and-bindings
- Portainer ConfigMaps & Secrets documentation: https://docs.portainer.io/sts/user/kubernetes/configurations
- Portainer Services documentation: https://docs.portainer.io/sts/user/kubernetes/networking/services
- Portainer Volumes documentation: https://docs.portainer.io/2.33-lts/user/kubernetes/volumes
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl config set-context` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_set-context/
- Kubernetes Labels and Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- jq manual: https://jqlang.org/manual/v1.6/

## Issues Found
- The post originally described a global top-bar namespace selector and implied that changing it filtered all Kubernetes views. Portainer's official docs document a namespace dropdown on the Applications page, so Step 1 was corrected to match the documented UI.
- The original Business Edition section claimed a namespace quick-switch and cross-namespace global search behavior that I could not validate in Portainer's official docs. I replaced that section with documented namespace access control behavior based on Kubernetes RBAC and Portainer roles.
- The original "other resources" section said the same namespace filter applies across all Kubernetes resource views and persists across pages. Portainer's docs show page-specific behavior instead, so that section was rewritten to distinguish between dropdown filtering, filter menus, and namespace columns.
- The original `jq` example assumed every Kubernetes Service has `.spec.ports`. That can fail for Services such as `ExternalName`, so I changed the expression to use `.spec.ports[]?` and safely skip services without ports.
- The label-filtering section claimed Portainer search can filter by labels. I narrowed this to `kubectl` because that behavior is documented in Kubernetes, while I could not validate the Portainer claim from official docs.

## Review Notes
- Portainer documentation is versioned, so exact UI wording can vary slightly between releases. The corrected post matches the current official documentation available on 2026-04-24.
