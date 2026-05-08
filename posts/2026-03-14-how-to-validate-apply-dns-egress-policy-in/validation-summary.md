# Validation Summary: Validating DNS Egress Policies in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- DNS-based egress policy
- Hubble
- Bash
- kubectl
- jq

## Sources Consulted
- Cilium DNS-based policy documentation: https://docs.cilium.io/en/stable/security/dns.html
- Cilium Layer 3 DNS policy documentation: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium policy overview and current policy import guidance: https://docs.cilium.io/en/stable/security/policy/
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium connectivity test command reference: https://docs.cilium.io/en/stable/cmdref/cilium_connectivity_test.html
- Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Hubble setup and API access documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The CiliumNetworkPolicy example targeted the `production` namespace and `app: backend`, while the validation workload was created in `cilium-validate` with `app: client`. Updated the policy namespace and selector so the validation pod is actually selected by the policy.
- The kube-dns `toEndpoints` selector used unprefixed Kubernetes labels. Updated it to Cilium's documented Kubernetes label form, including `"k8s:io.kubernetes.pod.namespace"` and `"k8s:k8s-app"`.
- The Hubble validation commands tested HTTP access to the local `server` pod, which did not validate the DNS egress policy and would not match the FQDN/port-443 rules. Updated the checks to validate allowed and blocked DNS lookups from the selected client pod.
- The post used `cilium endpoint list` and `cilium policy get` for Kubernetes policy inspection. Updated these examples to use Kubernetes CRDs with `kubectl get ciliumendpoints` and `kubectl get ciliumnetworkpolicies`, consistent with current Cilium documentation.
- The bash validation script used `((PASS++))` and `((FAIL++))` under `set -e`; the first increment can return exit status 1 and stop the script. Replaced these with `((PASS+=1))` and `((FAIL+=1))`.
- The final verification used `cilium endpoint health` without an endpoint ID. Replaced it with `kubectl get ciliumendpoints -n cilium-validate` to verify validation endpoint readiness.
- The cross-namespace Hubble JSON pipeline pretty-printed multi-line JSON before `sort` and `uniq`, making counts unreliable. Updated `jq` to use compact one-line output.
- The prerequisites did not explicitly require Hubble to be enabled and reachable, even though the guide uses Hubble flow observation. Added that requirement.

## Review Notes
The guide is now technically valid as a Cilium DNS egress policy validation walkthrough. The sample `server` pod remains useful as general test scaffolding, but the DNS-specific validation focuses on DNS queries because the policy controls FQDN-based external egress rather than service-to-service HTTP access.
