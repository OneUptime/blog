# Validation Summary: Validating Cilium Policy Language Constructs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- kubectl
- Hubble CLI
- jq

## Sources Consulted
- Cilium Network Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium Policy Enforcement Modes and endpoint selector documentation: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Kubernetes policy constructs documentation: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium debug CLI policy command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_policy/
- Cilium Hubble CLI flow inspection documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium L7 visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpoint/
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/

## Issues Found
- The selector validation script counted `CiliumEndpoint.metadata.labels`, but Cilium documents endpoint details, including labels, under the CiliumEndpoint `.status` field, and `endpointSelector` applies to pods in the policy namespace. Reworked the example to convert simple `endpointSelector.matchLabels` values into a Kubernetes pod label selector and count matching pods.
- The post used `cilium policy trace`, but the current Cilium CLI command reference does not include a `policy trace` subcommand. Replaced it with a practical traffic generation command and Hubble observations for HTTP and dropped traffic.
- The post used `cilium policy get` for verification. Current Cilium CLI documentation focuses on cluster management commands such as `cilium status`, while agent-side policy inspection is under `cilium-dbg` and `cilium-dbg policy get` is deprecated. Replaced the verification command with `cilium status`.
- The prerequisites omitted Hubble even though the examples use `hubble observe`. Added Hubble enablement and CLI configuration as a prerequisite for L7 flow inspection.
- The troubleshooting section referenced `cilium endpoint list`, which is not the current documented agent debug command. Updated it to point readers to `kubectl get ciliumendpoints -o json` or `cilium-dbg endpoint list`.

## Review Notes
The selector validation script only handles `endpointSelector.matchLabels`; policies using `matchExpressions` or multiple rules under `specs` need additional handling. This is acceptable for a concise example, but it should be called out if the post is expanded later.
