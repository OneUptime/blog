# How to Configure Network Policies for Flux Webhook Receiver Ingress

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Security, Network Policies, Webhook, Ingress

Description: Secure the Flux notification-controller webhook receiver by configuring Kubernetes NetworkPolicies that restrict inbound traffic to only trusted sources.

---

Flux supports webhook receivers that allow external systems like GitHub, GitLab, and Docker Hub to trigger immediate reconciliation when changes are pushed. The notification-controller exposes an HTTP endpoint inside the cluster to receive these webhooks. Without ingress NetworkPolicies, any pod in the cluster or any external source routed through an ingress controller can reach that endpoint. This guide shows how to lock down the webhook receiver so only legitimate traffic can reach it.

## Prerequisites

- A Kubernetes cluster (v1.24+) with a CNI that enforces NetworkPolicies
- Flux installed in the flux-system namespace with the notification-controller running
- An existing Receiver resource configured in Flux
- An ingress controller (NGINX, Traefik, or similar) configured to route external webhooks to the notification-controller
- kubectl with cluster-admin access

Check that the notification-controller is running and the webhook receiver service exists:

```bash
kubectl get deployment notification-controller -n flux-system
kubectl get svc webhook-receiver -n flux-system
```

List existing Receiver resources:

```bash
kubectl get receivers -n flux-system
```

## Understanding the Webhook Receiver Architecture

When a Receiver is configured, the notification-controller exposes a webhook endpoint at:

```bash
http://webhook-receiver.flux-system.svc.cluster.local/hook/<receiver-token>
```

External services (GitHub, GitLab, etc.) send POST requests to this endpoint through your ingress controller. The flow is:

1. External service sends a webhook to your public URL
2. Ingress controller routes the request to the webhook-receiver service
3. The notification-controller validates the payload and triggers reconciliation

The ingress policy should allow traffic from the ingress controller pods and block everything else.

## Step 1: Create a Default Deny Ingress Policy

Start by denying all inbound traffic to pods in the flux-system namespace:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress: []
```

```bash
kubectl apply -f default-deny-ingress.yaml
```

This blocks all incoming connections to every pod in flux-system. The following steps open up only the required paths.

## Step 2: Allow Ingress from the Ingress Controller

Identify your ingress controller namespace and pod labels:

```bash
# For NGINX ingress controller
kubectl get pods -n ingress-nginx --show-labels

# For Traefik
kubectl get pods -n traefik --show-labels
```

Create a policy that allows the ingress controller to reach the notification-controller on the webhook port:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-webhook-from-ingress
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: notification-controller
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
          podSelector:
            matchLabels:
              app.kubernetes.io/name: ingress-nginx
      ports:
        - protocol: TCP
          port: 9292
```

The notification-controller webhook receiver listens on port 9292. Adjust the namespace and pod labels to match your ingress controller.

For Traefik:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-webhook-from-traefik
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: notification-controller
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: traefik
          podSelector:
            matchLabels:
              app.kubernetes.io/name: traefik
      ports:
        - protocol: TCP
          port: 9292
```

## Step 3: Allow Inter-Controller Communication

Flux controllers communicate with each other internally. The source-controller serves artifacts over HTTP, and other controllers fetch from it. Allow this internal traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-flux-internal
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector: {}
      ports:
        - protocol: TCP
          port: 8080
        - protocol: TCP
          port: 9090
        - protocol: TCP
          port: 9292
        - protocol: TCP
          port: 8443
```

This allows all pods within flux-system to communicate with each other on the standard Flux controller ports.

## Step 4: Allow Prometheus Metrics Scraping

If you run Prometheus to monitor Flux, allow metrics scraping from the monitoring namespace:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-prometheus-scrape
  namespace: flux-system
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: monitoring
          podSelector:
            matchLabels:
              app.kubernetes.io/name: prometheus
      ports:
        - protocol: TCP
          port: 8080
```

## Step 5: Configure the Ingress Resource for Webhooks

Create an Ingress resource that routes external webhook traffic to the notification-controller:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flux-webhook
  namespace: flux-system
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - flux-webhook.example.com
      secretName: flux-webhook-tls
  rules:
    - host: flux-webhook.example.com
      http:
        paths:
          - path: /hook/
            pathType: Prefix
            backend:
              service:
                name: webhook-receiver
                port:
                  number: 80
```

## Step 6: Restrict by Source IP (Optional)

If your webhook sources have known IP addresses, add IP-based restrictions at the ingress level:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flux-webhook
  namespace: flux-system
  annotations:
    nginx.ingress.kubernetes.io/whitelist-source-range: "140.82.112.0/20,185.199.108.0/22,192.30.252.0/22"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - flux-webhook.example.com
      secretName: flux-webhook-tls
  rules:
    - host: flux-webhook.example.com
      http:
        paths:
          - path: /hook/
            pathType: Prefix
            backend:
              service:
                name: webhook-receiver
                port:
                  number: 80
```

The whitelist-source-range annotation limits access to GitHub webhook IPs. Get the current list:

```bash
curl -s https://api.github.com/meta | jq -r '.hooks[]'
```

## Verification

Test that the webhook endpoint is accessible through the ingress:

```bash
curl -X POST https://flux-webhook.example.com/hook/<receiver-token> \
  -H "Content-Type: application/json" \
  -d '{}'
```

Check the notification-controller logs for the incoming request:

```bash
kubectl logs -n flux-system deployment/notification-controller --tail=20
```

Verify that direct access from other namespaces is blocked:

```bash
kubectl run test-webhook -n default --rm -it --image=busybox -- \
  wget -qO- --timeout=5 http://webhook-receiver.flux-system.svc.cluster.local/hook/test
```

This should time out, confirming the ingress policy blocks cross-namespace access.

List the active policies:

```bash
kubectl get networkpolicies -n flux-system
```

## Troubleshooting

**Webhooks return 502 or connection refused**

Check that the ingress controller can reach the notification-controller:

```bash
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --tail=20
```

Verify the NetworkPolicy allows traffic from the ingress controller namespace and pods. The most common issue is incorrect labels on the namespaceSelector or podSelector.

**Webhooks work from curl but not from GitHub**

GitHub uses specific IP ranges for webhooks. Verify these IPs are allowed by your ingress annotations:

```bash
curl -s https://api.github.com/meta | jq '.hooks'
```

Check the GitHub webhook delivery logs in your repository settings under Webhooks to see the response code.

**Flux controllers cannot communicate after applying deny policy**

The default deny ingress policy blocks all traffic, including inter-controller communication. Make sure the allow-flux-internal policy is applied and the port numbers match your Flux installation.

Check which ports each controller uses:

```bash
kubectl get svc -n flux-system
```

**Prometheus cannot scrape Flux metrics**

Verify the monitoring namespace label matches your policy:

```bash
kubectl get namespace monitoring --show-labels
```

The namespace must have the `kubernetes.io/metadata.name: monitoring` label. This is automatically added by Kubernetes 1.21+ for all namespaces.
