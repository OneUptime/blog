# How to Use Dapr Secrets Management for Connection Strings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret Management, Connection String, Database, Security

Description: Learn how to manage database and messaging connection strings securely using Dapr Secrets Management to avoid leaking credentials in configuration files.

---

Connection strings often bundle together a hostname, port, database name, username, and password into a single value. Storing these in environment variables or config maps is convenient but risky. Dapr Secrets Management gives you a runtime API to fetch connection strings from a secure backend, keeping sensitive connection details out of your application configuration entirely.

## Storing Connection Strings

Create a Kubernetes secret with your connection strings:

```bash
kubectl create secret generic connection-strings \
  --from-literal=postgres-url="postgresql://appuser:s3cr3t@postgres:5432/mydb?sslmode=require" \
  --from-literal=redis-url="redis://:redispassword@redis:6379/0" \
  --from-literal=redis-password="redispassword" \
  --from-literal=rabbitmq-url="amqp://user:pass@rabbitmq:5672/vhost" \
  -n production
```

Define the secret store component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: app-secrets
  namespace: production
spec:
  type: secretstores.kubernetes
  version: v1
  metadata: []
```

## Retrieving Connection Strings in Java

```java
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import java.util.Map;

public class DatabaseConfig {

    private final DaprClient daprClient;

    public DatabaseConfig() {
        this.daprClient = new DaprClientBuilder().build();
    }

    public String getPostgresUrl() {
        Map<String, String> secrets = daprClient
            .getSecret("app-secrets", "connection-strings")
            .block();
        return secrets.get("postgres-url");
    }

    public String getRedisUrl() {
        Map<String, String> secrets = daprClient
            .getSecret("app-secrets", "connection-strings")
            .block();
        return secrets.get("redis-url");
    }
}
```

## Using Connection Strings in Dapr State Store Components

Instead of inlining the connection string, reference the secret:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: "redis:6379"
    - name: redisPassword
      secretKeyRef:
        name: connection-strings
        key: redis-password
  auth:
    secretStore: app-secrets
```

For a PostgreSQL state store, reference the full connection URL:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: postgres-state
spec:
  type: state.postgresql
  version: v1
  metadata:
    - name: connectionString
      secretKeyRef:
        name: connection-strings
        key: postgres-url
  auth:
    secretStore: app-secrets
```

## Validating Secret Retrieval

Test that your service can reach the secret at startup with a simple health check:

```bash
# From inside the pod
curl -s http://localhost:3500/v1.0/secrets/app-secrets/connection-strings | jq 'keys'
```

Expected output shows the available keys:

```json
["postgres-url", "rabbitmq-url", "redis-password", "redis-url"]
```

## Summary

Dapr Secrets Management lets you move all connection strings into a centralized secret store and retrieve them at runtime, eliminating credential exposure in Kubernetes manifests and application config files. Using `secretKeyRef` in Dapr component definitions further reduces the surface area where connection details are visible to operators browsing configuration.
