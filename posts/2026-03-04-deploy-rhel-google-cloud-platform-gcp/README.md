# How to Deploy RHEL on Google Cloud Platform (GCP)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Google Cloud, GCP, Cloud, Deployment, Linux

Description: Deploy RHEL virtual machines on Google Cloud Platform using official images, including instance configuration, networking, and startup scripts.

---

Google Cloud provides official RHEL images that are optimized for the GCP environment. These images include the Google guest agent and cloud-init for automated configuration at boot time.

## Finding RHEL Images on GCP

```bash
# List available RHEL images
gcloud compute images list --filter="family:rhel" --project=rhel-cloud

# Show details for RHEL 9 images
gcloud compute images list \
  --project=rhel-cloud \
  --filter="family:rhel-9" \
  --format="table(name, family, creationTimestamp)"
```

## Creating a RHEL Instance

```bash
# Create a RHEL 9 VM instance
gcloud compute instances create rhel-server-01 \
  --zone=us-central1-a \
  --machine-type=e2-standard-4 \
  --image-family=rhel-9 \
  --image-project=rhel-cloud \
  --boot-disk-size=50GB \
  --boot-disk-type=pd-ssd \
  --tags=http-server,https-server \
  --metadata=enable-oslogin=true
```

## Using a Startup Script

Pass a startup script for automatic configuration:

```bash
# Create a startup script
cat > startup-script.sh << 'STARTUP'
#!/bin/bash
# Install and configure web server
dnf install -y nginx firewalld
systemctl enable --now nginx
systemctl enable --now firewalld
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
echo "RHEL on GCP - $(hostname)" > /var/www/html/index.html
STARTUP

# Create the instance with the startup script
gcloud compute instances create rhel-web-01 \
  --zone=us-central1-a \
  --machine-type=e2-standard-2 \
  --image-family=rhel-9 \
  --image-project=rhel-cloud \
  --boot-disk-size=50GB \
  --metadata-from-file=startup-script=startup-script.sh \
  --tags=http-server
```

## Configuring Firewall Rules

```bash
# Allow HTTP traffic
gcloud compute firewall-rules create allow-http \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:80 \
  --target-tags=http-server

# Allow HTTPS traffic
gcloud compute firewall-rules create allow-https \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:443 \
  --target-tags=https-server
```

## Attaching Additional Disks

```bash
# Create and attach a data disk
gcloud compute disks create data-disk-01 \
  --zone=us-central1-a \
  --size=200GB \
  --type=pd-ssd

gcloud compute instances attach-disk rhel-server-01 \
  --disk=data-disk-01 \
  --zone=us-central1-a
```

Format and mount the disk from within the VM:

```bash
# SSH into the instance
gcloud compute ssh rhel-server-01 --zone=us-central1-a

# Format and mount the data disk
sudo mkfs.xfs /dev/sdb
sudo mkdir -p /data
sudo mount /dev/sdb /data
echo '/dev/sdb /data xfs defaults 0 0' | sudo tee -a /etc/fstab
```

## Verifying the Deployment

```bash
# Check instance status
gcloud compute instances describe rhel-server-01 \
  --zone=us-central1-a \
  --format="yaml(status, networkInterfaces[0].accessConfigs[0].natIP)"

# SSH in and verify
gcloud compute ssh rhel-server-01 --zone=us-central1-a -- "cat /etc/redhat-release"
```
