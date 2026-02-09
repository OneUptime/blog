# How to Build Log Enrichment Pipelines with Fluent Bit Lua Filters in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fluent Bit, Kubernetes, Logging

Description: Master Fluent Bit Lua filters to build sophisticated log enrichment pipelines that add context, parse custom formats, mask sensitive data, and transform logs before shipping to aggregation systems.

---

Fluent Bit collects logs efficiently, but raw logs often lack context needed for effective analysis. Lua filters in Fluent Bit let you enrich logs with Kubernetes metadata, parse custom formats, redact sensitive information, and transform data before shipping to Loki or Elasticsearch. This guide shows you how to build powerful log processing pipelines using Fluent Bit Lua scripts.

## Understanding Fluent Bit Lua Filters

Lua filters execute custom code on each log record, allowing:

- Adding computed fields and metadata
- Parsing non-standard log formats
- Masking sensitive data like passwords and tokens
- Conditional routing based on content
- Aggregating or splitting log records

Lua provides the flexibility to handle any log processing need.

## Basic Lua Filter Setup

Configure Fluent Bit with a simple Lua filter:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush        5
        Daemon       Off
        Log_Level    info

    [INPUT]
        Name              tail
        Path              /var/log/containers/*.log
        Parser            docker
        Tag               kube.*
        Refresh_Interval  5
        Mem_Buf_Limit     50MB

    [FILTER]
        Name   lua
        Match  kube.*
        script /fluent-bit/scripts/enrich.lua
        call   enrich_record

    [OUTPUT]
        Name  loki
        Match kube.*
        Host  loki.logging.svc.cluster.local
        Port  3100

  enrich.lua: |
    function enrich_record(tag, timestamp, record)
        -- Add timestamp in readable format
        record["timestamp_readable"] = os.date("%Y-%m-%d %H:%M:%S", timestamp)

        -- Add processing metadata
        record["processed_by"] = "fluent-bit"
        record["pipeline_version"] = "1.0"

        -- Return modified record
        -- Code 0 = keep record
        -- Code -1 = drop record
        return 2, timestamp, record
    end
```

Deploy as ConfigMap and mount in Fluent Bit:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      containers:
      - name: fluent-bit
        image: fluent/fluent-bit:2.2
        volumeMounts:
        - name: config
          mountPath: /fluent-bit/etc/
        - name: scripts
          mountPath: /fluent-bit/scripts/
        - name: varlog
          mountPath: /var/log
      volumes:
      - name: config
        configMap:
          name: fluent-bit-config
          items:
          - key: fluent-bit.conf
            path: fluent-bit.conf
      - name: scripts
        configMap:
          name: fluent-bit-config
          items:
          - key: enrich.lua
            path: enrich.lua
      - name: varlog
        hostPath:
          path: /var/log
```

## Parsing Custom Log Formats

Parse application-specific log formats:

```lua
-- parse_custom.lua
function parse_application_logs(tag, timestamp, record)
    local log = record["log"]

    if not log then
        return 2, timestamp, record
    end

    -- Parse custom format: "LEVEL [timestamp] component: message"
    local level, ts, component, message = string.match(
        log,
        "(%u+)%s+%[([^%]]+)%]%s+([^:]+):%s+(.+)"
    )

    if level and component and message then
        record["level"] = level:lower()
        record["component"] = component
        record["message"] = message
        record["original_timestamp"] = ts

        -- Remove raw log field
        record["log"] = nil
    end

    return 2, timestamp, record
end
```

## Adding Kubernetes Metadata

Enrich logs with Kubernetes context:

```lua
-- k8s_enrich.lua
function add_kubernetes_metadata(tag, timestamp, record)
    -- Extract namespace and pod from tag
    -- Tag format: kube.var.log.containers.pod_namespace_container.log
    local namespace, pod, container = string.match(
        tag,
        "kube%.var%.log%.containers%.([^_]+)_([^_]+)_([^%.]+)"
    )

    if namespace and pod and container then
        record["kubernetes"] = {
            namespace = namespace,
            pod_name = pod,
            container_name = container
        }

        -- Add deployment name (assuming pod name format: deployment-xyz)
        local deployment = string.match(pod, "([^%-]+)")
        if deployment then
            record["kubernetes"]["deployment"] = deployment
        end

        -- Add environment label based on namespace
        if string.match(namespace, "prod") then
            record["environment"] = "production"
        elseif string.match(namespace, "stag") then
            record["environment"] = "staging"
        else
            record["environment"] = "development"
        end
    end

    return 2, timestamp, record
end
```

## Sensitive Data Masking

Redact passwords, tokens, and other sensitive information:

```lua
-- mask_sensitive.lua
function mask_sensitive_data(tag, timestamp, record)
    local message = record["message"] or record["log"]

    if not message then
        return 2, timestamp, record
    end

    -- Mask email addresses
    message = string.gsub(message, "([%w%.]+)@([%w%.]+)", function(user, domain)
        return string.sub(user, 1, 2) .. "***@" .. domain
    end)

    -- Mask API keys (format: key_xxxxxxxxxx)
    message = string.gsub(message, "key_[%w]+", "key_***REDACTED***")

    -- Mask passwords in common patterns
    message = string.gsub(message, 'password["\']?%s*[:=]%s*["\']?([^"\'%s,}]+)',
        'password=***REDACTED***')

    -- Mask credit card numbers
    message = string.gsub(message, "%d%d%d%d[%s%-]?%d%d%d%d[%s%-]?%d%d%d%d[%s%-]?%d%d%d%d",
        "****-****-****-****")

    -- Mask bearer tokens
    message = string.gsub(message, "Bearer [%w%-%._]+", "Bearer ***REDACTED***")

    -- Mask AWS secrets
    message = string.gsub(message, "aws_secret_access_key[%s]*=[%s]*[%w%+/]+",
        "aws_secret_access_key=***REDACTED***")

    record["message"] = message
    if record["log"] then
        record["log"] = message
    end

    return 2, timestamp, record
end
```

## Conditional Log Filtering

Drop or route logs based on content:

```lua
-- filter_logs.lua
function filter_logs(tag, timestamp, record)
    local message = record["message"] or record["log"] or ""

    -- Drop debug logs in production
    if record["namespace"] == "production" then
        if record["level"] == "debug" or record["level"] == "trace" then
            return -1, timestamp, record  -- Drop record
        end
    end

    -- Drop health check logs
    if string.match(message, "/health") or string.match(message, "/readiness") then
        return -1, timestamp, record
    end

    -- Drop noisy logs from specific components
    local component = record["component"] or ""
    if component == "gossip" or component == "heartbeat" then
        local level = record["level"] or ""
        if level == "info" or level == "debug" then
            return -1, timestamp, record
        end
    end

    -- Keep all other logs
    return 2, timestamp, record
end
```

## JSON Field Extraction

Extract nested JSON fields:

```lua
-- extract_json.lua
function extract_json_fields(tag, timestamp, record)
    local message = record["log"]

    if not message then
        return 2, timestamp, record
    end

    -- Try to parse as JSON
    local success, data = pcall(function()
        return require("cjson").decode(message)
    end)

    if success and type(data) == "table" then
        -- Extract common fields
        if data.level then
            record["level"] = data.level
        end

        if data.user_id then
            record["user_id"] = data.user_id
        end

        if data.request_id then
            record["request_id"] = data.request_id
        end

        if data.duration_ms then
            record["duration_ms"] = tonumber(data.duration_ms)
        end

        if data.status_code then
            record["status_code"] = tonumber(data.status_code)
        end

        -- Keep original message for searchability
        record["message"] = data.message or data.msg or message
    end

    return 2, timestamp, record
end
```

## Multi-Line Log Handling

Combine multi-line logs (like stack traces):

```lua
-- multiline.lua
local buffer = {}
local buffer_timestamp = {}

function handle_multiline(tag, timestamp, record)
    local log = record["log"]
    local pod = record["pod_name"] or "unknown"

    -- Initialize buffer for this pod if needed
    if not buffer[pod] then
        buffer[pod] = ""
        buffer_timestamp[pod] = timestamp
    end

    -- Check if this is a continuation line (starts with whitespace or tab)
    local is_continuation = string.match(log, "^%s+") or string.match(log, "^\t")

    if is_continuation then
        -- Append to buffer
        buffer[pod] = buffer[pod] .. "\n" .. log
        return -1, timestamp, record  -- Drop this record, wait for more
    else
        -- This is a new log entry
        if buffer[pod] ~= "" then
            -- Emit previous buffered record
            local buffered_record = {
                log = buffer[pod],
                pod_name = record["pod_name"],
                namespace = record["namespace"],
                container_name = record["container_name"]
            }

            local buffer_ts = buffer_timestamp[pod]

            -- Reset buffer
            buffer[pod] = log
            buffer_timestamp[pod] = timestamp

            -- Return buffered record
            return 2, buffer_ts, buffered_record
        else
            -- No buffer, just pass through
            buffer[pod] = log
            buffer_timestamp[pod] = timestamp
            return 2, timestamp, record
        end
    end
end
```

## Error Rate Calculation

Add error rate metrics to logs:

```lua
-- error_rate.lua
local error_count = {}
local total_count = {}
local window_start = {}

function calculate_error_rate(tag, timestamp, record)
    local service = record["service"] or "unknown"
    local level = record["level"] or "info"

    -- Initialize counters
    if not error_count[service] then
        error_count[service] = 0
        total_count[service] = 0
        window_start[service] = timestamp
    end

    -- Reset counters every 60 seconds
    if timestamp - window_start[service] >= 60 then
        error_count[service] = 0
        total_count[service] = 0
        window_start[service] = timestamp
    end

    -- Update counters
    total_count[service] = total_count[service] + 1
    if level == "error" or level == "fatal" then
        error_count[service] = error_count[service] + 1
    end

    -- Calculate error rate
    local error_rate = 0
    if total_count[service] > 0 then
        error_rate = (error_count[service] / total_count[service]) * 100
    end

    record["error_rate_percent"] = string.format("%.2f", error_rate)
    record["error_count_window"] = error_count[service]
    record["total_count_window"] = total_count[service]

    return 2, timestamp, record
end
```

## Complete Enrichment Pipeline

Combine multiple filters for comprehensive enrichment:

```yaml
data:
  fluent-bit.conf: |
    [FILTER]
        Name   lua
        Match  kube.*
        script /fluent-bit/scripts/parse_custom.lua
        call   parse_application_logs

    [FILTER]
        Name   lua
        Match  kube.*
        script /fluent-bit/scripts/k8s_enrich.lua
        call   add_kubernetes_metadata

    [FILTER]
        Name   lua
        Match  kube.*
        script /fluent-bit/scripts/mask_sensitive.lua
        call   mask_sensitive_data

    [FILTER]
        Name   lua
        Match  kube.*
        script /fluent-bit/scripts/filter_logs.lua
        call   filter_logs

    [FILTER]
        Name   lua
        Match  kube.*
        script /fluent-bit/scripts/error_rate.lua
        call   calculate_error_rate
```

## Performance Optimization

Optimize Lua filters for high-volume logs:

```lua
-- Use local variables for better performance
local string_match = string.match
local string_gsub = string.gsub

-- Cache compiled patterns
local email_pattern = "([%w%.]+)@([%w%.]+)"
local key_pattern = "key_[%w]+"

function optimized_mask(tag, timestamp, record)
    local message = record["message"]

    if not message then
        return 2, timestamp, record
    end

    -- Use cached patterns
    message = string_gsub(message, email_pattern, function(u, d)
        return string.sub(u, 1, 2) .. "***@" .. d
    end)

    message = string_gsub(message, key_pattern, "key_***")

    record["message"] = message
    return 2, timestamp, record
end
```

## Conclusion

Fluent Bit Lua filters provide powerful log enrichment capabilities for Kubernetes environments. By parsing custom formats, adding metadata, masking sensitive data, and calculating metrics, you transform raw logs into rich, queryable data. These pipelines prepare logs for efficient storage and analysis while ensuring security and compliance requirements are met. Build your enrichment pipeline incrementally, starting with essential transformations and expanding based on your specific logging needs.
