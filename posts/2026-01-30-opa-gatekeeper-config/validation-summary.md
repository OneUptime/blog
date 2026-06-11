# Validation Summary: How to Implement OPA Gatekeeper Config

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OPA Gatekeeper
- Kubernetes admission control
- Kubernetes CustomResourceDefinitions
- Rego
- kubectl

## Sources Consulted
- Gatekeeper Replicating Data documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/sync/
- Gatekeeper Exempting Namespaces documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/exempt-namespaces/
- Gatekeeper Config CRD schema: https://github.com/open-policy-agent/gatekeeper/blob/master/config/crd/bases/config.gatekeeper.sh_configs.yaml
- Gatekeeper Customizing Admission Behavior documentation: https://open-policy-agent.github.io/gatekeeper/website/docs/customize-admission/
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/

## Issues Found
- The post described the Config resource as cluster-scoped. Gatekeeper's Config CRD is namespaced, so this was corrected to "namespaced singleton custom resource."
- The post used unsupported `includedNamespaces`, `matchLabels`, and `matchExpressions` fields under `spec.match`. Gatekeeper Config supports `excludedNamespaces` as strings with optional prefix/suffix globbing and `processes`, so those examples were replaced with valid namespace-name and glob examples.
- The `webhook` process was described as covering both validating and mutating admission. Gatekeeper documents `webhook` and `mutation-webhook` separately, so the description was corrected to validating admission webhook.
- The Unique Ingress Host Rego example used an incomplete `data.inventory.namespace[ns][_].Ingress[name]` path. It was corrected to include the `networking.k8s.io/v1` group/version key.
- The same-Ingress comparison only checked object name, which could skip a different Ingress with the same name in another namespace. It now compares both namespace and name.
- The conclusion implied Config is the only way to replicate cluster state. Current Gatekeeper documentation recommends SyncSet for data replication while still supporting Config, so the wording was updated to refer to data replication more generally.

## Review Notes
- Current Gatekeeper documentation lists SyncSet as the recommended data replication resource for Gatekeeper v3.15+, while Config `syncOnly` remains supported and documented.
