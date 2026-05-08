# Validation Summary: Preventing Test Environment Issues in Cilium Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- kubectl
- Flux HelmRelease
- Helm chart configuration
- iperf3
- netperf
- Bash
- jq
- bc

## Sources Consulted
- Kubernetes: Assigning Pods to Nodes, node labels, node selectors, and NodeRestriction: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes: Taints and Tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes: kubectl taint reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/
- Kubernetes: Field Selectors, including supported Pod field selector `spec.nodeName`: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes: kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Flux: HelmRelease API v2 reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux: HelmRelease valuesFrom documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Cilium: `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium: `cilium config view` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config/
- ESnet iperf3 documentation and manual page: https://software.es.net/iperf/

## Issues Found
- The dedicated test node pool example only labeled the nodes. Labels can target workloads to nodes, but they do not prevent unrelated workloads from being scheduled there. Added a `kubectl taint nodes ... dedicated=perf-testing:NoSchedule` command so non-benchmark workloads need an explicit matching toleration.
- The pre-benchmark validation script checked only `node-perf-1` even though the post labels both `node-perf-1` and `node-perf-2` as test nodes. Changed the script to loop over both nodes.
- The benchmark examples referred to monitoring namespace services but used `kubectl exec` without a namespace, which would fail unless the current kubectl context namespace happened to be `monitoring`. Added `-n monitoring` to the benchmark pod exec commands and used same-namespace service names.
- Snapshot scripts used unquoted path variables. The generated paths do not normally contain spaces, but quoting is the correct Bash form and avoids accidental word splitting if the directory argument is changed later.

## Review Notes
- The Flux `HelmRelease` snippet uses `apiVersion: helm.toolkit.fluxcd.io/v2`, `spec.chart.spec.version`, `sourceRef`, and `valuesFrom` in line with current Flux documentation. It remains an illustrative partial manifest and assumes a matching `HelmRepository` exists.
- The post assumes benchmark client and server pods exist in the `monitoring` namespace and that benchmark pods tolerate the `dedicated=perf-testing:NoSchedule` taint when scheduled onto the performance nodes.
