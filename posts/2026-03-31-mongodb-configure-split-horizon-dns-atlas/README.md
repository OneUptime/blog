# How to Configure Split Horizon DNS for MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, DNS, Networking, Configuration

Description: Configure split horizon DNS for MongoDB Atlas so internal clients use private endpoints while external clients resolve to public Atlas hostnames automatically.

---

## What is Split Horizon DNS

Split horizon DNS (also called split DNS or split-brain DNS) means that the same DNS name resolves to different IP addresses depending on where the query originates. For MongoDB Atlas, this allows:
- Internal clients (in your VPC) to resolve Atlas hostnames to private endpoint IPs
- External clients to resolve the same hostnames to public Atlas IPs

This eliminates the need to maintain two separate connection strings.

## When Split Horizon DNS is Needed

If you use AWS PrivateLink, Azure Private Link, or GCP Private Service Connect, Atlas provides a separate private endpoint hostname. Without split horizon DNS, your application must explicitly use the private hostname internally. With split horizon DNS, you can use a single connection string everywhere.

## Setting Up Split Horizon DNS on AWS with Route 53

### Step 1: Create a Private Hosted Zone

```bash
aws route53 create-hosted-zone \
  --name "mongodb.net" \
  --caller-reference "atlas-split-dns-$(date +%s)" \
  --vpc "VPCRegion=us-east-1,VPCId=vpc-0yourappvpc"
```

The `--vpc` flag automatically makes this a private hosted zone. Do not pass `PrivateZone=true` in `--hosted-zone-config` as it is an output-only field.

### Step 2: Create A Records for Each Shard Host

Get the private IP addresses of your PrivateLink endpoints, then create A records:

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "cluster0-shard-00-00.abcde.mongodb.net",
        "Type": "A",
        "TTL": 60,
        "ResourceRecords": [{"Value": "10.0.1.5"}]
      }
    }]
  }'
```

Repeat for each shard hostname in your replica set.

### Step 3: Create SRV and TXT Records

A private hosted zone for `mongodb.net` intercepts all DNS queries for that domain from within the VPC. If you use `mongodb+srv://` connection strings, you must also create SRV and TXT records so the driver can discover replica set members:

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "_mongodb._tcp.cluster0.abcde.mongodb.net",
          "Type": "SRV",
          "TTL": 60,
          "ResourceRecords": [
            {"Value": "0 0 27017 cluster0-shard-00-00.abcde.mongodb.net"},
            {"Value": "0 0 27017 cluster0-shard-00-01.abcde.mongodb.net"},
            {"Value": "0 0 27017 cluster0-shard-00-02.abcde.mongodb.net"}
          ]
        }
      },
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "cluster0.abcde.mongodb.net",
          "Type": "TXT",
          "TTL": 60,
          "ResourceRecords": [
            {"Value": "\"authSource=admin&replicaSet=atlas-xxxxxx-shard-0\""}
          ]
        }
      }
    ]
  }'
```

Copy the SRV and TXT record values from the public DNS records for your cluster (use `dig SRV _mongodb._tcp.cluster0.abcde.mongodb.net` and `dig TXT cluster0.abcde.mongodb.net` to retrieve them).

### Step 4: Associate the Zone with Additional VPCs (Optional)

```bash
aws route53 associate-vpc-with-hosted-zone \
  --hosted-zone-id Z1234567890ABC \
  --vpc "VPCRegion=us-east-1,VPCId=vpc-0secondaryvpc"
```

## Setting Up Split Horizon DNS on GCP with Cloud DNS

```bash
gcloud dns managed-zones create atlas-internal \
  --dns-name="mongodb.net." \
  --description="Internal Atlas resolution" \
  --visibility=private \
  --networks=my-vpc

gcloud dns record-sets create cluster0-shard-00-00.abcde.mongodb.net. \
  --zone=atlas-internal \
  --type=A \
  --ttl=60 \
  --rrdatas=10.128.0.10
```

Repeat for each shard hostname. As with AWS, you must also create SRV and TXT records in the private zone for `mongodb+srv://` connection strings to work:

```bash
gcloud dns record-sets create _mongodb._tcp.cluster0.abcde.mongodb.net. \
  --zone=atlas-internal \
  --type=SRV \
  --ttl=60 \
  --rrdatas="0 0 27017 cluster0-shard-00-00.abcde.mongodb.net.","0 0 27017 cluster0-shard-00-01.abcde.mongodb.net.","0 0 27017 cluster0-shard-00-02.abcde.mongodb.net."

gcloud dns record-sets create cluster0.abcde.mongodb.net. \
  --zone=atlas-internal \
  --type=TXT \
  --ttl=60 \
  --rrdatas='"authSource=admin&replicaSet=atlas-xxxxxx-shard-0"'
```

## Verifying Resolution

From inside the VPC, the hostname should resolve to the private IP:

```bash
dig cluster0-shard-00-00.abcde.mongodb.net +short
# Expected: 10.0.1.5 (private IP)
```

From outside the VPC:

```bash
dig cluster0-shard-00-00.abcde.mongodb.net +short
# Expected: 34.200.x.x (public Atlas IP)
```

## Using the Same Connection String Everywhere

With split horizon DNS configured, a single SRV connection string works for both internal and external clients:

```javascript
const uri = "mongodb+srv://cluster0.abcde.mongodb.net/?authSource=admin";
const client = new MongoClient(uri);
// Resolves to private IP inside VPC, public IP outside
```

## Summary

Split horizon DNS for MongoDB Atlas configures your internal DNS to resolve Atlas hostnames to private endpoint IPs while public DNS continues to return public IPs. On AWS, this uses Route 53 private hosted zones; on GCP, Cloud DNS private zones. Once configured, a single connection string works across environments, simplifying application configuration and eliminating the need to maintain separate private and public connection strings.
