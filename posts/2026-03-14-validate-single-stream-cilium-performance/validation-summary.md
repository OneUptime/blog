# Validation Summary: Validating Single-Stream Performance in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes Jobs, Pods, Services, and kubectl
- iperf3
- jq
- Prometheus and Grafana
- Bash scripting

## Sources Consulted
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Job controller documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Cilium Bandwidth Manager documentation: https://docs.cilium.io/en/stable/network/kubernetes/bandwidth-manager/
- Cilium cilium-dbg bpf bandwidth command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_bandwidth_list.html
- iperf3 official documentation and manual page: https://software.es.net/iperf/invoking.html

## Issues Found
- The validation Job used `networkstatic/iperf3` while running `jq` inside the container. Updated the prerequisite and Job image to require/use a container image with both `iperf3` and `jq`.
- The CI `kubectl run --rm -it` examples used an interactive TTY pattern that is brittle in CI. Replaced it with `--rm --attach --restart=Never --quiet`, which still attaches to command output and is better suited to automation.
- The cross-node validation script referenced `DST_IP` without defining it. Added creation of an iperf3 server Pod on the destination node, waiting for readiness, reading its Pod IP, and cleaning it up after the test.
- The `kubectl run --overrides` JSON omitted `apiVersion`, while the kubectl reference states inline overrides require a valid `apiVersion`. Added `apiVersion: v1` to the override JSON.
- The Cilium bandwidth verification command used `cilium bpf bandwidth list`; current Cilium documentation shows `cilium-dbg bpf bandwidth list`. Updated the command.

## Review Notes
The examples assume an `iperf-server.yaml` manifest exists for the CI section and that the chosen tooling image includes the expected command-line utilities. The benchmark thresholds are environment-specific acceptance criteria rather than universal Cilium guarantees.
