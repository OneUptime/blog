# Why Does a Beyla Trace Contain Only One Span? Enabling and Verifying Trace-Context Propagation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, eBPF, OpenTelemetry, Distributed Tracing, W3C Trace Context

Description: Join isolated Beyla spans into distributed traces by configuring W3C trace context, accounting for TLS and protocol limitations, and testing trace IDs end to end.

---

Tempo can receive healthy-looking Beyla spans while every trace contains only one span. Export is working; correlation is not. A distributed trace forms only when the caller passes a W3C `traceparent` context and the downstream instrumentation uses the same trace ID.

With Beyla, inbound context tracking and outbound injection depend on language, protocol, kernel policy, and deployment mode. Fixing the OTLP endpoint cannot repair a context that was never propagated.

## Start with the current propagation controls

For non-Go applications, explicitly enable incoming `traceparent` tracking and an outbound propagation method:

```yaml
ebpf:
  track_request_headers: true
  context_propagation: headers

otel_traces_export:
  endpoint: http://alloy.observability.svc.cluster.local:4318/v1/traces
  protocol: http/protobuf
```

`track_request_headers` lets Beyla use an incoming trace ID for server spans; Go instrumentation processes that header without this option. `context_propagation: headers` injects W3C context into outbound plaintext HTTP and is interoperable with OpenTelemetry SDKs. It avoids Beyla's Traffic Control-based packet encoding.

The available standalone modes are `headers`, `ip`, `all`, and `disabled`; current Alloy's `beyla.ebpf` wrapper calls the packet mode `tcp`. Use the values documented for the exact component and version you deploy rather than translating configuration mechanically between standalone Beyla and Alloy.

## Understand where header mode stops

Network-level header injection cannot modify an HTTP header after TLS encryption. With `context_propagation: all`, Beyla can encode context at the TCP/IP level for encrypted traffic, but both ends must be instrumented by Beyla. An L7 proxy or load balancer terminates and recreates the connection, breaking that packet-level context.

Generic network propagation also does not support gRPC or HTTP/2. Go has a separate library-level implementation that can cover HTTP, HTTP/2, HTTPS, and gRPC with limitations. It uses `bpf_probe_write_user`; Linux kernel lockdown in `integrity` mode blocks that helper. Secure Boot commonly enables such lockdown.

Check the host mode:

```bash
cat /sys/kernel/security/lockdown
```

If the file reports anything other than `[none]`, Beyla's Go memory-write propagation cannot operate. Mount `/sys/kernel/security` into the Beyla container so it can detect the real host setting.

For workloads that cross TLS terminators or use unsupported generic protocols, let an OpenTelemetry SDK or language agent inject standard headers inside the application. Beyla will honor a header the application already supplied.

## Meet the DaemonSet requirements for packet propagation

If `all` is genuinely required, the Beyla DaemonSet needs more than a configuration key:

- `hostNetwork: true` and `dnsPolicy: ClusterFirstWithHostNet`;
- host `/sys/fs/cgroup` mounted at the same path;
- host `/sys/kernel/tracing` mounted at the same path;
- `NET_ADMIN` for Traffic Control;
- correct chaining with another TC user such as Cilium.

A missing cgroup mount can make propagation intermittent because Beyla uses it to observe newly created sockets. Treat CNI compatibility as part of the design, not as a later exporter problem.

## Test with a known trace ID

Send a request with a valid sampled W3C header:

```bash
TRACE_ID=11111111111111111111111111111111
curl -H "traceparent: 00-${TRACE_ID}-2222222222222222-01" \
  https://frontend.example.com/test-checkout
```

Then search Tempo for `11111111111111111111111111111111`. Inspect the frontend server span, its client span, and the downstream server span. All should share the trace ID; parent span IDs should form the expected chain.

For a short diagnostic window, set Beyla's root `trace_printer: text` and compare its output at each node. Disable the printer afterward because stdout is not a durable trace backend and high-volume output has a cost.

## Isolate the broken hop

If the trace still has one span, verify each boundary:

1. Does the first service's server span use the injected trace ID? If not, inbound tracking is missing.
2. Does the first service emit a client span? If not, that library or protocol may not be covered.
3. Does the downstream request actually contain `traceparent` before encryption? Application or proxy access logs can help if they safely expose only header presence, not unrelated sensitive headers.
4. Does the downstream server span use the same trace ID? If not, its instrumentation is not reading the header.
5. Does the collector export both spans, and does sampling keep both? Parent-based sampling should preserve the upstream decision; inconsistent independent ratio sampling can produce partial traces.

Also verify stable, nonempty `service.name` values. They do not join trace IDs, but missing identities make a correct trace hard to interpret and prevent useful service graphs.

## Conclusion

A one-span trace usually means the W3C context broke at one hop. Enable inbound tracking for non-Go services, choose a propagation mode compatible with the actual encryption and protocol path, and meet the extra DaemonSet requirements before using packet-level propagation. A fixed trace ID turns the investigation from guesswork into a hop-by-hop test.

## Official Documentation

- [Distributed traces with Beyla](https://grafana.com/docs/beyla/latest/distributed-traces/)
- [Configure Beyla instrumentation and context propagation](https://grafana.com/docs/beyla/latest/configure/controlling-instrumentation/)
- [Beyla and Cilium compatibility](https://grafana.com/docs/beyla/latest/cilium-compatibility/)
- [W3C Trace Context specification](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry context propagation](https://opentelemetry.io/docs/concepts/context-propagation/)
