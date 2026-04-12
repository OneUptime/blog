# How to Monitor Redis with Elastic APM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Elastic APM, Monitoring, Observability, APM

Description: Learn how to monitor Redis operations with Elastic APM - covering agent setup, Redis span capture, performance analysis in Kibana, and configuring the Metricbeat Redis module.

---

Elastic APM automatically captures Redis operations as spans within your application traces. Combined with Metricbeat's Redis module for infrastructure metrics, you get comprehensive Redis observability in the Elastic Stack.

## Install the Elastic APM Agent

For Python applications:

```bash
pip install elastic-apm
```

For Node.js:

```bash
npm install elastic-apm-node
```

## Configure the APM Agent

Start the agent before importing other modules. It automatically instruments supported libraries including Redis:

```python
import elasticapm

elasticapm.instrument()

client_config = elasticapm.Client(
    service_name="user-api",
    server_url="http://apm-server:8200",
    secret_token="your-secret-token",
    environment="production"
)

import redis

redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
```

The agent automatically wraps Redis calls and creates spans in the current transaction.

## Capture Redis Spans in a Transaction

```python
def get_user_data(user_id: str):
    client_config.begin_transaction("request")
    # Redis operations inside a transaction are captured as spans
    cached = redis_client.get(f"user:{user_id}")

    if cached:
        client_config.end_transaction("get_user_data", "success")
        return json.loads(cached)

    user = fetch_from_database(user_id)
    redis_client.setex(f"user:{user_id}", 3600, json.dumps(user))
    client_config.end_transaction("get_user_data", "success")
    return user
```

For web frameworks like Flask or Django, transactions are automatically created per HTTP request.

## Node.js Auto-Instrumentation

```javascript
// Must be the first line
const apm = require('elastic-apm-node').start({
  serviceName: 'product-service',
  serverUrl: 'http://apm-server:8200',
  secretToken: 'your-secret-token'
});

const Redis = require('ioredis');
const redis = new Redis({ host: 'localhost', port: 6379 });

// Redis operations are auto-traced
app.get('/product/:id', async (req, res) => {
  const cached = await redis.get(`product:${req.params.id}`);
  if (cached) return res.json(JSON.parse(cached));

  const product = await db.getProduct(req.params.id);
  await redis.setex(`product:${req.params.id}`, 600, JSON.stringify(product));
  res.json(product);
});
```

## Set Up Metricbeat Redis Module for Infrastructure Metrics

Install Metricbeat on the Redis host and enable the Redis module:

```bash
metricbeat modules enable redis
```

```yaml
# /etc/metricbeat/modules.d/redis.yml
- module: redis
  metricsets:
    - info
    - keyspace
  period: 10s
  hosts: ["localhost:6379"]
  password: "yourpassword"
```

```bash
metricbeat setup
systemctl start metricbeat
```

## View Redis Data in Kibana

In Kibana APM:
1. Go to APM - Services - select your service
2. Click on Transactions to see request traces
3. In any transaction, look for Redis spans labeled `redis.GET` or `redis.SET`
4. The span detail shows duration, host, and the Redis command

For infrastructure metrics, use the Metricbeat dashboards:
- Search for "Redis" in Kibana Dashboards
- The pre-built dashboard shows memory, connections, hit rate, and command throughput

## Summary

Elastic APM auto-instruments Redis client libraries to capture operation spans within application transactions, giving you request-level Redis latency visibility. Complement this with Metricbeat's Redis module for server-level metrics. Together they provide full-stack Redis observability in the Elastic Stack, from infrastructure memory usage down to individual slow cache operations.
