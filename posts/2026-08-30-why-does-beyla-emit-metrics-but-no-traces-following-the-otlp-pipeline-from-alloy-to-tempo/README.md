# Why Does Beyla Emit Metrics but No Traces? Following the OTLP Pipeline from Alloy to Tempo

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Alloy, Grafana Tempo, eBPF, OpenTelemetry, OTLP, Tracing, RED Metrics

Description: Trace a missing-span problem from Beyla discovery through Alloy's consumer graph, OTLP transport, Tempo ingestion, and trace search.

---

Beyla metrics and traces can take different paths. In Grafana Alloy, Prometheus may successfully scrape the targets exported by `beyla.ebpf` while the component's `output.traces` list is empty, points to the wrong consumer, is sampled to zero, or reaches a broken OTLP exporter. Seeing RED metrics proves that some instrumentation works; it does not prove a span reached Tempo.

Debug the pipeline in one direction:

```text
request -> process discovered -> span generated -> beyla.ebpf output
        -> Alloy processor -> OTLP exporter -> Tempo receiver
        -> Tempo accepted/stored -> Grafana queried the right tenant/time/service
```

Do not change multiple stages at once. Find the first boundary without evidence.

## 1. Confirm the request is traceable

Generate sustained, known HTTP or gRPC traffic after Alloy and the Beyla child process are running. Verify the process matches the discovery rule. A Prometheus target may exist even when the intended service was not selected, especially with a broad port or executable pattern.

Temporarily enable the component's trace printer:

```alloy
beyla.ebpf "apps" {
  trace_printer = "text"

  discovery {
    instrument {
      open_ports = "8080"
    }
  }

  output {
    traces = [otelcol.processor.batch.beyla.input]
  }
}
```

Inspect Alloy logs while making requests. If no trace records appear, the problem is before OTLP: wrong port, selector mismatch, unsupported traffic/runtime, missing eBPF permissions, or no requests. Enable `debug = true` briefly for deeper Beyla logs, mindful of volume.

If printed spans appear, stop changing discovery. The problem is downstream.

## 2. Check `output.traces`

Alloy requires an `output` block for `beyla.ebpf`, but every argument inside it is optional. With `output {}`, telemetry that is not connected elsewhere is dropped. Metrics can still be scraped through the component's `targets` export.

A complete trace edge looks like:

```alloy
beyla.ebpf "apps" {
  discovery {
    instrument {
      open_ports = "8080"
    }
  }

  output {
    traces = [otelcol.processor.batch.beyla.input]
  }
}

otelcol.processor.batch "beyla" {
  output {
    traces = [otelcol.exporter.otlp.tempo.input]
  }
}
```

Check labels exactly. `otelcol.processor.batch.default.input` and `otelcol.processor.batch.beyla.input` are different components. Use Alloy's component graph to confirm each consumer reference resolves and that a processor's trace output reaches the exporter.

## 3. Eliminate accidental sampling

The default component trace instrumentations are enabled, but an explicit sampler can intentionally discard most traces. During diagnosis, remove global and per-service samplers or use an always-on configuration supported by the deployed component version.

For a ratio sampler such as:

```alloy
traces {
  sampler {
    name = "traceidratio"
    arg  = "0.01"
  }
}
```

one request is very weak evidence: a one-percent policy is expected to discard almost all isolated test requests. Generate a statistically meaningful controlled workload or temporarily test without sampling. Also inspect downstream collector or Tempo-side sampling if present.

## 4. Match exporter and receiver protocols

These Alloy exporters are not interchangeable:

| Alloy component | Transport | Endpoint shape |
| --- | --- | --- |
| `otelcol.exporter.otlp` | OTLP/gRPC | `tempo:4317` |
| `otelcol.exporter.otlphttp` | OTLP/HTTP | `http://tempo:4318` or HTTPS URL |

Using a gRPC exporter against an HTTP receiver port fails even though both are called OTLP. A local clear-text gRPC exporter is typically:

```alloy
otelcol.exporter.otlp "tempo" {
  client {
    endpoint = "tempo.monitoring.svc.cluster.local:4317"
    tls {
      insecure = true
    }
  }
}
```

Tempo receivers default to localhost unless the deployment config binds them for external access. Confirm the distributor receiver listens on the Pod interface and that the Service targets the right named port. From the Alloy Pod, check DNS resolution, TCP reachability, NetworkPolicy, service mesh policy, and TLS trust.

Do not use `insecure_skip_verify` as a permanent fix for a hostname or CA error. Correct the certificate, server name, and trust chain.

## 5. Inspect Alloy delivery counters

The OTLP exporter exposes debug metrics including sent spans, failed send attempts, retry-queue capacity, and retry-queue size. Query the Alloy metrics endpoint and compare counters while generating traffic.

Interpret them together:

- printed spans but no exporter activity: consumer graph is disconnected;
- failed sends increasing: protocol, network, TLS, authentication, receiver, or rate-limit problem;
- queue size growing: Tempo is unavailable or slower than the incoming stream;
- sent spans increasing: move the investigation to Tempo and query scope.

Alloy exporters retry transient failures and use a sending queue by default, but the queue is finite and normally in memory. A healthy-looking process can still drop data after retry limits or queue exhaustion. Read the actual error log rather than relying only on component health.

## 6. Confirm Tempo accepts the same tenant

Tempo's distributor receives and validates spans. Check its logs and ingestion metrics at the same timestamps as Alloy's sent counter. Common rejection causes include authentication, tenant headers, rate limits, oversized traces or attributes, and a receiver bound to the wrong interface.

When Tempo multitenancy is enabled, write requests require the configured tenant identity and queries must use the same tenant. Successfully sending to tenant A while Grafana queries tenant B looks exactly like missing traces.

For a direct local Tempo deployment, verify the relevant `distributor.receivers.otlp.protocols.grpc` or `http` receiver is enabled and externally reachable. In microservices mode, the Service should target distributors, not a query-only component.

## 7. Search with the attributes that actually arrived

A trace can be stored but invisible under the expected service. Inspect a printed span's resource attributes and note `service.name`, `service.namespace`, and Kubernetes metadata. Search a time range that includes clock skew and the request timestamp.

Beyla resolves service identity from OpenTelemetry environment variables, Kubernetes annotations and labels, owner metadata, and finally executable information. If the workload lacks stable labels, the service may appear under an unexpected executable or Pod-derived name.

Also distinguish Tempo storage from service-graph and span-metric features. A missing service graph does not mean no traces exist; those derived metrics require their own processors and configuration.

## A compact decision tree

```text
No printed spans?
  -> discovery, supported traffic, requests, kernel permissions

Printed spans, no exporter counters?
  -> output.traces or processor graph

Exporter failures/queue growth?
  -> DNS, NetworkPolicy, OTLP protocol, TLS/auth, Tempo receiver

Exporter sent spans, no Tempo ingestion?
  -> receiver target, tenant, rejection/rate limits

Tempo ingestion, no search result?
  -> tenant, time range, service.name, query path
```

Remove temporary text/debug printing after the incident; it can create significant log volume and expose request metadata.

## Official Documentation

- [Grafana Alloy `beyla.ebpf` component](https://grafana.com/docs/alloy/latest/reference/components/beyla/beyla.ebpf/)
- [Alloy OTLP/gRPC exporter and debug metrics](https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.exporter.otlp/)
- [Alloy OTLP/HTTP exporter](https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.exporter.otlphttp/)
- [Beyla telemetry export](https://grafana.com/docs/beyla/latest/configure/export-data/)
- [Beyla service discovery and service naming](https://grafana.com/docs/beyla/latest/configure/service-discovery/)
- [Tempo configuration: distributor receivers](https://grafana.com/docs/tempo/latest/configuration/#distributor)
- [Tempo troubleshooting with Grafana Alloy](https://grafana.com/docs/tempo/latest/troubleshooting/send-traces/alloy/)

## Conclusion

Metrics prove Beyla is alive, not that traces reached Tempo. Prove span generation with temporary trace printing, verify the `output.traces` consumer graph, remove sampling during the test, match OTLP protocol and receiver port, and follow Alloy sent/failed counters into Tempo's tenant and ingestion metrics. The first missing piece of evidence identifies the layer to fix.
