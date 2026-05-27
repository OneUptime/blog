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

1. First, it resolves the FQDN to one or more IP addresses using the VPC network's DNS resolution order
2. Then, it forwards the original query to the resolved IP addresses

Cloud DNS caches the FQDN resolution based on the TTL of the returned records, so the extra lookup does not happen on every single query. The FQDN target can resolve to up to 50 IP addresses, and the resolved addresses must meet the same network requirements as IP-based forwarding targets.

## Step 1: Create a Forwarding Zone with FQDN Target

Let's create a forwarding zone that uses an FQDN instead of an IP address.

```bash
# Create a forwarding zone with an FQDN target

gcloud dns managed-zones create partner-forwarding \
    --dns-name=partner.example.com. \
    --description="Forward queries to partner DNS via FQDN" \
    --visibility=private \
    --networks=my-vpc \
    --forwarding-targets=dns-server.partner.net. \
    --project=my-project
```

Cloud DNS lets you configure either a list of IP address targets or a single FQDN target in a forwarding zone. You cannot mix IP address targets and an FQDN target in the same forwarding zone.

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
                    "domainName": "dns-server.partner.net.",
                    "forwardingPath": "default",
                    "kind": "dns#managedZoneForwardingConfigNameServerTarget"
                }
            ]
        }
    }'
```

### Using Terraform

Terraform provides a cleaner way to configure FQDN targets.

```hcl
# Create a forwarding zone with an FQDN target
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
      domain_name     = "dns-server.partner.net."
      forwarding_path = "default"
    }
  }
}
```

## Step 2: Alternative Approach - Dynamic Resolution with a Proxy

If you need behavior that Cloud DNS forwarding zones do not provide, such as custom retry logic or more than one upstream FQDN, consider setting up a lightweight DNS proxy within your VPC. The proxy resolves the FQDN target and forwards queries.

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
    --private-forwarding-targets=10.0.1.100 \
    --project=my-project
```

## Step 3: Set Up Health Checking for FQDN Targets

When using FQDN targets (or any forwarding targets), you want to make sure queries do not fail silently if the target becomes unreachable. Cloud DNS does not have built-in health checking for forwarding targets, but you can build monitoring around it.

```bash
# Create a Cloud Monitoring uptime check for the DNS target
gcloud monitoring uptime create dns-target-health \
    --resource-type=uptime-url \
    --resource-labels=host=dns-server.partner.net,project_id=my-project \
    --port=53 \
    --protocol=tcp \
    --period=1 \
    --project=my-project
```

You can also set up alerting policies to notify you when the target becomes unreachable.

```bash
# Create an alerting policy for the uptime check
gcloud monitoring policies create \
    --display-name="DNS Target Down Alert" \
    --condition-display-name="DNS target unreachable" \
    --condition-filter='resource.type="uptime_url" AND metric.type="monitoring.googleapis.com/uptime_check/check_passed"' \
    --if="< 1" \
    --duration=60s \
    --notification-channels=projects/my-project/notificationChannels/12345 \
    --project=my-project
```

## Step 4: Handling Failover Between Targets

When you specify multiple IP address forwarding targets, Cloud DNS ranks the targets internally and tries the highest-ranked target first. If that target does not respond, Cloud DNS tries the next target. For an FQDN forwarding target, Cloud DNS resolves the name to IP addresses and applies the same target selection behavior to the resolved addresses.

```bash
# Multiple forwarding targets for redundancy
gcloud dns managed-zones create partner-forwarding \
    --dns-name=partner.example.com. \
    --description="Forward with redundant targets" \
    --visibility=private \
    --networks=my-vpc \
    --private-forwarding-targets=10.0.1.53,10.0.1.54,10.0.2.53 \
    --project=my-project
```

Cloud DNS will try the configured targets according to its internal ranking and return a successful response when one is available. The failover behavior is automatic and does not require any additional configuration.

## Best Practices

**Design for multiple reachable targets.** A single forwarding target is a single point of failure. Use multiple IP targets, or an FQDN that resolves to multiple healthy addresses, when possible.

**Monitor target health.** Cloud DNS does not notify you when forwarding targets are unreachable. Set up your own monitoring to catch issues early.

**Use private forwarding for internal targets.** If the target DNS server is on-premises or in another private network, use the `--private-forwarding-targets` flag or set `forwardingPath` to `private` to route queries through your VPC instead of the public internet.

**Keep TTLs reasonable on FQDN records.** If you are using an approach where the target is resolved by FQDN, make sure the FQDN's A record TTL is not too long. A TTL of 60-300 seconds gives you a good balance between caching efficiency and responsiveness to IP changes.

**Test failover.** Before going to production, test what happens when a forwarding target goes down. Verify that queries still resolve through the remaining targets.

## Troubleshooting

**Forwarded queries time out**: Verify network connectivity between your VPC and the target DNS server. For private targets, check VPN and firewall rules. For public targets, check that the target's firewall allows DNS queries from Google's IP ranges.

**Stale responses after target IP change**: If you are using a proxy-based FQDN approach, check that the proxy is refreshing its resolution and not holding stale upstream connections longer than expected. For CoreDNS, the `health_check` setting controls upstream health checks, not the DNS TTL of the upstream name.

**Increased latency**: FQDN resolution adds an extra DNS lookup. If latency is critical, consider pinning to IP addresses and using monitoring to detect when IPs change.

## Wrapping Up

FQDN targets in DNS forwarding give you flexibility when dealing with DNS infrastructure that uses hostnames rather than static IPs. Native Cloud DNS support for FQDN targets works through the gcloud CLI, REST API, and Terraform, and a lightweight DNS proxy like CoreDNS can still help when you need custom behavior. The key is choosing the right approach based on your requirements for dynamism, latency, and operational complexity.
