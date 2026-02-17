# How to Migrate Amazon Route 53 DNS Zones to Google Cloud DNS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud DNS, Route 53, Migration, Networking

Description: Migrate your Amazon Route 53 DNS zones to Google Cloud DNS with zero-downtime strategies including record export, zone transfer, and gradual cutover.

---

DNS migration is one of those things that looks simple on paper but can cause real problems if done carelessly. A misconfigured DNS cutover means your entire application goes dark for however long it takes to fix the issue and wait for TTL propagation.

Migrating from Route 53 to Google Cloud DNS is straightforward if you follow a methodical approach: export records, create the zone in Cloud DNS, import records, lower TTLs, validate, and then switch nameservers. In this post, I will walk through each step with the tools and scripts you need.

## Step 1: Export Route 53 Records

First, export all records from your Route 53 hosted zone:

```python
# export_route53.py
# Export all Route 53 records for migration to Cloud DNS
import boto3
import json

def export_hosted_zone(zone_id, output_file):
    """Export all records from a Route 53 hosted zone."""
    client = boto3.client('route53')

    records = []
    paginator = client.get_paginator('list_resource_record_sets')

    for page in paginator.paginate(HostedZoneId=zone_id):
        for record_set in page['ResourceRecordSets']:
            record = {
                'name': record_set['Name'],
                'type': record_set['Type'],
                'ttl': record_set.get('TTL', 300),
            }

            # Handle standard records
            if 'ResourceRecords' in record_set:
                record['values'] = [
                    r['Value'] for r in record_set['ResourceRecords']
                ]

            # Handle alias records (Route 53 specific)
            if 'AliasTarget' in record_set:
                record['alias'] = {
                    'dns_name': record_set['AliasTarget']['DNSName'],
                    'zone_id': record_set['AliasTarget']['HostedZoneId'],
                    'evaluate_health': record_set['AliasTarget']['EvaluateTargetHealth'],
                }

            # Handle weighted/failover/latency routing
            if 'Weight' in record_set:
                record['weight'] = record_set['Weight']
                record['set_identifier'] = record_set.get('SetIdentifier', '')

            if 'Failover' in record_set:
                record['failover'] = record_set['Failover']

            if 'Region' in record_set:
                record['latency_region'] = record_set['Region']

            records.append(record)

    with open(output_file, 'w') as f:
        json.dump(records, f, indent=2)

    print(f"Exported {len(records)} records from zone {zone_id}")
    return records


def export_all_zones(output_dir='route53_export'):
    """Export all hosted zones."""
    import os
    os.makedirs(output_dir, exist_ok=True)

    client = boto3.client('route53')
    zones = client.list_hosted_zones()

    for zone in zones['HostedZones']:
        zone_id = zone['Id'].split('/')[-1]
        zone_name = zone['Name'].rstrip('.')

        print(f"Exporting zone: {zone_name} ({zone_id})")
        export_hosted_zone(
            zone_id,
            f"{output_dir}/{zone_name}.json"
        )


if __name__ == '__main__':
    export_all_zones()
```

## Step 2: Create Cloud DNS Zones

Create the managed zone in Google Cloud DNS:

```hcl
# cloud-dns.tf
# Google Cloud DNS managed zone

resource "google_dns_managed_zone" "primary" {
  name        = "example-com"
  dns_name    = "example.com."
  description = "Primary DNS zone migrated from Route 53"
  project     = var.project_id

  # Enable DNSSEC if you had it on Route 53
  dnssec_config {
    state = "on"
  }

  # Cloud logging for DNS queries
  cloud_logging_config {
    enable_logging = true
  }
}

# If you have private zones
resource "google_dns_managed_zone" "private" {
  name        = "internal-example-com"
  dns_name    = "internal.example.com."
  description = "Private DNS zone"
  project     = var.project_id

  visibility = "private"

  private_visibility_config {
    networks {
      network_url = google_compute_network.vpc.id
    }
  }
}
```

## Step 3: Convert and Import Records

Convert Route 53 records to Cloud DNS format and import them:

```python
# convert_records.py
# Converts Route 53 records to Cloud DNS Terraform configuration
import json
import re

def convert_records(route53_file, zone_name, output_file):
    """Convert Route 53 records to Terraform Cloud DNS records."""
    with open(route53_file, 'r') as f:
        records = json.load(f)

    terraform_resources = []
    skipped = []

    for i, record in enumerate(records):
        record_type = record['type']

        # Skip NS and SOA records for the zone apex
        # Cloud DNS manages these automatically
        if record_type in ('NS', 'SOA') and record['name'] == f"{zone_name}.":
            skipped.append(f"{record['name']} ({record_type})")
            continue

        # Handle alias records - convert to CNAME or A record
        if 'alias' in record:
            result = convert_alias_record(record, zone_name, i)
            if result:
                terraform_resources.append(result)
            else:
                skipped.append(f"{record['name']} (alias)")
            continue

        # Handle standard records
        values = record.get('values', [])
        if not values:
            skipped.append(f"{record['name']} ({record_type}) - no values")
            continue

        safe_name = sanitize_name(record['name'], record_type, i)

        # Format record values based on type
        rrdatas = format_rrdatas(record_type, values)

        hcl = f'''
resource "google_dns_record_set" "{safe_name}" {{
  name         = "{record['name']}"
  type         = "{record_type}"
  ttl          = {record['ttl']}
  managed_zone = google_dns_managed_zone.primary.name
  project      = var.project_id

  rrdatas = {json.dumps(rrdatas)}
}}
'''
        terraform_resources.append(hcl)

    # Write output
    with open(output_file, 'w') as f:
        f.write("# DNS records migrated from Route 53\n\n")
        for resource in terraform_resources:
            f.write(resource)
            f.write("\n")

    print(f"Converted {len(terraform_resources)} records")
    print(f"Skipped {len(skipped)} records:")
    for s in skipped:
        print(f"  - {s}")


def convert_alias_record(record, zone_name, index):
    """Convert a Route 53 alias to a Cloud DNS CNAME or A record."""
    alias_target = record['alias']['dns_name']
    name = record['name']
    record_type = record['type']

    safe_name = sanitize_name(name, record_type, index)

    if record_type == 'A':
        # A record alias - convert to CNAME if not zone apex
        if name == f"{zone_name}.":
            # Zone apex cannot be CNAME
            # Need to resolve the alias target to IP addresses
            return None

        return f'''
resource "google_dns_record_set" "{safe_name}" {{
  name         = "{name}"
  type         = "CNAME"
  ttl          = 300
  managed_zone = google_dns_managed_zone.primary.name
  project      = var.project_id

  rrdatas = ["{alias_target}"]
}}
'''
    else:
        return f'''
resource "google_dns_record_set" "{safe_name}" {{
  name         = "{name}"
  type         = "CNAME"
  ttl          = 300
  managed_zone = google_dns_managed_zone.primary.name
  project      = var.project_id

  rrdatas = ["{alias_target}"]
}}
'''


def format_rrdatas(record_type, values):
    """Format record values for Terraform."""
    if record_type == 'TXT':
        # TXT records need to be quoted
        return [f'"{v.strip(chr(34))}"' for v in values]
    elif record_type == 'MX':
        # MX records include priority
        return values
    else:
        return values


def sanitize_name(name, record_type, index):
    """Create a valid Terraform resource name."""
    clean = name.rstrip('.').replace('.', '-').replace('*', 'wildcard')
    clean = re.sub(r'[^a-zA-Z0-9-]', '', clean)
    return f"record-{clean}-{record_type.lower()}-{index}"


if __name__ == '__main__':
    convert_records(
        'route53_export/example.com.json',
        'example.com',
        'terraform/dns_records.tf'
    )
```

## Step 4: Lower TTLs Before Cutover

Before switching nameservers, lower TTLs on Route 53 so the cutover propagates quickly:

```python
# lower_ttls.py
# Lower TTLs on Route 53 records before migration cutover
import boto3

def lower_ttls(zone_id, target_ttl=60):
    """Lower all record TTLs to speed up migration cutover."""
    client = boto3.client('route53')

    paginator = client.get_paginator('list_resource_record_sets')
    changes = []

    for page in paginator.paginate(HostedZoneId=zone_id):
        for record_set in page['ResourceRecordSets']:
            # Skip NS and SOA records
            if record_set['Type'] in ('NS', 'SOA'):
                continue

            # Skip alias records (they do not have TTL)
            if 'AliasTarget' in record_set:
                continue

            current_ttl = record_set.get('TTL', 300)
            if current_ttl > target_ttl:
                changes.append({
                    'Action': 'UPSERT',
                    'ResourceRecordSet': {
                        **record_set,
                        'TTL': target_ttl,
                    }
                })

    # Apply changes in batches (Route 53 limit is 1000 per batch)
    batch_size = 500
    for i in range(0, len(changes), batch_size):
        batch = changes[i:i + batch_size]
        client.change_resource_record_sets(
            HostedZoneId=zone_id,
            ChangeBatch={
                'Comment': 'Lowering TTLs for Cloud DNS migration',
                'Changes': batch,
            }
        )
        print(f"Updated {len(batch)} records")

    print(f"Lowered TTLs for {len(changes)} records to {target_ttl}s")
    print(f"Wait at least {target_ttl * 2}s before switching nameservers")


if __name__ == '__main__':
    lower_ttls('Z0123456789ABCDEF')
```

## Step 5: Validate Before Cutover

Verify that Cloud DNS returns the correct records:

```bash
# Query Cloud DNS nameservers directly to verify records
# Get the Cloud DNS nameservers for your zone
gcloud dns managed-zones describe example-com \
  --project my-gcp-project \
  --format='value(nameServers)'

# Test specific records against Cloud DNS nameservers
dig @ns-cloud-a1.googledomains.com example.com A
dig @ns-cloud-a1.googledomains.com www.example.com CNAME
dig @ns-cloud-a1.googledomains.com example.com MX
dig @ns-cloud-a1.googledomains.com example.com TXT

# Compare with Route 53 results
dig @ns-1234.awsdns-56.org example.com A
```

Write an automated comparison script:

```python
# validate_dns.py
# Compares DNS records between Route 53 and Cloud DNS
import dns.resolver
import json

def compare_zones(domain, route53_ns, clouddns_ns, records_file):
    """Compare DNS responses from Route 53 and Cloud DNS."""
    with open(records_file, 'r') as f:
        records = json.load(f)

    mismatches = []

    for record in records:
        name = record['name'].rstrip('.')
        rtype = record['type']

        # Skip NS and SOA
        if rtype in ('NS', 'SOA'):
            continue

        # Query Route 53
        r53_result = query_dns(name, rtype, route53_ns)

        # Query Cloud DNS
        gcp_result = query_dns(name, rtype, clouddns_ns)

        if set(r53_result) != set(gcp_result):
            mismatches.append({
                'name': name,
                'type': rtype,
                'route53': sorted(r53_result),
                'cloud_dns': sorted(gcp_result),
            })

    if mismatches:
        print(f"Found {len(mismatches)} mismatches:")
        for m in mismatches:
            print(f"  {m['name']} ({m['type']})")
            print(f"    Route 53:  {m['route53']}")
            print(f"    Cloud DNS: {m['cloud_dns']}")
    else:
        print("All records match between Route 53 and Cloud DNS")

    return mismatches


def query_dns(name, rtype, nameserver):
    """Query a specific nameserver for a DNS record."""
    resolver = dns.resolver.Resolver()
    resolver.nameservers = [nameserver]

    try:
        answers = resolver.resolve(name, rtype)
        return [str(rdata) for rdata in answers]
    except Exception:
        return []
```

## Step 6: Switch Nameservers

Update your domain registrar to point to Cloud DNS nameservers:

```bash
# Get Cloud DNS nameservers
gcloud dns managed-zones describe example-com \
  --project my-gcp-project \
  --format='value(nameServers)'

# Output will be something like:
# ns-cloud-a1.googledomains.com.
# ns-cloud-a2.googledomains.com.
# ns-cloud-a3.googledomains.com.
# ns-cloud-a4.googledomains.com.

# Update these at your domain registrar
# (this step depends on your registrar's interface)
```

## Step 7: Monitor After Cutover

Watch for DNS resolution issues after the cutover:

```bash
# Monitor DNS propagation worldwide
# Use dig to check from different locations
for ns in 8.8.8.8 1.1.1.1 208.67.222.222; do
  echo "Querying $ns:"
  dig @$ns example.com NS +short
  echo ""
done
```

## Wrapping Up

DNS migration is one of those tasks where preparation makes all the difference. Export everything, recreate it in Cloud DNS, validate thoroughly, lower your TTLs, and only then switch nameservers. The most common mistakes are forgetting to convert Route 53 alias records (which do not exist in Cloud DNS), not lowering TTLs before cutover, and not testing with the actual Cloud DNS nameservers before making the switch. Take your time with this one - rushing a DNS migration is how you get a multi-hour outage.
