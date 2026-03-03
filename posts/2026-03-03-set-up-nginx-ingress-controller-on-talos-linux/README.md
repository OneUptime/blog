# How to Set Up Nginx Ingress Controller on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Nginx, Ingress Controller, Kubernetes, Networking

Description: A complete guide to deploying and configuring Nginx Ingress Controller on Talos Linux for routing external traffic to your Kubernetes services.

---

Talos Linux provides a minimal, immutable, and secure operating system built specifically for Kubernetes. One of the first things you will need after spinning up a Talos cluster is a way to route external HTTP and HTTPS traffic to services running inside the cluster. The Nginx Ingress Controller is one of the most popular solutions for this, and it works well on Talos Linux with just a few configuration steps.

In this post, we will walk through the entire process of installing and configuring the Nginx Ingress Controller on a Talos Linux cluster. We will cover the prerequisites, installation via Helm, basic configuration, and some practical examples of routing traffic to your applications.

## Prerequisites

Before you get started, make sure you have the following in place:

- A running Talos Linux cluster with at least one control plane node and one worker node
- `kubectl` configured to talk to your cluster
- Helm 3 installed on your local machine
- `talosctl` installed and configured

You can verify your cluster is healthy by running:

```bash
# Check that all nodes are ready
kubectl get nodes

# Verify system pods are running
kubectl get pods -n kube-system
```

## Why Nginx Ingress Controller?

There are several ingress controllers available in the Kubernetes ecosystem, but Nginx remains one of the most widely used. It has a large community, extensive documentation, and supports a wide range of features including path-based routing, host-based routing, TLS termination, rate limiting, and custom headers. For teams that are already familiar with Nginx configuration, the learning curve is minimal.

On Talos Linux specifically, the Nginx Ingress Controller works without any special kernel modules or system-level changes because Talos already includes everything Kubernetes needs out of the box.

## Installing with Helm

The recommended way to install the Nginx Ingress Controller is through the official Helm chart. First, add the repository:

```bash
# Add the ingress-nginx Helm repository
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx

# Update your local chart cache
helm repo update
```

Now install the controller into a dedicated namespace:

```bash
# Create the namespace
kubectl create namespace ingress-nginx

# Install the chart with default settings
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --set controller.service.type=LoadBalancer
```

If your Talos cluster does not have a cloud load balancer (for example, if you are running on bare metal), you will want to use a NodePort or integrate with MetalLB. Here is an example using NodePort:

```bash
# Install with NodePort instead of LoadBalancer
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --set controller.service.type=NodePort \
  --set controller.service.nodePorts.http=30080 \
  --set controller.service.nodePorts.https=30443
```

## Verifying the Installation

After the installation, check that the pods are running:

```bash
# Check the ingress controller pods
kubectl get pods -n ingress-nginx

# Check the service to see the external IP or NodePort
kubectl get svc -n ingress-nginx
```

You should see the `ingress-nginx-controller` pod in a Running state and a service with your configured type.

## Creating Your First Ingress Resource

With the controller running, you can now create Ingress resources to route traffic. Let us start with a simple example. First, deploy a test application:

```yaml
# test-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hello-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: hello-app
  template:
    metadata:
      labels:
        app: hello-app
    spec:
      containers:
      - name: hello
        image: hashicorp/http-echo
        args:
        - "-text=Hello from Talos Linux!"
        ports:
        - containerPort: 5678
---
apiVersion: v1
kind: Service
metadata:
  name: hello-app
  namespace: default
spec:
  selector:
    app: hello-app
  ports:
  - port: 80
    targetPort: 5678
```

Apply this manifest:

```bash
kubectl apply -f test-app.yaml
```

Now create an Ingress resource:

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hello-ingress
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  ingressClassName: nginx
  rules:
  - host: hello.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: hello-app
            port:
              number: 80
```

Apply it and test:

```bash
# Apply the ingress resource
kubectl apply -f ingress.yaml

# Test with curl (replace the IP with your node IP or load balancer IP)
curl -H "Host: hello.example.com" http://<NODE_IP>:30080
```

## Customizing the Nginx Configuration

The Nginx Ingress Controller supports many annotations that let you customize behavior on a per-ingress basis. Here are some commonly used ones:

```yaml
# Example: Enable CORS, set timeouts, and configure proxy buffer size
metadata:
  annotations:
    nginx.ingress.kubernetes.io/enable-cors: "true"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "120"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
```

You can also modify the global configuration through a ConfigMap. The controller watches a ConfigMap named `ingress-nginx-controller` in its namespace:

```yaml
# custom-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
data:
  proxy-buffer-size: "16k"
  use-forwarded-headers: "true"
  log-format-upstream: '$remote_addr - $request_id'
```

## Talos-Specific Considerations

Talos Linux is an immutable operating system, so you cannot SSH into nodes and modify files directly. All configuration happens through the Talos API or through Kubernetes manifests. This is actually a benefit for the ingress controller setup because everything is declarative and reproducible.

One thing to keep in mind is that Talos runs a minimal kernel. If you need specific kernel modules for your Nginx configuration (though this is rare), you would need to build a custom Talos image with those modules included. For the vast majority of use cases, the default Talos image works perfectly.

If you are running Talos on bare metal, make sure your nodes have network access configured properly. You can verify this through `talosctl`:

```bash
# Check network interfaces on a node
talosctl get addresses -n <NODE_IP>

# Check routing table
talosctl get routes -n <NODE_IP>
```

## Monitoring the Ingress Controller

The Nginx Ingress Controller exposes Prometheus metrics by default. You can scrape these to get visibility into request rates, latencies, and error codes. If you have Prometheus running in your cluster, add the following annotations to the controller service to enable auto-discovery:

```yaml
# These are typically set in the Helm values
controller:
  metrics:
    enabled: true
    serviceMonitor:
      enabled: true
```

## Troubleshooting Common Issues

If traffic is not reaching your services, here are a few things to check:

1. Verify the ingress controller pod is running and healthy
2. Check that the IngressClass is set correctly (should be "nginx")
3. Look at the controller logs for errors: `kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx`
4. Make sure your service and endpoints are healthy: `kubectl get endpoints <service-name>`
5. On bare metal, verify that the NodePort or LoadBalancer IP is accessible from outside the cluster

## Conclusion

Setting up the Nginx Ingress Controller on Talos Linux is straightforward thanks to Helm and the declarative nature of both Talos and Kubernetes. Once installed, you get a production-ready ingress solution that can handle path-based routing, TLS termination, and many other features through simple annotations. The immutable nature of Talos means your ingress configuration is always reproducible and consistent across environments, which makes operations much simpler in the long run.
