# How to Configure Authorization for MongoDB with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MongoDB, Authorization, Security, Kubernetes, Service Mesh

Description: Step-by-step guide to setting up Istio authorization policies for MongoDB TCP traffic to control which services can access your database.

---

MongoDB runs on TCP, not HTTP, which means configuring Istio authorization for it works a bit differently than for your typical REST APIs. You cannot match on HTTP paths or methods, but you can still control access based on source identity, namespaces, IP addresses, and ports. This guide covers how to lock down MongoDB access in your Kubernetes cluster using Istio authorization policies.

## The Challenge with TCP Services

Istio's authorization policies have great support for HTTP traffic. You can match on paths, methods, headers, and all sorts of request attributes. But MongoDB uses its own binary wire protocol over TCP. The Envoy sidecar proxy sees this as an opaque TCP stream, so HTTP-specific matching fields are off the table.

What you can match on for TCP services:

- Source namespace
- Source principal (service account identity)
- Source IP address
- Destination port
- Source and destination workload labels (via selector)

That is still plenty to build effective access control for your database.

## Prerequisites

Make sure your MongoDB pods are part of the mesh with sidecar injection enabled:

```bash
kubectl label namespace mongodb istio-injection=enabled
```

Deploy MongoDB (if you have not already). Here is a minimal deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongodb
  namespace: mongodb
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
        image: mongo:7
        ports:
        - containerPort: 27017
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb
  namespace: mongodb
spec:
  selector:
    app: mongodb
  ports:
  - port: 27017
    targetPort: 27017
    name: tcp-mongo
```

Note that the port name starts with `tcp-`. This is important because Istio uses port naming conventions to determine the protocol. Naming it `tcp-mongo` tells Istio to treat this as TCP traffic.

## Denying All Traffic by Default

The first step in securing MongoDB is to deny all traffic to it by default, then selectively allow only the services that need access:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all-mongodb
  namespace: mongodb
spec:
  selector:
    matchLabels:
      app: mongodb
  action: ALLOW
  rules: []
```

An ALLOW policy with an empty rules list effectively denies everything. No request can match an empty rule set, so all traffic to the MongoDB workload is blocked.

You can verify this by trying to connect from another pod:

```bash
kubectl exec -it <client-pod> -n default -- mongosh --host mongodb.mongodb.svc.cluster.local --port 27017
```

This should time out or fail with a connection refused error.

## Allowing Specific Services to Access MongoDB

Now, allow only your backend service to connect:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-backend-to-mongodb
  namespace: mongodb
spec:
  selector:
    matchLabels:
      app: mongodb
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/backend/sa/backend-service"
    to:
    - operation:
        ports:
        - "27017"
```

This policy says: allow traffic to MongoDB on port 27017 only from the service account `backend-service` in the `backend` namespace. The `principals` field uses the SPIFFE identity format that Istio assigns to each workload based on its Kubernetes service account.

Make sure the backend pods are running under the correct service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: backend-service
  namespace: backend
```

And reference it in the deployment:

```yaml
spec:
  template:
    spec:
      serviceAccountName: backend-service
```

## Allowing Multiple Services

If you have multiple services that need MongoDB access, you can list them all in the same policy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-services-to-mongodb
  namespace: mongodb
spec:
  selector:
    matchLabels:
      app: mongodb
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/backend/sa/backend-service"
        - "cluster.local/ns/backend/sa/worker-service"
        - "cluster.local/ns/analytics/sa/analytics-service"
    to:
    - operation:
        ports:
        - "27017"
```

Multiple values in the `principals` list are ORed, so a request from any of these identities will be allowed.

## Namespace-Based Access Control

If you want to allow all services in a specific namespace to access MongoDB, use the `namespaces` field instead of `principals`:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-backend-namespace
  namespace: mongodb
spec:
  selector:
    matchLabels:
      app: mongodb
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces:
        - "backend"
    to:
    - operation:
        ports:
        - "27017"
```

This is broader but simpler to manage. Any service in the `backend` namespace can connect to MongoDB.

## Handling MongoDB Replica Sets

If you are running a MongoDB replica set, the MongoDB nodes need to communicate with each other for replication. You need to allow this inter-node traffic:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-mongo-replication
  namespace: mongodb
spec:
  selector:
    matchLabels:
      app: mongodb
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/mongodb/sa/mongodb"
    to:
    - operation:
        ports:
        - "27017"
```

This allows MongoDB pods (running under the `mongodb` service account in the `mongodb` namespace) to talk to each other on port 27017. Without this, replica set elections and data replication will break.

## Combining All Policies Together

Here is a complete example that puts it all together:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: mongodb-access-policy
  namespace: mongodb
spec:
  selector:
    matchLabels:
      app: mongodb
  action: ALLOW
  rules:
  # Allow MongoDB replica set members to communicate
  - from:
    - source:
        principals:
        - "cluster.local/ns/mongodb/sa/mongodb"
    to:
    - operation:
        ports:
        - "27017"
  # Allow backend services
  - from:
    - source:
        principals:
        - "cluster.local/ns/backend/sa/backend-service"
        - "cluster.local/ns/backend/sa/worker-service"
    to:
    - operation:
        ports:
        - "27017"
```

## Enabling Strict mTLS

For the principal-based matching to work, mTLS must be enabled between the services. Apply a PeerAuthentication policy:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: mongodb-strict-mtls
  namespace: mongodb
spec:
  selector:
    matchLabels:
      app: mongodb
  mtls:
    mode: STRICT
```

With `STRICT` mode, MongoDB will only accept connections from services with valid mTLS certificates issued by Istio's CA. This ensures that the principal identity is always verified.

## Testing the Configuration

From an allowed service:

```bash
kubectl exec -it <backend-pod> -n backend -- mongosh --host mongodb.mongodb.svc.cluster.local --port 27017 --eval "db.runCommand({ping: 1})"
```

This should succeed with `{ ok: 1 }`.

From a non-allowed service:

```bash
kubectl exec -it <frontend-pod> -n frontend -- mongosh --host mongodb.mongodb.svc.cluster.local --port 27017 --eval "db.runCommand({ping: 1})"
```

This should fail with a connection error.

Check the proxy logs if something is not working:

```bash
kubectl logs <mongodb-pod> -c istio-proxy -n mongodb | grep rbac
```

## Wrapping Up

Securing MongoDB with Istio authorization policies gives you network-level access control without modifying your application code. Even though MongoDB uses TCP rather than HTTP, the combination of service identity, namespace, and port-based matching provides solid control over who can reach your database. Combined with strict mTLS, you get both authentication and authorization for your database traffic with no changes to MongoDB itself.
