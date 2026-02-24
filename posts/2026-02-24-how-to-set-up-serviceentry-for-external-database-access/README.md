# How to Set Up ServiceEntry for External Database Access

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, Database, Kubernetes, TCP, Service Mesh

Description: Configure Istio ServiceEntry to allow mesh workloads to connect to external databases like PostgreSQL, MySQL, and managed cloud databases.

---

Running databases outside your Kubernetes cluster is extremely common. Maybe you use Amazon RDS, Google Cloud SQL, Azure Database, or a self-hosted database in a separate data center. Your mesh workloads need to reach these databases, and Istio needs to know about them to allow the connections and give you observability.

Database connections are different from HTTP API calls. They use TCP protocols with long-lived connections, custom wire protocols, and often TLS encryption. The ServiceEntry configuration reflects these differences.

## PostgreSQL on Amazon RDS

Here is a straightforward example for connecting to a PostgreSQL database on RDS:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: rds-postgres
  namespace: backend
spec:
  hosts:
    - mydb.abc123.us-east-1.rds.amazonaws.com
  location: MESH_EXTERNAL
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  resolution: DNS
```

The key difference from HTTP ServiceEntries is the protocol. Database connections use `TCP` because the sidecar proxy does not understand PostgreSQL's wire protocol. It just passes TCP bytes through.

Apply it and test connectivity:

```bash
kubectl apply -f rds-postgres-se.yaml

# Test from a pod
kubectl exec deploy/backend-api -c backend-api -- \
  pg_isready -h mydb.abc123.us-east-1.rds.amazonaws.com -p 5432
```

## MySQL on Cloud SQL

Google Cloud SQL uses a similar pattern:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: cloudsql-mysql
  namespace: backend
spec:
  hosts:
    - mysql-instance.project-id.region.sql.goog
  location: MESH_EXTERNAL
  ports:
    - number: 3306
      name: tcp-mysql
      protocol: TCP
  resolution: DNS
```

If you are using the Cloud SQL Auth Proxy (which runs as a sidecar), the ServiceEntry is not needed for the database connection itself because the proxy runs locally. But if your pods connect directly to Cloud SQL, you need this.

## Static IP Database Endpoints

Some databases have fixed IP addresses, especially self-hosted ones. Use STATIC resolution with explicit endpoints:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: on-prem-postgres
spec:
  hosts:
    - db-primary.internal.company.com
  location: MESH_EXTERNAL
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  resolution: STATIC
  endpoints:
    - address: 10.100.50.10
    - address: 10.100.50.11
```

With STATIC resolution, Envoy does not do DNS lookups. It load balances across the provided IP addresses directly. This is useful when your database has stable IPs or when DNS is unreliable.

## Database with TLS Encryption

Most managed databases support (or require) TLS connections. For TLS-encrypted database traffic, set the protocol to TLS:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: rds-postgres-tls
spec:
  hosts:
    - mydb.abc123.us-east-1.rds.amazonaws.com
  location: MESH_EXTERNAL
  ports:
    - number: 5432
      name: tls-postgres
      protocol: TLS
  resolution: DNS
```

Using `protocol: TLS` instead of `TCP` tells Envoy that this traffic is TLS-encrypted. Envoy can then extract the SNI for proper routing without trying to inspect the encrypted payload.

If you want Envoy to originate TLS (your app sends plaintext, Envoy encrypts it), add a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: rds-postgres-tls-origination
spec:
  host: mydb.abc123.us-east-1.rds.amazonaws.com
  trafficPolicy:
    tls:
      mode: SIMPLE
      sni: mydb.abc123.us-east-1.rds.amazonaws.com
```

## Multiple Database Instances

If your application connects to multiple databases (read replicas, different schemas, different environments), create separate ServiceEntries for each:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: db-primary
spec:
  hosts:
    - primary.abc123.us-east-1.rds.amazonaws.com
  location: MESH_EXTERNAL
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  resolution: DNS
---
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: db-read-replica
spec:
  hosts:
    - replica.abc123.us-east-1.rds.amazonaws.com
  location: MESH_EXTERNAL
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  resolution: DNS
```

## Connection Pool Settings

Database connections are long-lived and connection pooling matters. Use a DestinationRule to configure connection limits:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: db-connection-pool
spec:
  host: mydb.abc123.us-east-1.rds.amazonaws.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
        connectTimeout: 10s
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 30s
```

This limits concurrent TCP connections to 50 and sets a 10-second connection timeout. The outlier detection ejects an endpoint after 3 consecutive errors, which is useful when you have multiple database endpoints.

## Handling Connection Timeouts

Long-lived database connections can be problematic with Envoy's default idle timeout. If your database connections sit idle for a while, Envoy might close them unexpectedly.

Adjust the idle timeout in a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: db-idle-timeout
spec:
  host: mydb.abc123.us-east-1.rds.amazonaws.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        idleTimeout: 3600s
```

Setting `idleTimeout: 3600s` keeps idle connections alive for up to an hour. Match this to your database server's connection timeout setting to avoid mismatches.

## Debugging Database Connectivity

When database connections fail through Istio, here is a systematic debugging approach:

1. **Verify the ServiceEntry exists:**

```bash
kubectl get serviceentry -n backend
```

2. **Check Envoy knows about the database:**

```bash
istioctl proxy-config cluster deploy/backend-api | grep rds
```

3. **Check endpoint resolution:**

```bash
istioctl proxy-config endpoints deploy/backend-api | grep rds
```

4. **Look at Envoy access logs:**

```bash
kubectl logs deploy/backend-api -c istio-proxy --tail=50 | grep 5432
```

5. **Test bypassing the sidecar** (to isolate if Istio is the problem):

```bash
kubectl exec deploy/backend-api -c backend-api -- \
  curl -v telnet://mydb.abc123.us-east-1.rds.amazonaws.com:5432
```

## Common Port Reference

Here is a quick reference for common database ports to use in your ServiceEntry definitions:

| Database | Default Port | Protocol |
|----------|-------------|----------|
| PostgreSQL | 5432 | TCP |
| MySQL | 3306 | TCP |
| MongoDB | 27017 | TCP |
| Redis | 6379 | TCP |
| Cassandra | 9042 | TCP |
| SQL Server | 1433 | TCP |
| Oracle | 1521 | TCP |
| Elasticsearch | 9200 | TCP/HTTP |

## Port Naming Conventions

Istio requires specific port naming patterns for protocol detection. For TCP database ports, prefix the name with `tcp-`:

```yaml
ports:
  - number: 5432
    name: tcp-postgres    # correct
    protocol: TCP

  - number: 5432
    name: postgres        # might not work correctly
    protocol: TCP
```

The `tcp-` prefix ensures Istio treats the traffic as opaque TCP, which is what you want for database protocols.

Setting up ServiceEntries for databases takes a few minutes but prevents the frustrating "why can't my pod connect to the database" debugging sessions that eat up engineering time. Define them early in your Istio adoption, preferably as part of your infrastructure-as-code pipeline, and you will save yourself and your team a lot of trouble.
