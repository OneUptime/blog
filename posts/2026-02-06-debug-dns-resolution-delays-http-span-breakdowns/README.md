# How to Debug DNS Resolution Delays Using OpenTelemetry HTTP Client Span Breakdowns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, DNS, HTTP Client, Network Debugging, Latency

Description: Identify DNS resolution delays hidden inside HTTP client spans by breaking down connection phases with OpenTelemetry instrumentation.

Your HTTP client span says the request took 3 seconds, but the server processed it in 50ms. Where did the other 2.95 seconds go? Often, the answer is DNS resolution. DNS lookups are invisible in most instrumentation because they happen inside the HTTP client library before the actual connection starts. By breaking down HTTP client spans into their constituent phases, you can expose DNS as the bottleneck.

## The Hidden Phases of an HTTP Request

An HTTP request goes through several phases: DNS resolution, TCP connection, TLS handshake (for HTTPS), request sending, server processing, and response reading. Standard OpenTelemetry HTTP client instrumentation typically creates a single span covering all of these. To debug DNS issues, you need to break this into sub-spans.

## Instrumenting HTTP Connection Phases in Python

Here is how to instrument the individual phases using Python's lower-level HTTP machinery:

```python
import socket
import ssl
import time
from opentelemetry import trace

tracer = trace.get_tracer("http-phase-debugger")

def instrumented_http_request(url, method="GET", headers=None, body=None):
    """
    Make an HTTP request with sub-spans for each connection phase.
    """
    from urllib.parse import urlparse
    parsed = urlparse(url)
    host = parsed.hostname
    port = parsed.port or (443 if parsed.scheme == "https" else 80)

    with tracer.start_as_current_span("http.request") as parent_span:
        parent_span.set_attribute("http.method", method)
        parent_span.set_attribute("http.url", url)
        parent_span.set_attribute("server.address", host)

        # Phase 1: DNS Resolution
        with tracer.start_as_current_span("http.dns_resolve") as dns_span:
            dns_span.set_attribute("dns.hostname", host)
            dns_start = time.monotonic()

            try:
                addr_info = socket.getaddrinfo(host, port, socket.AF_UNSPEC)
                resolved_ip = addr_info[0][4][0]
                dns_span.set_attribute("dns.resolved_ip", resolved_ip)
                dns_span.set_attribute("dns.record_count", len(addr_info))
            except socket.gaierror as e:
                dns_span.set_attribute("error", True)
                dns_span.set_attribute("dns.error", str(e))
                raise

            dns_ms = (time.monotonic() - dns_start) * 1000
            dns_span.set_attribute("dns.resolution_time_ms", dns_ms)

        # Phase 2: TCP Connection
        with tracer.start_as_current_span("http.tcp_connect") as tcp_span:
            tcp_span.set_attribute("net.peer.ip", resolved_ip)
            tcp_span.set_attribute("net.peer.port", port)

            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(10)
            tcp_start = time.monotonic()
            sock.connect((resolved_ip, port))
            tcp_ms = (time.monotonic() - tcp_start) * 1000
            tcp_span.set_attribute("tcp.connect_time_ms", tcp_ms)

        # Phase 3: TLS Handshake (if HTTPS)
        if parsed.scheme == "https":
            with tracer.start_as_current_span("http.tls_handshake") as tls_span:
                tls_start = time.monotonic()
                context = ssl.create_default_context()
                sock = context.wrap_socket(sock, server_hostname=host)
                tls_ms = (time.monotonic() - tls_start) * 1000
                tls_span.set_attribute("tls.handshake_time_ms", tls_ms)
                tls_span.set_attribute("tls.protocol", sock.version())

        # Phase 4: Send request and receive response
        with tracer.start_as_current_span("http.roundtrip") as rt_span:
            request_line = f"{method} {parsed.path or '/'} HTTP/1.1\r\n"
            request_headers = f"Host: {host}\r\nConnection: close\r\n\r\n"
            sock.sendall((request_line + request_headers).encode())

            response = b""
            while True:
                chunk = sock.recv(4096)
                if not chunk:
                    break
                response += chunk

            rt_span.set_attribute("http.response_size", len(response))

        sock.close()
        return response
```

## Detecting DNS as the Bottleneck

Once you have phase-level spans, you can query for traces where DNS resolution is the dominant time cost:

```python
def find_dns_bottlenecks(traces, threshold_ms=500):
    """
    Find HTTP requests where DNS resolution accounts for
    more than the given threshold.
    """
    bottlenecks = []

    for trace_data in traces:
        for span in trace_data["spans"]:
            if span["name"] != "http.dns_resolve":
                continue

            dns_time = span.get("attributes", {}).get("dns.resolution_time_ms", 0)

            if dns_time > threshold_ms:
                # Find the parent HTTP span for context
                parent_id = span.get("parentSpanId")
                parent = next(
                    (s for s in trace_data["spans"] if s["spanId"] == parent_id),
                    None,
                )

                bottlenecks.append({
                    "hostname": span["attributes"].get("dns.hostname"),
                    "dns_time_ms": round(dns_time, 2),
                    "total_request_ms": (
                        (parent["endTime"] - parent["startTime"]) / 1_000_000
                        if parent else None
                    ),
                    "resolved_ip": span["attributes"].get("dns.resolved_ip"),
                    "trace_id": span["traceId"],
                })

    bottlenecks.sort(key=lambda x: x["dns_time_ms"], reverse=True)
    return bottlenecks
```

## Common DNS Issues and Their Trace Signatures

**Slow external DNS resolver**: All DNS spans are slow regardless of hostname. Fix by switching to a faster resolver or running a local cache like `dnsmasq` or CoreDNS.

**Missing DNS cache**: The same hostname gets resolved on every request. You will see many `http.dns_resolve` spans for the same hostname in quick succession. Fix by enabling DNS caching in your HTTP client or at the OS level.

**DNS record with low TTL**: After the TTL expires, the next request pays the full resolution cost. You will see periodic DNS span spikes every N seconds matching the TTL value.

**Search domain misconfiguration in Kubernetes**: A request to `api.example.com` tries `api.example.com.default.svc.cluster.local` first, then `api.example.com.svc.cluster.local`, and so on. Each failed attempt adds latency. You will see DNS resolution times of 4-5x normal because of the search domain walk.

```yaml
# Kubernetes fix: add ndots configuration to your pod spec
spec:
  dnsConfig:
    options:
      - name: ndots
        value: "2"
```

## Monitoring DNS Health Metrics

Export DNS resolution times as histogram metrics for ongoing monitoring:

```python
dns_histogram = meter.create_histogram(
    name="http.dns.resolution.duration",
    description="Time spent resolving DNS",
    unit="ms",
)

# Record after each resolution
dns_histogram.record(dns_ms, attributes={
    "dns.hostname": host,
    "dns.resolved": str(not error),
    "service.name": "my-service",
})
```

## Summary

DNS resolution delays hide inside HTTP client spans unless you break them out. By instrumenting DNS, TCP, TLS, and roundtrip as separate sub-spans, you make the invisible visible. Query for traces where DNS time exceeds your threshold, group by hostname to find patterns, and check for common issues like missing caches, low TTLs, or Kubernetes ndots misconfiguration. The fix is usually a configuration change, but finding the problem requires the right instrumentation.
