# How to Delegate a DNS Subdomain to Google Cloud DNS from an External Registrar

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud DNS, DNS Delegation, Networking, Domain Management

Description: Step-by-step guide to delegating a DNS subdomain from an external registrar like GoDaddy or Namecheap to Google Cloud DNS for granular management.

---

When you manage your root domain at an external registrar but want to use Google Cloud DNS for a specific subdomain, delegation is the way to go. This pattern is common in enterprise setups where the parent domain lives with a traditional registrar or another DNS provider, but the engineering team needs full control over a subdomain like `dev.example.com` or `cloud.example.com` through GCP.

In this post, I will show you exactly how to set up subdomain delegation from an external registrar to Google Cloud DNS.

## How DNS Delegation Works

DNS delegation is straightforward. When a resolver queries for `app.cloud.example.com`, it first asks the authoritative nameservers for `example.com`. If those nameservers have NS records pointing `cloud.example.com` to a different set of nameservers (in this case, Google Cloud DNS), the resolver follows those NS records and asks Google Cloud DNS for the answer.

The key piece is the NS record set at the parent domain level. You are telling the world: "For anything under `cloud.example.com`, go ask these Google Cloud DNS nameservers instead."

## Prerequisites

You will need:

- Access to your external registrar's DNS management panel
- A GCP project with the Cloud DNS API enabled
- The `dns.admin` role or equivalent permissions
- The `gcloud` CLI installed

## Step 1: Create a Public Managed Zone in Cloud DNS

First, create a managed zone in Cloud DNS for the subdomain you want to manage.

```bash
# Create a public managed zone for the subdomain
gcloud dns managed-zones create cloud-subdomain \
    --dns-name=cloud.example.com. \
    --description="Managed zone for cloud.example.com subdomain" \
    --visibility=public \
    --project=my-project
```

After creating the zone, Cloud DNS automatically assigns nameservers. You need to grab these because you will configure them at the registrar.

```bash
# Get the nameservers assigned to the new zone
gcloud dns managed-zones describe cloud-subdomain \
    --project=my-project \
    --format="value(nameServers)"
```

This will output something like:

```
ns-cloud-a1.googledomains.com.
ns-cloud-a2.googledomains.com.
ns-cloud-a3.googledomains.com.
ns-cloud-a4.googledomains.com.
```

Write these down. You will need them in the next step.

## Step 2: Add NS Records at Your External Registrar

Now log in to your external registrar - GoDaddy, Namecheap, Cloudflare, Route 53, or wherever your parent domain is hosted. You need to create NS records for the subdomain that point to the Google Cloud DNS nameservers.

Here is what you need to add in the DNS settings for `example.com`:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| NS | cloud | ns-cloud-a1.googledomains.com | 3600 |
| NS | cloud | ns-cloud-a2.googledomains.com | 3600 |
| NS | cloud | ns-cloud-a3.googledomains.com | 3600 |
| NS | cloud | ns-cloud-a4.googledomains.com | 3600 |

The exact steps vary by registrar, but the concept is the same. In the "Name" or "Host" field, enter just the subdomain prefix (e.g., `cloud`), not the full domain. The registrar appends the parent domain automatically.

### Example: Namecheap

In Namecheap, go to Domain List, click Manage next to your domain, then Advanced DNS. Click "Add New Record", select NS as the type, enter `cloud` as the host, and paste each nameserver value one at a time.

### Example: Cloudflare

In Cloudflare, go to DNS settings for your domain. Click "Add record", select NS, enter `cloud` as the name, and enter the Google nameserver as the value. Repeat for all four nameservers.

## Step 3: Add DNS Records in Cloud DNS

Now that delegation is set up, you can add records to your Cloud DNS zone and they will be resolvable by anyone on the internet.

```bash
# Add an A record for the subdomain root
gcloud dns record-sets create cloud.example.com. \
    --zone=cloud-subdomain \
    --type=A \
    --ttl=300 \
    --rrdatas="34.120.10.5" \
    --project=my-project

# Add a CNAME record for a service under the subdomain
gcloud dns record-sets create api.cloud.example.com. \
    --zone=cloud-subdomain \
    --type=CNAME \
    --ttl=300 \
    --rrdatas="my-api.my-project.appspot.com." \
    --project=my-project

# Add an MX record if needed
gcloud dns record-sets create cloud.example.com. \
    --zone=cloud-subdomain \
    --type=MX \
    --ttl=300 \
    --rrdatas="10 mail.cloud.example.com." \
    --project=my-project
```

## Step 4: Verify the Delegation

DNS delegation can take anywhere from a few minutes to 48 hours to propagate, depending on the TTL of existing records. In practice, it usually takes less than an hour.

You can verify delegation is working using `dig`.

```bash
# Check that the NS records are visible for the subdomain
dig NS cloud.example.com

# Verify that your A record resolves correctly
dig A cloud.example.com

# Trace the full resolution path to confirm delegation
dig +trace cloud.example.com
```

The `+trace` flag is particularly useful. It shows you the full resolution chain, and you should see the query being referred from the parent domain's nameservers to the Google Cloud DNS nameservers.

If you want to query the Google Cloud DNS nameservers directly to bypass caching:

```bash
# Query a specific Google Cloud DNS nameserver directly
dig @ns-cloud-a1.googledomains.com cloud.example.com A
```

## Automating with Terraform

For a reproducible setup, here is the Terraform configuration.

```hcl
# Create the managed zone for the delegated subdomain
resource "google_dns_managed_zone" "cloud_subdomain" {
  name        = "cloud-subdomain"
  dns_name    = "cloud.example.com."
  description = "Managed zone for cloud.example.com subdomain"
  visibility  = "public"
}

# Add an A record for the subdomain root
resource "google_dns_record_set" "cloud_a" {
  name         = "cloud.example.com."
  managed_zone = google_dns_managed_zone.cloud_subdomain.name
  type         = "A"
  ttl          = 300
  rrdatas      = ["34.120.10.5"]
}

# Add a CNAME for a service endpoint
resource "google_dns_record_set" "api_cname" {
  name         = "api.cloud.example.com."
  managed_zone = google_dns_managed_zone.cloud_subdomain.name
  type         = "CNAME"
  ttl          = 300
  rrdatas      = ["my-api.my-project.appspot.com."]
}

# Output the nameservers for configuring at the registrar
output "nameservers" {
  value = google_dns_managed_zone.cloud_subdomain.name_servers
}
```

After applying the Terraform config, take the nameserver values from the output and add them as NS records at your registrar.

## DNSSEC Considerations

If your parent domain has DNSSEC enabled, you will also need to establish a chain of trust for the delegated subdomain. This means enabling DNSSEC on your Cloud DNS zone and adding a DS record at the parent domain.

```bash
# Enable DNSSEC on the Cloud DNS zone
gcloud dns managed-zones update cloud-subdomain \
    --dnssec-state=on \
    --project=my-project

# Get the DS record information to add at the registrar
gcloud dns managed-zones describe cloud-subdomain \
    --project=my-project \
    --format="json(dnssecConfig.defaultKeySpecs)"
```

You will need to take the DS record details and add them at your registrar. The exact process depends on the registrar, but most modern registrars support DS record management in their advanced DNS settings.

## Troubleshooting

**Records not resolving**: Wait for TTL expiration on old cached records. Use `dig +trace` to see exactly where the resolution chain breaks.

**SERVFAIL responses**: This often indicates a DNSSEC issue. If DNSSEC is enabled on the parent but not on the child zone (or vice versa), resolvers may reject responses. Either enable DNSSEC end-to-end or disable it on both sides.

**NS records not appearing**: Some registrars have a delay in publishing NS records. Double-check the registrar's DNS management panel and make sure you entered the subdomain prefix correctly (just `cloud`, not `cloud.example.com`).

**Partial resolution**: If some records resolve but others do not, make sure you are creating records in the correct zone. Records in the Cloud DNS zone must be under the zone's DNS name.

## Wrapping Up

Subdomain delegation is a clean way to split DNS management between your existing registrar and Google Cloud DNS. The parent domain stays where it is, and your team gets full control over the subdomain in GCP. This setup works well for organizations adopting GCP incrementally - you do not have to migrate your entire DNS infrastructure all at once. Just delegate what you need and manage it alongside the rest of your cloud resources.
