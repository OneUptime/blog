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
gcloud compute addresses create hana-vip \
  --region=us-central1 \
  --subnet=default \
  --addresses=10.128.0.100

gcloud compute instance-groups unmanaged create hana01-ig \
  --zone=us-central1-a

gcloud compute instance-groups unmanaged add-instances hana01-ig \
  --zone=us-central1-a \
  --instances=hana01

gcloud compute instance-groups unmanaged create hana02-ig \
  --zone=us-central1-b

gcloud compute instance-groups unmanaged add-instances hana02-ig \
  --zone=us-central1-b \
  --instances=hana02

gcloud compute health-checks create tcp hana-health-check \
  --port=62503 \
  --proxy-header=NONE \
  --check-interval=10 \
  --timeout=10 \
  --unhealthy-threshold=2 \
  --healthy-threshold=2

gcloud compute firewall-rules create allow-hana-health-checks \
  --network=default \
  --action=ALLOW \
  --direction=INGRESS \
  --source-ranges=35.191.0.0/16,130.211.0.0/22 \
  --target-tags=sap-hana \
  --rules=tcp:62503

gcloud compute backend-services create hana-backend \
  --load-balancing-scheme=INTERNAL \
  --health-checks=hana-health-check \
  --no-connection-drain-on-failover \
  --drop-traffic-if-unhealthy \
  --failover-ratio=1.0 \
  --region=us-central1 \
  --global-health-checks

gcloud compute backend-services add-backend hana-backend \
  --instance-group=hana01-ig \
  --instance-group-zone=us-central1-a \
  --region=us-central1

gcloud compute backend-services add-backend hana-backend \
  --instance-group=hana02-ig \
  --instance-group-zone=us-central1-b \
  --failover \
  --region=us-central1

gcloud compute forwarding-rules create hana-vip \
  --load-balancing-scheme=INTERNAL \
  --address=10.128.0.100 \
  --ports=ALL \
  --backend-service=hana-backend \
  --region=us-central1
```

## Installing Cluster Packages

On both VMs:

```bash
# Install HA and SAP packages
sudo dnf install -y pacemaker pcs \
  haproxy \
  fence-agents-gce \
  resource-agents-gcp \
  resource-agents-sap-hana

sudo sed -i 's/^[[:space:]]*mode[[:space:]].*/  mode tcp/' /etc/haproxy/haproxy.cfg

sudo tee -a /etc/haproxy/haproxy.cfg >/dev/null <<'EOF'
listen healthcheck
  bind *:62503
EOF
```

## Configuring GCP Fencing

```bash
# Set up the cluster
sudo systemctl enable --now pcsd.service
sudo pcs host auth hana01 hana02
sudo pcs cluster setup hana-ha hana01 hana02
sudo pcs cluster enable --all
sudo pcs cluster start --all

# Create GCP fence agents
sudo pcs stonith create fence-hana01 fence_gce \
  project="my-sap-project" \
  zone="us-central1-a" \
  port="hana01" \
  pcmk_reboot_timeout=300 \
  pcmk_monitor_retries=4 \
  pcmk_delay_max=30 \
  op monitor interval="300s" timeout="120s" \
  op start interval="0" timeout="60s"

sudo pcs stonith create fence-hana02 fence_gce \
  project="my-sap-project" \
  zone="us-central1-b" \
  port="hana02" \
  pcmk_reboot_timeout=300 \
  pcmk_monitor_retries=4 \
  op monitor interval="300s" timeout="120s" \
  op start interval="0" timeout="60s"

# Location constraints for fencing
sudo pcs constraint location fence-hana01 avoids hana01
sudo pcs constraint location fence-hana02 avoids hana02
```

## Creating HA Resources

```bash
# Health check for load balancer
sudo pcs resource create vip-hana \
  IPaddr2 ip="10.128.0.100" nic=lo cidr_netmask=32 \
  op monitor interval=3600s timeout=60s

sudo pcs resource create healthcheck-hana service:haproxy \
  op monitor interval=10s timeout=20s

# HANA topology and instance resources
sudo pcs resource create SAPHanaTopology_HDB_00 SAPHanaTopology \
  SID=HDB InstanceNumber=00 \
  op monitor interval=10 timeout=600 \
  clone clone-max=2 clone-node-max=1 interleave=true

sudo pcs resource create SAPHana_HDB_00 SAPHana \
  SID=HDB InstanceNumber=00 \
  PREFER_SITE_TAKEOVER=true \
  DUPLICATE_PRIMARY_TIMEOUT=7200 \
  AUTOMATED_REGISTER=true \
  op start timeout=3600 \
  op stop timeout=3600 \
  op monitor interval=61 role="Slave" timeout=700 \
  op monitor interval=59 role="Master" timeout=700 \
  op promote timeout=3600 \
  op demote timeout=3600 \
  promotable meta notify=true clone-max=2 clone-node-max=1 interleave=true

# Constraints
sudo pcs resource group add g-primary healthcheck-hana vip-hana

sudo pcs constraint order SAPHanaTopology_HDB_00-clone then \
  SAPHana_HDB_00-clone symmetrical=false

sudo pcs constraint colocation add g-primary with \
  master SAPHana_HDB_00-clone 4000
```

Verify:

```bash
sudo pcs status
```
