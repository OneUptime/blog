# Validation Summary: Validating Sample Network Policies in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- CiliumEndpoint
- Kubernetes
- kubectl
- Hubble CLI
- Bash
- jq

## Sources Consulted
- Cilium documentation: Policy Enforcement Modes, https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium documentation: Using Kubernetes Constructs In Policy, https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium documentation: Inspecting Network Flows with the CLI, https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium documentation: Setting up Hubble Observability, https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium CiliumEndpoint CRD source, https://raw.githubusercontent.com/cilium/cilium/v1.19.3/pkg/k8s/apis/cilium.io/client/crds/v2/ciliumendpoints.yaml
- Kubernetes documentation: Labels and Selectors, https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes documentation: JSONPath Support, https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The policy-selection script used `kubectl -o jsonpath` to read `.spec.endpointSelector.matchLabels` and then piped the result to `jq`. Kubernetes JSONPath prints result objects using their string representation, not JSON, so this is not reliable input for `jq`. I changed the command to retrieve the policy as JSON and use `jq` to build a Kubernetes label selector.
- The policy-selection script only handled `matchLabels`, but Cilium `endpointSelector` is based on Kubernetes `LabelSelector` and may also use `matchExpressions`. I updated the script to handle `In`, `NotIn`, `Exists`, and `DoesNotExist` expressions and to treat an empty selector as all pods in the namespace.
- The denied-traffic example said a policy denial could be expected to produce "connection refused." Cilium's documented default deny behavior is to silently drop denied traffic, which results in timeouts; L7 policy can produce an explicit non-2xx response. I updated the expected result accordingly.

## Review Notes
- The `CiliumEndpoint` status paths `.status.policy.ingress.enforcing` and `.status.policy.egress.enforcing` are present in the Cilium v1.19.3 CRD.
- The `hubble observe` examples are consistent with Cilium's Hubble CLI documentation, assuming Hubble is configured and reachable as stated in the prerequisites.
