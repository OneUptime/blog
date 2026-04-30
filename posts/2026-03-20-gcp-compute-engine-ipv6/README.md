# How to Configure IPv6 on Google Compute Engine VMs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IPv6, Compute Engine, VM, Dual-Stack, Google Cloud

Description: Assign IPv6 addresses to Google Compute Engine VM instances, configure dual-stack network interfaces, and verify IPv6 connectivity inside GCE VMs.

## Introduction

Google Compute Engine VMs can use IPv6 when their network interface stack type is configured for IPv6 and the attached subnet has an IPv6 range. A dual-stack network interface can have both an IPv4 address and a `/96` IPv6 range. For a single network interface, that IPv6 range is either internal or external, not both. External IPv6 VMs get globally routable addresses, while internal IPv6 VMs get ULA addresses. If you do not specify a custom IPv6 address, GCE automatically assigns an ephemeral IPv6 address from the subnet's IPv6 range.

## Create VM with IPv6 Address

```bash
PROJECT="my-project"
ZONE="us-east1-b"

# Create VM in dual-stack subnet with an ephemeral external IPv6 range

gcloud compute instances create vm-web-01 \
    --project="$PROJECT" \
    --zone="$ZONE" \
    --machine-type=n2-standard-2 \
    --subnet=subnet-web \
    --stack-type=IPV4_IPV6 \
    --ipv6-network-tier=PREMIUM \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --boot-disk-size=20GB

# Assign a reserved static external IPv6 range (optional)
STATIC_IPV6="2600:1900:4000::"  # first address in the reserved /96 range

gcloud compute instances create vm-web-static \
    --project="$PROJECT" \
    --zone="$ZONE" \
    --machine-type=n2-standard-2 \
    --subnet=subnet-web \
    --stack-type=IPV4_IPV6 \
    --external-ipv6-address="$STATIC_IPV6" \
    --external-ipv6-prefix-length=96 \
    --ipv6-network-tier=PREMIUM \
    --image-family=debian-12 \
    --image-project=debian-cloud
```

## Add IPv6 to Existing VM

```bash
# Update existing network interface to enable IPv6
gcloud compute instances network-interfaces update vm-existing \
    --project="$PROJECT" \
    --zone="$ZONE" \
    --network-interface=nic0 \
    --stack-type=IPV4_IPV6
```

## Terraform GCE VM with IPv6

```hcl
# gce_vm_ipv6.tf

resource "google_compute_instance" "web" {
  name         = "vm-web-01"
  machine_type = "n2-standard-2"
  zone         = "us-east1-b"
  project      = var.project_id

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 20
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.web.self_link

    # Enable dual-stack IPv6 on a subnet with external IPv6
    stack_type = "IPV4_IPV6"

    # IPv4 access config (for external IPv4)
    access_config {
      network_tier = "PREMIUM"
    }

    # External IPv6 access config
    ipv6_access_config {
      network_tier = "PREMIUM"
    }
  }

  metadata = {
    enable-oslogin = "TRUE"
  }

  tags = ["web-server"]

  labels = {
    environment = "production"
  }
}

output "vm_ipv4" {
  value = google_compute_instance.web.network_interface[0].access_config[0].nat_ip
}

output "vm_ipv6" {
  value = google_compute_instance.web.network_interface[0].ipv6_access_config[0].external_ipv6
}
```

## Verify IPv6 Inside the VM

```bash
# SSH into the VM
gcloud compute ssh vm-web-01 \
    --project="$PROJECT" \
    --zone="$ZONE"

# Inside VM, check IPv6 address
ip -6 addr show

# Expected: an internal or external /96 IPv6 range on the primary interface

# For VMs with external IPv6, test native IPv6 connectivity
ping -6 -c 3 2001:4860:4860::8888  # Google DNS

# For internal-only IPv6, test another internal IPv6 address in your VPC instead of a public address.

# Test AAAA DNS resolution
getent ahostsv6 google.com
```

## External IPv6 vs Internal IPv6 VMs

```bash
# Check which type of IPv6 a VM has
gcloud compute instances describe vm-web-01 \
    --project="$PROJECT" \
    --zone="$ZONE" \
    --format="flattened(networkInterfaces[0].ipv6AccessType,networkInterfaces[0].ipv6Address,networkInterfaces[0].ipv6AccessConfigs[0].externalIpv6)"

# External IPv6 VM:
# Can receive inbound connections from internet (if firewall allows)
# networkInterfaces[0].ipv6AccessType: EXTERNAL

# Internal IPv6 VM:
# Only reachable within the VPC and connected networks
# Internal IPv6 addresses are not internet-routable
# networkInterfaces[0].ipv6AccessType: INTERNAL

# Firewall rule needed to allow inbound to external IPv6 VM
gcloud compute firewall-rules create allow-http-ipv6 \
    --project="$PROJECT" \
    --network=vpc-main \
    --direction=INGRESS \
    --source-ranges="::/0" \
    --rules=tcp:80,tcp:443 \
    --target-tags=web-server
```

## Instance Templates with IPv6

```bash
# Create instance template with IPv6 support
gcloud compute instance-templates create tmpl-web-ipv6 \
    --project="$PROJECT" \
    --machine-type=n2-standard-2 \
    --subnet=subnet-web \
    --stack-type=IPV4_IPV6 \
    --ipv6-network-tier=PREMIUM \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --tags=web-server

# Use template for managed instance group
gcloud compute instance-groups managed create mig-web \
    --project="$PROJECT" \
    --base-instance-name=web \
    --template=tmpl-web-ipv6 \
    --size=3 \
    --zone="$ZONE"
```

## Conclusion

GCE VMs can use IPv6 when the attached subnet has an IPv6 range and the VM network interface is configured for IPv6. Configure `stack_type = "IPV4_IPV6"` in the network interface definition in Terraform or use `--stack-type=IPV4_IPV6` with gcloud. External IPv6 VMs are reachable from the internet when firewall rules permit, while internal IPv6 addresses are private to the VPC and connected networks. Check VM IPv6 addresses with `ip -6 addr show` inside the instance or via `gcloud compute instances describe`.
