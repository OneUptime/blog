# How to Configure Flux CD with AWS Load Balancer Controller

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Aws load balancer controller, ALB, NLB, Kubernetes, GitOps, Helm

Description: Learn how to deploy and manage the AWS Load Balancer Controller using Flux CD HelmRelease for automated ALB and NLB provisioning.

---

## Introduction

The AWS Load Balancer Controller is a Kubernetes controller that provisions AWS Application Load Balancers (ALBs) and Network Load Balancers (NLBs) when Kubernetes Ingress or Service resources are created. Managing this controller through Flux CD ensures your load balancer infrastructure is version-controlled and automatically reconciled.

This guide covers deploying the AWS Load Balancer Controller via a Flux CD HelmRelease and configuring Ingress resources with the proper annotations.

## Prerequisites

Before starting, ensure you have:

- An Amazon EKS cluster running Kubernetes 1.25 or later
- Flux CD installed and bootstrapped on the cluster
- AWS CLI configured with appropriate permissions
- An OIDC provider associated with your EKS cluster
- VPC subnets tagged for auto-discovery

## Step 1: Tag VPC Subnets

The AWS Load Balancer Controller requires subnets to be tagged for auto-discovery.

```bash
# Tag public subnets for internet-facing load balancers
aws ec2 create-tags \
  --resources subnet-0123456789abcdef0 subnet-0123456789abcdef1 \
  --tags Key=kubernetes.io/role/elb,Value=1

# Tag private subnets for internal load balancers
aws ec2 create-tags \
  --resources subnet-0abcdef1234567890 subnet-0abcdef1234567891 \
  --tags Key=kubernetes.io/role/internal-elb,Value=1
```

## Step 2: Create an IAM Policy for the Controller

Download and create the IAM policy required by the AWS Load Balancer Controller.

```bash
# Download the recommended IAM policy
curl -o iam-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.7.1/docs/install/iam_policy.json

# Create the IAM policy
aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://iam-policy.json
```

## Step 3: Create an IAM Role with IRSA

Create an IAM role for the controller using IRSA.

```bash
# Get the OIDC provider
OIDC_PROVIDER=$(aws eks describe-cluster \
  --name my-cluster \
  --query "cluster.identity.oidc.issuer" \
  --output text | sed 's|https://||')

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create the trust policy
cat > lb-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/${OIDC_PROVIDER}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${OIDC_PROVIDER}:sub": "system:serviceaccount:kube-system:aws-load-balancer-controller",
          "${OIDC_PROVIDER}:aud": "sts.amazonaws.com"
        }
      }
    }
  ]
}
EOF

# Create the IAM role
aws iam create-role \
  --role-name AmazonEKSLoadBalancerControllerRole \
  --assume-role-policy-document file://lb-trust-policy.json

# Attach the policy
aws iam attach-role-policy \
  --role-name AmazonEKSLoadBalancerControllerRole \
  --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/AWSLoadBalancerControllerIAMPolicy
```

## Step 4: Create the Helm Repository Source

Define a Flux HelmRepository resource for the EKS Helm charts.

```yaml
# helm-repo-eks.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: eks-charts
  namespace: flux-system
spec:
  # Check for new chart versions every hour
  interval: 1h
  url: https://aws.github.io/eks-charts
```

## Step 5: Create the HelmRelease for the Controller

Deploy the AWS Load Balancer Controller using a Flux HelmRelease.

```yaml
# aws-lb-controller-release.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: aws-load-balancer-controller
  namespace: kube-system
spec:
  # Reconcile every 15 minutes
  interval: 15m
  chart:
    spec:
      chart: aws-load-balancer-controller
      version: "1.7.x"
      sourceRef:
        kind: HelmRepository
        name: eks-charts
        namespace: flux-system
      # Check for new chart versions hourly
      interval: 1h
  values:
    # Cluster name is required
    clusterName: my-cluster
    # Service account configuration with IRSA
    serviceAccount:
      create: true
      name: aws-load-balancer-controller
      annotations:
        eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/AmazonEKSLoadBalancerControllerRole
    # Run two replicas for high availability
    replicaCount: 2
    # Resource requests and limits
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 200m
        memory: 256Mi
    # Enable pod disruption budget
    podDisruptionBudget:
      maxUnavailable: 1
    # Region configuration
    region: us-east-1
    # VPC ID (required for some configurations)
    vpcId: vpc-0123456789abcdef0
    # Enable WAFv2 integration
    enableWaf: true
    enableWafv2: true
    # Enable Shield integration
    enableShield: true
```

## Step 6: Create a Kustomization for the Controller

Wrap the resources in a Flux Kustomization.

```yaml
# infrastructure/aws-lb-controller/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - helm-repo-eks.yaml
  - aws-lb-controller-release.yaml
```

```yaml
# clusters/my-cluster/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: aws-lb-controller
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  path: ./infrastructure/aws-lb-controller
  prune: true
  wait: true
  timeout: 5m
```

## Step 7: Deploy an Application with ALB Ingress

Create an Ingress resource that uses the AWS Load Balancer Controller to provision an ALB.

```yaml
# app-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
  namespace: default
  annotations:
    # Use the ALB ingress class
    kubernetes.io/ingress.class: alb
    # Create an internet-facing ALB
    alb.ingress.kubernetes.io/scheme: internet-facing
    # Target type: ip for direct pod routing
    alb.ingress.kubernetes.io/target-type: ip
    # Health check configuration
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/healthcheck-interval-seconds: "30"
    # SSL configuration
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:123456789012:certificate/abc-123
    # SSL redirect
    alb.ingress.kubernetes.io/ssl-redirect: "443"
    # Security groups
    alb.ingress.kubernetes.io/security-groups: sg-0123456789abcdef0
    # WAFv2 ACL ARN
    alb.ingress.kubernetes.io/wafv2-acl-arn: arn:aws:wafv2:us-east-1:123456789012:regional/webacl/my-acl/abc-123
spec:
  ingressClassName: alb
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app-service
                port:
                  number: 80
```

## Step 8: Deploy a Service with NLB

Create a Service that provisions a Network Load Balancer.

```yaml
# app-nlb-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-nlb
  namespace: default
  annotations:
    # Use the AWS Load Balancer Controller for NLB
    service.beta.kubernetes.io/aws-load-balancer-type: external
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: ip
    # Create an internal NLB
    service.beta.kubernetes.io/aws-load-balancer-scheme: internal
    # Cross-zone load balancing
    service.beta.kubernetes.io/aws-load-balancer-attributes: load_balancing.cross_zone.enabled=true
    # Health check configuration
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-protocol: HTTP
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-path: /health
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-interval: "10"
spec:
  type: LoadBalancer
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
      protocol: TCP
```

## Step 9: Configure IngressGroup for Shared ALB

Multiple Ingress resources can share a single ALB using IngressGroup.

```yaml
# shared-alb-ingress-api.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: default
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    # Group name - all Ingresses with same group share one ALB
    alb.ingress.kubernetes.io/group.name: shared-alb
    # Order within the group (lower number = higher priority)
    alb.ingress.kubernetes.io/group.order: "10"
spec:
  ingressClassName: alb
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 80
---
# shared-alb-ingress-web.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
  namespace: default
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    # Same group name to share the ALB
    alb.ingress.kubernetes.io/group.name: shared-alb
    alb.ingress.kubernetes.io/group.order: "20"
spec:
  ingressClassName: alb
  rules:
    - host: web.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-service
                port:
                  number: 80
```

## Step 10: Verify the Deployment

Check that everything is working correctly.

```bash
# Verify the controller is running
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller

# Check the HelmRelease status
flux get helmreleases -n kube-system

# Verify the Ingress has an ALB address
kubectl get ingress -n default

# Check controller logs for errors
kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller --tail=50

# Verify the ALB was created in AWS
aws elbv2 describe-load-balancers --query 'LoadBalancers[*].[LoadBalancerName,DNSName,State.Code]' --output table
```

## Troubleshooting

```bash
# Issue: Ingress stuck without address
# Check controller logs for permission errors
kubectl logs -n kube-system deployment/aws-load-balancer-controller

# Issue: Target group shows unhealthy targets
# Verify security groups allow traffic from ALB to pods
kubectl describe ingress my-app-ingress -n default

# Issue: HelmRelease not reconciling
flux reconcile helmrelease aws-load-balancer-controller -n kube-system
```

## Conclusion

Deploying the AWS Load Balancer Controller through Flux CD HelmRelease ensures your load balancing infrastructure is managed declaratively. The controller automatically provisions ALBs and NLBs based on Ingress and Service annotations, while Flux CD keeps the controller itself up to date and properly configured through GitOps.
