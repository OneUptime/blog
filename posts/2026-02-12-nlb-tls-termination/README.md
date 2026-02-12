# How to Set Up NLB with TLS Termination

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, NLB, TLS, Load Balancing, Security

Description: A complete guide to configuring Network Load Balancer TLS termination with ACM certificates, security policies, and mutual TLS authentication.

---

Network Load Balancers are built for raw performance. They operate at Layer 4, handling millions of connections per second with ultra-low latency. But for a long time, if you needed TLS termination, you had to use an ALB or handle it at the application level. That changed when AWS added TLS listener support to NLB.

Now you can terminate TLS at the NLB, which means your backend instances don't need to manage certificates or handle TLS handshakes. This reduces compute overhead on your backends and centralizes certificate management in ACM. Let's set it up.

## When to Use NLB with TLS vs ALB

Before diving in, let's clarify when NLB with TLS makes sense:

- **Use NLB with TLS** when you need Layer 4 performance, static IPs, or VPC endpoint service compatibility, but also want TLS termination.
- **Use ALB** when you need Layer 7 features like path-based routing, HTTP header inspection, WebSocket support, or built-in authentication.

NLB with TLS gives you the best of both worlds: high-performance load balancing with certificate management.

## Prerequisites

You need an ACM certificate for your domain. NLB TLS listeners only work with ACM certificates - you can't upload custom certificates.

Request an ACM certificate:

```bash
# Request a certificate (if you don't already have one)
aws acm request-certificate \
  --domain-name "api.example.com" \
  --validation-method DNS \
  --subject-alternative-names "*.api.example.com" \
  --tags Key=Service,Value=API

# Get the DNS validation records
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abc-123 \
  --query 'Certificate.DomainValidationOptions'

# After adding DNS records, wait for validation
aws acm wait certificate-validated \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abc-123
```

## Creating the NLB with TLS Listener

Create the NLB, target group, and TLS listener.

Create the NLB and target group:

```bash
# Create the Network Load Balancer
aws elbv2 create-load-balancer \
  --name "api-nlb" \
  --type network \
  --subnets subnet-a1b2c3 subnet-d4e5f6 \
  --scheme internet-facing \
  --tags Key=Service,Value=API

# Create a target group - note the protocol is TCP (NLB handles TLS)
aws elbv2 create-target-group \
  --name "api-targets" \
  --protocol TCP \
  --port 8080 \
  --vpc-id vpc-abc123 \
  --target-type instance \
  --health-check-protocol HTTP \
  --health-check-path /health \
  --health-check-port 8080 \
  --healthy-threshold-count 2 \
  --unhealthy-threshold-count 2

# Register targets
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/api-targets/abc123 \
  --targets Id=i-0123456789abcdef0 Id=i-abcdef0123456789a
```

Now create the TLS listener:

```bash
# Create a TLS listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/net/api-nlb/abc123 \
  --protocol TLS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:us-east-1:123456789012:certificate/abc-123 \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/api-targets/abc123
```

The `ssl-policy` parameter determines which TLS versions and cipher suites are supported. Choose based on your security requirements.

## TLS Security Policies

AWS provides predefined security policies. Here are the most commonly used ones:

| Policy | TLS 1.3 | TLS 1.2 | TLS 1.1 | TLS 1.0 |
|--------|---------|---------|---------|---------|
| ELBSecurityPolicy-TLS13-1-2-2021-06 | Yes | Yes | No | No |
| ELBSecurityPolicy-TLS13-1-3-2021-06 | Yes | No | No | No |
| ELBSecurityPolicy-TLS-1-2-2017-01 | No | Yes | No | No |
| ELBSecurityPolicy-2016-08 | No | Yes | Yes | Yes |

For new deployments, use `ELBSecurityPolicy-TLS13-1-2-2021-06`. It supports TLS 1.3 (the fastest and most secure) while maintaining TLS 1.2 compatibility for older clients.

List available security policies:

```bash
# List all available TLS security policies
aws elbv2 describe-ssl-policies \
  --load-balancer-type network \
  --query 'SslPolicies[].Name'
```

## CloudFormation Template

Complete CloudFormation setup:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: NLB with TLS Termination

Parameters:
  VpcId:
    Type: AWS::EC2::VPC::Id
  SubnetIds:
    Type: List<AWS::EC2::Subnet::Id>
  CertificateArn:
    Type: String
  TargetInstances:
    Type: List<AWS::EC2::Instance::Id>

Resources:
  NetworkLoadBalancer:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Name: api-nlb
      Type: network
      Scheme: internet-facing
      Subnets: !Ref SubnetIds
      Tags:
        - Key: Service
          Value: API

  TLSListener:
    Type: AWS::ElasticLoadBalancingV2::Listener
    Properties:
      LoadBalancerArn: !Ref NetworkLoadBalancer
      Port: 443
      Protocol: TLS
      SslPolicy: ELBSecurityPolicy-TLS13-1-2-2021-06
      Certificates:
        - CertificateArn: !Ref CertificateArn
      DefaultActions:
        - Type: forward
          TargetGroupArn: !Ref APITargetGroup

  # Also listen on TCP 80 and redirect to HTTPS
  TCPListener:
    Type: AWS::ElasticLoadBalancingV2::Listener
    Properties:
      LoadBalancerArn: !Ref NetworkLoadBalancer
      Port: 80
      Protocol: TCP
      DefaultActions:
        - Type: forward
          TargetGroupArn: !Ref RedirectTargetGroup

  APITargetGroup:
    Type: AWS::ElasticLoadBalancingV2::TargetGroup
    Properties:
      Name: api-targets
      Protocol: TCP
      Port: 8080
      VpcId: !Ref VpcId
      TargetType: instance
      HealthCheckProtocol: HTTP
      HealthCheckPath: /health
      HealthCheckPort: "8080"
      HealthyThresholdCount: 2
      UnhealthyThresholdCount: 2
      Targets:
        - Id: !Select [0, !Ref TargetInstances]
        - Id: !Select [1, !Ref TargetInstances]

Outputs:
  NLBDnsName:
    Value: !GetAtt NetworkLoadBalancer.DNSName
  StaticIPs:
    Value: !Join [",", !GetAtt NetworkLoadBalancer.StaticIPs]
```

## TLS Passthrough vs TLS Termination

NLB actually supports two TLS modes:

**TLS Termination** (what we've been configuring): NLB decrypts TLS, then forwards plain TCP to your backends. The backend doesn't need to handle TLS.

**TLS Passthrough**: NLB forwards encrypted TLS traffic directly to your backends without decrypting. The backend handles TLS termination. Use a TCP listener for this.

```bash
# TLS Passthrough - use TCP protocol, not TLS
aws elbv2 create-listener \
  --load-balancer-arn $NLB_ARN \
  --protocol TCP \
  --port 443 \
  --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN
```

Use passthrough when you need end-to-end encryption and your backends manage their own certificates. Use termination when you want to offload TLS processing and centralize certificate management.

## Mutual TLS (mTLS)

NLB supports mutual TLS where both the client and server present certificates. This is common for service-to-service communication and B2B APIs.

Configure mutual TLS on the listener:

```bash
# Upload your trust store certificate to S3
aws s3 cp ca-bundle.pem s3://my-certs-bucket/ca-bundle.pem

# Create a trust store
aws elbv2 create-trust-store \
  --name "client-ca-trust" \
  --ca-certificates-bundle-s3-bucket my-certs-bucket \
  --ca-certificates-bundle-s3-key ca-bundle.pem

# Update the TLS listener with mutual authentication
aws elbv2 modify-listener \
  --listener-arn $LISTENER_ARN \
  --mutual-authentication '{
    "Mode": "verify",
    "TrustStoreArn": "arn:aws:elasticloadbalancing:us-east-1:123456789012:truststore/client-ca-trust/abc123"
  }'
```

With mTLS, the NLB validates client certificates against your trust store. Requests with invalid or missing certificates are rejected at the load balancer level, before they reach your application.

## Preserving Client IP

NLB preserves the client's source IP by default when using instance targets. But with IP targets, you need to enable proxy protocol v2 if your application needs the original client IP.

Enable proxy protocol v2:

```bash
# Enable proxy protocol v2 on the target group
aws elbv2 modify-target-group-attributes \
  --target-group-arn $TARGET_GROUP_ARN \
  --attributes Key=proxy_protocol_v2.enabled,Value=true
```

Your application server needs to understand proxy protocol v2 to extract the client IP from the protocol header.

## Monitoring TLS Metrics

Monitor your TLS listener with CloudWatch:

```bash
# Key metrics to watch
aws cloudwatch get-metric-data \
  --metric-data-queries '[
    {
      "Id": "newConns",
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/NetworkELB",
          "MetricName": "NewFlowCount_TLS",
          "Dimensions": [{"Name": "LoadBalancer", "Value": "net/api-nlb/abc123"}]
        },
        "Period": 300,
        "Stat": "Sum"
      }
    },
    {
      "Id": "tlsErrors",
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/NetworkELB",
          "MetricName": "ClientTLSNegotiationErrorCount",
          "Dimensions": [{"Name": "LoadBalancer", "Value": "net/api-nlb/abc123"}]
        },
        "Period": 300,
        "Stat": "Sum"
      }
    }
  ]' \
  --start-time "2026-02-12T00:00:00Z" \
  --end-time "2026-02-12T12:00:00Z"
```

Watch `ClientTLSNegotiationErrorCount` closely after changing your security policy. A spike means some clients can't connect with the new TLS requirements. This is common when dropping TLS 1.0/1.1 support.

For more load balancing options, see our guide on [Gateway Load Balancer](https://oneuptime.com/blog/post/gateway-load-balancer-third-party-appliances/view).
