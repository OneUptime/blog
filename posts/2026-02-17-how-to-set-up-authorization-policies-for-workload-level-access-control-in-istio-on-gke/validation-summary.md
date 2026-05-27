# Validation Summary: How to Set Up Authorization Policies for Workload-Level Access Control

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio AuthorizationPolicy
- Google Kubernetes Engine (GKE)
- Kubernetes service accounts
- Istio mutual TLS identity
- Envoy RBAC logging
- kubectl and istioctl

## Sources Consulted
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio authorization for HTTP traffic task: https://istio.io/latest/docs/tasks/security/authorization/authz-http/
- Istio explicit DENY task: https://istio.io/latest/docs/tasks/security/authorization/authz-deny/
- Istio security troubleshooting guide: https://istio.io/latest/docs/ops/common-problems/security-issues/
- Istio command reference for istioctl: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Google Cloud Service Mesh authorization policy overview: https://cloud.google.com/service-mesh/docs/security/authorization-policy-overview

## Issues Found
- The AuthorizationPolicy manifests used `apiVersion: security.istio.io/v1beta1`. Updated them to `security.istio.io/v1`, which is the current API version shown in the latest Istio documentation.
- The deny-all explanation said an empty spec means "match all traffic". Reworded it to state that an empty ALLOW policy matches no requests, which is the documented way to deny all traffic for the policy scope.
- The authorization evaluation diagram omitted the `CUSTOM` policy step even though the text correctly described it. Updated the Mermaid flow so it reflects Istio's documented evaluation order: `CUSTOM`, then `DENY`, then `ALLOW`.
- The deny-all verification command executed `curl` from the `istio-proxy` container. Updated it to execute from the frontend deployment in the `my-app` namespace, because application containers are the expected place to run request tests and proxy images should not be assumed to include `curl`.
- The DENY policy example matched HTTP paths without scoping the rule to a port. Added `ports: ["8080"]` because Istio treats missing HTTP attributes as matches for DENY policies on TCP traffic, and the official docs recommend scoping DENY rules that use HTTP attributes to specific ports.
- The database denial test used `curl` against port `5432` and expected an HTTP `403`. Replaced it with a TCP connectivity check and updated the expected result, because a denied TCP connection should fail rather than return an HTTP status code.
- The RBAC debug logging command used Envoy's admin endpoint through `kubectl exec`. Replaced it with the documented `istioctl proxy-config log ... --level "rbac:debug"` command and added the namespace to the log retrieval command.

## Review Notes
- The examples assume Istio mutual TLS is enabled, which is required for `source.principal` and `source.namespace` matches.
- The hardcoded API key example is syntactically valid as an AuthorizationPolicy condition, but a production system should avoid static shared secrets in manifests.
- `CUSTOM` authorization behavior depends on an external authorization provider configured in Istio. Google Cloud Service Mesh has product-specific limitations around `CUSTOM` depending on the API mode used.
