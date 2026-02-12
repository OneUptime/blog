# How to Configure TLS 1.3 on AWS Load Balancers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, TLS, Load Balancer, Security, Encryption

Description: Configure TLS 1.3 on Application Load Balancers and Network Load Balancers for faster handshakes, stronger encryption, and better security.

---

TLS 1.3 was finalized back in 2018, but plenty of AWS load balancers are still running older TLS versions. If you haven't explicitly configured your security policy, you might be allowing TLS 1.0 and 1.1 connections - protocols with known vulnerabilities that most compliance frameworks now require you to disable.

TLS 1.3 isn't just more secure. It's also faster. The handshake completes in one round trip instead of two, and zero round trips for resumed connections. For high-traffic applications, that latency savings adds up. Let's configure it on both Application Load Balancers (ALB) and Network Load Balancers (NLB).

## TLS 1.3 Benefits

Before diving into configuration, here's why TLS 1.3 matters:

- **Faster handshakes** - 1-RTT for new connections, 0-RTT for resumed connections
- **Stronger cipher suites** - Only supports modern AEAD ciphers. No more CBC, RC4, or other legacy algorithms
- **Simpler protocol** - Removed unnecessary features that were attack vectors (renegotiation, compression)
- **Forward secrecy by default** - Every connection uses ephemeral keys. Compromising the server's private key doesn't decrypt past traffic
- **Encrypted handshake** - More of the handshake is encrypted, reducing metadata exposure

## Security Policies Explained

AWS uses predefined security policies that determine which TLS versions and cipher suites your load balancer supports. The policy names tell you the minimum TLS version and the date they were created.

Key policies for TLS 1.3:

| Policy | Min TLS | TLS 1.3 | Notes |
|--------|---------|---------|-------|
| ELBSecurityPolicy-TLS13-1-2-2021-06 | 1.2 | Yes | TLS 1.2 + 1.3 (recommended) |
| ELBSecurityPolicy-TLS13-1-3-2021-06 | 1.3 | Yes | TLS 1.3 only (strict) |
| ELBSecurityPolicy-TLS13-1-2-Res-2021-06 | 1.2 | Yes | Restricted cipher set |
| ELBSecurityPolicy-2016-08 | 1.0 | No | Default (outdated) |
| ELBSecurityPolicy-TLS-1-2-2017-01 | 1.2 | No | TLS 1.2 without 1.3 |

For most applications, `ELBSecurityPolicy-TLS13-1-2-2021-06` is the right choice. It supports both TLS 1.2 (for backward compatibility) and TLS 1.3.

## Configuring TLS 1.3 on Application Load Balancer

### Via CLI

This updates an ALB HTTPS listener to use the TLS 1.3 security policy:

```bash
# Update an existing HTTPS listener
aws elbv2 modify-listener \
  --listener-arn arn:aws:elasticloadbalancing:us-east-1:111111111111:listener/app/my-alb/abc123/def456 \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06
```

For a new listener:

```bash
# Create HTTPS listener with TLS 1.3
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:111111111111:loadbalancer/app/my-alb/abc123 \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:us-east-1:111111111111:certificate/cert-id \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:111111111111:targetgroup/my-targets/abc123
```

### TLS 1.3 Only (No 1.2 Fallback)

If all your clients support TLS 1.3 and you want maximum security, use the 1.3-only policy:

```bash
aws elbv2 modify-listener \
  --listener-arn arn:aws:elasticloadbalancing:us-east-1:111111111111:listener/app/my-alb/abc123/def456 \
  --ssl-policy ELBSecurityPolicy-TLS13-1-3-2021-06
```

Be careful with this one. Older clients, some corporate proxies, and certain SDKs might not support TLS 1.3 yet. Test thoroughly before enforcing 1.3-only.

## Configuring TLS 1.3 on Network Load Balancer

NLBs support TLS termination on TLS listeners. The process is similar to ALBs.

This creates a TLS listener on an NLB with TLS 1.3 support:

```bash
# Create TLS listener on NLB
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:111111111111:loadbalancer/net/my-nlb/abc123 \
  --protocol TLS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:us-east-1:111111111111:certificate/cert-id \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:us-east-1:111111111111:targetgroup/my-targets/def456
```

Update an existing NLB listener:

```bash
aws elbv2 modify-listener \
  --listener-arn arn:aws:elasticloadbalancing:us-east-1:111111111111:listener/net/my-nlb/abc123/def456 \
  --ssl-policy ELBSecurityPolicy-TLS13-1-2-2021-06
```

## Terraform Configuration

Here's the complete Terraform setup for both ALB and NLB with TLS 1.3.

ALB configuration:

```hcl
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.application.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}
```

NLB configuration:

```hcl
resource "aws_lb_listener" "tls" {
  load_balancer_arn = aws_lb.network.arn
  port              = 443
  protocol          = "TLS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.main.arn
  }
}
```

## Verifying TLS 1.3 Configuration

### Check Current Policy

```bash
# Get current security policy for a listener
aws elbv2 describe-listeners \
  --listener-arns arn:aws:elasticloadbalancing:us-east-1:111111111111:listener/app/my-alb/abc123/def456 \
  --query 'Listeners[0].SslPolicy'
```

### List Available Policies

```bash
# See all available security policies
aws elbv2 describe-ssl-policies \
  --names ELBSecurityPolicy-TLS13-1-2-2021-06 \
  --query 'SslPolicies[0].{Name:Name,Protocols:SslProtocols,Ciphers:Ciphers[].Name}'
```

### Test with OpenSSL

Verify the load balancer is actually negotiating TLS 1.3:

```bash
# Test TLS 1.3 connection
openssl s_client -connect my-alb-123456.us-east-1.elb.amazonaws.com:443 -tls1_3

# You should see something like:
# Protocol  : TLSv1.3
# Cipher    : TLS_AES_128_GCM_SHA256
```

Test that old versions are rejected:

```bash
# This should fail if TLS 1.0/1.1 is disabled
openssl s_client -connect my-alb-123456.us-east-1.elb.amazonaws.com:443 -tls1
# Expected: handshake failure

openssl s_client -connect my-alb-123456.us-east-1.elb.amazonaws.com:443 -tls1_1
# Expected: handshake failure
```

### Test with Curl

```bash
# Force TLS 1.3
curl -v --tls-max 1.3 --tlsv1.3 https://your-domain.com/

# Verify TLS 1.2 still works (if using the combo policy)
curl -v --tls-max 1.2 --tlsv1.2 https://your-domain.com/
```

## Cipher Suites in TLS 1.3

TLS 1.3 only supports three cipher suites:

- `TLS_AES_128_GCM_SHA256` - AES-128 in GCM mode
- `TLS_AES_256_GCM_SHA384` - AES-256 in GCM mode
- `TLS_CHACHA20_POLY1305_SHA256` - ChaCha20-Poly1305

All three use AEAD (Authenticated Encryption with Associated Data), which provides both encryption and integrity in a single operation. There's no configuration to choose between them - the client and server negotiate automatically based on their capabilities.

## CloudFront TLS 1.3

CloudFront also supports TLS 1.3 through its security policies.

This updates a CloudFront distribution to require TLS 1.2 minimum with TLS 1.3 support:

```bash
# Update CloudFront distribution viewer certificate
aws cloudfront update-distribution \
  --id E12345ABCDE \
  --distribution-config '{
    "ViewerCertificate": {
      "ACMCertificateArn": "arn:aws:acm:us-east-1:111111111111:certificate/cert-id",
      "SSLSupportMethod": "sni-only",
      "MinimumProtocolVersion": "TLSv1.2_2021"
    }
  }'
```

## Monitoring TLS Version Usage

Before enforcing TLS 1.3 only, check what versions your clients are using.

With ALB access logs enabled, query with Athena:

```sql
-- Count connections by TLS version
SELECT
    ssl_protocol,
    COUNT(*) as connection_count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM alb_logs
WHERE ssl_protocol != '-'
GROUP BY ssl_protocol
ORDER BY connection_count DESC;
```

With CloudWatch:

```bash
# ALB doesn't expose TLS version as a native metric,
# but you can track new connection counts
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name NewConnectionCount \
  --dimensions Name=LoadBalancer,Value=app/my-alb/abc123 \
  --start-time 2026-02-11T00:00:00Z \
  --end-time 2026-02-12T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

## Migration Strategy

Here's a safe migration path:

1. **Audit current usage.** Enable access logs and analyze TLS version distribution for at least a week.

2. **Enable TLS 1.3 alongside 1.2.** Switch to `ELBSecurityPolicy-TLS13-1-2-2021-06`. This adds TLS 1.3 without breaking any existing clients.

3. **Monitor for issues.** Watch for connection errors, increased latency, or client complaints.

4. **Disable TLS 1.0/1.1.** If you were allowing these, the new policy already blocks them. Monitor for increased client errors.

5. **Consider TLS 1.3 only.** After confirming all clients support 1.3, switch to the strict policy. This is optional and should only be done when you're certain.

## Best Practices

**Don't jump straight to TLS 1.3 only.** Use the combo policy first. Some legitimate clients may not support 1.3 yet.

**Update all listeners.** If you have multiple listeners on a load balancer, update them all. One listener running an old policy creates a weak link.

**Use ACM for certificates.** ACM handles certificate renewal automatically. Manual certificate management is a common cause of TLS outages.

**Monitor connection errors.** After changing policies, watch for `ClientTLSNegotiationErrorCount` in CloudWatch. A spike means clients can't connect.

**Test before production.** Always test in a staging environment first. Use the OpenSSL commands above to verify the expected behavior.

For internal TLS with private certificates, see our guide on [AWS Private CA](https://oneuptime.com/blog/post/aws-private-ca-internal-certificate-management/view). Monitor your TLS endpoints and certificate health with [OneUptime](https://oneuptime.com) to catch configuration issues before they cause outages.
