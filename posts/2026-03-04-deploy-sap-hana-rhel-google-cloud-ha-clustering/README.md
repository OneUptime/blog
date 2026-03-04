# How to Deploy SAP HANA on RHEL in Google Cloud with HA Clustering

Author: [nawazdhandala](https://www.github.com/nawapdhandala)

Tags: RHEL, SAP HANA, Google Cloud, Pacemaker, High Availability, Cloud, Linux

Description: Deploy a highly available SAP HANA cluster on RHEL in Google Cloud Platform using Pacemaker with GCP-specific fencing and internal load balancer integration.

---

SAP HANA HA on RHEL in Google Cloud uses Pacemaker with GCP fence agents and an internal TCP load balancer for virtual IP management. GCP provides certified infrastructure for SAP workloads.

## GCP Infrastructure Setup

Create the required GCP resources using gcloud:

```bash
# Create two VM instances for HANA HA
gcloud compute instances create hana01 \
  --zone=us-central1-a \
  --machine-type=n2-highmem-32 \
  --image-family=rhel-9-4-sap-ha \
  --image-project=rhel-sap-cloud \
  --boot-disk-size=50GB \
  --tags=sap-hana

gcloud compute instances create hana02 \
  --zone=us-central1-b \
  --machine-type=n2-highmem-32 \
  --image-family=rhel-9-4-sap-ha \
  --image-project=rhel-sap-cloud \
  --boot-disk-size=50GB \
  --tags=sap-hana

# Create an internal load balancer for the virtual IP
gcloud compute health-checks create tcp hana-health-check \
  --port=62503 \
  --check-interval=10s \
  --timeout=10s

gcloud compute backend-services create hana-backend \
  --load-balancing-scheme=INTERNAL \
  --protocol=TCP \
  --health-checks=hana-health-check \
  --region=us-central1

gcloud compute forwarding-rules create hana-vip \
  --load-balancing-scheme=INTERNAL \
  --network=default \
  --subnet=default \
  --address=10.128.0.100 \
  --ip-protocol=TCP \
  --ports=ALL \
  --backend-service=hana-backend \
  --region=us-central1
```

## Installing Cluster Packages

On both VMs:

```bash
# Install HA and SAP packages
sudo dnf install -y pacemaker pcs \
  fence-agents-gce \
  resource-agents-sap-hana
```

## Configuring GCP Fencing

```bash
# Set up the cluster
sudo pcs cluster setup hana-ha hana01 hana02
sudo pcs cluster start --all

# Create GCP fence agents
sudo pcs stonith create fence-hana01 fence_gce \
  project="my-sap-project" \
  zone="us-central1-a" \
  plug="hana01" \
  pcmk_host_map="hana01:hana01" \
  pcmk_reboot_timeout=300 \
  op monitor interval=300

sudo pcs stonith create fence-hana02 fence_gce \
  project="my-sap-project" \
  zone="us-central1-b" \
  plug="hana02" \
  pcmk_host_map="hana02:hana02" \
  pcmk_reboot_timeout=300 \
  op monitor interval=300

# Location constraints for fencing
sudo pcs constraint location fence-hana01 avoids hana01
sudo pcs constraint location fence-hana02 avoids hana02
```

## Creating HA Resources

```bash
# Health check for load balancer
sudo pcs resource create healthcheck-hana azure-lb \
  port=62503 \
  op monitor interval=10

# HANA topology and instance resources
sudo pcs resource create SAPHanaTopology_HDB_00 SAPHanaTopology \
  SID=HDB InstanceNumber=00 \
  op monitor interval=10 timeout=600 \
  clone clone-max=2 clone-node-max=1 interleave=true

sudo pcs resource create SAPHana_HDB_00 SAPHana \
  SID=HDB InstanceNumber=00 \
  PREFER_SITE_TAKEOVER=true \
  AUTOMATED_REGISTER=true \
  promotable notify=true clone-max=2 clone-node-max=1

# Constraints
sudo pcs constraint colocation add healthcheck-hana with \
  Promoted SAPHana_HDB_00-clone 4000
sudo pcs constraint order promote SAPHana_HDB_00-clone then \
  start healthcheck-hana
```

Verify:

```bash
sudo pcs status
```
