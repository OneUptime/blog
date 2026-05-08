# Validation Summary: Validating Node Label Attachment in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Cilium host firewall
- CiliumClusterwideNetworkPolicy
- Kubernetes
- Hubble
- Bash
- jq

## Sources Consulted
- Cilium Host Firewall documentation: https://docs.cilium.io/en/stable/security/host-firewall/
- Cilium Network Policy overview: https://docs.cilium.io/en/stable/security/policy/
- Cilium policy language documentation: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium endpoint lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium CLI `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The original policy used `nodeSelector` but the validation steps treated it like a regular pod policy. In Cilium, `nodeSelector` in `CiliumClusterwideNetworkPolicy` selects node host endpoints. Updated the text, prerequisites, node-label setup, and validation commands to reflect host-policy behavior.
- The original examples used `cilium endpoint list` and `cilium policy get` from the wrong CLI context, and `cilium policy get` depends on the deprecated agent policy API. Replaced them with `kubectl get ciliumendpoints`, Kubernetes policy resource queries, and `cilium-dbg` executed inside the Cilium agent pod where host endpoint inspection is documented.
- The `cilium endpoint health` verification command was incorrect because endpoint health requires an endpoint ID in the agent CLI. Replaced it with a CiliumEndpoint readiness check.
- The Bash script used `((PASS++))` and `((FAIL++))` under `set -e`, which can terminate the script when the pre-increment value is zero. Replaced these with `((PASS+=1))` and `((FAIL+=1))`.
- The Hubble cross-namespace aggregation command pretty-printed JSON before `sort | uniq`, which would count JSON lines instead of flow records. Updated it to emit one tab-separated record per flow.
- The unauthorized pod-to-pod drop test did not validate the node-label host policy. Replaced it with host policy verdict observation for the selected host endpoint.

## Review Notes
The guide is now technically consistent for validating Cilium node-label host policies. A future improvement would be to include a concrete host-level test that generates an expected denied connection against the labeled node from outside the cluster, but that depends on the reader's lab topology and management access.
