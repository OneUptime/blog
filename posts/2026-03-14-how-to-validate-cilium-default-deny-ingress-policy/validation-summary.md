# Validation Summary: Validating Cilium Default Deny Ingress Policy Enforcement

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- CiliumEndpoint
- Hubble
- kubectl
- jq
- Bash

## Sources Consulted
- Cilium Policy Enforcement Modes: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Policy Enforcement: https://docs.cilium.io/en/latest/security/network/policyenforcement/
- Cilium Layer 3 Policy examples: https://docs.cilium.io/en/stable/security/policy/layer3.html
- CiliumEndpoint documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium API Reference for endpoint policy status fields: https://docs.cilium.io/en/stable/api/
- Cilium Hubble setup and observe examples: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium policy creation examples using Hubble verdicts: https://docs.cilium.io/en/stable/security/policy-creation/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The CiliumEndpoint enforcement check used `.status.policy.ingress.enforcing`, which is not the current CiliumEndpoint policy status shape documented by Cilium. Updated it to inspect `.status.policy.realized["policy-enabled"]` and report endpoints that are not enforcing `ingress` or `both`.
- The traffic probe expected `connection refused` as a normal default-deny result. Cilium policy enforcement drops unauthorized packets, so updated the expected result to `timeout or failed connection`.
- The verification section used `cilium endpoint list`, which is an agent/debug style endpoint inspection command and does not match the Kubernetes-facing workflow used elsewhere in the post. Replaced it with `kubectl get ciliumendpoints --all-namespaces`.

## Review Notes
- The namespace policy existence script checks `CiliumNetworkPolicy` objects whose names contain `default-deny`. Clusters that implement default deny with `CiliumClusterwideNetworkPolicy` would need an additional clusterwide check.
- The traffic probe assumes a `backend` service exists in the default namespace and that no egress policy blocks the probe pod before it reaches the target service.
