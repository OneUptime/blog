# How to Secure Flux Receiver Endpoint with Token Authentication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Receiver, Webhook, Security, Authentication, Token

Description: A comprehensive guide to securing Flux Receiver webhook endpoints with HMAC token authentication for GitHub, GitLab, Bitbucket, and generic webhook providers.

---

When you expose a Flux Receiver endpoint outside your cluster, anyone who discovers the URL can send requests to it. Without proper authentication an attacker could trigger unwanted reconciliations, flood your cluster with requests, or probe for vulnerabilities. Flux Receivers use provider-specific token authentication to verify that incoming webhooks genuinely originate from your configured provider.

This guide explains how token authentication works in Flux Receivers and how to configure it correctly for different webhook providers.

## Prerequisites

- A Kubernetes cluster with Flux CD installed and bootstrapped.
- The Flux notification-controller running in the `flux-system` namespace.
- `kubectl` and `flux` CLI tools available.
- A Receiver endpoint exposed externally (via Ingress or Gateway API).
- A webhook provider such as GitHub, GitLab, or Bitbucket.

Verify Flux is running:

```bash
flux check
```

## How Token Authentication Works

Flux Receivers do not use bearer tokens or API keys in the traditional sense. Instead, they rely on provider-specific verification. GitHub, Bitbucket Server, and `generic-hmac` Receivers verify HMAC (Hash-based Message Authentication Code) signatures over the request payload using a shared secret. GitLab Receivers compare GitLab's `X-Gitlab-Token` header with the shared secret.

The flow works like this:

1. You create a Kubernetes secret containing a token string.
2. You configure the same token string as the webhook secret on the provider side (GitHub, GitLab, and so on).
3. When an HMAC-capable provider sends a webhook, it computes an HMAC signature of the payload using the shared secret and includes it in a request header.
4. The Flux notification-controller extracts the signature header, recomputes the HMAC over the received payload, and compares the two values. For GitLab, it compares the `X-Gitlab-Token` header directly with the shared secret.
5. If the validation succeeds, the request is authentic. If not, Flux rejects the request with HTTP 400 Bad Request.

The exact header name and algorithm vary by provider type.

## Step 1: Generate a Strong Token

Use a cryptographically secure random generator to create the token:

```bash
# Generate a 40-character hex token

TOKEN=$(head -c 32 /dev/urandom | shasum | head -c 40)
echo "Your webhook token: $TOKEN"
```

Avoid short, predictable, or reused tokens. A minimum of 32 characters of random hex is recommended.

## Step 2: Store the Token in a Kubernetes Secret

Create the secret in the same namespace as the Receiver:

```bash
kubectl -n flux-system create secret generic webhook-token \
  --from-literal=token=$TOKEN
```

To manage this secret declaratively with SOPS or Sealed Secrets:

```yaml
# webhook-token-sealed.yaml (before sealing)
apiVersion: v1
kind: Secret
metadata:
  name: webhook-token
  namespace: flux-system
type: Opaque
stringData:
  token: "your-generated-token-value-here"
```

Seal it with kubeseal or encrypt with SOPS before committing to Git.

## Step 3: Create the Receiver with Token Reference

### GitHub Receiver

GitHub sends an `X-Hub-Signature-256` header containing `sha256=<hmac>`:

```yaml
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
    name: webhook-token
  resources:
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: flux-system
```

### GitLab Receiver

GitLab sends the token in the `X-Gitlab-Token` header as a plain value (not HMAC):

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: gitlab-receiver
  namespace: flux-system
spec:
  type: gitlab
  events:
    - "Push Hook"
    - "Tag Push Hook"
  secretRef:
    name: webhook-token
  resources:
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: flux-system
```

### Bitbucket Receiver

Bitbucket Server sends an `X-Hub-Signature` header with `sha256=<hmac>`:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: bitbucket-receiver
  namespace: flux-system
spec:
  type: bitbucket
  events:
    - "repo:refs_changed"
  secretRef:
    name: webhook-token
  resources:
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: flux-system
```

### Generic HMAC Receiver

For custom or unsupported providers that can generate HMAC signatures, use the `generic-hmac` type. The caller must send an `X-Signature` header in the format `<hash-function>=<hash>`, where the hash function is `sha1`, `sha256`, or `sha512`:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: generic-hmac-receiver
  namespace: flux-system
spec:
  type: generic-hmac
  secretRef:
    name: webhook-token
  resources:
    - apiVersion: source.toolkit.fluxcd.io/v1
      kind: GitRepository
      name: flux-system
```

For example, a `sha256` signature can be sent as `X-Signature: sha256=<generated-hash>`. The plain `generic` Receiver type does not validate incoming requests; it only uses the token to generate the webhook path.

## Step 4: Configure the Webhook Provider

### GitHub

Go to **Settings > Webhooks > Add webhook** in your repository:

- Set the **Secret** field to the exact token value.
- Set **Content type** to `application/json`.
- Select the events you want to trigger on.

### GitLab

Go to **Settings > Webhooks** in your project:

- Set the **Secret token** field to the exact token value.
- Select the trigger events (Push events, Tag push events, and so on).

### Bitbucket Server

Go to **Repository settings > Webhooks**:

- Set the **Secret** field to the exact token value.
- Select the events to listen for.

## Step 5: Rotate Tokens

Periodically rotating tokens is a security best practice. To rotate:

```bash
# Generate a new token
NEW_TOKEN=$(head -c 32 /dev/urandom | shasum | head -c 40)

# Update the Kubernetes secret
kubectl -n flux-system create secret generic webhook-token \
  --from-literal=token=$NEW_TOKEN \
  --dry-run=client -o yaml | kubectl apply -f -

# Reconcile the Receiver so Flux regenerates the webhook path from the new token
kubectl -n flux-system annotate receiver github-receiver \
  reconcile.fluxcd.io/requestedAt="$(date +%s)" \
  --overwrite
```

Then immediately update the webhook secret and payload URL on the provider side. The Receiver webhook path is generated from the token, Receiver name, and namespace, so rotating the token changes the path. There will be a brief window where webhooks may fail during the transition.

## Verification

Check that the Receiver is ready:

```bash
kubectl -n flux-system get receiver github-receiver
```

Test the authentication by sending a properly signed request:

```bash
WEBHOOK_PATH=$(kubectl -n flux-system get receiver github-receiver -o jsonpath='{.status.webhookPath}')
PAYLOAD='{"ref":"refs/heads/main"}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$TOKEN" | awk '{print $2}')

curl -i -X POST \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$SIGNATURE" \
  -d "$PAYLOAD" \
  https://flux-webhook.example.com$WEBHOOK_PATH
```

Now test with a wrong token to verify rejection:

```bash
BAD_SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "wrong-token" | awk '{print $2}')

curl -i -X POST \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$BAD_SIGNATURE" \
  -d "$PAYLOAD" \
  https://flux-webhook.example.com$WEBHOOK_PATH
```

This should return HTTP 400.

## Troubleshooting

### 400 Bad Request on every request

The most common cause is a token mismatch. Verify the secret value:

```bash
kubectl -n flux-system get secret webhook-token -o jsonpath='{.data.token}' | base64 -d
```

Compare this with the secret configured on the provider side. They must be identical.

### Receiver shows Ready but provider reports failures

Check the notification-controller logs:

```bash
kubectl -n flux-system logs deploy/notification-controller --since=10m | grep -i "signature"
```

Look for signature validation errors. Common issues include trailing newlines in the secret value or mismatched HMAC algorithms.

### Secret key name mismatch

The secret must contain a key named `token`. If you used a different key name, the Receiver will not find it:

```bash
kubectl -n flux-system get secret webhook-token -o jsonpath='{.data}' | python3 -m json.tool
```

### Generic HMAC receiver returns 400

For `generic-hmac` receivers, make sure you are passing the HMAC signature in the `X-Signature` header, not the raw token as a query parameter. The plain `generic` Receiver type does not validate incoming requests.

## Summary

Token authentication is the primary security mechanism for Flux Receivers. Each provider type uses a slightly different approach to transmit and verify the token, but the core principle is the same: a shared secret that both sides use to prove authenticity. Use strong random tokens, store them securely with SOPS or Sealed Secrets, rotate them periodically, and always verify that rejected requests actually return HTTP 400 to confirm the mechanism is working correctly.
