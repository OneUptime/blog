# How to Migrate a Compute Engine Instance to a Different Zone

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Migration, Zone Migration, Cloud Infrastructure

Description: A practical guide to migrating Compute Engine instances between zones with minimal downtime using move operations, snapshots, and managed instance groups.

---

There are several reasons you might need to move a Compute Engine instance to a different zone. Maybe you are consolidating resources, responding to a zone-level issue, or deploying closer to your users. Whatever the reason, you want to do it with as little downtime as possible.

GCP used to offer a built-in move operation for this, but that command has been removed from the current Google Cloud CLI. In this post, I will cover the current machine-image method, the manual snapshot-and-recreate approach, and some strategies for achieving near-zero downtime.

## Method 1: Using a Machine Image

The simplest current approach is to create a machine image of the source VM, then create a replacement VM in the target zone from that machine image. This preserves most instance configuration and disk data, but you still need to plan a cutover and clean up the old resources after you verify the new VM.

```bash
# Create a machine image from the source VM
gcloud compute machine-images create my-vm-machine-image \
    --source-instance=my-vm \
    --source-instance-zone=us-central1-a

# Create a replacement VM in the target zone
gcloud compute instances create my-vm-new \
    --zone=us-central1-b \
    --source-machine-image=my-vm-machine-image
```

What happens during this process:

1. A machine image is created from the source VM
2. A new VM is created in the destination zone from the machine image
3. You verify the new VM and update any references to the old VM
4. You delete the old VM and the temporary machine image when they are no longer needed

The total downtime depends on your cutover process and disk sizes. For small VMs, expect a few minutes. For larger disks, it could be 20-30 minutes or more.

**Important limitations:**

- Machine images cannot be created from VMs with some disk or machine types, including Hyperdisk volumes and most Z3, C3D, H3, and A3 machine types
- Some instance and disk properties are not preserved by machine images
- If you move between regions, you must choose a new subnet and cannot preserve ephemeral internal or external IP addresses
- Static external IPs can be reassigned within the same region, but ephemeral IPs should be promoted to static IPs before cutover if you need to keep them

## Method 2: Manual Snapshot and Recreate

For more control over the process, or when moving between regions, you can do it manually.

**Step 1: Capture the VM configuration**

```bash
# Export the current VM configuration for reference
gcloud compute instances describe my-vm \
    --zone=us-central1-a \
    --format=json > vm-config.json
```

**Step 2: Create snapshots of all disks**

```bash
# Create a snapshot of the boot disk
gcloud compute disks snapshot my-vm \
    --zone=us-central1-a \
    --snapshot-names=my-vm-boot-snapshot

# If you have additional data disks, snapshot those too
gcloud compute disks snapshot my-data-disk \
    --zone=us-central1-a \
    --snapshot-names=my-data-disk-snapshot
```

**Step 3: Create new disks from snapshots in the target zone**

```bash
# Create the boot disk in the new zone from the snapshot
gcloud compute disks create my-vm-boot \
    --zone=us-east1-b \
    --source-snapshot=my-vm-boot-snapshot

# Create the data disk in the new zone
gcloud compute disks create my-data-disk-new \
    --zone=us-east1-b \
    --source-snapshot=my-data-disk-snapshot
```

**Step 4: Create the new VM with the restored disks**

```bash
# Create the new VM using the disk created from the snapshot
gcloud compute instances create my-vm-new \
    --zone=us-east1-b \
    --machine-type=e2-medium \
    --disk=name=my-vm-boot,boot=yes,auto-delete=yes \
    --disk=name=my-data-disk-new,auto-delete=yes
```

**Step 5: Verify and clean up**

```bash
# Verify the new VM is working
gcloud compute ssh my-vm-new --zone=us-east1-b

# Once verified, delete the old VM and snapshots
gcloud compute instances delete my-vm --zone=us-central1-a --quiet
gcloud compute snapshots delete my-vm-boot-snapshot my-data-disk-snapshot --quiet
```

## Method 3: Near-Zero Downtime with DNS and Load Balancing

If your workload cannot tolerate minutes of downtime, the approach changes. Instead of moving the VM, you create a second instance in the target zone, shift traffic, and then decommission the old one.

```mermaid
sequenceDiagram
    participant Client
    participant LB as Load Balancer
    participant VM1 as VM (Zone A)
    participant VM2 as VM (Zone B)

    Note over VM1,VM2: Phase 1: Create new VM
    VM2->>VM2: Boot and configure

    Note over LB,VM2: Phase 2: Add to load balancer
    LB->>VM1: Traffic
    LB->>VM2: Traffic

    Note over LB,VM1: Phase 3: Drain old VM
    LB->>VM2: All traffic
    VM1->>VM1: Drain connections

    Note over VM1: Phase 4: Delete old VM
```

Here is the practical implementation:

```bash
# Step 1: Create the new VM in the target zone
gcloud compute instances create my-vm-zone-b \
    --zone=us-central1-b \
    --machine-type=e2-medium \
    --image-family=my-app \
    --tags=http-server

# Step 2: Create an unmanaged instance group for the new VM
gcloud compute instance-groups unmanaged create my-ig-zone-b \
    --zone=us-central1-b

gcloud compute instance-groups unmanaged add-instances my-ig-zone-b \
    --instances=my-vm-zone-b \
    --zone=us-central1-b

# Step 3: Add the new instance group to the load balancer backend
gcloud compute backend-services add-backend my-backend-service \
    --instance-group=my-ig-zone-b \
    --instance-group-zone=us-central1-b \
    --global

# Step 4: Wait for the new VM to pass health checks
# (Your load balancer will do this automatically)

# Step 5: Drain the old backend by setting its capacity scaler to zero
gcloud compute backend-services update-backend my-backend-service \
    --instance-group=my-ig-zone-a \
    --instance-group-zone=us-central1-a \
    --capacity-scaler=0 \
    --global

# Step 6: Wait for connections to drain (give it a few minutes)
sleep 180

# Step 7: Remove the old VM from the load balancer backend
gcloud compute backend-services remove-backend my-backend-service \
    --instance-group=my-ig-zone-a \
    --instance-group-zone=us-central1-a \
    --global

# Step 8: Delete the old VM
gcloud compute instances delete my-vm-zone-a \
    --zone=us-central1-a --quiet
```

## Method 4: Using Managed Instance Groups

If you are already using managed instance groups (and you should be for stateless workloads), zone migration is even simpler. Use a regional MIG that automatically distributes instances across zones.

```bash
# Create a regional managed instance group that spans multiple zones
gcloud compute instance-groups managed create my-regional-mig \
    --template=my-app-template \
    --size=3 \
    --region=us-central1 \
    --zones=us-central1-b,us-central1-c,us-central1-f
```

With a regional MIG, your instances are automatically distributed across the selected zones. Choose the zones when you create the regional MIG; you cannot update an existing regional MIG to use different zones later. You can still change the target distribution shape:

```bash
# Update how the MIG distributes instances across its existing zones
gcloud compute instance-groups managed update my-regional-mig \
    --region=us-central1 \
    --target-distribution-shape=any
```

## Preserving the External IP Address

If your VM has a static external IP, you can reassign it to the new VM:

```bash
# First, note the current static IP
gcloud compute addresses list

# After creating the new VM, assign the static IP to it
gcloud compute instances delete-access-config my-vm-old \
    --zone=us-central1-a \
    --access-config-name="external-nat"

gcloud compute instances add-access-config my-vm-new \
    --zone=us-central1-b \
    --address=35.192.x.x
```

Note that the static IP must be in the same region as the new VM. If you are moving between regions, you will need a new IP address and must update DNS records.

## Handling Stateful Workloads

Stateful workloads like databases are the hardest to migrate. Here is a general approach for a PostgreSQL database:

```bash
# 1. Set up streaming replication to the new zone
# 2. On the new VM in the target zone, configure it as a replica
# 3. Monitor replication lag until it is caught up
# 4. Promote the replica to primary
# 5. Update your application's connection string
# 6. Decommission the old primary
```

For managed databases like Cloud SQL, use the built-in migration features instead of moving VMs.

## Terraform Approach

In Terraform, changing the zone triggers a destroy and recreate. To handle this gracefully:

```hcl
# Use lifecycle to prevent Terraform from destroying the old instance
# before the new one is ready
resource "google_compute_instance" "app" {
  name         = "my-vm"
  machine_type = "e2-medium"
  zone         = "us-central1-b"  # Changed from us-central1-a

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    network = "default"
    access_config {}
  }

  # This creates the new instance before destroying the old one
  lifecycle {
    create_before_destroy = true
  }
}
```

## Wrapping Up

The right migration strategy depends on your downtime tolerance and workload type. For simple VMs where a few minutes of downtime is acceptable, the machine-image or snapshot-and-recreate approach works well. For production workloads that need minimal disruption, use the load balancer approach or regional managed instance groups. For stateful workloads, plan carefully and use replication where possible. The key takeaway is that zone migrations should be planned for from the start - if you design your architecture with regional resources and load balancers, moving between zones becomes a non-event.
