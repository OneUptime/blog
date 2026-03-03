# How to Configure HAProxy Ingress on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, HAProxy, Ingress Controller, Kubernetes, Load Balancing

Description: Step-by-step instructions for deploying and configuring HAProxy Ingress Controller on a Talos Linux Kubernetes cluster.

---

HAProxy has been a trusted name in load balancing and proxying for decades. Its Kubernetes ingress controller brings that same reliability and performance to container orchestration. On Talos Linux, HAProxy Ingress runs without issues thanks to the clean Kubernetes environment that Talos provides. If you need high-performance TCP and HTTP load balancing with fine-grained control over traffic management, HAProxy Ingress is worth considering.

This post covers the full setup process from installation to advanced configuration, all tailored for a Talos Linux environment.

## Why HAProxy Ingress?

While Nginx and Traefik get a lot of attention, HAProxy brings some unique strengths to the table. It is known for extremely low latency and high throughput. HAProxy has been battle-tested in production environments handling millions of connections. The HAProxy Ingress Controller supports features like connection draining, TCP load balancing, dynamic configuration updates without restarts, and detailed statistics. For teams that already use HAProxy in other parts of their infrastructure, using it as a Kubernetes ingress controller keeps the tooling consistent.

## Prerequisites

Before starting, confirm you have:

- A running Talos Linux cluster
- `kubectl` access to the cluster
- Helm 3 installed
- `talosctl` configured for your cluster

```bash
# Verify cluster health
kubectl get nodes
kubectl get pods -n kube-system --field-selector=status.phase!=Running
```

The second command should return no results if everything is healthy.

## Installing HAProxy Ingress with Helm

Start by adding the HAProxy Ingress Helm repository:

```bash
# Add the HAProxy Ingress chart repository
helm repo add haproxytech https://haproxytech.github.io/helm-charts

# Update the repo index
helm repo update
```

Create a values file to customize the installation for Talos:

```yaml
# haproxy-values.yaml
controller:
  # Use NodePort for bare metal Talos clusters
  service:
    type: NodePort
    nodePorts:
      http: 31080
      https: 31443
      stat: 31024

  # Enable the stats page for monitoring
  config:
    stats-auth: "admin:password123"

  # Resource requests and limits
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi

  # Run on worker nodes
  nodeSelector:
    node-role.kubernetes.io/worker: ""
```

Install the chart:

```bash
# Create namespace and install
kubectl create namespace haproxy-ingress

helm install haproxy-ingress haproxytech/kubernetes-ingress \
  --namespace haproxy-ingress \
  -f haproxy-values.yaml
```

## Verifying the Deployment

Once installed, verify everything is working:

```bash
# Check pods
kubectl get pods -n haproxy-ingress

# Check services
kubectl get svc -n haproxy-ingress

# Check the ingress class was created
kubectl get ingressclass
```

You should see a pod running and an IngressClass named `haproxy` available.

## Creating an Ingress Resource

Deploy a sample application to test with:

```yaml
# sample-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web
        image: nginx:alpine
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: web-app
  namespace: default
spec:
  selector:
    app: web-app
  ports:
  - port: 80
    targetPort: 80
```

Now create an Ingress resource that uses the HAProxy ingress class:

```yaml
# web-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
  namespace: default
  annotations:
    haproxy.org/check: "true"
    haproxy.org/check-interval: "5s"
spec:
  ingressClassName: haproxy
  rules:
  - host: web.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-app
            port:
              number: 80
```

Apply and test:

```bash
# Deploy the app and ingress
kubectl apply -f sample-app.yaml
kubectl apply -f web-ingress.yaml

# Test connectivity
curl -H "Host: web.example.com" http://<NODE_IP>:31080
```

## HAProxy-Specific Annotations

HAProxy Ingress supports a rich set of annotations for controlling traffic behavior. Here are some of the most useful ones:

```yaml
metadata:
  annotations:
    # Health checking
    haproxy.org/check: "true"
    haproxy.org/check-interval: "5s"

    # Connection limits
    haproxy.org/rate-limit-requests: "100"
    haproxy.org/rate-limit-period: "1m"

    # Timeouts
    haproxy.org/timeout-server: "60s"
    haproxy.org/timeout-client: "60s"
    haproxy.org/timeout-connect: "5s"

    # Load balancing algorithm
    haproxy.org/load-balance: "leastconn"

    # SSL redirect
    haproxy.org/ssl-redirect: "true"

    # Whitelisting
    haproxy.org/whitelist: "10.0.0.0/8, 172.16.0.0/12"
```

## TCP Load Balancing

One of HAProxy's strengths is TCP-level load balancing. This is useful for databases, message queues, and other non-HTTP services:

```yaml
# tcp-ingress.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: haproxy-ingress-tcp
  namespace: haproxy-ingress
data:
  "5432": "default/postgres-service:5432"
  "6379": "default/redis-service:6379"
```

This configures HAProxy to forward TCP connections on port 5432 to a PostgreSQL service and port 6379 to a Redis service.

## Accessing the Stats Page

HAProxy comes with a built-in statistics dashboard that shows real-time traffic data. If you enabled it in your values file, you can access it through the stats NodePort:

```bash
# Access the HAProxy stats page
# Default URL when using NodePort
curl http://<NODE_IP>:31024/stats

# Or port-forward for local access
kubectl port-forward -n haproxy-ingress svc/haproxy-ingress 8404:1024
```

Open `http://localhost:8404` in your browser to see connection counts, response times, error rates, and more.

## Advanced Configuration with ConfigMap

For global settings that apply to all ingress resources, use the HAProxy ConfigMap:

```yaml
# haproxy-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: haproxy-ingress
  namespace: haproxy-ingress
data:
  # Global settings
  maxconn: "10000"
  nbthread: "4"
  timeout-connect: "5s"
  timeout-client: "50s"
  timeout-server: "50s"

  # Logging
  syslog-server: "address:stdout, format: raw, facility:daemon"

  # SSL configuration
  ssl-options: "no-sslv3 no-tlsv10 no-tlsv11"
  ssl-default-bind-ciphers: "ECDHE+AESGCM:DHE+AESGCM"
```

## Talos-Specific Considerations

On Talos Linux, remember that you cannot modify system files or install packages on nodes. All HAProxy configuration must happen through Kubernetes resources. This is actually an advantage because it forces a GitOps-friendly approach where everything is defined in manifests.

If HAProxy needs more file descriptors or other system-level tuning, you can adjust this through Talos machine configuration:

```yaml
# Talos machine config snippet
machine:
  sysctls:
    net.core.somaxconn: "65535"
    net.ipv4.ip_local_port_range: "1024 65535"
```

Apply with talosctl:

```bash
# Apply sysctl changes
talosctl apply-config --nodes <NODE_IP> --file machine-config.yaml
```

## Troubleshooting

Common issues and how to resolve them:

```bash
# Check HAProxy controller logs
kubectl logs -n haproxy-ingress -l app.kubernetes.io/name=kubernetes-ingress

# Verify the generated HAProxy configuration
kubectl exec -n haproxy-ingress <POD_NAME> -- cat /etc/haproxy/haproxy.cfg

# Check endpoints are populated
kubectl get endpoints web-app
```

## Conclusion

HAProxy Ingress on Talos Linux gives you a high-performance, battle-tested load balancer for your Kubernetes workloads. The combination of HAProxy's reliability with Talos Linux's security-first approach creates a solid production environment. With support for both HTTP and TCP load balancing, detailed statistics, and fine-grained traffic control through annotations, HAProxy Ingress is a strong choice for demanding workloads that need low latency and high throughput.
