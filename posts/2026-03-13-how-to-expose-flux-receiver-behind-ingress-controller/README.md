# How to Expose Flux Receiver Behind Ingress Controller

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Receiver, Webhook, Ingress, NGINX, Networking

Description: Learn how to expose the Flux notification-controller Receiver endpoint behind a Kubernetes Ingress controller so external services like GitHub and GitLab can trigger reconciliation.

---

Flux CD Receivers allow external systems such as GitHub, GitLab, Docker Hub, and other webhook providers to notify your cluster that a change has occurred. When a webhook fires, the Receiver tells Flux to immediately reconcile the relevant source, eliminating the need to wait for the next polling interval. By default the notification-controller service is only reachable inside the cluster. To accept webhooks from the outside world you need to expose it through an Ingress resource.

This guide walks through exposing the Flux Receiver behind an NGINX Ingress controller step by step.

## Prerequisites

Before you begin, make sure you have the following in place:

- A Kubernetes cluster running version 1.24 or later.
- Flux CD installed and bootstrapped on the cluster.
- An NGINX Ingress controller deployed in the cluster.
- `kubectl` configured to communicate with your cluster.
- A domain name with DNS pointed at your Ingress controller's external IP.
- `flux` CLI installed locally.

Verify Flux is running:

```bash
flux check
```

Verify the NGINX Ingress controller is healthy:

```bash
kubectl get pods -n ingress-nginx
```

## Step 1: Create a Webhook Token Secret

The Receiver requires a shared secret token to validate incoming webhook payloads. Create a Kubernetes secret that holds this token:

```bash
# Generate a random token
TOKEN=$(head -c 32 /dev/urandom | shasum | head -c 40)

# Create the secret in the flux-system namespace
kubectl -n flux-system create secret generic webhook-token \
  --from-literal=token=$TOKEN
```

Save the token value somewhere safe. You will need it when configuring the webhook on the sending side (for example, in GitHub repository settings).

## Step 2: Create the Flux Receiver

Define a Receiver resource that listens for GitHub push events and triggers reconciliation of your GitRepository source:

```yaml
# receiver.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: github-receiver
  namespace: flux-system
spec:
  type: github
  # Events that this receiver reacts to
  events:
    - "ping"
    - "push"
  # Reference to the secret containing the shared token
  secretRef:
    name: webhook-token
  # Resources that should be reconciled when a webhook arrives
  resources:
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: flux-system
```

Apply the resource:

```bash
kubectl apply -f receiver.yaml
```

After a few seconds the notification-controller generates a unique URL path for this Receiver. Retrieve it with:

```bash
kubectl -n flux-system get receiver github-receiver -o jsonpath='{.status.webhookPath}'
```

The output will look something like `/hook/a1b2c3d4e5f6...`. Note this path because you will need it for the Ingress definition.

## Step 3: Create the Ingress Resource

Now create an Ingress that routes external traffic to the notification-controller service on the webhook path:

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flux-receiver
  namespace: flux-system
  annotations:
    # Force SSL redirect for security
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    # Only allow POST requests to the webhook endpoint
    nginx.ingress.kubernetes.io/configuration-snippet: |
      if ($request_method != POST) {
        return 405;
      }
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
                name: notification-controller
                port:
                  number: 80
```

Apply it:

```bash
kubectl apply -f ingress.yaml
```

Replace `flux-webhook.example.com` with your actual domain. The TLS secret `flux-webhook-tls` can be provisioned manually or through cert-manager.

## Step 4: Configure TLS with cert-manager (Optional)

If you have cert-manager installed you can have it automatically provision a certificate by adding an annotation:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flux-receiver
  namespace: flux-system
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/configuration-snippet: |
      if ($request_method != POST) {
        return 405;
      }
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
                name: notification-controller
                port:
                  number: 80
```

## Step 5: Configure the Webhook on GitHub

In your GitHub repository go to **Settings > Webhooks > Add webhook** and fill in:

- **Payload URL**: `https://flux-webhook.example.com/<webhook-path>` where `<webhook-path>` is the value from Step 2.
- **Content type**: `application/json`
- **Secret**: The token value you generated in Step 1.
- **Events**: Select "Just the push event" or customize as needed.

Click **Add webhook**. GitHub will send a ping event that your Receiver should accept.

## Verification

Confirm the Receiver is ready:

```bash
kubectl -n flux-system get receiver github-receiver
```

The `READY` column should show `True`. Check the Ingress has an address assigned:

```bash
kubectl -n flux-system get ingress flux-receiver
```

Send a test request to verify end-to-end connectivity:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$(echo -n '{}' | openssl dgst -sha256 -hmac "$TOKEN" | awk '{print $2}')" \
  -d '{}' \
  https://flux-webhook.example.com/<webhook-path>
```

A successful response returns HTTP 200. You can then check the events on the GitRepository:

```bash
kubectl -n flux-system describe gitrepository flux-system | tail -20
```

Look for an annotation update timestamp that matches the time you sent the request.

## Troubleshooting

### Ingress returns 404

Make sure the path in the Ingress matches the webhook path prefix. The notification-controller generates paths starting with `/hook/`, so use `pathType: Prefix` with `path: /hook/`.

### Ingress returns 502

The notification-controller pod may not be running or the service port may be wrong. Verify:

```bash
kubectl -n flux-system get svc notification-controller
kubectl -n flux-system get pods -l app=notification-controller
```

### Receiver stays Not Ready

Check the notification-controller logs for errors:

```bash
kubectl -n flux-system logs deploy/notification-controller
```

Common causes include a missing or incorrectly named secret.

### TLS certificate not issued

If you are using cert-manager, check the certificate status:

```bash
kubectl -n flux-system get certificate flux-webhook-tls
kubectl -n flux-system describe certificate flux-webhook-tls
```

Make sure your DNS A record points to the Ingress controller's external IP.

### Webhook delivery fails on GitHub

In your GitHub webhook settings, click **Recent Deliveries** to inspect the HTTP response code and body. A 403 usually means the token does not match. A 404 means the path is wrong or the Ingress is not routing correctly.

## Summary

Exposing the Flux Receiver behind an Ingress controller enables external services to trigger immediate reconciliation in your cluster. The key steps are creating a token secret, defining a Receiver resource, setting up an Ingress with TLS, and configuring the upstream webhook provider with the correct URL and token. Combined with proper TLS termination and request-method filtering, this setup keeps your webhook endpoint both reachable and secure.
