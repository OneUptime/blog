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
- The Service Networking API enabled and private services access configured on the Shared VPC network
- The `file.instances.create` permission in the project where the instance will be created

## Step 1 - Enable the Filestore API

Enable the Filestore API in whichever project will own the Filestore instance, and enable the Service Networking API in the host project if private services access is not already configured:

```bash
# Enable Filestore API in the service project
gcloud services enable file.googleapis.com --project=my-service-project

# Enable Service Networking API in the host project
gcloud services enable servicenetworking.googleapis.com --project=my-host-project
```

## Step 2 - Configure Private Services Access

To create a Filestore instance in a service project on a Shared VPC network, the Shared VPC network must have private services access enabled. First check whether a private services access peering already exists:

```bash
# Check for an existing private services access peering
gcloud beta services vpc-peerings list \
  --network=shared-vpc \
  --project=my-host-project
```

If the peering does not exist, reserve an allocated IP range in the host project and create the private connection:

```bash
# Reserve a range for Google-managed services
gcloud compute addresses create google-service-range \
  --global \
  --purpose=VPC_PEERING \
  --prefix-length=20 \
  --description="Peering range for Google managed services" \
  --network=shared-vpc \
  --project=my-host-project

# Create the private services access connection
gcloud services vpc-peerings connect \
  --service=servicenetworking.googleapis.com \
  --ranges=google-service-range \
  --network=shared-vpc \
  --project=my-host-project
```

This is a step that people frequently miss. Without private services access, Filestore instance creation from the service project will fail even if the Shared VPC network path is correct.

## Step 3 - Identify the Shared Network and Subnet

Find the network and subnet you want to use:

```bash
# List available shared subnets from the service project
gcloud compute networks subnets list-usable \
  --project=my-host-project \
  --service-project=my-service-project
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
  --file-share=name=data,capacity=1TiB \
  --network=name=projects/my-host-project/global/networks/shared-vpc,connect-mode=PRIVATE_SERVICE_ACCESS
```

The key difference from a standard VPC setup is the `--network` parameter. Instead of just `name=default`, you specify the full path to the network in the host project and set `connect-mode=PRIVATE_SERVICE_ACCESS`: `name=projects/HOST_PROJECT_ID/global/networks/NETWORK_NAME,connect-mode=PRIVATE_SERVICE_ACCESS`.

If you want the Filestore instance to use a specific IP range within the shared network:

```bash
# Create with a specific reserved IP range
gcloud filestore instances create shared-filestore \
  --project=my-service-project \
  --zone=us-central1-a \
  --tier=BASIC_HDD \
  --file-share=name=data,capacity=1TiB \
  --network=name=projects/my-host-project/global/networks/shared-vpc,connect-mode=PRIVATE_SERVICE_ACCESS,reserved-ip-range=google-service-range
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

Firewall rules in a Shared VPC are managed in the host project. If you have restrictive egress rules, make sure clients can reach the Filestore reserved IP range on the NFS ports:

```bash
# Allow client egress to the Filestore reserved IP range
gcloud compute firewall-rules create allow-filestore-egress \
  --project=my-host-project \
  --network=shared-vpc \
  --direction=EGRESS \
  --action=ALLOW \
  --rules=tcp:111,tcp:2046,tcp:2049,tcp:2050,tcp:4045 \
  --destination-ranges=10.0.0.0/24 \
  --target-tags=nfs-client
```

If your applications use NFS file locking and your ingress rules block traffic from Filestore back to client VMs, allow the required client-side NFS ports from the Filestore reserved IP range:

```bash
# Allow Filestore traffic back to clients for NFS locking
gcloud compute firewall-rules create allow-filestore-locking-ingress \
  --project=my-host-project \
  --network=shared-vpc \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:111,tcp:2046,tcp:4045 \
  --source-ranges=10.0.0.0/24 \
  --target-tags=nfs-client
```

## Using Filestore with GKE on Shared VPC

If you are running GKE clusters on a Shared VPC, complete the standard Shared VPC setup for the cluster, including granting the Host Service Agent User role to the service project's GKE service account on the host project and enabling private services access on the Shared VPC network.

```bash
# Grant the Host Service Agent User role to the service project's GKE service account
# The service account format is: service-SERVICE_PROJECT_NUMBER@container-engine-robot.iam.gserviceaccount.com
gcloud projects add-iam-policy-binding my-host-project \
  --member="serviceAccount:service-123456789@container-engine-robot.iam.gserviceaccount.com" \
  --role="roles/container.hostServiceAgentUser"
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
  # Use the full network path for Shared VPC
  network: projects/my-host-project/global/networks/shared-vpc
  connect-mode: PRIVATE_SERVICE_ACCESS
  reserved-ip-range: google-service-range
volumeBindingMode: Immediate
allowVolumeExpansion: true
```

## Troubleshooting Common Issues

**Permission denied during instance creation:** Make sure the user or service account creating the instance has Filestore permissions in the service project, and make sure private services access is configured on the Shared VPC network in the host project.

**Instance created but cannot mount:** Check that the VM and Filestore instance are on the same network. Verify firewall rules allow NFS traffic (TCP 2049).

**Network not found:** Double-check the full network path format: `projects/HOST_PROJECT/global/networks/NETWORK_NAME`. A typo in the host project ID or network name will cause this error.

**GKE CSI driver fails to provision:** Verify that the service project's GKE service account has the Host Service Agent User role in the host project, the cluster has the Filestore CSI driver enabled, and the StorageClass uses `connect-mode: PRIVATE_SERVICE_ACCESS`.

Setting up Filestore on a Shared VPC takes a few extra IAM and network configuration steps compared to a simple VPC setup, but once it is done, it works seamlessly. The main thing to remember is that service-project Filestore instances need private services access on the Shared VPC network - get that right and everything else falls into place.
