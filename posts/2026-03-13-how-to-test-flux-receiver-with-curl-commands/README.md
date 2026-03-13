# How to Test Flux Receiver with curl Commands

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Receiver, Webhook, Testing, curl, Debugging

Description: A practical guide to testing Flux Receiver webhook endpoints using curl commands for GitHub, GitLab, Bitbucket, and generic receiver types with proper authentication headers.

---

Before wiring up a webhook provider to your Flux Receiver, you should verify that the endpoint works correctly. Testing with curl lets you simulate webhook deliveries, validate token authentication, and confirm that reconciliation is triggered without waiting for actual Git events. This guide provides ready-to-use curl commands for every Flux Receiver type.

## Prerequisites

- A Kubernetes cluster with Flux CD installed.
- At least one Receiver configured and ready.
- `curl` and `openssl` installed locally.
- `kubectl` configured to communicate with your cluster.
- The Receiver exposed externally via Ingress or Gateway API (for external tests) or access to run commands inside the cluster (for internal tests).

Gather the information you will need:

```bash
# Get the webhook path
WEBHOOK_PATH=$(kubectl -n flux-system get receiver github-receiver -o jsonpath='{.status.webhookPath}')
echo "Webhook path: $WEBHOOK_PATH"

# Get the token value
TOKEN=$(kubectl -n flux-system get secret webhook-token -o jsonpath='{.data.token}' | base64 -d)
echo "Token: $TOKEN"

# Set your webhook URL base
WEBHOOK_URL="https://flux-webhook.example.com"
```

## Testing from Inside the Cluster

If the Receiver is not exposed externally, you can test from inside the cluster using a temporary pod:

```bash
# Start a temporary curl pod
kubectl -n flux-system run curl-test --rm -it --image=curlimages/curl -- sh
```

Inside the pod, use the cluster-internal service URL:

```bash
# Internal URL format
INTERNAL_URL="http://notification-controller.flux-system.svc.cluster.local"
WEBHOOK_PATH="/hook/your-webhook-path-here"

curl -v -X POST \
  -H "Content-Type: application/json" \
  -d '{}' \
  ${INTERNAL_URL}${WEBHOOK_PATH}
```

## Testing a GitHub Receiver

GitHub webhooks use HMAC-SHA256 signatures sent in the `X-Hub-Signature-256` header. The signature is computed over the entire request body using the shared secret.

### Basic GitHub Push Event

```bash
# Define the payload
PAYLOAD='{"ref":"refs/heads/main","after":"abc123def456","repository":{"full_name":"org/repo"}}'

# Compute the HMAC-SHA256 signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$TOKEN" | awk '{print $2}')

# Send the request
curl -v -X POST \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$SIGNATURE" \
  -H "X-GitHub-Event: push" \
  -H "X-GitHub-Delivery: test-$(date +%s)" \
  -d "$PAYLOAD" \
  ${WEBHOOK_URL}${WEBHOOK_PATH}
```

A successful response returns HTTP 200 with an empty body or a short acknowledgment.

### GitHub Ping Event

GitHub sends a ping event when a webhook is first configured. Test it:

```bash
PAYLOAD='{"zen":"Keep it logically awesome.","hook_id":12345}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$TOKEN" | awk '{print $2}')

curl -v -X POST \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$SIGNATURE" \
  -H "X-GitHub-Event: ping" \
  -H "X-GitHub-Delivery: ping-$(date +%s)" \
  -d "$PAYLOAD" \
  ${WEBHOOK_URL}${WEBHOOK_PATH}
```

### Test with Wrong Signature (Should Fail)

Verify that authentication is enforced:

```bash
PAYLOAD='{"ref":"refs/heads/main"}'
WRONG_SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "wrong-secret" | awk '{print $2}')

curl -v -X POST \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=$WRONG_SIGNATURE" \
  -H "X-GitHub-Event: push" \
  -d "$PAYLOAD" \
  ${WEBHOOK_URL}${WEBHOOK_PATH}
```

This should return HTTP 403.

### Test with Missing Signature (Should Fail)

```bash
curl -v -X POST \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: push" \
  -d '{"ref":"refs/heads/main"}' \
  ${WEBHOOK_URL}${WEBHOOK_PATH}
```

This should also return HTTP 403.

## Testing a GitLab Receiver

GitLab sends the token directly in the `X-Gitlab-Token` header rather than computing an HMAC signature.

### GitLab Push Event

```bash
PAYLOAD='{"object_kind":"push","ref":"refs/heads/main","checkout_sha":"abc123","project":{"path_with_namespace":"group/project"}}'

curl -v -X POST \
  -H "Content-Type: application/json" \
  -H "X-Gitlab-Event: Push Hook" \
  -H "X-Gitlab-Token: $TOKEN" \
  -d "$PAYLOAD" \
  ${WEBHOOK_URL}${WEBHOOK_PATH}
```

### GitLab Tag Push Event

```bash
PAYLOAD='{"object_kind":"tag_push","ref":"refs/tags/v1.0.0","checkout_sha":"abc123","project":{"path_with_namespace":"group/project"}}'

curl -v -X POST \
  -H "Content-Type: application/json" \
  -H "X-Gitlab-Event: Tag Push Hook" \
  -H "X-Gitlab-Token: $TOKEN" \
  -d "$PAYLOAD" \
  ${WEBHOOK_URL}${WEBHOOK_PATH}
```

### Test with Wrong Token (Should Fail)

```bash
curl -v -X POST \
  -H "Content-Type: application/json" \
  -H "X-Gitlab-Event: Push Hook" \
  -H "X-Gitlab-Token: wrong-token-value" \
  -d '{"object_kind":"push","ref":"refs/heads/main"}' \
  ${WEBHOOK_URL}${WEBHOOK_PATH}
```

Expected result: HTTP 403.

## Testing a Bitbucket Receiver

Bitbucket Server uses HMAC-SHA256 signatures in the `X-Hub-Signature` header.

### Bitbucket Push Event

```bash
PAYLOAD='{"eventKey":"repo:refs_changed","changes":[{"ref":{"id":"refs/heads/main","type":"BRANCH"},"type":"UPDATE"}]}'

SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$TOKEN" | awk '{print $2}')

curl -v -X POST \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature: sha256=$SIGNATURE" \
  -H "X-Event-Key: repo:refs_changed" \
  -d "$PAYLOAD" \
  ${WEBHOOK_URL}${WEBHOOK_PATH}
```

## Testing a Generic Receiver

The generic Receiver type validates the token as a query parameter.

### Generic Webhook with Token Parameter

```bash
PAYLOAD='{"action":"sync","timestamp":"2026-03-13T10:00:00Z"}'

curl -v -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "${WEBHOOK_URL}${WEBHOOK_PATH}?token=${TOKEN}"
```

### Generic Webhook with Empty Body

The generic receiver also works with an empty JSON body:

```bash
curl -v -X POST \
  -H "Content-Type: application/json" \
  -d '{}' \
  "${WEBHOOK_URL}${WEBHOOK_PATH}?token=${TOKEN}"
```

### Test with Wrong Token (Should Fail)

```bash
curl -v -X POST \
  -H "Content-Type: application/json" \
  -d '{}' \
  "${WEBHOOK_URL}${WEBHOOK_PATH}?token=wrong-token"
```

Expected result: HTTP 403.

## Testing a Docker Hub Receiver

Docker Hub sends push events when a new image is pushed:

```bash
PAYLOAD='{"push_data":{"tag":"latest","pushed_at":1678700000},"repository":{"repo_name":"org/app","repo_url":"https://hub.docker.com/r/org/app"}}'

SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$TOKEN" | awk '{print $2}')

curl -v -X POST \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "${WEBHOOK_URL}${WEBHOOK_PATH}?token=${TOKEN}"
```

## Automating Tests with a Shell Script

Create a reusable test script:

```bash
#!/bin/bash
# test-receiver.sh
# Usage: ./test-receiver.sh <receiver-name> <namespace>

set -euo pipefail

RECEIVER_NAME="${1:-github-receiver}"
NAMESPACE="${2:-flux-system}"
WEBHOOK_URL="${3:-https://flux-webhook.example.com}"

echo "=== Testing Receiver: $RECEIVER_NAME ==="

# Get webhook path
WEBHOOK_PATH=$(kubectl -n "$NAMESPACE" get receiver "$RECEIVER_NAME" -o jsonpath='{.status.webhookPath}')
if [ -z "$WEBHOOK_PATH" ]; then
  echo "ERROR: Could not get webhook path. Is the receiver ready?"
  kubectl -n "$NAMESPACE" get receiver "$RECEIVER_NAME"
  exit 1
fi
echo "Webhook path: $WEBHOOK_PATH"

# Get receiver type
RECEIVER_TYPE=$(kubectl -n "$NAMESPACE" get receiver "$RECEIVER_NAME" -o jsonpath='{.spec.type}')
echo "Receiver type: $RECEIVER_TYPE"

# Get token
SECRET_NAME=$(kubectl -n "$NAMESPACE" get receiver "$RECEIVER_NAME" -o jsonpath='{.spec.secretRef.name}')
TOKEN=$(kubectl -n "$NAMESPACE" get secret "$SECRET_NAME" -o jsonpath='{.data.token}' | base64 -d)

PAYLOAD='{"ref":"refs/heads/main","test":true}'

echo ""
echo "--- Test 1: Valid request ---"
case "$RECEIVER_TYPE" in
  github)
    SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$TOKEN" | awk '{print $2}')
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
      -H "Content-Type: application/json" \
      -H "X-Hub-Signature-256: sha256=$SIGNATURE" \
      -H "X-GitHub-Event: push" \
      -d "$PAYLOAD" \
      "${WEBHOOK_URL}${WEBHOOK_PATH}")
    ;;
  gitlab)
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
      -H "Content-Type: application/json" \
      -H "X-Gitlab-Event: Push Hook" \
      -H "X-Gitlab-Token: $TOKEN" \
      -d "$PAYLOAD" \
      "${WEBHOOK_URL}${WEBHOOK_PATH}")
    ;;
  generic)
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
      -H "Content-Type: application/json" \
      -d "$PAYLOAD" \
      "${WEBHOOK_URL}${WEBHOOK_PATH}?token=${TOKEN}")
    ;;
  *)
    echo "Unsupported receiver type: $RECEIVER_TYPE"
    exit 1
    ;;
esac

if [ "$HTTP_CODE" = "200" ]; then
  echo "PASS: Valid request returned HTTP $HTTP_CODE"
else
  echo "FAIL: Valid request returned HTTP $HTTP_CODE (expected 200)"
fi

echo ""
echo "--- Test 2: Invalid authentication ---"
case "$RECEIVER_TYPE" in
  github)
    BAD_SIG=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "bad-token" | awk '{print $2}')
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
      -H "Content-Type: application/json" \
      -H "X-Hub-Signature-256: sha256=$BAD_SIG" \
      -H "X-GitHub-Event: push" \
      -d "$PAYLOAD" \
      "${WEBHOOK_URL}${WEBHOOK_PATH}")
    ;;
  gitlab)
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
      -H "Content-Type: application/json" \
      -H "X-Gitlab-Event: Push Hook" \
      -H "X-Gitlab-Token: bad-token" \
      -d "$PAYLOAD" \
      "${WEBHOOK_URL}${WEBHOOK_PATH}")
    ;;
  generic)
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
      -H "Content-Type: application/json" \
      -d "$PAYLOAD" \
      "${WEBHOOK_URL}${WEBHOOK_PATH}?token=bad-token")
    ;;
esac

if [ "$HTTP_CODE" = "403" ]; then
  echo "PASS: Invalid auth returned HTTP $HTTP_CODE"
else
  echo "FAIL: Invalid auth returned HTTP $HTTP_CODE (expected 403)"
fi

echo ""
echo "--- Test 3: Verify reconciliation triggered ---"
sleep 2
for resource in $(kubectl -n "$NAMESPACE" get receiver "$RECEIVER_NAME" -o jsonpath='{range .spec.resources[*]}{.kind}/{.name} {end}'); do
  RESOURCE_LOWER=$(echo "$resource" | tr '[:upper:]' '[:lower:]')
  ANNOTATION=$(kubectl -n "$NAMESPACE" get "$RESOURCE_LOWER" -o jsonpath='{.metadata.annotations.reconcile\.fluxcd\.io/requestedAt}' 2>/dev/null || echo "N/A")
  echo "Resource $resource: requestedAt=$ANNOTATION"
done

echo ""
echo "=== Tests complete ==="
```

Make it executable and run:

```bash
chmod +x test-receiver.sh
./test-receiver.sh github-receiver flux-system https://flux-webhook.example.com
```

## Verification

After sending a test webhook, confirm that reconciliation was triggered:

```bash
# Check the annotation timestamp on the target resource
kubectl -n flux-system get gitrepository flux-system \
  -o jsonpath='{.metadata.annotations.reconcile\.fluxcd\.io/requestedAt}'

# Watch the source controller logs for fetch activity
kubectl -n flux-system logs deploy/source-controller --since=2m | grep "flux-system"

# Check the Flux events
flux events --for GitRepository/flux-system
```

## Troubleshooting

### curl returns connection refused

The Receiver is not exposed externally, or the Ingress is not configured. Test from inside the cluster first using the internal service URL.

### curl returns 404

The webhook path is incorrect. Double-check it:

```bash
kubectl -n flux-system get receiver github-receiver -o jsonpath='{.status.webhookPath}'
```

Make sure the URL includes the full path including the `/hook/` prefix.

### curl returns 403 with a correct token

Check for encoding issues. The token may have been created with a trailing newline:

```bash
kubectl -n flux-system get secret webhook-token -o jsonpath='{.data.token}' | base64 -d | xxd
```

Look for `0a` (newline) at the end of the hex dump. If present, recreate the secret without the newline.

### curl returns 200 but no reconciliation happens

The webhook was accepted but the annotation may not have been applied. Check the notification-controller logs:

```bash
kubectl -n flux-system logs deploy/notification-controller --since=5m
```

Look for errors about patching the target resource.

### SSL certificate errors with curl

If using self-signed certificates, add the `-k` flag to skip verification (for testing only):

```bash
curl -k -v -X POST ...
```

For proper testing, provide the CA certificate:

```bash
curl --cacert ca.crt -v -X POST ...
```

## Summary

Testing Flux Receivers with curl is an essential step in webhook configuration. Each Receiver type has specific authentication requirements: GitHub uses HMAC-SHA256 in `X-Hub-Signature-256`, GitLab uses a plain token in `X-Gitlab-Token`, Bitbucket uses HMAC in `X-Hub-Signature`, and generic receivers expect the token as a query parameter. Always test both valid and invalid authentication to confirm the endpoint is properly secured. The automated test script provided in this guide can be integrated into your CI/CD pipeline for ongoing validation.
