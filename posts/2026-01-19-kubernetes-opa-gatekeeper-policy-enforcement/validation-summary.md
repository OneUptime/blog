# Validation Summary: How to Set Up OPA Gatekeeper for Kubernetes Policy Enforcement

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- OPA Gatekeeper
- Open Policy Agent / Rego
- Gatekeeper ConstraintTemplates and Constraints
- Gatekeeper audit, sync, and namespace exclusions
- Helm
- kubectl
- Prometheus / Prometheus Operator ServiceMonitor and PrometheusRule
- gator CLI

## Sources Consulted
- Gatekeeper installation documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/install/
- Gatekeeper ConstraintTemplate documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/constrainttemplates/
- Gatekeeper usage documentation for validation, constraints, and enforcement actions: https://open-policy-agent.github.io/gatekeeper/website/docs/howto/
- Gatekeeper sync / replicated data documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/sync/
- Gatekeeper namespace exemption documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/exempt-namespaces/
- Gatekeeper metrics and observability documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/metrics/
- Gatekeeper OPA version matrix: https://open-policy-agent.github.io/gatekeeper/website/docs/opa-versions/
- Gatekeeper gator CLI documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/gator/
- Gatekeeper GitHub releases page: https://github.com/open-policy-agent/gatekeeper/releases
- Gatekeeper Helm chart README and values references: https://github.com/open-policy-agent/gatekeeper/tree/master/charts/gatekeeper

## Issues Found
- The kubectl install command was described as installing the latest Gatekeeper release but pinned `v3.14.0`. Updated it to `v3.22.2`, the current stable release identified in the official Gatekeeper install docs and GitHub releases.
- The Helm repository URL used the older release-download location. Updated it to the official chart repo URL, `https://open-policy-agent.github.io/gatekeeper/charts`.
- Several container policy templates matched workload controllers such as Deployments, StatefulSets, and DaemonSets but only inspected `input.review.object.spec.containers`, which works for Pods but not controller pod templates. Updated the Rego examples to resolve the Pod spec from either a Pod or a controller's `spec.template.spec`.
- The resource-limits policy claimed to check all containers for CPU and memory limits but only partially checked init containers and did not cover ephemeral containers. Updated it to evaluate regular, init, and ephemeral containers through a shared helper.
- The image-registry and latest-tag examples had the same Pod-only inspection problem. Updated them to inspect all relevant containers from Pods and controller pod templates.
- The latest-tag policy treated image registry ports as tags and treated digest references without tags as `latest`. Updated the logic to check the final image path segment for tags and to avoid flagging digest-pinned references as implicit latest.
- The PDB policy referenced `data.inventory` but did not show the required sync configuration. Added a minimal SyncSet example for `policy/v1` PodDisruptionBudget resources.
- The Config resource example attempted to exclude a resource kind globally using fields that are not part of the documented Config namespace exclusion example. Removed that invalid resource-kind exclusion.
- The Prometheus metric examples used non-current Gatekeeper metric names such as `gatekeeper_webhook_duration_seconds` and `gatekeeper_webhook_request_count`. Updated them to the documented `gatekeeper_validation_request_duration_seconds`, `gatekeeper_validation_request_count`, and `gatekeeper_violations` metrics.
- The alert examples used `increase()` on `gatekeeper_violations`, which is documented as a LastValue gauge, and grouped by a non-documented `constraint_kind` label. Updated the alert to threshold the gauge by `enforcement_action`.
- The troubleshooting section suggested `conftest` for directly testing Gatekeeper ConstraintTemplates. Replaced it with Gatekeeper's `gator` CLI, which is the official local testing tool for Gatekeeper templates and constraints.

## Review Notes
- I could not run local `kubectl` or `helm` validation because those binaries are not installed in this environment. Commands and flags were checked against upstream Gatekeeper documentation and chart references instead.
- The example policies are still illustrative and intentionally compact. For production PDB enforcement, selector matching should be tightened so the policy verifies that an existing PodDisruptionBudget actually selects the Deployment's pods rather than only checking that a PDB exists in the namespace.
