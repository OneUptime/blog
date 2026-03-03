# How to Set Up ServiceEntry for MongoDB Atlas

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, MongoDB, Atlas, Kubernetes, Service Mesh

Description: Configure Istio ServiceEntry for MongoDB Atlas connectivity with proper DNS resolution, TLS handling, and connection pool settings for production use.

---

MongoDB Atlas is one of the most popular managed database services, and connecting to it from Kubernetes pods running in an Istio mesh requires some specific configuration. Atlas uses SRV DNS records for service discovery, TLS for all connections, and has a unique endpoint structure that you need to accommodate in your ServiceEntry.

If you are running Istio with `REGISTRY_ONLY` outbound policy and your application suddenly cannot connect to Atlas, this is why. Envoy blocks the connection because it does not know about the Atlas endpoints. Even with `ALLOW_ANY`, creating a ServiceEntry gives you metrics on your database traffic, which is extremely valuable for performance monitoring.

## Understanding MongoDB Atlas Endpoints

Atlas clusters have a connection string that looks like this:

```text
mongodb+srv://username:password@cluster0.abc123.mongodb.net/mydb
```

The `mongodb+srv://` scheme tells the MongoDB driver to perform an SRV DNS lookup on `_mongodb._tcp.cluster0.abc123.mongodb.net`. This returns the actual hostnames of the replica set members, which look like:

```text
cluster0-shard-00-00.abc123.mongodb.net:27017
cluster0-shard-00-01.abc123.mongodb.net:27017
cluster0-shard-00-02.abc123.mongodb.net:27017
```

So your pods need to reach both the SRV DNS domain and the individual shard hostnames.

## Basic ServiceEntry for MongoDB Atlas

The simplest approach uses a wildcard to cover all shard hostnames:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: mongodb-atlas
spec:
  hosts:
    - "*.abc123.mongodb.net"
  location: MESH_EXTERNAL
  ports:
    - number: 27017
      name: tcp-mongodb
      protocol: TLS
  resolution: NONE
```

Replace `abc123` with your actual Atlas cluster identifier (you can find it in your connection string).

Key points:
- **protocol: TLS** because Atlas requires TLS for all connections
- **resolution: NONE** because we are using a wildcard host
- **port 27017** is the standard MongoDB port

## Explicit Shard Hostnames

If you prefer not to use wildcards (for tighter security), list the shard hostnames explicitly:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: mongodb-atlas-shards
spec:
  hosts:
    - "cluster0-shard-00-00.abc123.mongodb.net"
    - "cluster0-shard-00-01.abc123.mongodb.net"
    - "cluster0-shard-00-02.abc123.mongodb.net"
  location: MESH_EXTERNAL
  ports:
    - number: 27017
      name: tls-mongodb
      protocol: TLS
  resolution: DNS
```

To find your shard hostnames, use the `dig` or `nslookup` command:

```bash
# Find SRV records
dig SRV _mongodb._tcp.cluster0.abc123.mongodb.net

# Or use nslookup
nslookup -type=SRV _mongodb._tcp.cluster0.abc123.mongodb.net
```

The advantage of explicit hostnames is that you get `DNS` resolution, which means Envoy handles DNS lookups and gives you better endpoint visibility.

## Handling Atlas Free Tier and Shared Clusters

Atlas free tier and shared clusters sometimes use different hostname patterns. Check your actual connection string and adjust accordingly:

```bash
# Get your exact hostnames
mongosh "mongodb+srv://cluster0.abc123.mongodb.net" --eval "db.adminCommand({getParameter: 1, 'hostInfo': 1})" --username youruser
```

## Connection Pool Configuration

MongoDB connections are long-lived and multiplexed. Configure the connection pool to match your usage:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: mongodb-atlas-pool
spec:
  host: "*.abc123.mongodb.net"
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 10s
        idleTimeout: 1800s
```

Atlas has connection limits based on your cluster tier. A free-tier cluster allows 500 connections. A dedicated M10 allows 1,500. Make sure your `maxConnections` stays well under the Atlas limit, especially if you have multiple pods connecting.

The `idleTimeout: 1800s` (30 minutes) matches Atlas's default idle connection timeout. If you set this higher than what Atlas allows, Atlas closes the connection first and your application sees unexpected disconnections.

## Handling Atlas Failover

Atlas clusters have automatic failover. When a primary node fails, the replica set elects a new primary. Your MongoDB driver handles this transparently, but Envoy needs to allow connections to all shard members.

The wildcard ServiceEntry already handles this:

```yaml
hosts:
  - "*.abc123.mongodb.net"
```

With explicit hostnames, make sure all replica set members are listed. If Atlas adds a new member during a scaling event, you need to update the ServiceEntry.

For extra resilience, add outlier detection:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: mongodb-atlas-resilience
spec:
  host: "*.abc123.mongodb.net"
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 10s
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

## Multi-Region Atlas Clusters

If you use Atlas global clusters or multi-region deployments, the shard hostnames span different regions:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: mongodb-atlas-global
spec:
  hosts:
    - "*.abc123.mongodb.net"
  location: MESH_EXTERNAL
  ports:
    - number: 27017
      name: tls-mongodb
      protocol: TLS
  resolution: NONE
```

The wildcard covers all regional shard hostnames. Atlas handles routing reads and writes to the appropriate region based on your read preference and zone configuration.

## Atlas Private Endpoints

If you use Atlas Private Endpoints (AWS PrivateLink or Azure Private Link), the endpoints are different:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: mongodb-atlas-private
spec:
  hosts:
    - "*.abc123.mongodb.net"
  location: MESH_EXTERNAL
  ports:
    - number: 27017
      name: tls-mongodb
      protocol: TLS
  resolution: NONE
```

The configuration is the same, but the DNS resolution happens through your VPC's private DNS, pointing to the PrivateLink endpoint instead of public IPs.

## Monitoring Atlas Connections

Track your MongoDB Atlas connections through Istio metrics:

```bash
# Active TCP connections to Atlas
istio_tcp_connections_opened_total{
  destination_service=~".*mongodb.net"
}

# Bytes sent to Atlas
istio_tcp_sent_bytes_total{
  destination_service=~".*mongodb.net"
}

# Connection rate
rate(istio_tcp_connections_opened_total{
  destination_service=~".*mongodb.net"
}[5m])
```

Combine these with Atlas's own monitoring (available in the Atlas dashboard) for a complete picture.

## Debugging Atlas Connectivity

If your pods cannot connect to Atlas through Istio:

1. **Check the ServiceEntry:**

```bash
kubectl get serviceentry mongodb-atlas -o yaml
```

2. **Verify Envoy configuration:**

```bash
istioctl proxy-config cluster deploy/my-app | grep mongodb
```

3. **Test DNS resolution from inside the pod:**

```bash
kubectl exec deploy/my-app -c istio-proxy -- nslookup cluster0.abc123.mongodb.net
```

4. **Test connectivity bypassing the sidecar:**

```bash
kubectl exec deploy/my-app -c my-app -- \
  mongosh "mongodb+srv://cluster0.abc123.mongodb.net" \
  --username youruser --password yourpass --eval "db.runCommand({ping:1})"
```

5. **Check Envoy logs for connection errors:**

```bash
kubectl logs deploy/my-app -c istio-proxy | grep 27017
```

Common issues:
- Forgetting to use `TLS` protocol (Atlas requires TLS)
- Missing shard hostnames when not using wildcards
- Connection pool exhaustion from too many pods
- Atlas IP whitelist not including your cluster's egress IPs

## Complete Atlas Setup

Here is a production-ready setup for MongoDB Atlas:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: mongodb-atlas
  namespace: backend
spec:
  hosts:
    - "*.abc123.mongodb.net"
  location: MESH_EXTERNAL
  ports:
    - number: 27017
      name: tls-mongodb
      protocol: TLS
  resolution: NONE
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: mongodb-atlas-config
  namespace: backend
spec:
  host: "*.abc123.mongodb.net"
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 10s
        idleTimeout: 1800s
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
```

This gives you Atlas connectivity with connection limits, timeout management, and basic circuit breaking. Adjust the `maxConnections` based on your Atlas tier and the number of pods in your deployment.
