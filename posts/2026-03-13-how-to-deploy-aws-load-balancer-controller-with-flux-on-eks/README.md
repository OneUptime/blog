# How to Deploy AWS Load Balancer Controller with Flux on EKS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, AWS, EKS, Load Balancer Controller, ALB, NLB, Helm

Description: Learn how to deploy the AWS Load Balancer Controller on EKS using Flux, enabling automatic provisioning of ALBs and NLBs for Kubernetes services and ingresses.

---

## What is the AWS Load Balancer Controller

The AWS Load Balancer Controller is a Kubernetes controller that manages AWS Elastic Load Balancers (ALBs and NLBs) for Kubernetes services and ingresses. It replaces the legacy in-tree AWS cloud provider load balancer and provides advanced features like target group binding, IP-mode targets, and WAF integration.

## Prerequisites

- An EKS cluster with the OIDC provider enabled
- Flux installed on the EKS cluster
- IAM permissions to create load balancers, target groups, and security groups
- VPC subnets tagged for load balancer auto-discovery

## Repository Structure

```
flux-repo/
├── clusters/
│   └── production/
│       ├── infrastructure.yaml
│       └── apps.yaml
└── infrastructure/
    └── aws-lb-controller/
        ├── kustomization.yaml
        ├── namespace.yaml
        ├── helmrepository.yaml
        ├── helmrelease.yaml
        └── service-account.yaml
```

## Step 1: Create the IAM Policy

Download and create the IAM policy for the Load Balancer Controller:

```bash
# Download the official IAM policy
curl -o iam-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/install/iam_policy.json

# Create the policy
aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://iam-policy.json
```

## Step 2: Create the IAM Role with IRSA

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
OIDC_PROVIDER=$(aws eks describe-cluster --name my-cluster \
  --query "cluster.identity.oidc.issuer" --output text | sed 's|https://||')

cat > trust-policy.json << EOF
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

aws iam create-role \
  --role-name AmazonEKSLoadBalancerControllerRole \
  --assume-role-policy-document file://trust-policy.json

aws iam attach-role-policy \
  --role-name AmazonEKSLoadBalancerControllerRole \
  --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/AWSLoadBalancerControllerIAMPolicy"
```

## Step 3: Define Flux Resources

Create the Helm repository source:

```yaml
# infrastructure/aws-lb-controller/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: eks-charts
  namespace: flux-system
spec:
  interval: 24h
  url: https://aws.github.io/eks-charts
```

Create the service account with the IRSA annotation:

```yaml
# infrastructure/aws-lb-controller/service-account.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: aws-load-balancer-controller
  namespace: kube-system
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/AmazonEKSLoadBalancerControllerRole
```

Create the HelmRelease:

```yaml
# infrastructure/aws-lb-controller/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: aws-load-balancer-controller
  namespace: kube-system
spec:
  interval: 1h
  chart:
    spec:
      chart: aws-load-balancer-controller
      version: "1.7.x"
      sourceRef:
        kind: HelmRepository
        name: eks-charts
        namespace: flux-system
  install:
    crds: CreateReplace
    remediation:
      retries: 3
  upgrade:
    crds: CreateReplace
    remediation:
      retries: 3
  values:
    clusterName: my-cluster
    region: us-east-1
    vpcId: vpc-0123456789abcdef0
    serviceAccount:
      create: false
      name: aws-load-balancer-controller
    replicaCount: 2
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 200m
        memory: 256Mi
    enableServiceMutatorWebhook: false
```

Create the Kustomization:

```yaml
# infrastructure/aws-lb-controller/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - helmrepository.yaml
  - service-account.yaml
  - helmrelease.yaml
```

## Step 4: Configure the Flux Kustomization

```yaml
# clusters/production/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 1h
  retryInterval: 1m
  timeout: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/aws-lb-controller
  prune: true
  wait: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: aws-load-balancer-controller
      namespace: kube-system
```

## Step 5: Tag VPC Subnets

Ensure your VPC subnets are tagged for load balancer auto-discovery:

```bash
# For public subnets (internet-facing ALBs)
aws ec2 create-tags \
  --resources subnet-public-1 subnet-public-2 \
  --tags Key=kubernetes.io/role/elb,Value=1

# For private subnets (internal ALBs/NLBs)
aws ec2 create-tags \
  --resources subnet-private-1 subnet-private-2 \
  --tags Key=kubernetes.io/role/internal-elb,Value=1

# Cluster tag for all subnets
aws ec2 create-tags \
  --resources subnet-public-1 subnet-public-2 subnet-private-1 subnet-private-2 \
  --tags Key=kubernetes.io/cluster/my-cluster,Value=shared
```

## Step 6: Deploy Applications with ALB Ingress

Once the controller is running, create Ingress resources that provision ALBs:

```yaml
# apps/production/web-app/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-app
  namespace: default
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:123456789012:certificate/cert-id
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/wafv2-acl-arn: arn:aws:wafv2:us-east-1:123456789012:regional/webacl/my-waf/id
spec:
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-app
                port:
                  number: 80
```

For NLB services:

```yaml
# apps/production/web-app/service-nlb.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-app-nlb
  namespace: default
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: external
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: ip
    service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
spec:
  type: LoadBalancer
  selector:
    app: web-app
  ports:
    - port: 443
      targetPort: 8080
      protocol: TCP
```

## Verifying the Deployment

```bash
# Check controller pods
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller

# Check controller logs
kubectl logs -n kube-system deployment/aws-load-balancer-controller

# Verify Flux HelmRelease status
flux get helmreleases -n kube-system

# Check provisioned load balancers
kubectl get ingress --all-namespaces
aws elbv2 describe-load-balancers --query 'LoadBalancers[].DNSName'
```

## Conclusion

Deploying the AWS Load Balancer Controller with Flux on EKS provides a GitOps-managed approach to ALB and NLB provisioning. By using IRSA for authentication and Flux HelmRelease for deployment, you get a secure, version-controlled, and automatically reconciled load balancer controller. The controller integrates with AWS services like ACM, WAF, and Shield, providing enterprise-grade load balancing for your Kubernetes workloads.
