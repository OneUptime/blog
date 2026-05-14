# Validation Summary: How to Build Dashboards for Whisker in Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico Whisker
- Goldmane flow logs API
- Kubernetes
- kubectl
- Grafana

## Sources Consulted
- Calico Open Source documentation: View flow logs in the Calico Whisker web console: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico Open Source documentation: Enable the flow logs API and Calico Whisker: https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico Open Source documentation: Flow logs API: https://docs.tigera.io/calico/latest/observability/flow-logs-api
- Calico Open Source documentation: Felix configuration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes documentation: kubectl port-forward: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward
- Kubernetes documentation: kubectl logs: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs
- Tigera Operator source for Whisker service, label selector, and port rendering: https://github.com/tigera/operator/blob/v1.42.0/pkg/render/whisker/component.go

## Issues Found
- The introduction claimed Whisker flow data can be exported to Prometheus or Elasticsearch. Calico Open Source documentation describes Whisker as being powered by Goldmane, a gRPC flow logs API, and does not document a direct Whisker export path to Prometheus or Elasticsearch. Updated the wording to describe retrieving aggregated flow data from Goldmane and feeding it into an external storage or metrics pipeline.
- The architecture diagram sent Felix flow logs directly to the Whisker backend. Official Calico documentation states Whisker receives live data from the Goldmane flow logs API. Updated the diagram to include Goldmane between Felix flow logs and Whisker.
- The Whisker pod log command used `app=whisker`, but the Tigera Operator-rendered Whisker service selects pods with `k8s-app=whisker`. Updated the pod and log commands to use `k8s-app=whisker`.
- The command checking `.spec.flowLogsFlushInterval` on the default FelixConfiguration was not a reliable way to validate a Whisker/Goldmane installation in current Calico Open Source docs. Replaced it with checks for the `goldmane` and `whisker` custom resources documented by Calico.
- The query examples used ambiguous field names and capitalized actions such as `destination`, `source`, `timestamp`, and `Deny`. Calico flow log data types document fields such as `dest_name`, `source_name`, `start_time`, `source_namespace`, and lowercase `allow`/`deny` actions. Updated the examples accordingly.

## Review Notes
Calico Whisker and Goldmane are documented as tech preview features in Calico Open Source 3.32, so behavior and APIs may change before general availability. The local environment did not have `kubectl` installed, so kubectl syntax was validated against official Kubernetes command reference pages rather than local `--help` output.
