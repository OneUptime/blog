# How to Use ExternalName Services to Map Kubernetes Services to External DNS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Services, DNS

Description: Learn how to use ExternalName services in Kubernetes to create DNS aliases for external services, enabling seamless integration between cluster workloads and external dependencies while maintaining consistent service discovery patterns.

---

ExternalName services provide a way to alias external DNS names inside your Kubernetes cluster. Instead of hardcoding external service endpoints in your application configuration, you create an ExternalName service that acts as a DNS alias. This approach maintains consistency with how your applications discover other services while enabling easy migration of external dependencies into the cluster later.

## Understanding ExternalName Services

Unlike ClusterIP, NodePort, or LoadBalancer services that route traffic to pods within your cluster, ExternalName services simply create a CNAME DNS record. When your application queries the service name, Kubernetes DNS returns the external DNS name you specified.

This mechanism is particularly useful when:
- You're migrating legacy services into Kubernetes incrementally
- You need to connect to managed cloud services (databases, caches, APIs)
- You want to abstract external dependencies behind service names
- You're preparing for eventual migration to in-cluster services

ExternalName services don't do any proxying or load balancing. They purely handle DNS resolution at the cluster level.

## Creating a Basic ExternalName Service

Let's create an ExternalName service for an external PostgreSQL database hosted at `postgres.example.com`:

```yaml
# external-database-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-db
  namespace: production
spec:
  type: ExternalName
  externalName: postgres.example.com
```

Apply this service:

```bash
kubectl apply -f external-database-service.yaml
```

Now any pod in the production namespace can connect to `postgres-db` instead of hardcoding `postgres.example.com`. Query the DNS to see it in action:

```bash
# Create a test pod with DNS tools
kubectl run dns-test --image=tutum/dnsutils --restart=Never -it --rm -- sh

# Inside the pod, query the service
nslookup postgres-db.production.svc.cluster.local
```

You'll see output showing the CNAME record:

```
Server:    10.96.0.10
Address:   10.96.0.10#53

postgres-db.production.svc.cluster.local canonical name = postgres.example.com
Name:   postgres.example.com
Address: 203.0.113.42
```

Your application connects to `postgres-db:5432` without knowing the actual external hostname.

## Practical Use Case: Cloud Database Integration

A common pattern is connecting to managed cloud databases. Here's an example for AWS RDS:

```yaml
# rds-postgres-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: user-database
  namespace: backend
  labels:
    app: user-service
    component: database
spec:
  type: ExternalName
  externalName: myapp-prod.c9akciq32.us-east-1.rds.amazonaws.com
```

Create a ConfigMap to store the connection details:

```yaml
# database-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: database-config
  namespace: backend
data:
  DB_HOST: user-database  # Points to the ExternalName service
  DB_PORT: "5432"
  DB_NAME: users
---
apiVersion: v1
kind: Secret
metadata:
  name: database-credentials
  namespace: backend
type: Opaque
stringData:
  DB_USER: app_user
  DB_PASSWORD: "your-secure-password"
```

Use these in your application deployment:

```yaml
# app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: user-service
  template:
    metadata:
      labels:
        app: user-service
    spec:
      containers:
      - name: app
        image: mycompany/user-service:v1.2.3
        envFrom:
        - configMapRef:
            name: database-config
        - secretRef:
            name: database-credentials
        ports:
        - containerPort: 8080
```

Now your application connects to the database using the ExternalName service. When you eventually migrate to a database running in Kubernetes, you simply change the service type from ExternalName to ClusterIP without touching application code.

## ExternalName for Multi-Region Services

ExternalName services help manage multi-region deployments. Create region-specific services that point to the nearest external endpoint:

```yaml
# redis-cache-us-east.yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-cache
  namespace: production
spec:
  type: ExternalName
  externalName: redis-us-east-1.cache.amazonaws.com
---
# redis-cache-eu-west.yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-cache
  namespace: production
spec:
  type: ExternalName
  externalName: redis-eu-west-1.cache.amazonaws.com
```

Deploy the appropriate manifest based on cluster location. Applications use the same service name (`redis-cache`) regardless of region.

## Combining ExternalName with Headless Services

You can create sophisticated DNS patterns by combining ExternalName services with custom endpoint objects. This gives you fine-grained control over DNS resolution:

```yaml
# external-api-endpoints.yaml
apiVersion: v1
kind: Service
metadata:
  name: external-api
  namespace: default
spec:
  type: ExternalName
  externalName: api.external-service.com
  ports:
  - protocol: TCP
    port: 443
    targetPort: 443
```

## Migrating from ExternalName to ClusterIP

The beauty of ExternalName services shines when you migrate external services into your cluster. Here's the migration path:

**Step 1: Start with ExternalName**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: payment-api
spec:
  type: ExternalName
  externalName: payments.external-vendor.com
```

**Step 2: Deploy the service inside your cluster**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: payment-api
  template:
    metadata:
      labels:
        app: payment-api
    spec:
      containers:
      - name: api
        image: mycompany/payment-api:v1.0.0
        ports:
        - containerPort: 8080
```

**Step 3: Change the service to ClusterIP**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: payment-api
spec:
  type: ClusterIP  # Changed from ExternalName
  selector:
    app: payment-api
  ports:
  - protocol: TCP
    port: 443
    targetPort: 8080
```

Apply the updated service:

```bash
kubectl apply -f payment-api-service.yaml
```

Your applications continue working without any changes because they still connect to the same service name.

## Handling Ports with ExternalName Services

ExternalName services don't proxy traffic, so port specifications work differently. The port field in an ExternalName service is purely informational - it doesn't perform any port mapping:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-api
spec:
  type: ExternalName
  externalName: api.example.com
  ports:
  - name: https
    protocol: TCP
    port: 443  # Documentation only - not enforced
```

Applications must connect to the correct port on the external service. The port field helps document what port the external service uses but doesn't enforce it.

## Security Considerations

ExternalName services bypass Kubernetes network policies. Traffic goes directly from the pod to the external DNS name without going through kube-proxy or service endpoints. This means:

1. Network policies targeting the service name won't work
2. Service mesh features (mutual TLS, traffic policies) don't apply
3. You can't use service-level authentication

If you need policy enforcement for external services, use a different approach:

```yaml
# Create an egress gateway pod
apiVersion: v1
kind: Pod
metadata:
  name: egress-gateway
  labels:
    app: egress-gateway
spec:
  containers:
  - name: proxy
    image: nginx:alpine
    ports:
    - containerPort: 80
---
# Point service to the gateway instead
apiVersion: v1
kind: Service
metadata:
  name: external-api
spec:
  type: ClusterIP
  selector:
    app: egress-gateway
  ports:
  - port: 80
```

Configure the egress gateway to proxy requests to the actual external service, giving you policy enforcement.

## Debugging ExternalName Services

When things don't work, start by verifying DNS resolution:

```bash
# Check service configuration
kubectl get svc payment-api -o yaml

# Test DNS resolution from a pod
kubectl run dns-test --image=tutum/dnsutils --rm -it -- nslookup payment-api.default.svc.cluster.local
```

Verify the external DNS name resolves correctly:

```bash
kubectl run dns-test --image=tutum/dnsutils --rm -it -- nslookup api.external-vendor.com
```

Check if the issue is network connectivity rather than DNS:

```bash
kubectl run curl-test --image=curlimages/curl --rm -it -- curl -v https://payment-api.default.svc.cluster.local
```

## Alternatives to ExternalName

ExternalName isn't always the best solution. Consider these alternatives:

**Use Endpoints objects for IP-based external services:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-db
spec:
  ports:
  - port: 5432
---
apiVersion: v1
kind: Endpoints
metadata:
  name: external-db
subsets:
- addresses:
  - ip: 203.0.113.42
  ports:
  - port: 5432
```

**Use Ingress for HTTP/HTTPS external services:**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: external-api-ingress
spec:
  rules:
  - host: internal-api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: external-api
            port:
              number: 443
```

**Use service mesh external service entries:**

```yaml
# Istio ServiceEntry example
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
  - api.external-vendor.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
```

ExternalName services provide a simple, effective way to integrate external dependencies into your Kubernetes service discovery mechanism. They work best for DNS-based external services where you don't need traffic proxying, policy enforcement, or service mesh features. Use them as a stepping stone when migrating services into Kubernetes or as a permanent solution for connecting to external managed services.
