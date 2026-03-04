# How to Deploy RHEL 9 HA Clusters on GCP with Pacemaker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, GCP, High Availability, Pacemaker

Description: Step-by-step guide on deploy rhel 9 ha clusters on gcp with pacemaker with practical examples and commands.

---

Google Cloud Platform provides the infrastructure for running RHEL 9 HA clusters. This guide covers deploying Pacemaker-based clusters on GCP with proper fencing and health checks.

## Prerequisites

- Two or more RHEL 9 VMs on GCP
- Active Red Hat subscription
- gcloud CLI configured
- VMs in the same VPC network and subnet

## Install HA Packages

On all nodes:

```bash
sudo dnf install -y pcs pacemaker fence-agents-gce resource-agents
```

Enable PCS:

```bash
sudo systemctl enable --now pcsd
```

## Configure Cluster Authentication

Set the hacluster password on all nodes:

```bash
echo 'ClusterPass456!' | sudo passwd --stdin hacluster
```

Authenticate from one node:

```bash
sudo pcs host auth node1 node2 -u hacluster -p 'ClusterPass456!'
```

## Create the Cluster

```bash
sudo pcs cluster setup gcp-ha-cluster node1 node2
sudo pcs cluster start --all
sudo pcs cluster enable --all
```

## Configure GCP Fence Agent

Create a service account with Compute Admin role, then download the JSON key.

```bash
sudo pcs stonith create fence-gce fence_gce \
  project=<project-id> \
  zone=<zone> \
  port_as_ip=true \
  pcmk_monitor_timeout=120 \
  power_timeout=240
```

## Configure Internal Load Balancer Health Check

GCP uses an internal load balancer with a health check resource:

```bash
sudo pcs resource create health-check-gcp gcp-ilb-resource \
  port=61000
```

## Create an Alias IP Resource

```bash
sudo pcs resource create vip gcp-vpc-move-vip \
  alias_ip=10.0.0.100/32
```

## Group and Constrain Resources

```bash
sudo pcs resource group add ha-group vip health-check-gcp
sudo pcs property set stonith-enabled=true
```

## Verify Cluster Status

```bash
sudo pcs status
sudo crm_mon -1
```

## Test Failover

```bash
sudo pcs node standby node1
sudo pcs status
# Verify resources moved to node2
sudo pcs node unstandby node1
```

## Conclusion

Your RHEL 9 HA cluster on GCP is now operational with Pacemaker, GCP fencing, and internal load balancer integration. Regularly test failover and monitor cluster health to maintain availability.

