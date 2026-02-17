# How to Create a Compute Engine VM from a Snapshot of Another Instance in a Different Project

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Snapshots, Cross-Project, Cloud Migration

Description: Step-by-step guide to creating a Compute Engine VM from a snapshot taken in a different GCP project, including IAM permissions and automation approaches.

---

Working with multiple GCP projects is common in organizations that separate environments (dev, staging, production) or teams into different projects. Sooner or later, you will need to clone a VM from one project to another - maybe to replicate a production issue in a dev environment, migrate workloads between projects, or set up a new project based on an existing configuration.

The process involves creating a snapshot in the source project, sharing it with the destination project, creating a disk from that snapshot, and launching a VM from that disk. Let me walk through each step.

## Understanding Cross-Project Snapshot Access

By default, snapshots are only accessible within the project where they were created. To use a snapshot in a different project, you need to either:

1. Grant the destination project's service account access to the snapshot in the source project
2. Copy the snapshot to the destination project (GCP does not have a direct copy command, so this is done by creating a disk then re-snapshotting)

Option 1 is simpler and avoids duplicating data.

## Step 1: Create a Snapshot in the Source Project

In the source project, create a snapshot of the VM you want to clone:

```bash
# Create a snapshot of the source VM's boot disk
gcloud compute disks snapshot source-vm \
    --zone=us-central1-a \
    --snapshot-names=source-vm-snapshot \
    --project=source-project-id
```

If the VM has additional data disks, snapshot those too:

```bash
# Snapshot additional data disks
gcloud compute disks snapshot source-data-disk \
    --zone=us-central1-a \
    --snapshot-names=source-data-disk-snapshot \
    --project=source-project-id
```

## Step 2: Grant Cross-Project Access to the Snapshot

The destination project needs permission to read the snapshot. Grant the `roles/compute.storageAdmin` role on the source project to the destination project's default compute service account:

```bash
# Get the destination project's compute service account
# Format: PROJECT_NUMBER-compute@developer.gserviceaccount.com
DEST_SA="123456789-compute@developer.gserviceaccount.com"

# Grant access to the snapshot in the source project
gcloud compute snapshots add-iam-policy-binding source-vm-snapshot \
    --project=source-project-id \
    --member="serviceAccount:${DEST_SA}" \
    --role="roles/compute.storageAdmin"
```

Alternatively, if you need broader access, grant the role at the project level:

```bash
# Grant compute storage access at the project level (broader, less secure)
gcloud projects add-iam-policy-binding source-project-id \
    --member="serviceAccount:${DEST_SA}" \
    --role="roles/compute.storageAdmin"
```

For human users who need to access the snapshot:

```bash
# Grant a user in the destination project access to read snapshots from the source
gcloud projects add-iam-policy-binding source-project-id \
    --member="user:admin@example.com" \
    --role="roles/compute.storageAdmin"
```

## Step 3: Create a Disk from the Snapshot in the Destination Project

Now, in the destination project, create a new disk from the source project's snapshot:

```bash
# Create a disk from the cross-project snapshot
gcloud compute disks create cloned-boot-disk \
    --zone=us-central1-a \
    --source-snapshot=projects/source-project-id/global/snapshots/source-vm-snapshot \
    --project=dest-project-id
```

The key here is the full resource path for the snapshot: `projects/SOURCE_PROJECT/global/snapshots/SNAPSHOT_NAME`.

For data disks:

```bash
# Create the data disk from the cross-project snapshot
gcloud compute disks create cloned-data-disk \
    --zone=us-central1-a \
    --source-snapshot=projects/source-project-id/global/snapshots/source-data-disk-snapshot \
    --project=dest-project-id
```

## Step 4: Create a VM from the Disk

Create a new VM using the disk you just created:

```bash
# Create a VM using the restored boot disk
gcloud compute instances create cloned-vm \
    --zone=us-central1-a \
    --machine-type=e2-medium \
    --disk=name=cloned-boot-disk,boot=yes,auto-delete=yes \
    --disk=name=cloned-data-disk,auto-delete=yes \
    --project=dest-project-id
```

## All-In-One Script

Here is a script that does the entire cross-project clone in one go:

```bash
#!/bin/bash
# cross-project-clone.sh - Clone a VM from one project to another
# Usage: ./cross-project-clone.sh SOURCE_PROJECT SOURCE_VM SOURCE_ZONE DEST_PROJECT DEST_ZONE

SOURCE_PROJECT=$1
SOURCE_VM=$2
SOURCE_ZONE=$3
DEST_PROJECT=$4
DEST_ZONE=$5
TIMESTAMP=$(date +%Y%m%d%H%M%S)

echo "Step 1: Creating snapshot of ${SOURCE_VM} in ${SOURCE_PROJECT}..."
gcloud compute disks snapshot "${SOURCE_VM}" \
    --zone="${SOURCE_ZONE}" \
    --snapshot-names="${SOURCE_VM}-clone-${TIMESTAMP}" \
    --project="${SOURCE_PROJECT}"

echo "Step 2: Creating disk from snapshot in ${DEST_PROJECT}..."
gcloud compute disks create "${SOURCE_VM}-cloned" \
    --zone="${DEST_ZONE}" \
    --source-snapshot="projects/${SOURCE_PROJECT}/global/snapshots/${SOURCE_VM}-clone-${TIMESTAMP}" \
    --project="${DEST_PROJECT}"

echo "Step 3: Creating VM from disk in ${DEST_PROJECT}..."
gcloud compute instances create "${SOURCE_VM}-cloned" \
    --zone="${DEST_ZONE}" \
    --machine-type=e2-medium \
    --disk=name="${SOURCE_VM}-cloned",boot=yes,auto-delete=yes \
    --project="${DEST_PROJECT}"

echo "Step 4: Cleaning up snapshot..."
gcloud compute snapshots delete "${SOURCE_VM}-clone-${TIMESTAMP}" \
    --project="${SOURCE_PROJECT}" \
    --quiet

echo "Done. VM ${SOURCE_VM}-cloned created in ${DEST_PROJECT}."
```

## Terraform Configuration

Here is how to do cross-project VM cloning with Terraform:

```hcl
# Reference a snapshot from another project
data "google_compute_snapshot" "source" {
  name    = "source-vm-snapshot"
  project = "source-project-id"
}

# Create a disk from the cross-project snapshot
resource "google_compute_disk" "cloned_boot" {
  name     = "cloned-boot-disk"
  zone     = "us-central1-a"
  project  = "dest-project-id"
  snapshot = data.google_compute_snapshot.source.id
}

# Create the VM using the cloned disk
resource "google_compute_instance" "cloned" {
  name         = "cloned-vm"
  machine_type = "e2-medium"
  zone         = "us-central1-a"
  project      = "dest-project-id"

  boot_disk {
    source = google_compute_disk.cloned_boot.id
  }

  network_interface {
    network = "default"
  }
}
```

## Using Custom Images Instead of Snapshots

An alternative to snapshots is creating a custom image in the source project and sharing it. Images can be shared across projects and are better suited for creating multiple VMs.

```bash
# In the source project, create an image from the VM's disk
gcloud compute images create source-vm-image \
    --source-disk=source-vm \
    --source-disk-zone=us-central1-a \
    --project=source-project-id

# Grant the destination project access to the image
gcloud compute images add-iam-policy-binding source-vm-image \
    --project=source-project-id \
    --member="serviceAccount:${DEST_SA}" \
    --role="roles/compute.imageUser"

# In the destination project, create a VM using the shared image
gcloud compute instances create cloned-vm \
    --zone=us-central1-a \
    --image=projects/source-project-id/global/images/source-vm-image \
    --project=dest-project-id
```

The advantage of images over snapshots for cross-project use:
- Images can be shared using `roles/compute.imageUser` (more granular than storageAdmin)
- Images support image families for versioning
- Images are better for creating many VMs from the same source

## Cross-Region Cloning

Snapshots are global resources, so you can create a disk from a snapshot in any zone, regardless of where the original disk was:

```bash
# Create a disk in Asia from a snapshot originally taken in US
gcloud compute disks create cloned-boot-disk-asia \
    --zone=asia-east1-a \
    --source-snapshot=projects/source-project-id/global/snapshots/source-vm-snapshot \
    --project=dest-project-id
```

This is useful for multi-region deployments or disaster recovery setups.

## Things to Watch Out For

1. **Network configuration**: The cloned VM will try to use the same network settings as the original. Make sure the destination project has compatible VPC networks and subnets.

2. **Service account**: The cloned VM may reference a service account that does not exist in the destination project. Update the service account when creating the VM.

3. **Disk size**: You can increase the disk size when creating from a snapshot, but you cannot decrease it.

4. **Encryption keys**: If the source disk uses a customer-managed encryption key (CMEK), you need the same key (or a re-encrypted copy) available in the destination project.

5. **Software licenses**: Some software licenses may not be valid across projects. Check your license terms.

6. **IP addresses**: The cloned VM will get new IP addresses. Update any configuration that references specific IPs.

## Wrapping Up

Cloning VMs across GCP projects is a multi-step process, but each step is straightforward. The main thing to get right is the IAM permissions - the destination project needs access to read the snapshot (or image) from the source project. For one-off migrations, the manual approach works fine. For regular cross-project cloning (like syncing production data to staging), automate the process with a script or Terraform configuration. And always consider whether an image might be a better choice than a snapshot, especially if you are creating multiple VMs from the same source.
