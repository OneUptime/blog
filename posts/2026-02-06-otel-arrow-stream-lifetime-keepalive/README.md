# How to Tune OTel Arrow Stream Lifetime and Keepalive Settings for Optimal Compression and Load Balancing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTel Arrow, Streams, Load Balancing

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
      max_stream_lifetime: 10m
```

- **Short lifetime (1-2 minutes)**: Good for load balancing. Streams redistribute frequently. But compression suffers because dictionaries are rebuilt often.
- **Medium lifetime (5-15 minutes)**: Good balance. Dictionaries stabilize within the first 30-60 seconds, so most of the stream's life is spent in the optimal compression state.
- **Long lifetime (30+ minutes)**: Best compression. But load balancing becomes very coarse-grained.

For most deployments, 5-15 minutes is the sweet spot.

## Keepalive Settings

gRPC keepalive settings prevent idle streams from being silently dropped by intermediate load balancers or firewalls. This is separate from stream lifetime.

```yaml
exporters:
  otelarrow:
    endpoint: gateway:4317
    arrow:
      num_streams: 4
      max_stream_lifetime: 10m
    # gRPC keepalive settings
    keepalive:
      time: 30s        # Send keepalive ping every 30s
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
            time: 30s
            timeout: 10s
            max_connection_idle: 120s
            max_connection_age: 600s
            max_connection_age_grace: 30s
          enforcement_policy:
            min_time: 10s
            permit_without_stream: true
```

Key settings explained:

- `max_connection_idle`: Close the connection if no streams have been active for this long. Set this higher than your batch interval.
- `max_connection_age`: Force-close the connection after this duration regardless of activity. This provides a server-side backup for stream recycling.
- `max_connection_age_grace`: Grace period after `max_connection_age` to allow in-flight RPCs to complete.

## Interaction Between Stream Lifetime and Connection Age

There are two levels of lifetime management:

1. **Stream lifetime** (`max_stream_lifetime`): The Arrow stream within a gRPC connection. When it expires, the exporter starts a new stream, potentially on a new connection.
2. **Connection age** (`max_connection_age`): The gRPC connection itself. When it expires, all streams on that connection are closed.

Set `max_connection_age` to be at least 2x `max_stream_lifetime` so that streams can complete their full lifetime without being interrupted by connection-level recycling.

```yaml
# Good configuration:
# Stream lifetime: 10 minutes
# Connection age: 30 minutes
# This allows 2-3 stream cycles per connection
arrow:
  max_stream_lifetime: 10m
keepalive:
  server_parameters:
    max_connection_age: 30m
    max_connection_age_grace: 30s
```

## Load Balancing Considerations

If you are using an L4 load balancer (TCP-level), connections are distributed at connection time. Once established, a connection stays on the same backend. This means stream lifetime is your primary tool for redistribution.

If you are using an L7 load balancer that understands gRPC (like Envoy), each new stream can potentially be routed to a different backend. In this case, shorter stream lifetimes give finer-grained load balancing without waiting for the entire connection to recycle.

```yaml
# Behind an L7 gRPC-aware load balancer
arrow:
  num_streams: 4
  max_stream_lifetime: 5m  # Shorter is fine because L7 balances per-stream
```

```yaml
# Behind an L4 TCP load balancer
arrow:
  num_streams: 4
  max_stream_lifetime: 10m  # Longer since redistribution only happens on reconnect
```

## Monitoring Stream Behavior

Check these metrics to verify your tuning:

```promql
# Average stream lifetime (should be close to your configured max)
histogram_quantile(0.5,
  rate(otelcol_exporter_otelarrow_stream_lifetime_seconds_bucket[5m])
)

# Stream reconnection rate
rate(otelcol_exporter_otelarrow_stream_reconnections_total[5m])

# Compression ratio (higher is better)
otelcol_exporter_otelarrow_compression_ratio
```

If the average stream lifetime is significantly shorter than your configured maximum, streams are being terminated prematurely, possibly by network issues or load balancer timeouts. Increase the keepalive frequency or check your load balancer's idle timeout settings.

The goal is to keep streams alive long enough for the Arrow dictionary to stabilize (usually 30-60 seconds) while recycling them often enough that load stays evenly distributed across your receiver fleet.
