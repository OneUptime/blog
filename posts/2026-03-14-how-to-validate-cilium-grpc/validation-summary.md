# Validation Summary: Validating gRPC Traffic in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- gRPC
- Hubble
- Bash
- jq

## Sources Consulted
- Cilium official "Securing gRPC" documentation: https://docs.cilium.io/en/stable/security/grpc/
- Cilium official Layer 7 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium official command cheatsheet: https://docs.cilium.io/en/stable/cheatsheet/
- Cilium official command reference for `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium official Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Cilium official CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html

## Issues Found
1. **Validation workloads were not gRPC workloads**: The original setup used `nginx` and `busybox` with HTTP `wget` tests, while the post is about gRPC-aware Cilium policy. Replaced those workloads with Cilium's official gRPC demo application so the validation commands exercise actual gRPC traffic.
2. **Policy did not match the test namespace or workload labels**: The original policy targeted namespace `production`, labels `app=grpc-server` and `app=grpc-client`, and method paths unrelated to the deployed test workloads. Updated the policy to target the validation namespace, the official `cc-door-mgr` and `public-terminal` labels, and Cilium's documented gRPC method paths.
3. **Endpoint and policy inspection commands used stale or inappropriate CLI forms**: The original examples used `cilium endpoint list` and `cilium policy get`, while current Cilium Kubernetes documentation recommends inspecting `CiliumEndpoint` and `CiliumNetworkPolicy` resources with `kubectl`, or using `cilium-dbg` inside agent contexts. Updated the examples and script to use `kubectl get cep` and `kubectl get cnp`.
4. **Traffic tests did not validate gRPC authorization**: The original commands used HTTP `wget` requests against an Nginx service. Replaced them with the demo gRPC client calls for an allowed method and a denied method.
5. **Hubble guidance incorrectly assumed all denied gRPC traffic should be verified as packet drops**: Cilium Layer 7 policy enforcement can return application-level denials. Updated the flow inspection example to review recent L7 HTTP/gRPC flow events instead of relying only on `--verdict DROPPED`.
6. **Verification used an invalid `cilium endpoint health` command**: Replaced it with the documented `cilium-health status` command.

## Review Notes
- The Cilium gRPC policy model documented by Cilium maps gRPC calls to HTTP `POST` requests with paths of the form `/package.Service/Method`, so using `rules.http` for gRPC method filtering is correct.
- `cilium connectivity test` validates broader cluster connectivity and Cilium behavior; it is useful in the workflow but does not specifically prove this custom gRPC policy by itself.
