# How to Schedule Automatic Snapshots for Compute Engine Boot Disks Using Snapshot Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Snapshots, Backup, Disaster Recovery

Description: Learn how to configure snapshot schedules and policies for Compute Engine boot disks to automate backups and protect against data loss on GCP.

---

If you are running workloads on Compute Engine, having regular snapshots of your disks is not optional - it is essential. Snapshots give you point-in-time copies of your disks that you can use to recover from accidental deletions, corrupted data, or failed updates. The best part is that GCP lets you automate this entirely through snapshot schedules, so you do not have to remember to take manual snapshots.

In this post, I will show you how to create snapshot schedules (also called resource policies), attach them to your disks, and manage retention so you do not end up with hundreds of old snapshots eating into your storage budget.

## Understanding GCP Snapshots

A few things to know about how snapshots work on GCP:

- **Incremental by default**: After the first full snapshot, subsequent snapshots only store the blocks that have changed. This makes them fast and storage-efficient.
- **Global resource**: Snapshots are stored globally and can be used to create disks in any region.
- **Crash-consistent**: Snapshots capture the disk state as it is at that moment. For database workloads, you should flush writes before snapshotting or use application-level backups.
- **No performance impact**: Taking a snapshot does not noticeably affect disk performance.

## Creating a Snapshot Schedule

A snapshot schedule (officially called a "resource policy") defines when snapshots are taken, how long they are retained, and where they are stored.

Here is how to create a daily snapshot schedule that keeps snapshots for 14 days:

```bash
# Create a snapshot schedule that runs daily at 2 AM UTC and retains snapshots for 14 days
gcloud compute resource-policies create snapshot-schedule daily-backup-policy \
    --region=us-central1 \
    --max-retention-days=14 \
    --on-source-disk-delete=keep-auto-snapshots \
    --daily-schedule \
    --start-time=02:00 \
    --storage-location=us
```

Let me break down the important parameters:

- **--max-retention-days=14**: Snapshots older than 14 days are automatically deleted. This keeps your storage costs predictable.
- **--on-source-disk-delete=keep-auto-snapshots**: If the source disk is deleted, the snapshots are preserved. The alternative is `apply-retention-policy`, which deletes snapshots according to the normal retention rules.
- **--daily-schedule**: Take a snapshot once per day.
- **--start-time=02:00**: Start the snapshot process at 2 AM UTC. Choose a time when your workload is quiet.
- **--storage-location=us**: Store snapshots in the US multi-region. You can also specify a single region.

## Creating Hourly and Weekly Schedules

For more critical workloads, you might want hourly snapshots. For less critical ones, weekly might be enough.

```bash
# Hourly schedule - takes a snapshot every 4 hours, keeps them for 7 days
gcloud compute resource-policies create snapshot-schedule hourly-backup-policy \
    --region=us-central1 \
    --max-retention-days=7 \
    --on-source-disk-delete=keep-auto-snapshots \
    --hourly-schedule \
    --hourly-cycle=4 \
    --start-time=00:00 \
    --storage-location=us
```

```bash
# Weekly schedule - runs every Monday at 3 AM, keeps snapshots for 52 weeks (1 year)
gcloud compute resource-policies create snapshot-schedule weekly-backup-policy \
    --region=us-central1 \
    --max-retention-days=365 \
    --on-source-disk-delete=keep-auto-snapshots \
    --weekly-schedule \
    --day-of-week=monday \
    --start-time=03:00 \
    --storage-location=us
```

## Attaching the Schedule to a Disk

Once you have a snapshot schedule, you need to attach it to the disks you want to back up.

```bash
# Attach the daily backup policy to a specific disk
gcloud compute disks add-resource-policies my-boot-disk \
    --resource-policies=daily-backup-policy \
    --zone=us-central1-a
```

You can attach a schedule to multiple disks, and a disk can have multiple schedules. For example, you might want both daily and weekly snapshots for your database disk:

```bash
# Attach both daily and weekly policies to the database disk
gcloud compute disks add-resource-policies db-data-disk \
    --resource-policies=daily-backup-policy \
    --zone=us-central1-a

gcloud compute disks add-resource-policies db-data-disk \
    --resource-policies=weekly-backup-policy \
    --zone=us-central1-a
```

## Applying Snapshot Schedules to All Boot Disks

If you want to ensure every VM in your project has its boot disk backed up, you can script it:

```bash
# Apply the daily backup policy to all boot disks in a specific zone
for instance in $(gcloud compute instances list \
    --zones=us-central1-a \
    --format="value(name)"); do

    # Get the boot disk name (usually same as instance name)
    boot_disk=$(gcloud compute instances describe "$instance" \
        --zone=us-central1-a \
        --format="value(disks[0].source.basename())")

    echo "Attaching policy to boot disk: $boot_disk"
    gcloud compute disks add-resource-policies "$boot_disk" \
        --resource-policies=daily-backup-policy \
        --zone=us-central1-a
done
```

## Terraform Configuration

Here is how to set up snapshot schedules with Terraform.

```hcl
# Define the snapshot schedule resource policy
resource "google_compute_resource_policy" "daily_backup" {
  name   = "daily-backup-policy"
  region = "us-central1"

  snapshot_schedule_policy {
    schedule {
      daily_schedule {
        days_in_cycle = 1
        start_time    = "02:00"
      }
    }

    retention_policy {
      max_retention_days    = 14
      on_source_disk_delete = "KEEP_AUTO_SNAPSHOTS"
    }

    snapshot_properties {
      storage_locations = ["us"]
      labels = {
        environment = "production"
        managed-by  = "terraform"
      }
    }
  }
}

# Attach the policy to a compute disk
resource "google_compute_disk_resource_policy_attachment" "boot_disk_backup" {
  name = google_compute_resource_policy.daily_backup.name
  disk = google_compute_instance.my_vm.boot_disk[0].device_name
  zone = "us-central1-a"
}
```

## Adding Labels to Scheduled Snapshots

You can add labels to your snapshot schedule so that all auto-generated snapshots are tagged. This helps with organization and cost tracking.

```bash
# Create a schedule with labels applied to generated snapshots
gcloud compute resource-policies create snapshot-schedule labeled-backup-policy \
    --region=us-central1 \
    --max-retention-days=14 \
    --daily-schedule \
    --start-time=02:00 \
    --storage-location=us \
    --snapshot-labels=env=production,team=platform,backup-type=automated
```

## Listing and Monitoring Snapshots

You will want to keep an eye on your snapshots to make sure the schedule is working.

```bash
# List all snapshots, sorted by creation time
gcloud compute snapshots list --sort-by=~creationTimestamp --limit=20

# List snapshots for a specific source disk
gcloud compute snapshots list --filter="sourceDisk:my-boot-disk"

# Check the total storage used by snapshots
gcloud compute snapshots list --format="table(name,diskSizeGb,storageBytes.yesno(yes='has-data',no='pending'),status)"
```

## Restoring from a Snapshot

When you need to restore, you create a new disk from the snapshot and then either attach it to your VM or create a new VM from it.

```bash
# Create a new disk from a snapshot
gcloud compute disks create restored-boot-disk \
    --source-snapshot=my-boot-disk-20260217-020000 \
    --zone=us-central1-a

# Create a new VM using the restored disk as its boot disk
gcloud compute instances create restored-vm \
    --disk=name=restored-boot-disk,boot=yes,auto-delete=yes \
    --zone=us-central1-a
```

## Cost Considerations

Snapshot storage is charged at a per-GB rate that is lower than persistent disk storage. Since snapshots are incremental, the actual storage used is typically much less than the disk size. Here are some tips to keep costs under control:

1. **Set appropriate retention periods.** Do you really need 365 days of daily snapshots? For most workloads, 14-30 days is sufficient.
2. **Use multi-region storage only if needed.** Single-region snapshot storage is cheaper.
3. **Clean up orphaned snapshots.** If you delete a disk and its schedule, manually created snapshots stick around until you delete them.
4. **Monitor snapshot storage.** Set up a Cloud Monitoring alert for snapshot storage costs.

## Best Practices

- Always test restoring from a snapshot before you actually need to. You do not want to find out your backup strategy has a gap during an incident.
- Use labels to organize snapshots by environment, team, or application.
- For database workloads, consider combining disk snapshots with application-level backups (like `pg_dump` for PostgreSQL) for consistency.
- Set the snapshot start time to your lowest-traffic period.
- Use the `nofail` option in fstab for any disks created from snapshots, so the VM does not fail to boot if there is an issue.

## Wrapping Up

Snapshot schedules on GCP are one of those set-it-and-forget-it features that can save you from a very bad day. The setup takes about five minutes, and once it is running, you have automated, incremental backups of your disks with automatic retention management. There is really no reason not to have this configured for every production disk in your project.
