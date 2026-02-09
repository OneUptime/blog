# How to Use Registry-Creds for Automated ImagePullSecret Propagation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Container Registry, ImagePullSecrets

Description: Learn how to implement registry-creds to automatically propagate ImagePullSecrets across Kubernetes namespaces, eliminating manual secret management and streamlining private registry access.

---

Managing ImagePullSecrets across multiple namespaces in Kubernetes clusters can become tedious and error-prone, especially in large deployments. The registry-creds project provides an automated solution that continuously propagates registry credentials to all namespaces, ensuring pods can pull images from private registries without manual intervention.

## Understanding ImagePullSecret Challenges

When working with private container registries like Docker Hub, Harbor, or AWS ECR, Kubernetes requires ImagePullSecrets to authenticate. The default approach involves creating these secrets manually in each namespace where they're needed. This creates several problems:

1. **Manual repetition** - Every new namespace needs the same secret created
2. **Drift and inconsistency** - Secrets get out of sync when credentials rotate
3. **Security gaps** - New namespaces might be forgotten, causing pull failures
4. **Operational overhead** - DevOps teams spend time on repetitive tasks

Registry-creds solves these issues by watching for new namespaces and automatically injecting the required secrets.

## How Registry-Creds Works

Registry-creds runs as a controller in your cluster. It maintains a master set of credentials and uses Kubernetes watches to detect namespace creation events. When a new namespace appears, the controller immediately copies the configured ImagePullSecrets into it.

The controller supports multiple registry types simultaneously, including:
- Docker Hub
- AWS ECR (with automatic token refresh)
- Google Container Registry (GCR)
- Azure Container Registry (ACR)
- Private registries using standard Docker credentials

## Deploying Registry-Creds

First, install registry-creds using the official deployment manifest:

```yaml
# registry-creds-deployment.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: registry-creds
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: registry-creds
  namespace: registry-creds
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: registry-creds
rules:
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["list", "watch"]
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["create", "get", "update", "patch"]
- apiGroups: [""]
  resources: ["serviceaccounts"]
  verbs: ["get", "update", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: registry-creds
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: registry-creds
subjects:
- kind: ServiceAccount
  name: registry-creds
  namespace: registry-creds
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: registry-creds
  namespace: registry-creds
spec:
  replicas: 1
  selector:
    matchLabels:
      app: registry-creds
  template:
    metadata:
      labels:
        app: registry-creds
    spec:
      serviceAccountName: registry-creds
      containers:
      - name: registry-creds
        image: upmcenterprises/registry-creds:1.10
        env:
        # AWS ECR configuration
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: registry-creds-ecr
              key: AWS_ACCESS_KEY_ID
              optional: true
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: registry-creds-ecr
              key: AWS_SECRET_ACCESS_KEY
              optional: true
        - name: awsaccount
          value: "123456789012"
        - name: awsregion
          value: "us-east-1"
        # Docker Hub configuration
        - name: DOCKER_USER
          valueFrom:
            secretKeyRef:
              name: registry-creds-dockerhub
              key: DOCKER_USER
              optional: true
        - name: DOCKER_PASSWORD
          valueFrom:
            secretKeyRef:
              name: registry-creds-dockerhub
              key: DOCKER_PASSWORD
              optional: true
        # GCR configuration
        - name: GCR_URL
          value: "https://gcr.io"
        - name: GCR_APPLICATION_DEFAULT_CREDENTIALS
          valueFrom:
            secretKeyRef:
              name: registry-creds-gcr
              key: application_default_credentials.json
              optional: true
```

Apply the deployment:

```bash
kubectl apply -f registry-creds-deployment.yaml
```

## Configuring Registry Credentials

Create the credential secrets that registry-creds will propagate. For Docker Hub:

```bash
# Create Docker Hub credentials secret
kubectl create secret generic registry-creds-dockerhub \
  --from-literal=DOCKER_USER=myusername \
  --from-literal=DOCKER_PASSWORD=mypassword \
  -n registry-creds
```

For AWS ECR:

```bash
# Create AWS ECR credentials
kubectl create secret generic registry-creds-ecr \
  --from-literal=AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE \
  --from-literal=AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  -n registry-creds
```

For a private registry with custom credentials:

```bash
# Create Docker config.json for private registry
kubectl create secret generic registry-creds-private \
  --from-file=.dockerconfigjson=$HOME/.docker/config.json \
  --type=kubernetes.io/dockerconfigjson \
  -n registry-creds
```

## Verifying Automatic Propagation

Once deployed, registry-creds immediately begins propagating secrets. Test it by creating a new namespace:

```bash
# Create a test namespace
kubectl create namespace test-namespace

# Check if ImagePullSecrets were created
kubectl get secrets -n test-namespace
```

You should see secrets named `awsecr-cred`, `gcr-secret`, and `dockerhub-secret` automatically created.

Check the default service account:

```bash
# View default service account
kubectl get serviceaccount default -n test-namespace -o yaml
```

The output shows the imagePullSecrets automatically attached:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: default
  namespace: test-namespace
imagePullSecrets:
- name: awsecr-cred
- name: dockerhub-secret
- name: gcr-secret
```

## Testing with Private Images

Deploy a pod using a private image to verify the configuration:

```yaml
# test-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: private-image-test
  namespace: test-namespace
spec:
  containers:
  - name: app
    image: myregistry.io/private-app:latest
    ports:
    - containerPort: 8080
```

```bash
kubectl apply -f test-pod.yaml

# Check pod status - should pull successfully
kubectl get pod private-image-test -n test-namespace
```

## Handling Credential Rotation

When registry credentials change, update the secret in the registry-creds namespace:

```bash
# Update Docker Hub password
kubectl create secret generic registry-creds-dockerhub \
  --from-literal=DOCKER_USER=myusername \
  --from-literal=DOCKER_PASSWORD=mynewpassword \
  -n registry-creds \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart registry-creds to pick up changes
kubectl rollout restart deployment/registry-creds -n registry-creds
```

Registry-creds will automatically update all namespace secrets with the new credentials.

## Excluding Namespaces

To prevent registry-creds from adding secrets to specific namespaces, add an annotation:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: no-registry-creds
  annotations:
    registry-creds/ignore: "true"
```

This is useful for system namespaces or environments with custom registry requirements.

## Monitoring Registry-Creds

Monitor the controller's logs to ensure proper operation:

```bash
# View registry-creds logs
kubectl logs -n registry-creds deployment/registry-creds -f
```

Successful propagation produces log entries like:

```
Successfully created secret dockerhub-secret in namespace test-namespace
Successfully patched serviceaccount default in namespace test-namespace
AWS ECR token refreshed for account 123456789012
```

## Best Practices

**Use separate credentials per environment** - Deploy different registry-creds instances for dev, staging, and production with environment-specific credentials.

**Implement least privilege** - Create registry service accounts with read-only access rather than using admin credentials.

**Monitor secret propagation** - Set up alerts for failed secret creation events.

**Regular rotation** - Automate credential rotation and use short-lived tokens where possible.

**Namespace lifecycle** - Ensure registry-creds starts before application deployments to avoid pull failures.

## Conclusion

Registry-creds eliminates the operational burden of manually managing ImagePullSecrets across Kubernetes namespaces. By automatically propagating credentials and refreshing tokens, it reduces human error and ensures consistent access to private registries. This approach scales well from small clusters to large multi-tenant environments, freeing teams to focus on application delivery rather than credential management.

For production deployments, combine registry-creds with proper secret management solutions like sealed-secrets or external secret operators to maintain security while gaining automation benefits.
