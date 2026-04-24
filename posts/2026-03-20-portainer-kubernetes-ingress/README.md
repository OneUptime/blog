# How to Manage Kubernetes Ingress Resources in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Ingress, Networking, HTTPS

Description: Learn how to create, configure, and manage Kubernetes Ingress resources in Portainer to route external HTTP and HTTPS traffic to your applications.

## Introduction

Kubernetes Ingress resources provide HTTP/HTTPS routing rules that direct external traffic to internal Services. Portainer makes it easy to manage Ingress objects through a visual interface while still allowing full YAML customization for advanced use cases.

## Prerequisites

- Portainer CE or BE with a Kubernetes environment connected
- An Ingress Controller installed (nginx-ingress, Traefik, etc.)
- Services already deployed and running
- Admin or operator access to the namespace

## Step 1: Install an Ingress Controller

Portainer does not install an Ingress Controller for you. Install one first:

For example, on a bare-metal or local cluster:

```bash
# Install NGINX Ingress Controller

kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.15.1/deploy/static/provider/baremetal/deploy.yaml

# Verify it's running
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

## Step 2: Configure Ingress in Portainer Settings

In Portainer, verify your Ingress classes are available:

1. Go to **Cluster** → **Setup**.
2. Under **Networking** → **Ingresses**, confirm your Ingress Class (for example, `nginx`) is listed and allowed. Portainer auto-detects installed ingress controllers and allows them by default.
3. If your cluster does not define an `IngressClass` resource, optionally enable **Allow Ingress class to be set to "none"**.
4. Save settings.

## Step 3: Create an Ingress via Portainer UI

### From the Ingress Form

When creating an Ingress in Portainer:

1. Go to **Networking** → **Ingresses**.
2. Click **Add with form**.
3. Select the namespace.
4. Set:
   - **Name**: `myapp-ingress`
   - **Ingress class**: `nginx`
   - **Hostname**: `myapp.example.com`
   - **Service**: Select your service
   - **Service port**: `80`
   - **Path**: `/`
   - **Path type**: `Prefix`
5. Click **Create**.

### Via KubeShell YAML

```yaml
# ingress-basic.yaml - Simple HTTP ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  namespace: production
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

```bash
kubectl apply -f ingress-basic.yaml
```

## Step 4: Configure TLS/HTTPS

Create a TLS secret first:

```bash
# Create a TLS secret from your certificate files
kubectl create secret tls myapp-tls \
  --cert=fullchain.pem \
  --key=privkey.pem \
  -n production
```

Then create the Ingress with TLS:

```yaml
# ingress-tls.yaml - HTTPS ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress-tls
  namespace: production
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - myapp.example.com
      secretName: myapp-tls      # References the TLS secret
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

## Step 5: Multi-Service Ingress Routing

Route different paths to different services:

```yaml
# ingress-multi-service.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-service-ingress
  namespace: production
spec:
  ingressClassName: nginx
  rules:
    - host: example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 8080
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 3000
```

## Step 6: Edit and Delete Ingress Resources

Via Portainer UI:

1. Go to **Networking** → **Ingresses**.
2. Click the Ingress name to review its details.
3. To delete, select it and click **Remove**.

Via KubeShell:

```bash
# List ingresses
kubectl get ingress -n production

# Describe for debugging
kubectl describe ingress myapp-ingress -n production

# Edit an ingress
kubectl edit ingress myapp-ingress -n production

# Delete an ingress
kubectl delete ingress myapp-ingress -n production
```

## Troubleshooting

```bash
# Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx --tail=50

# Check ingress events
kubectl get events -n production --field-selector involvedObject.kind=Ingress,involvedObject.name=myapp-ingress

# Test DNS resolution
nslookup myapp.example.com
curl -I http://myapp.example.com
```

## Conclusion

Managing Kubernetes Ingress resources in Portainer provides a clear visual interface for configuring HTTP/HTTPS routing rules. Start with a basic HTTP ingress, add TLS for production workloads, and use path-based routing to direct traffic to multiple backend services. Always verify your Ingress Controller is properly installed and that service selectors are correctly configured before deploying ingress rules.
