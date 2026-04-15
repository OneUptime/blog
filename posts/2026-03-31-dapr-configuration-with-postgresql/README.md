# How to Use Dapr Configuration with PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, PostgreSQL, Configuration API, Database Configuration, Microservice

Description: Learn how to configure and use PostgreSQL as a Dapr configuration store backend for persistent, query-friendly application configuration management.

---

While Redis is the most popular Dapr configuration backend, PostgreSQL offers advantages for teams already running PostgreSQL and wanting SQL-based configuration management with persistence, rich queries, and transactional updates. Dapr's PostgreSQL configuration component uses LISTEN/NOTIFY for real-time change subscriptions.

## Set Up the PostgreSQL Schema

Dapr requires a specific table schema for the PostgreSQL configuration store. Create the configuration table:

```sql
CREATE TABLE IF NOT EXISTS dapr_configuration (
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1',
  metadata JSONB,
  updatetime TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (key)
);

-- Create the notification trigger for subscriptions
CREATE OR REPLACE FUNCTION configuration_event()
RETURNS TRIGGER AS $$
DECLARE
  data json;
  notification json;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    data = row_to_json(OLD);
  ELSE
    data = row_to_json(NEW);
  END IF;
  notification = json_build_object('table', TG_TABLE_NAME, 'action', TG_OP, 'data', data);
  PERFORM pg_notify('config', notification::text);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER config_change_trigger
AFTER INSERT OR UPDATE OR DELETE ON dapr_configuration
FOR EACH ROW EXECUTE FUNCTION configuration_event();
```

## Define the Dapr Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: appconfig-pg
  namespace: production
spec:
  type: configuration.postgresql
  version: v1
  metadata:
    - name: connectionString
      secretKeyRef:
        name: postgres-config-secret
        key: connection-string
    - name: table
      value: "dapr_configuration"
    - name: maxConns
      value: "5"
    - name: connectionMaxIdleTime
      value: "5m"
```

Store the connection string in a Kubernetes secret:

```bash
kubectl create secret generic postgres-config-secret \
  --from-literal=connection-string="postgres://configuser:password@postgres:5432/appconfig?sslmode=require" \
  -n production
```

## Inserting Configuration Values

Use standard SQL to manage configuration:

```sql
-- Insert configuration values
INSERT INTO dapr_configuration (key, value, version, metadata)
VALUES
  ('payment-service||max-retries', '3', '1', '{"env": "production"}'),
  ('payment-service||timeout-ms', '5000', '1', '{"env": "production"}'),
  ('payment-service||debug-mode', 'false', '1', '{"env": "production"}')
ON CONFLICT (key) DO UPDATE
  SET value = EXCLUDED.value,
      version = (CAST(dapr_configuration.version AS INTEGER) + 1)::TEXT,
      updatetime = CURRENT_TIMESTAMP;
```

## Reading Configuration

```bash
curl "http://localhost:3500/v1.0/configuration/appconfig-pg?key=max-retries"
```

In Python:

```python
import httpx

async def get_config_values(keys: list[str]) -> dict:
    params = [("key", k) for k in keys]
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "http://localhost:3500/v1.0/configuration/appconfig-pg",
            params=params
        )
        return {k: v["value"] for k, v in resp.json().items()}

config = await get_config_values(["max-retries", "timeout-ms", "debug-mode"])
```

## Advantages of PostgreSQL Configuration Store

Managing configuration in PostgreSQL offers benefits Redis does not:

```sql
-- Query configuration history (if you maintain an audit table)
SELECT key, value, updatetime
FROM dapr_configuration_history
WHERE key = 'payment-service||max-retries'
ORDER BY updatetime DESC
LIMIT 10;

-- Find all configs updated in the last hour
SELECT key, value, updatetime
FROM dapr_configuration
WHERE updatetime > NOW() - INTERVAL '1 hour';

-- Bulk update all services to debug mode
UPDATE dapr_configuration
SET value = 'true', version = (CAST(version AS INTEGER) + 1)::TEXT
WHERE key LIKE '%||debug-mode';
```

## Summary

PostgreSQL as a Dapr configuration store is ideal for teams that prefer SQL-based management, need persistent configuration history, or already operate PostgreSQL. It uses LISTEN/NOTIFY for real-time subscriptions and requires a simple schema setup. The trade-off versus Redis is slightly higher latency on reads, which is usually acceptable for configuration workloads.
