# How to Configure Per-Cluster Registry Access in Portainer for Kubernetes (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Registry, DevOps

Description: Learn how to configure registry access on a per-Kubernetes-cluster basis in Portainer for secure multi-cluster image management.

## Introduction

In multi-cluster Portainer environments, different Kubernetes clusters may use different container registries. Portainer allows you to configure registry access per Kubernetes environment, and for Kubernetes clusters this access is assigned to namespaces within that environment. Combined with Kubernetes registry policies, this helps ensure deployments use approved registries with appropriate credentials. This guide covers configuring per-cluster registry access in Portainer for Kubernetes.

## Prerequisites

- Portainer BE (per-cluster registry access is a BE feature)
- Multiple Kubernetes environments connected to Portainer
- Container registries configured in Portainer

## Step 1: Configure Global Registries

First, add all registries to the global Portainer registry list:

1. Go to **Registries** in Portainer
2. Add your registries (Docker Hub, ECR, ACR, private registry, etc.)
3. These are now available globally

## Step 2: Configure Cluster-Specific Registry Access

For each Kubernetes cluster, configure registry access from within that cluster and assign each registry to the namespaces that should use it:

1. Open a Kubernetes environment in Portainer
2. In the left menu, expand **Cluster** and select **Registries**
3. Find the registry you want to manage and click **Manage access**
4. Select the namespaces that should be able to use that registry, then click **Create access**

```bash
Registry: production-registry.company.com
Allowed namespaces:
  [x] production                         (allow)
  [x] payments                           (allow)
  [ ] staging                            (deny)
  [ ] development                        (deny)
```

## Step 3: Create Kubernetes Image Pull Secrets

If you need to create the pull secret manually, create it in each namespace that needs access:

```bash
# Create pull secret for a private registry

kubectl create secret docker-registry regcred \
  --docker-server=registry.company.com \
  --docker-username=portainer-user \
  --docker-password=password \
  --docker-email=devops@company.com \
  --namespace=production

# Verify
kubectl get secret regcred -n production
```

When you add registry access to a namespace in Portainer, Portainer can create the registry secret automatically and add it to that namespace's default ServiceAccount as an `imagePullSecret`.

## Step 4: Configure Default Service Account Pull Secrets

To automatically use the pull secret for all pods in a namespace:

```bash
# Patch the default service account to include the pull secret
kubectl patch serviceaccount default \
  -n production \
  -p '{"imagePullSecrets":[{"name":"regcred"}]}'
```

Or configure it in your deployment YAML:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      imagePullSecrets:
        - name: regcred   # Reference the pull secret
      containers:
        - name: app
          image: registry.company.com/myapp:latest
```

## Step 5: Portainer Kubernetes Registry Configuration via Manifest

Configure registry credentials via Kubernetes secrets managed through Portainer's manifest editor:

```yaml
# registry-secret.yml
apiVersion: v1
kind: Secret
metadata:
  name: registry-credentials
  namespace: production
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: <base64-encoded-dockerconfig>
```

To generate the base64-encoded config:

```bash
# Create the Docker config JSON
cat > /tmp/dockerconfig.json << EOF
{
  "auths": {
    "registry.company.com": {
      "username": "portainer-user",
      "password": "mypassword",
      "auth": "$(echo -n 'portainer-user:mypassword' | base64)"
    }
  }
}
EOF

# Base64 encode it
base64 < /tmp/dockerconfig.json | tr -d '\n'
```

## Step 6: Use ECR with Kubernetes

Amazon ECR authentication tokens are valid for 12 hours. On Amazon EKS, prefer the worker node IAM role (or the Fargate pod execution role) so workloads can pull from ECR without a manually refreshed Kubernetes Secret. If you are managing an ECR pull secret yourself on another Kubernetes cluster, refresh it before the token expires:

```bash
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
TOKEN=$(aws ecr get-login-password --region us-east-1)

kubectl create secret docker-registry ecr-credentials \
  --docker-server=${AWS_ACCOUNT_ID}.dkr.ecr.us-east-1.amazonaws.com \
  --docker-username=AWS \
  --docker-password="${TOKEN}" \
  --namespace=production \
  --dry-run=client -o yaml | kubectl apply -f -
```

## Step 7: Verify Registry Access in Portainer

After configuration:

1. Go to a Kubernetes cluster in Portainer
2. Deploy an application using the **Form** method
3. In the **Registry** field, the dropdown should show the Portainer-configured registries permitted for the selected namespace
4. If you need to prevent manual image entry in **Advanced mode**, use a Kubernetes registry policy with **Restrict sources** enabled
5. Deploy and verify the pod pulls the image successfully:

```bash
kubectl get pods -n production
kubectl describe pod <pod-name> -n production | grep -A5 "Events:"
```

Successful pull shows: `Pulled: Successfully pulled image "registry.company.com/myapp:latest"`

## Step 8: Troubleshoot Pull Failures

```bash
# Check pod events for pull errors
kubectl describe pod <pod-name> -n production

# Common errors:
# ErrImagePull: Cannot pull image (auth or network issue)
# ImagePullBackOff: Retrying after ErrImagePull failure

# Test the pull secret
kubectl run test-pull \
  --image=registry.company.com/myapp:latest \
  --overrides='{"spec":{"imagePullSecrets":[{"name":"regcred"}]}}' \
  --restart=Never \
  -n production
```

## Conclusion

Configuring per-cluster registry access in Portainer for Kubernetes helps control which Portainer-configured registries are available in each Kubernetes environment and namespace. Combine Portainer's registry access controls with properly configured Kubernetes image pull secrets, or with a Kubernetes registry policy when you need enforcement of approved image sources, to create a secure image distribution system. For AWS ECR, remember that Secret-based authentication tokens expire every 12 hours.
