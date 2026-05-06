# Validation Summary: How to Configure Antrea for IPv6 in Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Antrea
- Kubernetes
- kubeadm
- Open vSwitch (OVS)
- IPv6
- Dual-stack networking
- Antrea NetworkPolicy / ClusterNetworkPolicy
- Traceflow

## Sources Consulted
- Antrea Helm installation docs: https://antrea.io/docs/main/docs/helm/
- Antrea feature gates docs: https://antrea.io/docs/v2.5.0/docs/feature-gates/
- Antrea configuration reference: https://antrea.io/docs/v2.4.3/docs/configuration/
- Antrea agent base config (v2.6.1): https://raw.githubusercontent.com/antrea-io/antrea/v2.6.1/build/charts/antrea/conf/antrea-agent.conf
- Antrea controller base config (v2.6.1): https://raw.githubusercontent.com/antrea-io/antrea/v2.6.1/build/charts/antrea/conf/antrea-controller.conf
- Antrea NetworkPolicy docs: https://antrea.io/docs/main/docs/antrea-network-policy/
- Antrea API reference: https://antrea.io/docs/main/docs/api-reference/
- Antrea Traceflow guide: https://antrea.io/docs/main/docs/traceflow-guide/
- Kubernetes dual-stack kubeadm docs: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/dual-stack-support/
- Kubernetes dual-stack validation docs: https://kubernetes.io/docs/tasks/network/validate-dual-stack/
- Antrea latest release metadata (checked 2026-05-06): https://api.github.com/repos/antrea-io/antrea/releases/latest

## Issues Found
- The post referred to an `IPv6` Antrea feature gate in both the Helm command, the ConfigMap, and the conclusion. Antrea does not expose an `IPv6` feature gate in current releases, so those references were removed and the conclusion was rewritten accordingly.
- The Helm example skipped `helm repo update`, and the extra IPv6-specific Helm flag was invalid. The install example was updated to match the supported Helm workflow.
- The ConfigMap example incorrectly presented `serviceCIDR` / `serviceCIDRv6` as part of kube-proxy replacement while also enabling `AntreaProxy`. Current Antrea configuration states these values are not needed when AntreaProxy is enabled, so they were removed.
- The kubeadm example used the older `kubeadm.k8s.io/v1beta3` API and an outdated `kubeletExtraArgs` shape. It was updated to `v1beta4` and to the current `name` / `value` list format from Kubernetes documentation.
- The kubeadm example used an invalid IPv6 literal, `2001:db8::node1`. It was replaced with a syntactically valid documentation address.
- The Antrea policy example used `kind: AntreaNetworkPolicy`, but the current namespaced Antrea-native policy kind is `NetworkPolicy` in `crd.antrea.io/v1beta1`. The example was corrected.
- The same policy example used `podSelector` directly under `spec`, which is not the current schema. It was changed to `spec.appliedTo`.
- The IPv6 client CIDR `2001:db8:client::/48` was not a valid IPv6 CIDR. It was replaced with a valid documentation prefix.
- The verification section claimed `kubectl get pods -o wide` would show both Pod IPs. Kubernetes dual-stack validation docs use `.status.podIPs` instead, so the command was updated to the documented go-template form.
- The Traceflow example used the outdated `crd.antrea.io/v1alpha1` API and an invalid spec layout. It was updated to `crd.antrea.io/v1beta1` with `spec.packet.ipv6Header.nextHeader`, which matches the current Traceflow API and guide.
- The ClusterNetworkPolicy egress comment said it allowed “global IPv6”, but the rule actually allows `::/0` except only `fe80::/10` and `::/128`. The comment was corrected to match the actual rule behavior.

## Review Notes
- Validated against the current Antrea release line available on 2026-05-06. The latest Antrea release at review time was `v2.6.1`, published on 2026-03-31.
- `https://github.com/antrea-io/antrea/releases/latest/download/antrea.yml` resolved successfully on 2026-05-06, but it is not version-pinned. A fixed release URL is more reproducible for long-lived documentation.
- Some feature gates shown in the ConfigMap (`AntreaPolicy`, `AntreaProxy`, `Traceflow`) are enabled by default in current Antrea releases. Leaving them explicit is technically valid but not strictly required.
