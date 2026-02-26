# How to Expose ArgoCD with AWS ALB Ingress Controller

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, AWS, Ingress

Description: Complete guide to exposing ArgoCD through AWS Application Load Balancer Ingress Controller on EKS with HTTPS, gRPC, and WAF integration.

---

If you are running ArgoCD on Amazon EKS, the AWS Load Balancer Controller (formerly ALB Ingress Controller) is the natural choice for exposing your ArgoCD server. It provisions an Application Load Balancer that integrates with AWS Certificate Manager, WAF, and security groups. This guide covers the full setup from controller installation to production-ready configuration.

## Why AWS ALB for ArgoCD

The AWS Load Balancer Controller creates native AWS Application Load Balancers for your Kubernetes Ingress resources. Compared to using an in-cluster Nginx Ingress, ALB gives you:

- Native AWS Certificate Manager integration for free TLS certificates
- AWS WAF integration for web application firewall protection
- Access logging to S3 for audit trails
- Target group health checks managed by AWS
- Integration with AWS Shield for DDoS protection

The trade-off is that ALB has specific requirements for gRPC and HTTP/2 that need careful configuration.

## Prerequisites

- An EKS cluster with ArgoCD installed
- AWS Load Balancer Controller installed on the cluster
- An ACM certificate for your domain
- A Route53 hosted zone (or other DNS) for your domain

Install the AWS Load Balancer Controller if you have not already:

```bash
# Add the EKS Helm chart repo
helm repo add eks https://aws.github.io/eks-charts
helm repo update

# Install the AWS Load Balancer Controller
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  --namespace kube-system \
  --set clusterName=your-cluster-name \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

Make sure the controller's service account has the required IAM permissions. AWS provides an IAM policy document in their documentation.

## Configuring ArgoCD for ALB

First, configure ArgoCD server to run in insecure mode. ALB will handle TLS termination:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  server.insecure: "true"
```

```bash
kubectl apply -f argocd-cmd-params-cm.yaml
kubectl rollout restart deployment argocd-server -n argocd
```

## Creating the ALB Ingress

Create an Ingress resource with ALB-specific annotations:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: argocd
  annotations:
    # Use ALB ingress class
    alb.ingress.kubernetes.io/scheme: internet-facing
    # Or use "internal" for private access only:
    # alb.ingress.kubernetes.io/scheme: internal

    # Target type - use IP mode for direct pod routing
    alb.ingress.kubernetes.io/target-type: ip

    # TLS certificate from ACM
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:123456789:certificate/your-cert-id

    # Listen on HTTPS
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS": 443}]'

    # Redirect HTTP to HTTPS
    alb.ingress.kubernetes.io/ssl-redirect: "443"

    # Health check configuration
    alb.ingress.kubernetes.io/healthcheck-path: /healthz
    alb.ingress.kubernetes.io/healthcheck-protocol: HTTP

    # Backend protocol
    alb.ingress.kubernetes.io/backend-protocol: HTTP

    # Success codes for health check
    alb.ingress.kubernetes.io/success-codes: "200"

    # Group multiple ingresses into one ALB (saves cost)
    alb.ingress.kubernetes.io/group.name: argocd
spec:
  ingressClassName: alb
  rules:
    - host: argocd.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 80
```

## Handling gRPC for the ArgoCD CLI

ALB supports gRPC natively. To make the ArgoCD CLI work through ALB, you need a separate target group with gRPC protocol. Create a second ingress in the same group:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-grpc-ingress
  namespace: argocd
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:123456789:certificate/your-cert-id
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS": 443}]'
    # Use gRPC backend protocol
    alb.ingress.kubernetes.io/backend-protocol-version: GRPC
    alb.ingress.kubernetes.io/healthcheck-protocol: HTTP
    alb.ingress.kubernetes.io/healthcheck-path: /healthz
    # Same ALB group as the HTTP ingress
    alb.ingress.kubernetes.io/group.name: argocd
    # Higher priority number means lower precedence
    alb.ingress.kubernetes.io/group.order: "1"
spec:
  ingressClassName: alb
  rules:
    - host: grpc.argocd.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 443
```

Then configure the CLI:

```bash
# Use the gRPC hostname for CLI access
argocd login grpc.argocd.example.com

# Or use the main hostname with grpc-web
argocd login argocd.example.com --grpc-web
```

## Adding Security with WAF

Protect your ArgoCD instance with AWS WAF:

```yaml
annotations:
  # Associate a WAF WebACL with the ALB
  alb.ingress.kubernetes.io/wafv2-acl-arn: arn:aws:wafv2:us-east-1:123456789:regional/webacl/argocd-waf/your-acl-id
```

Create a basic WAF rule to block common attacks:

```bash
# Create a WAF WebACL with managed rule groups
aws wafv2 create-web-acl \
  --name argocd-waf \
  --scope REGIONAL \
  --default-action Allow={} \
  --rules file://waf-rules.json \
  --visibility-config SampledRequestsEnabled=true,CloudWatchMetricsEnabled=true,MetricName=argocd-waf
```

## Access Logging

Enable ALB access logs for audit compliance:

```yaml
annotations:
  # Enable access logging to S3
  alb.ingress.kubernetes.io/load-balancer-attributes: >-
    access_logs.s3.enabled=true,
    access_logs.s3.bucket=my-alb-logs-bucket,
    access_logs.s3.prefix=argocd
```

## Security Groups

Control which IPs can reach your ArgoCD instance:

```yaml
annotations:
  # Restrict to specific security groups
  alb.ingress.kubernetes.io/security-groups: sg-xxxxxxxxxxxx
  # Or use CIDR-based inbound rules
  alb.ingress.kubernetes.io/inbound-cidrs: "10.0.0.0/8,172.16.0.0/12"
```

## DNS Configuration with Route53

After the ALB is created, set up DNS:

```bash
# Get the ALB DNS name
kubectl get ingress -n argocd argocd-server-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'

# Create a Route53 alias record pointing to the ALB
aws route53 change-resource-record-sets \
  --hosted-zone-id YOUR_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "argocd.example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "ALB_HOSTED_ZONE_ID",
          "DNSName": "your-alb-dns-name",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

Or use ExternalDNS to automatically manage Route53 records:

```yaml
annotations:
  external-dns.alpha.kubernetes.io/hostname: argocd.example.com
```

## Verifying the Setup

```bash
# Check the Ingress and wait for ALB provisioning (takes 2 to 3 minutes)
kubectl get ingress -n argocd -w

# Verify ALB target health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789:targetgroup/xxx

# Test the UI
curl -I https://argocd.example.com

# Test CLI access
argocd login argocd.example.com --grpc-web
```

## Troubleshooting

**ALB Not Created**: Check the AWS Load Balancer Controller logs. Common issues are missing IAM permissions or subnet tags.

**Unhealthy Targets**: Verify that ArgoCD server pods are running and the health check path `/healthz` returns 200.

**Timeout Errors**: ALB has a default idle timeout of 60 seconds. For large sync operations, increase it:

```yaml
annotations:
  alb.ingress.kubernetes.io/load-balancer-attributes: idle_timeout.timeout_seconds=300
```

For related guides, check out [installing ArgoCD on EKS](https://oneuptime.com/blog/post/2026-02-12-set-up-argocd-for-gitops-on-eks/view) and [configuring ArgoCD High Availability](https://oneuptime.com/blog/post/2026-02-02-argocd-high-availability/view).
