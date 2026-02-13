# How to Automate ACM Certificate Validation with Route 53

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ACM, Route 53, DNS, Automation

Description: Learn how to fully automate ACM certificate DNS validation using Route 53, including Terraform, CloudFormation, and CLI approaches for zero-touch certificate provisioning.

---

Requesting an ACM certificate is fast, but validating it can be a manual bottleneck. DNS validation requires adding a specific CNAME record to your domain's DNS zone. If your DNS is in Route 53, you can automate the entire process - request the certificate, create the validation records, and wait for issuance without any manual intervention.

This is essential for CI/CD pipelines that provision infrastructure, auto-scaling environments that spin up new domains, and any setup where you want truly hands-off certificate management.

## The Manual Pain Point

Without automation, the certificate validation flow looks like this:

1. Request the certificate
2. Look up the validation CNAME record details
3. Go to Route 53 (or your DNS provider)
4. Manually create the CNAME record
5. Wait for validation to complete
6. Hope you didn't make a typo

For a single certificate, this is mildly annoying. For a certificate with 10 SANs, it's painful. For a multi-account setup provisioning certificates automatically, it's impossible without automation.

## CLI Automation Script

Here's a complete script that automates the entire flow using the AWS CLI.

```bash
#!/bin/bash
# Fully automated ACM certificate request and validation with Route 53
set -euo pipefail

DOMAIN="app.example.com"
SANS="api.example.com www.example.com"
HOSTED_ZONE_ID="Z1234567890ABC"
REGION="us-east-1"

echo "Requesting certificate for $DOMAIN..."

# Step 1: Request the certificate
CERT_ARN=$(aws acm request-certificate \
  --region "$REGION" \
  --domain-name "$DOMAIN" \
  --subject-alternative-names $SANS \
  --validation-method DNS \
  --query 'CertificateArn' \
  --output text)

echo "Certificate ARN: $CERT_ARN"

# Step 2: Wait for the validation options to become available
echo "Waiting for validation options..."
sleep 10

# Step 3: Get all validation records
VALIDATION_OPTIONS=$(aws acm describe-certificate \
  --region "$REGION" \
  --certificate-arn "$CERT_ARN" \
  --query 'Certificate.DomainValidationOptions[*].ResourceRecord' \
  --output json)

# Step 4: Build the Route 53 change batch
CHANGES="[]"
for row in $(echo "$VALIDATION_OPTIONS" | jq -c '.[]'); do
  NAME=$(echo "$row" | jq -r '.Name')
  VALUE=$(echo "$row" | jq -r '.Value')

  # Skip if already added (wildcard + apex share the same validation record)
  if echo "$CHANGES" | jq -e ".[] | select(.ResourceRecordSet.Name == \"$NAME\")" > /dev/null 2>&1; then
    continue
  fi

  CHANGE=$(jq -n \
    --arg name "$NAME" \
    --arg value "$VALUE" \
    '{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": $name,
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": $value}]
      }
    }')

  CHANGES=$(echo "$CHANGES" | jq ". + [$CHANGE]")
done

# Step 5: Create the DNS records
echo "Creating DNS validation records..."
CHANGE_BATCH=$(jq -n --argjson changes "$CHANGES" '{"Changes": $changes}')

aws route53 change-resource-record-sets \
  --hosted-zone-id "$HOSTED_ZONE_ID" \
  --change-batch "$CHANGE_BATCH"

# Step 6: Wait for certificate validation
echo "Waiting for certificate validation..."
aws acm wait certificate-validated \
  --region "$REGION" \
  --certificate-arn "$CERT_ARN"

echo "Certificate validated successfully!"
echo "ARN: $CERT_ARN"
```

## Terraform Approach

Terraform is the cleanest way to automate this. The key resource is `aws_route53_record` with a `for_each` loop over the certificate's validation options.

```hcl
# Request the certificate
resource "aws_acm_certificate" "main" {
  domain_name               = "example.com"
  subject_alternative_names = ["*.example.com", "app.example.com"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Automatically create validation records
resource "aws_route53_record" "validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = data.aws_route53_zone.main.zone_id
}

# Wait for validation
resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.validation : record.fqdn]

  timeouts {
    create = "10m"
  }
}

# Use the validated certificate
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = aws_acm_certificate_validation.main.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
```

A few things to note about the Terraform approach:

The `for_each` on `domain_validation_options` handles deduplication automatically. A wildcard certificate (`*.example.com`) and the apex (`example.com`) share the same validation record, and `for_each` with domain name as the key handles this correctly.

`allow_overwrite = true` prevents errors if the validation record already exists from a previous certificate.

The `timeouts` block on the validation resource gives DNS time to propagate. The default might be too short in some cases.

## CloudFormation Approach

CloudFormation can also automate this with the `AWS::CertificateManager::Certificate` resource and Route 53 validation.

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Automated ACM certificate with Route 53 validation

Parameters:
  DomainName:
    Type: String
    Default: example.com
  HostedZoneId:
    Type: AWS::Route53::HostedZone::Id

Resources:
  Certificate:
    Type: AWS::CertificateManager::Certificate
    Properties:
      DomainName: !Ref DomainName
      SubjectAlternativeNames:
        - !Sub "*.${DomainName}"
      ValidationMethod: DNS
      DomainValidationOptions:
        - DomainName: !Ref DomainName
          HostedZoneId: !Ref HostedZoneId
        - DomainName: !Sub "*.${DomainName}"
          HostedZoneId: !Ref HostedZoneId
      Tags:
        - Key: Environment
          Value: production

Outputs:
  CertificateArn:
    Value: !Ref Certificate
    Description: The ARN of the validated certificate
```

CloudFormation handles the Route 53 record creation and validation waiting automatically when you specify `DomainValidationOptions` with `HostedZoneId`. The stack won't complete until the certificate is validated.

## Cross-Account Validation

Sometimes the certificate is in one account but the Route 53 hosted zone is in another. This requires cross-account IAM access.

```hcl
# In the account with Route 53
resource "aws_iam_role" "cert_validation" {
  name = "cross-account-cert-validation"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::CERTIFICATE_ACCOUNT_ID:root"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "cert_validation" {
  name = "route53-record-management"
  role = aws_iam_role.cert_validation.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "route53:ChangeResourceRecordSets",
          "route53:GetChange"
        ]
        Resource = [
          "arn:aws:route53:::hostedzone/${var.hosted_zone_id}",
          "arn:aws:route53:::change/*"
        ]
      }
    ]
  })
}
```

In the certificate account, configure a provider that assumes the cross-account role.

```hcl
provider "aws" {
  alias  = "dns_account"
  region = "us-east-1"

  assume_role {
    role_arn = "arn:aws:iam::DNS_ACCOUNT_ID:role/cross-account-cert-validation"
  }
}

resource "aws_route53_record" "validation" {
  provider = aws.dns_account

  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.hosted_zone_id
}
```

## Python SDK Automation

For programmatic certificate provisioning in applications or custom tools.

```python
import boto3
import time

acm = boto3.client('acm', region_name='us-east-1')
route53 = boto3.client('route53')


def provision_certificate(domain, sans, hosted_zone_id):
    """Request and validate an ACM certificate automatically."""

    # Request the certificate
    response = acm.request_certificate(
        DomainName=domain,
        SubjectAlternativeNames=sans,
        ValidationMethod='DNS'
    )
    cert_arn = response['CertificateArn']
    print(f"Requested certificate: {cert_arn}")

    # Wait for validation options to be available
    time.sleep(10)

    # Get validation records
    cert_details = acm.describe_certificate(CertificateArn=cert_arn)
    validation_options = cert_details['Certificate']['DomainValidationOptions']

    # Create Route 53 validation records
    changes = []
    seen_names = set()

    for option in validation_options:
        record = option['ResourceRecord']
        if record['Name'] not in seen_names:
            seen_names.add(record['Name'])
            changes.append({
                'Action': 'UPSERT',
                'ResourceRecordSet': {
                    'Name': record['Name'],
                    'Type': record['Type'],
                    'TTL': 300,
                    'ResourceRecords': [{'Value': record['Value']}]
                }
            })

    route53.change_resource_record_sets(
        HostedZoneId=hosted_zone_id,
        ChangeBatch={'Changes': changes}
    )
    print(f"Created {len(changes)} validation records")

    # Wait for validation
    print("Waiting for validation...")
    waiter = acm.get_waiter('certificate_validated')
    waiter.wait(
        CertificateArn=cert_arn,
        WaiterConfig={'Delay': 15, 'MaxAttempts': 40}
    )

    print(f"Certificate validated: {cert_arn}")
    return cert_arn


# Usage
cert_arn = provision_certificate(
    domain='example.com',
    sans=['*.example.com', 'app.example.com'],
    hosted_zone_id='Z1234567890ABC'
)
```

## Validation Timing

DNS validation typically takes 5-30 minutes depending on DNS propagation. A few tips to speed things up:

- Use a low TTL (60 seconds) on the validation CNAME record
- Make sure Route 53 is the authoritative nameserver for your domain
- If you're transferring a domain, wait for DNS delegation to fully propagate before requesting certificates

For the full picture on ACM certificate management, see our guide on [requesting and managing ACM certificates](https://oneuptime.com/blog/post/2026-02-12-request-manage-ssl-tls-certificates-acm/view).

## Wrapping Up

Automating ACM validation with Route 53 turns certificate provisioning into a fully hands-off process. Whether you're using Terraform, CloudFormation, or custom scripts, the pattern is the same: request the certificate, create the validation CNAME records in Route 53, and wait for issuance. Combined with ACM's automatic renewal, you never need to think about certificates again - which is exactly how it should be.
