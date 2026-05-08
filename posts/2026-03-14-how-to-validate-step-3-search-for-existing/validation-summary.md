# Validation Summary: Validating Parser Code and Libraries in Cilium

## Status
validated

## Post Type
Tutorial / validation guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- kubectl
- Hubble
- Bash
- jq

## Sources Consulted
- Cilium CiliumEndpoint documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium policy language documentation: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium Layer 4 policy documentation: https://docs.cilium.io/en/latest/security/policy/layer4/
- Cilium command cheatsheet: https://docs.cilium.io/en/stable/cheatsheet/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium troubleshooting / Hubble flow observation documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Hubble exporter filter examples: https://docs.cilium.io/en/stable/observability/hubble/configuration/export.html
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes JSONPath support documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- jq manual: https://jqlang.org/manual/
- GNU Bash shell arithmetic documentation: https://www.gnu.org/software/bash/manual/html_node/Shell-Arithmetic.html

## Issues Found
- The CiliumNetworkPolicy example used namespace `development`, labels `app: parser-test-server` / `app: parser-test-client`, and port `7070`, but the setup and connectivity examples create pods in `cilium-validate` with labels `app=server` / `app=client` on port `80`. Updated the policy so it matches the workloads being tested.
- The endpoint policy inspection example used `cilium endpoint list -o json`, which is a daemon/debug-style command and does not match the documented Kubernetes workflow for listing all Cilium-managed endpoints. Updated it to use `kubectl get cep -n cilium-validate -o json` and inspect `.status.status.policy`.
- The automated script used `((PASS++))` and `((FAIL++))` under `set -euo pipefail`. In Bash, post-increment evaluates to the previous value, so the first increment from zero can return a failing status and terminate the script. Replaced those increments with arithmetic assignments.
- The automated script used `cilium endpoint list -o json` for endpoint readiness and `cilium policy get -o json` for policy count. Updated these to use Kubernetes `CiliumEndpoint` and `CiliumNetworkPolicy` resources via `kubectl get cep` and `kubectl get cnp`.
- The final endpoint health command used `cilium endpoint health` without an endpoint ID. The documented command requires an endpoint ID, so the example was replaced with a `kubectl get cep -A -o jsonpath=...` check that lists each CiliumEndpoint state.

## Review Notes
- The post is technically relevant, but its title and introduction frame the topic as parser-library validation while the concrete examples validate Cilium network-policy behavior and Hubble flow observation. This is not a command correctness issue, but the framing could be tightened in a future editorial pass.
- The sample policy is L3/L4 only. It validates policy enforcement around a workload, not Layer 7 parser behavior. A future version could add an explicit L7 HTTP, DNS, or Kafka rule if the intended focus is protocol parser validation.
