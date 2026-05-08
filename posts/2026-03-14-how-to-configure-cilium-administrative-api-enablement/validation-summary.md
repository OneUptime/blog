# Validation Summary: How to Configure Cilium Administrative API Enablement

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- eBPF
- Prometheus

## Sources Consulted
- Cilium Administrative API Enablement: https://docs.cilium.io/en/stable/configuration/api-restrictions/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium agent command reference: https://docs.cilium.io/en/stable/cmdref/cilium-agent/
- Cilium operator command reference: https://docs.cilium.io/en/stable/cmdref/cilium-operator/
- Cilium CLI command reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium sysdump command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Cilium Prometheus and Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium upgrade guide: https://docs.cilium.io/en/stable/operations/upgrade/

## Issues Found
- The main Helm example did not configure Cilium administrative API enablement even though the post is about that feature. Replaced the unrelated Hubble example with documented administrative API settings: `enable-cilium-api-server-access`, `enable-cilium-health-api-server-access`, and `--enable-cilium-operator-server-access`.
- The label exclusion YAML used a non-existent `labels.exclude` structure. Cilium's Helm value is the `labels` option, so I changed it to a valid comma-separated exclusion string.
- The advanced BPF connection tracking timeout keys `ctTcpTimeout` and `ctAnyTimeout` are not Cilium Helm values. I replaced them with the documented ConfigMap/agent option names `bpf-ct-timeout-regular-tcp` and `bpf-ct-timeout-regular-any` under `extraConfig`.
- The `identityGCInterval` setting was placed at the top level, but the Helm value is `operator.identityGCInterval`. I moved it under `operator`.
- The verification command `cilium health status` is not a documented Cilium CLI command. I changed it to run `cilium-health status` from a Cilium agent pod.
- Several troubleshooting commands used non-existent `cilium` CLI subcommands, including `cilium endpoint list`, `cilium policy get`, `cilium bpf tunnel list`, and `cilium metrics list`. I replaced them with documented `kubectl` CRD queries or `cilium-dbg` commands run inside the Cilium DaemonSet.

## Review Notes
- The post uses `helm upgrade --reuse-values` for configuration-only changes. This is acceptable when the chart version is unchanged; Cilium's upgrade guide warns not to use `--reuse-values` for minor-version chart upgrades.
- The guide now restricts administrative API access to a practical subset of read and required agent operations rather than leaving the default wildcard behavior implicit.
