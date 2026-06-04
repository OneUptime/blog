# Validation Summary: How to Use kubectl get --raw to Query Raw API Endpoints

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes API
- kubectl
- Kubernetes Metrics API
- API Priority and Fairness
- Kubernetes OpenAPI
- Kubernetes admissionregistration API
- jq, grep, curl, and shell scripting

## Sources Consulted
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes API overview and OpenAPI documentation: https://kubernetes.io/docs/concepts/overview/kubernetes-api/
- Kubernetes API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes Metrics API v1beta1 reference: https://kubernetes.io/docs/reference/external-api/metrics.v1beta1/
- Kubernetes API Priority and Fairness documentation: https://kubernetes.io/docs/concepts/cluster-administration/flow-control/
- Kubernetes deprecated API migration guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes PriorityLevelConfiguration v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/flowcontrol/priority-level-configuration-v1/
- Kubernetes Pod v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes ValidatingAdmissionPolicy v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-admission-policy-v1/

## Issues Found
- The pod metrics example used `jq '.usage'`, but PodMetrics exposes usage under each container. Changed it to `jq '.containers[].usage'`.
- The API Priority and Fairness examples used `flowcontrol.apiserver.k8s.io/v1beta3`, which was removed in Kubernetes v1.32. Updated the examples to the stable `flowcontrol.apiserver.k8s.io/v1` API.
- The OpenAPI v3 root endpoint was described as the OpenAPI v3 spec. Updated the comment and output filename to clarify that `/openapi/v3` returns the OpenAPI v3 discovery document.
- The health check script checked `/healthz` and compared response bodies to `ok`. Kubernetes documents `/healthz` as deprecated and recommends machines rely on HTTP status codes. Updated the script to check `/readyz` and `/livez` using the command exit status.
- The curl example was labeled equivalent to `kubectl get --raw`, but it uses a service account token rather than the user's kubeconfig identity and may have different permissions. Changed the wording to "Comparable curl command using a service account token" and quoted the URL.

## Review Notes
`kubectl` was not installed in the local workspace, so command behavior was checked against official Kubernetes documentation rather than local `kubectl --help` output.
