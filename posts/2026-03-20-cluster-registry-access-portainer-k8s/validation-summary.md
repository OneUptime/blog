# Validation Summary: How to Set Up Cluster Registry Access in Portainer for Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- `kubectl`
- Kubernetes `Secret` and `ServiceAccount` resources
- EmberStack `kubernetes-reflector`

## Sources Consulted
- Portainer documentation, Kubernetes cluster registry access: https://docs.portainer.io/user/kubernetes/cluster/registries
- Portainer documentation, Kubernetes registry policy: https://docs.portainer.io/admin/environments/policies/kubernetes-policies/kubernetes-registry-policy
- Portainer source code, registry secret creation and default service account linking:
  https://github.com/portainer/portainer/blob/develop/api/kubernetes/cli/registries.go
  https://github.com/portainer/portainer/blob/develop/api/http/handler/endpoints/endpoint_registry_access.go
  https://github.com/portainer/portainer/blob/develop/app/react/kubernetes/components/K8sRegistryAccessNotice.tsx
- Kubernetes documentation, Configure Service Accounts for Pods: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes documentation, ServiceAccount admission behavior: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes documentation, Images: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes documentation, Secrets: https://kubernetes.io/docs/concepts/configuration/secret/
- `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic
- EmberStack `kubernetes-reflector` documentation: https://github.com/emberstack/kubernetes-reflector

## Issues Found
- The Portainer UI navigation was outdated. The post said to use `Settings > Registries` and `Environments > Edit`, but current Portainer documentation uses `Cluster > Registries` and `Manage access` to grant namespace access. Updated the steps to match current documentation.
- The post overstated the effect of Portainer-managed registry access. Portainer creates a Docker config secret in each authorized namespace and adds it to the namespace's `default` service account, but automatic pulls only apply to pods that use the `default` service account and do not define their own `imagePullSecrets`. Updated the explanation to reflect that scope.
- The secret-copy example was unsafe as written because copying full exported YAML between namespaces can include create-time metadata that should not be reused. Replaced it with a command that copies only the `.dockerconfigjson` payload and recreates the secret in the target namespace using current `kubectl` behavior.
- The verification example used a less reliable `grep` argument order. Adjusted the `grep -A5 imagePullSecrets` example to the canonical form.

## Review Notes
- Portainer registry access is scoped per environment and per namespace, not globally across every Kubernetes environment.
- Kubernetes copies `imagePullSecrets` from the referenced service account onto new pods only when the pod spec does not already define its own `imagePullSecrets`.
- The reflector annotations shown are valid for automatic mirroring to all namespaces because both the allowed-namespace and auto-namespace annotations are optional when broad scope is intended.
