# How to Set Up Service Discovery Across Namespaces on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Service Discovery, Namespaces, DNS, Kubernetes, Networking

Description: Configure cross-namespace service discovery on Talos Linux so workloads in different namespaces can find and communicate with each other reliably.

---

Kubernetes namespaces provide logical isolation for your workloads, but services often need to communicate across namespace boundaries. A frontend in the `web` namespace needs to reach an API in the `backend` namespace, which in turn talks to a database in the `data` namespace. On Talos Linux, cross-namespace service discovery works through DNS out of the box, but there are best practices, configuration options, and potential pitfalls worth knowing about.

## How Cross-Namespace DNS Works

Every Kubernetes service gets a DNS record in the format:

```
<service-name>.<namespace>.svc.cluster.local
```

By default, pods can resolve services in any namespace using this fully qualified domain name (FQDN). A pod in the `web` namespace can reach a service in the `backend` namespace like this:

```bash
# From a pod in the "web" namespace
curl http://api-server.backend.svc.cluster.local:8080/v1/users
```

The short name `api-server` only works within the same namespace. To reach a different namespace, you need at least `api-server.backend`.

```bash
# These all work from any namespace:
curl http://api-server.backend                          # Short cross-namespace form
curl http://api-server.backend.svc                      # With svc suffix
curl http://api-server.backend.svc.cluster.local        # Fully qualified
```

## Understanding the Search Domains

When a pod makes a DNS query, Kubernetes configures search domains in `/etc/resolv.conf`:

```
nameserver 10.96.0.10
search web.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
```

The search domains determine how short names are expanded. For a pod in the `web` namespace:

- `api-server` tries `api-server.web.svc.cluster.local` first (same namespace)
- `api-server.backend` tries `api-server.backend.web.svc.cluster.local` (fails), then `api-server.backend.svc.cluster.local` (succeeds)

This means cross-namespace lookups with two-part names like `api-server.backend` generate an extra failing query before succeeding. For frequently accessed cross-namespace services, use the full FQDN to avoid this wasted query:

```python
# In your application configuration
# Less efficient - generates a failed query first
DATABASE_HOST = "postgres.data"

# More efficient - goes directly to the right answer
DATABASE_HOST = "postgres.data.svc.cluster.local"
```

## Creating Services for Cross-Namespace Discovery

Here is a typical multi-namespace setup on Talos Linux:

```yaml
# backend/api-service.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: backend
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api
        image: my-api:latest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: api-server
  namespace: backend
spec:
  selector:
    app: api-server
  ports:
  - port: 80
    targetPort: 8080
```

```yaml
# web/frontend.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: web
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: web
spec:
  replicas: 2
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: my-frontend:latest
        env:
        # Reference the backend service in another namespace
        - name: API_URL
          value: "http://api-server.backend.svc.cluster.local:80"
        ports:
        - containerPort: 3000
```

## ExternalName Services for Namespace Aliasing

If you want a cleaner interface for cross-namespace access, use ExternalName services to create a local alias:

```yaml
# In the "web" namespace, create an alias for the backend API
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: web
spec:
  type: ExternalName
  externalName: api-server.backend.svc.cluster.local
```

Now pods in the `web` namespace can simply use `api` as if the service were local:

```bash
# From a pod in the "web" namespace
curl http://api:80/v1/users
```

This abstracts away the namespace detail from the application code, making it easier to refactor namespaces later.

## Network Policies for Cross-Namespace Traffic

By default, all pods can communicate with all other pods across namespaces. In production, you should restrict this with network policies:

```yaml
# Allow the web namespace to access the backend namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-web-to-backend
  namespace: backend
spec:
  podSelector:
    matchLabels:
      app: api-server
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: web
    ports:
    - protocol: TCP
      port: 8080
```

```yaml
# Default deny all ingress in the backend namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: backend
spec:
  podSelector: {}
  policyTypes:
  - Ingress
```

Make sure DNS traffic is also allowed when using default-deny policies:

```yaml
# Allow DNS egress from the backend namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: backend
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
```

## Service Discovery with SRV Records

For stateful services that need port discovery in addition to hostname resolution, use SRV records. Kubernetes automatically creates SRV records for named service ports:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: data
spec:
  selector:
    app: postgres
  ports:
  - name: pg
    port: 5432
    targetPort: 5432
```

Query the SRV record from any namespace:

```bash
# SRV record format: _<port-name>._<protocol>.<service>.<namespace>.svc.cluster.local
kubectl run dns-test --rm -it --restart=Never --image=busybox -- \
    nslookup -type=SRV _pg._tcp.postgres.data.svc.cluster.local
```

This is particularly useful for service meshes and client-side load balancing that need both the host and port.

## Testing Cross-Namespace Discovery

Verify that service discovery works across all your namespaces:

```bash
#!/bin/bash
# test-cross-namespace-dns.sh
# Tests DNS resolution across namespaces

NAMESPACES=("web" "backend" "data" "monitoring")
SERVICES=(
    "frontend.web"
    "api-server.backend"
    "postgres.data"
    "prometheus.monitoring"
)

for ns in "${NAMESPACES[@]}"; do
    echo "=== Testing from namespace: $ns ==="
    for svc in "${SERVICES[@]}"; do
        RESULT=$(kubectl run dns-test-$RANDOM --rm -i --restart=Never \
            --namespace="$ns" --image=busybox -- \
            nslookup "$svc.svc.cluster.local" 2>/dev/null | grep "Address" | tail -1)
        echo "  $svc -> $RESULT"
    done
    echo ""
done
```

## Service Discovery Patterns

Here are common patterns for organizing cross-namespace communication:

### Shared Services Namespace

Put common services in a shared namespace that everyone accesses:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: shared-services
  labels:
    purpose: shared
---
# Redis cache used by multiple namespaces
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: shared-services
spec:
  selector:
    app: redis
  ports:
  - port: 6379
```

### Service Catalog ConfigMap

Maintain a ConfigMap that documents available services across namespaces:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: service-catalog
  namespace: default
data:
  services.yaml: |
    services:
      - name: api-server
        namespace: backend
        port: 80
        fqdn: api-server.backend.svc.cluster.local
        description: "Main API server"

      - name: postgres
        namespace: data
        port: 5432
        fqdn: postgres.data.svc.cluster.local
        description: "Primary PostgreSQL database"

      - name: redis
        namespace: shared-services
        port: 6379
        fqdn: redis.shared-services.svc.cluster.local
        description: "Shared Redis cache"
```

## Debugging Cross-Namespace Issues

When cross-namespace discovery fails, check these things:

```bash
# 1. Verify the service exists in the target namespace
kubectl get svc -n backend api-server

# 2. Verify the service has endpoints (pods are running and selected)
kubectl get endpoints -n backend api-server

# 3. Test DNS resolution explicitly
kubectl run dns-debug --rm -it --restart=Never --image=alpine -- sh -c '
    apk add --no-cache bind-tools > /dev/null 2>&1
    dig api-server.backend.svc.cluster.local @10.96.0.10
'

# 4. Check network policies
kubectl get networkpolicies -n backend

# 5. Test actual connectivity (not just DNS)
kubectl run conn-test --rm -it --restart=Never --namespace web --image=busybox -- \
    wget -q -O- -T5 http://api-server.backend.svc.cluster.local:80/health
```

## Wrapping Up

Cross-namespace service discovery on Talos Linux works through standard Kubernetes DNS. The key things to remember are: use fully qualified domain names for efficiency, set up ExternalName services for clean abstraction, implement network policies to control cross-namespace traffic, and always make sure DNS egress is allowed when using default-deny policies. Keep your namespace structure intentional and document which services are meant to be accessed from other namespaces.
