# How to Configure Cluster Credentials in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Security, Authentication

Description: Learn how to configure and manage cluster credentials in ArgoCD, covering bearer tokens, client certificates, exec-based authentication, and credential rotation strategies for secure multi-cluster management.

---

Every cluster registered with ArgoCD needs credentials that allow the ArgoCD controller to interact with the cluster's API server. These credentials determine what ArgoCD can do in the cluster and how securely it connects. Getting the credential configuration right is critical for both security and operational reliability.

In this guide, I will cover all the credential types ArgoCD supports, how to configure them, and best practices for keeping them secure and up to date.

## How ArgoCD Stores Cluster Credentials

ArgoCD stores cluster credentials as Kubernetes Secrets in the ArgoCD namespace. Each secret has the label `argocd.argoproj.io/secret-type: cluster` and contains three fields:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-cluster
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster
type: Opaque
stringData:
  name: "my-cluster"           # Human-readable name
  server: "https://k8s.example.com"  # API server URL
  config: |                     # JSON authentication config
    {
      ...
    }
```

The `config` field contains the authentication details. Let us look at each type.

## Credential Type 1: Bearer Token

The most common method. Uses a Kubernetes ServiceAccount token:

```yaml
stringData:
  config: |
    {
      "bearerToken": "eyJhbGciOiJSUzI1NiIs...",
      "tlsClientConfig": {
        "insecure": false,
        "caData": "LS0tLS1CRUdJTi..."
      }
    }
```

Create the service account and get its token:

```bash
# In the remote cluster
kubectl create serviceaccount argocd-manager -n kube-system

# Create a token secret (required for Kubernetes 1.24+)
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: argocd-manager-token
  namespace: kube-system
  annotations:
    kubernetes.io/service-account.name: argocd-manager
type: kubernetes.io/service-account-token
EOF

# Get the token
kubectl get secret argocd-manager-token -n kube-system \
  -o jsonpath='{.data.token}' | base64 -d
```

## Credential Type 2: Client Certificates

Uses X509 client certificates for mTLS authentication:

```yaml
stringData:
  config: |
    {
      "tlsClientConfig": {
        "insecure": false,
        "caData": "LS0tLS1CRUdJTi...",
        "certData": "LS0tLS1CRUdJTi...",
        "keyData": "LS0tLS1CRUdJTi..."
      }
    }
```

Generate client certificates:

```bash
# Generate a private key
openssl genrsa -out argocd-client.key 2048

# Create a CSR
openssl req -new -key argocd-client.key \
  -out argocd-client.csr \
  -subj "/CN=argocd-manager/O=system:masters"

# Sign with the cluster CA (on the control plane node)
sudo openssl x509 -req \
  -in argocd-client.csr \
  -CA /etc/kubernetes/pki/ca.crt \
  -CAkey /etc/kubernetes/pki/ca.key \
  -CAcreateserial \
  -out argocd-client.crt \
  -days 365

# Base64 encode for the config
CERT_DATA=$(cat argocd-client.crt | base64 -w 0)
KEY_DATA=$(cat argocd-client.key | base64 -w 0)
CA_DATA=$(cat /etc/kubernetes/pki/ca.crt | base64 -w 0)
```

## Credential Type 3: Exec-Based Authentication

For cloud providers that use external authentication tools:

### AWS EKS (aws-iam-authenticator)

```yaml
stringData:
  config: |
    {
      "awsAuthConfig": {
        "clusterName": "my-eks-cluster",
        "roleARN": "arn:aws:iam::123456789012:role/ArgoCD-Role"
      },
      "tlsClientConfig": {
        "insecure": false,
        "caData": "LS0tLS1CRUdJTi..."
      }
    }
```

### GCP GKE (gcloud)

```yaml
stringData:
  config: |
    {
      "execProviderConfig": {
        "command": "argocd-k8s-auth",
        "args": ["gcp"],
        "apiVersion": "client.authentication.k8s.io/v1beta1"
      },
      "tlsClientConfig": {
        "insecure": false,
        "caData": "LS0tLS1CRUdJTi..."
      }
    }
```

### Azure AKS (kubelogin)

```yaml
stringData:
  config: |
    {
      "execProviderConfig": {
        "command": "kubelogin",
        "args": [
          "get-token",
          "--login", "spn",
          "--server-id", "6dae42f8-4368-4678-94ff-3960e28e3630",
          "--client-id", "<client-id>",
          "--client-secret", "<client-secret>",
          "--tenant-id", "<tenant-id>"
        ],
        "apiVersion": "client.authentication.k8s.io/v1beta1"
      },
      "tlsClientConfig": {
        "insecure": false,
        "caData": "LS0tLS1CRUdJTi..."
      }
    }
```

## Credential Type 4: Basic Authentication

Username and password authentication (rarely used but supported):

```yaml
stringData:
  config: |
    {
      "username": "admin",
      "password": "secret-password",
      "tlsClientConfig": {
        "insecure": false,
        "caData": "LS0tLS1CRUdJTi..."
      }
    }
```

## TLS Configuration Options

The `tlsClientConfig` section controls how ArgoCD verifies the cluster's TLS certificate:

```yaml
"tlsClientConfig": {
  // Skip TLS verification (NEVER use in production)
  "insecure": false,

  // CA certificate to verify the server (base64 encoded PEM)
  "caData": "LS0tLS1CRUdJTi...",

  // Client certificate for mTLS (base64 encoded PEM)
  "certData": "LS0tLS1CRUdJTi...",

  // Client private key for mTLS (base64 encoded PEM)
  "keyData": "LS0tLS1CRUdJTi...",

  // Server name for TLS verification (if different from URL)
  "serverName": "kubernetes.example.com"
}
```

## Credential Rotation

### Rotating Bearer Tokens

```bash
#!/bin/bash
# rotate-cluster-token.sh

CLUSTER_NAME="production"
NAMESPACE="kube-system"

# Delete the old token secret
kubectl delete secret argocd-manager-token -n $NAMESPACE --context $CLUSTER_NAME

# Recreate the token secret
cat <<EOF | kubectl apply --context $CLUSTER_NAME -f -
apiVersion: v1
kind: Secret
metadata:
  name: argocd-manager-token
  namespace: $NAMESPACE
  annotations:
    kubernetes.io/service-account.name: argocd-manager
type: kubernetes.io/service-account-token
EOF

# Wait for token to be populated
sleep 5

# Get the new token
NEW_TOKEN=$(kubectl get secret argocd-manager-token \
  -n $NAMESPACE \
  --context $CLUSTER_NAME \
  -o jsonpath='{.data.token}' | base64 -d)

# Update ArgoCD cluster secret
kubectl get secret -n argocd -l argocd.argoproj.io/secret-type=cluster \
  -o json | jq -r ".items[] | select(.data.name | @base64d == \"$CLUSTER_NAME\") | .metadata.name" | \
while read secret_name; do
  # Patch the secret with new config
  NEW_CONFIG=$(jq -n --arg token "$NEW_TOKEN" --arg ca "$CA_DATA" \
    '{bearerToken: $token, tlsClientConfig: {insecure: false, caData: $ca}}')

  kubectl patch secret $secret_name -n argocd \
    --type='json' \
    -p="[{\"op\":\"replace\",\"path\":\"/stringData/config\",\"value\":\"$NEW_CONFIG\"}]"
done

echo "Token rotated for cluster: $CLUSTER_NAME"
```

### Rotating Client Certificates

```bash
#!/bin/bash
# rotate-client-cert.sh

# Generate new certificate (90-day validity)
openssl genrsa -out new-client.key 2048
openssl req -new -key new-client.key \
  -out new-client.csr \
  -subj "/CN=argocd-manager/O=system:masters"

# Sign with cluster CA
sudo openssl x509 -req \
  -in new-client.csr \
  -CA /etc/kubernetes/pki/ca.crt \
  -CAkey /etc/kubernetes/pki/ca.key \
  -CAcreateserial \
  -out new-client.crt \
  -days 90

# Update ArgoCD cluster secret with new cert and key
CERT_DATA=$(cat new-client.crt | base64 -w 0)
KEY_DATA=$(cat new-client.key | base64 -w 0)

# Cleanup
rm new-client.key new-client.csr new-client.crt
```

## Automating Rotation with CronJobs

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rotate-cluster-tokens
  namespace: argocd
spec:
  schedule: "0 0 1 * *"  # Monthly
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: argocd-token-rotator
          containers:
            - name: rotator
              image: bitnami/kubectl:latest
              command:
                - /bin/bash
                - /scripts/rotate-tokens.sh
              volumeMounts:
                - name: scripts
                  mountPath: /scripts
          volumes:
            - name: scripts
              configMap:
                name: rotation-scripts
          restartPolicy: OnFailure
```

## Securing Credentials in Git

Never store cluster credentials in plaintext in Git. Use one of these approaches:

```yaml
# Option 1: Sealed Secrets
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: production-cluster
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: cluster

# Option 2: External Secrets
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: production-cluster
  namespace: argocd
spec:
  target:
    name: production-cluster
    template:
      metadata:
        labels:
          argocd.argoproj.io/secret-type: cluster
```

## Summary

ArgoCD supports multiple credential types for cluster authentication: bearer tokens, client certificates, exec-based providers for cloud platforms, and basic auth. Bearer tokens are the simplest and most common. Exec-based authentication is recommended for cloud-managed clusters. Regardless of the type, always encrypt credentials before storing them in Git, implement automated rotation, and use the principle of least privilege for the service accounts ArgoCD uses. For cloud-specific credential configurations, see our guides on [EKS IRSA auth](https://oneuptime.com/blog/post/2026-02-26-argocd-eks-irsa-auth/view) and [GKE Workload Identity](https://oneuptime.com/blog/post/2026-02-26-argocd-gke-workload-identity/view).
