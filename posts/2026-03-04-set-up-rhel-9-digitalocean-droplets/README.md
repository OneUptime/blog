# How to Set Up RHEL for DigitalOcean Droplets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, DigitalOcean, Cloud, Droplets, Linux

Description: Deploy RHEL on DigitalOcean Droplets using custom images with proper configuration for the DigitalOcean environment.

---

DigitalOcean does not provide a native RHEL image, but you can upload a custom RHEL image and create Droplets from it. This guide walks through the process of preparing and deploying RHEL on DigitalOcean.

## Step 1: Prepare the RHEL Image

```bash
# On a local machine, download the RHEL cloud image
# from the Red Hat Customer Portal (QCOW2 format)

# Convert to raw format if needed
qemu-img convert -f qcow2 -O raw rhel-9-cloud.qcow2 rhel-9-cloud.raw

# Compress for faster upload
gzip rhel-9-cloud.raw
```

## Step 2: Upload the Image to DigitalOcean

```bash
# Upload the custom image using doctl
doctl compute image create rhel9-custom \
  --image-url "https://your-storage/rhel-9-cloud.raw.gz" \
  --region nyc1 \
  --image-distribution "Unknown" \
  --image-description "Red Hat Enterprise Linux 9"

# Wait for the image to be available
doctl compute image list --public=false
```

## Step 3: Create a Droplet

```bash
# Create a Droplet with the custom RHEL image
doctl compute droplet create rhel9-droplet \
  --image $CUSTOM_IMAGE_ID \
  --size s-2vcpu-4gb \
  --region nyc1 \
  --ssh-keys $SSH_KEY_FINGERPRINT \
  --user-data-file cloud-init.yaml \
  --tag-name rhel9

# Create the cloud-init configuration
cat <<'CLOUDINIT' > cloud-init.yaml
#cloud-config
package_update: true
packages:
  - firewalld
  - vim
  - dnf-automatic

runcmd:
  - systemctl enable --now firewalld
  - firewall-cmd --permanent --add-service=ssh
  - firewall-cmd --permanent --add-service=https
  - firewall-cmd --reload
CLOUDINIT
```

## Step 4: Configure the Droplet

```bash
# SSH into the Droplet
ssh root@<droplet-ip>

# Register the RHEL system
subscription-manager register --username=your_username --password=your_password
subscription-manager attach --auto

# Update the system
dnf update -y

# Configure DigitalOcean-specific settings
# Install the DO monitoring agent
curl -sSL https://repos.insights.digitalocean.com/install.sh | sudo bash
```

## Step 5: Set Up Block Storage

```bash
# Create a volume using doctl
doctl compute volume create rhel9-data \
  --size 100GiB \
  --region nyc1

# Attach the volume to the Droplet
doctl compute volume-action attach $VOLUME_ID $DROPLET_ID

# On the Droplet, mount the volume
sudo mkfs.xfs /dev/disk/by-id/scsi-0DO_Volume_rhel9-data
sudo mkdir -p /mnt/data
echo '/dev/disk/by-id/scsi-0DO_Volume_rhel9-data /mnt/data xfs defaults,noatime 0 0' | sudo tee -a /etc/fstab
sudo mount -a
```

## Conclusion

While DigitalOcean does not provide RHEL natively, custom images let you run it on Droplets. You will need your own RHEL subscription for updates and support. For simpler setups, consider DigitalOcean's supported Linux distributions, but when enterprise RHEL support is required, the custom image approach works well.
