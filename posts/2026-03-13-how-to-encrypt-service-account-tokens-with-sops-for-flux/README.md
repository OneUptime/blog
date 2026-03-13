# How to Encrypt Service Account Tokens with SOPS for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, SOPS, Secrets, Encryption, Service Accounts, Tokens, RBAC

Description: Learn how to encrypt Kubernetes service account tokens and external service credentials with SOPS for secure deployment through Flux.

---

Service account tokens grant access to Kubernetes APIs and external services. Whether you are managing long-lived Kubernetes service account tokens, cloud provider service account keys, or third-party API tokens, encrypting these credentials before committing them to Git is essential. This guide covers encrypting service account tokens with SOPS for Flux deployments.

## Types of Service Account Tokens

There are several types of tokens you might manage in a Flux repository. Kubernetes service account tokens provide API access within the cluster. Cloud provider service account keys (such as GCP service account JSON keys) grant access to cloud resources. External API tokens authenticate with third-party services. These all need to be stored as encrypted Kubernetes Secrets.

## Prerequisites

You need:

- A Kubernetes cluster with Flux and SOPS decryption configured
- SOPS and age CLI tools installed
- The service account token or key you want to store
- An age key pair configured in Flux

## Encrypting a Kubernetes Service Account Token

For scenarios where you need a pre-created token secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: monitoring-sa-token
  namespace: monitoring
  annotations:
    kubernetes.io/service-account.name: monitoring-sa
type: kubernetes.io/service-account-token
stringData:
  token: eyJhbGciOiJSUzI1NiIsImtpZCI6...long-token-value...
```

Configure SOPS and encrypt:

```yaml
# .sops.yaml
creation_rules:
  - path_regex: .*token.*\.yaml$
    age: age1yourkey...
    encrypted_regex: ^(data|stringData)$
```

```bash
sops --encrypt --in-place monitoring-sa-token.yaml
```

## Encrypting GCP Service Account Keys

GCP service account JSON keys are commonly used for workloads that need access to Google Cloud services:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gcp-sa-credentials
  namespace: default
type: Opaque
stringData:
  credentials.json: |
    {
      "type": "service_account",
      "project_id": "my-project",
      "private_key_id": "key-id-here",
      "private_key": "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n",
      "client_email": "my-sa@my-project.iam.gserviceaccount.com",
      "client_id": "123456789",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token"
    }
```

Encrypt with SOPS:

```bash
sops --encrypt --in-place gcp-sa-secret.yaml
```

## Encrypting AWS Credentials

For AWS IAM access keys:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: aws-credentials
  namespace: default
type: Opaque
stringData:
  AWS_ACCESS_KEY_ID: AKIAIOSFODNN7EXAMPLE
  AWS_SECRET_ACCESS_KEY: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
  AWS_DEFAULT_REGION: us-east-1
```

## Encrypting External API Tokens

For third-party service tokens:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: external-api-tokens
  namespace: default
type: Opaque
stringData:
  DATADOG_API_KEY: abc123def456
  SLACK_WEBHOOK_URL: https://hooks.slack.com/services/T00/B00/xxxxx
  PAGERDUTY_TOKEN: pdtoken123456
```

Encrypt each file:

```bash
sops --encrypt --in-place external-api-tokens.yaml
```

## Deploying with Flux

Set up the Flux Kustomization with SOPS decryption:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: service-credentials
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/credentials
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

## Mounting Service Account Keys in Pods

Mount the GCP service account key as a file:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cloud-app
  namespace: default
spec:
  template:
    spec:
      containers:
        - name: app
          image: myapp:latest
          env:
            - name: GOOGLE_APPLICATION_CREDENTIALS
              value: /var/secrets/google/credentials.json
          volumeMounts:
            - name: gcp-sa
              mountPath: /var/secrets/google
              readOnly: true
      volumes:
        - name: gcp-sa
          secret:
            secretName: gcp-sa-credentials
```

## Using Tokens as Environment Variables

For API tokens, inject them as environment variables:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: monitoring-agent
  namespace: monitoring
spec:
  template:
    spec:
      containers:
        - name: agent
          image: monitoring-agent:latest
          envFrom:
            - secretRef:
                name: external-api-tokens
```

## Directory Structure

Organize credential secrets by type:

```
infrastructure/
  credentials/
    kustomization.yaml
    gcp-sa-secret.yaml           # SOPS encrypted
    aws-credentials.yaml         # SOPS encrypted
    external-api-tokens.yaml     # SOPS encrypted
    monitoring-sa-token.yaml     # SOPS encrypted
```

The Kustomize configuration:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gcp-sa-secret.yaml
  - aws-credentials.yaml
  - external-api-tokens.yaml
  - monitoring-sa-token.yaml
```

## Token Rotation

When rotating service account tokens:

```bash
# Edit the encrypted secret
sops external-api-tokens.yaml
# Update the token values in the editor
# Save and close - SOPS re-encrypts

# Commit and push
git add external-api-tokens.yaml
git commit -m "Rotate external API tokens"
git push
```

Flux detects the change and updates the Kubernetes Secret, and pods that reference it pick up the new values on their next restart or through environment variable refresh.

## Automating Token Rotation with CronJobs

For tokens that need regular rotation, combine SOPS-managed initial tokens with in-cluster rotation:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rotate-tokens
  namespace: default
spec:
  schedule: "0 0 1 * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: token-rotator
          containers:
            - name: rotator
              image: token-rotator:latest
              command: ["/bin/sh", "-c"]
              args:
                - |
                  # Fetch new token from provider
                  # Update Kubernetes secret
                  kubectl create secret generic external-api-tokens \
                    --from-literal=DATADOG_API_KEY="$(fetch-new-token)" \
                    --dry-run=client -o yaml | kubectl apply -f -
          restartPolicy: OnFailure
```

## Verifying Deployment

```bash
# Check secrets exist
kubectl get secrets -n default | grep -E 'gcp|aws|api-tokens'

# Verify a secret has the expected keys
kubectl get secret gcp-sa-credentials -n default -o jsonpath='{.data}' | jq 'keys'

# Check Flux reconciliation status
flux get kustomizations service-credentials
```

## Conclusion

Encrypting service account tokens with SOPS in Flux protects sensitive credentials across cloud providers and third-party services. By organizing tokens into dedicated encrypted secrets and deploying them through Flux, you maintain a secure GitOps workflow while ensuring applications have the credentials they need to access external services.
