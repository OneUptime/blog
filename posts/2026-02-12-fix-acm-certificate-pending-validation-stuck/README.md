# How to Fix ACM Certificate 'Pending Validation' Stuck Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ACM, SSL, DNS, Troubleshooting

Description: Resolve AWS ACM certificates stuck in Pending Validation status by fixing DNS validation records, domain ownership issues, and CAA record conflicts.

---

You requested an SSL certificate from AWS Certificate Manager, and it's been sitting in "Pending Validation" for hours - or even days. This is one of the most common frustrations with ACM, and it almost always comes down to DNS configuration. Let's figure out what's going wrong and get that certificate issued.

## How ACM Validation Works

When you request a certificate, ACM needs to verify that you own the domain. There are two validation methods:

1. **DNS validation** - ACM gives you a CNAME record to add to your DNS. This is the recommended method because it supports automatic renewal.
2. **Email validation** - ACM sends emails to standard addresses like admin@yourdomain.com.

DNS validation is preferred, so we'll focus on that.

## Step 1: Check Your Validation Records

First, let's see what CNAME record ACM expects you to create.

```bash
# Get the details of your certificate including validation records

aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abc123 \
  --query 'Certificate.DomainValidationOptions'
```

The output shows each domain and the required CNAME record. It looks something like this:

```json
[
  {
    "DomainName": "example.com",
    "ValidationDomain": "example.com",
    "ValidationStatus": "PENDING_VALIDATION",
    "ResourceRecord": {
      "Name": "_abc123.example.com.",
      "Type": "CNAME",
      "Value": "_def456.acm-validations.aws."
    },
    "ValidationMethod": "DNS"
  }
]
```

You need to create a CNAME record where the `Name` points to the `Value`.

## Step 2: Verify the DNS Record Exists

After adding the record, check if it's actually resolving.

```bash
# Check if the ACM validation CNAME record is resolving
dig _abc123.example.com CNAME +short
```

If you get no output, the record isn't propagated yet or wasn't created correctly. Common mistakes include:

- **Adding the full name with the domain suffix**: If your DNS provider auto-appends the domain, you might end up with `_abc123.example.com.example.com`. Just use `_abc123` as the name if your provider appends the zone automatically.
- **Including the trailing dot**: Some DNS providers don't want the trailing dot. Try removing it.
- **Wrong record type**: Make sure it's a CNAME, not a TXT or A record.

## Step 3: Fix Route 53 Records

If you're using Route 53, ACM can create the records automatically. But if something went wrong, here's how to add them manually.

```bash
# Create the validation CNAME record in Route 53
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "_abc123.example.com",
          "Type": "CNAME",
          "TTL": 300,
          "ResourceRecords": [
            {
              "Value": "_def456.acm-validations.aws"
            }
          ]
        }
      }
    ]
  }'
```

In the ACM console, you can use **Create records in Route 53** when the button is available. You can't programmatically ask ACM to create the Route 53 records for you, but you can retrieve the records with the AWS CLI and create them with Route 53.

```bash
# Print the ACM validation records to create in Route 53
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abc123 \
  --query 'Certificate.DomainValidationOptions[].ResourceRecord' \
  --output json
```

## Step 4: Check for CAA Record Conflicts

Certificate Authority Authorization (CAA) records specify which certificate authorities are allowed to issue certificates for your domain. If you have a CAA record that doesn't include Amazon, ACM can't issue the certificate.

```bash
# Check CAA records for your domain
dig example.com CAA +short
```

If you see CAA records that don't include at least one Amazon CA value such as `amazon.com`, `amazontrust.com`, `awstrust.com`, or `amazonaws.com`, you need to add one.

```bash
# Add a CAA record allowing Amazon to issue certificates
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "example.com",
          "Type": "CAA",
          "TTL": 300,
          "ResourceRecords": [
            {"Value": "0 issue \"amazon.com\""},
            {"Value": "0 issue \"amazontrust.com\""},
            {"Value": "0 issue \"awstrust.com\""},
            {"Value": "0 issue \"amazonaws.com\""}
          ]
        }
      }
    ]
  }'
```

If you have no CAA records at all, you're fine - that means any CA can issue certificates.

## Step 5: Wildcard Certificate Domains

If you requested a wildcard certificate (like `*.example.com`), ACM creates the validation CNAME under the base domain, such as `_abc123.example.com`. ACM requires the validation records shown in `DomainValidationOptions`; wildcard names and their base domains often share the same validation record.

For a certificate covering both `example.com` and `*.example.com`, you might need only one CNAME record, but check the `DomainValidationOptions` to be sure. Also remember that `*.example.com` protects subdomains like `www.example.com`, not the bare domain `example.com`.

```bash
# Check all domains and their validation status on the certificate
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abc123 \
  --query 'Certificate.DomainValidationOptions[].{Domain: DomainName, Status: ValidationStatus, Record: ResourceRecord.Name}'
```

## Step 6: Multi-Domain Certificates

If your certificate covers multiple domains (e.g., `example.com`, `api.example.com`, `app.example.com`), each domain needs its own validation record. If even one domain fails validation, the entire certificate stays in `PENDING_VALIDATION`.

Check each domain's status individually and make sure all CNAME records are in place.

## Step 7: Region Mismatch for CloudFront

A really common gotcha: CloudFront requires certificates to be in `us-east-1`. If you created your certificate in a different region, CloudFront won't see it. The certificate might validate successfully but you won't be able to use it.

```bash
# Request a certificate specifically in us-east-1 for CloudFront
aws acm request-certificate \
  --domain-name example.com \
  --subject-alternative-names "*.example.com" \
  --validation-method DNS \
  --region us-east-1
```

## Step 8: Wait (But Not Too Long)

After everything is configured correctly, DNS validation typically completes within 30 minutes. However, if DNS propagation is slow, it can take up to 72 hours. If it's been more than 72 hours and everything looks correct, something is definitely wrong.

You can check the certificate status periodically.

```bash
# Poll the certificate status until it changes
aws acm wait certificate-validated \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abc123
```

This command blocks until the certificate is validated or the AWS CLI waiter times out. The waiter polls every 60 seconds and exits with an error after several failed checks, so rerun it later if validation is still pending.

## When All Else Fails

If you've verified everything and the certificate still won't validate:

1. Delete the certificate and request a new one. Sometimes ACM gets stuck.
2. Try email validation instead of DNS validation as a workaround.
3. Check if there's a DNSSEC issue - if your domain uses DNSSEC and it's misconfigured, ACM can't validate.
4. Contact AWS Support. They can look at the internal state of the validation process.

```bash
# Delete a stuck certificate and start fresh
aws acm delete-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/abc123

# Request a new one
aws acm request-certificate \
  --domain-name example.com \
  --validation-method DNS
```

## Quick Reference Checklist

1. Verify the CNAME record matches exactly what ACM expects
2. Check that the CNAME resolves with `dig`
3. Look for CAA record conflicts
4. For wildcard certs, check the validation record ACM generated and whether the bare domain is also included
5. For multi-domain certs, verify all domains have records
6. For CloudFront, confirm the cert is in us-east-1
7. Wait at least 30 minutes after DNS changes
8. If stuck for 72+ hours, delete and recreate

Getting SSL certificates working is a prerequisite for any production service. Once you're past this hurdle, make sure you also set up [monitoring to track certificate expiration](https://oneuptime.com/blog/post/2025-09-23-ssl-certificate-monitoring-with-oneuptime/view) so you don't get caught off guard by renewal failures.
