# How to Use MongoDB with Service Mesh (Istio/Linkerd)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Service Mesh, Istio, Linkerd, Kubernetes

Description: Learn how to integrate MongoDB with Istio and Linkerd service meshes, handling TCP traffic routing, mTLS, and observability for database connections.

---

Service meshes like Istio and Linkerd manage service-to-service communication in Kubernetes. MongoDB uses the custom MongoDB Wire Protocol over TCP rather than HTTP, which requires special handling in service mesh configurations.

## The Challenge with MongoDB and Service Meshes

Most service mesh features - traffic policies, retries, circuit breaking - are designed for HTTP/gRPC. MongoDB's binary wire protocol is TCP-based, so meshes treat it as opaque TCP traffic. This limits some mesh features but mTLS encryption and basic traffic policies still apply.

## Setting Up Istio with MongoDB

MongoDB traffic in Istio must be explicitly identified as a TCP service. Create a `ServiceEntry` if MongoDB runs outside the mesh (e.g., Atlas):

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: mongodb-atlas
  namespace: default
spec:
  hosts:
    - "cluster0.example.mongodb.net"
  ports:
    - number: 27017
      name: mongo
      protocol: MONGO
  resolution: DNS
  location: MESH_EXTERNAL
```

Istio recognizes the `MONGO` protocol and applies appropriate handling.

## Enabling mTLS for MongoDB Traffic in Istio

To enforce mTLS between your application pods and an in-cluster MongoDB deployment:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: mongodb-mtls
  namespace: database
spec:
  selector:
    matchLabels:
      app: mongodb
  mtls:
    mode: STRICT
```

This ensures all traffic to MongoDB pods is encrypted and authenticated via Istio certificates.

## Configuring Linkerd with MongoDB

Linkerd automatically detects protocols, but for MongoDB you may need to mark the port as opaque TCP to prevent protocol detection interference:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mongodb
  namespace: database
  annotations:
    config.linkerd.io/opaque-ports: "27017"
spec:
  selector:
    app: mongodb
  ports:
    - port: 27017
      name: mongo
```

The `opaque-ports` annotation tells Linkerd to treat port 27017 as plain TCP and not attempt HTTP detection.

## Observing MongoDB Connections with Istio

Even with TCP traffic, Istio captures connection metrics. Query them in Prometheus:

```bash
# Total bytes sent to MongoDB
istio_tcp_sent_bytes_total{destination_service_name="mongodb"}

# Total TCP connections opened to MongoDB
istio_tcp_connections_opened_total{destination_service_name="mongodb"}
```

These metrics help you spot connection pool issues or unexpected traffic spikes.

## Traffic Policies for MongoDB

Use Istio DestinationRule to configure connection pool limits for TCP connections to MongoDB:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: mongodb-connection-pool
spec:
  host: mongodb.database.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 5s
        tcpKeepalive:
          time: 7200s
          interval: 75s
```

This caps total connections from the sidecar proxies to MongoDB at 200, preventing connection storms.

## Egress Policy for External MongoDB (Atlas)

If using MongoDB Atlas, configure an egress policy to allow traffic out of the mesh:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: mongodb-atlas-vs
spec:
  hosts:
    - "cluster0.example.mongodb.net"
  tcp:
    - match:
        - port: 27017
      route:
        - destination:
            host: "cluster0.example.mongodb.net"
            port:
              number: 27017
```

## Summary

Using MongoDB with Istio or Linkerd requires treating MongoDB connections as TCP traffic rather than HTTP. Configure protocol hints (MONGO in Istio, opaque-ports in Linkerd), apply mTLS via PeerAuthentication policies, and use TCP connection pool settings in DestinationRules to control connection behavior. For external MongoDB Atlas clusters, configure ServiceEntry and egress policies to allow mesh-managed traffic to flow outside the cluster securely.
