# How to Set Up AWS ALB Ingress on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, AWS, ALB, Ingresses, Kubernetes, Load Balancer

Description: Complete guide to deploying the AWS Load Balancer Controller on Talos Linux for Application Load Balancer ingress support.

---

When you run Kubernetes on AWS, exposing your services to the internet usually means creating load balancers. The AWS Load Balancer Controller, formerly known as the ALB Ingress Controller, lets you use AWS Application Load Balancers and Network Load Balancers directly from your Kubernetes Ingress resources. If you are running Talos Linux on AWS, this integration gives you path-based routing, TLS termination, and WAF integration without managing your own reverse proxy. Here is how to set it all up.

## What the AWS Load Balancer Controller Does

The controller watches for Ingress resources and Service resources in your cluster. When you create an Ingress with the right annotation, it provisions an Application Load Balancer in AWS. When you create a Service of type LoadBalancer with specific annotations, it provisions a Network Load Balancer. All of this happens automatically through the AWS API.

ALBs give you layer 7 features: host-based routing, path-based routing, redirects, fixed responses, and authentication through Cognito or OIDC. NLBs give you layer 4 performance with static IPs and ultra-low latency.

## Prerequisites

Before you start, you need:

- A running Talos Linux cluster on AWS with the external cloud provider enabled
- Subnets tagged for auto-discovery
- `kubectl`, `talosctl`, and Helm installed
- IAM permissions to create policies and roles

Your public subnets need the tag `kubernetes.io/role/elb=1` and your private subnets need `kubernetes.io/role/internal-elb=1`. The controller uses these tags to decide where to place load balancers.

## Creating the IAM Policy

The controller needs broad permissions to manage ALBs, target groups, listeners, and related resources. Download the official policy document:

```bash
# Download the recommended IAM policy for the AWS Load Balancer Controller
curl -o alb-iam-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/install/iam_policy.json

# Create the policy in AWS
aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://alb-iam-policy.json
```

This policy includes permissions for EC2, Elastic Load Balancing, IAM, Cognito, ACM, WAF, and Shield. It is comprehensive because the controller can manage many types of resources.

## Attaching the Policy

The simplest approach is to attach the policy to your worker node IAM role:

```bash
# Attach the policy to the worker node role
aws iam attach-role-policy \
  --role-name talos-worker-role \
  --policy-arn arn:aws:iam::123456789012:policy/AWSLoadBalancerControllerIAMPolicy
```

For production, you should use IRSA (IAM Roles for Service Accounts) to limit the permissions to just the controller pods. This requires an OIDC provider for your cluster.

## Installing the Controller with Helm

First, install the TargetGroupBinding CRDs, then deploy the controller:

```bash
# Add the EKS Helm chart repository
helm repo add eks https://aws.github.io/eks-charts
helm repo update

# Install the CRDs
kubectl apply -k "github.com/aws/eks-charts/stable/aws-load-balancer-controller//crds?ref=master"

# Install the controller
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  --namespace kube-system \
  --set clusterName=my-cluster \
  --set serviceAccount.create=true \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set region=us-east-1 \
  --set vpcId=vpc-xxxxxxxx
```

Notice that you must specify your cluster name, region, and VPC ID. The controller needs these to correctly discover and manage resources.

## Verifying the Installation

Check that the controller is running:

```bash
# Verify controller pods are running
kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller

# Check controller logs for errors
kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller
```

You should see two replicas running (the default for high availability). The logs should show successful startup without any permission errors.

## Creating Your First ALB Ingress

Now create a sample application and expose it through an ALB:

```yaml
# sample-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sample-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: sample
  template:
    metadata:
      labels:
        app: sample
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
  name: sample-service
spec:
  type: NodePort
  selector:
    app: sample
  ports:
    - port: 80
      targetPort: 80
```

```yaml
# sample-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: sample-ingress
  annotations:
    # Tell Kubernetes to use the AWS ALB ingress class
    kubernetes.io/ingress.class: alb
    # Use internet-facing scheme for public access
    alb.ingress.kubernetes.io/scheme: internet-facing
    # Route traffic to targets using IP mode
    alb.ingress.kubernetes.io/target-type: ip
    # Listen on HTTPS port 443
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS": 443}]'
    # Specify the ACM certificate ARN for TLS
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:123456789012:certificate/xxxxx
spec:
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: sample-service
                port:
                  number: 80
```

```bash
# Deploy the application and ingress
kubectl apply -f sample-app.yaml
kubectl apply -f sample-ingress.yaml

# Watch for the ALB to be provisioned
kubectl get ingress sample-ingress --watch
```

After a couple of minutes, the ADDRESS field should populate with the ALB DNS name.

## Advanced Configuration

The controller supports many annotations for fine-tuning ALB behavior. Here are some commonly used ones:

```yaml
annotations:
  # Enable WAF integration
  alb.ingress.kubernetes.io/wafv2-acl-arn: arn:aws:wafv2:...

  # Set idle timeout to 120 seconds
  alb.ingress.kubernetes.io/load-balancer-attributes: idle_timeout.timeout_seconds=120

  # Enable access logging to S3
  alb.ingress.kubernetes.io/load-balancer-attributes: >-
    access_logs.s3.enabled=true,
    access_logs.s3.bucket=my-alb-logs,
    access_logs.s3.prefix=my-cluster

  # Add health check configuration
  alb.ingress.kubernetes.io/healthcheck-path: /healthz
  alb.ingress.kubernetes.io/healthcheck-interval-seconds: "15"
  alb.ingress.kubernetes.io/healthcheck-timeout-seconds: "5"

  # Redirect HTTP to HTTPS
  alb.ingress.kubernetes.io/ssl-redirect: "443"
```

## Path-Based Routing

One of the big advantages of ALBs is path-based routing. You can route different URL paths to different services:

```yaml
spec:
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 8080
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 3000
```

## Troubleshooting

If the ALB is not being created, start by checking the controller logs. Common issues include missing subnet tags, insufficient IAM permissions, and hitting AWS service limits.

```bash
# Check for events on the ingress resource
kubectl describe ingress sample-ingress

# Check controller logs
kubectl logs -n kube-system deployment/aws-load-balancer-controller
```

Make sure your subnets have at least 8 free IP addresses. ALBs require a minimum number of IPs in each subnet to function. Also verify that the security groups allow traffic on the ports your ALB needs.

## Conclusion

The AWS Load Balancer Controller on Talos Linux gives you production-grade ingress without running your own reverse proxy infrastructure. You get native ALB features like path-based routing, TLS termination with ACM certificates, WAF integration, and access logging, all managed through standard Kubernetes Ingress resources. The setup is straightforward once your IAM policies and subnet tags are in place.
