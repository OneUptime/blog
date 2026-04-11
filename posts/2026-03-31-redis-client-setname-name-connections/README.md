# How to Use CLIENT SETNAME in Redis to Name Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Client, Connection, Monitoring, Debugging

Description: Learn how to use Redis CLIENT SETNAME to assign human-readable names to client connections, making monitoring and debugging significantly easier.

---

The `CLIENT SETNAME` command assigns a name to the current client connection. While optional, naming your Redis connections is one of the most practical things you can do to improve observability. When you run `CLIENT LIST`, named connections are immediately identifiable by their role or origin service, rather than appearing as anonymous IP-port pairs.

## Basic Usage

```bash
# Name the current connection
127.0.0.1:6379> CLIENT SETNAME worker-service
OK

# Verify the name was set
127.0.0.1:6379> CLIENT GETNAME
"worker-service"
```

## Clearing a Connection Name

Pass an empty string to remove the name:

```bash
127.0.0.1:6379> CLIENT SETNAME ""
OK

127.0.0.1:6379> CLIENT GETNAME
(nil)
```

## Naming Rules

Connection names must follow these constraints:

```text
- No spaces allowed
- No newlines or non-printable characters allowed
- Hyphens, underscores, and printable ASCII characters are valid
- Valid: "api-server-1", "worker_pool_job_queue"
- Invalid: "my server" (contains space)
```

Attempting to set an invalid name returns an error:

```bash
127.0.0.1:6379> CLIENT SETNAME "invalid name"
(error) ERR Client names cannot contain spaces, newlines or special characters.
```

## Setting Names in Application Code

Most Redis client libraries support setting the connection name during initialization.

Using `ioredis` in Node.js:

```javascript
const Redis = require('ioredis');
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  connectionName: 'payment-service',
});
```

Using `redis-py` in Python:

```python
import redis

client = redis.Redis(
    host='localhost',
    port=6379,
    client_name='background-worker'
)
```

Using `Jedis` in Java:

```java
JedisPool pool = new JedisPool(new JedisPoolConfig(), "localhost");
try (Jedis jedis = pool.getResource()) {
    jedis.clientSetname("order-processor");
}
```

## Viewing Named Connections

Once names are set, `CLIENT LIST` output becomes much more useful:

```bash
127.0.0.1:6379> CLIENT LIST
id=5 addr=10.0.1.20:45000 ... name=api-gateway ... cmd=get user=api_user ...
id=6 addr=10.0.1.21:45001 ... name=payment-service ... cmd=set user=payment_user ...
id=7 addr=10.0.1.22:45002 ... name=background-worker ... cmd=lpop user=worker_user ...
id=8 addr=10.0.1.23:45003 ... name= ... cmd=ping user=default ...
```

The unnamed client (id=8) stands out immediately as something to investigate.

## Naming Connections in a Pool

When using connection pooling, name each connection to reflect the pool and instance:

```python
import redis
from redis.connection import Connection

class NamedConnection(Connection):
    def __init__(self, service_name, instance_id, **kwargs):
        super().__init__(**kwargs)
        self.service_name = service_name
        self.instance_id = instance_id

    def on_connect(self):
        super().on_connect()
        name = f"{self.service_name}-{self.instance_id}"
        self.send_command('CLIENT', 'SETNAME', name)
        self.read_response()
```

## Debugging with Named Connections

When a connection is consuming excessive memory or is stuck on a slow command, the name lets you immediately identify and address the source:

```bash
# Find all connections from a specific service
redis-cli CLIENT LIST | grep "name=payment-service"

# Kill a stuck named connection
redis-cli CLIENT LIST | grep "name=stuck-worker" | grep -o 'id=[0-9]*' | cut -d= -f2 | xargs -I{} redis-cli CLIENT KILL ID {}
```

## Naming Strategy Recommendations

Use a consistent naming convention across your organization:

```text
Pattern: {service}-{role}-{instance}
Examples:
  - api-server-1
  - worker-email-sender-3
  - cron-cache-warmer
  - stream-consumer-notifications-2
```

## Summary

`CLIENT SETNAME` is a low-cost, high-value practice that transforms anonymous Redis connections into clearly identified ones. By naming every connection at initialization time, your operations team gains immediate visibility into which services are connected, making debugging, monitoring, and incident response dramatically more efficient.
