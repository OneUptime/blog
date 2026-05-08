# Securing AWS Secrets in Cilium Network Security

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, AWS, Security, Secret

Description: How to secure AWS secrets used by Cilium for cloud-integrated networking, including credential rotation, least-privilege IAM, and Kubernetes secret management.

---

## Introduction

When Cilium runs on AWS with ENI IPAM mode, the Cilium operator needs AWS credentials to manage network interfaces and IP addresses. These credentials must be stored securely, rotated regularly, and granted only the minimum permissions required. A compromised Cilium credential could allow an attacker to manipulate your VPC networking.

This guide covers the security best practices for managing AWS secrets in Cilium deployments, including using IAM roles for service accounts (IRSA), limiting credential scope, and monitoring credential usage.

## Prerequisites

- EKS cluster for IRSA, or self-managed Kubernetes on AWS with an equivalent pod identity mechanism
- AWS CLI configured
- kubectl and Helm configured
- IAM permissions to create roles and policies

## Using IAM Roles for Service Accounts (IRSA)

The most secure approach avoids static credentials entirely:

```bash
# Create an IAM OIDC provider for the EKS cluster

eksctl utils associate-iam-oidc-provider --cluster my-cluster --approve

# Create an IAM role for the Cilium operator after creating the policy below
eksctl create iamserviceaccount \
  --name cilium-operator \
  --namespace kube-system \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::123456789012:policy/CiliumMinimalPolicy \
  --role-name cilium-operator \
  --role-only \
  --approve
```

Configure Cilium to use the service account:

```yaml
# cilium-aws-irsa.yaml
eni:
  enabled: true
  iamRole: "arn:aws:iam::123456789012:role/cilium-operator"

ipam:
  mode: eni
```

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  -f cilium-aws-irsa.yaml
```

```mermaid
graph TD
    A[Cilium Operator Pod] --> B[Service Account]
    B --> C[IRSA Annotation]
    C --> D[AWS STS]
    D --> E[Temporary Credentials]
    E --> F[EC2 ENI API]
```

## Creating Least-Privilege IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateNetworkInterface",
        "ec2:AttachNetworkInterface",
        "ec2:DeleteNetworkInterface",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DescribeSubnets",
        "ec2:DescribeVpcs",
        "ec2:DescribeRouteTables",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeTags",
        "ec2:DescribeInstances",
        "ec2:DescribeInstanceTypes",
        "ec2:AssignPrivateIpAddresses",
        "ec2:UnassignPrivateIpAddresses",
        "ec2:ModifyNetworkInterfaceAttribute",
        "ec2:CreateTags"
      ],
      "Resource": "*"
    }
  ]
}
```

```bash
aws iam create-policy \
  --policy-name CiliumMinimalPolicy \
  --policy-document file://cilium-iam-policy.json
```

## Securing Kubernetes Secrets

If you must use static credentials:

```bash
# Create the secret with strict permissions
kubectl create secret generic cilium-aws -n kube-system \
  --from-literal=AWS_ACCESS_KEY_ID=AKIA... \
  --from-literal=AWS_SECRET_ACCESS_KEY=... \
  --from-literal=AWS_DEFAULT_REGION=us-east-1

# Restrict access with RBAC
cat <<EOF | kubectl apply -f -
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: cilium-secrets-reader
  namespace: kube-system
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    resourceNames: ["cilium-aws"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: cilium-secrets-reader
  namespace: kube-system
subjects:
  - kind: ServiceAccount
    name: cilium-operator
    namespace: kube-system
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: cilium-secrets-reader
EOF
```

## Verification

```bash
# Verify IRSA is working
kubectl describe serviceaccount cilium-operator -n kube-system | \
  grep eks.amazonaws.com/role-arn

kubectl run aws-irsa-check -n kube-system --rm -it \
  --restart=Never \
  --serviceaccount=cilium-operator \
  --image=amazon/aws-cli:2 -- sts get-caller-identity

# Verify Cilium can manage ENIs
cilium status | grep IPAM

# Check for credential errors
kubectl logs -n kube-system deployment/cilium-operator | \
  grep -iE "auth|credential|forbidden" | tail -10
```

## Troubleshooting

- **"UnauthorizedAccess" errors**: Check IAM role trust policy includes the OIDC provider.
- **IRSA not working**: Verify the service account annotation and that the OIDC provider is set up.
- **Static credentials expired**: Rotate credentials and update the Kubernetes secret.
- **Insufficient permissions**: Review CloudTrail for denied API calls and update the IAM policy.

## Conclusion

Secure AWS secrets in Cilium by using IRSA instead of static credentials, applying least-privilege IAM policies, and monitoring credential usage. IRSA provides automatic credential rotation and eliminates the need for stored secrets, making it the recommended approach for production deployments.
