# How to Transfer a Domain to Route 53

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Route 53, DNS, Domain Transfer

Description: Step-by-step guide to transferring your domain name registration to Amazon Route 53, including preparation, authorization codes, and DNS migration.

---

Transferring a domain to Route 53 sounds intimidating, but it's actually one of the smoother registrar transfer experiences you'll find. Whether you're consolidating all your infrastructure under AWS or just tired of your current registrar's clunky interface, this guide walks you through the entire process from start to finish.

## Why Transfer to Route 53?

There are a few solid reasons to move your domain registration to Route 53. First, you get tight integration with other AWS services - automatic alias records for CloudFront, S3, ALB, and more. Second, Route 53's DNS is incredibly fast and reliable, backed by AWS's global anycast network. Third, managing everything in one console reduces operational overhead.

That said, the DNS hosting and domain registration are two separate things in Route 53. You can use Route 53 for DNS without transferring your registration, and vice versa. But having both in one place simplifies life considerably.

## Prerequisites Before You Start

Before kicking off the transfer, you need to handle a few things at your current registrar:

1. **Unlock the domain** - Most registrars lock domains by default to prevent unauthorized transfers. You'll need to disable this lock.
2. **Get the authorization code** - Also called an EPP code or transfer key. Your current registrar provides this.
3. **Verify contact information** - Make sure the email address on the domain's WHOIS record is one you can access. AWS sends confirmation emails there.
4. **Check the domain age** - ICANN rules say domains must be at least 60 days old before transfer. Same goes if you recently transferred it.
5. **Disable WHOIS privacy temporarily** - Some registrars require this during transfer. Check with yours.

## Step 1: Set Up Your Hosted Zone First

Before you transfer the registration, create a hosted zone for the domain. This lets you set up all your DNS records ahead of time so there's zero downtime during the transfer.

Here's how to create a hosted zone using the AWS CLI:

```bash
# Create a hosted zone for your domain
aws route53 create-hosted-zone \
  --name example.com \
  --caller-reference "transfer-$(date +%s)"
```

This returns a set of four nameservers. Write them down - you'll need them later.

```bash
# Get the nameserver records for your new hosted zone
aws route53 get-hosted-zone \
  --id /hostedzone/Z1234567890ABC \
  --query 'DelegationSet.NameServers'
```

Now replicate all your existing DNS records in the Route 53 hosted zone. You can export them from your current provider and import them.

Here's a JSON file to create records in bulk:

```json
{
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "example.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [
          {"Value": "203.0.113.10"}
        ]
      }
    },
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.example.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [
          {"Value": "example.com"}
        ]
      }
    }
  ]
}
```

Apply the batch with the CLI:

```bash
# Apply all DNS record changes in one batch
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://dns-records.json
```

## Step 2: Update Nameservers at Your Current Registrar

Before initiating the transfer, point your domain's nameservers to the Route 53 ones you got in Step 1. This way, DNS resolution switches over to Route 53 immediately, and the actual registration transfer can take its time without affecting your site.

Log into your current registrar and update the nameservers to something like:

```
ns-1234.awsdns-56.org
ns-789.awsdns-01.net
ns-456.awsdns-23.co.uk
ns-012.awsdns-45.com
```

Lower your TTL values to 300 seconds (5 minutes) a day or two before making this change. That way, the old cached records expire quickly and clients pick up the new nameservers faster.

## Step 3: Initiate the Transfer in Route 53

Now start the actual transfer from the AWS console or CLI.

```bash
# Initiate the domain transfer to Route 53
aws route53domains transfer-domain \
  --domain-name example.com \
  --duration-in-years 1 \
  --auth-code "YOUR_EPP_AUTH_CODE" \
  --admin-contact file://contact.json \
  --registrant-contact file://contact.json \
  --tech-contact file://contact.json \
  --auto-renew
```

The contact JSON file looks like this:

```json
{
  "FirstName": "John",
  "LastName": "Doe",
  "ContactType": "COMPANY",
  "OrganizationName": "Example Corp",
  "AddressLine1": "123 Main St",
  "City": "Seattle",
  "State": "WA",
  "CountryCode": "US",
  "ZipCode": "98101",
  "PhoneNumber": "+1.2065551234",
  "Email": "admin@example.com"
}
```

## Step 4: Confirm the Transfer

After initiating the transfer, a few things happen:

1. AWS sends a confirmation email to the registrant email address. You must click the approval link.
2. Your current registrar may also send a confirmation. Some registrars auto-approve after 5 days if you don't explicitly reject it.
3. The transfer typically completes in 5-7 days, though some TLDs are faster.

You can check the status anytime:

```bash
# Check the transfer status of your domain
aws route53domains get-domain-detail \
  --domain-name example.com
```

Or list all pending operations:

```bash
# List all domain operations including pending transfers
aws route53domains list-operations \
  --sort-by SubmittedDate \
  --sort-order DESC
```

## Step 5: Verify Everything After Transfer

Once the transfer completes, verify your setup.

```bash
# Verify DNS resolution is working correctly
dig example.com NS +short

# Check that your A record resolves properly
dig example.com A +short

# Verify the domain is registered with Route 53
aws route53domains get-domain-detail \
  --domain-name example.com \
  --query 'Nameservers'
```

## Common Issues and Fixes

**Transfer stuck in pending**: This usually means the confirmation email hasn't been approved. Check your spam folder. You can resend the confirmation from the Route 53 console.

**Domain locked error**: Go back to your current registrar and make sure the transfer lock (also called clientTransferProhibited) is disabled.

**Invalid auth code**: Authorization codes expire. If your transfer fails due to an invalid code, request a fresh one from your current registrar.

**DNS resolution breaks during transfer**: This shouldn't happen if you updated nameservers first (Step 2). If it does, check that your Route 53 hosted zone has all the necessary records.

## Monitoring Your Domain After Transfer

Once everything is settled, set up monitoring to make sure your domain stays healthy. You can use Route 53 health checks to monitor your endpoints, and if you're looking for a more comprehensive monitoring solution, consider tools like [OneUptime](https://oneuptime.com/blog/post/aws-route-53-health-checks/view) that can track DNS resolution, SSL certificates, and endpoint availability all in one place.

## Cost Considerations

Route 53 charges for domain registration (varies by TLD - .com is about $14/year), hosted zones ($0.50/month per zone), and DNS queries ($0.40 per million for the first billion). The transfer itself just costs one year of renewal at the registration price. There's no separate transfer fee.

## Wrapping Up

The domain transfer process to Route 53 is straightforward if you follow the steps in order: set up your hosted zone and records first, update nameservers, then transfer the registration. This two-phase approach ensures zero DNS downtime during the migration. Once everything's in Route 53, you get the benefit of managing your entire infrastructure - DNS, hosting, CDN, load balancers - from a single AWS account.
