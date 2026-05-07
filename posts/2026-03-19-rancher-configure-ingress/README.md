# How to Configure Ingress in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Ingress

Description: A step-by-step guide to configuring Ingress resources in Rancher for routing external traffic to your Kubernetes services.

Ingress resources in Kubernetes provide HTTP and HTTPS routing to services within your cluster. Rancher simplifies the process of creating and managing Ingress rules through its intuitive UI and support for multiple ingress controllers. This guide walks you through configuring Ingress in Rancher from scratch.

## Prerequisites

Before you begin, make sure you have:

- A running Rancher instance
- At least one managed Kubernetes cluster
- An ingress controller deployed in your cluster. RKE2 installs ingress-nginx by default, while K3s installs Traefik by default.
- A deployed application with a ClusterIP or NodePort service

## Understanding Ingress in Kubernetes

An Ingress resource defines rules for routing external HTTP/HTTPS traffic to internal services. Together with an ingress controller, it acts as a reverse proxy, allowing you to expose multiple services under a single external IP address with path-based or host-based routing.

Key components include:

- **Ingress Controller**: The actual proxy that processes Ingress rules (e.g., NGINX, Traefik)
- **Ingress Resource**: The Kubernetes object defining routing rules
- **Backend Services**: The services that receive routed traffic

## Step 1: Verify Your Ingress Controller

First, confirm that an ingress controller is running in your cluster. In Rancher, navigate to your cluster and open a kubectl shell.

```bash
kubectl get ingressclass
```

This shows the available ingress classes in your cluster.

```bash
kubectl get pods -A
```

You should see a running ingress controller, such as `ingress-nginx` or `traefik`. In RKE2 and K3s, these controller pods typically run in `kube-system`.

## Step 2: Deploy a Sample Application

If you do not already have an application deployed, create one for testing:

```yaml
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
      - name: hello-app
        image: hashicorp/http-echo
        args:
        - "-text=Hello from Rancher!"
        ports:
        - containerPort: 5678
---
apiVersion: v1
kind: Service
metadata:
  name: hello-service
  namespace: default
spec:
  selector:
    app: hello-app
  ports:
  - port: 80
    targetPort: 5678
  type: ClusterIP
```

Apply this manifest:

```bash
kubectl apply -f hello-app.yaml
```

## Step 3: Create an Ingress via the Rancher UI

1. In the Rancher dashboard, navigate to your cluster.
2. Go to **Service Discovery** > **Ingresses**.
3. Click **Create**.
4. Fill in the following fields:
   - **Name**: `hello-ingress`
   - **Namespace**: `default`
   - **Ingress Class**: Select your installed ingress controller
5. Under **Rules**, click **Add Rule**:
   - **Request Host**: `hello.example.com`
   - **Path**: `/`
   - **Target Service**: `hello-service`
   - **Port**: `80`
6. Click **Create**.

## Step 4: Create an Ingress via kubectl

Alternatively, you can create an Ingress resource using YAML. Replace `YOUR_INGRESS_CLASS` with a class returned by `kubectl get ingressclass`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hello-ingress
  namespace: default
spec:
  ingressClassName: YOUR_INGRESS_CLASS
  rules:
  - host: hello.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: hello-service
            port:
              number: 80
```

Apply it:

```bash
kubectl apply -f hello-ingress.yaml
```

## Step 5: Configure Path-Based Routing

You can route different paths to different services by using the same ingress class you verified in Step 1:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-path-ingress
  namespace: default
spec:
  ingressClassName: YOUR_INGRESS_CLASS
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
      - path: /web
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
```

## Step 6: Configure Host-Based Routing

Route traffic based on the hostname by using the same ingress class you verified in Step 1:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-host-ingress
  namespace: default
spec:
  ingressClassName: YOUR_INGRESS_CLASS
  rules:
  - host: app1.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app1-service
            port:
              number: 80
  - host: app2.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app2-service
            port:
              number: 80
```

## Step 7: Verify the Ingress

Check that your Ingress resource was created successfully:

```bash
kubectl get ingress -n default
```

You should see output showing the host, paths, and, depending on your ingress controller, an assigned address or `<pending>` while it is being provisioned. Test the Ingress by adding an entry to your `/etc/hosts` file (for local testing) or configuring DNS:

```bash
curl -H "Host: hello.example.com" http://<INGRESS_IP>/
```

## Step 8: Add Default Backend

Configure a default backend that handles requests that do not match any rule by using the same ingress class you verified in Step 1:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: default-backend-ingress
  namespace: default
spec:
  ingressClassName: YOUR_INGRESS_CLASS
  defaultBackend:
    service:
      name: default-service
      port:
        number: 80
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: main-service
            port:
              number: 80
```

## Troubleshooting

If your Ingress is not working as expected:

- Check the ingress controller logs: `kubectl logs -n <controller-namespace> <pod-name>`
- Verify the service endpoints: `kubectl get endpoints <service-name>`
- Ensure DNS or host entries point to the correct IP
- Check for conflicting Ingress rules for the same host or path
- Verify the ingressClassName matches your installed controller

## Summary

Configuring Ingress in Rancher allows you to efficiently route external traffic to your Kubernetes services. Whether you use the Rancher UI or kubectl, you can set up path-based routing, host-based routing, and default backends to manage traffic flow into your cluster. With Rancher providing a management UI over your cluster resources, you can focus on defining your routing rules while the ingress controller handles the underlying traffic routing.
