# Validation Summary: How to Deploy OPA Gatekeeper for Policy-Based Kubernetes Admission Control

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OPA Gatekeeper
- Kubernetes admission control
- Kubernetes Custom Resource Definitions
- Rego
- Helm
- kubectl
- Prometheus metrics

## Sources Consulted
- Gatekeeper Installation documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/install/
- Gatekeeper How to use Gatekeeper documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/v3.11.x/howto/
- Gatekeeper Constraint Templates documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper Handling Constraint Violations documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/violations/
- Gatekeeper Audit documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/audit/
- Gatekeeper Exempting Namespaces documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/exempt-namespaces/
- Gatekeeper Working with Workload Resources documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/workload-resources/
- Gatekeeper Metrics & Observability documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/
- Gatekeeper Library Allowed Repositories policy: https://open-policy-agent.github.io/gatekeeper-library/website/validation/allowedrepos/
- Gatekeeper Library Container Limits policy: https://open-policy-agent.github.io/gatekeeper-library/website/validation/containerlimits/

## Issues Found
- The kubectl install command used the `master` branch manifest. Updated it to the current official released manifest URL, `v3.22.2`, because the Gatekeeper installation documentation recommends installing a released version with a versioned manifest.
- The allowed container repositories constraint matched `apps/Deployment`, but the Rego checked `input.review.object.spec.containers[_]`, which is a Pod field. Updated the constraint to match Pods so the snippet works with the shown policy logic.
- The resource limits `ConstraintTemplate` used the `v1` template API without a structural parameter schema. Added an empty `openAPIV3Schema` with `type: object`, matching the structural schema requirement for `v1` templates.
- The metrics example port-forwarded `svc/gatekeeper-webhook-service` from local port 8888 to service port 443 and used HTTPS. Updated it to port-forward `deployment/gatekeeper-controller-manager` on port 8888 and use `http://localhost:8888/metrics`, matching Gatekeeper's Prometheus metrics port.
- The metrics list used `gatekeeper_constraint_template_count`, which is not the current metric name. Updated it to `gatekeeper_constraint_templates`.

## Review Notes
The Pod-scoped image and resource examples are technically correct for direct Pod admission. For full workload-template admission on resources such as Deployments, Gatekeeper's workload resource validation features or Rego that explicitly reads `spec.template.spec.containers` would be needed.
