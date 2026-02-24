# How to Handle MongoDB Protocol in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MongoDB, Service Mesh, Kubernetes, Database, Protocol

Description: Practical guide to configuring Istio for MongoDB protocol traffic, covering port naming, connection settings, external access, and mTLS configuration.

---

MongoDB is one of the most popular NoSQL databases, and running it alongside Istio in Kubernetes is a typical setup. Like MySQL, MongoDB uses a wire protocol that doesn't look like HTTP, so Istio needs to know it's dealing with MongoDB traffic to handle it correctly.

Unlike MySQL though, MongoDB's wire protocol is client-first. The client sends the initial request after the TCP connection is established. This means Istio's protocol sniffing can technically detect that it's not HTTP and fall back to TCP. But relying on sniffing adds latency and uncertainty. Explicit configuration is always better.

## Service Configuration for MongoDB

Tell Istio about the MongoDB protocol by naming the port appropriately:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mongodb
  namespace: default
spec:
  selector:
    app: mongodb
  ports:
    - name: mongo
      port: 27017
      targetPort: 27017
```

The prefix `mongo` is one of Istio's recognized protocol prefixes. You can also use `tcp-mongo` or set the `appProtocol`:

```yaml
ports:
  - name: database
    port: 27017
    targetPort: 27017
    appProtocol: mongo
```

When Istio recognizes the port as MongoDB, it applies a TCP proxy filter and can collect MongoDB-specific metrics if you have that feature enabled.

## Deploying MongoDB with Istio

Here is a basic MongoDB deployment in a mesh-enabled namespace:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
        - name: mongodb
          image: mongo:7.0
          ports:
            - containerPort: 27017
          volumeMounts:
            - name: mongo-data
              mountPath: /data/db
          env:
            - name: MONGO_INITDB_ROOT_USERNAME
              valueFrom:
                secretKeyRef:
                  name: mongo-credentials
                  key: username
            - name: MONGO_INITDB_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mongo-credentials
                  key: password
      volumes:
        - name: mongo-data
          persistentVolumeClaim:
            claimName: mongo-pvc
```

One thing to watch out for: the Istio sidecar and MongoDB can have a startup race condition. If the application container starts before the sidecar is ready, outbound connections from MongoDB (like replica set communications) might fail. Use the `holdApplicationUntilProxyStarts` annotation:

```yaml
template:
  metadata:
    labels:
      app: mongodb
    annotations:
      proxy.istio.io/config: |
        holdApplicationUntilProxyStarts: true
```

## MongoDB Replica Sets and Istio

MongoDB replica sets add complexity because nodes need to discover and communicate with each other. Each replica set member advertises its hostname, and other members connect to that hostname.

If you're using a StatefulSet with a headless service (the standard pattern for MongoDB replica sets), each pod gets a DNS name like `mongodb-0.mongodb-headless.default.svc.cluster.local`.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mongodb-headless
  namespace: default
spec:
  clusterIP: None
  selector:
    app: mongodb
  ports:
    - name: mongo
      port: 27017
      targetPort: 27017
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
  namespace: default
spec:
  serviceName: mongodb-headless
  replicas: 3
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
    spec:
      containers:
        - name: mongodb
          image: mongo:7.0
          ports:
            - containerPort: 27017
          command:
            - mongod
            - "--replSet"
            - rs0
            - "--bind_ip_all"
```

The replica set members communicate directly using pod hostnames. Istio handles this traffic through the sidecars with mTLS between pods.

A common problem with MongoDB replica sets in Istio is the initial replica set initialization. You need to use the internal pod hostnames:

```bash
kubectl exec -it mongodb-0 -n default -- mongosh --eval '
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "mongodb-0.mongodb-headless.default.svc.cluster.local:27017" },
    { _id: 1, host: "mongodb-1.mongodb-headless.default.svc.cluster.local:27017" },
    { _id: 2, host: "mongodb-2.mongodb-headless.default.svc.cluster.local:27017" }
  ]
})'
```

## Connection Pool Tuning

MongoDB drivers maintain their own connection pools, and Istio's sidecar has its own connection limits on top of that. You need to make sure Istio's limits are higher than what the MongoDB driver is configured to use.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: mongodb-dr
  namespace: default
spec:
  host: mongodb.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
        connectTimeout: 10s
        tcpKeepalive:
          time: 300s
          interval: 75s
          probes: 9
```

MongoDB drivers typically default to a pool size of 100 connections per host. If you have multiple application pods each maintaining 100 connections, make sure `maxConnections` in the DestinationRule can accommodate all of them.

The `tcpKeepalive` settings help detect dead connections. MongoDB connections can be long-lived, and without keepalive probes, zombie connections can accumulate.

## Connecting to External MongoDB (Atlas, etc.)

If you use MongoDB Atlas or another hosted MongoDB service, configure a ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: mongodb-atlas
  namespace: default
spec:
  hosts:
    - "*.mongodb.net"
  location: MESH_EXTERNAL
  ports:
    - number: 27017
      name: mongo
      protocol: TCP
  resolution: NONE
```

MongoDB Atlas uses SRV records for service discovery. The MongoDB driver queries DNS SRV records to find the replica set members. Make sure your Istio configuration allows DNS queries and connections to all the resolved hosts.

For TLS connections to Atlas:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: mongodb-atlas-dr
  namespace: default
spec:
  host: "*.mongodb.net"
  trafficPolicy:
    tls:
      mode: SIMPLE
```

Since Atlas requires TLS, and the MongoDB driver handles TLS itself, you might need to use `DISABLE` instead of `SIMPLE` to avoid double TLS:

```yaml
trafficPolicy:
  tls:
    mode: DISABLE
```

This tells Istio's sidecar not to add its own TLS layer, letting the MongoDB driver's TLS pass through as-is.

## mTLS Configuration

For MongoDB instances inside the mesh, mTLS is handled automatically by Istio. But you might need to adjust settings:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: mongodb-mtls
  namespace: default
spec:
  selector:
    matchLabels:
      app: mongodb
  mtls:
    mode: STRICT
```

If you have MongoDB clients outside the mesh (like a debugging tool running on your laptop via kubectl port-forward), you'll need `PERMISSIVE` mode or configure the port-forward to go through the sidecar.

## Authorization Policies

You can use Istio's AuthorizationPolicy to control which services can connect to MongoDB:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: mongodb-access
  namespace: default
spec:
  selector:
    matchLabels:
      app: mongodb
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/default/sa/backend-service
              - cluster.local/ns/default/sa/api-service
      to:
        - operation:
            ports:
              - "27017"
```

This policy restricts MongoDB access to only the `backend-service` and `api-service` service accounts. Any other service trying to connect to MongoDB on port 27017 will be denied.

## Debugging MongoDB Connectivity

When things go wrong, start with these checks:

```bash
# Check if Istio recognizes the protocol
istioctl x describe service mongodb -n default

# Check endpoint health
istioctl proxy-config endpoint <client-pod> -n default | grep mongodb

# Check the listener config
istioctl proxy-config listener <client-pod> -n default --port 27017

# Look at sidecar logs
kubectl logs <mongodb-pod> -c istio-proxy -n default --tail=50
```

If connections are timing out, verify the port name is correct. If you see authentication errors, check for mTLS mismatches. If connections drop randomly, look at the connection pool limits and keepalive settings.

MongoDB and Istio work well together when configured properly. The key points are explicit protocol naming, appropriate connection pool sizes, and careful mTLS configuration, especially when mixing mesh and non-mesh clients.
