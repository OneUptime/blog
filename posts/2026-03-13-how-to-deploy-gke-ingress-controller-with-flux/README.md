# How to Deploy GKE Ingress Controller with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, GCP, GKE, Ingress, Load Balancer, Networking, Helm

Description: Learn how to deploy and manage the GKE Ingress controller and configure Google Cloud load balancers using Flux for a fully GitOps-driven networking setup.

---

GKE provides a built-in Ingress controller that provisions Google Cloud HTTP(S) Load Balancers when you create Ingress resources. While the default controller is automatically available on GKE, managing Ingress configurations through Flux ensures your networking setup is version-controlled, reproducible, and consistent across environments. This guide covers deploying and configuring GKE Ingress resources with Flux.

## Prerequisites

Before you begin, ensure you have the following:

- A GKE cluster (Standard or Autopilot)
- Flux installed on the cluster (v2.0 or later)
- A domain name with DNS access (for configuring hostnames)
- `kubectl` and `gcloud` CLI tools configured
- A Git repository connected to Flux

## Understanding GKE Ingress

GKE includes a built-in Ingress controller (`gce` class) that creates Google Cloud Load Balancers. There is no need to install a separate controller. When you create an Ingress resource with the `kubernetes.io/ingress.class: gce` annotation or `ingressClassName: gce`, GKE automatically provisions an external HTTP(S) Load Balancer.

For internal traffic, use `gce-internal` to create an Internal HTTP(S) Load Balancer.

## Step 1: Reserve a Static IP Address

Reserve a global static IP address for the load balancer:

```bash
gcloud compute addresses create my-app-ip \
  --global
```

Retrieve the assigned IP:

```bash
gcloud compute addresses describe my-app-ip --global --format="get(address)"
```

Use this IP to configure your DNS records.

## Step 2: Create a Managed SSL Certificate

Create a Google-managed SSL certificate for your domain:

```yaml
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: my-app-cert
  namespace: default
spec:
  domains:
    - app.example.com
```

Save this as `managed-certificate.yaml` in your Git repository.

## Step 3: Deploy a Sample Application

Create the application deployment and service that the Ingress will route traffic to:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: nginx:1.27
          ports:
            - containerPort: 80
          readinessProbe:
            httpGet:
              path: /
              port: 80
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: default
spec:
  type: NodePort
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 80
```

The Service must be of type `NodePort` or `ClusterIP` with NEG (Network Endpoint Groups) for GKE Ingress to work.

## Step 4: Configure the Ingress Resource

Create the Ingress resource with GKE-specific annotations:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  namespace: default
  annotations:
    kubernetes.io/ingress.global-static-ip-name: my-app-ip
    networking.gke.io/managed-certificates: my-app-cert
    kubernetes.io/ingress.class: gce
spec:
  defaultBackend:
    service:
      name: my-app
      port:
        number: 80
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 80
```

## Step 5: Enable HTTPS Redirect

To redirect HTTP traffic to HTTPS, create a `FrontendConfig` resource:

```yaml
apiVersion: networking.gke.io/v1beta1
kind: FrontendConfig
metadata:
  name: my-app-frontend
  namespace: default
spec:
  redirectToHttps:
    enabled: true
    responseCodeName: MOVED_PERMANENTLY_DEFAULT
```

Update the Ingress to reference the FrontendConfig:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  namespace: default
  annotations:
    kubernetes.io/ingress.global-static-ip-name: my-app-ip
    networking.gke.io/managed-certificates: my-app-cert
    kubernetes.io/ingress.class: gce
    networking.gke.io/v1beta1.FrontendConfig: my-app-frontend
spec:
  defaultBackend:
    service:
      name: my-app
      port:
        number: 80
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 80
```

## Step 6: Configure BackendConfig for Health Checks

Create a `BackendConfig` to customize the load balancer health check:

```yaml
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: my-app-backend
  namespace: default
spec:
  healthCheck:
    checkIntervalSec: 15
    timeoutSec: 5
    healthyThreshold: 2
    unhealthyThreshold: 3
    type: HTTP
    requestPath: /healthz
    port: 80
  connectionDraining:
    drainingTimeoutSec: 60
```

Add the BackendConfig annotation to your Service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: default
  annotations:
    cloud.google.com/backend-config: '{"default": "my-app-backend"}'
spec:
  type: NodePort
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 80
```

## Step 7: Organize Everything in a Kustomization

Structure these resources in your Git repository:

```text
clusters/production/ingress/
  kustomization.yaml
  managed-certificate.yaml
  frontend-config.yaml
  backend-config.yaml
  ingress.yaml
  deployment.yaml
  service.yaml
```

Create the `kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - managed-certificate.yaml
  - frontend-config.yaml
  - backend-config.yaml
  - deployment.yaml
  - service.yaml
  - ingress.yaml
```

## Step 8: Create the Flux Kustomization

Define a Flux Kustomization to deploy the Ingress setup:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: ingress
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./clusters/production/ingress
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: default
```

## Step 9: Verify the Deployment

After Flux reconciles, check the Ingress status:

```bash
kubectl get ingress my-app-ingress -n default
```

It takes several minutes for the Google Cloud Load Balancer to provision. Check the managed certificate status:

```bash
kubectl get managedcertificate my-app-cert -n default -o yaml
```

The certificate status will transition through `Provisioning` to `Active` once DNS is configured and certificate validation completes.

Monitor the Flux Kustomization:

```bash
flux get kustomizations ingress
```

## Troubleshooting

### Common Issues

**Ingress stuck with no IP address**: The load balancer takes 3-5 minutes to provision. If it takes longer, check the GKE Ingress controller logs and ensure the Service is of type `NodePort`.

**Certificate stuck in Provisioning**: The managed certificate requires DNS to point to the load balancer IP. Ensure your DNS A record for the domain matches the static IP address.

**502 Bad Gateway errors**: This usually indicates health check failures. Verify your application responds on the health check path configured in the BackendConfig and that readiness probes are passing.

**Mixed content or redirect loops**: If you enable HTTPS redirect, ensure your application does not also perform redirects to avoid loops.

## Summary

Managing GKE Ingress resources through Flux provides a GitOps-driven approach to networking on GKE. By defining your Ingress, ManagedCertificate, FrontendConfig, and BackendConfig resources in Git, you gain version control, easy rollbacks, and consistent configuration across environments. The GKE Ingress controller handles the underlying Google Cloud Load Balancer provisioning automatically.
