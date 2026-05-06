# How to Configure Firewall Rules for IPv4 Traffic in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firewall Rules, IPv4, Security, VPC, Networking

Description: Create and manage GCP VPC firewall rules to allow or deny IPv4 traffic for compute instances, using source and target filters including tags, service accounts, and CIDR ranges.

## Introduction

GCP firewall rules are stateful and applied at the VPC level. Rules use priority numbers (0–65535, lower = higher priority). Target instances are selected using network tags or service accounts. Ingress rules filter incoming traffic; egress rules filter outgoing traffic. The default implied rules deny all ingress and allow all egress.

## Creating an Ingress Allow Rule

```bash
PROJECT_ID="my-gcp-project"

# Allow HTTP from anywhere to instances tagged "web-server"

gcloud compute firewall-rules create allow-http \
  --project=$PROJECT_ID \
  --network=prod-vpc \
  --action=ALLOW \
  --direction=INGRESS \
  --rules=tcp:80 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=web-server \
  --priority=1000

# Allow HTTPS
gcloud compute firewall-rules create allow-https \
  --project=$PROJECT_ID \
  --network=prod-vpc \
  --action=ALLOW \
  --direction=INGRESS \
  --rules=tcp:443 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=web-server \
  --priority=1000

# Allow SSH from a specific admin IP range
gcloud compute firewall-rules create allow-ssh-admin \
  --project=$PROJECT_ID \
  --network=prod-vpc \
  --action=ALLOW \
  --direction=INGRESS \
  --rules=tcp:22 \
  --source-ranges=203.0.113.0/24 \
  --target-tags=allow-ssh \
  --priority=1000
```

## Creating an Ingress Deny Rule

```bash
# Deny all ingress to database tier except from app tier
gcloud compute firewall-rules create deny-all-to-db \
  --project=$PROJECT_ID \
  --network=prod-vpc \
  --action=DENY \
  --direction=INGRESS \
  --rules=all \
  --source-ranges=0.0.0.0/0 \
  --target-tags=db-server \
  --priority=65000

# Allow app tier to reach db on port 5432
gcloud compute firewall-rules create allow-app-to-db \
  --project=$PROJECT_ID \
  --network=prod-vpc \
  --action=ALLOW \
  --direction=INGRESS \
  --rules=tcp:5432 \
  --source-tags=app-server \
  --target-tags=db-server \
  --priority=900
```

## Egress Rules

```bash
# Deny all egress (explicit) then allow selectively
gcloud compute firewall-rules create deny-all-egress \
  --project=$PROJECT_ID \
  --network=prod-vpc \
  --action=DENY \
  --direction=EGRESS \
  --rules=all \
  --destination-ranges=0.0.0.0/0 \
  --priority=65000

gcloud compute firewall-rules create allow-egress-http \
  --project=$PROJECT_ID \
  --network=prod-vpc \
  --action=ALLOW \
  --direction=EGRESS \
  --rules=tcp:80,tcp:443 \
  --destination-ranges=0.0.0.0/0 \
  --priority=1000
```

## Using Service Accounts as Targets

More secure than tags - service accounts are identity-based and more tightly controlled by IAM:

```bash
# Allow internal traffic to instances running a specific service account
gcloud compute firewall-rules create allow-sa-to-sa \
  --project=$PROJECT_ID \
  --network=prod-vpc \
  --action=ALLOW \
  --direction=INGRESS \
  --rules=tcp:8080 \
  --source-service-accounts=app-sa@my-gcp-project.iam.gserviceaccount.com \
  --target-service-accounts=backend-sa@my-gcp-project.iam.gserviceaccount.com
```

## Listing and Describing Rules

```bash
# List all rules for the VPC
gcloud compute firewall-rules list \
  --project=$PROJECT_ID \
  --filter="network=prod-vpc" \
  --format="table(name, direction, priority, sourceRanges.list(), allowed[].map().firewall_rule().list(), targetTags.list())"

# Describe a specific rule
gcloud compute firewall-rules describe allow-http --project=$PROJECT_ID
```

## Applying Tags to Instances

```bash
# Add network tags to a VM
gcloud compute instances add-tags web-vm-01 \
  --project=$PROJECT_ID \
  --zone=us-central1-a \
  --tags=web-server,allow-ssh
```

## Conclusion

GCP firewall rules use priority-based matching with tags or service accounts as instance selectors. Lower priority numbers win. Use `--target-tags` for simple targeting and `--target-service-accounts` for secure service-to-service rules. Allow specific traffic before adding a broad deny rule at a higher number (65000+) so lower-numbered rules take precedence.
