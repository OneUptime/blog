# How to Expose ArgoCD with GCE Ingress

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, GCP, Ingress

Description: Learn how to expose ArgoCD on Google Kubernetes Engine using the GCE Ingress Controller with Google-managed SSL certificates and Cloud Armor.

---

Google Kubernetes Engine (GKE) ships with a built-in ingress controller that provisions Google Cloud Load Balancers. Using the GCE Ingress to expose ArgoCD gives you native integration with Google Cloud services like managed SSL certificates, Cloud Armor for WAF, and Cloud CDN. This guide walks through the complete setup for exposing ArgoCD through GCE Ingress on GKE.

## Why GCE Ingress for ArgoCD on GKE

When running on GKE, the GCE Ingress Controller is the first-party option. It creates Google Cloud HTTP(S) Load Balancers that live outside the cluster, meaning they survive cluster restarts and upgrades. Key benefits include:

- Google-managed SSL certificates that auto-renew
- Cloud Armor integration for DDoS protection and IP filtering
- Cloud CDN support (though not useful for ArgoCD specifically)
- IAP (Identity-Aware Proxy) for an additional authentication layer
- Native health checking through Google Cloud

The main consideration is that GCE Ingress creates external load balancers, which take 3 to 5 minutes to provision and have some quirks around backend health checks.

## Prerequisites

- A GKE cluster with ArgoCD installed
- A domain name with DNS pointing to Google Cloud
- `gcloud` CLI configured with appropriate permissions

## Configuring ArgoCD for GCE Ingress

GCE Ingress performs health checks against your backend. ArgoCD server needs to be configured so the health check succeeds. Set ArgoCD to run in insecure mode:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  server.insecure: "true"
```

```bash
kubectl apply -f argocd-cmd-params-cm.yaml
kubectl rollout restart deployment argocd-server -n argocd
```

## Creating a BackendConfig for Health Checks

GCE Ingress uses a BackendConfig CRD to configure load balancer behavior. Create one for ArgoCD:

```yaml
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: argocd-backend-config
  namespace: argocd
spec:
  # Health check configuration
  healthCheck:
    checkIntervalSec: 30
    timeoutSec: 5
    healthyThreshold: 1
    unhealthyThreshold: 3
    type: HTTP
    requestPath: /healthz
    port: 8080
  # Connection timeout
  timeoutSec: 300
  # Cloud Armor security policy (optional)
  # securityPolicy:
  #   name: argocd-security-policy
```

Link the BackendConfig to the ArgoCD server service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: argocd-server
  namespace: argocd
  annotations:
    # Link to the BackendConfig
    cloud.google.com/backend-config: '{"default": "argocd-backend-config"}'
    # Use NEG (Network Endpoint Groups) for better performance
    cloud.google.com/neg: '{"ingress": true}'
spec:
  type: ClusterIP
  ports:
    - name: http
      port: 80
      targetPort: 8080
    - name: https
      port: 443
      targetPort: 8080
  selector:
    app.kubernetes.io/name: argocd-server
```

## Creating a Google-Managed SSL Certificate

Use a ManagedCertificate resource for automatic TLS:

```yaml
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: argocd-managed-cert
  namespace: argocd
spec:
  domains:
    - argocd.example.com
```

## Creating the GCE Ingress

Now create the Ingress resource:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: argocd
  annotations:
    # Use the GCE ingress class
    kubernetes.io/ingress.class: "gce"
    # Reference the managed certificate
    networking.gke.io/managed-certificates: argocd-managed-cert
    # Static IP address (recommended for production)
    kubernetes.io/ingress.global-static-ip-name: argocd-ip
    # Redirect HTTP to HTTPS
    networking.gke.io/v1beta1.FrontendConfig: argocd-frontend-config
spec:
  rules:
    - host: argocd.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 80
```

## FrontendConfig for HTTPS Redirect

Create a FrontendConfig to redirect HTTP to HTTPS:

```yaml
apiVersion: networking.gke.io/v1beta1
kind: FrontendConfig
metadata:
  name: argocd-frontend-config
  namespace: argocd
spec:
  redirectToHttps:
    enabled: true
    responseCodeName: MOVED_PERMANENTLY_DEFAULT
```

## Reserving a Static IP

Reserve a global static IP so your DNS does not break when the load balancer is recreated:

```bash
# Reserve a global static IP
gcloud compute addresses create argocd-ip --global

# Get the reserved IP address
gcloud compute addresses describe argocd-ip --global --format="value(address)"
```

Point your DNS A record to this IP address.

## Adding Cloud Armor Protection

Create a Cloud Armor security policy to protect ArgoCD:

```bash
# Create a security policy
gcloud compute security-policies create argocd-security-policy \
  --description="Security policy for ArgoCD"

# Add a rule to allow only specific IP ranges
gcloud compute security-policies rules create 1000 \
  --security-policy=argocd-security-policy \
  --src-ip-ranges="10.0.0.0/8,172.16.0.0/12" \
  --action=allow \
  --description="Allow internal networks"

# Set default rule to deny
gcloud compute security-policies rules update 2147483647 \
  --security-policy=argocd-security-policy \
  --action=deny-403
```

Then reference it in the BackendConfig:

```yaml
spec:
  securityPolicy:
    name: argocd-security-policy
```

## Adding Identity-Aware Proxy (IAP)

For an additional layer of authentication before users even reach ArgoCD, enable IAP:

```yaml
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: argocd-backend-config
  namespace: argocd
spec:
  iap:
    enabled: true
    oauthclientCredentials:
      secretName: argocd-iap-secret
```

Create the IAP OAuth credentials:

```bash
# Create a secret with your IAP OAuth client credentials
kubectl create secret generic argocd-iap-secret \
  --namespace=argocd \
  --from-literal=client_id=YOUR_CLIENT_ID \
  --from-literal=client_secret=YOUR_CLIENT_SECRET
```

## Verifying the Setup

GCE load balancer provisioning takes 3 to 5 minutes. Monitor the progress:

```bash
# Watch the Ingress status
kubectl get ingress -n argocd -w

# Check managed certificate status (takes up to 15 minutes)
kubectl get managedcertificates -n argocd

# Check backend health in the Google Cloud console
gcloud compute backend-services list

# Verify health check status
gcloud compute health-checks list

# Test access
curl -I https://argocd.example.com
```

## Troubleshooting

**Backend Unhealthy**: The most common issue. GCE health checks hit the pod directly, not through the service. Verify that port 8080 on the ArgoCD server pod returns 200 on `/healthz`.

**Certificate Pending**: Google-managed certificates need DNS to resolve to the load balancer IP before they provision. Make sure your DNS is pointing to the static IP.

**502 Errors**: Usually means the backend health check is failing. Check the BackendConfig health check configuration and make sure the port matches what ArgoCD server is listening on.

**Slow Provisioning**: GCE Ingress is slower than in-cluster ingress controllers. Initial setup can take 5 to 10 minutes. Be patient.

For CLI access through GCE Ingress, use the `--grpc-web` flag since ALB does not natively support gRPC passthrough the same way Nginx does:

```bash
argocd login argocd.example.com --grpc-web
```

For more ArgoCD networking options, check out our guide on [exposing ArgoCD with AWS ALB](https://oneuptime.com/blog/post/2026-02-26-argocd-aws-alb-ingress/view) or [configuring TLS with cert-manager](https://oneuptime.com/blog/post/2026-02-26-argocd-cert-manager-ssl/view).
