# How to Set Up Cluster Registry Access in Portainer for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Container Registry, Image Pull Secrets, DevOps

Description: Learn how to configure cluster-wide registry access in Portainer so all namespaces can pull from private registries without manual secret creation.

## The Challenge

In Kubernetes, `imagePullSecrets` are namespace-scoped. Without tooling, you must create the same pull secret in every namespace that needs it. Portainer solves this by managing the secret distribution automatically.

## How Portainer Manages Registry Secrets

When you assign a registry to a Kubernetes environment in Portainer, it:
1. Creates a `Secret` of type `kubernetes.io/dockerconfigjson` in each namespace you grant access to.
2. Patches the namespace's `default` service account to reference the secret.
3. Pods in that namespace that use the `default` service account can then pull from the registry without adding `imagePullSecrets` to each pod spec.

## Configuring Cluster Registry Access

### Step 1: Add the Registry

From the menu, expand **Cluster**, select **Registries**, and click **Add registry**. When the global registries page opens, add your private registry with credentials.

### Step 2: Assign the Registry to the Environment

1. Go to **Cluster > Registries**.
2. Find the registry and click **Manage access**.
3. Select the namespaces that should be allowed to use the registry.
4. Click **Create access**.

### Step 3: (Optional) Grant Access Per Namespace

For namespace-level control:

1. Go to **Cluster > Registries**.
2. Find the registry and click **Manage access**.
3. Add more namespaces from the dropdown, or remove a namespace from the **Access** section.

## Manual imagePullSecret Management (CLI Reference)

```bash
# Create an imagePullSecret in a namespace

kubectl create secret docker-registry registry-credentials \
  --docker-server=registry.mycompany.com \
  --docker-username=myuser \
  --docker-password=mypassword \
  --namespace=my-namespace

# Patch the default service account to use the secret
kubectl patch serviceaccount default \
  -n my-namespace \
  -p '{"imagePullSecrets": [{"name": "registry-credentials"}]}'

# Copy a Docker config secret to another namespace
kubectl get secret registry-credentials \
  -n source-namespace \
  -o jsonpath='{.data.\.dockerconfigjson}' | \
  base64 --decode | \
  kubectl create secret docker-registry registry-credentials \
  --namespace=target-namespace \
  --from-file=.dockerconfigjson=/dev/stdin
```

## Automating Secret Propagation

For clusters not using Portainer, tools like `kubernetes-reflector` can mirror secrets across namespaces:

```yaml
# Annotate a secret to be reflected to all namespaces
apiVersion: v1
kind: Secret
metadata:
  name: registry-credentials
  namespace: portainer
  annotations:
    reflector.v1.k8s.emberstack.com/reflection-allowed: "true"
    reflector.v1.k8s.emberstack.com/reflection-auto-enabled: "true"
```

## Verifying Registry Access

```bash
# Check that the imagePullSecret exists in a namespace
kubectl get secrets -n my-namespace | grep registry

# Confirm the default service account has the pull secret attached
kubectl get serviceaccount default -n my-namespace -o yaml | grep -A5 imagePullSecrets

# Check pod events if image pull is failing
kubectl describe pod <pod-name> -n my-namespace | grep -A5 Events
```

## Conclusion

Portainer eliminates the manual work of creating and distributing registry secrets across namespaces. By managing `imagePullSecrets` centrally, it ensures consistent access control while reducing operational overhead.
