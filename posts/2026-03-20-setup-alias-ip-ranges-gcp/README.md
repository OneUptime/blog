# How to Set Up Alias IP Ranges for GCP Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Alias IP, IPv4, Kubernetes, Compute Engine, Networking

Description: Configure alias IP ranges on GCP Compute Engine instances to assign multiple IPv4 addresses from a subnet to a single VM or to Kubernetes pods running on that VM.

## Introduction

Alias IP ranges allow a VM's network interface to have additional secondary IPv4 address ranges assigned from the subnet. This is commonly used with Kubernetes Engine (GKE) to assign pod IP addresses from the VPC subnet directly, enabling native VPC routing for pod traffic.

## Adding Alias IP Range at Instance Creation

```bash
PROJECT_ID="my-gcp-project"

# Create a VM with an alias IP range for pods

gcloud compute instances create k8s-node-01 \
  --project=$PROJECT_ID \
  --zone=us-central1-a \
  --machine-type=e2-standard-4 \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --network-interface="subnet=app-subnet,aliases=/24"
```

`aliases=/24` allocates a /24 block from the subnet as an alias range - Google Cloud routes that block to the VM interface.

## Adding Alias IP Range to an Existing Instance

```bash
# Set a specific alias IP range on a running VM
gcloud compute instances network-interfaces update k8s-node-01 \
  --project=$PROJECT_ID \
  --zone=us-central1-a \
  --aliases=10.1.2.64/26
```

`--aliases` replaces the alias ranges on that interface, so include any existing ranges that you want to keep.

## Configuring Alias Range on the OS

On Google-provided Linux images, the guest agent normally configures alias ranges as local routes automatically. Verify the local route, and add it manually only if your image does not:

```bash
# Verify that the alias range is local to the VM
ip route show table local | grep -F "10.1.2.64/26"

# If the route is missing on a custom image, add it manually
sudo ip route add to local 10.1.2.64/26 dev ens4 proto 66

# Verify
ip route show table local | grep -F "10.1.2.64/26"
```

## Subnet-Level Secondary IP Ranges

To use alias IPs with GKE, create a secondary range on the subnet:

```bash
# Add a secondary range to the subnet for pod IPs
gcloud compute networks subnets update app-subnet \
  --project=$PROJECT_ID \
  --region=us-central1 \
  --add-secondary-ranges=pods=10.4.0.0/14

# Add another for services
gcloud compute networks subnets update app-subnet \
  --project=$PROJECT_ID \
  --region=us-central1 \
  --add-secondary-ranges=services=10.8.0.0/20
```

## Using Alias IPs with GKE (VPC-Native Clusters)

```bash
# Create a VPC-native GKE cluster using secondary ranges
gcloud container clusters create prod-cluster \
  --project=$PROJECT_ID \
  --zone=us-central1-a \
  --network=prod-vpc \
  --subnetwork=app-subnet \
  --cluster-secondary-range-name=pods \
  --services-secondary-range-name=services \
  --enable-ip-alias
```

With this configuration, each pod gets an IP from the `pods` secondary range, making pods directly reachable from other VMs in the VPC without NAT.

## Viewing Alias IP Ranges

```bash
# List alias IP ranges for an instance
gcloud compute instances describe k8s-node-01 \
  --project=$PROJECT_ID \
  --zone=us-central1-a \
  --format="get(networkInterfaces[0].aliasIpRanges)"

# List secondary ranges on a subnet
gcloud compute networks subnets describe app-subnet \
  --project=$PROJECT_ID \
  --region=us-central1 \
  --format="get(secondaryIpRanges)"
```

## Removing an Alias IP Range

```bash
gcloud compute instances network-interfaces update k8s-node-01 \
  --project=$PROJECT_ID \
  --zone=us-central1-a \
  --aliases=""
```

## Conclusion

Alias IP ranges enable secondary IPv4 addresses on GCP VM interfaces. Create subnet-level secondary ranges with `--add-secondary-ranges` and reference them with `--aliases` on VM instances or the GKE secondary range flags for clusters. VPC-native GKE clusters rely on alias IPs for pod networking, enabling direct pod IP routing within the VPC.
