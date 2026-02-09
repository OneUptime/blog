# How to Implement ServiceAccount with Image Pull Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, ServiceAccounts, Docker

Description: Configure Kubernetes ServiceAccounts with image pull secrets to automate private registry authentication and simplify pod specifications across your cluster.

---

Image pull secrets allow Kubernetes to authenticate with private container registries. By attaching these secrets to ServiceAccounts, you automate registry authentication for all pods using that account, eliminating repetitive configuration and reducing security risks.

## Understanding Image Pull Secrets

When Kubernetes needs to pull a container image from a private registry, it requires credentials. Without proper authentication, image pulls fail and pods remain in ImagePullBackOff state.

Image pull secrets store registry credentials in a format Kubernetes understands. You can attach these secrets to pods directly, but this approach requires specifying secrets in every pod specification. It's repetitive, error-prone, and makes credential rotation difficult.

ServiceAccounts offer a better solution. By adding image pull secrets to a ServiceAccount, every pod using that account automatically inherits the credentials. This centralizes credential management and simplifies pod configurations.

## Creating Docker Registry Secrets

Start by creating a secret containing registry credentials:

```bash
# Create a docker-registry secret
kubectl create secret docker-registry my-registry-secret \
  --docker-server=registry.example.com \
  --docker-username=myuser \
  --docker-password=mypassword \
  --docker-email=myuser@example.com \
  -n production

# Verify the secret
kubectl get secret my-registry-secret -n production
```

For multiple registries, create separate secrets:

```bash
# Docker Hub
kubectl create secret docker-registry dockerhub-secret \
  --docker-server=docker.io \
  --docker-username=dockeruser \
  --docker-password=dockerpass \
  -n production

# Google Container Registry
kubectl create secret docker-registry gcr-secret \
  --docker-server=gcr.io \
  --docker-username=_json_key \
  --docker-password="$(cat gcr-key.json)" \
  -n production

# AWS ECR
kubectl create secret docker-registry ecr-secret \
  --docker-server=123456789.dkr.ecr.us-east-1.amazonaws.com \
  --docker-username=AWS \
  --docker-password=$(aws ecr get-login-password --region us-east-1) \
  -n production
```

## Attaching Image Pull Secrets to ServiceAccounts

Add image pull secrets to a ServiceAccount:

```yaml
# serviceaccount-with-imagepullsecrets.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-service-account
  namespace: production
imagePullSecrets:
- name: my-registry-secret
- name: dockerhub-secret
- name: gcr-secret
```

Apply the configuration:

```bash
kubectl apply -f serviceaccount-with-imagepullsecrets.yaml

# Verify the setup
kubectl describe serviceaccount app-service-account -n production
```

The output shows the attached image pull secrets:

```
Name:                app-service-account
Namespace:           production
...
Image pull secrets:  my-registry-secret
                     dockerhub-secret
                     gcr-secret
```

## Using ServiceAccounts with Image Pull Secrets

Pods using this ServiceAccount automatically get the image pull secrets:

```yaml
# pod-using-sa-with-secrets.yaml
apiVersion: v1
kind: Pod
metadata:
  name: private-app
  namespace: production
spec:
  serviceAccountName: app-service-account
  containers:
  - name: app
    image: registry.example.com/myapp:latest
```

Notice there's no imagePullSecrets field in the pod spec. Kubernetes automatically injects the secrets from the ServiceAccount.

Deploy and verify:

```bash
kubectl apply -f pod-using-sa-with-secrets.yaml

# Check if the image pulled successfully
kubectl get pod private-app -n production
# Should show Running status

# Verify image pull secrets were injected
kubectl get pod private-app -n production -o jsonpath='{.spec.imagePullSecrets}'
```

## Deployment Configuration

For production deployments, configure ServiceAccounts with image pull secrets:

```yaml
# deployment-with-private-images.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: web-app-sa
  namespace: production
imagePullSecrets:
- name: my-registry-secret
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      serviceAccountName: web-app-sa
      containers:
      - name: app
        image: registry.example.com/web-app:v1.2.3
        ports:
        - containerPort: 8080
      - name: sidecar
        image: registry.example.com/sidecar:latest
```

All containers in the pod can pull from the private registry without individual authentication.

## Creating Secrets from Kubernetes Manifests

For GitOps workflows, define secrets declaratively:

```yaml
# registry-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-registry-secret
  namespace: production
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: <base64-encoded-docker-config>
```

Generate the base64-encoded config:

```bash
# Create the docker config
cat <<EOF > config.json
{
  "auths": {
    "registry.example.com": {
      "username": "myuser",
      "password": "mypassword",
      "email": "myuser@example.com",
      "auth": "$(echo -n myuser:mypassword | base64)"
    }
  }
}
EOF

# Encode it
BASE64_CONFIG=$(cat config.json | base64 -w 0)

# Create the secret manifest
cat <<EOF > registry-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-registry-secret
  namespace: production
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: $BASE64_CONFIG
EOF

kubectl apply -f registry-secret.yaml
```

For security, use sealed secrets or external secret managers instead of storing credentials in Git.

## AWS ECR Integration

AWS ECR requires token rotation since passwords expire every 12 hours:

```yaml
# ecr-credential-helper-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ecr-credential-refresher
  namespace: production
spec:
  schedule: "0 */8 * * *"  # Every 8 hours
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: ecr-updater
          restartPolicy: OnFailure
          containers:
          - name: ecr-refresher
            image: amazon/aws-cli
            command:
            - /bin/sh
            - -c
            - |
              # Get ECR password
              PASSWORD=$(aws ecr get-login-password --region us-east-1)

              # Update the secret
              kubectl create secret docker-registry ecr-secret \
                --docker-server=123456789.dkr.ecr.us-east-1.amazonaws.com \
                --docker-username=AWS \
                --docker-password=$PASSWORD \
                --dry-run=client -o yaml | \
              kubectl apply -f -
```

This CronJob refreshes ECR credentials automatically. The ServiceAccount needs RBAC permissions to update secrets.

## GCR and GAR Integration

Google Container Registry and Artifact Registry use service account keys:

```bash
# Create a GCP service account key
gcloud iam service-accounts keys create gcr-key.json \
  --iam-account=gcr-puller@project-id.iam.gserviceaccount.com

# Create the secret
kubectl create secret docker-registry gcr-secret \
  --docker-server=gcr.io \
  --docker-username=_json_key \
  --docker-password="$(cat gcr-key.json)" \
  -n production

# For multiple regions
for region in us asia eu; do
  kubectl create secret docker-registry gcr-${region}-secret \
    --docker-server=${region}.gcr.io \
    --docker-username=_json_key \
    --docker-password="$(cat gcr-key.json)" \
    -n production
done
```

## Harbor Registry Integration

Harbor is a popular private registry:

```bash
# Create Harbor secret
kubectl create secret docker-registry harbor-secret \
  --docker-server=harbor.example.com \
  --docker-username=admin \
  --docker-password=Harbor12345 \
  -n production

# For robot accounts (recommended)
kubectl create secret docker-registry harbor-robot-secret \
  --docker-server=harbor.example.com \
  --docker-username=robot$app-puller \
  --docker-password=robot-token \
  -n production
```

Harbor robot accounts provide fine-grained permissions and can be rotated without affecting user accounts.

## Multiple ServiceAccounts with Different Secrets

Different teams might use different registries:

```yaml
# team-serviceaccounts.yaml
# Team A uses internal registry
apiVersion: v1
kind: ServiceAccount
metadata:
  name: team-a-sa
  namespace: team-a
imagePullSecrets:
- name: internal-registry-secret
---
# Team B uses external registry
apiVersion: v1
kind: ServiceAccount
metadata:
  name: team-b-sa
  namespace: team-b
imagePullSecrets:
- name: external-registry-secret
- name: dockerhub-secret
---
# Shared services use multiple registries
apiVersion: v1
kind: ServiceAccount
metadata:
  name: shared-sa
  namespace: shared
imagePullSecrets:
- name: internal-registry-secret
- name: external-registry-secret
- name: gcr-secret
```

This provides isolation and flexibility for different workloads.

## Troubleshooting Image Pull Issues

When image pulls fail, diagnose the issue:

```bash
# Check pod events
kubectl describe pod pod-name -n production

# Common errors:
# - "Failed to pull image": Wrong image name or tag
# - "unauthorized: authentication required": Missing or invalid credentials
# - "manifest unknown": Image doesn't exist in registry

# Verify image pull secrets are attached
kubectl get pod pod-name -n production -o jsonpath='{.spec.imagePullSecrets}'

# Test secret credentials manually
kubectl get secret my-registry-secret -n production -o jsonpath='{.data.\.dockerconfigjson}' | \
  base64 -d | jq .

# Try pulling the image manually
docker login registry.example.com -u myuser -p mypassword
docker pull registry.example.com/myapp:latest
```

## Rotating Image Pull Secrets

Regular rotation improves security:

```bash
#!/bin/bash
# rotate-image-pull-secrets.sh

NAMESPACE="production"
SECRET_NAME="my-registry-secret"

# Create new credentials (example with new password)
NEW_PASSWORD="new-secure-password"

# Update the secret
kubectl create secret docker-registry $SECRET_NAME \
  --docker-server=registry.example.com \
  --docker-username=myuser \
  --docker-password=$NEW_PASSWORD \
  --docker-email=myuser@example.com \
  --dry-run=client -o yaml | \
kubectl apply -f -

# Restart deployments to pick up new credentials
kubectl rollout restart deployment -n $NAMESPACE

echo "Image pull secret rotated successfully"
```

Schedule this script monthly or as required by your security policy.

## Using External Secrets Operator

For automated secret management:

```yaml
# external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: registry-secret
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: SecretStore
  target:
    name: my-registry-secret
    creationPolicy: Owner
    template:
      type: kubernetes.io/dockerconfigjson
      data:
        .dockerconfigjson: |
          {
            "auths": {
              "registry.example.com": {
                "username": "{{ .username }}",
                "password": "{{ .password }}",
                "auth": "{{ .auth }}"
              }
            }
          }
  data:
  - secretKey: username
    remoteRef:
      key: registry-credentials
      property: username
  - secretKey: password
    remoteRef:
      key: registry-credentials
      property: password
```

External Secrets Operator automatically syncs credentials from Vault, AWS Secrets Manager, or other backends.

## Conclusion

ServiceAccount image pull secrets streamline private registry authentication. By centralizing credentials at the ServiceAccount level, you eliminate repetitive configuration in pod specifications and simplify credential management. Create registry secrets, attach them to ServiceAccounts, and all pods using those accounts automatically authenticate with your private registries. For production systems, implement automated credential rotation and use external secret managers for enhanced security.
