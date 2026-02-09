# How to Configure External OIDC Provider with ServiceAccount Token

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OIDC, Authentication

Description: Integrate external OIDC providers with Kubernetes ServiceAccount tokens for seamless authentication across cluster and external services using standard OAuth 2.0 flows.

---

OpenID Connect (OIDC) integration with ServiceAccount tokens enables Kubernetes workloads to authenticate with external services using standard OAuth 2.0 protocols. This creates a unified identity system where Kubernetes ServiceAccounts become trusted identities across your infrastructure.

## Understanding OIDC and ServiceAccount Integration

OIDC is an authentication layer built on top of OAuth 2.0. It provides a standardized way for applications to verify user identities using ID tokens, which are JSON Web Tokens (JWT) containing identity claims.

Kubernetes can act as an OIDC provider, issuing ID tokens in the form of ServiceAccount tokens. External services configured to trust your cluster's OIDC endpoint can validate these tokens and grant access based on the ServiceAccount identity.

This matters because it eliminates the need for separate credentials for external services. A pod can use its ServiceAccount token to authenticate with Vault, cloud providers, databases, and custom applications, all using the same credential.

## Configuring Kubernetes as an OIDC Provider

First, configure your API server to act as an OIDC issuer. This is typically done at cluster creation but can be updated:

```yaml
# kube-apiserver configuration
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
  namespace: kube-system
spec:
  containers:
  - name: kube-apiserver
    command:
    - kube-apiserver
    # OIDC issuer configuration
    - --service-account-issuer=https://kubernetes.default.svc.cluster.local
    - --service-account-signing-key-file=/etc/kubernetes/pki/sa.key
    - --service-account-key-file=/etc/kubernetes/pki/sa.pub
    # Make OIDC discovery endpoint public
    - --service-account-jwks-uri=https://your-cluster.example.com/openid/v1/jwks
    # Supported audiences
    - --api-audiences=https://kubernetes.default.svc.cluster.local,vault,custom-service
```

The issuer URL must be accessible by external services that need to validate tokens. For managed Kubernetes services (EKS, GKE, AKS), this is configured automatically.

Verify OIDC discovery is working:

```bash
# Get the OIDC issuer URL
ISSUER=$(kubectl get --raw /.well-known/openid-configuration | jq -r '.issuer')
echo "OIDC Issuer: $ISSUER"

# Fetch the JWKS (public keys for token verification)
curl -s ${ISSUER}/.well-known/openid-configuration | jq .
```

This should return the OIDC discovery document with endpoints for key retrieval.

## Creating ServiceAccount Tokens with Custom Audiences

External services require tokens with their audience claim:

```yaml
# vault-integration-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: app-with-vault
  namespace: production
spec:
  serviceAccountName: vault-app
  containers:
  - name: app
    image: myapp:latest
    env:
    - name: VAULT_ADDR
      value: "https://vault.example.com"
    - name: VAULT_TOKEN_PATH
      value: "/var/run/secrets/vault/token"
    volumeMounts:
    - name: vault-token
      mountPath: /var/run/secrets/vault
      readOnly: true
  volumes:
  - name: vault-token
    projected:
      sources:
      - serviceAccountToken:
          path: token
          expirationSeconds: 3600
          audience: vault
```

The audience claim must match what Vault expects. When the application presents this token to Vault, Vault can validate it against the Kubernetes OIDC endpoint.

## Configuring HashiCorp Vault to Accept ServiceAccount Tokens

Vault supports Kubernetes authentication using OIDC token validation:

```bash
# Enable Kubernetes auth method in Vault
vault auth enable -path=k8s kubernetes

# Configure Vault with your cluster's OIDC information
vault write auth/k8s/config \
    kubernetes_host="https://kubernetes.default.svc.cluster.local" \
    kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
    token_reviewer_jwt=@/var/run/secrets/kubernetes.io/serviceaccount/token \
    issuer="https://kubernetes.default.svc.cluster.local"

# Create a Vault role for your ServiceAccount
vault write auth/k8s/role/app-role \
    bound_service_account_names=vault-app \
    bound_service_account_namespaces=production \
    policies=app-policy \
    ttl=1h
```

Now applications can authenticate with Vault using their ServiceAccount token:

```go
// vault-auth.go
package main

import (
    "fmt"
    "io/ioutil"

    vault "github.com/hashicorp/vault/api"
)

func authenticateWithVault() (*vault.Client, error) {
    // Create Vault client
    config := vault.DefaultConfig()
    config.Address = "https://vault.example.com"

    client, err := vault.NewClient(config)
    if err != nil {
        return nil, err
    }

    // Read the ServiceAccount token
    jwt, err := ioutil.ReadFile("/var/run/secrets/vault/token")
    if err != nil {
        return nil, err
    }

    // Authenticate with Vault using the token
    data := map[string]interface{}{
        "jwt":  string(jwt),
        "role": "app-role",
    }

    secret, err := client.Logical().Write("auth/k8s/login", data)
    if err != nil {
        return nil, err
    }

    // Set the Vault token
    client.SetToken(secret.Auth.ClientToken)

    fmt.Println("Successfully authenticated with Vault")
    return client, nil
}

func main() {
    client, err := authenticateWithVault()
    if err != nil {
        panic(err)
    }

    // Use the client to read secrets
    secret, err := client.Logical().Read("secret/data/myapp")
    if err != nil {
        panic(err)
    }

    fmt.Printf("Retrieved secret: %v\n", secret.Data)
}
```

The application authenticates seamlessly without storing Vault credentials.

## Integrating with AWS IAM using IRSA

AWS IAM Roles for ServiceAccounts (IRSA) uses OIDC federation:

```bash
# Create an OIDC provider in AWS for your EKS cluster
OIDC_PROVIDER=$(aws eks describe-cluster --name my-cluster --query "cluster.identity.oidc.issuer" --output text | sed -e "s/^https:\/\///")

aws iam create-open-id-connect-provider \
    --url "https://${OIDC_PROVIDER}" \
    --client-id-list sts.amazonaws.com \
    --thumbprint-list <thumbprint>

# Create an IAM role that trusts the OIDC provider
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/${OIDC_PROVIDER}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${OIDC_PROVIDER}:sub": "system:serviceaccount:production:s3-app",
          "${OIDC_PROVIDER}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

aws iam create-role --role-name s3-app-role --assume-role-policy-document file://trust-policy.json

# Attach permissions
aws iam attach-role-policy --role-name s3-app-role --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
```

Configure the ServiceAccount with the IAM role annotation:

```yaml
# aws-irsa-serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: s3-app
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::ACCOUNT_ID:role/s3-app-role
---
apiVersion: v1
kind: Pod
metadata:
  name: s3-reader
  namespace: production
spec:
  serviceAccountName: s3-app
  containers:
  - name: app
    image: amazon/aws-cli
    command: ["sleep", "3600"]
```

The pod can now access S3 using the IAM role:

```bash
kubectl exec -it s3-reader -n production -- aws s3 ls
```

## Integrating with GCP Workload Identity

GCP Workload Identity uses OIDC token exchange:

```bash
# Enable Workload Identity on your GKE cluster
gcloud container clusters update my-cluster \
    --workload-pool=PROJECT_ID.svc.id.goog

# Create a GCP service account
gcloud iam service-accounts create gcs-app \
    --display-name="GCS Application"

# Grant permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:gcs-app@PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/storage.objectViewer"

# Bind Kubernetes SA to GCP SA
gcloud iam service-accounts add-iam-policy-binding \
    gcs-app@PROJECT_ID.iam.gserviceaccount.com \
    --role roles/iam.workloadIdentityUser \
    --member "serviceAccount:PROJECT_ID.svc.id.goog[production/gcs-app]"
```

Configure the Kubernetes ServiceAccount:

```yaml
# gcp-workload-identity-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: gcs-app
  namespace: production
  annotations:
    iam.gke.io/gcp-service-account: gcs-app@PROJECT_ID.iam.gserviceaccount.com
---
apiVersion: v1
kind: Pod
metadata:
  name: gcs-reader
  namespace: production
spec:
  serviceAccountName: gcs-app
  containers:
  - name: app
    image: google/cloud-sdk:slim
    command: ["sleep", "3600"]
```

Access GCS with the bound identity:

```bash
kubectl exec -it gcs-reader -n production -- gcloud storage ls
```

## Integrating with Azure AD Workload Identity

Azure AD Workload Identity uses federated credentials:

```bash
# Create an Azure AD application
az ad app create --display-name k8s-workload-app

APP_ID=$(az ad app list --display-name k8s-workload-app --query [].appId -o tsv)

# Get OIDC issuer URL
OIDC_ISSUER=$(az aks show --name my-cluster --resource-group my-rg --query "oidcIssuerProfile.issuerUrl" -o tsv)

# Create federated credential
az ad app federated-credential create \
    --id $APP_ID \
    --parameters '{
        "name": "k8s-fed-credential",
        "issuer": "'$OIDC_ISSUER'",
        "subject": "system:serviceaccount:production:azure-app",
        "audiences": ["api://AzureADTokenExchange"]
    }'

# Create a managed identity
az identity create --name k8s-workload-identity --resource-group my-rg

# Grant permissions
az role assignment create \
    --assignee $APP_ID \
    --role "Storage Blob Data Reader" \
    --scope /subscriptions/SUB_ID/resourceGroups/my-rg
```

Configure the ServiceAccount:

```yaml
# azure-workload-identity-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: azure-app
  namespace: production
  annotations:
    azure.workload.identity/client-id: "<APP_ID>"
    azure.workload.identity/tenant-id: "<TENANT_ID>"
---
apiVersion: v1
kind: Pod
metadata:
  name: azure-reader
  namespace: production
  labels:
    azure.workload.identity/use: "true"
spec:
  serviceAccountName: azure-app
  containers:
  - name: app
    image: mcr.microsoft.com/azure-cli
    command: ["sleep", "3600"]
```

## Custom OIDC Integration

For custom services, implement OIDC token validation:

```go
// custom-oidc-validator.go
package main

import (
    "context"
    "fmt"

    "github.com/coreos/go-oidc/v3/oidc"
)

func validateToken(tokenString string, issuerURL string, audience string) error {
    ctx := context.Background()

    // Create OIDC provider
    provider, err := oidc.NewProvider(ctx, issuerURL)
    if err != nil {
        return fmt.Errorf("failed to create OIDC provider: %v", err)
    }

    // Configure verifier
    verifier := provider.Verifier(&oidc.Config{
        ClientID: audience,
    })

    // Verify the token
    idToken, err := verifier.Verify(ctx, tokenString)
    if err != nil {
        return fmt.Errorf("token verification failed: %v", err)
    }

    // Extract claims
    var claims struct {
        Sub       string `json:"sub"`
        Namespace string `json:"kubernetes.io/serviceaccount/namespace"`
        SAName    string `json:"kubernetes.io/serviceaccount/name"`
    }

    if err := idToken.Claims(&claims); err != nil {
        return fmt.Errorf("failed to parse claims: %v", err)
    }

    fmt.Printf("Authenticated: %s/%s\n", claims.Namespace, claims.SAName)
    return nil
}

func main() {
    // Example usage
    token := "eyJhbGc..." // ServiceAccount token
    issuer := "https://kubernetes.default.svc.cluster.local"
    audience := "custom-service"

    if err := validateToken(token, issuer, audience); err != nil {
        panic(err)
    }
}
```

This validates tokens issued by your Kubernetes cluster in custom applications.

## Conclusion

OIDC integration transforms Kubernetes ServiceAccounts into universal identities. By configuring your cluster as an OIDC provider and using audience-scoped tokens, you enable seamless authentication with external services. This works with HashiCorp Vault, AWS IAM, GCP Workload Identity, Azure AD, and custom services. The result is a unified identity system where applications use a single credential - their ServiceAccount token - to access everything they need.
