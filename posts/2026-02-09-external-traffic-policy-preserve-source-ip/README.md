# How to Use externalTrafficPolicy Local to Preserve Client Source IP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Security

Description: Configure externalTrafficPolicy Local on Kubernetes services to preserve client source IP addresses for accurate logging, security enforcement, and geolocation while understanding the trade-offs in load distribution and availability.

---

When external traffic enters your Kubernetes cluster through a NodePort or LoadBalancer service, the client's source IP address gets replaced with the node's IP by default. This Source Network Address Translation (SNAT) breaks IP-based access controls, geo-location features, and accurate logging. Setting externalTrafficPolicy to Local preserves the original client IP at the cost of some load balancing flexibility.

## The Source IP Problem

Under the default Cluster traffic policy, here's what happens when a client connects:

1. Client (IP: 203.0.113.50) connects to LoadBalancer (IP: 198.51.100.10)
2. LoadBalancer forwards to Node B (IP: 10.0.1.5) on port 30080
3. Node B's kube-proxy sees the request is for a pod on Node C
4. Node B performs SNAT, changing source IP to 10.0.1.5
5. Request forwards to pod on Node C
6. Pod sees source IP as 10.0.1.5 (Node B), not 203.0.113.50 (client)

This SNAT is necessary for reply traffic to route correctly. If Node B didn't replace the source IP, the pod's response would go directly to the client, bypassing the load balancer and breaking the connection.

The Local traffic policy changes this by only routing to pods on the same node that received the traffic. This eliminates the need for SNAT because reply traffic naturally goes back through the same path.

## Configuring externalTrafficPolicy Local

Set the policy in your service definition:

```yaml
# web-service-local-policy.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-frontend
  namespace: production
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local  # Preserve source IP
  selector:
    app: web-frontend
    tier: frontend
  ports:
  - name: http
    protocol: TCP
    port: 80
    targetPort: 8080
  - name: https
    protocol: TCP
    port: 443
    targetPort: 8443
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
  namespace: production
spec:
  replicas: 6
  selector:
    matchLabels:
      app: web-frontend
      tier: frontend
  template:
    metadata:
      labels:
        app: web-frontend
        tier: frontend
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 8080
        - containerPort: 8443
```

Apply the service:

```bash
kubectl apply -f web-service-local-policy.yaml
```

## Verifying Source IP Preservation

Deploy a simple echo service to see the source IP:

```yaml
# source-ip-test.yaml
apiVersion: v1
kind: Service
metadata:
  name: source-ip-test
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  selector:
    app: source-ip-test
  ports:
  - port: 80
    targetPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-ip-test
spec:
  replicas: 3
  selector:
    matchLabels:
      app: source-ip-test
  template:
    metadata:
      labels:
        app: source-ip-test
    spec:
      containers:
      - name: echoserver
        image: ealen/echo-server
        ports:
        - containerPort: 8080
        env:
        - name: PORT
          value: "8080"
```

Deploy and test:

```bash
kubectl apply -f source-ip-test.yaml

# Get the load balancer IP
LB_IP=$(kubectl get svc source-ip-test -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Make a request
curl http://$LB_IP/
```

Look for the `X-Forwarded-For` or remote address in the response. With Local policy, you'll see your actual public IP instead of a node IP.

## Using Source IP for Access Control

With preserved source IPs, implement IP-based access control in your application:

```yaml
# nginx-config-map.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
data:
  nginx.conf: |
    events {}
    http {
      # Geo-blocking example
      geo $allowed_country {
        default no;
        # Allow US IP ranges
        3.0.0.0/8 yes;
        # Allow EU IP ranges
        2.16.0.0/13 yes;
      }

      server {
        listen 8080;

        # Real IP is available directly (no X-Forwarded-For needed)
        if ($allowed_country = no) {
          return 403 "Access denied from your location";
        }

        # Rate limiting by source IP
        limit_req_zone $remote_addr zone=one:10m rate=10r/s;
        limit_req zone=one burst=20;

        location / {
          root /usr/share/nginx/html;
          # Log real client IPs
          access_log /var/log/nginx/access.log combined;
        }
      }
    }
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: geo-blocked-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: geo-blocked-app
  template:
    metadata:
      labels:
        app: geo-blocked-app
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        ports:
        - containerPort: 8080
        volumeMounts:
        - name: config
          mountPath: /etc/nginx/nginx.conf
          subPath: nginx.conf
      volumes:
      - name: config
        configMap:
          name: nginx-config
---
apiVersion: v1
kind: Service
metadata:
  name: geo-blocked-app
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  selector:
    app: geo-blocked-app
  ports:
  - port: 80
    targetPort: 8080
```

The application now sees real client IPs and can enforce geo-blocking or rate limiting per IP.

## Understanding Load Distribution Impact

Local policy changes how external load balancers distribute traffic. The load balancer still distributes evenly across nodes, but each node only routes to its local pods.

Consider a 3-node cluster with 6 pods:
- Node A: 3 pods
- Node B: 2 pods
- Node C: 1 pod

With Cluster policy, each pod gets roughly 16.7% of traffic (1/6).

With Local policy:
- Pods on Node A: each gets ~11% (33% node traffic / 3 pods)
- Pods on Node B: each gets ~16.5% (33% node traffic / 2 pods)
- Pod on Node C: gets ~33% (all of Node C's traffic)

This uneven distribution happens because the load balancer distributes per-node, not per-pod. To fix this, ensure even pod distribution across nodes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: evenly-distributed-app
spec:
  replicas: 6
  selector:
    matchLabels:
      app: evenly-distributed-app
  template:
    metadata:
      labels:
        app: evenly-distributed-app
    spec:
      # Spread pods evenly across nodes
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: evenly-distributed-app
      containers:
      - name: app
        image: myapp:latest
```

This ensures each node has exactly 2 pods, giving each pod equal traffic.

## Handling Node Failures

With Local policy, nodes without local pods can't serve traffic. If a node has no healthy pods:

1. Health checks fail for that node's NodePort
2. Load balancer removes the node from rotation
3. Traffic goes only to nodes with healthy pods

Configure proper health checks:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  healthCheckNodePort: 32000  # Custom health check port
  selector:
    app: web-app
  ports:
  - port: 80
```

The health check endpoint at `NodeIP:32000/healthz` returns 200 only if local pods are ready.

## Cloud Provider Specific Configuration

Different cloud providers handle Local policy differently.

**AWS with NLB:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: app-service
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  selector:
    app: my-app
  ports:
  - port: 80
```

Cross-zone load balancing spreads traffic across availability zones even with Local policy.

**GCP:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: app-service
  annotations:
    cloud.google.com/load-balancer-type: "External"
    networking.gke.io/load-balancer-type: "External"
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  selector:
    app: my-app
  ports:
  - port: 80
```

**Azure:**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: app-service
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-health-probe-request-path: "/health"
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  selector:
    app: my-app
  ports:
  - port: 80
```

## Monitoring and Observability

Track connection patterns to verify source IP preservation:

```yaml
# Application logging example (Go)
package main

import (
    "log"
    "net/http"
)

func handler(w http.ResponseWriter, r *http.Request) {
    // Get client IP from request
    clientIP := r.RemoteAddr

    // Log with real client IP
    log.Printf("Request from %s to %s", clientIP, r.URL.Path)

    // Check X-Forwarded-For (should match RemoteAddr with Local policy)
    xff := r.Header.Get("X-Forwarded-For")
    if xff != "" {
        log.Printf("X-Forwarded-For: %s", xff)
    }

    w.Write([]byte("Hello from " + clientIP))
}

func main() {
    http.HandleFunc("/", handler)
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

Monitor distribution of requests across pods:

```bash
# Check request distribution
for pod in $(kubectl get pods -l app=web-app -o name); do
  echo -n "$pod: "
  kubectl logs $pod | grep -c "Request from"
done
```

With proper pod distribution, counts should be roughly equal.

## Combining with Internal Traffic Policy

You can set both policies independently:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: dual-policy-service
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local   # Preserve source IP for external traffic
  internalTrafficPolicy: Cluster  # Balance across all pods for internal traffic
  selector:
    app: my-app
  ports:
  - port: 80
```

This gives you source IP preservation for external clients while maintaining efficient cluster-wide load balancing for internal pod-to-pod communication.

## When Not to Use Local Policy

Avoid Local policy when:

1. **Pod distribution is uneven**: Nodes with more pods will be overloaded
2. **Scaling is aggressive**: Rapid scaling creates temporary imbalances
3. **Source IP doesn't matter**: Most applications don't need it
4. **High availability is critical**: Local policy can reduce available endpoints

For these scenarios, use Cluster policy and handle source IP preservation at the load balancer or ingress level instead.

## Conclusion

Setting externalTrafficPolicy to Local provides real client IP addresses in your applications, enabling accurate logging, IP-based security controls, and geo-location features. The trade-off is potential load imbalance when pods aren't evenly distributed across nodes. Use topology spread constraints to ensure even distribution, and monitor traffic patterns to verify balanced load. For most applications, the benefits of source IP preservation outweigh the operational complexity of managing pod distribution.
