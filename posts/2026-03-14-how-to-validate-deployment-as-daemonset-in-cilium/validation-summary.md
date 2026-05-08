# Validation Summary: Validating DaemonSet Deployment in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- CiliumEndpoint CRDs
- Hubble
- kubectl
- Bash
- jq

## Sources Consulted
- Cilium policy language documentation: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium Layer 3 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer3.html
- Cilium Kubernetes policy documentation: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium command reference for `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium command reference for `cilium status`: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference for `cilium-dbg policy get`: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_policy_get.html
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/

## Issues Found
- The original validation policy used `CiliumClusterwideNetworkPolicy` with `nodeSelector`, which is a host policy pattern, but the connectivity tests validated pod-to-pod traffic between `client`, `server`, and `unauthorized` pods. Replaced it with a namespace-scoped `CiliumNetworkPolicy` selecting `app=server` and allowing ingress only from `app=client` on TCP port 80, so the allowed and denied traffic examples match the policy semantics.
- The original endpoint inspection command used `cilium endpoint list` directly. In current Cilium documentation, endpoint listing is provided by `cilium-dbg endpoint list` inside an agent context, while cluster-wide Kubernetes inspection should use the `CiliumEndpoint` CRD. Updated the examples to use `kubectl get ciliumendpoints`.
- The script used `cilium policy get`, which is documented under `cilium-dbg policy get` and marked deprecated. Updated the policy count check to query `ciliumnetworkpolicies.cilium.io` through Kubernetes instead.
- The verification section used `cilium endpoint health`, which is an agent debug command rather than a standard top-level Cilium CLI command. Updated it to inspect `CiliumEndpoint` resources in the validation namespace.
- The examples rely on `jq`, but it was not listed in the prerequisites. Added `jq` to the prerequisites.

## Review Notes
The post is technically validated after correction. The title and framing still refer to validating a DaemonSet deployment model, while the corrected runnable examples now validate Cilium policy enforcement for workloads in a validation namespace. A future editorial pass could clarify whether the guide is about Cilium agent DaemonSet health, host policies, or workload network policy validation.
