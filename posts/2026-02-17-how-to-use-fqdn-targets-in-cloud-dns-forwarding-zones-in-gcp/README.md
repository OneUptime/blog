# How to Use FQDN Targets in Cloud DNS Forwarding Zones in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud DNS, DNS Forwarding, FQDN, Networking

Description: Learn how to configure Cloud DNS forwarding zones with FQDN targets instead of IP addresses for flexible DNS resolution in Google Cloud Platform.

---

Cloud DNS forwarding zones typically use IP addresses as their forwarding targets. But there are situations where you want to forward to a DNS server identified by its fully qualified domain name (FQDN) rather than an IP. This is useful when the target DNS server's IP address might change, or when you want to use a managed DNS service that provides a hostname as its endpoint.

In this post, I will show you how to set up FQDN-based forwarding targets in Cloud DNS and explain when and why you would use them over IP-based targets.

## When to Use FQDN Targets

FQDN targets make sense in a few scenarios:

- **Managed DNS services**: Some DNS-as-a-service providers give you a hostname endpoint rather than a static IP
- **Dynamic infrastructure**: When target DNS servers are behind a load balancer with a DNS name
- **Multi-environment setups**: When the same forwarding configuration needs to work across environments where DNS server IPs differ but the hostname stays the same
- **Third-party integrations**: When forwarding to a partner's DNS service that publishes a hostname

The trade-off is that FQDN targets add an extra DNS lookup step. Cloud DNS must first resolve the FQDN to an IP before it can forward the query. This adds a small amount of latency compared to direct IP targets.

## How FQDN Resolution Works

When you configure an FQDN target, Cloud DNS performs a two-step process:

1. First, it resolves the FQDN to one or more IP addresses using public DNS resolution
2. Then, it forwards the original query to the resolved IP addresses

Cloud DNS caches the FQDN resolution based on the TTL of the returned records, so the extra lookup does not happen on every single query. However, it does mean that the FQDN itself must be resolvable via public DNS. You cannot use a private DNS name as an FQDN target.

## Step 1: Create a Forwarding Zone with FQDN Target

Let's create a forwarding zone that uses an FQDN instead of an IP address.

```bash
# Create a forwarding zone with an FQDN target
gcloud dns managed-zones create external-forward \
    --dns-name=partner.example.com. \
    --description="Forward queries to partner DNS via FQDN" \
    --visibility=private \
    --networks=my-vpc \
    --forwarding-targets="" \
    --project=my-project
```

Unfortunately, the `gcloud` CLI does not directly support FQDN targets in forwarding zones through command-line flags. You need to use the REST API or Terraform for this. Let me show you both approaches.

### Using the REST API

```bash
# Create a forwarding zone with FQDN target using the REST API
curl -X POST \
    "https://dns.googleapis.com/dns/v1/projects/my-project/managedZones" \
    -H "Authorization: Bearer $(gcloud auth print-access-token)" \
    -H "Content-Type: application/json" \
    -d '{
        "name": "partner-forwarding",
        "dnsName": "partner.example.com.",
        "description": "Forward to partner DNS via FQDN",
        "visibility": "private",
        "privateVisibilityConfig": {
            "networks": [
                {
                    "networkUrl": "projects/my-project/global/networks/my-vpc"
                }
            ]
        },
        "forwardingConfig": {
            "targetNameServers": [
                {
                    "ipv4Address": "",
                    "forwardingPath": "default",
                    "ipv6Address": "",
                    "kind": "dns#managedZoneForwardingConfigNameServerTarget"
                }
            ]
        }
    }'
```

### Using Terraform

Terraform provides a cleaner way to configure FQDN targets.

```hcl
# Create a forwarding zone with target name servers
resource "google_dns_managed_zone" "partner_forwarding" {
  name        = "partner-forwarding"
  dns_name    = "partner.example.com."
  description = "Forward queries to partner DNS"
  visibility  = "private"

  private_visibility_config {
    networks {
      network_url = google_compute_network.my_vpc.id
    }
  }

  forwarding_config {
    target_name_servers {
      # Use the IP that the FQDN resolves to
      # For dynamic resolution, use an external data source
      ipv4_address    = "203.0.113.53"
      forwarding_path = "default"
    }
    target_name_servers {
      ipv4_address    = "203.0.113.54"
      forwarding_path = "default"
    }
  }
}
```

## Step 2: Alternative Approach - Dynamic Resolution with a Proxy

If your use case specifically requires FQDN-based forwarding and the gcloud/API limitations are a concern, consider setting up a lightweight DNS proxy within your VPC. The proxy resolves the FQDN target dynamically and forwards queries.

Here is a simple setup using CoreDNS as a forwarding proxy.

```yaml
# Corefile for CoreDNS running on a GCE instance
# This forwards queries for partner.example.com to a dynamic FQDN target
partner.example.com:53 {
    forward . dns-server.partner.net {
        health_check 5s
    }
    log
    errors
}

# Default handler for all other queries - forward to Google metadata DNS
. {
    forward . 169.254.169.254
    log
    errors
}
```

Deploy CoreDNS on a small GCE instance (e2-micro works fine) in your VPC, then configure a Cloud DNS forwarding zone that points to the CoreDNS instance's IP.

```bash
# Create a forwarding zone pointing to your CoreDNS proxy
gcloud dns managed-zones create partner-forwarding \
    --dns-name=partner.example.com. \
    --description="Forward via CoreDNS proxy for FQDN target" \
    --visibility=private \
    --networks=my-vpc \
    --forwarding-targets="10.0.1.100[private]" \
    --project=my-project
```

## Step 3: Set Up Health Checking for FQDN Targets

When using FQDN targets (or any forwarding targets), you want to make sure queries do not fail silently if the target becomes unreachable. Cloud DNS does not have built-in health checking for forwarding targets, but you can build monitoring around it.

```bash
# Create a Cloud Monitoring uptime check for the DNS target
gcloud monitoring uptime create dns-target-health \
    --display-name="DNS Forwarding Target Health" \
    --resource-type=uptime-url \
    --hostname=dns-server.partner.net \
    --port=53 \
    --protocol=tcp \
    --period=60 \
    --project=my-project
```

You can also set up alerting policies to notify you when the target becomes unreachable.

```bash
# Create an alerting policy for the uptime check
gcloud monitoring policies create \
    --display-name="DNS Target Down Alert" \
    --condition-display-name="DNS target unreachable" \
    --condition-filter='resource.type="uptime_url" AND metric.type="monitoring.googleapis.com/uptime_check/check_passed"' \
    --condition-threshold-value=1 \
    --condition-threshold-comparison=COMPARISON_LT \
    --notification-channels=projects/my-project/notificationChannels/12345 \
    --project=my-project
```

## Step 4: Handling Failover Between FQDN Targets

When you specify multiple forwarding targets, Cloud DNS distributes queries among them. If one target fails to respond, Cloud DNS automatically tries the other targets. This works the same way regardless of whether the targets were originally specified as IPs or resolved from FQDNs.

```bash
# Multiple forwarding targets for redundancy
gcloud dns managed-zones create partner-forwarding \
    --dns-name=partner.example.com. \
    --description="Forward with redundant targets" \
    --visibility=private \
    --networks=my-vpc \
    --forwarding-targets="203.0.113.53,203.0.113.54,198.51.100.53" \
    --project=my-project
```

Cloud DNS will try all three targets and return the first successful response. The failover behavior is automatic and does not require any additional configuration.

## Best Practices

**Always specify multiple targets.** A single forwarding target is a single point of failure. Use at least two targets in different locations if possible.

**Monitor target health.** Cloud DNS does not notify you when forwarding targets are unreachable. Set up your own monitoring to catch issues early.

**Use private forwarding for internal targets.** If the target DNS server is on-premises or in another private network, use the `[private]` forwarding path to route queries through your VPC instead of the public internet.

**Keep TTLs reasonable on FQDN records.** If you are using an approach where the target is resolved by FQDN, make sure the FQDN's A record TTL is not too long. A TTL of 60-300 seconds gives you a good balance between caching efficiency and responsiveness to IP changes.

**Test failover.** Before going to production, test what happens when a forwarding target goes down. Verify that queries still resolve through the remaining targets.

## Troubleshooting

**Forwarded queries time out**: Verify network connectivity between your VPC and the target DNS server. For private targets, check VPN and firewall rules. For public targets, check that the target's firewall allows DNS queries from Google's IP ranges.

**Stale responses after target IP change**: If you are using a proxy-based FQDN approach, check that the proxy is refreshing its resolution. For CoreDNS, the health check interval controls how often it re-resolves the upstream.

**Increased latency**: FQDN resolution adds an extra DNS lookup. If latency is critical, consider pinning to IP addresses and using monitoring to detect when IPs change.

## Wrapping Up

FQDN targets in DNS forwarding give you flexibility when dealing with DNS infrastructure that uses hostnames rather than static IPs. While native Cloud DNS support for FQDN targets has some limitations, you can work around them using the REST API, Terraform, or a lightweight DNS proxy like CoreDNS. The key is choosing the right approach based on your requirements for dynamism, latency, and operational complexity.
