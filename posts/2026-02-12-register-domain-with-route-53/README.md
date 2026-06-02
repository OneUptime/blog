# How to Register a Domain with Route 53

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Route 53, DNS, Domain

Description: A complete guide to registering domain names through AWS Route 53, covering the registration process, domain privacy, auto-renewal, DNS configuration, and domain transfer from other registrars.

---

Registering your domain directly through Route 53 has a nice advantage: it automatically creates a hosted zone and configures the name servers for you. No manual delegation needed, no waiting for name server changes to propagate. Your domain is ready to use as soon as registration completes.

That said, Route 53 isn't always the cheapest registrar, and it doesn't support every TLD. Let's walk through the process and cover the things you should know before committing.

## Checking Domain Availability

Before registering, check if your desired domain is available.

```bash
# Check if a domain is available

aws route53domains check-domain-availability \
  --region us-east-1 \
  --domain-name example.com

# Check availability of multiple variations
for domain in example.com example.io example.dev example.app; do
  result=$(aws route53domains check-domain-availability \
    --region us-east-1 \
    --domain-name "$domain" \
    --query 'Availability' \
    --output text)
  echo "$domain: $result"
done
```

The response can be AVAILABLE, AVAILABLE_RESERVED, AVAILABLE_PREORDER, UNAVAILABLE, UNAVAILABLE_PREMIUM, UNAVAILABLE_RESTRICTED, RESERVED, DONT_KNOW, INVALID_NAME_FOR_TLD, or PENDING. You can register only domains marked AVAILABLE.

## Getting the Price

Domain prices vary by TLD. Check the price before registering.

```bash
# Get registration and renewal prices
aws route53domains list-prices \
  --region us-east-1 \
  --tld com \
  --query 'Prices[0].{Registration:RegistrationPrice.Price,Renewal:RenewalPrice.Price,Transfer:TransferPrice.Price,Currency:RegistrationPrice.Currency}'
```

Route 53 pricing changes over time, so use `list-prices` or the Route 53 pricing page for the current amount before you register. Some TLDs like .io or .dev are more expensive than .com. Compare with other registrars if price is a concern.

## Registering a Domain

Here's the registration command. You'll need to provide contact information for the domain's WHOIS records.

```bash
# Register a domain
aws route53domains register-domain \
  --region us-east-1 \
  --domain-name example.com \
  --duration-in-years 1 \
  --auto-renew \
  --admin-contact '{
    "FirstName": "Jane",
    "LastName": "Doe",
    "ContactType": "COMPANY",
    "OrganizationName": "My Company Inc",
    "AddressLine1": "123 Main St",
    "City": "San Francisco",
    "State": "CA",
    "CountryCode": "US",
    "ZipCode": "94105",
    "PhoneNumber": "+1.4155551234",
    "Email": "admin@mycompany.com"
  }' \
  --registrant-contact '{
    "FirstName": "Jane",
    "LastName": "Doe",
    "ContactType": "COMPANY",
    "OrganizationName": "My Company Inc",
    "AddressLine1": "123 Main St",
    "City": "San Francisco",
    "State": "CA",
    "CountryCode": "US",
    "ZipCode": "94105",
    "PhoneNumber": "+1.4155551234",
    "Email": "admin@mycompany.com"
  }' \
  --tech-contact '{
    "FirstName": "Jane",
    "LastName": "Doe",
    "ContactType": "COMPANY",
    "OrganizationName": "My Company Inc",
    "AddressLine1": "123 Main St",
    "City": "San Francisco",
    "State": "CA",
    "CountryCode": "US",
    "ZipCode": "94105",
    "PhoneNumber": "+1.4155551234",
    "Email": "admin@mycompany.com"
  }' \
  --privacy-protect-admin-contact \
  --privacy-protect-registrant-contact \
  --privacy-protect-tech-contact
```

The `--privacy-protect-*` flags enable WHOIS privacy, which replaces your personal information in public WHOIS lookups with generic registrar information. Always enable this unless you have a specific reason not to.

Registration typically completes within a few minutes for popular TLDs like .com, but some TLDs take longer.

## Checking Registration Status

```bash
# Check the status of a domain registration
aws route53domains get-domain-detail \
  --region us-east-1 \
  --domain-name example.com \
  --query '{Status:StatusList,AutoRenew:AutoRenew,Expiry:ExpirationDate,NameServers:Nameservers[*].Name}'

# List all domains in your account
aws route53domains list-domains \
  --region us-east-1 \
  --query 'Domains[*].{Domain:DomainName,AutoRenew:AutoRenew,Expiry:Expiry}' \
  --output table
```

## Auto-Renewal

Always enable auto-renewal on production domains. Forgetting to renew a domain can take down your entire service, and domain recovery after expiration is a painful process.

```bash
# Enable auto-renewal
aws route53domains enable-domain-auto-renew \
  --region us-east-1 \
  --domain-name example.com

# Disable auto-renewal (for domains you're sunsetting)
aws route53domains disable-domain-auto-renew \
  --region us-east-1 \
  --domain-name old-domain.com
```

## Domain Transfer Lock

Transfer lock prevents unauthorized domain transfers. It's enabled by default for most TLDs and should stay enabled unless you're actively transferring the domain.

```bash
# Enable transfer lock
aws route53domains enable-domain-transfer-lock \
  --region us-east-1 \
  --domain-name example.com

# Check if transfer lock is enabled
aws route53domains get-domain-detail \
  --region us-east-1 \
  --domain-name example.com \
  --query 'StatusList'
```

A locked domain includes `clientTransferProhibited` in its status list.

## Transferring a Domain to Route 53

If you already have a domain at another registrar, you can transfer it to Route 53.

```bash
# Step 1: Get the transfer authorization code from your current registrar
# (This is done through the registrar's website)

# Step 2: Disable transfer lock at the current registrar

# Step 3: Initiate the transfer
aws route53domains transfer-domain \
  --region us-east-1 \
  --domain-name example.com \
  --duration-in-years 1 \
  --auto-renew \
  --auth-code "YourAuthCodeHere" \
  --admin-contact file://admin-contact.json \
  --registrant-contact file://registrant-contact.json \
  --tech-contact file://tech-contact.json \
  --privacy-protect-admin-contact \
  --privacy-protect-registrant-contact \
  --privacy-protect-tech-contact
```

Use the same contact object format shown in the registration example for the contact JSON files.

Domain transfers can take 5-7 days because the old registrar has a window to object. Some registrars process it faster if you approve the transfer through their confirmation email.

Important: your domain usually continues to work normally during the transfer if DNS remains active. If your current registrar also provides DNS, move DNS to Route 53 or another DNS provider before the transfer so the old registrar can't interrupt DNS service.

## Transferring Away from Route 53

If you want to move your domain to another registrar.

```bash
# Disable transfer lock
aws route53domains disable-domain-transfer-lock \
  --region us-east-1 \
  --domain-name example.com

# Get the authorization code
aws route53domains retrieve-domain-auth-code \
  --region us-east-1 \
  --domain-name example.com
```

Use the authorization code at the new registrar to initiate the transfer.

## Updating Contact Information

If your company address or contact details change, update the domain's contact information.

```bash
# Update registrant contact
aws route53domains update-domain-contact \
  --region us-east-1 \
  --domain-name example.com \
  --registrant-contact '{
    "FirstName": "Jane",
    "LastName": "Doe",
    "ContactType": "COMPANY",
    "OrganizationName": "New Company Name Inc",
    "AddressLine1": "456 New St",
    "City": "New York",
    "State": "NY",
    "CountryCode": "US",
    "ZipCode": "10001",
    "PhoneNumber": "+1.2125551234",
    "Email": "admin@newcompany.com"
  }'
```

Be careful with registrant contact changes - ICANN requires email verification for registrant changes, and some changes trigger a 60-day transfer lock.

## Terraform Configuration

```hcl
resource "aws_route53domains_registered_domain" "main" {
  domain_name = "example.com"
  auto_renew  = true

  admin_contact {
    first_name        = "Jane"
    last_name         = "Doe"
    contact_type      = "COMPANY"
    organization_name = "My Company Inc"
    address_line_1    = "123 Main St"
    city              = "San Francisco"
    state             = "CA"
    country_code      = "US"
    zip_code          = "94105"
    phone_number      = "+1.4155551234"
    email             = "admin@mycompany.com"
  }

  admin_privacy    = true
  registrant_privacy = true
  tech_privacy     = true
}
```

Note that `aws_route53domains_registered_domain` adopts and manages domains that already exist in the AWS account. If you want Terraform to handle registration lifecycle, use `aws_route53domains_domain` instead.

## DNS Configuration After Registration

When you register a domain through Route 53, it automatically creates a hosted zone and sets the name servers. You can immediately start adding records.

```bash
# Find the hosted zone that was auto-created
aws route53 list-hosted-zones-by-name \
  --dns-name example.com \
  --query 'HostedZones[0].Id'

# Start adding records
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789ABCDEFGHIJ \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "my-alb.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

For help setting up your hosted zone records, see https://oneuptime.com/blog/post/2026-02-12-route-53-public-hosted-zones/view.

## Best Practices

1. **Always enable auto-renewal** on production domains. Set a calendar reminder to verify it's active quarterly.
2. **Always enable transfer lock.** Only disable it when you're intentionally transferring.
3. **Always enable WHOIS privacy.** Your personal information has no business being in a public database.
4. **Register domains in a dedicated AWS account.** This limits who can accidentally modify or transfer them.
5. **Set up billing alerts.** Domain renewal charges can be unexpected if you have many domains.
6. **Keep contact email addresses current.** ICANN verification emails go to the registrant email - if that bounces, your domain can be suspended.

Registering through Route 53 is clean and simple, and the automatic hosted zone setup saves you a step. Just be sure to compare pricing with other registrars if you're registering many domains, as Route 53 isn't always the cheapest option for every TLD.
