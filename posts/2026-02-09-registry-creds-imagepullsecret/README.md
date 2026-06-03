# How to Use Registry-Creds for Automated ImagePullSecret Propagation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Container Registry, ImagePullSecrets

Description: Learn how to implement registry-creds to automatically propagate ImagePullSecrets across Kubernetes namespaces, eliminating manual secret management and streamlining private registry access.

---

Managing ImagePullSecrets across multiple namespaces in Kubernetes clusters can become tedious and error-prone, especially in large deployments. The registry-creds project provides an automated solution that continuously refreshes registry credentials across namespaces, ensuring pods can pull images from private registries without manual intervention.

## Understanding ImagePullSecret Challenges

When working with private container registries like Docker Hub, Harbor, or AWS ECR, Kubernetes requires ImagePullSecrets to authenticate. The default approach involves creating these secrets manually in each namespace where they're needed. This creates several problems:

1. **Manual repetition** - Every new namespace needs the same secret created
2. **Drift and inconsistency** - Secrets get out of sync when credentials rotate
3. **Security gaps** - New namespaces might be forgotten, causing pull failures
4. **Operational overhead** - DevOps teams spend time on repetitive tasks

Registry-creds solves these issues by watching namespaces and automatically injecting the required secrets into the default service account.

## How Registry-Creds Works

Registry-creds runs as a controller in your cluster. It gets credentials from the configured registry providers and uses a Kubernetes namespace informer to process namespace add and update events. It creates or updates the generated ImagePullSecret in each namespace and adds that secret to the namespace's default service account. The controller also refreshes credentials on a timer, which defaults to 60 minutes.

The controller supports multiple registry types simultaneously, including:
- Docker Hub or other private registries using standard Docker credentials
- AWS ECR (with automatic token refresh)
- Google Container Registry (GCR)
- Azure Container Registry (ACR)

## Deploying Registry-Creds

First, install registry-creds using a deployment manifest:

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
        # Docker Hub or private registry configuration
        - name: DOCKER_PRIVATE_REGISTRY_SERVER
          valueFrom:
            secretKeyRef:
              name: registry-creds-dpr
              key: DOCKER_PRIVATE_REGISTRY_SERVER
              optional: true
        - name: DOCKER_PRIVATE_REGISTRY_USER
          valueFrom:
            secretKeyRef:
              name: registry-creds-dpr
              key: DOCKER_PRIVATE_REGISTRY_USER
              optional: true
        - name: DOCKER_PRIVATE_REGISTRY_PASSWORD
          valueFrom:
            secretKeyRef:
              name: registry-creds-dpr
              key: DOCKER_PRIVATE_REGISTRY_PASSWORD
              optional: true
        # GCR configuration
        - name: gcrurl
          value: "https://gcr.io"
        # Azure Container Registry configuration
        - name: ACR_URL
          valueFrom:
            secretKeyRef:
              name: registry-creds-acr
              key: ACR_URL
              optional: true
        - name: ACR_CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: registry-creds-acr
              key: ACR_CLIENT_ID
              optional: true
        - name: ACR_PASSWORD
          valueFrom:
            secretKeyRef:
              name: registry-creds-acr
              key: ACR_PASSWORD
              optional: true
        volumeMounts:
        - name: gcr-creds
          mountPath: "/root/.config/gcloud"
          readOnly: true
      volumes:
      - name: gcr-creds
        secret:
          secretName: registry-creds-gcr
          optional: true
```

Apply the deployment:

```bash
kubectl apply -f registry-creds-deployment.yaml
```

## Configuring Registry Credentials

Create the credential secrets that registry-creds uses to generate ImagePullSecrets. For Docker Hub:

```bash
# Create Docker Hub credentials secret
kubectl create secret generic registry-creds-dpr \
  --from-literal=DOCKER_PRIVATE_REGISTRY_SERVER=https://index.docker.io/v1/ \
  --from-literal=DOCKER_PRIVATE_REGISTRY_USER=myusername \
  --from-literal=DOCKER_PRIVATE_REGISTRY_PASSWORD=mypassword \
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

For GCR, create a secret that contains your application default credentials file:

```bash
# Create GCR credentials
kubectl create secret generic registry-creds-gcr \
  --from-file=application_default_credentials.json=$HOME/.config/gcloud/application_default_credentials.json \
  -n registry-creds
```

For Azure Container Registry, create a secret with the registry URL, service principal application ID, and service principal password:

```bash
# Create ACR credentials
kubectl create secret generic registry-creds-acr \
  --from-literal=ACR_URL=myregistry.azurecr.io \
  --from-literal=ACR_CLIENT_ID=my-client-id \
  --from-literal=ACR_PASSWORD=my-client-secret \
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

You should see generated ImagePullSecrets such as `awsecr-cred`, `gcr-secret`, `dpr-secret`, and `acr-secret`, depending on which registry credentials you configured.

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
- name: dpr-secret
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
kubectl create secret generic registry-creds-dpr \
  --from-literal=DOCKER_PRIVATE_REGISTRY_SERVER=https://index.docker.io/v1/ \
  --from-literal=DOCKER_PRIVATE_REGISTRY_USER=myusername \
  --from-literal=DOCKER_PRIVATE_REGISTRY_PASSWORD=mynewpassword \
  -n registry-creds \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart registry-creds to pick up changes
kubectl rollout restart deployment/registry-creds -n registry-creds
```

Registry-creds will update namespace secrets with the new credentials on the next refresh cycle.

## Skipping kube-system

By default, registry-creds skips the `kube-system` namespace. To allow registry-creds to manage ImagePullSecrets there, set the `skip-kube-system` flag to `false` in the container args:

```yaml
args:
- --skip-kube-system=false
```

For other namespaces, registry-creds v1.10 does not provide annotation-based exclusions; use a different secret propagation tool if you need that behavior.

## Monitoring Registry-Creds

Monitor the controller's logs to ensure proper operation:

```bash
# View registry-creds logs
kubectl logs -n registry-creds deployment/registry-creds -f
```

Successful propagation produces log entries like:

```text
Created new secret dpr-secret in namespace test-namespace
Updating ServiceAccount default in namespace test-namespace
Finished refreshing credentials for namespace test-namespace
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
