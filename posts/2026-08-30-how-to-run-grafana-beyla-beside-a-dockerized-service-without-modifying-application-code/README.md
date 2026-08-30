# How to Run Grafana Beyla Beside a Dockerized Service Without Modifying Application Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, eBPF, Docker, Auto-Instrumentation, OpenTelemetry, Tracing, Linux

Description: Share a Docker service's PID namespace with Grafana Beyla, target its internal port, and export zero-code telemetry to an OTLP receiver.

---

Grafana Beyla can instrument a Linux service in another Docker container without adding an SDK or changing application source. The Beyla container must share the target container's PID namespace and have enough kernel privilege to load the eBPF programs needed by the selected instrumentation.

For a single service, this "beside" pattern is narrower than host-wide process discovery:

```text
application container <- shared PID namespace -> Beyla container
                                               -> OTLP collector/backend
```

Sharing a PID namespace exposes processes, not network ports. Configure Beyla with the port **inside** the application container, even when Docker publishes a different host port.

## Start with a two-service Compose file

The following uses Grafana's documented `goblog` demonstration service, which listens on HTTPS port `8443` inside its container, and prints observed traces for an initial local proof:

```yaml
services:
  api:
    image: mariomac/goblog:dev
    ports:
      - "18443:8443"

  beyla:
    image: grafana/beyla:latest
    pid: "service:api"
    privileged: true
    depends_on:
      - api
    environment:
      BEYLA_OPEN_PORT: "8443"
      BEYLA_TRACE_PRINTER: "text"
```

Use your own application image in production and replace both image tags with reviewed immutable versions or digests. `pid: "service:api"` is the Compose form of Docker's `--pid="container:<name>"`: Beyla sees the application's process namespace. `BEYLA_OPEN_PORT` is `8443`, not published host port `18443`.

Start the stack and generate requests:

```bash
docker compose up -d
curl --insecure https://localhost:18443/
docker compose logs --follow beyla
```

Local trace printing proves discovery and instrumentation. It does not prove the collector or backend pipeline, and verbose payloads should not remain enabled in production logs.

To export instead, point Beyla at an OTLP/HTTP receiver reachable on the Compose network:

```yaml
environment:
  BEYLA_OPEN_PORT: "8443"
  OTEL_EXPORTER_OTLP_ENDPOINT: "http://alloy:4318"
```

If the collector is outside Compose, give Beyla a resolvable, reachable address from its own container network. `localhost` inside the Beyla container means Beyla itself, not the Docker host and not another container.

## Use the same pattern with Docker CLI

Grafana's official Docker guide shows the equivalent relationship:

```bash
docker run --rm \
  --pid="container:api" \
  --privileged \
  -e BEYLA_OPEN_PORT=8443 \
  -e BEYLA_TRACE_PRINTER=text \
  grafana/beyla:latest
```

The target container must already exist and be named `api`. Do not add `--network host` merely to make process discovery work; select network mode based on how Beyla reaches its OTLP destination and on any network-observability features you intentionally enable.

## Prefer a configuration file as the setup grows

Environment variables are concise for one port. A mounted Beyla YAML file is easier to review when adding export, routes, attributes, or more precise discovery:

```yaml
discovery:
  instrument:
    - open_ports: 8443

routes:
  unmatched: heuristic
```

Mount it read-only and point `BEYLA_CONFIG_PATH` to it:

```yaml
  beyla:
    image: grafana/beyla:latest
    pid: "service:api"
    privileged: true
    volumes:
      - ./beyla-config.yml:/config/beyla-config.yml:ro
    environment:
      BEYLA_CONFIG_PATH: /config/beyla-config.yml
      OTEL_EXPORTER_OTLP_ENDPOINT: http://alloy:4318
```

Validate field names against the documentation matching the deployed Beyla version. Standalone Beyla YAML and Grafana Alloy's River-style `beyla.ebpf` component configuration are not interchangeable.

Route configuration matters because zero-code instrumentation sees raw request paths. A path such as `/orders/6f2c...` should be represented by a stable route like `/orders/{id}` before it becomes a metric label or trace search dimension.

## Know what zero-code does and does not mean

Beyla observes supported application and network behavior from outside the process, so application source and image do not need an OpenTelemetry SDK for the supported HTTP/gRPC instrumentation. That does not guarantee full business tracing:

- unsupported protocols or runtime/library combinations may produce no spans;
- encrypted application traffic may limit what a network-level probe can decode, depending on language-level support;
- business operations inside a handler need manual spans or SDK instrumentation if they matter;
- cross-service parent/child traces require context to be observed or propagated; and
- the target must receive real requests after Beyla attaches.

Use Beyla for service-level RED telemetry and zero-code entry points. Add SDK instrumentation where domain events, custom attributes, messaging semantics, or precise internal spans justify it.

## Reduce privilege deliberately

`privileged: true` is the simplest documented Docker setup because it avoids kernel- and feature-specific capability debugging. It also grants broad host access. Grafana publishes the capability requirements by Beyla operating mode; application observability commonly needs `BPF`, `PERFMON`, `SYS_PTRACE`, `DAC_READ_SEARCH`, and `CHECKPOINT_RESTORE`, with additional capabilities for network filters, context propagation, library-level uprobes, or older kernels.

Do not copy a minimal `cap_add` list from a different Beyla version or feature set. First pin versions, set `BEYLA_ENFORCE_SYS_CAPS=1`, and verify the required list in logs on the actual host kernel. Then replace privileged mode with the documented capabilities and repeat request, export, restart, and failure tests.

The host must be Linux from Beyla's perspective and allow eBPF operations. Container engines running inside another VM add a kernel boundary; test the exact production engine rather than assuming a laptop result predicts the server.

## Troubleshoot in pipeline order

If no telemetry appears:

1. Confirm the target container is running and the Beyla container really shares its PID namespace with `docker inspect`.
2. Verify `8443` is the internal listening port in this example and generate a supported request.
3. Read Beyla logs for discovery, capability, verifier, and permission errors.
4. Enable `BEYLA_TRACE_PRINTER=text` briefly. If it prints spans, instrumentation works.
5. Resolve and connect to the OTLP endpoint from the Beyla container network.
6. Match OTLP/HTTP versus OTLP/gRPC and verify TLS/authentication headers.
7. Inspect collector failed/sent span metrics and backend ingestion.

Metrics can be exposed or scraped while traces are not exported, so the presence of RED metrics is not evidence that the OTLP trace path is complete.

## Official Documentation

- [Run Beyla as a Docker container](https://grafana.com/docs/beyla/latest/setup/docker/)
- [Beyla setup options](https://grafana.com/docs/beyla/latest/setup/)
- [Beyla service discovery](https://grafana.com/docs/beyla/latest/configure/service-discovery/)
- [Beyla telemetry export](https://grafana.com/docs/beyla/latest/configure/export-data/)
- [Beyla security and capabilities](https://grafana.com/docs/beyla/latest/security/)
- [Docker Compose PID setting](https://docs.docker.com/reference/compose-file/services/#pid)
- [Docker run PID namespace](https://docs.docker.com/reference/cli/docker/container/run/#pid)

## Conclusion

Run Beyla beside one Dockerized service by sharing that service's PID namespace, targeting its internal listener port, and exporting to an endpoint reachable from the Beyla container. Prove local trace generation before debugging OTLP, pin both images, configure low-cardinality routes, and replace privileged mode with a version- and feature-specific capability set only after validating it on the real host kernel.
