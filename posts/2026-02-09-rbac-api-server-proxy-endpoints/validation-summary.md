# Validation Summary: How to Use RBAC to Control Access to Kubernetes API Server Proxy Endpoints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RBAC
- Kubernetes API server subresources
- kubectl
- Kubernetes audit policy
- Prometheus alerting for Kubernetes API server metrics

## Sources Consulted
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes Node API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/node-v1/
- kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes audit configuration reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics
- Kubernetes service proxy URL documentation: https://kubernetes.io/docs/tasks/access-application-cluster/access-cluster-services/

## Issues Found
- The development debug ClusterRole grouped `pods`, `pods/log`, and connect subresources under `get`, `list`, and `create`, which unintentionally granted `create` on pods and granted nonsensical verbs on log subresources. I split the rule so pods are `get/list`, logs are `get`, and exec, port-forward, and attach are `create`.
- The service proxy example used `my-service:8080` in the API path. Kubernetes service proxy URL documentation describes the optional suffix as a service port name, so I changed the example to `my-service:http`.
- The Prometheus alert queried `apiserver_audit_event_total` with `subresource` and `user` labels. Kubernetes documents that metric as an unlabeled counter, so I changed the example to use `apiserver_request_total` with `resource` and `subresource` labels and removed the per-user grouping.
- The break-glass RoleBinding manifest was in a `bash` fenced block even though the content is YAML. I changed the fence to `yaml`.

## Review Notes
The RBAC examples use current `rbac.authorization.k8s.io/v1` APIs and the pod exec, attach, port-forward, log, service proxy, and node proxy subresources match current Kubernetes API documentation. `kubectl` was not installed in the local workspace, so kubectl command validation was performed against the official generated kubectl documentation instead of local `--help` output.
