# How to Migrate DNS Records from Route 53 to Google Cloud DNS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud DNS, AWS Route 53, DNS Migration, Networking

Description: A practical guide to migrating DNS records from AWS Route 53 to Google Cloud DNS with minimal downtime and full record parity.

---

Migrating DNS from AWS Route 53 to Google Cloud DNS is a common step when moving infrastructure to GCP. The migration itself is not complicated, but it requires careful planning to avoid downtime. DNS is one of those things where a mistake can take your entire application offline, so getting it right matters.

This guide covers the full process: exporting records from Route 53, importing them into Cloud DNS, testing, and cutting over the nameservers.

## Planning the Migration

Before touching anything, take stock of what you are working with. Run through these questions:

- How many hosted zones do you have in Route 53?
- Do any zones use Route 53-specific features like alias records, health checks, or routing policies (weighted, latency, geolocation)?
- Is DNSSEC enabled?
- What are the current TTLs on your records?

Route 53 alias records do not have a direct equivalent in Cloud DNS. You will need to convert them to standard A or CNAME records. Similarly, Route 53 routing policies need to be reimplemented using Cloud DNS routing policies or external load balancing.

## Step 1: Export Records from Route 53

Start by exporting your existing records from Route 53. The AWS CLI makes this straightforward.

```bash
# List all hosted zones in Route 53
aws route53 list-hosted-zones --output json

# Export all records from a specific hosted zone
aws route53 list-resource-record-sets \
    --hosted-zone-id Z1234567890ABC \
    --output json > route53-records.json
```

This gives you a JSON file with all your record sets. Let's look at the structure of a typical export.

```json
{
  "ResourceRecordSets": [
    {
      "Name": "example.com.",
      "Type": "A",
      "TTL": 300,
      "ResourceRecords": [
        { "Value": "93.184.216.34" }
      ]
    },
    {
      "Name": "www.example.com.",
      "Type": "CNAME",
      "TTL": 300,
      "ResourceRecords": [
        { "Value": "example.com." }
      ]
    }
  ]
}
```

## Step 2: Create the Managed Zone in Cloud DNS

Create a managed zone in Google Cloud DNS that matches your Route 53 hosted zone.

```bash
# Create a public managed zone in Cloud DNS
gcloud dns managed-zones create example-zone \
    --dns-name=example.com. \
    --description="Migrated from Route 53" \
    --visibility=public \
    --project=my-project
```

Note the nameservers assigned to the new zone - you will need them later.

```bash
# Get the assigned nameservers
gcloud dns managed-zones describe example-zone \
    --project=my-project \
    --format="value(nameServers)"
```

## Step 3: Convert and Import Records

Now you need to convert the Route 53 records into Cloud DNS format. Here is a Python script that reads the Route 53 export and generates gcloud commands.

```python
# convert_records.py - Converts Route 53 JSON export to gcloud commands
import json
import sys

# Record types to skip (NS and SOA are auto-created by Cloud DNS)
SKIP_TYPES = {"NS", "SOA"}

with open("route53-records.json") as f:
    data = json.load(f)

zone_name = "example-zone"
project = "my-project"

for rrset in data["ResourceRecordSets"]:
    record_type = rrset["Type"]

    # Skip NS and SOA records since Cloud DNS manages these
    if record_type in SKIP_TYPES:
        continue

    name = rrset["Name"]
    ttl = rrset.get("TTL", 300)

    # Handle alias records - convert to standard A/AAAA records
    if "AliasTarget" in rrset:
        print(f"# WARNING: Alias record for {name} - resolve manually")
        print(f"# Alias target: {rrset['AliasTarget']['DNSName']}")
        continue

    # Build the rrdatas value
    values = [r["Value"] for r in rrset.get("ResourceRecords", [])]
    rrdatas = ",".join(values)

    # Generate the gcloud command
    print(f"gcloud dns record-sets create {name} \\")
    print(f"    --zone={zone_name} \\")
    print(f"    --type={record_type} \\")
    print(f"    --ttl={ttl} \\")
    print(f"    --rrdatas=\"{rrdatas}\" \\")
    print(f"    --project={project}")
    print()
```

Run the script to generate your import commands.

```bash
# Generate gcloud commands from the Route 53 export
python3 convert_records.py > import_commands.sh

# Review the generated commands before executing
cat import_commands.sh

# Execute the import
bash import_commands.sh
```

### Handling Alias Records

Route 53 alias records need special attention. For alias records pointing to AWS resources like ELBs or CloudFront distributions, you have a few options:

1. If you are also migrating the service to GCP, point the record at the new GCP resource
2. If the AWS resource stays, resolve the alias target to its actual IP or CNAME and create a standard record

```bash
# Resolve the alias target to get the actual values
dig +short my-elb-123456.us-east-1.elb.amazonaws.com

# Then create a standard A or CNAME record in Cloud DNS
gcloud dns record-sets create api.example.com. \
    --zone=example-zone \
    --type=CNAME \
    --ttl=300 \
    --rrdatas="my-elb-123456.us-east-1.elb.amazonaws.com." \
    --project=my-project
```

## Step 4: Lower TTLs Before Cutover

Before switching nameservers, lower the TTLs on your records at Route 53. This ensures that when you do cut over, clients will pick up the new nameservers quickly.

```bash
# Lower the NS record TTL at your registrar or in Route 53
# Set TTL to 60 seconds, wait for old TTL to expire before proceeding
aws route53 change-resource-record-sets \
    --hosted-zone-id Z1234567890ABC \
    --change-batch '{
        "Changes": [{
            "Action": "UPSERT",
            "ResourceRecordSet": {
                "Name": "example.com.",
                "Type": "NS",
                "TTL": 60,
                "ResourceRecords": [
                    {"Value": "ns-123.awsdns-45.com."},
                    {"Value": "ns-678.awsdns-90.net."}
                ]
            }
        }]
    }'
```

Wait for at least the old TTL duration before proceeding to the nameserver switch.

## Step 5: Validate Records in Cloud DNS

Before cutting over, verify that Cloud DNS returns the correct answers for all your records.

```bash
# Query the Cloud DNS nameservers directly to verify records
dig @ns-cloud-a1.googledomains.com example.com A
dig @ns-cloud-a1.googledomains.com www.example.com CNAME
dig @ns-cloud-a1.googledomains.com example.com MX

# List all records in the Cloud DNS zone for a full comparison
gcloud dns record-sets list \
    --zone=example-zone \
    --project=my-project
```

Compare the output with your Route 53 export to make sure everything matches.

## Step 6: Update Nameservers at Your Registrar

This is the actual cutover. Go to your domain registrar and update the nameservers from Route 53's nameservers to Cloud DNS's nameservers.

Replace the old nameservers:
```
ns-123.awsdns-45.com
ns-678.awsdns-90.net
ns-901.awsdns-12.org
ns-234.awsdns-56.co.uk
```

With the new Google Cloud DNS nameservers:
```
ns-cloud-a1.googledomains.com
ns-cloud-a2.googledomains.com
ns-cloud-a3.googledomains.com
ns-cloud-a4.googledomains.com
```

## Step 7: Monitor the Cutover

After updating nameservers, monitor DNS resolution closely.

```bash
# Check which nameservers are currently authoritative
dig NS example.com

# Verify resolution from multiple locations
# Using Google's public DNS
dig @8.8.8.8 example.com A

# Using Cloudflare's DNS
dig @1.1.1.1 example.com A
```

Keep both the Route 53 zone and the Cloud DNS zone active for at least 48 hours after the cutover. This ensures that any cached NS records pointing to Route 53 still get valid responses.

## Step 8: Clean Up Route 53

Once you are confident that all traffic is being served by Cloud DNS, you can decommission the Route 53 hosted zone.

```bash
# Delete all non-default records from Route 53 (NS and SOA must stay until zone deletion)
# Then delete the hosted zone
aws route53 delete-hosted-zone --id Z1234567890ABC
```

## Migration Checklist

Here is a quick checklist to keep handy during the migration:

- Export all Route 53 records
- Create Cloud DNS managed zone
- Convert and import all records
- Handle alias records manually
- Lower TTLs at least 24 hours before cutover
- Validate all records against Cloud DNS nameservers
- Update nameservers at the registrar
- Monitor resolution for 48 hours
- Keep Route 53 zone active during monitoring period
- Delete Route 53 zone after successful migration

## Wrapping Up

Migrating DNS from Route 53 to Cloud DNS is mostly about careful preparation and validation. The actual cutover is just a nameserver change at your registrar. The tricky parts are handling Route 53-specific features like alias records and routing policies. Take your time with the validation step, lower your TTLs ahead of the switch, and keep the old zone around as a safety net until you are sure everything is working.
