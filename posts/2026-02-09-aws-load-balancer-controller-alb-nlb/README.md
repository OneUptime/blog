# How to Use AWS Load Balancer Controller for ALB and NLB on EKS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, AWS, LoadBalancer

Description: Deploy and configure AWS Load Balancer Controller to automatically provision Application Load Balancers (ALB) and Network Load Balancers (NLB) for EKS services and ingresses.

---

The AWS Load Balancer Controller manages Elastic Load Balancers for Kubernetes clusters. It provisions Application Load Balancers (ALB) for Ingress resources and Network Load Balancers (NLB) for LoadBalancer services. This integration enables advanced AWS load balancing features like target group binding, WAF integration, and certificate management directly from Kubernetes manifests. This guide covers installing and using the AWS Load Balancer Controller on EKS.

## Understanding AWS Load Balancer Controller

The controller replaces the legacy in-tree cloud provider load balancer implementation with native AWS functionality. It supports both ALB (Layer 7) for HTTP/HTTPS traffic with advanced routing, and NLB (Layer 4) for TCP/UDP traffic with high performance.

ALBs provide features like host-based and path-based routing, SSL termination, WAF integration, and cognito authentication. NLBs offer ultra-low latency, static IP addresses, and preserve source IP addresses.

## Installing AWS Load Balancer Controller

First, create an IAM policy for the controller:

```bash
# Download IAM policy
curl -o iam-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.7.0/docs/install/iam_policy.json

# Create IAM policy
aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://iam-policy.json
```

Create IAM role using IRSA:

```bash
# Create service account with IAM role
eksctl create iamserviceaccount \
  --cluster=my-cluster \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --role-name AmazonEKSLoadBalancerControllerRole \
  --attach-policy-arn=arn:aws:iam::123456789012:policy/AWSLoadBalancerControllerIAMPolicy \
  --approve
```

Install the controller using Helm:

```bash
# Add Helm repository
helm repo add eks https://aws.github.io/eks-charts
helm repo update

# Install AWS Load Balancer Controller
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=my-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set region=us-east-1 \
  --set vpcId=vpc-0abcd1234efgh5678

# Verify installation
kubectl get deployment -n kube-system aws-load-balancer-controller
kubectl logs -n kube-system deployment/aws-load-balancer-controller
```

Using Terraform:

```hcl
# alb-controller.tf
module "aws_load_balancer_controller" {
  source = "terraform-aws-modules/iam/aws//modules/iam-role-for-service-accounts-eks"

  role_name = "aws-load-balancer-controller"

  attach_load_balancer_controller_policy = true

  oidc_providers = {
    main = {
      provider_arn               = module.eks.oidc_provider_arn
      namespace_service_accounts = ["kube-system:aws-load-balancer-controller"]
    }
  }
}

resource "helm_release" "aws_load_balancer_controller" {
  name       = "aws-load-balancer-controller"
  repository = "https://aws.github.io/eks-charts"
  chart      = "aws-load-balancer-controller"
  namespace  = "kube-system"
  version    = "1.7.0"

  set {
    name  = "clusterName"
    value = module.eks.cluster_name
  }

  set {
    name  = "serviceAccount.create"
    value = "true"
  }

  set {
    name  = "serviceAccount.name"
    value = "aws-load-balancer-controller"
  }

  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = module.aws_load_balancer_controller.iam_role_arn
  }

  set {
    name  = "region"
    value = var.aws_region
  }

  set {
    name  = "vpcId"
    value = module.vpc.vpc_id
  }
}
```

## Creating ALB with Ingress

Deploy application and create ALB using Ingress:

```yaml
# alb-ingress.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  type: NodePort
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 80
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: nginx-ingress
  annotations:
    # ALB-specific annotations
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:123456789012:certificate/abc123
    alb.ingress.kubernetes.io/ssl-redirect: '443'
    alb.ingress.kubernetes.io/healthcheck-path: /health
    alb.ingress.kubernetes.io/healthcheck-interval-seconds: '15'
    alb.ingress.kubernetes.io/healthcheck-timeout-seconds: '5'
    alb.ingress.kubernetes.io/success-codes: '200'
    alb.ingress.kubernetes.io/healthy-threshold-count: '2'
    alb.ingress.kubernetes.io/unhealthy-threshold-count: '2'
spec:
  ingressClassName: alb
  rules:
  - host: example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: nginx-service
            port:
              number: 80
```

Get ALB DNS name:

```bash
kubectl apply -f alb-ingress.yaml

# Get Ingress details
kubectl get ingress nginx-ingress

# Get ALB address
kubectl get ingress nginx-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'

# Test access
curl http://$(kubectl get ingress nginx-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
```

## Advanced ALB Configuration

Configure path-based routing:

```yaml
# path-based-routing.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-path-ingress
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
spec:
  ingressClassName: alb
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /users
        pathType: Prefix
        backend:
          service:
            name: user-service
            port:
              number: 8080
      - path: /orders
        pathType: Prefix
        backend:
          service:
            name: order-service
            port:
              number: 8080
      - path: /products
        pathType: Prefix
        backend:
          service:
            name: product-service
            port:
              number: 8080
```

Configure host-based routing:

```yaml
# host-based-routing.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-host-ingress
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:123456789012:certificate/abc123
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
  - host: admin.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: admin-service
            port:
              number: 80
```

## Creating NLB with LoadBalancer Service

Deploy NLB using Service:

```yaml
# nlb-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: tcp-service
  annotations:
    # NLB-specific annotations
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
    service.beta.kubernetes.io/aws-load-balancer-backend-protocol: "tcp"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-healthy-threshold: "2"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-unhealthy-threshold: "2"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-interval: "10"
    service.beta.kubernetes.io/aws-load-balancer-target-group-attributes: deregistration_delay.timeout_seconds=30
spec:
  type: LoadBalancer
  selector:
    app: tcp-app
  ports:
  - name: tcp
    port: 3306
    targetPort: 3306
    protocol: TCP
```

NLB with TLS termination:

```yaml
# nlb-tls.yaml
apiVersion: v1
kind: Service
metadata:
  name: tls-service
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-ssl-cert: arn:aws:acm:us-east-1:123456789012:certificate/abc123
    service.beta.kubernetes.io/aws-load-balancer-ssl-ports: "443"
    service.beta.kubernetes.io/aws-load-balancer-backend-protocol: "tcp"
spec:
  type: LoadBalancer
  selector:
    app: secure-app
  ports:
  - name: https
    port: 443
    targetPort: 8443
    protocol: TCP
```

## WAF Integration with ALB

Enable WAF on ALB:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: waf-protected-ingress
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/wafv2-acl-arn: arn:aws:wafv2:us-east-1:123456789012:regional/webacl/my-webacl/abc123
    alb.ingress.kubernetes.io/shield-advanced-protection: "true"
spec:
  ingressClassName: alb
  rules:
  - http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: protected-service
            port:
              number: 80
```

## Cognito Authentication

Add Cognito authentication to ALB:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: cognito-ingress
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/auth-type: cognito
    alb.ingress.kubernetes.io/auth-idp-cognito: '{"UserPoolArn":"arn:aws:cognito-idp:us-east-1:123456789012:userpool/us-east-1_ABC123","UserPoolClientId":"abc123def456","UserPoolDomain":"my-domain.auth.us-east-1.amazoncognito.com"}'
    alb.ingress.kubernetes.io/auth-scope: 'email openid'
    alb.ingress.kubernetes.io/auth-session-cookie: AWSELBAuthSessionCookie
    alb.ingress.kubernetes.io/auth-session-timeout: '3600'
spec:
  ingressClassName: alb
  rules:
  - http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: protected-app
            port:
              number: 80
```

## Internal Load Balancers

Create internal ALB:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: internal-ingress
  annotations:
    alb.ingress.kubernetes.io/scheme: internal
    alb.ingress.kubernetes.io/subnets: subnet-abc123,subnet-def456
    alb.ingress.kubernetes.io/security-groups: sg-0123456789abcdef0
spec:
  ingressClassName: alb
  rules:
  - http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: internal-service
            port:
              number: 80
```

Create internal NLB:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: internal-nlb
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internal"
    service.beta.kubernetes.io/aws-load-balancer-subnets: subnet-abc123,subnet-def456
spec:
  type: LoadBalancer
  selector:
    app: internal-app
  ports:
  - port: 5432
    targetPort: 5432
```

## Target Group Bindings

Directly bind to target groups:

```yaml
# target-group-binding.yaml
apiVersion: elbv2.k8s.aws/v1beta1
kind: TargetGroupBinding
metadata:
  name: my-tgb
spec:
  serviceRef:
    name: my-service
    port: 80
  targetGroupARN: arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/my-tg/abc123
  targetType: ip
```

## Monitoring and Troubleshooting

Check controller logs:

```bash
# View controller logs
kubectl logs -n kube-system deployment/aws-load-balancer-controller

# Check Ingress events
kubectl describe ingress <ingress-name>

# View Service events
kubectl describe svc <service-name>

# Check ALB in AWS
aws elbv2 describe-load-balancers --query 'LoadBalancers[?contains(LoadBalancerName, `k8s`)].{Name:LoadBalancerName,DNS:DNSName,State:State.Code}'

# Check target groups
aws elbv2 describe-target-groups --query 'TargetGroups[?contains(TargetGroupName, `k8s`)].{Name:TargetGroupName,Port:Port,Health:HealthCheckProtocol}'

# Check target health
aws elbv2 describe-target-health --target-group-arn <arn>
```

## Best Practices

1. Use internal load balancers for internal services
2. Enable cross-zone load balancing for better distribution
3. Configure appropriate health check settings
4. Use ACM certificates for SSL/TLS
5. Implement WAF for internet-facing ALBs
6. Tag load balancers for cost allocation
7. Use target type IP for better pod scaling
8. Configure appropriate deregistration delay
9. Monitor load balancer metrics in CloudWatch
10. Use IngressClass for multi-controller environments

## Conclusion

The AWS Load Balancer Controller seamlessly integrates Kubernetes with AWS load balancing services. Use ALBs for advanced HTTP/HTTPS routing with features like WAF, Cognito authentication, and path-based routing. Deploy NLBs for high-performance TCP/UDP load balancing with static IPs and source IP preservation. Configure load balancers declaratively through Kubernetes manifests while leveraging native AWS features for security, monitoring, and cost optimization.
