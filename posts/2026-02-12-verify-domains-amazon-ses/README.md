# How to Verify Domains in Amazon SES

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SES, Email, DNS, Domain Verification

Description: Complete walkthrough of domain verification in Amazon SES, including DNS record configuration, TXT records, SPF setup, and troubleshooting common verification issues.

---

Before Amazon SES will let you send email from your domain, you need to prove you own it. Domain verification is SES's way of preventing email spoofing - if anyone could send email as `@yourcompany.com` without verification, the internet would be an even more dangerous place than it already is.

Verifying a domain (rather than individual email addresses) is the recommended approach for production use. It lets you send from any address at that domain - `noreply@example.com`, `support@example.com`, `billing@example.com` - without verifying each one separately.

## Step 1: Initiate Domain Verification

Start the verification process:

```bash
# Verify a domain with SES
aws ses verify-domain-identity \
  --domain "example.com" \
  --region us-east-1
```

This returns a verification token - a string you'll add as a TXT record in your DNS. The output looks something like:

```json
{
    "VerificationToken": "pmBGN/7MjnfhTKUZ06Enqq1PeGUaOkw8lGhcfwefcHU="
}
```

## Step 2: Add the TXT Record to DNS

Add the verification token as a TXT record in your domain's DNS settings.

If you're using Route 53:

```bash
# Add the verification TXT record
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "_amazonses.example.com",
        "Type": "TXT",
        "TTL": 1800,
        "ResourceRecords": [{
          "Value": "\"pmBGN/7MjnfhTKUZ06Enqq1PeGUaOkw8lGhcfwefcHU=\""
        }]
      }
    }]
  }'
```

Note the quotes around the TXT value - TXT records need to be enclosed in double quotes in the DNS record. The record name format is `_amazonses.yourdomain.com`.

If you're using a different DNS provider (Cloudflare, GoDaddy, Namecheap, etc.), add the TXT record through their control panel:
- **Host/Name**: `_amazonses` (some providers want `_amazonses.example.com`)
- **Type**: TXT
- **Value**: The verification token
- **TTL**: 1800 (or the lowest your provider allows)

## Step 3: Set Up SPF

SPF (Sender Policy Framework) tells receiving mail servers which IP addresses are authorized to send email for your domain. This helps prevent your emails from being flagged as spam.

```bash
# Add or update the SPF record
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "example.com",
        "Type": "TXT",
        "TTL": 3600,
        "ResourceRecords": [{
          "Value": "\"v=spf1 include:amazonses.com ~all\""
        }]
      }
    }]
  }'
```

If you already have an SPF record, append `include:amazonses.com` to it rather than creating a new one. DNS only allows one SPF record per domain. For example:

```
"v=spf1 include:amazonses.com include:_spf.google.com ~all"
```

## Step 4: Wait for Verification

DNS propagation takes time. SES checks periodically, and verification usually completes within a few minutes to 72 hours:

```bash
# Check verification status
aws ses get-identity-verification-attributes \
  --identities "example.com" \
  --region us-east-1

# The output shows the current status
# "VerificationStatus": "Pending" or "Success"
```

You can also verify DNS propagation independently:

```bash
# Check if the TXT record has propagated
dig TXT _amazonses.example.com +short

# Check SPF record
dig TXT example.com +short
```

## Step 5: Set Up DMARC

DMARC ties SPF and DKIM together and tells receiving servers what to do when authentication fails. It's highly recommended:

```bash
# Add a DMARC record
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "_dmarc.example.com",
        "Type": "TXT",
        "TTL": 3600,
        "ResourceRecords": [{
          "Value": "\"v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@example.com; pct=100\""
        }]
      }
    }]
  }'
```

DMARC policy options:
- `p=none`: Monitor only (report but don't block failing emails)
- `p=quarantine`: Send failing emails to spam
- `p=reject`: Reject failing emails entirely

Start with `p=none` to monitor your email flow, then gradually move to `quarantine` and eventually `reject` as you confirm everything is configured correctly.

## Step 6: Verify Subdomains (Optional)

You can verify subdomains independently if you want to isolate different types of email:

```bash
# Verify a subdomain for marketing emails
aws ses verify-domain-identity \
  --domain "marketing.example.com" \
  --region us-east-1

# Verify a subdomain for transactional emails
aws ses verify-domain-identity \
  --domain "mail.example.com" \
  --region us-east-1
```

Using subdomains is a good practice because it isolates reputation. If your marketing emails get spam complaints, it won't affect the deliverability of your transactional emails.

## Step 7: Use SES v2 API for Domain Verification

The newer SES v2 API provides a more streamlined experience:

```bash
# Create an email identity (domain) using SES v2
aws sesv2 create-email-identity \
  --email-identity "example.com" \
  --region us-east-1

# This automatically sets up DKIM as well
# Get the DKIM tokens to add to DNS
aws sesv2 get-email-identity \
  --email-identity "example.com" \
  --region us-east-1 \
  --query '{
    VerificationStatus: VerificationStatus,
    DkimAttributes: DkimAttributes
  }'
```

The v2 API combines domain verification and DKIM setup into a single call, which is more convenient.

## Troubleshooting Verification Issues

Common problems and fixes:

**Verification stuck on "Pending":**

```bash
# Verify the DNS record exists
dig TXT _amazonses.example.com +short

# If nothing returned, the record hasn't propagated yet
# Try a different DNS resolver
dig @8.8.8.8 TXT _amazonses.example.com +short
```

**Multiple TXT records conflicting:**
Some DNS providers don't handle multiple TXT records on the same hostname well. If you have both an SPF record and the SES verification token as TXT records on the root domain, make sure they're separate records, not combined.

**Wrong record name:**
The record should be `_amazonses.example.com`, not `_amazonses` alone (though some DNS providers automatically append the domain).

**Verification expired:**
If you remove the DNS record and SES re-checks, it will revoke verification. Keep the TXT record in place permanently.

## Listing and Managing Verified Identities

```bash
# List all verified identities
aws ses list-identities --identity-type Domain

# Get detailed attributes for all identities
aws ses get-identity-verification-attributes \
  --identities $(aws ses list-identities --identity-type Domain --query 'Identities[]' --output text)

# Delete a verified identity you no longer need
aws ses delete-identity --identity "old-domain.com"
```

## Custom MAIL FROM Domain

For even better deliverability, set up a custom MAIL FROM domain. By default, SES uses `amazonses.com` as the MAIL FROM domain, which can affect SPF alignment:

```bash
# Set a custom MAIL FROM domain
aws ses set-identity-mail-from-domain \
  --identity "example.com" \
  --mail-from-domain "bounce.example.com" \
  --behavior-on-mx-failure RejectMessage

# Add MX record for the MAIL FROM domain
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "bounce.example.com",
        "Type": "MX",
        "TTL": 3600,
        "ResourceRecords": [{
          "Value": "10 feedback-smtp.us-east-1.amazonses.com"
        }]
      }
    }, {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "bounce.example.com",
        "Type": "TXT",
        "TTL": 3600,
        "ResourceRecords": [{
          "Value": "\"v=spf1 include:amazonses.com ~all\""
        }]
      }
    }]
  }'
```

Domain verification is the foundation of everything you do with SES. Get it right - including SPF, DKIM, and DMARC - and your emails will have the best possible chance of landing in inboxes rather than spam folders.
