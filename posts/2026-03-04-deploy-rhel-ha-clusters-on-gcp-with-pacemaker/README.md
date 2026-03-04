# How to Deploy RHEL HA Clusters on GCP with Pacemaker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GCP, Pacemaker, High Availability, Cluster, Cloud

Description: Set up a Pacemaker-based high availability cluster on Google Cloud Platform using RHEL with the GCP fence agent for proper STONITH fencing.

---

Running a Pacemaker HA cluster on GCP requires a fence agent that can communicate with the GCP API to power cycle failed nodes. RHEL provides the `fence_gce` agent for this purpose.

## Install HA Packages on Both Nodes

```bash
# Enable the HA repo
sudo subscription-manager repos --enable=rhel-9-for-x86_64-highavailability-rpms

# Install cluster packages
sudo dnf install -y pcs pacemaker fence-agents-gce resource-agents-gcp
```

## Set Up the Cluster

```bash
# Set hacluster password on both nodes
sudo passwd hacluster

# Enable pcsd
sudo systemctl enable --now pcsd

# Authenticate (run from node1)
sudo pcs host auth node1 node2 -u hacluster -p 'YourPassword'

# Create and start the cluster
sudo pcs cluster setup gcp-ha-cluster node1 node2
sudo pcs cluster start --all
sudo pcs cluster enable --all
```

## Configure the GCP Service Account

The VMs need a service account with the Compute Instance Admin role. If you are using the default compute service account, verify it has the right permissions:

```bash
# Check the service account attached to the VM
curl -s -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email
```

## Configure STONITH with fence_gce

```bash
# Create the GCP fence device
sudo pcs stonith create fence-gcp fence_gce \
  project="my-gcp-project" \
  zone="us-central1-a" \
  pcmk_host_map="node1:node1-instance-name;node2:node2-instance-name" \
  pcmk_reboot_timeout=300 \
  pcmk_monitor_retries=4

# Set cluster properties
sudo pcs property set stonith-enabled=true
sudo pcs property set no-quorum-policy=ignore
```

## Add a Virtual IP Using a GCP Alias IP

GCP does not support traditional floating IPs. Use an alias IP or an internal load balancer:

```bash
# Assign an alias IP to the primary node's NIC
gcloud compute instances network-interfaces update node1 \
  --zone us-central1-a \
  --aliases "10.128.0.100/32"
```

## Verify

```bash
# Check the cluster status
sudo pcs status

# Verify fencing is configured
sudo pcs stonith show
```

Test failover by stopping Pacemaker on one node and verifying that resources migrate to the other node and fencing triggers correctly.
