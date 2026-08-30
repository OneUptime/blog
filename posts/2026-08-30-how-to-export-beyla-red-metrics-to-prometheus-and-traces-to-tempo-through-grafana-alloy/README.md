# How to Export Beyla RED Metrics to Prometheus and Traces to Tempo Through Grafana Alloy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Alloy, Prometheus, Grafana Tempo, OpenTelemetry, RED Metrics

Description: Wire Grafana Alloy's `beyla.ebpf` component to a Prometheus remote-write backend for RED metrics and a Tempo OTLP receiver for traces.

---

Grafana Alloy's `beyla.ebpf` component exposes its two signal paths differently:

- metrics are available through exported scrape targets and must be collected by `prometheus.scrape`;
- traces leave through the component's OpenTelemetry `output` and can pass through processors to an OTLP exporter.

Configuring only the trace output does not export metrics, and scraping the Beyla targets does not send traces to Tempo.

## Build both pipelines explicitly

This Alloy configuration discovers services in a production namespace, restricts collected telemetry to HTTP and gRPC, remote-writes RED metrics, and sends traces to Tempo over OTLP/HTTP:

```alloy
beyla.ebpf "applications" {
  enforce_sys_caps = true

  discovery {
    instrument {
      kubernetes {
        namespace = "production"
      }
    }
  }

  ebpf {
    track_request_headers = true
  }

  attributes {
    kubernetes {
      enable       = "true"
      cluster_name = "prod-eu-1"
    }
  }

  metrics {
    features         = ["application"]
    instrumentations = ["http", "grpc"]
  }

  traces {
    instrumentations = ["http", "grpc"]
  }

  output {
    traces = [otelcol.processor.batch.beyla.input]
  }
}

prometheus.scrape "beyla" {
  targets      = beyla.ebpf.applications.targets
  honor_labels = true
  forward_to   = [prometheus.remote_write.metrics.receiver]
}

prometheus.remote_write "metrics" {
  endpoint {
    url = sys.env("PROMETHEUS_REMOTE_WRITE_URL")

    basic_auth {
      username = sys.env("PROMETHEUS_USERNAME")
      password = sys.env("PROMETHEUS_PASSWORD")
    }
  }
}

otelcol.processor.batch "beyla" {
  output {
    traces = [otelcol.exporter.otlphttp.tempo.input]
  }
}

otelcol.exporter.otlphttp "tempo" {
  client {
    endpoint = "http://tempo-distributor.observability.svc.cluster.local:4318"
  }
}
```

`honor_labels = true` is important when queries and dashboards expect Beyla's per-process values under the canonical `job` and `instance` names. With the default `false`, Prometheus resolves those label conflicts by applying the scrape target's `job` and `instance`, while renaming Beyla's conflicting values to `exported_job` and `exported_instance`. Store credentials in Kubernetes Secrets and inject them into Alloy's environment rather than placing them in the configuration.

The OTLP/HTTP exporter treats its `endpoint` as the base and sends traces to the protocol's `/v1/traces` path. Tempo must have its OTLP HTTP receiver enabled and reachable at that Service and port. Use `otelcol.exporter.otlp` and port 4317 instead if the intended receiver is OTLP/gRPC.

## Understand the metric destination

`prometheus.remote_write` needs a remote-write receiver such as Grafana Mimir, Grafana Cloud Metrics, or Prometheus started with its remote-write receiver feature enabled. A normal Prometheus query endpoint is not automatically a write endpoint.

Set the URL to the backend's documented write path. Prometheus's built-in receiver uses `/api/v1/write`, Grafana Mimir uses `/api/v1/push`, and Grafana Cloud Metrics uses the stack-specific `/api/prom/push` URL. If credentials are not required for an in-cluster backend, remove the `basic_auth` block entirely rather than injecting empty values.

Beyla's `application` feature exports request-duration histograms whose count series and status-code labels provide the data used to calculate request rate and errors. Additional features such as process, span, service-graph, or network metrics have separate cost and cardinality implications; enable them deliberately rather than using `all`.

## Meet the Kubernetes prerequisites

An Alloy DaemonSet running `beyla.ebpf` needs `hostPID: true`, an unconfined AppArmor profile, and the Linux capabilities required by its enabled Beyla features. Current Alloy documentation explains that Alloy starts Beyla as a child process and transfers capabilities through inheritable and ambient sets.

Kubernetes metadata discovery also needs a ServiceAccount that can list and watch Pods and ReplicaSets. Add Services and Nodes when the metadata and network use case requires them.

Pin an Alloy release and check the component reference shipped for that release. The reference states which Beyla version is embedded; standalone Beyla YAML keys cannot be pasted directly into Alloy blocks.

## Verify metrics independently from traces

Use Alloy's component health view first to catch configuration errors; component health alone does not prove backend delivery. Then query the `_count` series of a fresh request-duration histogram in the metrics backend and group it by service. With this configuration, inspect `http_*_request_duration_seconds*` or `rpc_*_duration_seconds*` series from the embedded Beyla version rather than assuming a legacy dashboard name.

For traces, send a request with a known W3C trace ID. The configuration enables `ebpf.track_request_headers` so Beyla uses the incoming ID for non-Go services; Go services process it automatically:

```bash
curl -H 'traceparent: 00-11111111111111111111111111111111-2222222222222222-01' \
  https://api.example.com/test
```

Search that trace ID in Tempo. If metrics arrive but traces do not, inspect the `beyla.ebpf -> batch -> otlphttp` chain, Tempo receiver logs, and HTTP response status. If traces arrive but metrics do not, inspect `beyla.ebpf.applications.targets`, the scrape component, and remote-write samples/retries.

Do not use the presence of one signal as proof that the other path works. They share discovery but have different exporters.

## Secure and operate the pipeline

Use TLS for traffic that leaves the cluster and configure the exporter client's CA and authentication according to the destination. Size the OTLP exporter's `sending_queue` and retry window for the expected outage duration, configure remote-write WAL retention and storage for that duration, and tune the remote-write queue for catch-up throughput. Then alert on dropped samples, failed exports, and sustained retry queues.

Limit discovery to intended workloads. A broad cluster-wide rule can increase Alloy/Beyla CPU, Prometheus cardinality, and Tempo ingest together.

## Conclusion

In Alloy, scrape Beyla's exported targets for RED metrics and use its trace output for Tempo. Preserve labels with `honor_labels`, point each exporter at an actual protocol receiver, and test metrics and traces separately. This explicit two-path design makes missing-signal failures much easier to isolate.

## Official Documentation

- [Grafana Alloy `beyla.ebpf` component](https://grafana.com/docs/alloy/latest/reference/components/beyla/beyla.ebpf/)
- [Alloy `prometheus.scrape` component](https://grafana.com/docs/alloy/latest/reference/components/prometheus/prometheus.scrape/)
- [Alloy `prometheus.remote_write` component](https://grafana.com/docs/alloy/latest/reference/components/prometheus/prometheus.remote_write/)
- [Alloy OTLP/HTTP exporter](https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.exporter.otlphttp/)
- [Tempo OpenTelemetry receiver configuration](https://grafana.com/docs/tempo/latest/configuration/#distributor)
