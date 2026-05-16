# Validation Summary: How to Set Up Default Deny Network Policies on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Talos Ingress Firewall
- Kubernetes NetworkPolicy
- Kubernetes namespaces and Services
- Cilium observability commands
- Bash and kubectl

## Sources Consulted
- Talos Linux Ingress Firewall documentation: https://docs.siderolabs.com/talos/v1.11/networking/ingress-firewall
- Talos Linux NetworkRuleConfig reference: https://docs.siderolabs.com/talos/v1.7/reference/configuration/network/networkruleconfig/
- Talos Linux network connectivity documentation: https://docs.siderolabs.com/talos/v1.12/learn-more/talos-network-connectivity
- Talos Linux inlineManifests and extraManifests documentation: https://www.talos.dev/v1.10/kubernetes-guides/configuration/inlinemanifests/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Cilium monitor command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html

## Issues Found
- The Talos host firewall examples used an invalid `NetworkRuleConfig` schema with `spec.ingress`, per-rule `protocol`, and per-rule `ports`. I changed them to use top-level `portSelector` and `ingress` fields as documented by Talos.
- The post said `NetworkRuleConfig` documents switch Talos into default deny mode. I changed this to explain that `NetworkDefaultActionConfig` with `ingress: block` enables default-deny behavior, while `NetworkRuleConfig` documents add allow rules.
- The control plane host firewall example duplicated kubelet port `10250` as "Cluster discovery" and omitted Talos `trustd` port `50001`, which worker nodes need when joining. I replaced the duplicate rule with a `trustd` allow rule.
- The Kubernetes NetworkPolicy explanation said policies only affect traffic within the Kubernetes network. I changed it to say they affect ingress and egress for selected pods, which is more accurate for the upstream API.
- The inline manifest example created NetworkPolicies in `production` and `staging` without creating those namespaces. I added Namespace manifests before the corresponding NetworkPolicy resources.
- The DNS allow policy allowed all port 53 traffic to any pod in `kube-system` while the text said CoreDNS. I added a `podSelector` for `k8s-app: kube-dns` in the DNS examples.
- The service communication examples only allowed ingress, but the post's default-deny-all policy also blocks egress. I added matching egress NetworkPolicies for the frontend-to-API and API-to-database flows.
- The verification commands tried to reach `http://target` without creating a Kubernetes Service named `target`. I added `kubectl expose pod target --port=80` and cleanup for the Service.
- The Cilium command used a placeholder pod name and the older `cilium monitor` invocation. I changed it to execute against `ds/cilium` and use `cilium-dbg monitor --type drop`, matching current Cilium command documentation.

## Review Notes
The YAML snippets were parsed successfully locally. `kubectl` was not installed in the review environment, so Kubernetes server-side dry-run validation was not available.
