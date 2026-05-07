# How to Assign Static External IPv4 Addresses to GCP Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Static IP, IPv4, Compute Engine, External IP, Networking

Description: Reserve and assign static external IPv4 addresses to GCP Compute Engine instances using gcloud, and promote ephemeral IPs to static addresses.

## Introduction

GCP assigns ephemeral external IPs by default - these change when you stop and restart an instance. Static external IPv4 addresses are reserved and remain assigned to your project until you release them, even when not attached to an instance.

## Reserving a Static External IPv4 Address

```bash
PROJECT_ID="my-gcp-project"
REGION="us-central1"

# Reserve a regional static IP

gcloud compute addresses create web-static-ip \
  --project=$PROJECT_ID \
  --region=$REGION

# View the reserved IP address
gcloud compute addresses describe web-static-ip \
  --project=$PROJECT_ID \
  --region=$REGION \
  --format="get(address)"
```

## Assigning the Static IP at Instance Creation

```bash
STATIC_IP=$(gcloud compute addresses describe web-static-ip \
  --project=$PROJECT_ID \
  --region=$REGION \
  --format="get(address)")

gcloud compute instances create web-vm-01 \
  --project=$PROJECT_ID \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --address=$STATIC_IP \
  --subnet=web-subnet
```

## Assigning a Static IP to an Existing Instance

```bash
STATIC_IP=$(gcloud compute addresses describe web-static-ip \
  --project=$PROJECT_ID \
  --region=$REGION \
  --format="get(address)")

ACCESS_CONFIG_NAME=$(gcloud compute instances describe web-vm-01 \
  --project=$PROJECT_ID \
  --zone=us-central1-a \
  --format="get(networkInterfaces[0].accessConfigs[0].name)")

# First, delete the current access config (removes the ephemeral IP)
gcloud compute instances delete-access-config web-vm-01 \
  --project=$PROJECT_ID \
  --zone=us-central1-a \
  --access-config-name="$ACCESS_CONFIG_NAME"

# Add the static IP as the new access config
gcloud compute instances add-access-config web-vm-01 \
  --project=$PROJECT_ID \
  --zone=us-central1-a \
  --access-config-name="$ACCESS_CONFIG_NAME" \
  --address=$STATIC_IP
```

## Promoting an Ephemeral IP to Static

If you want to keep an existing instance's IP permanently:

```bash
# Get the current external IP
CURRENT_IP=$(gcloud compute instances describe web-vm-01 \
  --project=$PROJECT_ID \
  --zone=us-central1-a \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)")

# Promote it to static
gcloud compute addresses create web-static-ip \
  --project=$PROJECT_ID \
  --region=$REGION \
  --addresses=$CURRENT_IP
```

## Global Static IPs for HTTPS Load Balancers

Global IPs are required for global load balancers:

```bash
# Reserve a global static IP
gcloud compute addresses create lb-global-ip \
  --project=$PROJECT_ID \
  --global

# View the global IP
gcloud compute addresses describe lb-global-ip \
  --project=$PROJECT_ID \
  --global \
  --format="get(address)"
```

## Listing All Reserved Addresses

```bash
# List regional IPs
gcloud compute addresses list \
  --project=$PROJECT_ID \
  --regions=$REGION

# List global IPs
gcloud compute addresses list \
  --project=$PROJECT_ID \
  --global

# List all with status
gcloud compute addresses list \
  --project=$PROJECT_ID \
  --format="table(name, address, status, region)"
```

## Releasing a Static IP

```bash
# Release (delete) a regional static IP
gcloud compute addresses delete web-static-ip \
  --project=$PROJECT_ID \
  --region=$REGION \
  --quiet
```

Note: With the gcloud CLI or API, you can release an IP even if it is in use. If it is attached to a resource, it remains attached until that resource is deleted.

## Billing Note

Static external IPv4 addresses incur charges. Reserved addresses that aren't assigned to a resource are charged at a higher rate than addresses that are in use. Release unused IPs to avoid unnecessary costs.

## Conclusion

Reserve static external IPv4 addresses with `gcloud compute addresses create`, then attach them to instances at creation time or by modifying the access config. Promote ephemeral IPs to static using `--addresses=<existing-ip>`. Use global static IPs for global HTTP(S) load balancers. Release unused reserved IPs to avoid charges.
