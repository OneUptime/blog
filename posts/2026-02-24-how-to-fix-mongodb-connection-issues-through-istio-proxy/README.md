# How to Fix MongoDB Connection Issues Through Istio Proxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MongoDB, Database, TCP Routing, Troubleshooting

Description: Troubleshooting guide for resolving MongoDB connection failures when database traffic goes through the Istio Envoy proxy.

---

MongoDB connections through Istio can be finicky. MongoDB uses its own wire protocol over TCP, and features like replica sets and sharded clusters involve multiple connections to different servers based on topology discovery. This dynamic connection behavior doesn't always play nicely with the Envoy sidecar.

## Service Port Configuration

MongoDB's binary protocol runs on port 27017 by default. Name the service port with a `tcp` or `mongo` prefix:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mongodb
  namespace: database
spec:
  ports:
  - name: tcp-mongo
    port: 27017
    targetPort: 27017
  selector:
    app: mongodb
```

Using `mongo` as the port name also works:

```yaml
ports:
- name: mongo
  port: 27017
  targetPort: 27017
```

Do not use an `http` prefix. Envoy will try to parse MongoDB's wire protocol as HTTP and reject all traffic.

## Replica Set Connection Issues

MongoDB replica sets have a primary and one or more secondaries. The MongoDB driver discovers the topology by sending `isMaster`/`hello` commands and getting back a list of all replica set members with their addresses.

The driver then connects to individual members. These addresses must be resolvable from the client pod.

For a MongoDB StatefulSet, the members are typically:

```
mongodb-0.mongodb-headless.database.svc.cluster.local:27017
mongodb-1.mongodb-headless.database.svc.cluster.local:27017
mongodb-2.mongodb-headless.database.svc.cluster.local:27017
```

Make sure you have a headless service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mongodb-headless
  namespace: database
spec:
  clusterIP: None
  ports:
  - name: tcp-mongo
    port: 27017
    targetPort: 27017
  selector:
    app: mongodb
```

And verify DNS resolution from the client pod:

```bash
kubectl exec <client-pod> -c istio-proxy -n my-namespace -- nslookup mongodb-0.mongodb-headless.database.svc.cluster.local
```

## Connection String Format

Your MongoDB connection string needs to use the correct hostnames that are routable through the mesh:

```
mongodb://mongodb-0.mongodb-headless.database.svc.cluster.local:27017,mongodb-1.mongodb-headless.database.svc.cluster.local:27017,mongodb-2.mongodb-headless.database.svc.cluster.local:27017/mydb?replicaSet=rs0
```

If you use just `mongodb://mongodb:27017/mydb`, the driver connects to the service VIP, discovers the replica set members by their individual hostnames, and then tries to connect to those hostnames. This can fail if the Sidecar resource restricts which namespaces are visible.

## mTLS Configuration

For MongoDB pods with Istio sidecars, mTLS works transparently. But if MongoDB manages its own TLS (using `--tlsMode` and certificates), having both Istio mTLS and MongoDB TLS creates double encryption.

If both client and server have sidecars, disable MongoDB's native TLS and let Istio handle it:

```yaml
# MongoDB config - disable native TLS
net:
  tls:
    mode: disabled
```

If MongoDB doesn't have a sidecar, disable Istio mTLS for the MongoDB destination:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: mongodb-no-mtls
  namespace: my-namespace
spec:
  host: mongodb-headless.database.svc.cluster.local
  trafficPolicy:
    tls:
      mode: DISABLE
```

## Connection Pool Settings

MongoDB drivers maintain connection pools. Configure Envoy's TCP connection limits to accommodate them:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: mongodb-pool
  namespace: my-namespace
spec:
  host: mongodb-headless.database.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
        connectTimeout: 10s
        idleTimeout: 3600s
```

The MongoDB default connection pool size varies by driver but is typically around 100 connections per host. If you have multiple application pods, multiply accordingly.

## Idle Connection Handling

MongoDB drivers send periodic heartbeats to check server status (every 10 seconds by default). This keeps connections alive, but if Envoy's idle timeout is shorter than the heartbeat interval, connections get dropped between heartbeats.

Set the `idleTimeout` to a value much longer than the heartbeat interval:

```yaml
connectionPool:
  tcp:
    idleTimeout: 7200s
```

If you see frequent "connection closed" or "topology changes" in your MongoDB driver logs, it's likely idle connections being dropped by Envoy.

## Startup Race Condition

Your application tries to connect to MongoDB before the sidecar is ready:

```yaml
metadata:
  annotations:
    proxy.istio.io/config: |
      holdApplicationUntilProxyStarts: true
```

Most MongoDB drivers handle transient connection failures well, but the initial connection during startup can cause the application to fail fast. Adding the hold annotation prevents this.

## Sidecar Resource Limiting Visibility

If you use a Sidecar resource to limit configuration scope, make sure the MongoDB namespace is included:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: my-namespace
spec:
  egress:
  - hosts:
    - "./*"
    - "database/*"
    - "istio-system/*"
```

Without `database/*`, the proxy won't know about MongoDB services in the database namespace, and connections will fail.

## External MongoDB (Atlas, DocumentDB)

For managed MongoDB services:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-mongodb
  namespace: my-namespace
spec:
  hosts:
  - "cluster0.abc123.mongodb.net"
  ports:
  - number: 27017
    name: tcp-mongo
    protocol: TCP
  location: MESH_EXTERNAL
  resolution: DNS
```

MongoDB Atlas uses SRV records for service discovery. The driver resolves `_mongodb._tcp.cluster0.abc123.mongodb.net` to find the actual server addresses. Make sure DNS resolution for SRV records works from your pod.

If using `mongodb+srv://` connection strings with Istio, you might need to add ServiceEntries for each individual server that the SRV record points to, since the driver will connect to those directly.

A simpler approach is to bypass the proxy for Atlas connections:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundPorts: "27017"
```

## Sharded Cluster Issues

MongoDB sharded clusters add another layer of complexity. Clients connect to `mongos` routers, which then connect to shard servers. If `mongos` and shard servers all have sidecars, each hop goes through a proxy.

For sharded clusters, make sure:
1. All `mongos`, config server, and shard ports are named correctly
2. Connection pool limits are adequate for the multi-hop traffic
3. The Sidecar resource allows traffic between all the MongoDB components

## Debugging MongoDB Connections

Check if MongoDB endpoints are visible to the proxy:

```bash
istioctl proxy-config endpoints <pod-name> -n my-namespace | grep 27017
```

Check for connection failures in Envoy logs:

```bash
kubectl logs <pod-name> -c istio-proxy -n my-namespace | grep "27017"
```

Check MongoDB driver logs for topology changes and connection errors. Most drivers have detailed logging when the connection pool has issues.

Test connectivity from inside the pod:

```bash
kubectl exec <pod-name> -c my-app -n my-namespace -- mongosh --host mongodb-0.mongodb-headless.database.svc.cluster.local --eval "db.runCommand({ping: 1})"
```

## Summary

MongoDB through Istio works once you name ports correctly (`tcp-mongo` or `mongo`), use headless services for replica sets, and configure adequate connection pool sizes. The main gotcha is replica set/sharded cluster topology discovery, which requires that all individual member addresses are resolvable from the client pod. For managed services like Atlas, consider bypassing the proxy for MongoDB traffic to avoid complications with SRV record resolution and multi-server connections.
