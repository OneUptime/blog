# How to Configure Istio with AWS NLB (Network Load Balancer)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, AWS, NLB, Load Balancer, Kubernetes, EKS

Description: Complete guide to configuring Istio ingress gateway with AWS Network Load Balancer for high-performance TCP/TLS load balancing on EKS.

---

The AWS Network Load Balancer is a strong fit for Istio on EKS when you want Layer 4 TCP/TLS load balancing. It passes TCP connections straight through to the Istio ingress gateway without terminating TLS at the load balancer. This keeps TLS termination in Istio and avoids Layer 7 processing at the load balancer. Here is how to set it up properly.

## Why NLB for Istio?

NLB has several advantages for Istio deployments:

- TCP passthrough preserves the original TLS connection to the gateway, so Istio handles TLS termination and mesh mTLS policies
- Lower Layer 4 overhead compared to using an ALB for raw TCP/TLS forwarding
- Can handle millions of requests per second without pre-warming
- Supports static IP addresses and Elastic IPs
- Preserves source IP without needing proxy protocol in certain configurations

## Basic NLB Configuration

The simplest way to get an NLB in front of Istio is through service annotations:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        serviceAnnotations:
          service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
          service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
```

Install with:

```bash
istioctl install -f istio-nlb-config.yaml -y
```

Verify the NLB was created:

```bash
kubectl get svc istio-ingressgateway -n istio-system
```

You should see a LoadBalancer service with an AWS hostname in the EXTERNAL-IP column.

## Using the AWS Load Balancer Controller for NLB

For more control, use the AWS Load Balancer Controller instead of the in-tree cloud provider. The controller supports NLB with IP targets, which routes traffic directly to pod IPs:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
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
          service.beta.kubernetes.io/aws-load-balancer-healthcheck-port: "15021"
          service.beta.kubernetes.io/aws-load-balancer-healthcheck-path: "/healthz/ready"
          service.beta.kubernetes.io/aws-load-balancer-healthcheck-protocol: "HTTP"
```

IP target mode skips the kube-proxy hop and sends traffic directly to the Istio gateway pods. This is more efficient and gives you better connection draining during pod replacements.

## TCP Passthrough to Istio TLS

For NLB TCP passthrough to Istio (letting Istio handle TLS termination), configure the NLB to forward TCP on port 443:

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
          ports:
          - name: https
            port: 443
            targetPort: 8443
            protocol: TCP
          - name: http
            port: 80
            targetPort: 8080
            protocol: TCP
        serviceAnnotations:
          service.beta.kubernetes.io/aws-load-balancer-type: "external"
          service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "ip"
          service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
```

Then configure the Istio Gateway for TLS:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
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
      credentialName: my-tls-cert
    hosts:
    - "app.example.com"
  - port:
      number: 80
      name: http
      protocol: HTTP
    tls:
      httpsRedirect: true
    hosts:
    - "app.example.com"
```

Create the TLS secret:

```bash
kubectl create secret tls my-tls-cert \
  --cert=fullchain.pem \
  --key=privkey.pem \
  -n istio-system
```

## Preserving Source IP

With NLB, preserving the source client IP depends on the target type and target group attributes:

For **instance targets** (NodePort), NLB client IP preservation is enabled by default, but Kubernetes can still hide the original source IP if the Service uses `externalTrafficPolicy: Cluster`. If Envoy must see the original client IP across those paths, enable proxy protocol:

```yaml
serviceAnnotations:
  service.beta.kubernetes.io/aws-load-balancer-proxy-protocol: "*"
```

And enable proxy protocol in the Istio gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: EnvoyFilter
metadata:
  name: proxy-protocol
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: LISTENER
    match:
      context: GATEWAY
    patch:
      operation: MERGE
      value:
        listenerFilters:
        - name: envoy.filters.listener.proxy_protocol
          typedConfig:
            "@type": type.googleapis.com/envoy.extensions.filters.listener.proxy_protocol.v3.ProxyProtocol
```

For **IP targets** with TCP or TLS target groups, client IP preservation is disabled by default. Enable it explicitly when your targets are in the same VPC or a supported peered VPC:

```yaml
serviceAnnotations:
  service.beta.kubernetes.io/aws-load-balancer-target-group-attributes: "preserve_client_ip.enabled=true"
```

If you cannot use client IP preservation, use proxy protocol v2 instead and make sure the Istio gateway listener supports it.

## Static IP with Elastic IPs

If you need static IP addresses for your Istio gateway (useful for DNS or firewall rules), allocate Elastic IPs and attach them:

```bash
# Allocate EIPs

aws ec2 allocate-address --domain vpc
aws ec2 allocate-address --domain vpc
```

Then reference them in the service annotations:

```yaml
serviceAnnotations:
  service.beta.kubernetes.io/aws-load-balancer-type: "external"
  service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "ip"
  service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
  service.beta.kubernetes.io/aws-load-balancer-eip-allocations: "eipalloc-abc123,eipalloc-def456"
  service.beta.kubernetes.io/aws-load-balancer-subnets: "subnet-111,subnet-222"
```

Each EIP maps to one subnet/availability zone, so you need one EIP per subnet.

## Internal NLB for Private Services

For services that should only be accessible within your VPC:

```yaml
serviceAnnotations:
  service.beta.kubernetes.io/aws-load-balancer-type: "external"
  service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "ip"
  service.beta.kubernetes.io/aws-load-balancer-scheme: "internal"
```

You can create a separate internal ingress gateway for internal traffic:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        serviceAnnotations:
          service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
    - name: istio-internal-gateway
      enabled: true
      label:
        istio: internalgateway
      k8s:
        serviceAnnotations:
          service.beta.kubernetes.io/aws-load-balancer-type: "external"
          service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "ip"
          service.beta.kubernetes.io/aws-load-balancer-scheme: "internal"
```

## Connection Draining

When gateway pods are replaced during deployments or node rotations, you want to drain connections gracefully. Configure the termination grace period:

```yaml
k8s:
  podAnnotations:
    proxy.istio.io/config: |
      terminationDrainDuration: 30s
  overlays:
  - kind: Deployment
    name: istio-ingressgateway
    patches:
    - path: spec.template.spec.terminationGracePeriodSeconds
      value: 45
```

Also configure the NLB deregistration delay:

```yaml
serviceAnnotations:
  service.beta.kubernetes.io/aws-load-balancer-target-group-attributes: "deregistration_delay.timeout_seconds=30"
```

## Monitoring the NLB

Set up CloudWatch alarms for your NLB:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name "istio-nlb-unhealthy-hosts" \
  --metric-name UnHealthyHostCount \
  --namespace AWS/NetworkELB \
  --dimensions Name=LoadBalancer,Value=net/<nlb-name>/<id> Name=TargetGroup,Value=targetgroup/<target-group-name>/<id> \
  --statistic Maximum \
  --period 60 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 3 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:alerts
```

## Troubleshooting

Check if the NLB targets are healthy:

```bash
# Get the target group ARN
aws elbv2 describe-target-groups \
  --query "TargetGroups[?starts_with(TargetGroupName, 'k8s-istiosys-istioing-')].TargetGroupArn" \
  --output text

# Check target health
aws elbv2 describe-target-health --target-group-arn <arn>
```

If targets show unhealthy, verify the health check configuration points to port 15021 and path /healthz/ready. Also make sure the backend security groups allow the health check and listener traffic from the required NLB subnet CIDRs or client source CIDRs, depending on whether client IP preservation is enabled.

NLB is the natural pairing for Istio on AWS. It stays out of the way, passes TCP through cleanly, handles massive scale, and supports the features you need like static IPs and cross-zone balancing. For most Istio deployments on EKS, NLB should be your default choice.
