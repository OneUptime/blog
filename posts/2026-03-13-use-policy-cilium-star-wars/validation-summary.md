# Validation Summary: How to Write and Apply CiliumNetworkPolicy in the Star Wars Demo

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- kubectl
- eBPF
- HTTP L7 network policy

## Sources Consulted
- Cilium Star Wars demo documentation: https://docs.cilium.io/en/stable/gettingstarted/demo/
- Cilium Kubernetes network policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium L7 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post described `cilium policy trace` as the primary pre-apply verification tool and used `kubectl exec ... -- cilium policy trace`. Current stable Cilium command references document `cilium-dbg` for in-agent debugging and do not include `policy trace`. I replaced that workflow with Kubernetes server-side dry-run manifest validation and clarified that actual traffic behavior must still be verified after applying the policy.
- The prerequisites said the Cilium CLI must be installed, but the commands run inside the Cilium agent pod. I changed this to require access to the Cilium agent pod where `cilium-dbg` is available.
- The monitoring examples used `cilium monitor`. Current Cilium documentation uses `cilium-dbg monitor`, with `--type drop` and `--type l7` as valid filters. I updated both monitor commands.
- The conclusion recommended `cilium policy trace` and `cilium monitor`. I updated it to recommend server-side dry-run checks before applying and `cilium-dbg monitor` after applying.

## Review Notes
The CiliumNetworkPolicy YAML structure, endpoint selectors, ingress and egress rule shape, TCP port syntax, and HTTP L7 rule fields match the current Cilium documentation. The Star Wars demo request tests are consistent with the official Cilium demo behavior.
