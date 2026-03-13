# How to Expose Flux Receiver Behind Gateway API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Receiver, Webhooks, Gateway API, Networking, HTTPRoute

Description: A step-by-step guide to exposing the Flux notification-controller Receiver through the Kubernetes Gateway API for external webhook delivery.

---

The Kubernetes Gateway API is the successor to the Ingress resource, providing a more expressive and role-oriented model for routing traffic into a cluster. If your cluster already uses the Gateway API for external access, it makes sense to expose your Flux Receiver through an HTTPRoute rather than a legacy Ingress object.

This guide covers how to route external webhook traffic from providers like GitHub, GitLab, and Bitbucket to the Flux notification-controller using Gateway API resources.

## Prerequisites

Before you begin, confirm the following:

- A Kubernetes cluster running version 1.26 or later.
- Flux CD installed and bootstrapped.
- A Gateway API implementation installed (for example, Envoy Gateway, Istio, Cilium, or Contour).
- The Gateway API CRDs installed at version v1 or later.
- `kubectl` and `flux` CLI tools available locally.
- A domain name with DNS records pointing to your Gateway's external address.

Verify that the Gateway API CRDs are installed:

```bash
kubectl get crd gateways.gateway.networking.k8s.io
kubectl get crd httproutes.gateway.networking.k8s.io
```

Verify Flux is healthy:

```bash
flux check
```

## Step 1: Create a Webhook Token Secret

Generate a shared secret that the Receiver will use to validate incoming webhooks:

```bash
TOKEN=$(head -c 32 /dev/urandom | shasum | head -c 40)

kubectl -n flux-system create secret generic webhook-token \
  --from-literal=token=$TOKEN
```

Store the token value securely. You will configure it on the webhook provider side later.

## Step 2: Create the Flux Receiver

Define a Receiver that listens for GitHub push events:

```yaml
# receiver.yaml
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

Apply and retrieve the generated webhook path:

```bash
kubectl apply -f receiver.yaml

# Wait for the receiver to become ready
kubectl -n flux-system wait receiver/github-receiver --for=condition=Ready --timeout=30s

# Get the webhook path
WEBHOOK_PATH=$(kubectl -n flux-system get receiver github-receiver -o jsonpath='{.status.webhookPath}')
echo $WEBHOOK_PATH
```

## Step 3: Create a Gateway Resource

If you do not already have a Gateway, create one. This example uses a simple HTTPS Gateway:

```yaml
# gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: external-gateway
  namespace: flux-system
  annotations:
    # Annotation varies by implementation. This example is for cert-manager.
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  gatewayClassName: eg  # Change to match your Gateway implementation
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      hostname: flux-webhook.example.com
      tls:
        mode: Terminate
        certificateRefs:
          - name: flux-webhook-tls
            kind: Secret
      allowedRoutes:
        namespaces:
          from: Same
```

Apply the Gateway:

```bash
kubectl apply -f gateway.yaml
```

If you already have a shared Gateway in another namespace, you can skip this step and reference it from the HTTPRoute using a `parentRef` with the appropriate namespace.

## Step 4: Create an HTTPRoute

Create an HTTPRoute that sends webhook traffic to the notification-controller:

```yaml
# httproute.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: flux-receiver
  namespace: flux-system
spec:
  parentRefs:
    - name: external-gateway
      namespace: flux-system
      sectionName: https
  hostnames:
    - flux-webhook.example.com
  rules:
    # Route webhook requests to the notification-controller
    - matches:
        - path:
            type: PathPrefix
            value: /hook/
          method: POST
      backendRefs:
        - name: notification-controller
          port: 80
    # Return 404 for everything else on this host
    - matches:
        - path:
            type: PathPrefix
            value: /
      filters:
        - type: ResponseHeaderModifier
          responseHeaderModifier:
            set:
              - name: Content-Type
                value: text/plain
      backendRefs:
        - name: notification-controller
          port: 80
```

Apply it:

```bash
kubectl apply -f httproute.yaml
```

The `method: POST` match ensures that only POST requests reach the notification-controller. GET and other methods will not match the first rule.

## Step 5: Create a ReferenceGrant (Cross-Namespace Gateway)

If your Gateway lives in a different namespace (for example `gateway-system`), you need a ReferenceGrant to allow the HTTPRoute to attach to it:

```yaml
# referencegrant.yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-flux-httproute
  namespace: gateway-system
spec:
  from:
    - group: gateway.networking.k8s.io
      kind: HTTPRoute
      namespace: flux-system
  to:
    - group: gateway.networking.k8s.io
      kind: Gateway
```

Apply it:

```bash
kubectl apply -f referencegrant.yaml
```

And update the HTTPRoute parentRef:

```yaml
  parentRefs:
    - name: shared-gateway
      namespace: gateway-system
      sectionName: https
```

## Step 6: Configure the Webhook Provider

On GitHub (or your chosen provider), add a webhook with:

- **Payload URL**: `https://flux-webhook.example.com/<webhook-path>` using the path from Step 2.
- **Content type**: `application/json`
- **Secret**: The token from Step 1.
- **Events**: Push events (or whichever events your Receiver is configured for).

## Verification

Check that all resources are healthy:

```bash
# Gateway should have an address
kubectl -n flux-system get gateway external-gateway

# HTTPRoute should show accepted
kubectl -n flux-system get httproute flux-receiver

# Receiver should be ready
kubectl -n flux-system get receiver github-receiver
```

Inspect the HTTPRoute status to confirm it has been accepted by the Gateway:

```bash
kubectl -n flux-system describe httproute flux-receiver
```

Look for `Accepted: True` and `ResolvedRefs: True` in the conditions.

Test with curl:

```bash
curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$(echo -n '{}' | openssl dgst -sha256 -hmac "$TOKEN" | awk '{print $2}')" \
  -d '{}' \
  https://flux-webhook.example.com/$WEBHOOK_PATH
```

You should receive a 200 status code.

## Troubleshooting

### HTTPRoute not accepted

Check that the `gatewayClassName` matches your installed Gateway implementation:

```bash
kubectl get gatewayclass
```

Also verify the listener's hostname matches the HTTPRoute's hostname.

### 404 on the webhook path

Confirm the HTTPRoute path prefix matches the Receiver webhook path. The webhook path starts with `/hook/`, so the HTTPRoute must use `PathPrefix: /hook/`.

### Connection refused or timeout

Verify the Gateway has an external address assigned:

```bash
kubectl -n flux-system get gateway external-gateway -o jsonpath='{.status.addresses}'
```

Ensure your DNS points to this address.

### ReferenceGrant rejected

Make sure the ReferenceGrant is in the target namespace (where the Gateway lives), not in the source namespace. The `from` field should reference the namespace where the HTTPRoute is deployed.

### Receiver shows Ready but webhook fails

Inspect the notification-controller logs:

```bash
kubectl -n flux-system logs deploy/notification-controller --since=5m
```

Look for token validation errors or malformed payload messages.

## Summary

Using the Gateway API to expose a Flux Receiver gives you fine-grained control over routing, including method-based matching, cross-namespace references with ReferenceGrants, and a clear separation between infrastructure (Gateway) and application (HTTPRoute) concerns. The approach is forward-looking as the community moves from Ingress to Gateway API as the standard for Kubernetes traffic management.
