# How to Debug Dapr Conversation API Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Conversation, Debug, Troubleshooting, LLM

Description: Learn how to debug common Dapr Conversation API issues including component configuration errors, authentication failures, and unexpected LLM responses.

---

The Dapr Conversation API can fail at several layers: component configuration, secret resolution, provider authentication, and LLM request formation. This guide covers systematic debugging for each failure mode.

## Enable Debug Logging

First, enable verbose logging to see Conversation API activity:

```bash
# Self-hosted
dapr run --app-id my-app --log-level debug -- python app.py

# Kubernetes annotation
annotations:
  dapr.io/log-level: "debug"
  dapr.io/enable-api-logging: "true"
```

## Common Error 1: Component Not Found

```json
{"errorCode": "ERR_CONVERSATION_NOT_FOUND", "message": "conversation component not found: openai-conversation"}
```

Check the component is loaded:

```bash
# Self-hosted: verify component file exists and has correct name
ls ./components/
cat ./components/openai-conversation.yaml

# Kubernetes: check component is applied
kubectl get components.dapr.io openai-conversation -n default
```

Verify the component type is correct:

```bash
kubectl describe components.dapr.io openai-conversation | grep -i type
```

## Common Error 2: Secret Resolution Failure

```json
{"errorCode": "ERR_SECRET_STORE_NOT_FOUND", "message": "failed to get secret: key not found"}
```

Test secret access directly:

```bash
# Check secret exists in Kubernetes
kubectl get secret openai-secret -o jsonpath='{.data.api-key}' | base64 -d

# Test Dapr secret API
curl http://localhost:3500/v1.0/secrets/kubernetes/openai-secret
```

For local development, verify the environment variable is set:

```bash
echo $OPENAI_API_KEY
```

## Common Error 3: Authentication Failure

If the LLM provider returns 401 or 403:

```bash
# Test the API key directly without Dapr
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4o", "messages": [{"role": "user", "content": "test"}]}'
```

If this works but Dapr fails, the secret is not being resolved correctly. Check the component YAML secret reference:

```yaml
    - name: key
      secretKeyRef:
        name: openai-secret   # Secret name
        key: api-key          # Key within the secret
```

## Common Error 4: Invalid Request Format

```json
{"errorCode": "ERR_CONVERSATION_MISSING_INPUTS", "message": "inputs field is required"}
```

Validate the request body format:

```bash
# Correct format
curl -v -X POST http://localhost:3500/v1.0-alpha1/conversation/openai-conversation/converse \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [
      {"content": "Hello", "role": "user"}
    ]
  }'
```

Common mistakes:
- Missing `inputs` array (not `messages` or `prompt`)
- Using `message` instead of `content` on each input
- Missing `role` field on each input
- Invalid role value (must be `user`, `assistant`, `system`, `tool`, or `developer`)

## Checking Component Health

Verify the component initializes without errors:

```bash
# Self-hosted: check Dapr logs on startup
dapr run --log-level debug -- sleep 5 2>&1 | grep -i conversation

# Kubernetes: check Dapr sidecar logs
kubectl logs <pod-name> -c daprd | grep -i conversation
```

Expected healthy log:

```text
level=info msg="component loaded" name=openai-conversation type=conversation.openai
```

## Testing with the Echo Component

Use the echo component to isolate issues without calling a real LLM:

```yaml
# components/echo-conversation.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: test-conversation
spec:
  type: conversation.echo
  version: v1
```

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/conversation/test-conversation/converse \
  -H "Content-Type: application/json" \
  -d '{"inputs": [{"content": "test", "role": "user"}]}'
```

If the echo component works but the real component fails, the issue is in provider configuration.

## Checking Dapr API Logs

Enable API logging to trace all Conversation API calls:

```bash
kubectl annotate pod <pod-name> dapr.io/enable-api-logging=true
kubectl logs <pod-name> -c daprd | grep "conversation"
```

## Summary

Debugging Dapr Conversation API issues follows a systematic approach: verify component loading, check secret resolution, test provider authentication independently, and use the echo component to isolate configuration problems from provider issues. Enabling debug logging at each layer reveals the exact failure point quickly.
