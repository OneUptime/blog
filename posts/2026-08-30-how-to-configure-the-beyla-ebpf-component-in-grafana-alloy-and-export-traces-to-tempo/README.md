# How to Configure the `beyla.ebpf` Component in Grafana Alloy and Export Traces to Tempo

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Alloy, Grafana Tempo, eBPF, OpenTelemetry, OTLP, Tracing, Auto-Instrumentation

Description: Wire Grafana Alloy's beyla.ebpf component through an OpenTelemetry batch processor and OTLP exporter into Grafana Tempo.

---

Grafana Alloy's `beyla.ebpf` component runs Beyla as a child process, discovers selected Linux applications, generates spans and RED metrics, and exposes those signals to Alloy pipelines. Trace export is explicit: configure `output.traces` to send traces to an `otelcol` consumer, and that consumer must eventually reach Tempo.

The data path is:

```text
application process -> beyla.ebpf -> otelcol.processor.batch
                    -> otelcol.exporter.otlp -> Tempo OTLP receiver
```

Alloy and standalone Beyla do not necessarily ship the same Beyla version. The current Alloy component reference identifies the embedded version it wraps. Treat that component page—not the latest standalone Beyla YAML reference—as authoritative for accepted Alloy blocks and fields.

## Configure a minimal trace pipeline

The following Alloy configuration instruments processes listening on port `8080`, batches their spans, and sends OTLP/gRPC to a Tempo service:

```alloy
beyla.ebpf "checkout" {
  discovery {
    instrument {
      open_ports = "8080"
    }
  }

  traces {
    instrumentations = ["http", "grpc"]
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

otelcol.exporter.otlp "tempo" {
  client {
    endpoint = "tempo.monitoring.svc.cluster.local:4317"
    tls {
      insecure = true
    }
  }
}
```

`otelcol.exporter.otlp` uses OTLP over gRPC, so its endpoint is `host:port` rather than an HTTP URL. `insecure = true` disables TLS; use it only where clear-text traffic is permitted, such as a protected in-cluster network. Use validated TLS and authentication across untrusted boundaries.

Tempo's distributor is its trace-ingestion entry point. Enable only the required OTLP receiver and ensure it listens on an address reachable from Alloy; Tempo's receiver defaults may bind to localhost unless explicitly configured by the deployment. The Kubernetes Service port configured in Alloy must route to the receiver's listening port and carry the matching OTLP transport (gRPC or HTTP).

If Tempo exposes OTLP/HTTP on `4318` instead, use Alloy's `otelcol.exporter.otlphttp` component and provide an HTTP(S) endpoint according to that component reference. Merely changing `4317` to `4318` while retaining the gRPC exporter does not change protocols.

## Select services narrowly

Port selection is convenient on a single host. In Kubernetes, the component also supports discovery selectors based on metadata. For example:

```alloy
beyla.ebpf "checkout" {
  discovery {
    instrument {
      kubernetes {
        namespace       = "shop"
        deployment_name = "checkout"
      }
    }

    exclude_instrument {
      kubernetes {
        namespace = "kube-system"
      }
    }
  }

  attributes {
    kubernetes {
      enable       = "true"
      cluster_name = "production-eu"
    }
  }

  output {
    traces = [otelcol.processor.batch.beyla.input]
  }
}
```

Selectors within one `instrument` entry are combined; multiple entries provide alternatives. Current Beyla discovery also has default exclusions for Beyla, Alloy, the OpenTelemetry Collector, and common system namespaces, but explicit scope still makes resource use and ownership clearer.

Kubernetes metadata decoration requires suitable list/watch RBAC for the resources documented by Beyla. `hostPID: true` is required when Alloy running as a DaemonSet must see processes across the node.

## Preserve the trace output connection

In Alloy 1.19, the `output` block is optional unless an explicit global `traces` configuration sets instrumentations or a sampler. Either omitting it or leaving it empty gives spans no Alloy consumer. This configuration is valid but exports no traces:

```alloy
beyla.ebpf "checkout" {
  discovery {
    instrument {
      open_ports = "8080"
    }
  }

  output {}
}
```

That is why RED metrics can work while Tempo remains empty: metrics may be scraped from `beyla.ebpf.checkout.targets`, while spans have no `output.traces` consumer.

If Prometheus metrics are also wanted, add a separate scrape path:

```alloy
prometheus.scrape "beyla" {
  targets      = beyla.ebpf.checkout.targets
  honor_labels = true
  forward_to   = [prometheus.remote_write.metrics.receiver]
}
```

`honor_labels = true` preserves the job and instance labels produced by Beyla. Define the referenced remote-write component separately. Metrics and traces remain independent pipelines.

## Configure permissions for the component

Alloy spawns Beyla and transfers capabilities through inheritable and ambient capability sets. The current component reference lists the possible capabilities: `BPF`, `NET_ADMIN`, `NET_RAW`, `PERFMON`, `DAC_READ_SEARCH`, `SYS_PTRACE`, `CHECKPOINT_RESTORE`, `SYS_RESOURCE` on kernels earlier than 5.11, and `SYS_ADMIN` for library-level instrumentation. The exact subset depends on enabled features.

For Kubernetes, Grafana recommends a non-privileged root container with only required capabilities rather than `privileged: true`. Set `hostPID: true` and configure an Unconfined AppArmor profile as the component documentation requires. Alloy does not need `SETPCAP` for the child-transfer mechanism.

Start with `enforce_sys_caps = true` in `beyla.ebpf` during rollout. Missing capabilities then fail startup with a list rather than surfacing later as partial instrumentation:

```alloy
beyla.ebpf "checkout" {
  enforce_sys_caps = true
  trace_printer    = "text"

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

The text printer provides live, per-span confirmation at controlled volume and should be removed when normal monitoring is in place.

## Validate every boundary

1. Ask Alloy to load the configuration and inspect the component graph/UI for `beyla.ebpf.checkout`, the batch processor, and exporter.
2. Generate supported HTTP or gRPC traffic on the selected service after Alloy starts.
3. Temporarily set `trace_printer = "text"` to confirm that the Beyla subprocess is intercepting requests and generating spans.
4. Inspect Alloy exporter metrics such as sent and failed spans plus retry-queue size.
5. From the Alloy Pod or host, resolve the Tempo name and connect to the configured port.
6. Check Tempo distributor logs and ingestion metrics.
7. Query a time range covering the test and search by the actual `service.name` resource attribute.

Alloy reports `beyla.ebpf` unhealthy for invalid configuration, not for every downstream delivery failure. A healthy component graph is necessary but not sufficient; exporter counters and Tempo ingestion provide the delivery evidence.

## Add sampling only after the baseline works

The component enables all supported trace instrumentations by default. Narrowing them can reduce overhead. It also supports global and per-service samplers. For example:

```alloy
traces {
  instrumentations = ["http", "grpc", "sql"]
  sampler {
    name = "traceidratio"
    arg  = "0.10"
  }
}
```

This keeps approximately ten percent by trace ID; it is not appropriate when the validation expects every single request. For a baseline that drops nothing at the Beyla sampler, use `always_on`; the default `parentbased_always_on` may drop spans when a request carries an unsampled parent context. Establish delivery at controlled volume first, then choose sampling from traffic, cost, and incident-debugging requirements.

## Official Documentation

- [Grafana Alloy `beyla.ebpf` component](https://grafana.com/docs/alloy/latest/reference/components/beyla/beyla.ebpf/)
- [Alloy OTLP/gRPC exporter](https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.exporter.otlp/)
- [Alloy OTLP/HTTP exporter](https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.exporter.otlphttp/)
- [Alloy batch processor](https://grafana.com/docs/alloy/latest/reference/components/otelcol/otelcol.processor.batch/)
- [Tempo with Grafana Alloy](https://grafana.com/docs/tempo/latest/set-up-for-tracing/instrument-send/set-up-collector/grafana-alloy/)
- [Tempo distributor receiver configuration](https://grafana.com/docs/tempo/latest/configuration/#distributor)
- [Beyla service discovery](https://grafana.com/docs/beyla/latest/configure/service-discovery/)

## Conclusion

Connect `beyla.ebpf.output.traces` to an Alloy consumer, carry that signal through a processor or directly to the correct OTLP exporter, and make Tempo's matching receiver reachable. Validate trace creation, exporter delivery, and Tempo ingestion as separate boundaries. Pin Alloy, follow its embedded Beyla component reference, and grant only the host capabilities required by the selected instrumentation.
