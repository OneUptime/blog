# How to Configure Private Google Access for IPv4 in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Private Google Access, IPv4, VPC, Cloud API, Networking

Description: Enable Private Google Access on GCP subnets to allow VM instances without external IPv4 addresses to reach Google APIs and services using internal IP addresses.

## Introduction

Private Google Access allows VMs with only internal (private) IPv4 addresses to access Google APIs and services like Cloud Storage, BigQuery, and Pub/Sub. Without it, VMs without external IPs cannot reach `*.googleapis.com`. Traffic stays on Google's internal network.

## Enabling Private Google Access on a Subnet

```bash
PROJECT_ID="my-gcp-project"
REGION="us-central1"

# Enable Private Google Access for a specific subnet

gcloud compute networks subnets update app-subnet \
  --project=$PROJECT_ID \
  --region=$REGION \
  --enable-private-ip-google-access
```

## Verifying Private Google Access is Enabled

```bash
# Check a subnet's Private Google Access status
gcloud compute networks subnets describe app-subnet \
  --project=$PROJECT_ID \
  --region=$REGION \
  --format="get(privateIpGoogleAccess)"
```

Should return `True`.

## Testing from a VM Without an External IP

```bash
# SSH into the private VM using IAP (Identity-Aware Proxy)
gcloud compute ssh private-vm-01 \
  --project=$PROJECT_ID \
  --zone=us-central1-a \
  --tunnel-through-iap

# Inside the VM, test access to Cloud Storage API
curl -s -o /dev/null -w "%{http_code}" \
  https://storage.googleapis.com/storage/v1/b?project=$PROJECT_ID \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"
```

## Private Google Access DNS Resolution

By default, enabling Private Google Access does not change DNS resolution: `*.googleapis.com` still resolves to its public IP addresses, but the traffic is routed over Google's internal network. If you want DNS to resolve to the private VIP ranges instead, configure Cloud DNS private zones that map `*.googleapis.com` to `private.googleapis.com` (`199.36.153.8/30`) or `restricted.googleapis.com` (`199.36.153.4/30`).

```bash
# Verify DNS resolution from the VM
nslookup storage.googleapis.com
# By default returns public Google IPs
# With Cloud DNS mapped to private.googleapis.com, returns 199.36.153.8-11
```

## Creating Firewall Rules for Google API Traffic

```bash
# Allow egress to Google API address ranges
gcloud compute firewall-rules create allow-google-apis \
  --project=$PROJECT_ID \
  --network=prod-vpc \
  --action=ALLOW \
  --direction=EGRESS \
  --rules=tcp:443 \
  --destination-ranges=199.36.153.4/30,199.36.153.8/30,34.126.0.0/18
```

## Private Google Access vs VPC Service Controls

| Feature | Private Google Access | VPC Service Controls |
|---|---|---|
| Purpose | API access from private VMs | API access perimeter control |
| Traffic path | Google backbone | Google backbone |
| Access control | Network-level | Identity-level |
| Data exfiltration | Not prevented | Prevented |

## Disabling Private Google Access

```bash
gcloud compute networks subnets update app-subnet \
  --project=$PROJECT_ID \
  --region=$REGION \
  --no-enable-private-ip-google-access
```

## Enabling for All Subnets in a VPC

```bash
# List all subnets and enable Private Google Access on each
gcloud compute networks subnets list \
  --project=$PROJECT_ID \
  --filter="network:prod-vpc" \
  --format="value(name, region)" | while read NAME REGION; do
    gcloud compute networks subnets update "$NAME" \
      --project=$PROJECT_ID \
      --region="$REGION" \
      --enable-private-ip-google-access
  done
```

## Conclusion

Enable Private Google Access with `gcloud compute networks subnets update --enable-private-ip-google-access`. This is required for private VMs (no external IP) to reach Google APIs. Combined with VPC Service Controls, it provides both connectivity and fine-grained access control for your API traffic.
