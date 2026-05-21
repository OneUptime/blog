# Validation Summary: How to Monitor Istiod xDS Connection Count

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Istiod / Pilot
- Envoy xDS
- Kubernetes / kubectl
- Prometheus / PromQL
- Prometheus Operator
- Grafana

## Sources Consulted
- Istio pilot-discovery command and exported metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio pilot-agent command and exported metrics reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio source for `pilot_xds` metric definition: https://github.com/istio/istio/blob/master/pilot/pkg/xds/monitoring.go
- Istio source for `istiod_connection_terminations` metric definition: https://github.com/istio/istio/blob/master/pkg/istio-agent/metrics/metrics.go
- Istio source for `keepaliveMaxServerConnectionAge` install value and pilot-discovery flag: https://github.com/istio/istio/blob/master/manifests/charts/istio-control/istio-discovery/values.yaml
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Prometheus PromQL functions reference: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post used `pilot_xds_connected`, which is not the current documented Istio control-plane metric. Replaced it with `pilot_xds`, the current metric for endpoints connected to a Pilot instance using XDS.
- The post described Envoy sidecars as connecting directly to istiod. Updated the explanation to reflect current Istio sidecars, where Envoy connects to local pilot-agent and pilot-agent maintains the upstream xDS connection to istiod.
- The post used `XDS_STREAM_TIMEOUT` under `meshConfig.defaultConfig.proxyMetadata`. Replaced this with `values.pilot.keepaliveMaxServerConnectionAge`, the Istio install value that configures istiod's maximum gRPC server connection age.
- The post referenced `pilot_xds_connection_terminations`, which is not an Istio istiod metric. Replaced termination-rate examples with the current istio-agent metric `istiod_connection_terminations` and noted that it is available when proxy agent metrics are scraped.
- The expected-count wording said xDS connections should match only pods with sidecars. Updated it to say the count should roughly match running Istio proxies, including sidecars and gateways.
- The debugging step said the Envoy admin cluster check verifies istiod reachability. Updated the wording to say it checks the proxy's local xDS cluster.

## Review Notes
- Capacity thresholds in the post are operational heuristics and should be validated against the reader's workload, Istio version, and istiod resource limits.
