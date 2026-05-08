# Validation Summary: Auditing DNS, Port, and L7 Combined Rules in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- Kubernetes
- Hubble CLI
- kubectl
- jq

## Sources Consulted
- Cilium DNS-based policies: https://docs.cilium.io/en/latest/security/dns/
- Cilium Layer 7 policies: https://docs.cilium.io/en/latest/security/policy/layer7/
- Cilium Kubernetes policy selectors: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium Endpoint CRD: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpoint/
- Cilium API reference for endpoint policy status fields: https://docs.cilium.io/en/stable/api/
- Cilium CLI `config view` reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view/
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium policy enforcement modes: https://docs.cilium.io/en/stable/security/policy/intro/
- Hubble CLI flow observation documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html

## Issues Found
- The endpoint policy coverage commands used `cilium endpoint list` and JSON fields named `l4-ingress` and `l4-egress`. Current Cilium documentation exposes cluster-wide endpoint state through the CiliumEndpoint CRD, and the policy status fields are under `.status.policy.realized.l4.ingress`, `.status.policy.realized.l4.egress`, and `.status.policy.realized."policy-enabled"`. Updated the commands to use `kubectl get ciliumendpoints --all-namespaces -o json` and the documented `policy-enabled` field.
- The audit report script counted covered endpoints by checking a non-existent `l4-ingress` field. Updated it to reuse CiliumEndpoint JSON and count endpoints whose realized policy is not `none`.
- The example policy selected kube-dns with unprefixed Cilium label keys. Official Cilium examples use `k8s:io.kubernetes.pod.namespace` and `k8s:k8s-app` for `toEndpoints` selectors. Updated the YAML selector keys accordingly.
- The per-node configuration check executed `cilium config view` inside the agent container and checked non-current option names. Current command references distinguish the Kubernetes-facing `cilium` CLI from the agent-local `cilium-dbg` CLI, and Cilium documents the policy enforcement flag as `enable-policy`. Updated the node-local command to use `cilium-dbg config get` with documented option names.
- The verification commands used `cilium policy get` and `cilium identity list`, which are agent-local `cilium-dbg` style operations in current documentation and are not cluster-wide audit commands. Updated them to use Kubernetes CRD queries for policies and CiliumEndpoint identity assignments.
- The troubleshooting command searched for an `Enforcement` string in `kubectl describe cnp` output. Updated it to inspect policy status objects directly with `kubectl get cnp --all-namespaces -o json`.

## Review Notes
The Hubble `observe --verdict DROPPED --last 100 -o json` usage and `drop_reason_desc` field are consistent with official Hubble examples. The HTTP and DNS policy structure is consistent with Cilium L7 and DNS policy documentation, but real deployments should ensure L7 proxy/Hubble are enabled and that DNS names match the organization’s actual suffixes.
