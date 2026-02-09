# How to Configure Crossplane ProviderConfig for Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Crossplane, Security

Description: Learn how to configure Crossplane ProviderConfig for secure authentication with cloud providers using service accounts, IAM roles, and workload identity across AWS, Azure, and GCP.

---

ProviderConfig is Crossplane's authentication mechanism for cloud providers. It tells provider controllers how to authenticate with cloud APIs when creating and managing resources. Without proper ProviderConfig, Crossplane cannot create infrastructure. Understanding ProviderConfig options - from static credentials to workload identity - is essential for secure, production-ready Crossplane deployments.

Different authentication methods offer different security and operational tradeoffs. Static credentials are simple but require rotation. IAM roles and workload identity provide dynamic credentials without secret management. Choose the right approach based on your security requirements and cloud platform.

## Understanding ProviderConfig Structure

ProviderConfig has three key components:

**Credentials source**: Where authentication credentials come from (Secret, InjectedIdentity, Environment)
**Credential reference**: Which secret or identity to use
**Provider-specific settings**: Region, project ID, subscription ID, etc.

Each managed resource references a ProviderConfig to determine how to authenticate with the cloud provider.

## AWS ProviderConfig with Static Credentials

Configure AWS provider with access keys:

```yaml
apiVersion: aws.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: aws-default
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-credentials
      key: credentials
```

Create the credentials secret:

```bash
# Create credentials file
cat > aws-credentials.txt <<EOF
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
EOF

# Create secret
kubectl create secret generic aws-credentials \
  -n crossplane-system \
  --from-file=credentials=aws-credentials.txt

# Clean up credentials file
rm aws-credentials.txt
```

## AWS ProviderConfig with IAM Roles for Service Accounts (IRSA)

Use IRSA for secure, dynamic credentials:

```bash
# Create IAM policy
aws iam create-policy \
  --policy-name CrossplanePolicy \
  --policy-document file://crossplane-policy.json

# Create IAM role with OIDC provider
eksctl create iamserviceaccount \
  --name crossplane-provider-aws \
  --namespace crossplane-system \
  --cluster your-eks-cluster \
  --attach-policy-arn arn:aws:iam::ACCOUNT_ID:policy/CrossplanePolicy \
  --approve \
  --override-existing-serviceaccounts
```

Configure ProviderConfig for IRSA:

```yaml
apiVersion: aws.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: aws-irsa
spec:
  credentials:
    source: InjectedIdentity
```

The provider automatically uses the IAM role attached to its service account.

## Azure ProviderConfig with Service Principal

Configure Azure provider with service principal credentials:

```yaml
apiVersion: azure.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: azure-default
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: azure-credentials
      key: credentials
```

Create the service principal and secret:

```bash
# Create service principal
az ad sp create-for-rbac \
  --name crossplane-sp \
  --role Contributor \
  --scopes /subscriptions/SUBSCRIPTION_ID \
  --sdk-auth > azure-credentials.json

# Create secret
kubectl create secret generic azure-credentials \
  -n crossplane-system \
  --from-file=credentials=azure-credentials.json

# Clean up
rm azure-credentials.json
```

## Azure ProviderConfig with Managed Identity

Use Azure AD Pod Identity or Workload Identity:

```yaml
apiVersion: azure.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: azure-managed-identity
spec:
  credentials:
    source: InjectedIdentity
```

Configure Azure AD Workload Identity:

```bash
# Create managed identity
az identity create \
  --name crossplane-identity \
  --resource-group crossplane-rg

# Get identity details
IDENTITY_CLIENT_ID=$(az identity show \
  --name crossplane-identity \
  --resource-group crossplane-rg \
  --query clientId -o tsv)

# Annotate service account
kubectl annotate serviceaccount provider-azure \
  -n crossplane-system \
  azure.workload.identity/client-id=$IDENTITY_CLIENT_ID

# Assign roles
az role assignment create \
  --role Contributor \
  --assignee $IDENTITY_CLIENT_ID \
  --scope /subscriptions/SUBSCRIPTION_ID
```

## GCP ProviderConfig with Service Account Key

Configure GCP provider with service account:

```yaml
apiVersion: gcp.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: gcp-default
spec:
  projectID: my-project-id
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: gcp-credentials
      key: credentials
```

Create service account and secret:

```bash
# Create service account
gcloud iam service-accounts create crossplane-sa \
  --display-name="Crossplane Service Account"

# Grant permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:crossplane-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/editor"

# Create key
gcloud iam service-accounts keys create crossplane-gcp-key.json \
  --iam-account=crossplane-sa@PROJECT_ID.iam.gserviceaccount.com

# Create secret
kubectl create secret generic gcp-credentials \
  -n crossplane-system \
  --from-file=credentials=crossplane-gcp-key.json

# Clean up
rm crossplane-gcp-key.json
```

## GCP ProviderConfig with Workload Identity

Use GCP Workload Identity for keyless authentication:

```bash
# Enable Workload Identity on cluster
gcloud container clusters update CLUSTER_NAME \
  --workload-pool=PROJECT_ID.svc.id.goog

# Create Kubernetes service account
kubectl create serviceaccount crossplane-gcp \
  -n crossplane-system

# Bind to GCP service account
gcloud iam service-accounts add-iam-policy-binding \
  crossplane-sa@PROJECT_ID.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:PROJECT_ID.svc.id.goog[crossplane-system/crossplane-gcp]"

# Annotate Kubernetes service account
kubectl annotate serviceaccount crossplane-gcp \
  -n crossplane-system \
  iam.gke.io/gcp-service-account=crossplane-sa@PROJECT_ID.iam.gserviceaccount.com
```

Configure ProviderConfig:

```yaml
apiVersion: gcp.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: gcp-workload-identity
spec:
  projectID: my-project-id
  credentials:
    source: InjectedIdentity
```

## Using Multiple ProviderConfigs

Manage multiple accounts or environments:

```yaml
# Production AWS account
apiVersion: aws.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: aws-production
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-prod-credentials
      key: credentials
---
# Development AWS account
apiVersion: aws.crossplane.io/v1beta1
kind: ProviderConfig
metadata:
  name: aws-development
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: aws-dev-credentials
      key: credentials
```

Reference specific configs in managed resources:

```yaml
apiVersion: s3.aws.crossplane.io/v1beta1
kind: Bucket
metadata:
  name: prod-bucket
spec:
  forProvider:
    region: us-west-2
  providerConfigRef:
    name: aws-production
```

## Implementing ProviderConfig Selection in Compositions

Allow dynamic provider selection:

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: s3bucket-flexible
spec:
  compositeTypeRef:
    apiVersion: storage.example.com/v1alpha1
    kind: XObjectStorage
  resources:
  - name: bucket
    base:
      apiVersion: s3.aws.crossplane.io/v1beta1
      kind: Bucket
      spec:
        forProvider:
          region: us-west-2
    patches:
    - type: FromCompositeFieldPath
      fromFieldPath: spec.providerConfigRef.name
      toFieldPath: spec.providerConfigRef.name
```

Users specify provider config in claims:

```yaml
apiVersion: storage.example.com/v1alpha1
kind: ObjectStorage
metadata:
  name: my-bucket
  namespace: team-a
spec:
  providerConfigRef:
    name: aws-production
```

## Rotating Credentials

Update credentials without downtime:

```bash
# Create new credentials
# ... generate new access keys or service account keys

# Update secret
kubectl create secret generic aws-credentials \
  -n crossplane-system \
  --from-file=credentials=new-aws-credentials.txt \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart provider pods to pick up new credentials
kubectl rollout restart deployment -n crossplane-system -l pkg.crossplane.io/provider=provider-aws
```

For workload identity, rotation happens automatically.

## Monitoring ProviderConfig Status

Verify provider authentication:

```bash
# Check ProviderConfig status
kubectl get providerconfigs

# Describe for details
kubectl describe providerconfig aws-default

# Test with a simple resource
kubectl apply -f - <<EOF
apiVersion: s3.aws.crossplane.io/v1beta1
kind: Bucket
metadata:
  name: test-auth
spec:
  forProvider:
    region: us-west-2
  providerConfigRef:
    name: aws-default
EOF

# Check if bucket creates successfully
kubectl get bucket test-auth
kubectl describe bucket test-auth
```

## Implementing Least Privilege

Minimize provider permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:DeleteBucket",
        "s3:GetBucketVersioning",
        "s3:PutBucketVersioning",
        "s3:GetBucketEncryption",
        "s3:PutBucketEncryption",
        "s3:GetBucketPublicAccessBlock",
        "s3:PutBucketPublicAccessBlock",
        "s3:ListBucket",
        "s3:PutBucketTagging"
      ],
      "Resource": "arn:aws:s3:::crossplane-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "rds:CreateDBInstance",
        "rds:DeleteDBInstance",
        "rds:DescribeDBInstances",
        "rds:ModifyDBInstance",
        "rds:AddTagsToResource",
        "rds:ListTagsForResource"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:ResourceTag/ManagedBy": "Crossplane"
        }
      }
    }
  ]
}
```

This limits provider access to specific resource types and tags.

## Troubleshooting Authentication Issues

Common problems and solutions:

```bash
# Check provider logs for auth errors
kubectl logs -n crossplane-system -l pkg.crossplane.io/provider=provider-aws | grep -i auth

# Verify secret exists and has correct format
kubectl get secret aws-credentials -n crossplane-system -o yaml

# Test credentials manually
kubectl run aws-cli --rm -it --image amazon/aws-cli \
  --env="AWS_ACCESS_KEY_ID=XXX" \
  --env="AWS_SECRET_ACCESS_KEY=YYY" \
  -- s3 ls

# Check IAM role annotations (IRSA)
kubectl get sa provider-aws -n crossplane-system -o yaml | grep eks.amazonaws.com

# Verify workload identity (GCP)
kubectl get sa crossplane-gcp -n crossplane-system -o yaml | grep gke.io
```

## Conclusion

Proper ProviderConfig configuration is essential for secure Crossplane operations. Using workload identity or IAM roles instead of static credentials eliminates secret rotation overhead and reduces security risks. By implementing multiple ProviderConfigs for different environments and applying least privilege principles, you create a secure, scalable authentication architecture for your infrastructure platform.
