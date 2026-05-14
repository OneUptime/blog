# Validation Summary: Cilium CRD Schema Validation: Configure, Troubleshoot, Validate, and Monitor

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes CustomResourceDefinitions
- Kubernetes OpenAPI v3 schema validation
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- Helm
- kubectl

## Sources Consulted
- Cilium documentation: CRD Validation, https://docs.cilium.io/en/latest/network/kubernetes/configuration/#crd-validation
- Cilium documentation: Upgrade Guide, https://docs.cilium.io/en/latest/operations/upgrade/
- Cilium documentation: Network Policy, https://docs.cilium.io/en/latest/network/kubernetes/policy/
- Cilium generated CRD manifests, https://github.com/cilium/cilium/tree/v1.19.3/pkg/k8s/apis/cilium.io/client/crds
- Kubernetes documentation: API concepts and field validation, https://kubernetes.io/docs/reference/using-api/api-concepts/#field-validation
- Kubernetes documentation: CustomResourceDefinitions, https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Helm documentation: Custom Resource Definitions, https://helm.sh/docs/chart_best_practices/custom_resource_definitions/

## Issues Found
- The post claimed CRD schema validation starts with Cilium 1.12. Cilium documents CiliumNetworkPolicy CRD validation as present since v1.0.0-rc3, so the introduction now states that validation existed in early 1.0 releases and that current CRDs use OpenAPI v3 schemas.
- The upgrade example used `helm upgrade --reuse-values` for a version upgrade and stated Helm automatically updates CRDs. Cilium's upgrade guide warns against `--reuse-values` across minor upgrades, and Helm's generic CRD lifecycle does not support CRD upgrades from a chart `crds/` directory. The example now writes existing values to a file, uses `-f old-values.yaml`, and describes Cilium's supported installation flow.
- The manual CRD example used `helm pull` followed by `kubectl apply -f cilium/crds/`, but the Cilium chart does not expose that path. The post now points to the generated CRD manifests in the Cilium source tree.
- The webhook section implied an optional validation webhook was needed for stricter basic schema validation. It now clarifies that CiliumNetworkPolicy schema validation is handled by the CRD schema and does not require a separate webhook.
- The unknown-field error example used an older `ValidationError(...)` style message. It now uses the current strict server-side field validation form.
- The CRD presence loop read the last CRD condition, which is not guaranteed to be the `Established` condition. It now uses `kubectl wait --for=condition=Established`.
- The Cilium operator log selector used `name=cilium-operator`; Cilium tooling documents `io.cilium/app=operator` as the operator selector. The command now uses that selector.
- The monitoring section claimed to validate existing CiliumNetworkPolicies but only listed them. It now validates policy manifests with `kubectl apply --dry-run=server --validate=strict`.

## Review Notes
The post is technically relevant and includes runnable commands. Some CRD lists vary by Cilium version and enabled features, so the article now describes the sample list as commonly used CRDs rather than all Cilium CRDs.
