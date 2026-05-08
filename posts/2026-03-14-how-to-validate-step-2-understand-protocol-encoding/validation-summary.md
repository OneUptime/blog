# Validation Summary: Validating Protocol, Encoding, Framing and Types in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Hubble CLI
- Kubernetes
- kubectl
- Bash
- jq

## Sources Consulted
- Cilium CiliumNetworkPolicy language documentation: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium Kubernetes policy namespace behavior documentation: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium CLI connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium troubleshooting documentation for Hubble observation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get

## Issues Found
- The example CiliumNetworkPolicy targeted the `production` namespace, `app: protocol-server`, `app: protocol-client`, and TCP port `8443`, while the validation workloads were created in `cilium-validate` with `app=server`, `app=client`, and service port `80`. Updated the policy so the later allowed and unauthorized traffic checks validate the policy that was actually shown.
- The endpoint inspection command used `cilium endpoint list`, which is not part of the user-facing Cilium CLI documented for cluster management. Replaced it with `kubectl get ciliumendpoints`, which Cilium documents as the Kubernetes CRD view for endpoint status and policy information.
- The automated script used `((PASS++))` and `((FAIL++))` under `set -euo pipefail`. In Bash, `((PASS++))` returns status 1 when the old value is 0, which can terminate the script early. Replaced those increments with arithmetic assignments.
- The automated script used local Cilium endpoint and policy commands for validation state. Replaced them with Kubernetes CRD queries for `ciliumendpoints` and `ciliumnetworkpolicies` in the validation namespace.
- The cross-namespace Hubble `jq` pipeline emitted pretty-printed JSON objects before `sort | uniq`, making aggregation unreliable. Changed it to emit one tab-separated record per flow and guard against missing source or destination namespace fields.
- The namespace policy coverage loop used the short name `cnp`. Replaced it with the full `ciliumnetworkpolicies` resource name for clarity and portability.
- The verification command `cilium endpoint health` was inaccurate for checking all endpoint health; the documented agent command takes a specific endpoint ID. Replaced it with a `kubectl get ciliumendpoints -A` query that reports each endpoint state.

## Review Notes
- The guide assumes Hubble Relay or another reachable Hubble API endpoint is configured for local `hubble observe` commands. This is technically valid, but readers may need `cilium hubble port-forward` depending on their setup.
- `cilium connectivity test` creates its own test resources by default; it is useful for cluster validation but does not specifically exercise the custom `cilium-validate` namespace policy unless readers add targeted tests.
