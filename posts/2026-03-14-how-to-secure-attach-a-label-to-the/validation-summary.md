# Validation Summary: Securing Node Label Attachment in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- CiliumClusterwideNetworkPolicy
- Cilium host firewall
- Kubernetes node labels and RBAC/admission controls
- Hubble
- kubectl
- jq

## Sources Consulted
- Cilium Host Firewall documentation: https://docs.cilium.io/en/stable/security/host-firewall/
- Cilium Network Policy language and host policy documentation: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium Policy Enforcement Modes documentation: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium Helm values reference for `policyEnforcementMode`: https://docs.cilium.io/en/stable/helm-values/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium endpoint lifecycle documentation for `cilium-dbg endpoint` usage: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Hubble CLI examples and Cilium observability documentation: https://docs.cilium.io/en/stable/observability/
- Kubernetes Nodes documentation: https://kubernetes.io/docs/concepts/architecture/nodes/
- Kubernetes Node Authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/node/
- Kubernetes Admission Controllers documentation for NodeRestriction: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/

## Issues Found
- The post implied that Cilium secures the act of attaching Kubernetes node labels. Cilium policies secure traffic for endpoints or nodes selected by labels; Kubernetes API authorization and admission controls protect label mutation. Updated the introduction and security model wording to make that distinction clear.
- The post described node label policies as `CiliumNetworkPolicy` resources. Cilium node host policies use `CiliumClusterwideNetworkPolicy` with `nodeSelector`, so the wording and Mermaid diagram were corrected.
- The prerequisites omitted the Cilium host firewall requirement for node-selected host policies. Added a prerequisite noting that host firewall must be enabled when enforcing policies with `nodeSelector`.
- The policy verification command used `kubectl get cnp -n production` for a cluster-scoped `CiliumClusterwideNetworkPolicy`. Replaced it with `kubectl get ciliumclusterwidenetworkpolicy node-label-policy`.
- The policy enforcement check grepped for `policy-enforcement`, but Cilium documents the configuration flag as `enable-policy`. Updated the commands to grep `enable-policy`.
- Several commands used the Kubernetes-facing `cilium` CLI for in-agent operations such as policy, identity, endpoint, and monitor inspection. Replaced those with Kubernetes resource queries or documented `kubectl exec ... cilium-dbg ...` commands.
- The cross-namespace Hubble `jq` pipeline emitted JSON objects and then attempted numeric sorting. Reworked it to emit tab-separated sortable fields and to tolerate flows without source or destination namespaces.
- The default-deny section sounded like it applied to nodes, but the example is a namespaced workload policy. Updated the wording to say it applies to workloads in the `production` namespace.

## Review Notes
The title still uses "label attachment", but the corrected body now explains that Cilium secures traffic selected by labels rather than label mutation itself. Future improvement could add a short Kubernetes RBAC example for restricting node label changes, but that would be new content beyond a correctness fix.
