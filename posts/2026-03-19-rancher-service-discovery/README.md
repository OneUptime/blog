# How to Set Up Service Discovery in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Service Discovery, DNS

Description: A practical guide to setting up and using service discovery mechanisms in Rancher-managed Kubernetes clusters.

Service discovery enables applications to find and communicate with each other dynamically without hardcoding IP addresses. Kubernetes provides built-in service discovery through DNS and environment variables, and Rancher makes it easy to manage these mechanisms. This guide covers how to set up and use service discovery in Rancher.

## Prerequisites

- A running Rancher instance (v2.6 or later)
- A managed Kubernetes cluster
- kubectl access to your cluster

## Understanding Service Discovery in Kubernetes

Kubernetes offers two primary service discovery mechanisms:

1. **DNS-based discovery**: CoreDNS automatically creates DNS records for services
2. **Environment variable-based discovery**: Kubernetes injects service information into pod environment variables

## Step 1: DNS-Based Service Discovery

When you create a service, Kubernetes automatically registers DNS entries. Deploy a backend service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-api
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend-api
  template:
    metadata:
      labels:
        app: backend-api
    spec:
      containers:
      - name: api
        image: nginx:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: backend-api
  namespace: default
spec:
  selector:
    app: backend-api
  ports:
  - name: http
    port: 80
    targetPort: 80
```

```bash
kubectl apply -f backend-api.yaml
```

Other pods can now reach this service using:

```plaintext
backend-api                              # same namespace
backend-api.default                      # with namespace
backend-api.default.svc.cluster.local    # fully qualified
```

## Step 2: Verify DNS Discovery

```bash
kubectl run dns-test --image=busybox:1.36 --restart=Never --rm -it -- sh
```

Inside the pod:

```bash
nslookup backend-api
nslookup backend-api.default.svc.cluster.local
wget -qO- http://backend-api/
```

## Step 3: Environment Variable Discovery

Kubernetes injects same-namespace service information as environment variables into pods that start after the service is created:

```bash
kubectl run env-test --image=busybox --restart=Never --rm -i -- env | grep BACKEND
```

Output:

```plaintext
BACKEND_API_SERVICE_HOST=10.43.0.100
BACKEND_API_SERVICE_PORT=80
BACKEND_API_PORT=tcp://10.43.0.100:80
```

Note that the service must exist before the pod starts for environment variables to be injected.

## Step 4: Cross-Namespace Service Discovery

Services in different namespaces can discover each other using the namespace qualifier:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: frontend-ns
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
        image: nginx:latest
        env:
        - name: BACKEND_URL
          value: "http://backend-api.default.svc.cluster.local"
```

Create the namespace and deploy:

```bash
kubectl create namespace frontend-ns
kubectl apply -f frontend.yaml
```

## Step 5: Headless Service Discovery

For stateful applications that need to discover individual pod IPs:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: db-headless
  namespace: default
spec:
  clusterIP: None
  selector:
    app: database
  ports:
  - port: 5432
    targetPort: 5432
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
  namespace: default
spec:
  serviceName: db-headless
  replicas: 3
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      containers:
      - name: db
        image: postgres:15
        ports:
        - containerPort: 5432
```

DNS resolution returns all pod IPs:

```bash
kubectl run test --image=busybox --restart=Never --rm -it -- nslookup db-headless
```

Individual pods are addressable:

```plaintext
database-0.db-headless.default.svc.cluster.local
database-1.db-headless.default.svc.cluster.local
database-2.db-headless.default.svc.cluster.local
```

## Step 6: ExternalName Service Discovery

Map internal DNS names to external services:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-api
  namespace: default
spec:
  type: ExternalName
  externalName: api.external-provider.com
```

Now pods can use `external-api.default.svc.cluster.local` to resolve the external hostname through cluster DNS.

## Step 7: Service Discovery via Rancher UI

1. In Rancher, go to **Cluster Management**.
2. Open the target cluster with **Explore**.
3. Go to **Service Discovery** > **Services**.
4. Here you can view all services and their endpoints.
5. Click on a service to see its details, including:
   - ClusterIP address
   - DNS name
   - Endpoints (pod IPs)
   - Port mappings

## Step 8: Use Labels for Advanced Discovery

Organize services with labels for discovery:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: payments-v2
  namespace: default
  labels:
    app: payments
    version: v2
    tier: backend
spec:
  selector:
    app: payments
    version: v2
  ports:
  - port: 80
    targetPort: 8080
```

Query services by label and inspect their backing EndpointSlices:

```bash
kubectl get svc -l tier=backend
kubectl get svc -l app=payments
kubectl get endpointslice -l kubernetes.io/service-name=payments-v2
```

## Step 9: Service Discovery with SRV Records

SRV records provide port information along with IP addresses for named service ports:

```bash
kubectl run test --image=busybox --restart=Never --rm -it -- sh
```

Inside the pod:

```bash
nslookup -type=SRV _http._tcp.backend-api.default.svc.cluster.local
```

This returns the port number along with the target, useful for applications that need to discover both the host and port dynamically.

## Step 10: Monitor Service Discovery

Check the health of service discovery components:

```bash
# Verify CoreDNS is healthy

kubectl get pods -n kube-system -l k8s-app=kube-dns

# Check service EndpointSlices
kubectl get endpointslice --all-namespaces

# Verify DNS resolution
kubectl run test --image=busybox --restart=Never --rm -it -- nslookup backend-api

# Watch for EndpointSlice changes
kubectl get endpointslice -l kubernetes.io/service-name=backend-api -w
```

## Troubleshooting

- **DNS not resolving**: Check CoreDNS pods and logs
- **Stale endpoints**: Verify pod readiness probes are passing
- **Cross-namespace failures**: Use the fully qualified domain name
- **Environment variables missing**: Ensure the service was created before the pod
- **Slow discovery**: Adjust CoreDNS cache settings

## Summary

Service discovery is a fundamental capability of Kubernetes that Rancher makes easy to manage. DNS-based discovery provides automatic, dynamic resolution of service names to IP addresses, while headless services enable direct pod-to-pod communication. By combining these mechanisms with proper labeling and namespace organization, you can build reliable microservice architectures in your Rancher-managed clusters.
