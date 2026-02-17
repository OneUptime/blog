# How to Create DNS Response Policies to Override Query Results in Google Cloud DNS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud DNS, DNS Response Policies, Networking, Google Cloud

Description: Learn how to create and configure DNS response policies in Google Cloud DNS to override query results for custom routing, blocking, and internal name resolution.

---

DNS response policies in Google Cloud DNS give you fine-grained control over how DNS queries are resolved within your VPC networks. Instead of relying solely on standard zone records, response policies let you intercept queries and return custom answers - or block them entirely. This is incredibly useful for scenarios like redirecting internal traffic, blocking known malicious domains, or implementing split-horizon DNS.

In this guide, I will walk you through creating DNS response policies, adding rules, and attaching them to your VPC networks.

## What Are DNS Response Policies?

A DNS response policy is a collection of rules that Cloud DNS evaluates before it checks your standard DNS zones. When a query matches a response policy rule, Cloud DNS returns the answer defined in that rule instead of performing normal resolution.

Think of it as a filter layer that sits in front of your regular DNS resolution pipeline. Each rule can do one of the following:

- Return a specific set of records (local data)
- Block the query and return NXDOMAIN
- Pass through to normal resolution (bypass the policy for that name)

Response policies are evaluated in priority order and only apply to VPC networks they are attached to.

## Prerequisites

Before you start, make sure you have:

- A GCP project with billing enabled
- The Cloud DNS API enabled
- A VPC network where you want to apply the policy
- The `dns.admin` IAM role or equivalent permissions
- The `gcloud` CLI installed and configured

## Step 1: Enable the Cloud DNS API

If you have not already enabled the Cloud DNS API, do so now.

```bash
# Enable the Cloud DNS API for your project
gcloud services enable dns.googleapis.com --project=my-project
```

## Step 2: Create a DNS Response Policy

Let's create a response policy and attach it to a VPC network.

```bash
# Create a response policy and bind it to the default VPC network
gcloud dns response-policies create my-response-policy \
    --description="Custom response policy for internal routing" \
    --networks=default \
    --project=my-project
```

You can attach the policy to multiple networks by providing a comma-separated list of network names. The policy will only affect DNS queries originating from VMs in those networks.

## Step 3: Add Rules to Override DNS Queries

Now that the policy exists, let's add some rules. There are a few types of rules you can create.

### Override with Custom Records

This is the most common use case. You want queries for a specific domain to return a custom IP address instead of the real public record.

```bash
# Override example.com to point to an internal IP address
gcloud dns response-policies rules create override-example \
    --response-policy=my-response-policy \
    --dns-name=example.com. \
    --local-data-rrsets="example.com.,A,300,10.0.1.50" \
    --project=my-project
```

The format for `--local-data-rrsets` is `name,type,ttl,rdata`. Note the trailing dot on the DNS name - that is required for fully qualified domain names.

You can also override with multiple record types. Here is an example that sets both A and AAAA records.

```bash
# Override with both IPv4 and IPv6 records
gcloud dns response-policies rules create override-multi \
    --response-policy=my-response-policy \
    --dns-name=api.internal.example.com. \
    --local-data-rrsets="api.internal.example.com.,A,300,10.0.2.10;api.internal.example.com.,AAAA,300,fd00::1" \
    --project=my-project
```

### Block a Domain Entirely

If you want to block resolution for a domain - for example, a known malicious domain or an unwanted SaaS service - you can create a rule that returns NXDOMAIN.

```bash
# Block all queries to a malicious domain
gcloud dns response-policies rules create block-malware \
    --response-policy=my-response-policy \
    --dns-name=malware-site.example.com. \
    --behavior=behaviorUnspecified \
    --project=my-project
```

When a VM in the attached network queries for `malware-site.example.com`, Cloud DNS will return an NXDOMAIN response.

### Bypass the Policy for Specific Names

Sometimes you want a policy to apply broadly but need to exclude certain names. The bypass behavior tells Cloud DNS to skip the response policy and proceed with normal resolution.

```bash
# Allow normal resolution for a specific subdomain
gcloud dns response-policies rules create bypass-allowed \
    --response-policy=my-response-policy \
    --dns-name=allowed.example.com. \
    --behavior=bypassResponsePolicy \
    --project=my-project
```

## Step 4: Verify the Response Policy

You can list all rules in a response policy to make sure everything looks correct.

```bash
# List all rules in the response policy
gcloud dns response-policies rules list \
    --response-policy=my-response-policy \
    --project=my-project
```

To test that the policy is working, SSH into a VM in the attached VPC network and run a DNS lookup.

```bash
# From a VM in the VPC network, test the override
dig example.com @169.254.169.254
```

The `@169.254.169.254` points to the GCP metadata server which also serves as the internal DNS resolver. You should see the overridden IP address in the response.

## Step 5: Use Wildcard Rules

Response policies support wildcard rules using the `*.` prefix. This is handy when you want to override an entire domain and all its subdomains.

```bash
# Override all subdomains of internal.corp.com
gcloud dns response-policies rules create wildcard-internal \
    --response-policy=my-response-policy \
    --dns-name="*.internal.corp.com." \
    --local-data-rrsets="*.internal.corp.com.,A,300,10.0.5.1" \
    --project=my-project
```

Be careful with wildcards though. They match any subdomain at that level but do not match the parent domain itself. If you need to override both `internal.corp.com` and `*.internal.corp.com`, create two separate rules.

## Managing Response Policies with Terraform

If you prefer infrastructure as code, here is how to set up the same configuration with Terraform.

```hcl
# Define the response policy resource
resource "google_dns_response_policy" "custom_policy" {
  response_policy_name = "my-response-policy"
  description          = "Custom response policy for internal routing"

  networks {
    network_url = google_compute_network.default.id
  }
}

# Add a rule to override example.com
resource "google_dns_response_policy_rule" "override_example" {
  response_policy = google_dns_response_policy.custom_policy.response_policy_name
  rule_name       = "override-example"
  dns_name        = "example.com."

  local_data {
    local_datas {
      name    = "example.com."
      type    = "A"
      ttl     = 300
      rrdatas = ["10.0.1.50"]
    }
  }
}

# Add a rule to block a domain
resource "google_dns_response_policy_rule" "block_malware" {
  response_policy = google_dns_response_policy.custom_policy.response_policy_name
  rule_name       = "block-malware"
  dns_name        = "malware-site.example.com."

  behavior = "behaviorUnspecified"
}
```

## Common Use Cases

**Split-horizon DNS**: Override public domain names so that internal VMs resolve to private IPs instead of public ones. This keeps traffic on your VPC network and avoids egress charges.

**Security blocking**: Block domains associated with malware, phishing, or data exfiltration. This acts as a lightweight DNS firewall without needing additional appliances.

**Development and testing**: Override third-party API endpoints to point to mock servers during development. This avoids modifying `/etc/hosts` on every VM.

**Service migration**: During a migration, point DNS names at new backend services without updating the authoritative zone. Once the migration is complete, update the real records and remove the response policy rule.

## Troubleshooting Tips

If your response policy rules are not working as expected, check the following:

1. Make sure the VM is in a VPC network that is attached to the response policy
2. Verify that the DNS name in the rule has a trailing dot
3. Check that there is no conflicting private zone that takes precedence
4. Ensure the response policy is not disabled
5. Use Cloud Logging to inspect DNS queries - enable DNS logging on the VPC network first

```bash
# Enable DNS logging on a VPC network to debug resolution
gcloud dns policies create dns-logging-policy \
    --networks=default \
    --enable-logging \
    --project=my-project
```

## Cleanup

If you need to remove the response policy, delete all rules first, then delete the policy.

```bash
# Delete a specific rule
gcloud dns response-policies rules delete override-example \
    --response-policy=my-response-policy \
    --project=my-project

# Delete the response policy itself
gcloud dns response-policies delete my-response-policy \
    --project=my-project
```

## Wrapping Up

DNS response policies are one of those features that you might not reach for every day, but when you need them, they save you a ton of effort. Whether you are blocking malicious domains, setting up split-horizon DNS, or rerouting traffic during a migration, response policies give you a clean, centralized way to override DNS behavior at the network level. Combined with VPC network scoping, you get precise control over which environments see the overrides and which ones do not.
