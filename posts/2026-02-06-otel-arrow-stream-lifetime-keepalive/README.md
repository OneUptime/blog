# How to Tune OTel Arrow Stream Lifetime and Keepalive Settings for Optimal

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTel Arrow, Stream, Load Balancing

Description: Tune OTel Arrow stream lifetime and keepalive settings to balance compression efficiency with load distribution.

OTel Arrow achieves its compression efficiency by maintaining long-lived gRPC streams between exporters and receivers. The longer a stream lives, the better the dictionary encoding gets, because the Arrow encoder learns the recurring patterns in your telemetry data. But long-lived streams create a problem for load balancing: if a stream stays pinned to one receiver instance for hours, new receiver instances never get any traffic. Tuning stream lifetime and keepalive settings is about finding the right balance.

## How Arrow Streams Build Compression State

When an OTel Arrow stream starts, the encoder begins with an empty dictionary. As telemetry batches flow through, the encoder adds new string values to the dictionary. Common values like `service.name`, `http.method`, and `http.status_code` get dictionary-encoded early, and subsequent batches reference the dictionary entries instead of sending the full strings.

After a few batches, the dictionary stabilizes. Most new batches reference existing dictionary entries and rarely add new ones. This is when compression is at its best.

If you restart the stream too frequently, the encoder has to rebuild the dictionary from scratch each time, losing the compression benefit during the warmup period.

## Stream Lifetime Configuration

The `max_stream_lifetime` setting controls how long a single Arrow stream stays open before the exporter closes it and opens a new one:

```yaml
exporters:
  otelarrow:
    endpoint: gateway:4317
    arrow:
      num_streams: 4
      # How long each stream stays open
      max_stream_lifetime: 30s
```

- **Short lifetime (30-60 seconds)**: Good for load balancing. Streams redistribute frequently, and this matches the current exporter default. The OpenTelemetry Arrow exporter documentation notes that most compression benefit is reached quickly.
- **Medium lifetime (2-10 minutes)**: Useful when the receiver or an intermediate gRPC proxy has a longer connection-age grace window and you want fewer stream restarts.
- **Long lifetime (10+ minutes)**: Can reduce stream churn, but load balancing becomes coarse-grained and the stream must still end before the receiver or proxy forcibly closes the connection.

For most deployments, start with the default 30-second stream lifetime and increase it only after measuring compression, retry behavior, and backend load distribution.

## Keepalive Settings

gRPC keepalive settings prevent idle streams from being silently dropped by intermediate load balancers or firewalls. This is separate from stream lifetime.

```yaml
exporters:
  otelarrow:
    endpoint: gateway:4317
    arrow:
      num_streams: 4
      max_stream_lifetime: 30s
    # gRPC keepalive settings
    keepalive:
      time: 60s        # Send keepalive ping every 60s
      timeout: 10s      # Wait 10s for a response before considering the stream dead
      permit_without_stream: true  # Send keepalives even when no streams are active
```

On the receiver side, configure matching settings:

```yaml
receivers:
  otelarrow:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        keepalive:
          server_parameters:
            time: 60s
            timeout: 10s
            max_connection_idle: 120s
            max_connection_age: 1m
            max_connection_age_grace: 1m
          enforcement_policy:
            min_time: 60s
            permit_without_stream: true
```

Key settings explained:

- `max_connection_idle`: Close the connection if no streams have been active for this long. Set this higher than your batch interval.
- `max_connection_age`: Force-close the connection after this duration regardless of activity. This provides a server-side backup for stream recycling.
- `max_connection_age_grace`: Grace period after `max_connection_age` to allow in-flight RPCs to complete.

## Interaction Between Stream Lifetime and Connection Age

There are two levels of lifetime management:

1. **Stream lifetime** (`max_stream_lifetime`): The Arrow stream within a gRPC connection. When it expires, the exporter cleanly ends the stream and starts a new one.
2. **Connection age and grace** (`max_connection_age` and `max_connection_age_grace`): The gRPC connection itself. After the connection reaches its maximum age, gRPC allows existing RPCs to continue only during the grace period before the connection is closed.

Set `max_stream_lifetime` to be slightly less than the receiver's `max_connection_age_grace` setting, minus the export timeout. This lets the exporter close Arrow streams cleanly before gRPC connection management forcibly terminates them.

```yaml
# Good configuration:

exporters:
  otelarrow:
    timeout: 10s
    arrow:
      max_stream_lifetime: 30s

receivers:
  otelarrow:
    protocols:
      grpc:
        keepalive:
          server_parameters:
            max_connection_age: 1m
            max_connection_age_grace: 1m
```

## Load Balancing Considerations

If you are using an L4 load balancer (TCP-level), connections are distributed at connection time. Once established, a connection stays on the same backend. This means stream lifetime alone will not necessarily redistribute traffic; connection recycling or exporter-side gRPC balancing is what gives new backend instances a chance to receive traffic.

If you are using an L7 load balancer that understands gRPC (like Envoy), each new stream can potentially be routed to a different backend. In this case, shorter stream lifetimes give finer-grained load balancing without waiting for the entire connection to recycle.

```yaml
# Behind an L7 gRPC-aware load balancer
arrow:
  num_streams: 4
  max_stream_lifetime: 30s  # Shorter is fine because L7 balances per-stream
```

```yaml
# Behind an L4 TCP load balancer
keepalive:
  server_parameters:
    max_connection_age: 1m  # Connection recycling gives the L4 load balancer a chance to rebalance
    max_connection_age_grace: 1m
```

## Monitoring Stream Behavior

Check these metrics to verify your tuning:

```promql
# Compression ratio derived from documented exporter byte counters
sum(rate(otelcol_exporter_sent[5m]))
/
sum(rate(otelcol_exporter_sent_wire[5m]))

# Receiver-side admission pressure
otelcol_otelarrow_admission_in_flight_bytes
otelcol_otelarrow_admission_waiting_bytes
```

If compression drops or admission pressure rises after changing stream lifetime, streams may be cycling too often or the receiver may be under memory pressure. If exporter logs show streams ending with gRPC errors instead of clean `OK` status, check the receiver and proxy connection-age settings and make sure `max_stream_lifetime` is shorter than the available grace window.

The goal is to keep streams alive long enough to get the Arrow compression benefit while recycling them often enough that load stays evenly distributed across your receiver fleet.
