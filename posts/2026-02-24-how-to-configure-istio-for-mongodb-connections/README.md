# How to Configure Istio for MongoDB Connections

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MongoDB, Service Mesh, Kubernetes, Database

Description: Practical guide for routing MongoDB traffic through Istio service mesh with proper TCP configuration, mTLS encryption, and replica set handling.

---

MongoDB is a popular choice for applications that need flexible document storage, and deploying it in Kubernetes is straightforward with operators like the MongoDB Community Operator. Adding Istio to the mix gives you encrypted traffic, access control, and observability, but MongoDB's wire protocol and replica set architecture require some careful configuration.

This guide covers the key configurations you need to get MongoDB working properly behind Istio.

## MongoDB's Protocol and Istio

MongoDB uses its own binary wire protocol over TCP. Istio cannot inspect or understand the contents of MongoDB packets, so all MongoDB traffic is handled as opaque TCP. This means you get connection-level metrics and security, but not request-level visibility like you would with HTTP services.

The important thing is to tell Istio that this is TCP traffic by using the correct port naming convention.

## Basic MongoDB Deployment with Istio

Here is a straightforward MongoDB deployment and service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb
  namespace: database
  labels:
    app: mongodb
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
              name: tcp-mongo
          env:
            - name: MONGO_INITDB_ROOT_USERNAME
              valueFrom:
                secretKeyRef:
                  name: mongodb-credentials
                  key: username
            - name: MONGO_INITDB_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mongodb-credentials
                  key: password
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb
  namespace: database
spec:
  selector:
    app: mongodb
  ports:
    - name: tcp-mongo
      port: 27017
      targetPort: 27017
```

The port name `tcp-mongo` tells Istio to handle this as TCP traffic. You could also use just `mongo` as the port name since Istio recognizes it, but sticking with the `tcp-` prefix is more explicit.

## Handling MongoDB Replica Sets

MongoDB replica sets are where things get interesting with Istio. A replica set has a primary node and secondary nodes, and the MongoDB driver discovers the topology by connecting to any member and reading the replica set configuration. The configuration includes the hostnames of all members.

This means each replica set member needs a resolvable hostname. If you are using a StatefulSet (which you should for replica sets), each pod gets a stable DNS name:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mongodb-headless
  namespace: database
spec:
  clusterIP: None
  selector:
    app: mongodb
  ports:
    - name: tcp-mongo
      port: 27017
      targetPort: 27017
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
  namespace: database
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
    spec:
      containers:
        - name: mongodb
          image: mongo:7.0
          ports:
            - containerPort: 27017
              name: tcp-mongo
          command:
            - mongod
            - "--replSet"
            - rs0
            - "--bind_ip_all"
```

With this setup, each pod gets a DNS name like `mongodb-0.mongodb-headless.database.svc.cluster.local`. The MongoDB driver can resolve and connect to these individual hostnames.

## DestinationRule for MongoDB

Configure connection pooling and mTLS:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: mongodb
  namespace: database
spec:
  host: mongodb-headless.database.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 10s
        idleTimeout: 1800s
    tls:
      mode: ISTIO_MUTUAL
```

MongoDB drivers typically maintain connection pools, and a single application instance might hold 50-100 connections. The `maxConnections` value should account for all your application instances connecting to each MongoDB member.

## VirtualService for TCP Routing

A basic TCP VirtualService for MongoDB:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: mongodb
  namespace: database
spec:
  hosts:
    - mongodb-headless.database.svc.cluster.local
  tcp:
    - match:
        - port: 27017
      route:
        - destination:
            host: mongodb-headless.database.svc.cluster.local
            port:
              number: 27017
```

## Connecting to MongoDB Atlas or External MongoDB

For MongoDB Atlas or any external MongoDB deployment, create a ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: mongodb-atlas
  namespace: database
spec:
  hosts:
    - "*.mongodb.net"
  ports:
    - number: 27017
      name: tcp-mongo
      protocol: TCP
  location: MESH_EXTERNAL
  resolution: NONE
```

The wildcard host `*.mongodb.net` covers the SRV-based connection strings that Atlas uses. MongoDB Atlas clusters have multiple hosts like `shard-00-00.abc.mongodb.net`, so the wildcard is necessary.

Add a DestinationRule for TLS since Atlas requires encrypted connections:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: mongodb-atlas-tls
  namespace: database
spec:
  host: "*.mongodb.net"
  trafficPolicy:
    tls:
      mode: SIMPLE
```

## Authorization Policy for MongoDB

Lock down who can access MongoDB:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: mongodb-access
  namespace: database
spec:
  selector:
    matchLabels:
      app: mongodb
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/app/sa/api-service
              - cluster.local/ns/app/sa/data-processor
      to:
        - operation:
            ports: ["27017"]
```

## Dealing with Server-First Protocols

Like MySQL, MongoDB uses a server-first protocol where the server sends data before the client. This has historically caused issues with Istio's protocol sniffing. The fix is simple: always explicitly name your ports with the `tcp-` prefix.

If you are running into connection issues, verify that Istio is treating the traffic as TCP:

```bash
istioctl proxy-config listener <pod-name> -n database --port 27017 -o json
```

You should see a `tcpProxy` filter chain, not an `httpConnectionManager`.

## Sidecar Configuration to Limit Scope

If your MongoDB pods only need to communicate with specific services, use a Sidecar resource to limit the proxy configuration scope:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: mongodb-sidecar
  namespace: database
spec:
  workloadSelector:
    labels:
      app: mongodb
  egress:
    - hosts:
        - "istio-system/*"
        - "database/*"
```

This tells the MongoDB sidecar to only know about services in the `database` namespace and `istio-system`. This reduces the memory footprint of the Envoy proxy since it does not need the configuration for every service in the mesh.

## Monitoring MongoDB Connections

Track your MongoDB connections through Istio with these Prometheus queries:

```text
istio_tcp_connections_opened_total{destination_service="mongodb-headless.database.svc.cluster.local"}
istio_tcp_sent_bytes_total{destination_service="mongodb-headless.database.svc.cluster.local"}
```

You can set up alerts when connection counts spike or when the total connections approach your `maxConnections` limit.

## Common Pitfalls

A few things that trip people up when running MongoDB behind Istio:

1. Replica set members must be individually addressable. Use a headless Service with a StatefulSet.
2. MongoDB SRV records (used by `mongodb+srv://` connection strings) need DNS resolution to work through the sidecar. Make sure your ServiceEntry covers all the hostnames.
3. Long-lived connections are normal for MongoDB. Set the `idleTimeout` in your DestinationRule to at least 30 minutes.
4. MongoDB uses a heartbeat between replica set members every 2 seconds. Do not set aggressive connection timeouts that would interfere with this.

Getting MongoDB right with Istio takes a bit of upfront configuration, but once it is running, you benefit from automatic encryption, access control at the network level, and visibility into connection patterns without touching your application code.
