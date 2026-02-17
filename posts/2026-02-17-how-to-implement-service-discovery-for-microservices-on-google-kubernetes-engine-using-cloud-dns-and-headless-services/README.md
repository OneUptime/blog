# How to Implement Service Discovery for Microservices on Google Kubernetes Engine Using Cloud DNS and Headless Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Kubernetes, Service Discovery, Cloud DNS, Microservices, Networking

Description: Learn how to implement service discovery for microservices on GKE using Kubernetes DNS, headless services, and Cloud DNS for external service resolution.

---

In a microservices architecture, services need to find each other. Hardcoding IP addresses is fragile because pods come and go as Kubernetes scales deployments up and down. Service discovery solves this by providing a stable way for services to locate each other by name.

GKE provides several layers of service discovery. Kubernetes built-in DNS handles service-to-service communication within the cluster. Headless services give you direct pod-to-pod access when you need it. And Cloud DNS extends service discovery beyond the cluster to other GCP resources.

## Kubernetes DNS Basics

Every GKE cluster runs a DNS server (usually CoreDNS). When you create a Kubernetes Service, the DNS server automatically creates a DNS record for it. Other pods can reach the service using its DNS name.

The DNS naming convention is:

```text
<service-name>.<namespace>.svc.cluster.local
```

For example, a service called `user-service` in the `default` namespace is reachable at `user-service.default.svc.cluster.local`. Within the same namespace, you can simply use `user-service`.

## Setting Up a Microservices Example

Let me create a simple three-service architecture: an API gateway, a user service, and an order service.

```yaml
# k8s/user-service.yaml - User service deployment and service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: user-service
  namespace: default
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
        - name: user-service
          image: us-central1-docker.pkg.dev/my-project/my-repo/user-service:v1
          ports:
            - containerPort: 8080
          env:
            - name: SERVICE_NAME
              value: "user-service"
---
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: default
spec:
  type: ClusterIP
  selector:
    app: user-service
  ports:
    - port: 80
      targetPort: 8080
```

```yaml
# k8s/order-service.yaml - Order service deployment and service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
        - name: order-service
          image: us-central1-docker.pkg.dev/my-project/my-repo/order-service:v1
          ports:
            - containerPort: 8080
          env:
            - name: SERVICE_NAME
              value: "order-service"
            # Reference user-service by its DNS name
            - name: USER_SERVICE_URL
              value: "http://user-service.default.svc.cluster.local"
---
apiVersion: v1
kind: Service
metadata:
  name: order-service
  namespace: default
spec:
  type: ClusterIP
  selector:
    app: order-service
  ports:
    - port: 80
      targetPort: 8080
```

The order service uses the DNS name `user-service.default.svc.cluster.local` to reach the user service. Kubernetes DNS resolves this to the ClusterIP of the user-service Service, which load balances traffic across all user-service pods.

## The API Gateway

Here is the API gateway that routes requests to the backend services.

```go
// main.go - API Gateway that discovers backend services via DNS
package main

import (
    "io"
    "log"
    "net/http"
    "os"
)

func main() {
    // Service URLs are resolved via Kubernetes DNS
    userServiceURL := os.Getenv("USER_SERVICE_URL")
    orderServiceURL := os.Getenv("ORDER_SERVICE_URL")

    if userServiceURL == "" {
        userServiceURL = "http://user-service"
    }
    if orderServiceURL == "" {
        orderServiceURL = "http://order-service"
    }

    // Proxy requests to the user service
    http.HandleFunc("/api/users", func(w http.ResponseWriter, r *http.Request) {
        proxyRequest(w, r, userServiceURL+"/users")
    })

    // Proxy requests to the order service
    http.HandleFunc("/api/orders", func(w http.ResponseWriter, r *http.Request) {
        proxyRequest(w, r, orderServiceURL+"/orders")
    })

    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("ok"))
    })

    log.Println("API Gateway starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}

// proxyRequest forwards the request to the target URL
func proxyRequest(w http.ResponseWriter, r *http.Request, targetURL string) {
    resp, err := http.Get(targetURL)
    if err != nil {
        http.Error(w, "Service unavailable: "+err.Error(), http.StatusServiceUnavailable)
        return
    }
    defer resp.Body.Close()

    w.Header().Set("Content-Type", resp.Header.Get("Content-Type"))
    w.WriteHeader(resp.StatusCode)
    io.Copy(w, resp.Body)
}
```

```yaml
# k8s/api-gateway.yaml - API gateway deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
        - name: api-gateway
          image: us-central1-docker.pkg.dev/my-project/my-repo/api-gateway:v1
          ports:
            - containerPort: 8080
          env:
            # Short DNS names work within the same namespace
            - name: USER_SERVICE_URL
              value: "http://user-service"
            - name: ORDER_SERVICE_URL
              value: "http://order-service"
---
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
spec:
  type: LoadBalancer
  selector:
    app: api-gateway
  ports:
    - port: 80
      targetPort: 8080
```

## Headless Services for Direct Pod Access

A regular Kubernetes Service gives you a single ClusterIP that load balances traffic. Sometimes you need to talk to specific pods directly - for example, when running a StatefulSet for a database cluster where each pod has a different role.

A headless service (with `clusterIP: None`) does not create a virtual IP. Instead, DNS returns the IP addresses of all pods behind the service.

```yaml
# k8s/cache-service.yaml - Headless service for direct pod access
apiVersion: v1
kind: Service
metadata:
  name: cache-cluster
spec:
  clusterIP: None  # This makes it a headless service
  selector:
    app: cache
  ports:
    - port: 6379
      targetPort: 6379
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: cache
spec:
  serviceName: "cache-cluster"
  replicas: 3
  selector:
    matchLabels:
      app: cache
  template:
    metadata:
      labels:
        app: cache
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          ports:
            - containerPort: 6379
```

With a headless service, each pod gets a DNS record:

```text
cache-0.cache-cluster.default.svc.cluster.local
cache-1.cache-cluster.default.svc.cluster.local
cache-2.cache-cluster.default.svc.cluster.local
```

You can query all pods with a DNS lookup on the service name.

```bash
# From inside a pod, resolve the headless service
nslookup cache-cluster.default.svc.cluster.local

# Returns all pod IPs, not a single ClusterIP
# Server:    10.0.0.10
# Address:   10.0.0.10#53
# Name:  cache-cluster.default.svc.cluster.local
# Address: 10.28.0.5
# Address: 10.28.1.3
# Address: 10.28.2.7
```

## Cross-Namespace Service Discovery

Services in different namespaces can discover each other using the full DNS name.

```yaml
# Create namespaces for different teams
apiVersion: v1
kind: Namespace
metadata:
  name: team-a
---
apiVersion: v1
kind: Namespace
metadata:
  name: team-b
```

A service in `team-a` can reach a service in `team-b`:

```python
# From a pod in team-a namespace
import requests

# Use the full DNS name to reach a service in team-b
response = requests.get("http://payment-service.team-b.svc.cluster.local/api/charge")
```

## Cloud DNS Integration for External Services

Sometimes your microservices need to discover services outside the cluster, like a Cloud SQL database or a third-party API. Cloud DNS for GKE allows you to create custom DNS entries that resolve within the cluster.

```bash
# Create a Cloud DNS managed zone for internal service discovery
gcloud dns managed-zones create internal-services \
    --dns-name="internal.example.com." \
    --description="Internal service discovery" \
    --visibility=private \
    --networks=my-vpc-network

# Add a record for a Cloud SQL instance
gcloud dns record-sets create db.internal.example.com. \
    --zone=internal-services \
    --type=A \
    --ttl=300 \
    --rrdatas="10.0.0.50"
```

Now pods in the cluster can reach the database using `db.internal.example.com`.

## ExternalName Services

Another approach for external service discovery is ExternalName services. These create a CNAME record in the cluster DNS.

```yaml
# k8s/external-db.yaml - ExternalName service for Cloud SQL
apiVersion: v1
kind: Service
metadata:
  name: database
  namespace: default
spec:
  type: ExternalName
  externalName: my-db-instance.us-central1.cloudsql.example.com
```

Now any pod can connect to `database` and it resolves to the external hostname.

## Debugging DNS Issues

When service discovery is not working, here is how to debug.

```bash
# Run a debug pod with DNS tools
kubectl run dns-debug --image=busybox:1.36 --restart=Never -- sleep 3600

# Exec into the pod
kubectl exec -it dns-debug -- sh

# Inside the pod, test DNS resolution
nslookup user-service.default.svc.cluster.local

# Check the DNS configuration
cat /etc/resolv.conf
```

```bash
# Check if the CoreDNS pods are running
kubectl get pods -n kube-system -l k8s-app=kube-dns

# Check CoreDNS logs for errors
kubectl logs -n kube-system -l k8s-app=kube-dns
```

## Wrapping Up

Service discovery on GKE operates at multiple levels. Kubernetes DNS handles the common case of service-to-service communication with automatic DNS registration. Headless services provide direct pod access when you need to talk to specific instances. Cloud DNS extends discovery to resources outside the cluster. Together, these mechanisms let your microservices find each other reliably without hardcoding addresses, which is essential for a scalable, resilient architecture.
