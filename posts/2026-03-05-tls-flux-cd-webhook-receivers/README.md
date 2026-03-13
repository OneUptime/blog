# How to Configure TLS for Flux CD Webhook Receivers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, TLS, Webhooks, Certificates

Description: Learn how to configure TLS encryption for Flux CD webhook receivers to secure incoming webhook traffic from Git providers and external services.

---

Flux CD webhook receivers allow external services like GitHub, GitLab, and Bitbucket to trigger reconciliations when changes are pushed. By default, webhook traffic may be unencrypted. Configuring TLS ensures that webhook payloads are encrypted in transit and that the receiver's identity is verified. This guide shows you how to set up TLS for Flux CD webhook receivers.

## Why TLS for Webhook Receivers

Webhook receivers accept HTTP POST requests from external services. Without TLS:

- Webhook payloads (including tokens) are sent in plaintext.
- Attackers could intercept or tamper with webhook requests.
- Git providers may reject webhook endpoints that do not use HTTPS.

## Step 1: Create a TLS Certificate

Generate a TLS certificate for the webhook receiver. For production, use cert-manager to automate certificate management:

```yaml
# cert-manager-certificate.yaml
# Use cert-manager to provision a TLS certificate for the webhook receiver
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: webhook-receiver-tls
  namespace: flux-system
spec:
  secretName: webhook-receiver-tls
  dnsNames:
    - webhook-receiver.flux-system.svc.cluster.local
    - flux-webhook.example.com  # External DNS name
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  duration: 2160h    # 90 days
  renewBefore: 360h  # Renew 15 days before expiry
```

For testing, create a self-signed certificate:

```bash
# Generate a self-signed TLS certificate for testing
openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout webhook-tls.key \
  -out webhook-tls.crt \
  -subj "/CN=webhook-receiver.flux-system.svc.cluster.local"

# Create a Kubernetes TLS Secret
kubectl create secret tls webhook-receiver-tls \
  --cert=webhook-tls.crt \
  --key=webhook-tls.key \
  -n flux-system
```

## Step 2: Configure the Flux Webhook Receiver

Create a Flux Receiver resource that references the TLS secret:

```yaml
# receiver-github.yaml
# Flux Receiver for GitHub webhooks
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: github-receiver
  namespace: flux-system
spec:
  type: github
  events:
    - "ping"
    - "push"
  secretRef:
    # Secret containing the webhook token for payload validation
    name: github-webhook-token
  resources:
    - kind: GitRepository
      name: flux-system
      namespace: flux-system
```

Create the webhook token secret:

```bash
# Create the webhook token secret
kubectl create secret generic github-webhook-token \
  --from-literal=token=$(openssl rand -hex 32) \
  -n flux-system

# Retrieve the token for configuring in GitHub
kubectl get secret github-webhook-token -n flux-system \
  -o jsonpath='{.data.token}' | base64 -d
```

## Step 3: Configure Ingress with TLS Termination

Set up an Ingress resource to expose the webhook receiver with TLS:

```yaml
# ingress-webhook.yaml
# Ingress for Flux webhook receiver with TLS termination
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flux-webhook
  namespace: flux-system
  annotations:
    # For nginx ingress controller
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    # Rate limiting for security
    nginx.ingress.kubernetes.io/limit-rps: "10"
    nginx.ingress.kubernetes.io/limit-connections: "5"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - flux-webhook.example.com
      secretName: webhook-receiver-tls
  rules:
    - host: flux-webhook.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: notification-controller
                port:
                  number: 80
```

## Step 4: Get the Webhook URL

Retrieve the webhook URL to configure in your Git provider:

```bash
# Get the receiver webhook URL
flux get receivers github-receiver

# The URL will look like:
# /hook/<token-hash>
# Combine with your ingress domain:
# https://flux-webhook.example.com/hook/<token-hash>

# You can also get it from the Receiver status
kubectl get receiver github-receiver -n flux-system \
  -o jsonpath='{.status.webhookPath}'
```

## Step 5: Configure GitHub Webhook

Set up the webhook in your GitHub repository:

```bash
# Using the GitHub CLI to create the webhook
WEBHOOK_URL="https://flux-webhook.example.com$(kubectl get receiver github-receiver -n flux-system -o jsonpath='{.status.webhookPath}')"
WEBHOOK_SECRET=$(kubectl get secret github-webhook-token -n flux-system -o jsonpath='{.data.token}' | base64 -d)

gh webhook create \
  --repo myorg/myrepo \
  --events push \
  --url "$WEBHOOK_URL" \
  --secret "$WEBHOOK_SECRET" \
  --content-type json
```

## Step 6: Verify TLS Configuration

Test that the webhook endpoint is properly secured with TLS:

```bash
# Verify TLS certificate
openssl s_client -connect flux-webhook.example.com:443 -servername flux-webhook.example.com < /dev/null 2>/dev/null | openssl x509 -noout -text | grep -A2 "Subject:"

# Test the webhook endpoint
curl -v https://flux-webhook.example.com/hook/test-path 2>&1 | grep "SSL"

# Send a test webhook request
curl -X POST https://flux-webhook.example.com$(kubectl get receiver github-receiver -n flux-system -o jsonpath='{.status.webhookPath}') \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=test" \
  -d '{"ref":"refs/heads/main"}' \
  -v

# Check notification-controller logs for incoming webhooks
kubectl logs -n flux-system deployment/notification-controller | grep -i "webhook\|receiver"
```

## Best Practices

1. **Always use TLS in production**: Never expose webhook receivers without encryption.
2. **Use cert-manager**: Automate certificate provisioning and renewal with cert-manager.
3. **Rotate webhook tokens**: Periodically rotate the webhook token secret and update it in your Git provider.
4. **Rate limit the endpoint**: Configure rate limiting on the Ingress to prevent abuse.
5. **Restrict source IPs**: If your Git provider publishes webhook IP ranges, restrict the Ingress to only those IPs.
6. **Monitor webhook activity**: Watch notification-controller logs for unexpected webhook requests.

Configuring TLS for Flux CD webhook receivers is a fundamental security requirement. It ensures that webhook payloads are encrypted in transit and that your GitOps trigger mechanism is protected from tampering and eavesdropping.
