# How to Set Up Filestore on a Shared VPC Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Filestore, Shared VPC, Networking, NFS

Description: Step-by-step guide to provisioning and accessing Google Cloud Filestore instances on a Shared VPC network across host and service projects.

---

Shared VPC is a common networking pattern in Google Cloud where a central host project owns the VPC network and multiple service projects use it for their resources. It is how most enterprises organize their GCP environments. Setting up Filestore in a Shared VPC requires a few extra steps compared to a standard VPC because you need to coordinate between the host project (which owns the network) and the service project (which typically creates the Filestore instance).

In this post, I will walk through the full process, from network configuration to instance creation to client access.

## Shared VPC Architecture Recap

In a Shared VPC setup:

- The **host project** owns the VPC network and subnets
- **Service projects** are attached to the host project and can use its networks
- Resources in service projects get IP addresses from the host project's subnets
- IAM permissions control which service projects can use which subnets

Filestore instances need to be connected to a VPC network. In a Shared VPC setup, that network lives in the host project, but the Filestore instance itself can live in either the host project or a service project.

## Prerequisites

Before starting, you need:

- A host project with Shared VPC enabled
- At least one service project attached to the host project
- The Filestore API enabled in the project where you will create the instance
- The `compute.networkUser` role in the host project for the service account creating the Filestore instance
- The `file.instances.create` permission in the project where the instance will be created

## Step 1 - Enable the Filestore API

Enable the API in whichever project will own the Filestore instance:

```bash
# Enable Filestore API in the service project
gcloud services enable file.googleapis.com --project=my-service-project
```

## Step 2 - Configure IAM Permissions

The service account or user creating the Filestore instance needs the ability to use the Shared VPC network. Grant the network user role in the host project:

```bash
# Grant the Filestore service agent permission to use the shared network
# The service agent format is: service-PROJECT_NUMBER@cloud-filer.iam.gserviceaccount.com
gcloud projects add-iam-policy-binding my-host-project \
  --member="serviceAccount:service-123456789@cloud-filer.iam.gserviceaccount.com" \
  --role="roles/compute.networkUser"
```

Replace `123456789` with the project number of your service project (not the project ID). You can find it with:

```bash
# Get the project number for the service project
gcloud projects describe my-service-project --format="value(projectNumber)"
```

This is a step that people frequently miss. Without this permission, the Filestore instance creation will fail with a permissions error that does not always clearly indicate the root cause.

## Step 3 - Identify the Shared Network and Subnet

Find the network and subnet you want to use:

```bash
# List available shared subnets from the service project
gcloud compute networks subnets list-usable --project=my-service-project
```

This shows the subnets from the host project that the service project is authorized to use. Note the network name and subnet details.

## Step 4 - Create the Filestore Instance

When creating the instance, reference the network using the full resource path that includes the host project:

```bash
# Create a Filestore instance on the Shared VPC network
# Note the network path includes the host project ID
gcloud filestore instances create shared-filestore \
  --project=my-service-project \
  --zone=us-central1-a \
  --tier=BASIC_HDD \
  --file-share=name=data,capacity=1TB \
  --network=name=projects/my-host-project/global/networks/shared-vpc
```

The key difference from a standard VPC setup is the `--network` parameter. Instead of just `name=default`, you specify the full path to the network in the host project: `name=projects/HOST_PROJECT_ID/global/networks/NETWORK_NAME`.

If you want the Filestore instance to use a specific IP range within the shared network:

```bash
# Create with a specific reserved IP range
gcloud filestore instances create shared-filestore \
  --project=my-service-project \
  --zone=us-central1-a \
  --tier=BASIC_HDD \
  --file-share=name=data,capacity=1TB \
  --network=name=projects/my-host-project/global/networks/shared-vpc,reserved-ip-range=filestore-range
```

## Step 5 - Verify the Instance

Check that the instance was created successfully and is connected to the correct network:

```bash
# Verify the instance details including network configuration
gcloud filestore instances describe shared-filestore \
  --project=my-service-project \
  --zone=us-central1-a \
  --format="yaml(state,networks,fileShares)"
```

The output should show the instance in READY state with an IP address from the shared network.

## Step 6 - Mount from VMs in Service Projects

VMs in any service project that shares the same VPC network can mount the Filestore share. SSH into a VM and mount it like any other NFS share:

```bash
# Install NFS client utilities
sudo apt-get update && sudo apt-get install -y nfs-common

# Create mount point and mount the share
sudo mkdir -p /mnt/shared-data
sudo mount -t nfs FILESTORE_IP:/data /mnt/shared-data

# Verify the mount
df -h /mnt/shared-data
```

## Cross-Project Access

One of the benefits of Shared VPC is that Filestore instances are accessible from any project connected to the same network. If you have multiple service projects that all use the shared VPC, VMs in any of those projects can mount the same Filestore share.

This is useful for shared datasets. For example, a data engineering team in one project can write processed data to Filestore, and an ML team in another project can read it for training jobs.

## Firewall Considerations

Firewall rules in a Shared VPC are managed in the host project. If you have restrictive firewall rules, make sure NFS traffic is allowed:

```bash
# Create a firewall rule in the host project to allow NFS traffic
gcloud compute firewall-rules create allow-nfs \
  --project=my-host-project \
  --network=shared-vpc \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:2049 \
  --source-ranges=10.0.0.0/8 \
  --target-tags=nfs-client
```

You also need egress rules if you have default-deny egress policies:

```bash
# Allow egress to Filestore IP on NFS port
gcloud compute firewall-rules create allow-nfs-egress \
  --project=my-host-project \
  --network=shared-vpc \
  --direction=EGRESS \
  --action=ALLOW \
  --rules=tcp:2049 \
  --destination-ranges=10.0.0.0/24
```

## Using Filestore with GKE on Shared VPC

If you are running GKE clusters on a Shared VPC, the Filestore CSI driver needs additional permissions. The GKE service account needs network access, and the CSI driver service account needs to create Filestore instances.

```bash
# Grant the GKE node service account the network user role
gcloud projects add-iam-policy-binding my-host-project \
  --member="serviceAccount:my-service-project.svc.id.goog[kube-system/filestore-csi-controller-sa]" \
  --role="roles/compute.networkUser"
```

When creating a StorageClass for dynamic provisioning in a Shared VPC cluster, specify the network path:

```yaml
# StorageClass for Filestore on Shared VPC
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: filestore-shared-vpc
provisioner: filestore.csi.storage.gke.io
parameters:
  tier: standard
  # Use the full network path for Shared VPC
  network: projects/my-host-project/global/networks/shared-vpc
volumeBindingMode: Immediate
allowVolumeExpansion: true
```

## Troubleshooting Common Issues

**Permission denied during instance creation:** Make sure the Filestore service agent has the `compute.networkUser` role in the host project. This is the most common issue.

**Instance created but cannot mount:** Check that the VM and Filestore instance are on the same network. Verify firewall rules allow NFS traffic (TCP 2049).

**Network not found:** Double-check the full network path format: `projects/HOST_PROJECT/global/networks/NETWORK_NAME`. A typo in the host project ID or network name will cause this error.

**GKE CSI driver fails to provision:** Verify that the CSI driver service account has both Filestore editor and network user permissions.

Setting up Filestore on a Shared VPC takes a few extra IAM and network configuration steps compared to a simple VPC setup, but once it is done, it works seamlessly. The main thing to remember is that the Filestore service agent in your service project needs network access in the host project - get that right and everything else falls into place.
