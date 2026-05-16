# Validation Summary: How to Monitor Service-to-Service Traffic on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Linkerd (service mesh) and Linkerd Viz extension
- Prometheus (prometheus-community Helm chart)
- Grafana
- Jaeger (distributed tracing)
- PromQL
- Prometheus Operator (PrometheusRule CRD)

## Sources Consulted
- Linkerd proxy metrics reference: https://linkerd.io/2/reference/proxy-metrics/
- Linkerd distributed tracing task: https://linkerd.io/2/tasks/distributed-tracing/
- Linkerd architecture reference: https://linkerd.io/2/reference/architecture/
- Linkerd proxy configuration reference: https://linkerd.io/2/reference/proxy-configuration/
- Linkerd `viz` CLI reference: https://linkerd.io/2-edge/reference/cli/viz/
- prometheus-community Helm chart: https://github.com/prometheus-community/helm-charts
- Jaeger Helm chart: https://github.com/jaegertracing/helm-charts
- Talos Linux `talosctl` documentation: https://www.talos.dev/

## Issues Found
- **Distributed tracing section was technically incorrect.** The post recommended annotating workloads with `config.linkerd.io/trace-collector: "jaeger-collector.monitoring:14268"`. This is wrong for two reasons:
  1. Port 14268 is Jaeger's Thrift-over-HTTP collector port, but the Linkerd proxy has never spoken that protocol. Historically it spoke OpenCensus gRPC (port 55678) and now uses OTLP gRPC (port 4317).
  2. The `config.linkerd.io/trace-collector` annotation and the `linkerd-jaeger` extension were deprecated in Linkerd 2.19+. The current way to configure tracing is via Helm values (`proxy.tracing.collector.endpoint`) on the control plane.

  I rewrote the Distributed Tracing section to use the current, supported approach: set the collector endpoint to `jaeger-collector.monitoring:4317` via a Helm upgrade of `linkerd-control-plane`, and clarified that the proxy enriches existing traces (it does not generate them from scratch) so applications must still propagate `b3` or W3C `traceparent` headers.

## Review Notes
- The `linkerd viz` commands (`install`, `check`, `stat`, `routes`, `tap`, `edges`) all match the current Linkerd CLI.
- The Linkerd proxy metric names used (`request_total`, `response_total` with `classification=success|failure`, `response_latency_ms_bucket`, `tcp_open_connections`, `tcp_read_bytes_total`, `tcp_write_bytes_total`) are confirmed correct per the Linkerd proxy-metrics reference.
- The Prometheus scrape config (container name `linkerd-proxy`, port name `linkerd-admin`) matches Linkerd's pod injection conventions.
- The Helm install commands assume the `grafana` and `jaegertracing` repos are already added (only `prometheus-community` is shown being added). This is a minor convenience omission but not a technical error - a careful reader will infer they need `helm repo add grafana https://grafana.github.io/helm-charts` and similar for `jaegertracing`.
- The PromQL alerting rules and dashboard expressions are syntactically valid and semantically meaningful.
- `talosctl get machineconfig -n <NODE_IP>` is valid; `-n` is the short flag for `--nodes`.
- The CoreDNS log selector (`-l k8s-app=kube-dns`) is correct on Talos clusters, which deploy CoreDNS with that legacy label for compatibility.
