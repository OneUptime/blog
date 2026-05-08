# Validation Summary: Validating Demo Application in Cilium

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
- Cilium CiliumNetworkPolicy Layer 3 and Layer 4 policy documentation: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium Kubernetes policy documentation: https://docs.cilium.io/en/stable/security/policy/kubernetes/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium CLI connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium Hubble setup and CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble flow inspection documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium troubleshooting documentation for Hubble and endpoint inspection: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Kubernetes kubectl run documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl expose documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/

## Issues Found
- The sample CiliumNetworkPolicy used namespace `cilium-demo`, labels `demo-backend` / `demo-frontend`, and ports `8080` / `5432`, but the setup section creates workloads in `cilium-validate` with labels `app=server` and `app=client` on port `80`. Updated the policy to target the validation namespace and workloads so the allowed and unauthorized traffic tests validate the intended policy.
- The endpoint policy inspection command used `cilium endpoint list -o json`, which is not part of the current local Cilium CLI command set. Replaced it with `kubectl get ciliumendpoints -n cilium-validate -o json`, matching the documented CiliumEndpoint CRD used for Kubernetes endpoint inspection.
- The automated script used `((PASS++))` and `((FAIL++))` under `set -euo pipefail`. In Bash, post-increment returns an exit status based on the pre-increment value, so `((PASS++))` can terminate the script when the counter starts at zero. Changed the counters to `((PASS+=1))` and `((FAIL+=1))`.
- The automated script used local-agent policy and endpoint commands for checks in the validation namespace. Replaced those checks with `kubectl get ciliumendpoints -n "$NAMESPACE" -o json` and `kubectl get cnp -n "$NAMESPACE" -o json`, which align with the Kubernetes CRDs discussed in the post.
- The verification command `cilium endpoint health` was incomplete because the documented endpoint health command requires an endpoint ID. Replaced it with `kubectl get ciliumendpoints -A` for a valid cluster-wide endpoint state check.
- The cross-namespace Hubble flow analysis emitted pretty-printed JSON before piping to `sort | uniq`, which would count individual lines rather than whole flow records. Added `jq -c` so each selected flow is one sortable record.
- The namespace policy count loop used `kubectl get cnp --no-headers | wc -l`, which can miscount "No resources found" output. Replaced it with JSON output and `jq '.items | length'`.

## Review Notes
The Hubble examples are valid assuming the Hubble CLI can reach Hubble Relay, either through existing configuration or a port-forward. Cilium's official Hubble setup docs commonly show `hubble observe -P` or a separate `cilium hubble port-forward` when local access is not already configured.
