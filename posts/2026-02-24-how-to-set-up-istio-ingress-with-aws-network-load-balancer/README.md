# How to Set Up Istio Ingress with AWS Network Load Balancer

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, AWS, Network Load Balancer, Kubernetes, Ingress Gateway

Description: Complete guide to deploying Istio Ingress Gateway behind an AWS Network Load Balancer for high-performance TCP/TLS traffic handling.

---

When you deploy Istio on AWS EKS, the default ingress gateway gets a Classic Load Balancer. That works fine for testing, but production workloads benefit from an AWS Network Load Balancer (NLB) instead. NLBs operate at Layer 4, offer lower latency, handle millions of requests per second, and preserve the original client IP address.

This guide covers how to configure Istio's ingress gateway to use an NLB, including proper annotations, health checks, and TLS setup.

## Why Use an NLB Over a Classic Load Balancer

AWS Classic Load Balancers are being phased out in favor of NLBs and ALBs. For Istio, an NLB is typically the best choice because:

- Istio already handles Layer 7 routing, so you don't need the ALB to do it
- NLBs preserve source IP addresses without extra configuration
- NLBs support static IP addresses and Elastic IPs
- NLBs have much higher throughput limits
- NLBs have lower latency since they operate at Layer 4

## Configuring the Ingress Gateway Service

The key to getting an NLB is setting the right annotations on the istio-ingressgateway Service. If you installed Istio with `istioctl`, you can customize the installation using an IstioOperator overlay:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-config
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        serviceAnnotations:
          service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
          service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
          service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
```

Apply this with:

```bash
istioctl install -f istio-nlb-config.yaml
```

If you are using Helm to install Istio, set the annotations in your values file:

```yaml
gateways:
  istio-ingressgateway:
    serviceAnnotations:
      service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
      service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
      service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
```

## Using the AWS Load Balancer Controller

If you have the AWS Load Balancer Controller installed in your cluster (which is recommended for EKS), you get access to more advanced NLB features. The annotations change slightly:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-config
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        serviceAnnotations:
          service.beta.kubernetes.io/aws-load-balancer-type: "external"
          service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "ip"
          service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
          service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
          service.beta.kubernetes.io/aws-load-balancer-healthcheck-healthy-threshold: "2"
          service.beta.kubernetes.io/aws-load-balancer-healthcheck-unhealthy-threshold: "2"
          service.beta.kubernetes.io/aws-load-balancer-healthcheck-interval: "10"
```

The `nlb-target-type: ip` annotation registers pod IPs directly with the NLB target group, bypassing kube-proxy. This gives you better performance and preserves client source IPs more reliably.

## Preserving Client Source IP

One major advantage of NLBs is client IP preservation. But you need to configure a few things to make it work end to end.

First, set the `externalTrafficPolicy` on the ingress gateway service:

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
          externalTrafficPolicy: Local
        serviceAnnotations:
          service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
          service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
```

With `externalTrafficPolicy: Local`, Kubernetes won't SNAT the traffic, so the original client IP reaches the Envoy proxy. If you are using the AWS Load Balancer Controller with IP target mode, the source IP is preserved automatically.

To verify it is working, check the access logs in the ingress gateway:

```bash
kubectl logs -n istio-system deploy/istio-ingressgateway | head -20
```

You should see real client IP addresses instead of internal node IPs.

## Health Check Configuration

NLBs perform health checks against the target pods. The Istio ingress gateway exposes a health check endpoint on port 15021 at `/healthz/ready`. Configure the NLB to use it:

```yaml
serviceAnnotations:
  service.beta.kubernetes.io/aws-load-balancer-healthcheck-port: "15021"
  service.beta.kubernetes.io/aws-load-balancer-healthcheck-path: "/healthz/ready"
  service.beta.kubernetes.io/aws-load-balancer-healthcheck-protocol: "HTTP"
```

This ensures the NLB only sends traffic to healthy gateway pods.

## Setting Up TLS

You have two options for TLS with an NLB:

**Option 1: TLS termination at Istio (recommended).** The NLB passes TCP traffic through, and Istio handles TLS termination. This gives you full control over certificates through Istio's Gateway resource:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: my-tls-secret
    hosts:
    - "myapp.example.com"
```

**Option 2: TLS termination at the NLB.** The NLB handles TLS using an ACM certificate, then forwards plain HTTP to Istio. This is useful if you want to manage certificates through AWS Certificate Manager:

```yaml
serviceAnnotations:
  service.beta.kubernetes.io/aws-load-balancer-ssl-cert: "arn:aws:acm:us-east-1:123456789:certificate/abc-123"
  service.beta.kubernetes.io/aws-load-balancer-ssl-ports: "443"
  service.beta.kubernetes.io/aws-load-balancer-backend-protocol: "tcp"
```

With Option 2, you lose the ability to do mTLS between the client and the gateway, and your Gateway resource should listen on HTTP instead of HTTPS.

## Internal NLB Setup

For services that should only be accessible within your VPC, create an internal NLB:

```yaml
serviceAnnotations:
  service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
  service.beta.kubernetes.io/aws-load-balancer-scheme: "internal"
```

This is common for internal APIs, admin dashboards, or services consumed by other AWS resources.

## Verifying the Setup

After applying your configuration, check that the NLB was created:

```bash
kubectl get svc istio-ingressgateway -n istio-system
```

The EXTERNAL-IP field should show an NLB DNS name like `a1b2c3d4-1234567890.us-east-1.elb.amazonaws.com`. You can also verify in the AWS console under EC2 > Load Balancers.

Test connectivity:

```bash
curl -v https://myapp.example.com/
```

Check NLB target health in AWS:

```bash
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789:targetgroup/k8s-xxx/yyy
```

## Troubleshooting

**NLB not created.** Check if the service type is LoadBalancer and the annotations are correct. Look at the service events:

```bash
kubectl describe svc istio-ingressgateway -n istio-system
```

**Targets showing unhealthy.** Verify the health check port (15021) is open in your security groups and the pod is actually healthy.

**Timeout connecting.** Check security group rules. NLBs don't have their own security groups - they use the security groups of the target instances or pods.

**Client IP not preserved.** Make sure `externalTrafficPolicy` is set to Local, or use IP target mode with the AWS Load Balancer Controller.

## Summary

Setting up Istio with an AWS NLB gives you better performance, source IP preservation, and more control over load balancing behavior compared to Classic Load Balancers. The main steps are adding the right annotations to the ingress gateway service, configuring health checks, and deciding where to terminate TLS. Using the AWS Load Balancer Controller with IP target mode is the recommended approach for EKS clusters.
