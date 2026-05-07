# How to Configure AWS ALB Ingress Controller for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, AWS, ALB, Kubernetes, Ingress, EKS, Dual-Stack

Description: Configure the AWS Load Balancer Controller (formerly ALB Ingress Controller) to create IPv6-capable Application Load Balancers for Kubernetes services in EKS with dual-stack or IPv6-only...

## Introduction

The AWS Load Balancer Controller provisions Application Load Balancers (ALBs) and Network Load Balancers (NLBs) for Kubernetes Ingress and Service resources on EKS. For IPv6, the controller creates dual-stack or public-IPv6-only ALBs using the `dualstack` or `dualstack-without-public-ipv4` IP address type. This requires the VPC and subnets to be IPv6-enabled, and the EKS cluster to be created with the `IPv6` IP family. Amazon EKS doesn't support dual-stacked Pods or Services, so the load balancer must target `IPv6` Pods in `ip` mode.

## Prerequisites: EKS Cluster with IPv6

```bash
# Create an EKS cluster with the IPv6 IP family
cat >ipv6-cluster.yaml <<'EOF'
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig

metadata:
  name: my-cluster
  region: us-east-1
  version: "1.28"

kubernetesNetworkConfig:
  ipFamily: IPv6

addons:
  - name: vpc-cni
    version: latest
  - name: coredns
    version: latest
  - name: kube-proxy
    version: latest

iam:
  withOIDC: true

managedNodeGroups:
  - name: my-nodegroup
    instanceType: m5.large
    desiredCapacity: 3
EOF

eksctl create cluster -f ipv6-cluster.yaml

# Verify Pods and Services use IPv6 addresses
kubectl get pods -n kube-system -o wide
kubectl get services -n kube-system -o wide

# Install AWS Load Balancer Controller with IRSA
curl -o iam-policy.json \
    https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v3.3.0/docs/install/iam_policy.json

aws iam create-policy \
    --policy-name AWSLoadBalancerControllerIAMPolicy \
    --policy-document file://iam-policy.json

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

eksctl create iamserviceaccount \
    --cluster=my-cluster \
    --namespace=kube-system \
    --name=aws-load-balancer-controller \
    --attach-policy-arn=arn:aws:iam::${ACCOUNT_ID}:policy/AWSLoadBalancerControllerIAMPolicy \
    --override-existing-serviceaccounts \
    --region us-east-1 \
    --approve

# Use AWS Load Balancer Controller v2.3.1 or later for IPv6 Pod support
helm repo add eks https://aws.github.io/eks-charts
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
    -n kube-system \
    --set clusterName=my-cluster \
    --set serviceAccount.create=false \
    --set serviceAccount.name=aws-load-balancer-controller
```

## ALB Ingress with IPv6 (Dual-Stack)

```yaml
# ingress-alb-ipv6.yaml

apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
  namespace: production
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing

    # IPv6 configuration: create dual-stack ALB
    alb.ingress.kubernetes.io/ip-address-type: dualstack
    # Or IPv6-only (no public IPv4):
    # alb.ingress.kubernetes.io/ip-address-type: dualstack-without-public-ipv4

    # Subnets that support IPv6 (must have IPv6 CIDR assigned in VPC)
    alb.ingress.kubernetes.io/subnets: subnet-xxxx,subnet-yyyy

    # TLS configuration
    alb.ingress.kubernetes.io/certificate-arn: "arn:aws:acm:us-east-1:123456789:certificate/xxxxx"
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: '443'

    # Health check
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/healthcheck-interval-seconds: '15'

    # Security group (must allow IPv6 from internet)
    alb.ingress.kubernetes.io/security-groups: sg-xxxx

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
                name: myapp
                port:
                  number: 8080
```

## ALB Target Group Configuration for IPv6

```yaml
# The AWS Load Balancer Controller creates target groups that register
# Pod IPs. In Amazon EKS IPv6 clusters, Pods have IPv6 addresses.

# Configure target type (IP mode is required for IPv6 Pods on EKS)
metadata:
  annotations:
    alb.ingress.kubernetes.io/target-type: ip
    # Instance mode is not supported for routing to IPv6 Pods on EKS

    # Target group protocol
    alb.ingress.kubernetes.io/backend-protocol: HTTP
    alb.ingress.kubernetes.io/backend-protocol-version: HTTP1
```

## Service Annotation for IPv6 NLB

```yaml
# service-nlb-ipv6.yaml - NLB with dual-stack frontend and IPv6 Pod targets

apiVersion: v1
kind: Service
metadata:
  name: myapp-nlb
  namespace: production
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "external"
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "ip"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
    # IPv6: dual-stack NLB
    service.beta.kubernetes.io/aws-load-balancer-ip-address-type: "dualstack"
    service.beta.kubernetes.io/aws-load-balancer-subnets: "subnet-xxxx,subnet-yyyy"
spec:
  type: LoadBalancer
  # Amazon EKS IPv6 clusters use single-stack IPv6 Services
  ipFamilyPolicy: SingleStack
  ipFamilies:
    - IPv6
  selector:
    app: myapp
  ports:
    - name: http
      port: 80
      targetPort: 8080
    - name: https
      port: 443
      targetPort: 8443
```

## VPC and Subnet Requirements for IPv6 ALB

```bash
# Check if VPC has IPv6 CIDR
aws ec2 describe-vpcs --vpc-ids vpc-xxxx \
    --query 'Vpcs[].Ipv6CidrBlockAssociationSet'

# Check if subnets have IPv6 CIDRs
aws ec2 describe-subnets --subnet-ids subnet-xxxx \
    --query 'Subnets[].{SubnetId:SubnetId,Ipv6CidrBlock:Ipv6CidrBlockAssociationSet}'

# Assign IPv6 CIDR to VPC (if not already assigned)
aws ec2 associate-vpc-cidr-block \
    --vpc-id vpc-xxxx \
    --amazon-provided-ipv6-cidr-block

# Assign IPv6 CIDR to subnet
SUBNET_IPV6_CIDR="2600:1f18:xxxx:yyyy::/64"   # From VPC's /56
aws ec2 associate-subnet-cidr-block \
    --subnet-id subnet-xxxx \
    --ipv6-cidr-block "$SUBNET_IPV6_CIDR"
```

## Security Group for IPv6 ALB

```bash
# Create security group rules for IPv6 ALB traffic

# Allow IPv6 HTTP from internet
aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxx \
    --ip-permissions \
    '[{"IpProtocol":"tcp","FromPort":80,"ToPort":80,"Ipv6Ranges":[{"CidrIpv6":"::/0"}]}]'

# Allow IPv6 HTTPS from internet
aws ec2 authorize-security-group-ingress \
    --group-id sg-xxxx \
    --ip-permissions \
    '[{"IpProtocol":"tcp","FromPort":443,"ToPort":443,"Ipv6Ranges":[{"CidrIpv6":"::/0"}]}]'

# Check security group has IPv6 rules
aws ec2 describe-security-groups --group-ids sg-xxxx \
    --query 'SecurityGroups[].IpPermissions[].Ipv6Ranges'
```

## Verify ALB IPv6 Operation

```bash
# Check the Ingress has an ALB hostname
kubectl describe ingress myapp -n production | grep -E "LoadBalancer|Address"

# Get ALB DNS name
ALB_DNS=$(kubectl get ingress myapp -n production -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Resolve ALB DNS to IPv6
nslookup -q=AAAA "$ALB_DNS"
# Should return IPv6 address from AWS

# Test IPv6 access
curl -6 -H "Host: app.example.com" "http://$ALB_DNS/"

# Check AWS ALB target groups have IPv6 pod IPs registered
aws elbv2 describe-target-health \
    --target-group-arn "arn:aws:elasticloadbalancing:us-east-1:xxx:targetgroup/xxx" \
    --query 'TargetHealthDescriptions[].Target'
# Should show pod IPv6 addresses

# Check ALB IP address type in AWS
aws elbv2 describe-load-balancers \
    --load-balancer-arns "arn:aws:elasticloadbalancing:us-east-1:xxx:loadbalancer/app/myapp/xxx" \
    --query 'LoadBalancers[].{DNSName:DNSName,IpAddressType:IpAddressType,Scheme:Scheme}'
```

## Conclusion

The AWS Load Balancer Controller creates dual-stack ALBs for Kubernetes Ingress resources when annotated with `alb.ingress.kubernetes.io/ip-address-type: dualstack`. This requires VPC subnets with IPv6 CIDR blocks, IPv6 routing, and security group rules allowing IPv6 traffic. In Amazon EKS clusters created with the `IPv6` IP family, the controller registers Pod IPv6 addresses in target groups when you use `ip` mode, enabling ALB to forward traffic directly to Pods over IPv6. The `dualstack-without-public-ipv4` option creates a public ALB that exposes only public IPv6 addresses, reducing public IPv4 usage and simplifying IPv6-first ingress. On Amazon EKS, keep the Kubernetes Service single-stack `IPv6` even when the external ALB or NLB frontend is dual-stack.
