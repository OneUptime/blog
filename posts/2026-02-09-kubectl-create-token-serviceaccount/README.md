# How to Use kubectl create token for ServiceAccount Token Generation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Security

Description: Learn how to generate ServiceAccount tokens in Kubernetes using kubectl create token, including expiration settings, audience configuration, and secure authentication practices.

---

Kubernetes moved away from automatically creating long-lived ServiceAccount tokens in version 1.24. This change improved security by encouraging short-lived, time-bound tokens instead. The `kubectl create token` command gives you a modern way to generate ServiceAccount tokens with explicit expiration times and audience restrictions.

Understanding how to generate and use ServiceAccount tokens is critical for authentication, CI/CD pipelines, and external applications that need to interact with your Kubernetes cluster. This guide shows you how to master the `kubectl create token` command.

## Why ServiceAccount Tokens Changed

Before Kubernetes 1.24, creating a ServiceAccount automatically generated a long-lived secret with a token that never expired. This posed security risks. If a token leaked, it remained valid indefinitely unless you manually revoked it.

The new token request API creates tokens that expire after a set duration. This limits the damage if a token is compromised. Tokens are also bound to specific audiences, preventing them from being used in unintended contexts.

The `kubectl create token` command uses this token request API, making it easy to generate secure, time-limited tokens from the command line.

## Basic Token Generation

Creating a token for a ServiceAccount is straightforward. First, ensure the ServiceAccount exists:

```bash
kubectl create serviceaccount my-app-sa
```

Then generate a token:

```bash
kubectl create token my-app-sa
```

This command outputs a JWT token to stdout. The default expiration is one hour. You can save it to a variable or file:

```bash
TOKEN=$(kubectl create token my-app-sa)
echo $TOKEN
```

Use this token to authenticate API requests:

```bash
curl -k https://kubernetes-api:6443/api/v1/namespaces/default/pods \
  -H "Authorization: Bearer $TOKEN"
```

## Setting Token Expiration

The `--duration` flag controls how long the token remains valid. The default is 1 hour, but you can adjust this based on your needs.

For a token that expires in 10 minutes:

```bash
kubectl create token my-app-sa --duration=10m
```

For a token that lasts 24 hours:

```bash
kubectl create token my-app-sa --duration=24h
```

The maximum duration depends on your cluster configuration. Most clusters allow tokens up to 24 hours by default, but cluster administrators can configure different limits.

Short-lived tokens are better for security. Use the shortest duration that works for your use case. For CI/CD pipelines that run for 30 minutes, a 1-hour token provides a safety margin without excessive lifetime.

## Specifying Token Audience

The `--audience` flag restricts where the token can be used. This provides defense in depth by ensuring tokens are only valid for specific services.

```bash
kubectl create token my-app-sa --audience=https://my-api-server.example.com
```

When you specify an audience, the token will only be accepted by services that validate tokens against that specific audience value. This prevents token reuse across different services even if they share the same authentication backend.

You can specify multiple audiences by using the flag multiple times:

```bash
kubectl create token my-app-sa \
  --audience=https://api-1.example.com \
  --audience=https://api-2.example.com
```

## Using Tokens in Different Namespaces

ServiceAccounts are namespaced resources. By default, `kubectl create token` operates in your current namespace. Use the `-n` flag to specify a different namespace:

```bash
kubectl create token my-app-sa -n production
```

You can also combine namespace selection with other flags:

```bash
kubectl create token backend-sa -n production --duration=2h
```

Always verify you are in the correct namespace before generating tokens, especially in production environments.

## Binding Tokens to Specific Resources

You can bind tokens to specific Kubernetes objects using the `--bound-object-kind`, `--bound-object-name`, and `--bound-object-uid` flags. This creates tokens that are only valid while the bound object exists.

Binding a token to a specific pod:

```bash
# Get pod UID
POD_UID=$(kubectl get pod my-pod -o jsonpath='{.metadata.uid}')

# Create token bound to that pod
kubectl create token my-app-sa \
  --bound-object-kind=Pod \
  --bound-object-name=my-pod \
  --bound-object-uid=$POD_UID
```

When the pod is deleted, the token becomes invalid. This provides automatic token cleanup and reduces the risk of stale credentials.

This is particularly useful for workloads that need tokens with the same lifecycle as the pod running them.

## Practical CI/CD Pipeline Example

CI/CD pipelines often need temporary tokens to deploy applications to Kubernetes. Here is how to set this up securely.

First, create a ServiceAccount with appropriate RBAC permissions:

```yaml
# ci-serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ci-deploy
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ci-deploy-role
  namespace: default
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "create", "update", "patch"]
- apiGroups: [""]
  resources: ["services", "pods"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ci-deploy-binding
  namespace: default
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: ci-deploy-role
subjects:
- kind: ServiceAccount
  name: ci-deploy
  namespace: default
```

Apply the configuration:

```bash
kubectl apply -f ci-serviceaccount.yaml
```

In your CI pipeline, generate a token at the start of the job:

```bash
#!/bin/bash
# deploy.sh

# Generate token with 2-hour expiration
TOKEN=$(kubectl create token ci-deploy --duration=2h)

# Configure kubectl to use the token
kubectl config set-credentials ci-deploy --token=$TOKEN
kubectl config set-context ci-context \
  --cluster=production-cluster \
  --user=ci-deploy

kubectl config use-context ci-context

# Now run deployment commands
kubectl apply -f deployment.yaml
kubectl rollout status deployment/my-app
```

This approach gives your CI pipeline only the permissions it needs for only the time it needs them.

## Using Tokens with External Applications

External applications that need to interact with Kubernetes can use ServiceAccount tokens for authentication. Generate a token and configure your application to use it.

```bash
# Generate a 12-hour token for an external monitoring tool
TOKEN=$(kubectl create token monitoring-sa --duration=12h)

# Save to a file that your application can read
echo $TOKEN > /secure/path/k8s-token.txt
chmod 600 /secure/path/k8s-token.txt
```

In your application code (Python example):

```python
from kubernetes import client, config

# Read the token
with open('/secure/path/k8s-token.txt', 'r') as f:
    token = f.read().strip()

# Configure client
configuration = client.Configuration()
configuration.host = "https://kubernetes-api:6443"
configuration.api_key = {"authorization": f"Bearer {token}"}
configuration.verify_ssl = True
configuration.ssl_ca_cert = "/path/to/ca.crt"

# Create API client
api_client = client.ApiClient(configuration)
v1 = client.CoreV1Api(api_client)

# List pods
pods = v1.list_namespaced_pod(namespace="default")
for pod in pods.items:
    print(f"Pod: {pod.metadata.name}")
```

Remember to refresh the token before it expires. Implement token rotation in your application to avoid authentication failures.

## Troubleshooting Token Issues

If your token is not working, check these common issues:

Verify the token has not expired:

```bash
# Decode the token to check expiration
echo $TOKEN | cut -d. -f2 | base64 -d 2>/dev/null | jq .exp
```

Compare the exp field with the current Unix timestamp. If it has passed, generate a new token.

Verify the ServiceAccount has the necessary RBAC permissions:

```bash
kubectl auth can-i list pods --as=system:serviceaccount:default:my-app-sa
```

Check if the audience matches your use case. If you specified an audience when creating the token, the receiving service must validate against the same audience.

Verify the token is being sent correctly in the Authorization header:

```bash
curl -v https://kubernetes-api:6443/api/v1/pods \
  -H "Authorization: Bearer $TOKEN" 2>&1 | grep Authorization
```

## Security Best Practices

Always use the shortest token duration that works for your use case. A 1-hour token is better than a 24-hour token if your workload completes in 30 minutes.

Never commit tokens to version control. Use environment variables or secret management systems to provide tokens to applications.

Rotate tokens regularly even if they have not expired. This limits the window of opportunity for attackers if a token is compromised.

Use RBAC to limit ServiceAccount permissions to the minimum required. Follow the principle of least privilege.

Monitor token usage. Set up alerts for unexpected API activity from ServiceAccounts to detect potential compromises.

Consider using bound tokens when possible. Binding tokens to specific objects provides automatic cleanup and reduces the risk of token leakage.

## Automating Token Refresh

For long-running applications, implement automatic token refresh before expiration:

```bash
#!/bin/bash
# token-refresh.sh

NAMESPACE="default"
SERVICE_ACCOUNT="my-app-sa"
TOKEN_FILE="/secure/path/k8s-token.txt"
DURATION="1h"

while true; do
  # Generate new token
  NEW_TOKEN=$(kubectl create token $SERVICE_ACCOUNT \
    -n $NAMESPACE \
    --duration=$DURATION)

  # Save to file atomically
  echo $NEW_TOKEN > ${TOKEN_FILE}.tmp
  mv ${TOKEN_FILE}.tmp $TOKEN_FILE
  chmod 600 $TOKEN_FILE

  echo "Token refreshed at $(date)"

  # Refresh every 45 minutes (before 1-hour expiration)
  sleep 2700
done
```

Run this script as a sidecar container or a separate daemon to keep tokens fresh.

## Conclusion

The `kubectl create token` command provides a secure, modern way to generate ServiceAccount tokens for Kubernetes authentication. Use it with appropriate expiration times, audience restrictions, and RBAC permissions to secure your cluster.

Replace any legacy long-lived tokens with time-bound tokens generated using this command. Implement token rotation in your applications and CI/CD pipelines. Follow security best practices to minimize the risk of token compromise.

Mastering ServiceAccount token management is essential for secure Kubernetes operations. Start using `kubectl create token` today to improve your cluster security posture.
