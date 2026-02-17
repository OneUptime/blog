# How to Restore a Compute Engine Instance from a Machine Image After Accidental Deletion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Machine Image, Disaster Recovery, Backup

Description: Learn how to create machine images of your Compute Engine instances and use them to restore VMs after accidental deletion, preserving all disks, metadata, and configuration.

---

Accidentally deleting a VM happens more often than anyone likes to admit. Maybe someone ran the wrong gcloud command, maybe a Terraform destroy went further than expected, or maybe a cleanup script was a bit too aggressive. Whatever the cause, the question is always the same: can I get it back?

If you had a machine image, the answer is yes. Machine images capture everything about an instance - boot disk, additional disks, machine configuration, metadata, network settings, and more. They are the most complete backup option for Compute Engine VMs.

## Machine Images vs Snapshots vs Custom Images

Before diving in, it helps to understand how machine images differ from other backup options:

- **Snapshots** capture individual disks. To fully restore a VM with multiple disks, you need a snapshot for each disk plus notes on the VM configuration.
- **Custom images** capture a single boot disk. They are useful for creating templates but do not include additional disks or instance settings.
- **Machine images** capture everything - all disks, instance properties, metadata, labels, tags, service account, and network configuration. They are the only option that gives you a one-click restore.

## Creating a Machine Image

You should create machine images regularly for any instance you care about. Here is the basic command:

```bash
# Create a machine image from a running instance
gcloud compute machine-images create my-vm-backup-2026-02-17 \
  --source-instance=my-vm \
  --source-instance-zone=us-central1-a \
  --storage-location=us-central1
```

The `--storage-location` flag controls where the machine image is stored. Storing it in the same region as the instance reduces costs and speeds up restoration.

You can also create machine images from stopped instances, which is recommended for data consistency:

```bash
# Stop the instance first for a consistent backup
gcloud compute instances stop my-vm --zone=us-central1-a

# Create the machine image from the stopped instance
gcloud compute machine-images create my-vm-backup-consistent \
  --source-instance=my-vm \
  --source-instance-zone=us-central1-a \
  --storage-location=us-central1

# Start the instance again
gcloud compute instances start my-vm --zone=us-central1-a
```

## Automating Machine Image Creation

For production systems, you want automated backups. Here is a script that creates daily machine images and cleans up old ones:

```bash
#!/bin/bash
# Automated machine image creation with retention policy

INSTANCE_NAME="production-db"
ZONE="us-central1-a"
RETENTION_DAYS=7
DATE=$(date +%Y-%m-%d)
IMAGE_NAME="${INSTANCE_NAME}-backup-${DATE}"

# Create today's machine image
echo "Creating machine image: ${IMAGE_NAME}"
gcloud compute machine-images create "${IMAGE_NAME}" \
  --source-instance="${INSTANCE_NAME}" \
  --source-instance-zone="${ZONE}" \
  --storage-location=us-central1

# Delete machine images older than the retention period
CUTOFF_DATE=$(date -d "-${RETENTION_DAYS} days" +%Y-%m-%d 2>/dev/null || \
  date -v-${RETENTION_DAYS}d +%Y-%m-%d)

echo "Cleaning up machine images older than ${CUTOFF_DATE}"

# List and delete old machine images matching our naming pattern
gcloud compute machine-images list \
  --filter="name~^${INSTANCE_NAME}-backup- AND creationTimestamp<${CUTOFF_DATE}" \
  --format="value(name)" | while read -r old_image; do
    echo "Deleting old machine image: ${old_image}"
    gcloud compute machine-images delete "${old_image}" --quiet
done
```

You can run this script on a schedule using Cloud Scheduler with a Cloud Function, or simply with cron on a management VM.

## Restoring an Instance from a Machine Image

Now for the critical part - restoring a deleted instance. The simplest restore creates a new instance with the same configuration as the original:

```bash
# Restore an instance from a machine image with default settings
gcloud compute instances create my-vm-restored \
  --zone=us-central1-a \
  --source-machine-image=my-vm-backup-2026-02-17
```

This recreates the VM with all its original disks, metadata, labels, tags, and network interfaces. The instance name can be different from the original - you do not have to use the same name.

## Restoring with Modified Settings

Sometimes you want to restore the VM but change something - maybe a different machine type, a different zone, or a different network:

```bash
# Restore with a different machine type and zone
gcloud compute instances create my-vm-restored \
  --zone=us-east1-b \
  --source-machine-image=my-vm-backup-2026-02-17 \
  --machine-type=e2-standard-4
```

You can override most instance properties during restoration. The disks are recreated from the machine image data, but the instance configuration uses your overrides.

```bash
# Restore into a different subnet
gcloud compute instances create my-vm-restored \
  --zone=us-central1-a \
  --source-machine-image=my-vm-backup-2026-02-17 \
  --network-interface=subnet=my-new-subnet,no-address
```

## Restoring Specific Disks Only

If you only need the data from a machine image but not the full VM, you can create disks from the machine image:

```bash
# Create a disk from a machine image to access the data
gcloud compute disks create recovered-data-disk \
  --zone=us-central1-a \
  --source-machine-image=my-vm-backup-2026-02-17 \
  --source-machine-image-disk-name=my-data-disk
```

You can then attach this disk to an existing VM to access the data:

```bash
# Attach the recovered disk to an existing VM
gcloud compute instances attach-disk existing-vm \
  --disk=recovered-data-disk \
  --zone=us-central1-a

# Mount the disk inside the VM to access the files
sudo mkdir /mnt/recovered
sudo mount /dev/sdb1 /mnt/recovered
```

## Listing and Inspecting Machine Images

To see all your machine images:

```bash
# List all machine images in the project
gcloud compute machine-images list \
  --format="table(name, status, creationTimestamp, totalStorageBytes)"
```

To see the full details of a machine image, including what disks and configuration it contains:

```bash
# Describe a machine image to see all stored properties
gcloud compute machine-images describe my-vm-backup-2026-02-17 \
  --format="yaml(instanceProperties)"
```

This shows you exactly what the restored instance will look like, which is helpful for verifying before you restore.

## Cross-Region Restoration

Machine images are global resources, which means you can restore an instance in a different region than where it was originally running:

```bash
# Restore an instance in a completely different region
gcloud compute instances create my-vm-restored-asia \
  --zone=asia-southeast1-a \
  --source-machine-image=my-vm-backup-2026-02-17
```

This is incredibly useful for disaster recovery scenarios where an entire region is unavailable. The catch is that restoring cross-region takes longer because the disk data needs to be copied.

## Sharing Machine Images Across Projects

For organizations with multiple projects, you can share machine images using IAM:

```bash
# Grant another project access to use the machine image
gcloud compute machine-images add-iam-policy-binding my-vm-backup-2026-02-17 \
  --member="serviceAccount:sa@other-project.iam.gserviceaccount.com" \
  --role="roles/compute.admin"
```

The other project can then create instances from your machine image:

```bash
# Create an instance from a machine image in another project
gcloud compute instances create my-vm-copy \
  --zone=us-central1-a \
  --source-machine-image=projects/source-project/global/machineImages/my-vm-backup-2026-02-17
```

## Cost Considerations

Machine images are stored in Cloud Storage and billed accordingly. They use incremental storage - if you have multiple machine images of the same instance, only the differences between them are stored. This makes frequent backups much cheaper than you might expect.

To check how much storage your machine images are using:

```bash
# Check storage usage for all machine images
gcloud compute machine-images list \
  --format="table(name, totalStorageBytes.size())"
```

## Best Practices

From my experience running production workloads on GCE, here are the practices that have saved me more than once:

1. Create machine images before any significant change - OS upgrades, application deployments, or configuration modifications.
2. Test your restore process regularly. A backup you have never tested is not really a backup.
3. Use meaningful naming conventions that include the date and the instance name. You will thank yourself when you need to find a specific backup at 2 AM.
4. Set up automated machine image creation with a retention policy. Manual backups get forgotten.
5. Store machine images in multiple regions for critical instances. The small additional cost is nothing compared to the cost of losing everything.

Machine images are the safety net every Compute Engine deployment needs. The few minutes it takes to set up automated backups can save hours or days of recovery work.
