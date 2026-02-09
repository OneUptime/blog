# How to Build a Secure CI/CD Pipeline That Uses Kubernetes Secrets Store CSI for Build Credentials

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Secrets Management, CI/CD, CSI Driver

Description: Implement secure CI/CD pipelines using Kubernetes Secrets Store CSI Driver to fetch build credentials from external secret management systems like Vault, AWS Secrets Manager, or Azure Key Vault without storing secrets in the cluster.

---

Storing sensitive credentials securely is critical for CI/CD pipelines. The Kubernetes Secrets Store CSI Driver integrates external secret management systems directly with your pods, eliminating hardcoded secrets and providing dynamic credential injection. This guide demonstrates building secure CI/CD pipelines that leverage Secrets Store CSI for credential management with zero trust principles.

## Understanding Secrets Store CSI Driver

The Secrets Store CSI Driver mounts secrets from external systems as volumes in pods. Unlike native Kubernetes secrets, credentials never reside in etcd. Instead, they are fetched at pod startup and mounted as files or environment variables, providing better security through external secret lifecycle management and audit trails.

## Installing Secrets Store CSI Driver

Install the CSI driver:

```bash
# Add Helm repository
helm repo add secrets-store-csi-driver https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts

# Install driver
helm install csi-secrets-store \
  secrets-store-csi-driver/secrets-store-csi-driver \
  --namespace kube-system \
  --set syncSecret.enabled=true
```

Install provider (example: Vault):

```bash
# Install Vault CSI provider
helm install vault csi-secrets-store-provider-vault/vault \
  --namespace kube-system
```

## Configuring HashiCorp Vault Integration

Set up Vault for CI/CD secrets:

```bash
# Enable KV secrets engine
vault secrets enable -path=cicd kv-v2

# Store secrets
vault kv put cicd/docker-registry \
  username=ci-user \
  password=secure-password

vault kv put cicd/github-token \
  token=ghp_xxxxxxxxxxxx

vault kv put cicd/aws-credentials \
  access_key_id=AKIAIOSFODNN7EXAMPLE \
  secret_access_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Create Vault policy
vault policy write ci-pipeline - <<EOF
path "cicd/data/docker-registry" {
  capabilities = ["read"]
}
path "cicd/data/github-token" {
  capabilities = ["read"]
}
path "cicd/data/aws-credentials" {
  capabilities = ["read"]
}
EOF

# Enable Kubernetes auth
vault auth enable kubernetes

vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443"

vault write auth/kubernetes/role/ci-pipeline \
  bound_service_account_names=tekton-sa \
  bound_service_account_namespaces=tekton-pipelines \
  policies=ci-pipeline \
  ttl=24h
```

## Creating SecretProviderClass

Define secret mapping for CI/CD:

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: ci-secrets
  namespace: tekton-pipelines
spec:
  provider: vault
  parameters:
    vaultAddress: "https://vault.vault.svc.cluster.local:8200"
    roleName: "ci-pipeline"
    objects: |
      - objectName: "docker-username"
        secretPath: "cicd/data/docker-registry"
        secretKey: "username"
      - objectName: "docker-password"
        secretPath: "cicd/data/docker-registry"
        secretKey: "password"
      - objectName: "github-token"
        secretPath: "cicd/data/github-token"
        secretKey: "token"
      - objectName: "aws-access-key"
        secretPath: "cicd/data/aws-credentials"
        secretKey: "access_key_id"
      - objectName: "aws-secret-key"
        secretPath: "cicd/data/aws-credentials"
        secretKey: "secret_access_key"

  # Sync as Kubernetes secret
  secretObjects:
    - secretName: ci-credentials
      type: Opaque
      data:
        - objectName: docker-username
          key: username
        - objectName: docker-password
          key: password
        - objectName: github-token
          key: token
```

## Tekton Pipeline with CSI Secrets

Create Tekton task using CSI secrets:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: build-with-csi-secrets
  namespace: tekton-pipelines
spec:
  params:
    - name: image-name
    - name: git-url

  workspaces:
    - name: source

  stepTemplate:
    volumeMounts:
      - name: secrets-store
        mountPath: "/mnt/secrets"
        readOnly: true

  steps:
    - name: clone-repo
      image: alpine/git:latest
      script: |
        #!/bin/sh
        set -e

        # Read GitHub token from CSI volume
        GITHUB_TOKEN=$(cat /mnt/secrets/github-token)

        # Clone private repository
        git clone https://oauth2:$GITHUB_TOKEN@$(params.git-url) \
          $(workspaces.source.path)

    - name: build-image
      image: gcr.io/kaniko-project/executor:latest
      script: |
        #!/bin/sh
        set -e

        # Create Docker config from CSI secrets
        DOCKER_USER=$(cat /mnt/secrets/docker-username)
        DOCKER_PASS=$(cat /mnt/secrets/docker-password)

        mkdir -p /kaniko/.docker
        echo "{\"auths\":{\"registry.example.com\":{\"username\":\"$DOCKER_USER\",\"password\":\"$DOCKER_PASS\"}}}" \
          > /kaniko/.docker/config.json

        # Build and push
        /kaniko/executor \
          --dockerfile=Dockerfile \
          --context=$(workspaces.source.path) \
          --destination=$(params.image-name)

    - name: deploy-to-aws
      image: amazon/aws-cli:latest
      script: |
        #!/bin/bash

        # Load AWS credentials from CSI
        export AWS_ACCESS_KEY_ID=$(cat /mnt/secrets/aws-access-key)
        export AWS_SECRET_ACCESS_KEY=$(cat /mnt/secrets/aws-secret-key)

        # Deploy
        aws eks update-kubeconfig --name production-cluster
        kubectl set image deployment/myapp myapp=$(params.image-name)

  volumes:
    - name: secrets-store
      csi:
        driver: secrets-store.csi.k8s.io
        readOnly: true
        volumeAttributes:
          secretProviderClass: "ci-secrets"
```

Create service account:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: tekton-sa
  namespace: tekton-pipelines

---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: tekton-role
  namespace: tekton-pipelines
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list", "create", "update"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: tekton-binding
  namespace: tekton-pipelines
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: tekton-role
subjects:
  - kind: ServiceAccount
    name: tekton-sa
    namespace: tekton-pipelines
```

## Using AWS Secrets Manager

Configure AWS provider:

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: aws-secrets
  namespace: tekton-pipelines
spec:
  provider: aws
  parameters:
    objects: |
      - objectName: "ci-pipeline-secrets"
        objectType: "secretsmanager"
        objectAlias: "secrets"
```

Store secrets in AWS:

```bash
# Create secret in AWS Secrets Manager
aws secretsmanager create-secret \
  --name ci-pipeline-secrets \
  --secret-string '{
    "docker_username": "ci-user",
    "docker_password": "secure-password",
    "github_token": "ghp_xxxxxxxxxxxx"
  }'

# Update IAM role for service account
eksctl create iamserviceaccount \
  --name tekton-sa \
  --namespace tekton-pipelines \
  --cluster production \
  --attach-policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite \
  --approve
```

## Using Azure Key Vault

Configure Azure provider:

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: azure-secrets
  namespace: tekton-pipelines
spec:
  provider: azure
  parameters:
    usePodIdentity: "false"
    useVMManagedIdentity: "true"
    userAssignedIdentityID: "<identity-client-id>"
    keyvaultName: "ci-pipeline-vault"
    tenantId: "<tenant-id>"
    objects: |
      array:
        - |
          objectName: docker-registry-credentials
          objectType: secret
        - |
          objectName: github-token
          objectType: secret
```

## GitHub Actions with Vault Integration

Use Vault in GitHub Actions:

```yaml
name: Build with Vault Secrets
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Import Secrets from Vault
        uses: hashicorp/vault-action@v2
        with:
          url: https://vault.example.com
          token: ${{ secrets.VAULT_TOKEN }}
          secrets: |
            cicd/data/docker-registry username | DOCKER_USERNAME ;
            cicd/data/docker-registry password | DOCKER_PASSWORD ;
            cicd/data/github-token token | GITHUB_TOKEN

      - name: Build and push
        run: |
          echo $DOCKER_PASSWORD | docker login registry.example.com -u $DOCKER_USERNAME --password-stdin
          docker build -t registry.example.com/myapp:${{ github.sha }} .
          docker push registry.example.com/myapp:${{ github.sha }}
```

## Rotating Secrets Automatically

Implement secret rotation:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rotate-ci-secrets
  namespace: tekton-pipelines
spec:
  schedule: "0 0 * * 0"  # Weekly
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: secret-rotator
          containers:
            - name: rotator
              image: vault:latest
              env:
                - name: VAULT_ADDR
                  value: "https://vault.vault.svc:8200"
              command:
                - /bin/sh
                - -c
                - |
                  # Generate new credentials
                  NEW_PASS=$(openssl rand -base64 32)

                  # Update in Vault
                  vault kv put cicd/docker-registry \
                    username=ci-user \
                    password=$NEW_PASS

                  # Update in Docker registry
                  # Implementation depends on registry

                  # Restart affected pods
                  kubectl rollout restart deployment/ci-pipeline -n tekton-pipelines
          restartPolicy: OnFailure
```

## Monitoring Secret Access

Track secret usage:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vault-audit-config
data:
  audit.hcl: |
    audit "file" {
      path = "/vault/logs/audit.log"
      log_raw = false
    }
```

Query audit logs:

```bash
# View secret access logs
kubectl exec -it vault-0 -n vault -- \
  cat /vault/logs/audit.log | \
  jq 'select(.request.path | contains("cicd"))'
```

## Implementing Least Privilege

Create minimal policies:

```hcl
# Policy for build tasks only
path "cicd/data/docker-registry" {
  capabilities = ["read"]
}

# Policy for deploy tasks
path "cicd/data/aws-credentials" {
  capabilities = ["read"]
}
path "cicd/data/kubeconfig" {
  capabilities = ["read"]
}
```

Map to different service accounts:

```yaml
# Build service account
apiVersion: v1
kind: ServiceAccount
metadata:
  name: build-sa
  namespace: tekton-pipelines

---
# Deploy service account
apiVersion: v1
kind: ServiceAccount
metadata:
  name: deploy-sa
  namespace: tekton-pipelines
```

## Conclusion

Secrets Store CSI Driver provides secure, dynamic credential management for CI/CD pipelines by integrating external secret systems directly with Kubernetes pods. This approach eliminates hardcoded secrets, provides centralized secret lifecycle management, maintains audit trails, and supports automatic rotation. By fetching credentials at runtime from systems like Vault, AWS Secrets Manager, or Azure Key Vault, your CI/CD pipelines achieve better security posture while maintaining operational simplicity. Combined with least privilege access and proper monitoring, CSI-based secret management becomes a cornerstone of secure Kubernetes CI/CD.
