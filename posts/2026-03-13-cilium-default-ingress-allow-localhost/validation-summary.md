# Validation Summary: Cilium Default Ingress Allow from Local Host

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- CiliumClusterwideNetworkPolicy
- Hubble CLI
- Helm
- Prometheus Operator PrometheusRule

## Sources Consulted
- Cilium policy language documentation: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium policy enforcement modes: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium agent command reference for `--allow-localhost`: https://docs.cilium.io/en/stable/cmdref/cilium-agent/
- Cilium configuration documentation: https://docs.cilium.io/en/stable/configuration/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium `cilium-dbg config` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_config/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/
- Cilium Hubble metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Hubble drop metric implementation: https://github.com/cilium/cilium/blob/v1.19.4/pkg/hubble/metrics/drop/handler.go

## Issues Found
- The post listed `allow-localhost=policy` as the default and included `false` as an option. Cilium's current agent option is `auto | always | policy`, with `auto` defaulting to `always` in Kubernetes. Updated the default and option list.
- The Helm examples used `allowLocalhost`, which is not a current Helm value. Updated the examples to set `extraConfig.allow-localhost` and roll Cilium pods after the ConfigMap change.
- The post used old or unsupported `cilium policy trace` examples. Replaced these with current `cilium-dbg bpf policy get <pod-endpoint-id>` commands for inspecting the endpoint policy map.
- The Hubble examples used `--from-host`, which is not a documented current Hubble CLI filter. Updated them to use `--from-identity host`.
- The clusterwide kubelet probe policy used `port: "0"` to mean any port. Replaced this with a host allow rule without `toPorts`, and left a note to add explicit probe ports when restricting further.
- The Prometheus alert used `source_workload="host"`, but Hubble's `drop_total` only includes `reason` and `protocol` by default, with source workload available only through configured context options and not applicable to the host identity as written. Updated the alert to use the supported `reason="POLICY_DENIED"` label and made the alert generic for policy drops.
- Updated remaining references from `allowLocalhost=policy` to the current Cilium config key `allow-localhost=policy`.

## Review Notes
The guide is technically relevant and mostly accurate after correction. Operators who need host-specific Prometheus alerts should configure Hubble metric context options or exporter filters explicitly; the post now avoids implying that host source labels are present by default.
