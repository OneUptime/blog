# How to Configure ArgoCD Behind AWS Application Load Balancer

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, AWS, Networking

Description: Step-by-step guide to deploying ArgoCD behind an AWS Application Load Balancer with proper TLS termination and gRPC support.

---

Running ArgoCD behind an AWS Application Load Balancer (ALB) is a common setup for teams using EKS, but it comes with a few configuration challenges that trip people up. The main issues are TLS termination, gRPC routing, and getting the ArgoCD server to run in the right mode. This guide walks through the entire setup.

## Why ALB Instead of NLB or Classic Load Balancer

The AWS ALB operates at Layer 7 (HTTP/HTTPS) and integrates with the AWS Load Balancer Controller for Kubernetes. It supports path-based routing, host-based routing, and can terminate TLS using ACM certificates. For ArgoCD, this means you can handle HTTPS at the load balancer level and route traffic to the ArgoCD server over HTTP internally.

The main consideration with ALB is that ArgoCD uses both HTTPS (for the web UI and REST API) and gRPC (for the CLI). ALB supports gRPC natively as of late 2020, which makes this setup fully workable.

## Prerequisites

Before starting, make sure you have:

- An EKS cluster with ArgoCD installed
- The AWS Load Balancer Controller deployed in your cluster
- An ACM certificate for your ArgoCD domain
- A Route53 hosted zone (or equivalent DNS management)

If you do not have the AWS Load Balancer Controller installed yet, deploy it using Helm.

```bash
# Add the EKS Helm repo
helm repo add eks https://aws.github.io/eks-charts
helm repo update

# Install the AWS Load Balancer Controller
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=my-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

## Step 1: Configure ArgoCD Server for Insecure Mode

When TLS terminates at the ALB, the ArgoCD server does not need to handle TLS itself. You need to run it in insecure mode so it listens on plain HTTP.

```yaml
# argocd-cmd-params-cm ConfigMap patch
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Run the server without TLS
  server.insecure: "true"
```

Apply this and restart the ArgoCD server.

```bash
kubectl apply -f argocd-cmd-params-cm.yaml
kubectl -n argocd rollout restart deployment argocd-server
```

## Step 2: Create the Ingress Resource

The Ingress resource tells the AWS Load Balancer Controller to create an ALB and configure it for your ArgoCD instance.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: argocd
  annotations:
    # Use the ALB ingress class
    kubernetes.io/ingress.class: alb
    # Internet-facing ALB (use "internal" for private)
    alb.ingress.kubernetes.io/scheme: internet-facing
    # Target type - use IP for direct pod routing
    alb.ingress.kubernetes.io/target-type: ip
    # HTTPS listener on port 443
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
    # ACM certificate ARN for TLS
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:123456789012:certificate/abc-123-def
    # Backend protocol - HTTP since ArgoCD runs in insecure mode
    alb.ingress.kubernetes.io/backend-protocol: HTTP
    # Health check configuration
    alb.ingress.kubernetes.io/healthcheck-path: /healthz
    alb.ingress.kubernetes.io/healthcheck-protocol: HTTP
    # Enable gRPC support for the ArgoCD CLI
    alb.ingress.kubernetes.io/backend-protocol-version: HTTP2
    # Redirect HTTP to HTTPS
    alb.ingress.kubernetes.io/ssl-redirect: "443"
spec:
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

Apply the Ingress.

```bash
kubectl apply -f argocd-ingress.yaml
```

## Step 3: Handle gRPC Traffic for the CLI

The ArgoCD CLI communicates over gRPC, which uses HTTP/2. There are two approaches to handle this with ALB.

**Approach A: Single ALB with gRPC-Web**

The simplest approach uses the `--grpc-web` flag in the CLI. This wraps gRPC calls in standard HTTP requests that the ALB can handle without special configuration.

```bash
# Log in using grpc-web (works through ALB without special config)
argocd login argocd.example.com --grpc-web
```

**Approach B: Separate gRPC Target Group**

For teams that want native gRPC support without the `--grpc-web` flag, you can create a separate Ingress rule with gRPC-specific settings.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-grpc-ingress
  namespace: argocd
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:123456789012:certificate/abc-123-def
    # Use GRPC backend protocol for native gRPC
    alb.ingress.kubernetes.io/backend-protocol-version: GRPC
    alb.ingress.kubernetes.io/backend-protocol: HTTP
    alb.ingress.kubernetes.io/healthcheck-path: /healthz
    alb.ingress.kubernetes.io/healthcheck-protocol: HTTP
    # Group this with the main ingress on the same ALB
    alb.ingress.kubernetes.io/group.name: argocd
    alb.ingress.kubernetes.io/group.order: "200"
spec:
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
                  number: 80
```

With this approach, the CLI connects to `grpc.argocd.example.com` and the web UI uses `argocd.example.com`.

## Step 4: Configure DNS

Once the ALB is created, point your domain to it. If you are using Route53, create an alias record.

```bash
# Get the ALB DNS name
kubectl -n argocd get ingress argocd-server-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

Create a Route53 alias record pointing `argocd.example.com` to the ALB DNS name. If you are using ExternalDNS, add the annotation to your Ingress.

```yaml
# Add to Ingress annotations
external-dns.alpha.kubernetes.io/hostname: argocd.example.com
```

## Step 5: Verify the Setup

Test the web UI by navigating to `https://argocd.example.com` in your browser. Then test the CLI.

```bash
# Test CLI login
argocd login argocd.example.com --grpc-web

# Verify you can list applications
argocd app list
```

## Troubleshooting Common ALB Issues

**502 Bad Gateway errors**: This usually means the ALB cannot reach the ArgoCD server pods. Verify that the ArgoCD server is running in insecure mode and that the target group health checks are passing.

```bash
# Check pod health
kubectl -n argocd get pods -l app.kubernetes.io/name=argocd-server

# Check target group health in AWS Console or via CLI
aws elbv2 describe-target-health --target-group-arn <tg-arn>
```

**Mixed content warnings**: If you see mixed content warnings in the browser, make sure the ArgoCD server knows it is behind a proxy. The `server.insecure` setting should handle this, but you may also need to set the base URL.

```yaml
# In argocd-cm ConfigMap
data:
  url: https://argocd.example.com
```

**CLI cannot connect**: If the CLI hangs or fails to connect, make sure you are using the `--grpc-web` flag. Without it, the CLI tries to establish a native gRPC connection that may not work through the ALB depending on your configuration.

**Security group issues**: Make sure the ALB security group allows inbound HTTPS (port 443) and that the node/pod security groups allow traffic from the ALB.

## Production Considerations

For production deployments, consider adding a Web Application Firewall (WAF) in front of the ALB to protect against common web attacks. You should also enable access logging on the ALB to track who is accessing your ArgoCD instance.

Setting up monitoring for the ALB target groups helps you catch issues before they affect users. You can use [OneUptime](https://oneuptime.com) to monitor both the ArgoCD web UI endpoint and the API health check endpoint to get alerted when things go wrong.

Finally, make sure your ALB idle timeout is set appropriately. ArgoCD WebSocket connections for real-time UI updates may need a longer idle timeout than the default 60 seconds.

```yaml
# Add to Ingress annotations for longer idle timeout
alb.ingress.kubernetes.io/load-balancer-attributes: idle_timeout.timeout_seconds=300
```

This setup gives you a production-ready ArgoCD deployment behind an AWS ALB with proper TLS termination, gRPC support, and health checking.
