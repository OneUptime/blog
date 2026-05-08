# Validation Summary: Validating Clean-Up Procedures in Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- CiliumEndpoint CRDs
- Kubernetes
- kubectl
- Hubble CLI
- Bash
- jq

## Sources Consulted
- Cilium CiliumNetworkPolicy language documentation: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium policy enforcement documentation: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium endpoint lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium CLI command reference for `cilium status`: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI command reference for `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium command reference for `cilium-dbg endpoint list` and endpoint health: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html and https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_health/
- Cilium Hubble exporter documentation showing `hubble observe --verdict DROPPED`: https://docs.cilium.io/en/latest/observability/hubble/configuration/export.html
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- BusyBox command documentation for `wget` and `timeout`: https://busybox.net/downloads/BusyBox.html

## Issues Found
- The example CiliumNetworkPolicy targeted the `production` namespace and labels `app=legacy-service` / `app=monitoring`, but the test workloads created earlier use the `cilium-validate` namespace and `app=server` / `app=client`. Updated the policy namespace, selectors, and port to match the test workload and HTTP service.
- The endpoint policy inspection command used `cilium endpoint list`, but current official documentation presents endpoint details through `cilium-dbg` or the Kubernetes `CiliumEndpoint` CRD. Replaced it with `kubectl get ciliumendpoints -n cilium-validate -o json`.
- The automated script used `cilium endpoint list` and `cilium policy get`; these are not appropriate user-facing Cilium CLI commands for the Kubernetes validation flow, and `cilium-dbg policy get` is documented as deprecated. Replaced them with Kubernetes CRD queries using `kubectl get ciliumendpoints` and `kubectl get cnp`.
- The Bash script used `((PASS++))` and `((FAIL++))` under `set -euo pipefail`. In Bash, post-increment returns status 1 when the previous value is 0, which could terminate the script after the first passing or failing test. Replaced these with `((PASS+=1))` and `((FAIL+=1))`.
- The BusyBox `wget` examples used `--timeout`, which depends on BusyBox build options. Replaced it with the BusyBox `timeout` command wrapping `wget`, which is more portable for the selected `busybox:1.36` image.
- The verification section used `cilium endpoint health` without an endpoint ID and under the wrong CLI context. Replaced it with a `kubectl get ciliumendpoints` health inspection command.

## Review Notes
- The guide assumes the displayed CiliumNetworkPolicy manifest is applied before the connectivity checks. A future improvement could show the `kubectl apply -f` step explicitly, but the existing section wording already says to apply the policy.
- The `cilium connectivity test` command creates its own test artifacts by default; it is valid, but it is broader than the small namespace-specific validation scenario shown in the rest of the post.
