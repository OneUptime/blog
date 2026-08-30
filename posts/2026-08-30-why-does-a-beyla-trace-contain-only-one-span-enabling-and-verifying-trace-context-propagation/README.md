# Why Does a Beyla Trace Contain Only One Span? Enabling and Verifying Trace-Context Propagation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, eBPF, OpenTelemetry, Distributed Tracing, W3C Trace Context

Description: Join isolated Beyla spans into distributed traces by configuring W3C trace context, accounting for TLS and protocol limitations, and testing trace IDs end to end.

---

Tempo can receive healthy-looking Beyla spans while every trace contains only one span. Export is working; correlation is not. Across a service-to-service hop, a distributed trace forms only when the caller propagates trace context and the downstream instrumentation continues the same trace ID and parent relationship. The entry service can start a new trace when no context arrives.

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

`track_request_headers` lets Beyla use an incoming trace ID for server spans; Go instrumentation processes that header without this option. `context_propagation: headers` injects W3C context into outbound plaintext HTTP and is interoperable with OpenTelemetry SDKs. It leaves Beyla's custom TCP-option propagation disabled.

Current Beyla accepts `headers`, `tcp`, `headers,tcp`, `all`, and `disabled`; `all` and `headers,tcp` are equivalent. The legacy `ip` value is accepted only for compatibility and has no effect. Current Alloy's `beyla.ebpf` wrapper documents `all`, `headers`, `tcp`, and `disabled`. Use the values documented for the exact component and version you deploy rather than translating configuration mechanically between standalone Beyla and Alloy.

## Understand where header mode stops

Network-level header injection cannot modify an HTTP header after TLS encryption. With `context_propagation: all`, Beyla can carry context for encrypted HTTP/1 traffic in custom TCP option kind 25, but both ends must be instrumented by Beyla. An L7 proxy or load balancer terminates and recreates the connection, breaking that TCP-option context.

Generic network propagation supports plaintext HTTP/2 and gRPC by injecting and extracting `traceparent` in HPACK header blocks. It cannot inject headers into TLS-encrypted HTTP/2 or gRPC, and TCP-option propagation is not used for these multiplexed protocols. Extracting a Huffman-encoded `traceparent` requires Linux 5.17 or newer.

Go has a separate library-level implementation that can cover HTTP, HTTP/2, HTTPS, and gRPC with limitations. It uses `bpf_probe_write_user` and requires `CAP_SYS_ADMIN`. Since Linux 5.14, with fixes backported to the 5.10 series, kernel lockdown in `integrity` mode blocks that helper. Secure Boot commonly enables such lockdown.

Check the host mode:

```bash
cat /sys/kernel/security/lockdown
```

On affected kernels, if the file reports anything other than `[none]`, Beyla's Go memory-write propagation cannot operate. Mount `/sys/kernel/security` into the Beyla container so it can detect the real host setting.

For workloads that cross TLS terminators or use unsupported generic protocols, let an OpenTelemetry SDK or language agent inject standard headers inside the application. Beyla will honor a header the application already supplied.

## Meet the DaemonSet requirements for network propagation

When using Beyla's generic network propagation in a DaemonSet, do not only change `context_propagation`. In addition to Beyla's normal application-instrumentation privileges, use these supported settings:

- `hostPID: true` so Beyla can discover host workloads;
- `hostNetwork: true`, with `dnsPolicy: ClusterFirstWithHostNet` when the Pod must resolve Kubernetes Service names;
- host `/sys/fs/cgroup` mounted at the same path;
- host `/sys/kernel/tracing` mounted at the same path;
- `NET_ADMIN` for HTTP-header and TCP-option injection;
- `SYS_ADMIN` for Go library-level injection and, where socket backfill is supported, for entering target network namespaces.

If Beyla cannot access a usable cgroup v2 hierarchy, socket tracking can be incomplete because Beyla uses it to observe newly created sockets.

## Test with a known trace ID

Replace the example hostname with your frontend URL, then send one diagnostic request with a valid sampled W3C header:

```bash
TRACE_ID=11111111111111111111111111111111
curl -H "traceparent: 00-${TRACE_ID}-2222222222222222-01" \
  https://frontend.example.com/test-checkout
```

Then search Tempo for `11111111111111111111111111111111`. For a request path that makes one downstream call, inspect the frontend server span, its client span, and the downstream server span. All should share the trace ID; parent span IDs should form the expected chain.

Use a fresh valid trace ID if you repeat the test so separate requests are not merged under the same ID.

For a short diagnostic window, set Beyla's root `trace_printer: text` and compare its output at each node. Disable the printer afterward because stdout is not a durable trace backend and high-volume output has a cost.

## Isolate the broken hop

If the trace still has one span, verify each boundary:

1. Does the first service's server span use the injected trace ID? If not, inbound tracking may be missing, or an intermediary or security boundary dropped or restarted the context.
2. Does the first service emit a client span? If not, that library or protocol may not be covered.
3. For header or library-level propagation, does the downstream request contain `traceparent` before encryption? For TCP-option propagation, are both endpoints instrumented by Beyla with no L7 terminator between them? Application or proxy access logs can help with header mode if they safely expose only header presence, not unrelated sensitive headers.
4. Does the downstream server span use the same trace ID? If not, its instrumentation did not recover the propagated context.
5. Does the collector export all relevant spans, and does sampling keep them? Parent-based sampling should preserve the upstream decision; inconsistent independent ratio sampling can produce partial traces.

Also verify stable, nonempty `service.name` values. They do not join trace IDs, but missing identities make a correct trace hard to interpret and prevent useful service graphs.

## Conclusion

A one-span trace usually means the W3C context broke at one hop. Enable inbound tracking for non-Go services, choose a propagation mode compatible with the actual encryption and protocol path, and meet the extra DaemonSet requirements before using network-level propagation. A fixed trace ID turns the investigation from guesswork into a hop-by-hop test.

## Official Documentation

- [Distributed traces with Beyla](https://grafana.com/docs/beyla/latest/distributed-traces/)
- [Configure Beyla instrumentation and context propagation](https://grafana.com/docs/beyla/latest/configure/controlling-instrumentation/)
- [OpenTelemetry eBPF Instrumentation support matrix](https://github.com/open-telemetry/opentelemetry-ebpf-instrumentation/blob/main/SUPPORT_MATRIX.md)
- [W3C Trace Context specification](https://www.w3.org/TR/trace-context/)
- [OpenTelemetry context propagation](https://opentelemetry.io/docs/concepts/context-propagation/)
