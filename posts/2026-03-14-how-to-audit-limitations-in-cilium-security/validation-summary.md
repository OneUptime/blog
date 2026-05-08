# Validation Summary: Auditing Cilium Security Policy Limitations

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- CiliumEndpoint and CiliumIdentity Kubernetes CRDs
- Kubernetes
- Hubble CLI
- jq
- Bash

## Sources Consulted
- Cilium API Reference: https://docs.cilium.io/en/stable/api/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium Policy Enforcement Modes: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium Layer 4 Policy documentation: https://docs.cilium.io/en/stable/security/policy/layer4.html
- Cilium Network Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium command cheatsheet and command reference: https://docs.cilium.io/en/stable/cheatsheet/ and https://docs.cilium.io/en/stable/cmdref/
- Cilium Policy Audit Mode documentation: https://docs.cilium.io/en/latest/security/policy-creation/
- Cilium Layer 7 Protocol Visibility documentation: https://docs.cilium.io/en/stable/observability/visibility/
- Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html

## Issues Found
- The policy coverage commands used `.status.policy.realized."l4-ingress"` and `.status.policy.realized."l4-egress"`, but Cilium exposes realized L4 policy under `.status.policy.realized.l4.ingress` and `.status.policy.realized.l4.egress`, with policy enforcement summarized by `.status.policy.realized."policy-enabled"`. Updated the examples to use `kubectl get ciliumendpoints --all-namespaces -o json` and the documented `policy-enabled` field.
- The endpoint listing example referenced `.status.labels.id`, which is not a documented endpoint label field. Updated it to report `.status.identity.labels`.
- The audit report and evidence snippets used `cilium endpoint list` and `cilium identity list`, which are not the current documented workstation commands for collecting cluster-wide endpoint and identity state. Updated them to use `kubectl get ciliumendpoints` and `kubectl get ciliumidentities`.
- The default-deny audit counted policies with missing `.spec.ingress` as default-deny policies. In Cilium, default-deny is triggered per direction when a selected endpoint has an ingress or egress section. Updated the check to look for namespace-wide selectors with an explicit ingress deny or egress policy section.
- The verification command grepped for `enable-l7`, but current Cilium configuration uses `enable-l7-proxy` or the Helm value `l7Proxy`. Updated the grep pattern and made `policy-audit-mode` explicit.
- Added a zero-endpoint guard to avoid a division-by-zero error in the coverage calculation.

## Review Notes
The post is technically relevant and the remaining examples use current Cilium/Kubernetes resource names and documented Hubble flags. The default-deny detection remains a heuristic for audit reporting; future improvements could distinguish ingress and egress default-deny posture separately and include CiliumClusterwideNetworkPolicy coverage in the namespace check.
