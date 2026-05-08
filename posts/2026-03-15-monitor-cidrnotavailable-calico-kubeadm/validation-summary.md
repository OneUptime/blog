# Validation Summary: How to Monitor for CIDRNotAvailable Errors with Calico and kubeadm

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- kubeadm
- Calico
- Calico IPAM
- calicoctl
- Prometheus
- Prometheus Operator PrometheusRule
- kube-state-metrics
- Grafana
- Kubernetes event monitoring

## Sources Consulted
- Calico Open Source documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source documentation: Monitoring kube-controllers with Prometheus - https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Calico Open Source documentation: FelixConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source documentation: Get started with IP address management - https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico Open Source documentation: calicoctl ipam check - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico Open Source documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Kubernetes documentation: Field selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes documentation: kubectl get - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes documentation: kube-controller-manager - https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes documentation: kube-state-metrics overview - https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- Kubernetes kube-state-metrics documentation: Pod metrics - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Kubernetes event exporter documentation - https://github.com/opsgenie/kubernetes-event-exporter

## Issues Found
- The post incorrectly described Calico IPAM metrics as Felix metrics exposed by `calico-node` on port 9091. Calico documents IPAM metrics on `calico-kube-controllers`, enabled by default on port 9094. Updated the commands, configuration guidance, metric names, PromQL expressions, and Grafana queries accordingly.
- The metric verification commands executed `wget` inside Calico containers, which may not include that utility. Replaced those checks with a temporary `curlimages/curl` pod querying the documented metrics service.
- The post used non-existent `felix_ipam_*` metric names. Replaced them with documented kube-controllers IPAM metrics: `ipam_allocations_in_use`, `ipam_ippool_size`, `ipam_blocks`, and `ipam_allocations_gc_candidates`.
- The introduction conflated Kubernetes `CIDRNotAvailable` node events with Calico IPAM exhaustion. Updated the wording to distinguish Kubernetes node CIDR allocation issues from Calico IPAM exhaustion.
- The event watcher and event exporter filtered only `FailedCreatePodSandBox`, which can catch pod sandbox failures but does not directly monitor `CIDRNotAvailable` events. Updated both examples to filter `reason=CIDRNotAvailable`.
- The Prometheus rule for nodes with no IPAM block used an incorrect metric and would not reliably alert for nodes without blocks. Replaced it with a documented Calico IPAM leak-candidate alert.
- The Grafana dashboard used invalid/incorrect IPAM metric names and counted pending pod phase series rather than summing pending pods. Updated the dashboard PromQL.
- The periodic health check warned on missing `Node.spec.podCIDR`, but Calico IPAM does not use Kubernetes node CIDR allocations. Replaced that check with a direct `CIDRNotAvailable` event check.

## Review Notes
The examples assume Calico is installed in `calico-system`, which is common for operator-managed installs. Some manifest-based installations may place Calico components in `kube-system`, so readers may need to adjust namespaces for their environment.
