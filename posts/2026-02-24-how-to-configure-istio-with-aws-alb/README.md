# How to Configure Istio with AWS ALB (Application Load Balancer)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, AWS, ALB, Load Balancer, Kubernetes, EKS

Description: How to integrate Istio service mesh with AWS Application Load Balancer for advanced Layer 7 routing and TLS termination on EKS.

---

Most Istio guides tell you to use a Network Load Balancer (NLB) in front of the ingress gateway, and for good reason - it is simpler. But there are cases where you specifically want an Application Load Balancer (ALB). Maybe you need WAF integration, or you want to use AWS-managed TLS termination, or your organization has standardized on ALB for all HTTP traffic. Whatever the reason, getting Istio and ALB to work together requires some specific configuration.

## Why ALB Instead of NLB?

AWS ALB operates at Layer 7 (HTTP/HTTPS) while NLB operates at Layer 4 (TCP/UDP). ALB gives you:

- Native integration with AWS WAF
- Built-in HTTP/2 and WebSocket support
- Path-based routing at the AWS level
- Access logging to S3
- Integration with AWS Cognito for authentication
- Sticky sessions managed by AWS

The trade-off is that ALB terminates TLS, so the connection between ALB and Istio's ingress gateway is a new connection. You lose the end-to-end mTLS that you get with NLB in passthrough mode.

## Prerequisites

Install the AWS Load Balancer Controller in your EKS cluster:

```bash
# Add the EKS Helm repo
helm repo add eks https://aws.github.io/eks-charts
helm repo update

# Install the controller
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=my-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

Make sure the controller's service account has the right IAM permissions. You need the IAM policy from the AWS documentation that covers ALB, target group, and security group management.

## Configuring Istio Ingress Gateway for ALB

The key is to configure the Istio ingress gateway as a NodePort service instead of LoadBalancer, and let the AWS Load Balancer Controller create the ALB through an Ingress resource:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        service:
          type: NodePort
          ports:
          - name: http2
            port: 80
            targetPort: 8080
            nodePort: 30080
          - name: https
            port: 443
            targetPort: 8443
            nodePort: 30443
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
```

Install Istio with this configuration:

```bash
istioctl install -f istio-alb-config.yaml -y
```

## Creating the ALB Ingress Resource

Now create a Kubernetes Ingress resource that the AWS Load Balancer Controller will use to provision the ALB:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: istio-alb-ingress
  namespace: istio-system
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: instance
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443},{"HTTP":80}]'
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:123456789:certificate/abc-123
    alb.ingress.kubernetes.io/ssl-redirect: "443"
    alb.ingress.kubernetes.io/healthcheck-path: /healthz/ready
    alb.ingress.kubernetes.io/healthcheck-port: "15021"
    alb.ingress.kubernetes.io/backend-protocol: HTTP
    alb.ingress.kubernetes.io/wafv2-acl-arn: arn:aws:wafv2:us-east-1:123456789:regional/webacl/my-acl/abc
    alb.ingress.kubernetes.io/load-balancer-attributes: idle_timeout.timeout_seconds=60
spec:
  rules:
  - http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: istio-ingressgateway
            port:
              number: 80
```

This creates an internet-facing ALB that:
- Listens on both HTTP and HTTPS
- Redirects HTTP to HTTPS
- Uses an ACM certificate for TLS
- Health checks the Istio gateway on port 15021
- Attaches a WAF ACL for security
- Forwards traffic to the Istio gateway on port 80

## Configuring the Istio Gateway

Since ALB terminates TLS, configure the Istio Gateway to accept plain HTTP traffic from the ALB:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  servers:
  - port:
      number: 8080
      name: http
      protocol: HTTP
    hosts:
    - "app.example.com"
    - "api.example.com"
```

Note that we use port 8080 (the actual container port) and HTTP protocol since TLS is already terminated at the ALB.

## Preserving Client IP

When traffic passes through the ALB, the original client IP is in the X-Forwarded-For header. Configure Istio to trust this header:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      gatewayTopology:
        numTrustedProxies: 1
```

This tells Istio that there is one trusted proxy (the ALB) in front of the gateway, so it should use the X-Forwarded-For header for client IP.

You can then use the client IP in authorization policies:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: ip-allow-list
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
  - from:
    - source:
        remoteIpBlocks:
        - "203.0.113.0/24"
```

## Using IP Target Mode

For better performance, you can configure the ALB to route directly to pod IPs instead of going through NodePort. This requires the AWS VPC CNI plugin:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: istio-alb-ingress
  namespace: istio-system
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:123456789:certificate/abc-123
    alb.ingress.kubernetes.io/healthcheck-path: /healthz/ready
    alb.ingress.kubernetes.io/healthcheck-port: "15021"
spec:
  rules:
  - http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: istio-ingressgateway
            port:
              number: 8080
```

With `target-type: ip`, the ALB sends traffic directly to the Istio gateway pod IP, skipping the kube-proxy hop. This reduces latency slightly and gives you better connection draining.

## Handling Multiple Domains

If you have multiple domains, you can use ALB's host-based routing, but it is usually better to let Istio handle the routing and just send everything through:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: app-routing
spec:
  hosts:
  - "app.example.com"
  gateways:
  - istio-system/main-gateway
  http:
  - route:
    - destination:
        host: frontend-service
        port:
          number: 3000
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-routing
spec:
  hosts:
  - "api.example.com"
  gateways:
  - istio-system/main-gateway
  http:
  - route:
    - destination:
        host: api-service
        port:
          number: 8080
```

## mTLS Between ALB and Istio Gateway

If you want encryption between the ALB and the Istio gateway (re-encryption), you can configure the ALB backend protocol as HTTPS:

```yaml
annotations:
  alb.ingress.kubernetes.io/backend-protocol: HTTPS
```

And configure the Istio Gateway to use TLS:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  servers:
  - port:
      number: 8443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: internal-tls-cert
    hosts:
    - "*.example.com"
```

## Troubleshooting

If the ALB is not getting created, check the AWS Load Balancer Controller logs:

```bash
kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller
```

If traffic is not reaching the Istio gateway, verify the target group health:

```bash
aws elbv2 describe-target-health --target-group-arn <target-group-arn>
```

Check that the security groups allow traffic from the ALB to the node ports or pod IPs.

Using ALB with Istio gives you the best of both worlds - AWS-managed Layer 7 features like WAF and Cognito at the edge, plus Istio's full service mesh capabilities inside the cluster. The trade-off of losing end-to-end mTLS at the ALB boundary is usually acceptable when you weigh the operational benefits.
