# How to Set Up NGINX Ingress Controller in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Ingress, Nginx

Description: Learn how to deploy and configure the NGINX Ingress Controller in a Rancher-managed Kubernetes cluster.

The NGINX Ingress Controller is one of the most popular ingress controllers for Kubernetes. It provides robust HTTP and HTTPS routing, load balancing, SSL termination, and advanced traffic management. This guide shows you how to set up and configure the NGINX Ingress Controller in Rancher.

## Prerequisites

- A running Rancher instance (v2.6 or later)
- A managed Kubernetes cluster (RKE, RKE2, or imported)
- Helm installed or access to the Rancher Apps marketplace
- kubectl access to your cluster

## Step 1: Check for Existing Ingress Controllers

Before installing, check if an ingress controller is already present:

```bash
kubectl get pods --all-namespaces | grep ingress
kubectl get ingressclass
```

Existing RKE2 clusters may already have the packaged `rke2-ingress-nginx` add-on installed. Starting with RKE2 v1.36, new clusters default to Traefik instead, and `ingress-nginx` reached upstream end-of-life in March 2026, so confirm which controller your cluster is using before installing another one.

If an ingress controller already exists, you may want to update its configuration rather than install a new one.

## Step 2: Install NGINX Ingress Controller via Rancher Apps

1. Navigate to your cluster in the Rancher dashboard.
2. Go to **Apps** > **Repositories**.
3. Add the upstream ingress-nginx Helm repository URL: `https://kubernetes.github.io/ingress-nginx`.
4. After the repository syncs, go to **Apps** > **Charts**.
5. Search for **ingress-nginx**.
6. Select the **ingress-nginx** chart.
7. Click **Install**.
8. Choose the target namespace (typically `ingress-nginx`).
9. Configure the values as needed and click **Install**.

## Step 3: Install via Helm CLI

Alternatively, install using Helm from the command line:

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.replicaCount=2 \
  --set controller.service.type=LoadBalancer
```

For quick testing on bare-metal clusters without a cloud load balancer:

```bash
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=NodePort \
  --set controller.service.nodePorts.http=30080 \
  --set controller.service.nodePorts.https=30443
```

With a NodePort Service, clients connect to a node IP or hostname on the configured port, such as `http://<NODE-IP>:30080/`.

## Step 4: Verify the Installation

Check that the NGINX Ingress Controller pods are running. For an upstream Helm install:

```bash
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

If you are using the packaged `rke2-ingress-nginx` add-on on RKE2, verify it in `kube-system` instead:

```bash
kubectl get daemonset -n kube-system | grep rke2-ingress-nginx
kubectl get pods -n kube-system | grep rke2-ingress-nginx
```

For the upstream Helm chart, you should see the controller pod in a Running state and a service with an external IP (if using LoadBalancer type) or NodePort. On RKE2's packaged controller, the add-on runs as a DaemonSet and binds host ports 80 and 443 by default, so you may not see a public `LoadBalancer` Service unless you enable one explicitly.

```bash
kubectl get ingressclass
```

Confirm that the `nginx` ingress class is available.

## Step 5: Configure the NGINX Ingress Controller

If you installed ingress-nginx with the upstream Helm chart, customize the controller behavior by editing the ConfigMap:

```bash
kubectl edit configmap ingress-nginx-controller -n ingress-nginx
```

If you are using the packaged `rke2-ingress-nginx` add-on on RKE2, persist the same settings through a `HelmChartConfig` instead of editing the generated ConfigMap directly.

Common configuration options for the upstream Helm install:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
data:
  proxy-body-size: "50m"
  proxy-read-timeout: "120"
  proxy-send-timeout: "120"
  use-forwarded-headers: "true"
  compute-full-forwarded-for: "true"
  enable-real-ip: "true"
  log-format-upstream: '$remote_addr - $req_id'
```

For RKE2, put the same keys under `controller.config` in the `rke2-ingress-nginx` HelmChartConfig.

## Step 6: Create a Test Ingress Resource

Deploy a test application and create an Ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: test-ingress
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  ingressClassName: nginx
  rules:
  - host: test.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: test-service
            port:
              number: 80
```

## Step 7: Enable Rate Limiting

Add rate limiting to protect your services:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: rate-limited-ingress
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/limit-rps: "10"
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "5"
    nginx.ingress.kubernetes.io/limit-connections: "5"
spec:
  ingressClassName: nginx
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
```

## Step 8: Configure Custom Error Pages

Set up custom error pages for your ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: custom-errors-ingress
  namespace: default
  annotations:
    nginx.ingress.kubernetes.io/custom-http-errors: "404,503"
    nginx.ingress.kubernetes.io/default-backend: error-pages-service
spec:
  ingressClassName: nginx
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: myapp-service
            port:
              number: 80
```

## Step 9: Enable Monitoring

If you have Prometheus installed through Rancher Monitoring, enable metrics collection:

```bash
helm upgrade ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --reuse-values \
  --set controller.metrics.enabled=true \
  --set controller.metrics.serviceMonitor.enabled=true \
  --set controller.metrics.serviceMonitor.namespace=cattle-monitoring-system
```

If your Prometheus stack selects ServiceMonitors by label, also set `controller.metrics.serviceMonitor.additionalLabels` to match that selector.

## Step 10: Scale the Ingress Controller

For production environments, scale the controller for high availability if you installed the upstream Helm chart as a Deployment:

```bash
kubectl scale deployment ingress-nginx-controller \
  -n ingress-nginx --replicas=3
```

On RKE2's packaged `rke2-ingress-nginx` add-on, the controller runs as a DaemonSet, so capacity scales with node count rather than `kubectl scale deployment`.

Or configure it in the Helm values:

```yaml
controller:
  replicaCount: 3
  affinity:
    podAntiAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
            - key: app.kubernetes.io/name
              operator: In
              values:
              - ingress-nginx
          topologyKey: kubernetes.io/hostname
```

## Troubleshooting

- Check controller logs: `kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx`
- Verify the IngressClass: `kubectl get ingressclass`
- Test connectivity: `curl -v -H "Host: test.example.com" http://<EXTERNAL-IP>/` for LoadBalancer, or `curl -v -H "Host: test.example.com" http://<NODE-IP>:30080/` for the NodePort example
- Check for configuration errors: `kubectl exec -n ingress-nginx <pod> -- nginx -T`

## Summary

The NGINX Ingress Controller is a powerful and flexible solution for managing HTTP traffic in Rancher-managed Kubernetes clusters. By installing it through Rancher Apps or Helm, configuring its behavior via annotations and ConfigMaps, and enabling monitoring, you can build a production-ready ingress layer for your applications.
