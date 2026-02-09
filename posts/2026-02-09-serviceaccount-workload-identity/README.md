# How to Use ServiceAccount Annotations for Workload Identity Federation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cloud, Identity

Description: Configure ServiceAccount annotations for workload identity federation across AWS, GCP, and Azure to enable seamless cloud resource access without static credentials.

---

Workload identity federation eliminates the need for long-lived cloud credentials by allowing Kubernetes pods to assume cloud IAM roles using their ServiceAccount tokens. This is implemented through ServiceAccount annotations that bind Kubernetes identities to cloud provider identities.

## Understanding Workload Identity Federation

Traditional cloud authentication requires storing static credentials - access keys, service account keys, or connection strings - in Kubernetes secrets. These credentials are long-lived, must be rotated manually, and represent a security risk if exposed.

Workload identity federation uses short-lived tokens instead. The pod's ServiceAccount token serves as proof of identity. Cloud providers validate this token against your cluster's OIDC endpoint and issue temporary credentials for cloud resource access. No static credentials needed.

This works through OIDC token exchange. Your Kubernetes cluster acts as an OIDC identity provider. Cloud IAM systems are configured to trust this provider. When a pod presents its ServiceAccount token, the cloud provider exchanges it for temporary cloud credentials.

ServiceAccount annotations tell the cloud provider which cloud identity corresponds to which Kubernetes ServiceAccount, establishing the binding between the two identity systems.

## AWS IAM Roles for ServiceAccounts (IRSA)

AWS IRSA uses the eks.amazonaws.com/role-arn annotation:

```yaml
# aws-irsa-serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: s3-app
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/s3-app-role
    eks.amazonaws.com/sts-regional-endpoints: "true"
    eks.amazonaws.com/token-expiration: "86400"
```

The role-arn annotation specifies which IAM role the pod should assume. The sts-regional-endpoints annotation uses regional STS endpoints for better performance. The token-expiration controls the lifetime of AWS credentials.

Create the IAM role with a trust policy:

```bash
# Create trust policy
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/oidc.eks.us-east-1.amazonaws.com/id/EXAMPLED539D4633E53DE1B716D3041E"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "oidc.eks.us-east-1.amazonaws.com/id/EXAMPLED539D4633E53DE1B716D3041E:sub": "system:serviceaccount:production:s3-app",
          "oidc.eks.us-east-1.amazonaws.com/id/EXAMPLED539D4633E53DE1B716D3041E:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name s3-app-role \
  --assume-role-policy-document file://trust-policy.json

# Attach permissions
aws iam attach-role-policy \
  --role-name s3-app-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
```

Deploy a pod using the ServiceAccount:

```yaml
# aws-pod.yaml
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
    command:
    - /bin/bash
    - -c
    - |
      # AWS SDK automatically uses the ServiceAccount token
      aws s3 ls
      sleep 3600
```

The AWS SDK automatically detects the environment variables injected by the mutating webhook and exchanges the ServiceAccount token for AWS credentials.

## GCP Workload Identity

GCP uses the iam.gke.io/gcp-service-account annotation:

```yaml
# gcp-workload-identity-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: gcs-app
  namespace: production
  annotations:
    iam.gke.io/gcp-service-account: gcs-app@my-project.iam.gserviceaccount.com
```

Set up the GCP side:

```bash
# Create GCP service account
gcloud iam service-accounts create gcs-app \
  --display-name="GCS Application"

# Grant permissions to the service account
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:gcs-app@my-project.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

# Allow Kubernetes SA to impersonate GCP SA
gcloud iam service-accounts add-iam-policy-binding \
  gcs-app@my-project.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:my-project.svc.id.goog[production/gcs-app]"
```

Deploy a pod:

```yaml
# gcp-pod.yaml
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
    command:
    - /bin/bash
    - -c
    - |
      # GCP SDK automatically uses workload identity
      gcloud storage ls
      sleep 3600
```

The GCP SDK detects the workload identity configuration and exchanges tokens automatically.

## Azure AD Workload Identity

Azure uses multiple annotations:

```yaml
# azure-workload-identity-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: blob-app
  namespace: production
  annotations:
    azure.workload.identity/client-id: "12345678-1234-1234-1234-123456789012"
    azure.workload.identity/tenant-id: "87654321-4321-4321-4321-210987654321"
    azure.workload.identity/service-account-token-expiration: "3600"
```

Set up Azure AD application:

```bash
# Create Azure AD application
az ad app create --display-name k8s-blob-app

# Get application ID
APP_ID=$(az ad app list --display-name k8s-blob-app --query [].appId -o tsv)

# Get OIDC issuer URL
OIDC_ISSUER=$(az aks show --name my-cluster --resource-group my-rg --query "oidcIssuerProfile.issuerUrl" -o tsv)

# Create federated credential
az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "k8s-federated-credential",
    "issuer": "'$OIDC_ISSUER'",
    "subject": "system:serviceaccount:production:blob-app",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Create managed identity and assign permissions
az identity create \
  --name blob-app-identity \
  --resource-group my-rg

# Assign role
az role assignment create \
  --assignee $APP_ID \
  --role "Storage Blob Data Reader" \
  --scope /subscriptions/SUB_ID/resourceGroups/my-rg
```

Deploy with workload identity:

```yaml
# azure-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: blob-reader
  namespace: production
  labels:
    azure.workload.identity/use: "true"
spec:
  serviceAccountName: blob-app
  containers:
  - name: app
    image: mcr.microsoft.com/azure-cli
    command:
    - /bin/bash
    - -c
    - |
      # Azure SDK automatically uses workload identity
      az storage blob list --account-name myaccount --container-name mycontainer
      sleep 3600
```

The azure.workload.identity/use label enables the mutating webhook that injects necessary environment variables.

## Multi-Cloud ServiceAccount Configuration

For applications spanning multiple clouds:

```yaml
# multi-cloud-serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: multi-cloud-app
  namespace: production
  annotations:
    # AWS
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/app-role
    # GCP
    iam.gke.io/gcp-service-account: app@my-project.iam.gserviceaccount.com
    # Azure
    azure.workload.identity/client-id: "12345678-1234-1234-1234-123456789012"
    azure.workload.identity/tenant-id: "87654321-4321-4321-4321-210987654321"
```

Applications can access resources across all three clouds using the same ServiceAccount.

## Custom Workload Identity Annotations

For custom identity providers:

```yaml
# custom-identity-sa.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: custom-app
  namespace: production
  annotations:
    # Custom identity provider annotations
    identity.custom.io/provider: "custom-idp"
    identity.custom.io/role: "app-access-role"
    identity.custom.io/scope: "read,write"
    identity.custom.io/audience: "https://api.custom.io"
```

Implement a mutating webhook to inject credentials based on custom annotations:

```go
// custom-identity-webhook.go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"

    admissionv1 "k8s.io/api/admission/v1"
    corev1 "k8s.io/api/core/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type WebhookServer struct{}

func (ws *WebhookServer) mutate(ar *admissionv1.AdmissionReview) *admissionv1.AdmissionResponse {
    pod := corev1.Pod{}
    if err := json.Unmarshal(ar.Request.Object.Raw, &pod); err != nil {
        return &admissionv1.AdmissionResponse{
            Result: &metav1.Status{
                Message: err.Error(),
            },
        }
    }

    // Get ServiceAccount
    saName := pod.Spec.ServiceAccountName
    // Fetch SA annotations (simplified - would need actual K8s client)

    // Check for custom identity annotations
    if role, ok := saAnnotations["identity.custom.io/role"]; ok {
        // Inject environment variables
        patches := []map[string]interface{}{
            {
                "op":    "add",
                "path":  "/spec/containers/0/env/-",
                "value": map[string]string{
                    "name":  "CUSTOM_IDENTITY_ROLE",
                    "value": role,
                },
            },
            {
                "op":    "add",
                "path":  "/spec/volumes/-",
                "value": map[string]interface{}{
                    "name": "custom-identity-token",
                    "projected": map[string]interface{}{
                        "sources": []map[string]interface{}{
                            {
                                "serviceAccountToken": map[string]interface{}{
                                    "path":              "token",
                                    "expirationSeconds": 3600,
                                    "audience":          "https://api.custom.io",
                                },
                            },
                        },
                    },
                },
            },
        }

        patchBytes, _ := json.Marshal(patches)
        return &admissionv1.AdmissionResponse{
            Allowed: true,
            Patch:   patchBytes,
            PatchType: func() *admissionv1.PatchType {
                pt := admissionv1.PatchTypeJSONPatch
                return &pt
            }(),
        }
    }

    return &admissionv1.AdmissionResponse{Allowed: true}
}
```

## Debugging Workload Identity Issues

Common troubleshooting steps:

```bash
# Check if annotations are present
kubectl get serviceaccount app-sa -n production -o jsonpath='{.metadata.annotations}'

# For AWS - verify environment variables are injected
kubectl exec -it pod-name -- env | grep AWS

# Expected variables:
# AWS_ROLE_ARN=arn:aws:iam::123456789012:role/app-role
# AWS_WEB_IDENTITY_TOKEN_FILE=/var/run/secrets/eks.amazonaws.com/serviceaccount/token

# For GCP - check metadata server access
kubectl exec -it pod-name -- curl -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token

# For Azure - verify injected variables
kubectl exec -it pod-name -- env | grep AZURE

# Check webhook is running
kubectl get mutatingwebhookconfigurations
```

## Security Considerations

Workload identity annotations are sensitive. Incorrect configuration can grant excessive permissions:

```yaml
# production-security.yaml
# Good: Specific, least-privilege role
apiVersion: v1
kind: ServiceAccount
metadata:
  name: s3-reader-app
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/s3-readonly-specific-bucket

# Bad: Overly broad permissions
# apiVersion: v1
# kind: ServiceAccount
# metadata:
#   name: admin-app
#   annotations:
#     eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/AdminRole
```

Use admission controllers to enforce annotation policies:

```yaml
# opa-gatekeeper-constraint.yaml
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sAllowedAnnotations
metadata:
  name: restrict-workload-identity
spec:
  match:
    kinds:
    - apiGroups: [""]
      kinds: ["ServiceAccount"]
  parameters:
    # Only allow annotations from approved list
    annotations:
    - "eks.amazonaws.com/role-arn"
    - "iam.gke.io/gcp-service-account"
    - "azure.workload.identity/client-id"
```

## Conclusion

ServiceAccount annotations enable workload identity federation, eliminating the need for static cloud credentials. AWS IRSA, GCP Workload Identity, and Azure AD Workload Identity all use annotations to bind Kubernetes ServiceAccounts to cloud IAM identities. Configure the appropriate annotations for your cloud provider, set up the trust relationship on the cloud side, and your pods automatically receive temporary credentials for cloud resource access. This approach is more secure than static credentials and follows cloud security best practices.
