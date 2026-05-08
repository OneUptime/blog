# Validation Summary: Preventing Required Software Issues in Cilium Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Kubernetes DaemonSet
- Prometheus Operator `PrometheusRule`
- Prometheus node_exporter
- Flux HelmRelease
- iperf3
- netperf
- Bash

## Sources Consulted
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html
- Cilium CLI `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI `connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium CLI `config` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config.html
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Prometheus Operator project documentation: https://github.com/prometheus-operator/prometheus-operator
- Prometheus node_exporter documentation: https://github.com/prometheus/node_exporter
- iperf3 documentation: https://iperf.fr/
- netperf manual: https://fossies.org/linux/netperf/doc/netperf.pdf

## Issues Found
- The DaemonSet tried to load kernel modules without mounting the host's `/lib/modules`, and the BPF filesystem mount was not targeted at a host-mounted `/sys/fs/bpf` path. I added hostPath mounts for `/lib/modules` and `/sys/fs/bpf`, set mount propagation for the BPF mount, and made `br_netfilter` failure non-fatal like the WireGuard check.
- The BPF mount check used a broad `mount | grep -q bpf`, which could match unrelated BPF mounts. I narrowed it to `/sys/fs/bpf`.
- The version pinning example was fenced as Bash even though it was Kubernetes YAML, and the snippet was not structured as a container spec. I changed the fence to YAML and made the example valid YAML.
- The Prometheus alert queried `node_uname_info` with a non-existent `kernel_version` label. node_exporter exposes uname data with the kernel release in the `release` label, so I changed the PromQL expression to group by `release`.
- The verification section said `cilium status --verbose` should show PASS results. `cilium status` reports Cilium status, while PASS-style functional checks come from `cilium connectivity test`, so I updated the commands and comments accordingly.

## Review Notes
- The post's Cilium 1.14+ baseline is old but not inherently incorrect for older clusters. For current deployments, readers should use a Kubernetes version supported by their installed Cilium release, since the supported/tested Kubernetes versions change across Cilium releases.
- The local review environment did not have `cilium`, `kubectl`, `iperf3`, `netperf`, `flux`, or `helm` installed, so CLI checks were verified against official documentation rather than local command help.
