# How to Create Hetzner Cloud Volumes with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Hetzner Cloud, Block Storage, Volumes, Infrastructure as Code

Description: Learn how to create Hetzner Cloud block storage volumes with OpenTofu and attach them to servers for persistent, resizable storage.

Hetzner Cloud Volumes are persistent SSD-based block storage devices that can be attached to servers. They persist independently of server lifecycle and can be resized at any time. OpenTofu lets you create volumes, attach them to servers, and manage their lifecycle as code.

## Creating a Volume

```hcl
resource "hcloud_volume" "data" {
  name     = "app-data-volume"
  size     = 50    # Size in GB (10 to 10240)
  location = "nbg1"  # Must be in the same location as the server

  # Automatically format the volume after creation
  format   = "ext4"

  labels = {
    environment = "production"
    purpose     = "app-data"
    managed_by  = "opentofu"
  }
}

output "volume_id" {
  value = hcloud_volume.data.id
}
```

## Attaching a Volume to a Server

```hcl
resource "hcloud_server" "app" {
  name        = "app-01"
  image       = "ubuntu-24.04"
  server_type = "cx22"
  location    = "nbg1"
  ssh_keys    = [hcloud_ssh_key.default.id]
}

resource "hcloud_volume_attachment" "data" {
  volume_id  = hcloud_volume.data.id
  server_id  = hcloud_server.app.id
  automount  = true   # Automatically mount at /mnt/HC_Volume_<id>
}
```

## Creating and Attaching in One Step

```hcl
resource "hcloud_volume" "logs" {
  name     = "app-logs"
  size     = 100
  server_id = hcloud_server.app.id  # Attach immediately at creation
  automount = true
  format    = "xfs"
}
```

## Resizing a Volume

To resize a volume, update the `size` attribute. OpenTofu will call the Hetzner API to expand the volume. The filesystem must be resized manually after the API call:

```hcl
resource "hcloud_volume" "data" {
  name     = "app-data-volume"
  size     = 100   # Increased from 50 to 100 GB
  location = "nbg1"
  format   = "ext4"
}
```

After `tofu apply`, resize the filesystem on the server:

```bash
# For ext4

sudo resize2fs /dev/disk/by-id/scsi-0HC_Volume_<volume-id>

# For xfs
sudo xfs_growfs /mnt/HC_Volume_<volume-id>
```

## Creating Multiple Volumes

```hcl
variable "volumes" {
  type = map(number)
  default = {
    "data"  = 100
    "logs"  = 50
    "cache" = 25
  }
}

resource "hcloud_volume" "app" {
  for_each = var.volumes

  name     = "app-${each.key}"
  size     = each.value
  location = "nbg1"
  format   = "ext4"
}
```

## Preventing Accidental Deletion

```hcl
resource "hcloud_volume" "critical" {
  name     = "critical-data"
  size     = 200
  location = "nbg1"
  format   = "ext4"

  lifecycle {
    prevent_destroy = true  # Prevents tofu destroy from removing this volume
  }
}
```

## Conclusion

Hetzner Cloud Volumes provide affordable SSD-based block storage at around €0.0572/GB/month. Create volumes with OpenTofu, use `automount` for automatic mounting, and protect critical volumes with `prevent_destroy`. Volumes can be detached from one server and reattached to another, making them useful for stateful workload migrations.
