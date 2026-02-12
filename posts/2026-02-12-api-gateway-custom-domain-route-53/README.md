# How to Set Up API Gateway Custom Domain with Route 53

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, API Gateway, Route 53, DNS

Description: Step-by-step guide to configuring a custom domain name for your AWS API Gateway using Route 53 with SSL certificate setup.

---

Nobody wants to share an API endpoint that looks like `https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod`. Custom domains let you use something clean like `api.yourcompany.com`. Setting this up with API Gateway and Route 53 isn't complicated, but there are a few steps that trip people up. Let's walk through the entire process.

## Prerequisites

Before you start, you need three things:
1. A domain registered in Route 53 (or with DNS managed by Route 53)
2. An existing API Gateway REST API or HTTP API
3. An ACM (AWS Certificate Manager) certificate for your domain

## Step 1: Request an SSL Certificate

Your custom domain needs HTTPS, which means you need a certificate from ACM. Here's the important part: **for edge-optimized API endpoints, the certificate MUST be in us-east-1**, regardless of where your API is deployed. For regional endpoints, the certificate needs to be in the same region as your API.

Request a certificate using the AWS CLI:

```bash
# For edge-optimized endpoints, always use us-east-1
aws acm request-certificate \
  --domain-name "api.yourcompany.com" \
  --validation-method DNS \
  --region us-east-1

# For regional endpoints, use the same region as your API
aws acm request-certificate \
  --domain-name "api.yourcompany.com" \
  --validation-method DNS \
  --region us-west-2
```

## Step 2: Validate the Certificate

ACM needs to verify that you own the domain. DNS validation is the easiest approach since Route 53 can automate it.

Get the validation CNAME record from ACM:

```bash
# Get the certificate ARN from the request output, then describe it
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abc-123 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord' \
  --region us-east-1
```

This gives you a CNAME record name and value. Add it to Route 53:

```bash
# Create the validation CNAME in Route 53
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "_a1b2c3.api.yourcompany.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{
          "Value": "_d4e5f6.acm-validations.aws"
        }]
      }
    }]
  }'
```

Wait for the certificate status to change to "ISSUED". This usually takes a few minutes:

```bash
# Poll until the certificate is issued
aws acm wait certificate-validated \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abc-123 \
  --region us-east-1
```

## Step 3: Create the Custom Domain Name

Now create the custom domain in API Gateway. You need to choose between edge-optimized and regional endpoints.

For a regional custom domain:

```bash
# Create a regional custom domain
aws apigateway create-domain-name \
  --domain-name "api.yourcompany.com" \
  --regional-certificate-arn arn:aws:acm:us-west-2:123456789012:certificate/abc-123 \
  --endpoint-configuration types=REGIONAL
```

For an edge-optimized custom domain:

```bash
# Create an edge-optimized custom domain (uses CloudFront)
aws apigateway create-domain-name \
  --domain-name "api.yourcompany.com" \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abc-123 \
  --endpoint-configuration types=EDGE
```

## Step 4: Create the Base Path Mapping

The base path mapping connects your custom domain to a specific API and stage.

Map the custom domain to your API's production stage:

```bash
# Map the domain to your API (REST API)
aws apigateway create-base-path-mapping \
  --domain-name "api.yourcompany.com" \
  --rest-api-id abc123def456 \
  --stage prod \
  --base-path ""  # Empty for root path, or "v1" for api.yourcompany.com/v1
```

You can map different base paths to different APIs, which is useful for versioning:

```bash
# Version 1 goes to the old API
aws apigateway create-base-path-mapping \
  --domain-name "api.yourcompany.com" \
  --rest-api-id old-api-id \
  --stage prod \
  --base-path "v1"

# Version 2 goes to the new API
aws apigateway create-base-path-mapping \
  --domain-name "api.yourcompany.com" \
  --rest-api-id new-api-id \
  --stage prod \
  --base-path "v2"
```

## Step 5: Create the Route 53 Alias Record

Finally, point your domain to API Gateway using a Route 53 alias record.

Get the target domain name from your custom domain configuration:

```bash
# Get the target domain name for Route 53
aws apigateway get-domain-name \
  --domain-name "api.yourcompany.com" \
  --query '{Regional: regionalDomainName, Edge: distributionDomainName}'
```

Create the alias record:

```bash
# For regional endpoints
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.yourcompany.com",
        "Type": "A",
        "AliasTarget": {
          "DNSName": "d-abc123.execute-api.us-west-2.amazonaws.com",
          "HostedZoneId": "Z1UJRXOUMOOFQ8",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

The `HostedZoneId` varies by region for regional endpoints. For edge-optimized endpoints, always use `Z2FDTNDATAQYW2` (the CloudFront hosted zone ID).

## Complete CloudFormation Template

Here's everything combined in a single CloudFormation template.

This template provisions the certificate, custom domain, mapping, and DNS record:

```yaml
Parameters:
  DomainName:
    Type: String
    Default: api.yourcompany.com
  HostedZoneId:
    Type: String
  ApiId:
    Type: String
  StageName:
    Type: String
    Default: prod

Resources:
  Certificate:
    Type: AWS::CertificateManager::Certificate
    Properties:
      DomainName: !Ref DomainName
      ValidationMethod: DNS
      DomainValidationOptions:
        - DomainName: !Ref DomainName
          HostedZoneId: !Ref HostedZoneId

  CustomDomain:
    Type: AWS::ApiGateway::DomainName
    DependsOn: Certificate
    Properties:
      DomainName: !Ref DomainName
      RegionalCertificateArn: !Ref Certificate
      EndpointConfiguration:
        Types:
          - REGIONAL

  BasePathMapping:
    Type: AWS::ApiGateway::BasePathMapping
    Properties:
      DomainName: !Ref CustomDomain
      RestApiId: !Ref ApiId
      Stage: !Ref StageName

  DNSRecord:
    Type: AWS::Route53::RecordSet
    Properties:
      HostedZoneId: !Ref HostedZoneId
      Name: !Ref DomainName
      Type: A
      AliasTarget:
        DNSName: !GetAtt CustomDomain.RegionalDomainName
        HostedZoneId: !GetAtt CustomDomain.RegionalHostedZoneId
        EvaluateTargetHealth: true
```

## HTTP API Custom Domains

If you're using API Gateway HTTP API (v2) instead of REST API, the setup is slightly different.

Create a custom domain for HTTP API:

```bash
# Create custom domain for HTTP API
aws apigatewayv2 create-domain-name \
  --domain-name "api.yourcompany.com" \
  --domain-name-configurations \
    CertificateArn=arn:aws:acm:us-west-2:123456789012:certificate/abc-123,EndpointType=REGIONAL

# Create API mapping (equivalent to base path mapping)
aws apigatewayv2 create-api-mapping \
  --domain-name "api.yourcompany.com" \
  --api-id abc123 \
  --stage '$default'
```

## Terraform Configuration

For Terraform users, here's the equivalent setup:

```hcl
# ACM Certificate
resource "aws_acm_certificate" "api" {
  domain_name       = "api.yourcompany.com"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# DNS validation record
resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.api.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  zone_id = var.hosted_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "api" {
  certificate_arn         = aws_acm_certificate.api.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# API Gateway custom domain
resource "aws_api_gateway_domain_name" "api" {
  domain_name              = "api.yourcompany.com"
  regional_certificate_arn = aws_acm_certificate_validation.api.certificate_arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# Base path mapping
resource "aws_api_gateway_base_path_mapping" "api" {
  api_id      = aws_api_gateway_rest_api.main.id
  stage_name  = aws_api_gateway_stage.prod.stage_name
  domain_name = aws_api_gateway_domain_name.api.domain_name
}

# Route 53 alias record
resource "aws_route53_record" "api" {
  zone_id = var.hosted_zone_id
  name    = "api.yourcompany.com"
  type    = "A"

  alias {
    name                   = aws_api_gateway_domain_name.api.regional_domain_name
    zone_id                = aws_api_gateway_domain_name.api.regional_zone_id
    evaluate_target_health = true
  }
}
```

## Testing Your Custom Domain

After everything is set up, verify it works:

```bash
# Check DNS resolution
dig api.yourcompany.com

# Test the API endpoint
curl -v https://api.yourcompany.com/your-resource

# Compare with the original endpoint
curl -v https://abc123.execute-api.us-west-2.amazonaws.com/prod/your-resource
```

Both URLs should return the same response. The custom domain just provides a cleaner, more professional entry point.

## Common Issues

- **Certificate stuck in "Pending"** - The DNS validation CNAME wasn't created correctly. Double-check the record name and value.
- **403 Forbidden** - The base path mapping is wrong. Verify the API ID and stage name.
- **DNS not resolving** - Route 53 alias record might need time to propagate. Wait a few minutes and try again.
- **Certificate in wrong region** - Edge-optimized domains need us-east-1 certificates. Regional domains need certificates in the same region.

For monitoring the health and latency of your custom domain endpoints, check out our guide on [API monitoring](https://oneuptime.com/blog/post/api-monitoring-best-practices/view).

## Wrapping Up

Setting up a custom domain on API Gateway requires a few coordinated steps - certificate, custom domain, base path mapping, and DNS record. The process is the same whether you're using REST API or HTTP API. The most common mistake is putting the ACM certificate in the wrong region, so double-check that first. Once configured, your API gets a professional URL that's easier to share and remember.
