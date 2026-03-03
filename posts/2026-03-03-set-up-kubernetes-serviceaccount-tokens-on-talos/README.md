# How to Set Up Kubernetes ServiceAccount Tokens on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, ServiceAccount, Kubernetes, Tokens, Security, Authentication

Description: Learn how to create, manage, and secure Kubernetes ServiceAccount tokens on Talos Linux for pod authentication and external service integration.

---

ServiceAccount tokens are how pods authenticate with the Kubernetes API. When a pod needs to talk to Kubernetes, whether to read a ConfigMap, create a Job, or watch for resource changes, it uses a ServiceAccount token. Understanding how to set up and manage these tokens properly is essential for both security and functionality on your Talos Linux cluster.

## How ServiceAccount Tokens Work

Every namespace in Kubernetes has a default ServiceAccount. When a pod is created without specifying a ServiceAccount, it gets the default one. The token for that ServiceAccount is automatically mounted into the pod at `/var/run/secrets/kubernetes.io/serviceaccount/token`.

In modern Kubernetes (1.22+), the tokens are projected tokens with bounded lifetimes, which is a significant security improvement over the old static tokens.

```bash
# List ServiceAccounts in a namespace
kubectl get serviceaccounts -n default

# See the default ServiceAccount details
kubectl get serviceaccount default -n default -o yaml
```

## Creating a Custom ServiceAccount

For any application that needs to interact with the Kubernetes API, create a dedicated ServiceAccount rather than using the default:

```yaml
# custom-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: my-app-sa
  namespace: production
  labels:
    app: my-app
automountServiceAccountToken: true
```

```bash
kubectl apply -f custom-sa.yaml
```

## Using a ServiceAccount in a Pod

Reference the ServiceAccount in your pod spec:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      serviceAccountName: my-app-sa
      containers:
      - name: app
        image: my-app:latest
        # The token is automatically mounted at:
        # /var/run/secrets/kubernetes.io/serviceaccount/token
```

Inside the container, you can use the token to authenticate with the API:

```bash
# Read the token from inside a pod
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)

# Use it to call the Kubernetes API
curl -s --cacert /var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
    -H "Authorization: Bearer $TOKEN" \
    https://kubernetes.default.svc/api/v1/namespaces/production/pods
```

## Projected Service Account Tokens

Modern Kubernetes uses projected tokens with specific audiences and expiration times. You can configure these explicitly:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
  namespace: production
spec:
  serviceAccountName: my-app-sa
  containers:
  - name: app
    image: my-app:latest
    volumeMounts:
    - name: kube-api-token
      mountPath: /var/run/secrets/tokens
      readOnly: true
  volumes:
  - name: kube-api-token
    projected:
      sources:
      - serviceAccountToken:
          path: kube-api-token
          expirationSeconds: 3600  # Token expires after 1 hour
          audience: "https://kubernetes.default.svc"
```

The projected token will be automatically rotated before it expires. The kubelet handles this transparently.

## Creating Long-Lived Tokens

Sometimes you need a token that does not expire, for example, for external CI/CD systems that need cluster access. While not recommended for production, you can create one:

```yaml
# long-lived-token-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: ci-deployer-token
  namespace: ci-cd
  annotations:
    kubernetes.io/service-account.name: ci-deployer
type: kubernetes.io/service-account-token
```

```bash
# Create the ServiceAccount first
kubectl create serviceaccount ci-deployer -n ci-cd

# Create the token secret
kubectl apply -f long-lived-token-secret.yaml

# Retrieve the token
kubectl get secret ci-deployer-token -n ci-cd -o jsonpath='{.data.token}' | base64 -d
```

A better approach is to use the TokenRequest API to create tokens with specific lifetimes:

```bash
# Create a token valid for 24 hours
kubectl create token ci-deployer \
    --namespace ci-cd \
    --duration 24h
```

## Granting Permissions to ServiceAccounts

A ServiceAccount without RBAC permissions can authenticate but cannot do anything useful. Bind it to a role:

```yaml
# sa-rbac.yaml

# Role: what the SA can do
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployer
  namespace: production
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["pods", "services"]
    verbs: ["get", "list", "watch"]

---
# Binding: who gets the role
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ci-deployer-binding
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: deployer
subjects:
  - kind: ServiceAccount
    name: ci-deployer
    namespace: ci-cd
```

Note that the ServiceAccount is in the `ci-cd` namespace, but the RoleBinding grants it access in the `production` namespace. This is a cross-namespace permission grant.

## Disabling Auto-Mounted Tokens

Not every pod needs to talk to the Kubernetes API. For pods that do not, disable token auto-mounting to reduce your attack surface:

```yaml
# At the ServiceAccount level (affects all pods using this SA)
apiVersion: v1
kind: ServiceAccount
metadata:
  name: no-api-access
  namespace: production
automountServiceAccountToken: false

---
# Or at the Pod level (overrides the SA setting)
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  serviceAccountName: default
  automountServiceAccountToken: false
  containers:
  - name: app
    image: my-app:latest
```

## ServiceAccount Token Volumes vs Projected Volumes

There is an important difference between the two token mounting methods.

The **default mount** (`/var/run/secrets/kubernetes.io/serviceaccount/token`) uses projected tokens with a default audience of the API server and a default expiration (typically 1 hour, auto-rotated).

**Explicit projected volumes** give you control over audience, expiration, and mount path. Use these when you need tokens for non-Kubernetes services:

```yaml
volumes:
- name: vault-token
  projected:
    sources:
    - serviceAccountToken:
        path: vault-token
        expirationSeconds: 600
        audience: "vault.example.com"
- name: custom-service-token
  projected:
    sources:
    - serviceAccountToken:
        path: service-token
        expirationSeconds: 1800
        audience: "https://my-service.example.com"
```

## Verifying Token Configuration on Talos

Check how the API server is configured for ServiceAccount tokens:

```bash
# Check API server flags related to service accounts
talosctl logs kube-apiserver -n <control-plane-ip> | grep -i "service-account"

# Key flags to look for:
# --service-account-issuer
# --service-account-key-file
# --service-account-signing-key-file
```

On Talos Linux, these are configured automatically during cluster bootstrap. If you need to customize them:

```yaml
# sa-config-patch.yaml
cluster:
  apiServer:
    extraArgs:
      service-account-issuer: "https://kubernetes.default.svc"
      service-account-max-token-expiration: "48h"
```

## Rotating ServiceAccount Signing Keys

The signing key used for ServiceAccount tokens is critical. If it is compromised, all tokens are compromised. To rotate it:

```bash
# On Talos, the SA key is managed as part of the cluster secrets
# You can rotate it by generating new cluster secrets

# First, back up current secrets
talosctl gen secrets -o secrets-backup.yaml

# The rotation process is part of a cluster config refresh
# This is a disruptive operation - plan accordingly
```

## Troubleshooting Token Issues

Common problems with ServiceAccount tokens:

```bash
# Token not mounting in pod
kubectl describe pod <pod-name> -n <namespace>
# Look for volume mount errors

# Token expired or invalid
kubectl logs <pod-name> -n <namespace>
# Look for "401 Unauthorized" errors

# Check if the SA exists
kubectl get serviceaccount <sa-name> -n <namespace>

# Check if RBAC is properly configured
kubectl auth can-i list pods \
    --as=system:serviceaccount:<namespace>:<sa-name> \
    -n <target-namespace>

# Verify the token content
kubectl exec <pod-name> -n <namespace> -- \
    cat /var/run/secrets/kubernetes.io/serviceaccount/token | \
    cut -d. -f2 | base64 -d 2>/dev/null | jq .
```

## Security Best Practices

1. **Use dedicated ServiceAccounts** for each application instead of the default
2. **Disable auto-mounting** for pods that do not need API access
3. **Use short-lived projected tokens** instead of long-lived secrets
4. **Apply least-privilege RBAC** to every ServiceAccount
5. **Audit ServiceAccount usage** regularly
6. **Rotate signing keys** on a regular schedule

```bash
# Audit: Find pods using the default ServiceAccount
kubectl get pods --all-namespaces -o json | \
    jq -r '.items[] | select(.spec.serviceAccountName == "default" or .spec.serviceAccountName == null) | "\(.metadata.namespace)/\(.metadata.name)"'
```

## Conclusion

ServiceAccount tokens are the primary authentication mechanism for workloads running inside a Talos Linux Kubernetes cluster. Modern projected tokens with bounded lifetimes are significantly more secure than the old static tokens. For each application, create a dedicated ServiceAccount, grant it only the permissions it needs through RBAC, and disable token mounting for pods that do not need API access. These practices reduce your cluster's attack surface and make it easier to audit who is doing what.
