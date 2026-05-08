# Validation Summary: Tuning Benchmarks in Cilium Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- kubectl
- Helm
- iperf3
- netperf
- Bash
- jq

## Sources Consulted
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Cilium CLI `cilium version` reference: https://docs.cilium.io/en/latest/cmdref/cilium_version/
- Helm `helm get values` reference: https://helm.sh/docs/helm/helm_get_values/
- iperf3 official documentation: https://software.es.net/iperf/
- iperf3 man page for `-J`, `-P`, and `--omit`: https://manpages.org/iperf3
- Netperf manual: https://hewlettpackard.github.io/netperf/doc/netperf.html

## Issues Found
- The statistics example calculated standard deviation using `sqrt(s/NR)`, which is the population standard deviation. For a repeated benchmark sample, changed it to `sqrt(s/(NR-1))` to use sample standard deviation.
- The output text said "Minimum runs for <5% CV: at least 10", which incorrectly implied 10 runs guarantee a coefficient of variation below 5%. Changed it to say to start with at least 10 runs and increase runs or test duration if CV remains above the threshold.
- The troubleshooting section recommended iperf3 3.9+ for JSON parsing. iperf3 JSON output is an established `-J` option and the more accurate guidance is to confirm `-J` support and inspect the JSON schema for the installed version.

## Review Notes
The remaining commands and flags matched the consulted references. The benchmark durations, warm-up periods, stream counts, and CV threshold are methodological recommendations rather than fixed Cilium requirements, so they should be tuned for the hardware, workload, and cluster noise level.
