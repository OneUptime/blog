# How to Configure Flux with Pod Identity for EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, AWS, EKS, Pod Identity, IAM

Description: Learn how to configure Flux with EKS Pod Identity, the next-generation alternative to IRSA that simplifies IAM role association for Kubernetes service accounts.

---

## What is EKS Pod Identity

EKS Pod Identity is AWS's newer approach to associating IAM roles with Kubernetes pods. Unlike IRSA, which requires OIDC provider configuration and trust policy management, Pod Identity uses the EKS Pod Identity Agent as a DaemonSet to handle credential injection. It simplifies setup by removing the need to modify trust policies for each service account.

## Pod Identity vs IRSA

Key differences:

- **Simpler setup**: No need to create and manage OIDC trust policies per service account
- **Centralized management**: Associations are managed through the EKS API
- **Cross-account support**: Easier cross-account role assumption with role chaining
- **No annotation required**: Service accounts do not need IAM role annotations
- **Cluster-level configuration**: Managed at the EKS API level rather than inside the cluster

## Prerequisites

- An EKS cluster running Kubernetes 1.24 or later
- EKS Pod Identity Agent add-on installed
- Flux installed on the EKS cluster
- AWS CLI v2 with EKS Pod Identity support

## Step 1: Install the Pod Identity Agent

Install the EKS Pod Identity Agent add-on:

```bash
aws eks create-addon \
  --cluster-name my-cluster \
  --addon-name eks-pod-identity-agent \
  --addon-version v1.2.0-eksbuild.1

# Verify the agent is running
kubectl get daemonset eks-pod-identity-agent -n kube-system
```

## Step 2: Create the IAM Role

Create an IAM role with the Pod Identity trust policy:

```bash
cat > pod-identity-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "pods.eks.amazonaws.com"
      },
      "Action": [
        "sts:AssumeRole",
        "sts:TagSession"
      ]
    }
  ]
}
EOF

aws iam create-role \
  --role-name flux-source-controller-role \
  --assume-role-policy-document file://pod-identity-trust-policy.json
```

Note that unlike IRSA, the trust policy uses the `pods.eks.amazonaws.com` service principal and does not need cluster-specific OIDC information.

## Step 3: Attach Policies to the Role

Attach the necessary policies for Flux operations:

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# For ECR access
aws iam attach-role-policy \
  --role-name flux-source-controller-role \
  --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/FluxECRReadOnly"

# For S3 bucket source access
aws iam attach-role-policy \
  --role-name flux-source-controller-role \
  --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/FluxS3ReadOnly"
```

For the kustomize-controller (SOPS/KMS):

```bash
aws iam create-role \
  --role-name flux-kustomize-controller-role \
  --assume-role-policy-document file://pod-identity-trust-policy.json

aws iam attach-role-policy \
  --role-name flux-kustomize-controller-role \
  --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/FluxKMSDecrypt"
```

## Step 4: Create Pod Identity Associations

Associate the IAM roles with Flux service accounts using the EKS API:

```bash
# Associate role with source-controller
aws eks create-pod-identity-association \
  --cluster-name my-cluster \
  --namespace flux-system \
  --service-account source-controller \
  --role-arn "arn:aws:iam::${ACCOUNT_ID}:role/flux-source-controller-role"

# Associate role with kustomize-controller
aws eks create-pod-identity-association \
  --cluster-name my-cluster \
  --namespace flux-system \
  --service-account kustomize-controller \
  --role-arn "arn:aws:iam::${ACCOUNT_ID}:role/flux-kustomize-controller-role"
```

## Step 5: Restart Flux Controllers

Restart the Flux controllers to pick up the Pod Identity credentials:

```bash
kubectl rollout restart deployment/source-controller -n flux-system
kubectl rollout restart deployment/kustomize-controller -n flux-system

# Wait for rollout to complete
kubectl rollout status deployment/source-controller -n flux-system
kubectl rollout status deployment/kustomize-controller -n flux-system
```

## Step 6: Configure Flux Sources

Configure Flux sources to use the AWS provider:

```yaml
# clusters/production/ecr-source.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app
  interval: 5m
  provider: aws
```

```yaml
# clusters/production/kms-decryption.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: secrets
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./secrets/production
  prune: true
  decryption:
    provider: sops
```

## Managing Pod Identity Associations Declaratively

Store Pod Identity associations as Terraform or CloudFormation resources:

```hcl
# terraform
resource "aws_eks_pod_identity_association" "flux_source_controller" {
  cluster_name    = aws_eks_cluster.main.name
  namespace       = "flux-system"
  service_account = "source-controller"
  role_arn        = aws_iam_role.flux_source_controller.arn
}

resource "aws_eks_pod_identity_association" "flux_kustomize_controller" {
  cluster_name    = aws_eks_cluster.main.name
  namespace       = "flux-system"
  service_account = "kustomize-controller"
  role_arn        = aws_iam_role.flux_kustomize_controller.arn
}
```

## Cross-Account Access with Pod Identity

Pod Identity supports role chaining for cross-account access:

```bash
# In the target account, create a role with trust to the source role
cat > cross-account-trust.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::SOURCE_ACCOUNT:role/flux-source-controller-role"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name flux-cross-account-ecr \
  --assume-role-policy-document file://cross-account-trust.json
```

## Listing and Managing Associations

```bash
# List all Pod Identity associations for the cluster
aws eks list-pod-identity-associations \
  --cluster-name my-cluster

# List associations for a specific namespace
aws eks list-pod-identity-associations \
  --cluster-name my-cluster \
  --namespace flux-system

# Delete an association
aws eks delete-pod-identity-association \
  --cluster-name my-cluster \
  --association-id a-1234567890abcdef0
```

## Verifying the Setup

```bash
# Check Pod Identity Agent is running
kubectl get pods -n kube-system -l app.kubernetes.io/name=eks-pod-identity-agent

# Verify credentials are injected into the pod
kubectl exec -n flux-system deployment/source-controller -- \
  env | grep AWS

# Check that the source-controller can access AWS services
flux get sources git
flux get image repository my-app

# View controller logs for authentication details
kubectl logs -n flux-system deployment/source-controller | grep -i "aws\|credential"
```

## Conclusion

EKS Pod Identity provides a simpler alternative to IRSA for configuring Flux with AWS IAM roles. By managing role associations at the EKS API level rather than through OIDC trust policies and service account annotations, Pod Identity reduces the operational complexity of IAM integration. The setup is more straightforward, cross-account access is easier to configure, and the trust policy is reusable across clusters. For new EKS deployments, Pod Identity is the recommended approach for integrating Flux with AWS services.
