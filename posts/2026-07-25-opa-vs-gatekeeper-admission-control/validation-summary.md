# Validation Summary: OPA vs Gatekeeper: What Actually Runs Where in Kubernetes Admission Control?

## Status

validated

## Post Type

Technical reference and troubleshooting guide

## Technologies Covered

- Open Policy Agent (OPA)
- OPA Rego
- Gatekeeper
- Gatekeeper ConstraintTemplates and Constraints
- Gatekeeper audit, mutation, status, generation, and data replication operations
- Gatekeeper CEL and Kubernetes Validating Admission Policy integration
- Kubernetes dynamic admission control
- Kubernetes Services and EndpointSlices
- kubectl

## Sources Consulted

- [Gatekeeper introduction and OPA comparison](https://open-policy-agent.github.io/gatekeeper/website/docs/)
- [Gatekeeper operations architecture](https://open-policy-agent.github.io/gatekeeper/website/docs/operations/)
- [Gatekeeper ConstraintTemplates](https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/)
- [Gatekeeper admission review input](https://open-policy-agent.github.io/gatekeeper/website/docs/input/)
- [Gatekeeper audit](https://open-policy-agent.github.io/gatekeeper/website/docs/audit/)
- [Gatekeeper mutation](https://open-policy-agent.github.io/gatekeeper/website/docs/mutation/)
- [Gatekeeper replicated data and SyncSets](https://open-policy-agent.github.io/gatekeeper/website/docs/sync/)
- [Gatekeeper integration with Kubernetes Validating Admission Policy](https://open-policy-agent.github.io/gatekeeper/website/docs/validating-admission-policy/)
- [Gatekeeper runtime flags](https://open-policy-agent.github.io/gatekeeper/website/docs/runtime-flags/)
- [Gatekeeper customizable admission behavior](https://open-policy-agent.github.io/gatekeeper/website/docs/customize-admission/)
- [Gatekeeper v3.23.0 deployment manifest](https://raw.githubusercontent.com/open-policy-agent/gatekeeper/v3.23.0/deploy/gatekeeper.yaml)
- [Open Policy Agent documentation](https://www.openpolicyagent.org/docs)
- [Open Policy Agent integration options](https://www.openpolicyagent.org/docs/integration)
- [Kubernetes dynamic admission control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes Services and the deprecated Endpoints API](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes EndpointSlice API](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/)
- [Kubernetes Endpoints deprecation announcement](https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)

## Issues Found

- The post described OPA as Gatekeeper's policy evaluation engine without limiting that statement to Rego policies. Current Gatekeeper also supports CEL-based ConstraintTemplates and Kubernetes Validating Admission Policy generation. The introduction, request-path scope, OPA input description, and ownership summary were narrowed to the Rego-backed path.
- The request-path explanation said that Gatekeeper returns an `AdmissionResponse` directly. Kubernetes requires a webhook response body to be an `AdmissionReview` with its `response` field populated. The text now describes that envelope accurately.
- The post attributed Constraint CRD creation to the validating-webhook operation and did not distinguish per-pod status reporting from aggregation. Current Gatekeeper exposes separate `generate` and singleton `status` operations. The operations description now assigns CRD and optional VAP/VAPB generation to `generate`, webhook serving to `webhook`, and status aggregation to `status`.
- The troubleshooting command queried the deprecated core `Endpoints` API. Kubernetes deprecated that API in v1.33. The command now queries the Service and its `EndpointSlice` resources using the standard `kubernetes.io/service-name` label.
- The troubleshooting checklist referred to every Gatekeeper replica when checking admission consistency. It now correctly scopes that check to admission-serving replicas.

## Review Notes

- The review used Gatekeeper v3.23.x and Kubernetes v1.36 documentation, which were current on the validation date. The post does not declare a fixed product version.
- `SyncSet` and the legacy singleton `Config` replication mechanisms are both documented, but their feature maturity and recommended choice can vary by Gatekeeper version.
- Gatekeeper's normal constraint webhook configuration fails open by default with `failurePolicy: Ignore`; the namespace-label protection webhook uses `Fail`. The post's statement that audit can later detect resources admitted during an outage is therefore valid for auditable constraints.
