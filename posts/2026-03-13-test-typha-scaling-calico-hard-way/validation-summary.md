# Validation Summary: Testing Typha Scaling in Calico the Hard Way

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Typha
- Felix
- Kubernetes
- kubectl
- calicoctl
- Prometheus metrics
- Calico NetworkPolicy and GlobalNetworkPolicy

## Sources Consulted
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Typha Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico component metrics monitoring: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico network policy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico default deny policy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/

## Issues Found
- The network policy test curled `server.typha-test.svc.cluster.local`, but the commands created only a Pod and did not create the `server` Service. Added `kubectl expose pod server --port=80 -n typha-test` so the DNS name resolves.
- The post implied a policy is applied "through Typha." Calico policy is applied to the datastore/API by `calicoctl`; Typha then distributes updates to Felix. Updated the wording to reflect that flow.
- The Felix Typha configuration reference used the lowercase resource field name only. Updated it to use the documented `TyphaK8sServiceName` setting and the `FELIX_TYPHAK8SSERVICENAME` environment variable.
- The restart resilience test applied a GlobalNetworkPolicy that did not select any workload and only proved that `calicoctl` could write policy during a restart. Replaced that portion with a Typha connection check after deleting a Typha pod, which better matches the stated validation goal.
- The metrics check referenced non-existent or incorrect metric names: `typha_updates_sent_total` and `typha_snapshots_generated_total`. Replaced them with documented Typha metrics: `typha_updates_total` and `typha_snapshots_generated`, and added `typha_connections_streaming`.
- The post assumed all listed metrics must be non-zero after five minutes. Updated the text because Typha counters can remain zero until relevant datastore activity occurs; active streaming connections are the metric expected to be non-zero in a live Typha deployment with Felix clients.
- The examples used port 9093 while Calico's Typha default Prometheus metrics port is 9091 unless configured otherwise. Clarified the prerequisite to state that the examples assume `TYPHA_PROMETHEUSMETRICSPORT=9093`.

## Review Notes
The commands assume a manifest-style Calico deployment in `kube-system` with labels such as `k8s-app=calico-typha` and `k8s-app=calico-node`. Operator installations often use `calico-system`, so readers may need to adjust namespaces for their installation.
