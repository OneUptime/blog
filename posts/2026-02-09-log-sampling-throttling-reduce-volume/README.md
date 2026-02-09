# How to Configure Log Sampling and Throttling to Reduce Kubernetes Log Volume

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Logging, Performance

Description: Learn effective strategies for implementing log sampling and throttling to reduce log volume in Kubernetes while maintaining observability and keeping costs under control.

---

Log volume in Kubernetes environments can grow exponentially, leading to high storage costs, overwhelmed logging infrastructure, and difficulty finding relevant information. Not all logs are equally valuable, and collecting every single log line often provides diminishing returns. Strategic log sampling and throttling can reduce log volume by 70-90% while preserving the ability to diagnose issues.

This guide covers practical techniques for implementing log sampling and throttling in Kubernetes logging pipelines without sacrificing observability.

## Understanding Log Sampling vs Throttling

**Sampling** selectively collects a representative subset of logs based on statistical criteria. For example, collecting 10% of successful requests but 100% of errors.

**Throttling** limits the rate of log collection, typically measured in logs per second or bytes per second. Once the limit is reached, additional logs are dropped or buffered.

Both techniques reduce log volume, but they serve different purposes:

- Use sampling when you want statistical representation
- Use throttling when you need to protect infrastructure from log floods

## Implementing Sampling in Fluent Bit

Fluent Bit supports sampling through the `nest` and `grep` filters. Here's a configuration that samples different log levels at different rates:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-sampling-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush           5
        Daemon          off
        Log_Level       info

    [INPUT]
        Name              tail
        Path              /var/log/containers/*.log
        Parser            docker
        Tag               kube.*
        Refresh_Interval  5
        Mem_Buf_Limit     5MB

    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
        Merge_Log           On

    # Parse JSON logs to extract level
    [FILTER]
        Name          parser
        Match         kube.*
        Key_Name      log
        Parser        json
        Reserve_Data  On

    # Add sampling decision based on log level
    [FILTER]
        Name    lua
        Match   kube.*
        script  /fluent-bit/scripts/sampling.lua
        call    sample_logs

    # Drop logs marked for sampling
    [FILTER]
        Name    grep
        Match   kube.*
        Exclude sampled_out true

    [OUTPUT]
        Name            loki
        Match           kube.*
        Host            loki.logging.svc.cluster.local
        Port            3100
        Labels          job=kubernetes

  sampling.lua: |
    function sample_logs(tag, timestamp, record)
        local level = record["level"] or record["severity"] or "info"
        local random = math.random()

        -- Sample rates by log level
        local sample_rates = {
            error = 1.0,    -- Keep all errors
            warn = 0.5,     -- Keep 50% of warnings
            info = 0.1,     -- Keep 10% of info logs
            debug = 0.01    -- Keep 1% of debug logs
        }

        local rate = sample_rates[level:lower()] or 0.1

        -- Mark for dropping if random value exceeds sample rate
        if random > rate then
            record["sampled_out"] = true
        else
            record["sample_rate"] = rate
        end

        return 2, timestamp, record
    end
```

## Content-Based Sampling

Sample logs based on their content, not just level. This allows you to keep all interesting logs while dropping repetitive ones:

```lua
-- content-sampling.lua
function smart_sample(tag, timestamp, record)
    local message = record["log"] or record["message"] or ""
    local random = math.random()

    -- Always keep certain patterns
    local always_keep = {
        "error",
        "exception",
        "failed",
        "timeout",
        "refused",
        "panic"
    }

    for _, pattern in ipairs(always_keep) do
        if string.match(message:lower(), pattern) then
            record["sample_rate"] = 1.0
            return 2, timestamp, record
        end
    end

    -- Drop noisy patterns aggressively
    local noise_patterns = {
        "health check",
        "heartbeat",
        "keepalive",
        "ping",
        "/metrics",
        "/health"
    }

    for _, pattern in ipairs(noise_patterns) do
        if string.match(message:lower(), pattern) then
            if random > 0.01 then  -- Keep only 1%
                record["sampled_out"] = true
                return 2, timestamp, record
            end
        end
    end

    -- Default sampling for normal logs
    if random > 0.2 then  -- Keep 20%
        record["sampled_out"] = true
    else
        record["sample_rate"] = 0.2
    end

    return 2, timestamp, record
end
```

## Rate-Based Throttling in Vector

Vector provides built-in throttling capabilities through its `throttle` transform:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vector-config
  namespace: logging
data:
  vector.toml: |
    [sources.kubernetes_logs]
    type = "kubernetes_logs"

    # Throttle by namespace
    [transforms.throttle_by_namespace]
    type = "throttle"
    inputs = ["kubernetes_logs"]
    threshold = 1000  # events per second
    window_secs = 1
    key_field = "kubernetes.namespace_name"

    # Separate throttling for high-volume namespaces
    [transforms.route_by_volume]
    type = "route"
    inputs = ["throttle_by_namespace"]

    [transforms.route_by_volume.route.high_volume]
    type = "vrl"
    source = '''
      .kubernetes.namespace_name == "production" ||
      .kubernetes.namespace_name == "staging"
    '''

    [transforms.route_by_volume.route.low_volume]
    type = "vrl"
    source = "true"

    # Aggressive throttling for high-volume namespaces
    [transforms.throttle_high_volume]
    type = "throttle"
    inputs = ["route_by_volume.high_volume"]
    threshold = 5000
    window_secs = 1
    key_field = "kubernetes.pod_name"

    # Lenient throttling for low-volume namespaces
    [transforms.throttle_low_volume]
    type = "throttle"
    inputs = ["route_by_volume.low_volume"]
    threshold = 100
    window_secs = 1

    [sinks.loki]
    type = "loki"
    inputs = ["throttle_high_volume", "throttle_low_volume"]
    endpoint = "http://loki:3100"
    encoding.codec = "json"
    labels.job = "kubernetes"
```

## Implementing Adaptive Sampling

Adaptive sampling adjusts sampling rates based on system load:

```yaml
# fluent-bit-adaptive.conf
[FILTER]
    Name    lua
    Match   kube.*
    script  /fluent-bit/scripts/adaptive-sampling.lua
    call    adaptive_sample
```

```lua
-- adaptive-sampling.lua
local current_load = 0.1  -- Initial sample rate

function get_system_load()
    -- In practice, fetch from metrics or environment
    -- This is a simplified example
    return tonumber(os.getenv("LOG_SYSTEM_LOAD") or "0.5")
end

function adaptive_sample(tag, timestamp, record)
    local system_load = get_system_load()

    -- Adjust sampling based on system load
    -- Higher load = more aggressive sampling
    local base_rate = 0.5
    if system_load > 0.8 then
        base_rate = 0.1  -- High load: keep only 10%
    elseif system_load > 0.5 then
        base_rate = 0.3  -- Medium load: keep 30%
    else
        base_rate = 0.8  -- Low load: keep 80%
    end

    -- Adjust based on log level
    local level = record["level"] or "info"
    local level_multipliers = {
        error = 1.0,
        warn = 0.8,
        info = 0.5,
        debug = 0.2
    }

    local final_rate = base_rate * (level_multipliers[level:lower()] or 0.5)

    if math.random() > final_rate then
        record["sampled_out"] = true
    else
        record["sample_rate"] = final_rate
        record["system_load"] = system_load
    end

    return 2, timestamp, record
end
```

## Namespace-Based Sampling Policies

Apply different sampling policies to different namespaces:

```yaml
[FILTER]
    Name    lua
    Match   kube.*
    script  /fluent-bit/scripts/namespace-sampling.lua
    call    namespace_sample
```

```lua
-- namespace-sampling.lua
function namespace_sample(tag, timestamp, record)
    local namespace = record["kubernetes"]["namespace_name"] or "default"

    -- Define sampling policies by namespace
    local namespace_policies = {
        ["production"] = {
            error = 1.0,
            warn = 0.8,
            info = 0.2,
            debug = 0.01
        },
        ["staging"] = {
            error = 1.0,
            warn = 0.5,
            info = 0.1,
            debug = 0.01
        },
        ["development"] = {
            error = 1.0,
            warn = 1.0,
            info = 0.5,
            debug = 0.1
        },
        ["default"] = {
            error = 1.0,
            warn = 0.3,
            info = 0.05,
            debug = 0.01
        }
    }

    local policy = namespace_policies[namespace] or namespace_policies["default"]
    local level = (record["level"] or "info"):lower()
    local sample_rate = policy[level] or 0.1

    if math.random() > sample_rate then
        record["sampled_out"] = true
    else
        record["sample_rate"] = sample_rate
        record["sampling_policy"] = namespace
    end

    return 2, timestamp, record
end
```

## Throttling with Token Bucket Algorithm

Implement sophisticated rate limiting using a token bucket:

```yaml
[FILTER]
    Name    lua
    Match   kube.*
    script  /fluent-bit/scripts/token-bucket.lua
    call    token_bucket_throttle
```

```lua
-- token-bucket.lua
local buckets = {}

function token_bucket_throttle(tag, timestamp, record)
    local key = record["kubernetes"]["pod_name"] or "default"
    local now = os.time()

    -- Bucket configuration
    local capacity = 100      -- Maximum burst
    local refill_rate = 10    -- Tokens per second

    -- Initialize bucket if needed
    if not buckets[key] then
        buckets[key] = {
            tokens = capacity,
            last_refill = now
        }
    end

    local bucket = buckets[key]

    -- Refill tokens based on elapsed time
    local elapsed = now - bucket.last_refill
    local new_tokens = elapsed * refill_rate
    bucket.tokens = math.min(capacity, bucket.tokens + new_tokens)
    bucket.last_refill = now

    -- Check if we have tokens available
    if bucket.tokens >= 1 then
        bucket.tokens = bucket.tokens - 1
        record["throttle_tokens_remaining"] = bucket.tokens
        return 2, timestamp, record
    else
        -- No tokens: drop the log
        record["sampled_out"] = true
        record["throttle_reason"] = "rate_limit_exceeded"
        return 2, timestamp, record
    end
end
```

## Monitoring Sampling Effectiveness

Track sampling statistics to ensure you're not losing critical logs:

```yaml
# Add sampling metrics to logs
[FILTER]
    Name    lua
    Match   kube.*
    script  /fluent-bit/scripts/sampling-metrics.lua
    call    track_sampling

[OUTPUT]
    Name            prometheus_exporter
    Match           sampling.metrics
    Host            0.0.0.0
    Port            9090
```

```lua
-- sampling-metrics.lua
local stats = {
    total = 0,
    sampled_in = 0,
    sampled_out = 0,
    by_level = {}
}

function track_sampling(tag, timestamp, record)
    stats.total = stats.total + 1

    local level = record["level"] or "unknown"
    stats.by_level[level] = (stats.by_level[level] or 0) + 1

    if record["sampled_out"] then
        stats.sampled_out = stats.sampled_out + 1
    else
        stats.sampled_in = stats.sampled_in + 1
    end

    -- Periodically output metrics
    if stats.total % 1000 == 0 then
        local metrics = {
            timestamp = os.time(),
            total_logs = stats.total,
            kept_logs = stats.sampled_in,
            dropped_logs = stats.sampled_out,
            sample_rate = stats.sampled_in / stats.total,
            by_level = stats.by_level
        }

        -- Output metrics as a separate log stream
        return 2, timestamp, metrics
    end

    return 2, timestamp, record
end
```

## Query Compensation for Sampled Data

When querying sampled data, compensate for the sampling rate:

```logql
# Count requests accounting for sampling
sum(
  count_over_time({namespace="production"} [5m])
  * on() group_left() (1 / avg(sample_rate))
)

# Estimate error rate from sampled data
sum(rate({namespace="production", level="error"} [5m]))
  /
sum(rate({namespace="production"} [5m]))
  * avg(sample_rate)
```

## Best Practices for Log Sampling

1. **Never sample errors**: Always keep 100% of error logs
2. **Document sampling rates**: Include sampling metadata in logs
3. **Monitor sampling effectiveness**: Track what percentage of logs are dropped
4. **Test before production**: Verify sampling doesn't hide critical issues
5. **Use consistent hash for sampling**: Ensure related logs are sampled together
6. **Provide sampling override**: Allow disabling sampling for debugging

## Handling Sampling in Alerting

Adjust alert thresholds for sampled data:

```yaml
# Alert accounting for 10% sampling rate
- alert: HighErrorRate
  expr: |
    (
      sum(rate({namespace="production", level="error"} [5m]))
      /
      (sum(rate({namespace="production"} [5m])) * 0.1)
    ) > 0.01
  annotations:
    description: "Error rate exceeds 1% (compensated for sampling)"
```

## Conclusion

Log sampling and throttling are essential techniques for managing log volume in Kubernetes at scale. By implementing intelligent sampling strategies that preserve critical logs while dropping repetitive or low-value entries, you can reduce costs and improve logging system performance without sacrificing observability. Start with conservative sampling rates, monitor the impact carefully, and adjust based on your specific needs. Remember that sampling is a tool for managing volume, not a substitute for good logging practices at the application level.
