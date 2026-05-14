# Validation Summary: How to Validate Calico Networking Architecture in a Lab Cluster

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Tigera Operator
- Felix
- Typha
- BIRD/BGP
- Calico CNI plugin
- Calico IPAM
- calicoctl

## Sources Consulted
- Calico component architecture: https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico TigeraStatus/operator status examples: https://docs.tigera.io/calico/latest/getting-started/kubernetes/quickstart
- Calico Felix configuration and Prometheus metrics: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Felix Prometheus metric reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico Typha Prometheus metric reference: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico component metrics setup: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico BGP troubleshooting and node status: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Calico troubleshooting commands for BIRD: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- CalicoNodeStatus reference: https://docs.tigera.io/calico/latest/reference/resources/caliconodestatus
- Calico CNI plugin installation/configuration: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-cni-plugin
- Calico IPAM show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico WorkloadEndpoint reference: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Kubernetes kubectl exec/logs/port-forward reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The Felix liveness command used `kubectl exec -l`, but current kubectl `exec` accepts a pod or `TYPE/NAME`, not a label selector flag. Changed the command to select a calico-node pod with JSONPath before executing into it.
- The Felix liveness check used `calico-node -felix-live-logging`, which is not the standard calico-node liveness probe. Changed it to `/bin/calico-node -felix-live`.
- The Felix metrics check assumed metrics were already enabled and port-forwarded the DaemonSet directly. Calico documents Felix Prometheus metrics as disabled by default, so the post now patches `FelixConfiguration` first and forwards to the selected pod.
- The Typha connection check grepped logs for the word "connection" and claimed the count should equal Felix pod count. Calico documents Typha metrics as disabled by default for operator installs and exposes connection metrics such as `typha_connections_streaming`. Typha clients can include calico-node processes beyond a simple one-to-one Felix count. Updated the check to enable Typha metrics, use the documented metric, and baseline the expected value.
- The BIRD `kubectl exec -l` command had the same kubectl selector issue as the Felix command. Updated it to execute against a selected calico-node pod.
- The `calicoctl node status` check did not mention that the command reports the local Calico node agent. Added that it should be run on each node being validated.
- The WorkloadEndpoint expectation said one entry per running pod. Calico WorkloadEndpoints represent Calico-managed workload interfaces, so hostNetwork pods and pods not attached through Calico are excluded. Clarified the expected output.
- The end-to-end validation relied on Felix logs containing the policy name, which is not a stable documented health signal. Replaced it with `calicoctl get globalnetworkpolicy` plus the documented `felix_cluster_num_policies` metric.

## Review Notes
The post is generally accurate for operator-managed Linux Calico clusters in BGP mode, but several checks depend on optional metrics being enabled and on whether the cluster uses BGP rather than VXLAN, IP-in-IP-only, or eBPF dataplanes. Typha metrics may use a different port if the installation already configures `typhaMetricsPort` or `TYPHA_PROMETHEUSMETRICSPORT`.
