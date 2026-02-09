# How to Use Skupper for Layer 7 Multi-Cluster Service Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Multi-Cluster, Networking

Description: Learn how to deploy and configure Skupper for Layer 7 application-level networking across Kubernetes clusters without requiring special network infrastructure or VPNs.

---

Skupper creates a Virtual Application Network (VAN) that connects services across Kubernetes clusters using Layer 7 routing. Unlike solutions requiring VPNs or flat networks, Skupper works over standard network connections, making it ideal for hybrid cloud environments where clusters span public clouds, private data centers, and edge locations.

## Understanding Skupper Architecture

Skupper uses routers (based on Apache Qpid Dispatch) to create an application network:

- **Skupper Router**: Runs in each cluster as a deployment
- **Service Interconnect**: Exposes local services to remote clusters
- **Service Proxy**: Provides local endpoints for remote services
- **TLS Connections**: Secure communication between routers
- **No Special Network Requirements**: Works over standard HTTPS

This enables service-to-service communication without pod IP accessibility or DNS integration.

## Installing Skupper CLI

Install the skupper command-line tool:

```bash
# Linux
curl -fL https://github.com/skupperproject/skupper/releases/download/1.5.0/skupper-cli-1.5.0-linux-amd64.tgz | tar -xzf -
sudo install skupper /usr/local/bin/

# macOS
curl -fL https://github.com/skupperproject/skupper/releases/download/1.5.0/skupper-cli-1.5.0-mac-amd64.tgz | tar -xzf -
sudo install skupper /usr/local/bin/

# Verify
skupper version
```

## Initializing Skupper in Clusters

Initialize Skupper in cluster-1 (public cloud):

```bash
# Switch to cluster-1
kubectl config use-context cluster-1

# Initialize Skupper
skupper init \
  --site-name public-cloud \
  --enable-console \
  --enable-flow-collector \
  --console-auth internal \
  --console-user admin \
  --console-password changeme
```

This creates the skupper-site-controller deployment and supporting resources.

Check status:

```bash
skupper status
```

Output:

```
Skupper is enabled for namespace "default" in interior mode.
It is connected to 0 other sites.
```

Initialize Skupper in cluster-2 (private data center):

```bash
kubectl config use-context cluster-2

skupper init \
  --site-name private-datacenter \
  --enable-console \
  --enable-flow-collector
```

## Linking Clusters Together

Create a connection token from cluster-1:

```bash
kubectl config use-context cluster-1

skupper token create ~/cluster1-token.yaml
```

This generates a token file with connection details.

Use the token to link cluster-2 to cluster-1:

```bash
kubectl config use-context cluster-2

skupper link create ~/cluster1-token.yaml --name link-to-public
```

Verify the link:

```bash
skupper link status
```

Output:

```
Link link-to-public is connected
```

Check from cluster-1:

```bash
kubectl config use-context cluster-1
skupper link status
```

Now clusters are connected via Skupper's service network.

## Exposing Services Across Clusters

Deploy a backend service in cluster-2:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: backend:v1
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: default
spec:
  selector:
    app: backend
  ports:
  - port: 8080
    targetPort: 8080
```

Apply:

```bash
kubectl apply -f backend.yaml --context cluster-2
```

Expose the backend service to the Skupper network:

```bash
kubectl config use-context cluster-2

skupper expose deployment/backend --port 8080 --protocol http
```

This makes the backend service available in all connected clusters.

Verify:

```bash
skupper service status
```

Output:

```
Services exposed through Skupper:
┌─────────────┬───────────┬─────────────────────┬───────┐
│    NAME     │ ADDRESS   │       PROTOCOL      │ TARGETS │
├─────────────┼───────────┼─────────────────────┼───────┤
│ backend     │ backend:8080 │ http             │ 3       │
└─────────────┴───────────┴─────────────────────┴───────┘
```

## Accessing Remote Services

In cluster-1, the backend service is automatically available:

```bash
kubectl config use-context cluster-1

# Deploy a frontend that calls backend
kubectl create deployment frontend --image=frontend:v1

# Frontend can call http://backend:8080 even though backend is in cluster-2
kubectl exec -it deployment/frontend -- curl http://backend:8080/health
```

The request routes through Skupper to cluster-2 transparently.

## Exposing Services with Custom Names

Expose a service with a different name in the service network:

```bash
kubectl config use-context cluster-2

skupper expose deployment/backend \
  --port 8080 \
  --protocol http \
  --address api-service
```

Now the service is accessible as `api-service` instead of `backend` in other clusters:

```bash
# In cluster-1
kubectl exec -it deployment/frontend -- curl http://api-service:8080
```

## Working with Headless Services

Expose a headless service for direct pod access:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: database
  namespace: default
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

Apply:

```bash
kubectl apply -f database-headless.yaml --context cluster-2
```

Expose with Skupper:

```bash
skupper expose service/database --headless
```

Skupper creates proxy pods for each backend pod endpoint.

## Using HTTP/2 and gRPC Services

Expose a gRPC service:

```bash
skupper expose deployment/grpc-service \
  --port 50051 \
  --protocol http2
```

HTTP/2 protocol ensures proper gRPC handling across the service network.

## Implementing Multi-Cluster Load Balancing

Deploy the same service in multiple clusters for redundancy:

```bash
# In cluster-1
kubectl apply -f api-deployment.yaml
skupper expose deployment/api --port 8080

# In cluster-2
kubectl apply -f api-deployment.yaml
skupper expose deployment/api --port 8080
```

Skupper automatically load-balances requests across all instances in all clusters.

Check service targets:

```bash
skupper service status
```

Output shows targets from both clusters:

```
┌─────────┬───────────┬──────────┬──────────────────┐
│  NAME   │  ADDRESS  │ PROTOCOL │     TARGETS      │
├─────────┼───────────┼──────────┼──────────────────┤
│  api    │ api:8080  │ http     │ cluster-1: 3     │
│         │           │          │ cluster-2: 3     │
└─────────┴───────────┴──────────┴──────────────────┘
```

## Monitoring Skupper Network

Access the Skupper console:

```bash
kubectl config use-context cluster-1

# Get console URL
kubectl get service skupper-console -n default

# Port forward if needed
kubectl port-forward service/skupper-console 8080:8080
```

Open http://localhost:8080 in your browser. Login with admin/changeme.

The console shows:

- Connected sites (clusters)
- Exposed services
- Traffic flow between services
- Connection health

View service statistics:

```bash
skupper service status --verbose
```

List active connections:

```bash
skupper link status --verbose
```

## Implementing Security Policies

Skupper uses mutual TLS by default. Further restrict access with Kubernetes NetworkPolicies:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-skupper
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: default
    - podSelector:
        matchLabels:
          application: skupper-router
    ports:
    - protocol: TCP
      port: 8080
```

This allows only Skupper routers to access backend pods.

## Creating Site-to-Site Connections

For three clusters, create a mesh topology:

```bash
# Cluster-1 creates token
kubectl config use-context cluster-1
skupper token create ~/token-cluster1.yaml

# Cluster-2 creates token
kubectl config use-context cluster-2
skupper token create ~/token-cluster2.yaml

# Cluster-3 links to both
kubectl config use-context cluster-3
skupper link create ~/token-cluster1.yaml --name link-to-cluster1
skupper link create ~/token-cluster2.yaml --name link-to-cluster2
```

This creates a fully connected mesh where all clusters can reach services in any other cluster.

## Handling Connection Failures

Skupper automatically reconnects if links fail. Test resilience:

```bash
# Delete link from cluster-2
kubectl config use-context cluster-2
skupper link delete link-to-public

# Services become unavailable in cluster-1
# Recreate link
skupper link create ~/cluster1-token.yaml --name link-to-public

# Services automatically restore
```

Monitor link health:

```bash
skupper link status
```

## Using Skupper with Existing Service Mesh

Skupper works alongside service meshes like Istio:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: default
  labels:
    app: backend
  annotations:
    # Disable Istio sidecar injection for Skupper proxy
    sidecar.istio.io/inject: "false"
spec:
  selector:
    app: backend
  ports:
  - port: 8080
```

This prevents conflicts between Skupper routing and Istio sidecars.

## Best Practices

**Use separate namespaces**: Initialize Skupper in dedicated namespaces to isolate service networks:

```bash
kubectl create namespace skupper-network
skupper init --namespace skupper-network
```

**Secure console access**: Change default console password immediately:

```bash
skupper init --console-password $(openssl rand -base64 32)
```

**Monitor connection health**: Set up alerts for link failures:

```bash
kubectl get deployment skupper-router -o jsonpath='{.status.availableReplicas}'
```

**Limit exposed services**: Don't expose all services to the network. Only expose those genuinely needed cross-cluster.

**Use protocol-specific settings**: Specify protocols correctly (http, http2, tcp) to ensure proper routing behavior.

**Plan network topology**: For many clusters, use hub-and-spoke rather than full mesh to reduce connection overhead.

**Test failover scenarios**: Regularly test what happens when clusters or links become unavailable.

**Document service network**: Maintain a diagram showing which services are exposed, which clusters link to which, and the expected traffic patterns.

Skupper provides simple, secure multi-cluster service networking without requiring special network infrastructure. By working at Layer 7 and using standard network connections, it enables hybrid cloud architectures that span diverse environments while maintaining service-to-service communication.
