# Validation Summary: Validating Client Terminal Setup in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- kubectl
- Hubble CLI
- Bash
- jq

## Sources Consulted
- Cilium policy rule basics and enforcement model: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Kubernetes policy namespace semantics and kube-dns examples: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium Layer 4 policy syntax and accepted protocol values: https://docs.cilium.io/en/stable/security/policy/layer4/
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpoint/
- Cilium CLI command reference for `cilium status` and `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Hubble CLI flow observation documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/

## Issues Found
- The sample CiliumNetworkPolicy used namespace `testing` and labels `app: test-client` / `app: test-server`, but the setup commands created namespace `cilium-validate` with labels `app=client` and `app=server`. Updated the policy to target the created namespace and labels.
- The unauthorized-client test would not have been blocked by the original egress-only policy because it selected only the client endpoint. Updated the policy to use `specs` with a client egress rule and a server ingress rule that only allows traffic from `app=client`.
- The kube-dns namespace label in `toEndpoints` was missing the `k8s:` label source prefix used in Cilium's Kubernetes policy examples. Updated it to `k8s:io.kubernetes.pod.namespace`.
- The DNS rule used `protocol: ANY`; while accepted by Cilium, the official kube-dns examples use UDP for port 53. Updated the example to UDP to match the documented common case.
- The post said to apply the policy but only showed YAML. Added the corresponding `kubectl apply -f client-terminal-policy.yaml` command.
- The endpoint inspection examples used `cilium endpoint list` and `cilium policy get` from the client terminal. Current Cilium documentation recommends using Kubernetes CRDs for cluster-wide endpoint state, and the agent-side policy command is documented as deprecated under `cilium-dbg policy get`. Replaced these checks with `kubectl get ciliumendpoints` and `kubectl get cnp`.
- The verification command `cilium endpoint health` requires an endpoint ID and is an agent-side command, so it did not verify all endpoints as written. Replaced it with `kubectl get ciliumendpoints -n cilium-validate -o wide`.
- The Bash script used `((PASS++))` and `((FAIL++))` under `set -euo pipefail`. In Bash, a post-increment expression can return a failing status when the previous value is zero, causing premature exit. Updated the counters to `((PASS+=1))` and `((FAIL+=1))`.

## Review Notes
- The guide is technically relevant and contains runnable Kubernetes/Cilium validation examples after the fixes.
- The custom script checks policy presence and endpoint readiness, but it does not itself run the allowed and denied traffic probes. That is acceptable for the current post because those probes are shown separately.
