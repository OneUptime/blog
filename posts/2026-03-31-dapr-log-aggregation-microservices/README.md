# How to Implement Log Aggregation for Dapr Microservices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Log Aggregation, Microservice, Observability, Fluent Bit

Description: Learn how to implement centralized log aggregation for Dapr microservices using Fluent Bit, correlation IDs, and a unified log pipeline across multiple services.

---

## Overview

In a Dapr microservices architecture, each service and its Dapr sidecar produce independent log streams. Log aggregation brings these streams together into a searchable, correlated view. Effective aggregation requires consistent log formats, correlation IDs, and a centralized log collector.

## Log Aggregation Architecture

A typical Dapr log aggregation pipeline looks like:

```text
[App Container] --> [stdout]
[Dapr Sidecar]  --> [stdout]    --> Fluent Bit DaemonSet --> Log Backend
[Dapr Operator] --> [stdout]                                (Loki/ES/Splunk)
```

Fluent Bit runs on each node, tails container logs from `/var/log/containers/`, and forwards them to the backend.

## Deploying Fluent Bit with a Comprehensive Config

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-dapr
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Parsers_File parsers.conf
        Flush 10
        Log_Level info

    # Collect Dapr sidecar logs
    [INPUT]
        Name tail
        Path /var/log/containers/*daprd*.log
        Tag dapr.sidecar
        Parser docker
        DB /var/log/flb_dapr_sidecar.db

    # Collect application container logs
    [INPUT]
        Name tail
        Path /var/log/containers/*.log
        Exclude_Path /var/log/containers/*daprd*.log
        Tag dapr.app
        Parser docker
        DB /var/log/flb_dapr_app.db

    # Enrich with Kubernetes metadata
    [FILTER]
        Name kubernetes
        Match dapr.*
        Kube_URL https://kubernetes.default.svc:443
        Merge_Log On
        K8S-Logging.Parser On

    # Only process Dapr-enabled pods
    [FILTER]
        Name grep
        Match dapr.app
        Regex $kubernetes['annotations']['dapr.io/enabled'] true

    # Output to Loki
    [OUTPUT]
        Name loki
        Match dapr.*
        Host loki.monitoring.svc
        Port 3100
        Labels job=dapr,namespace=$kubernetes['namespace_name'],app_id=$kubernetes['annotations']['dapr.io/app-id']
```

## Adding Correlation IDs Across Services

Propagate a correlation ID through all Dapr service invocations:

```javascript
// Middleware to set and propagate correlation ID
const { v4: uuidv4 } = require('uuid');

app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
});

// Log with correlation ID
app.post('/orders', async (req, res) => {
  logger.info('Order received', {
    correlationId: req.correlationId,
    orderId: req.body.id
  });

  // Forward correlation ID to downstream Dapr services
  await daprClient.invoker.invoke(
    'inventory-service',
    'check-stock',
    HttpMethod.POST,
    req.body,
    { headers: { 'x-correlation-id': req.correlationId } }
  );
});
```

## Searching Correlated Logs

Query by correlation ID to trace a request across services:

```bash
# In Kibana/Grafana Logs Explorer
correlationId: "abc-123-def-456"

# LogQL in Loki
{job="dapr"} | json | correlationId = "abc-123-def-456"
```

## Normalizing Log Levels

Standardize log level field names across polyglot services:

```ini
# Fluent Bit filter to normalize level fields
[FILTER]
    Name lua
    Match dapr.app
    script normalize_levels.lua
    call normalize_level
```

```lua
-- normalize_levels.lua
function normalize_level(tag, timestamp, record)
    local level = record["level"] or record["severity"] or record["log_level"]
    if level then
        record["level"] = string.lower(level)
    end
    return 2, timestamp, record
end
```

## Monitoring Log Pipeline Health

Track Fluent Bit's own metrics to ensure logs are flowing:

```bash
# Fluent Bit exposes metrics at port 2020
curl http://fluent-bit.logging.svc:2020/api/v1/metrics | jq '.input | to_entries[] | {name: .key, records: .value.records}'
```

## Summary

Log aggregation for Dapr microservices requires a consistent JSON log format, Fluent Bit collecting both sidecar and application logs, and correlation IDs threaded through service invocations. Filtering to only Dapr-enabled pods reduces noise, while normalizing log levels across polyglot services ensures your log backend can search and alert uniformly across the entire fleet.
