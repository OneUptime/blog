# Validation Summary: How to Monitor Elemental Machine State

## Status
validated

## Post Type
Guide

## Technologies Covered
- SUSE Rancher Elemental / Elemental Operator
- Kubernetes custom resources and `kubectl`
- `jq`
- Prometheus
- kube-state-metrics
- Prometheus Operator / `PrometheusRule`
- Grafana
- Prometheus `node_exporter` textfile collector
- Krew / `resource-capacity` (`kube-capacity`)

## Sources Consulted
- Elemental MachineInventory reference: https://elemental.docs.rancher.com/machineinventory-reference/
- Elemental inventory management reference: https://elemental.docs.rancher.com/inventory-management/
- Elemental operator `MachineInventory` API type: https://github.com/rancher/elemental-operator/blob/main/api/v1beta1/machineinventory_types.go
- Elemental operator condition constants: https://github.com/rancher/elemental-operator/blob/main/api/v1beta1/condition_consts.go
- Elemental operator `MachineInventory` controller logic: https://github.com/rancher/elemental-operator/blob/main/controllers/machineinventory_controller.go
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- kube-state-metrics custom resource state metrics docs: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/extend/customresourcestate-metrics.md
- Prometheus `node_exporter` README: https://github.com/prometheus/node_exporter/blob/master/README.md
- `kube-capacity` / `resource-capacity` usage: https://github.com/robscott/kube-capacity

## Issues Found
- The post described `MachineInventory` as if it exposed a phase/state model (`Pending`, `Adopted`, `Resetting`, `Upgrading`, and so on). The Elemental docs and CRD expose conditions instead, so I replaced that table with the actual `Ready` and `AdoptionReady` conditions.
- The query examples referenced `.spec.machineRef`, but `MachineInventory.spec` does not contain that field. I changed those examples to read `status.conditions`, which is how Elemental surfaces readiness and adoption state.
- The specific-condition example piped `kubectl -o jsonpath='{.status.conditions}'` into `jq`. Kubernetes JSONPath prints objects using string formatting rather than guaranteed JSON, so I changed the command to use `-o json | jq '.status.conditions'`.
- The Prometheus alert referenced a custom-resource metric name that kube-state-metrics does not expose by default. I corrected the section to show the required kube-state-metrics custom resource state configuration and updated the alert to match the generated metric and value semantics.
- The original alert expression treated the condition value incorrectly. kube-state-metrics maps condition `status: "True"` to `1` and `status: "False"` / `Unknown` to `0`, so I changed the alert expression accordingly.
- The `resource-capacity` example was described as resource usage even though the command shown reports requests and limits unless `--util` is used. I corrected the wording.
- The dashboard and exporter scripts counted adoption through the nonexistent `spec.machineRef` field. I updated both scripts to count adopted machines through the `AdoptionReady` condition.
- The Grafana exporter example only printed Prometheus text to stdout, which is not scrapeable on its own. I changed it to write a `.prom` file for the `node_exporter` textfile collector, which is a valid Prometheus/Grafana integration pattern.
- The script examples wrote to `/usr/local/bin` without mentioning privilege requirements. I changed them to create local executable files so the examples work without root access.
- The location-label aggregation example could drop unlabeled machines because of `jq` generator behavior. I corrected the expression so unlabeled machines are counted as `unlabeled`.

## Review Notes
- The alert examples cover `MachineInventory` objects that already exist. Detecting machines that never register at all requires separate expected-inventory or absent-resource alerting logic.
- The Prometheus example assumes `kube-state-metrics` is already deployed and can be updated with custom resource state metric configuration plus the necessary RBAC.
- The Grafana section assumes Prometheus scrapes a `node_exporter` instance that has the `textfile` collector enabled.
- The `resource-capacity` plugin complements Elemental monitoring by showing pod and node resource pressure on adopted cluster nodes; it does not read `MachineInventory` resources directly.
