# Validation Summary: How to Filter Applications by Namespace in Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Kubernetes
- `kubectl`
- Kubernetes namespaces
- Kubernetes RBAC

## Sources Consulted
- Portainer Applications documentation: https://docs.portainer.io/user/kubernetes/applications
- Portainer Manage access to a namespace documentation: https://docs.portainer.io/2.33-lts/user/kubernetes/namespaces/access
- Portainer Roles documentation: https://docs.portainer.io/admin/user/roles
- Portainer Kubernetes roles and bindings documentation: https://docs.portainer.io/2.21/advanced/kubernetes-roles-and-bindings
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes `kubectl config set-context` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_set-context/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/

## Issues Found
- The Portainer section described undocumented “Shared mode” and “Isolated mode” namespace visibility settings and pointed to **Environments > Edit > Namespace access mode**. I replaced that with the current Portainer model: namespace visibility is controlled by roles and namespace assignments, and namespace access is managed from **Namespaces > Manage access** with Kubernetes RBAC enabled.
- The event examples used `kubectl get events --sort-by='.lastTimestamp'`. Current Kubernetes documentation provides the dedicated `kubectl events` command, and the API deprecation guide marks `lastTimestamp` as deprecated for `events.k8s.io/v1`. I updated the examples to use `kubectl events --namespace=production` and `kubectl events --namespace=production --types=Warning`.

## Review Notes
- The remaining `kubectl` namespace and label filtering examples are consistent with current Kubernetes documentation.
- Portainer RBAC behavior is edition- and role-dependent; the corrected section now reflects the current role-based access model documented by Portainer.
