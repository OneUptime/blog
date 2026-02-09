# How to Create and Configure ServiceAccounts for Pod Identity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ServiceAccounts, Security

Description: Learn how to create and configure Kubernetes ServiceAccounts to establish secure pod identities for API server authentication and workload authorization.

---

ServiceAccounts are fundamental to Kubernetes security, providing an identity mechanism for pods to authenticate with the API server and other services. Every pod runs under a ServiceAccount, and understanding how to create and configure them properly is essential for secure cluster operations.

## Understanding ServiceAccount Basics

When a pod needs to interact with the Kubernetes API or external services, it uses a ServiceAccount. This account provides credentials in the form of a token that the pod can use to authenticate. By default, every namespace has a "default" ServiceAccount, but creating dedicated ServiceAccounts for specific workloads follows the principle of least privilege.

A ServiceAccount consists of three main components: the account itself, an associated token (or tokens), and RBAC bindings that define what the account can do. Modern Kubernetes versions use bound tokens with limited lifetimes and audience restrictions for enhanced security.

## Creating a Basic ServiceAccount

Creating a ServiceAccount is straightforward. Here's a simple example:

```yaml
# serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-service-account
  namespace: production
```

Apply this configuration:

```bash
# Create the ServiceAccount
kubectl apply -f serviceaccount.yaml

# Verify creation
kubectl get serviceaccount app-service-account -n production
```

This creates a basic ServiceAccount without any special permissions. The account itself doesn't grant any access - you need RBAC rules for that.

## Configuring Pod to Use ServiceAccount

To assign a ServiceAccount to a pod, specify it in the pod specification:

```yaml
# pod-with-sa.yaml
apiVersion: v1
kind: Pod
metadata:
  name: api-client-pod
  namespace: production
spec:
  serviceAccountName: app-service-account
  containers:
  - name: app
    image: myapp:latest
    # The token is automatically mounted at /var/run/secrets/kubernetes.io/serviceaccount/token
```

When this pod starts, Kubernetes automatically injects the ServiceAccount token into the container. The application can read this token and use it to authenticate with the API server.

## Disabling Automatic Token Mounting

Sometimes pods don't need API access. For these cases, disable automatic token mounting to reduce the attack surface:

```yaml
# serviceaccount-no-automount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: no-api-access
  namespace: production
automountServiceAccountToken: false
```

You can also disable it at the pod level:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: worker-pod
spec:
  serviceAccountName: no-api-access
  automountServiceAccountToken: false
  containers:
  - name: worker
    image: worker:latest
```

This prevents the token from being mounted even if the ServiceAccount would normally provide one. This is a security best practice for workloads that don't need cluster API access.

## Working with ServiceAccount Secrets

In older Kubernetes versions, ServiceAccounts automatically created long-lived token secrets. Modern versions use short-lived tokens by default. However, you might need to create a token secret manually for certain use cases:

```yaml
# sa-token-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-sa-token
  namespace: production
  annotations:
    kubernetes.io/service-account.name: app-service-account
type: kubernetes.io/service-account-token
```

Apply this and Kubernetes will populate it with a token:

```bash
kubectl apply -f sa-token-secret.yaml

# Retrieve the token
kubectl get secret app-sa-token -n production -o jsonpath='{.data.token}' | base64 -d
```

This token is long-lived and persists until you delete the secret. Use this approach only when you need tokens that outlive pod lifecycles, such as for external systems accessing the API.

## Configuring Image Pull Secrets

ServiceAccounts can reference image pull secrets, making them available to all pods using that account:

```yaml
# First create the image pull secret
kubectl create secret docker-registry regcred \
  --docker-server=registry.example.com \
  --docker-username=user \
  --docker-password=password \
  --docker-email=user@example.com \
  -n production

# Then reference it in the ServiceAccount
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-service-account
  namespace: production
imagePullSecrets:
- name: regcred
```

Now any pod using this ServiceAccount can pull images from the private registry without specifying imagePullSecrets in the pod specification.

## Using ServiceAccount with Projected Volumes

Modern Kubernetes supports projected volumes for ServiceAccount tokens, allowing you to configure token properties:

```yaml
# pod-with-projected-token.yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  serviceAccountName: app-service-account
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: token
      mountPath: /var/run/secrets/tokens
      readOnly: true
  volumes:
  - name: token
    projected:
      sources:
      - serviceAccountToken:
          path: api-token
          expirationSeconds: 3600
          audience: api-server
```

This configuration creates a token that expires after one hour and is bound to a specific audience. The token automatically refreshes before expiration, providing both security and convenience.

## Verifying ServiceAccount Configuration

After configuring a ServiceAccount, verify that everything works correctly:

```bash
# Check ServiceAccount details
kubectl describe serviceaccount app-service-account -n production

# List all ServiceAccounts in a namespace
kubectl get serviceaccounts -n production

# View the token mounted in a running pod
kubectl exec -it api-client-pod -n production -- cat /var/run/secrets/kubernetes.io/serviceaccount/token

# Test API access from within a pod
kubectl exec -it api-client-pod -n production -- sh
# Inside the pod:
# TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
# curl -k -H "Authorization: Bearer $TOKEN" https://kubernetes.default.svc/api/v1/namespaces
```

These commands help you verify that the ServiceAccount is properly configured and that pods can access the credentials.

## Conclusion

ServiceAccounts are the foundation of pod identity in Kubernetes. By creating dedicated ServiceAccounts for different workloads, configuring appropriate token settings, and managing secrets properly, you establish a secure identity system for your applications. Combined with RBAC, ServiceAccounts enable fine-grained access control that follows security best practices.

Start with dedicated ServiceAccounts for each application component, disable automatic token mounting where not needed, and use projected volumes with bound tokens for maximum security. These practices create a solid security foundation for your Kubernetes workloads.
