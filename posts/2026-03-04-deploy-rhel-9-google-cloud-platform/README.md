# How to Deploy RHEL on Google Cloud Platform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GCP, Google Cloud, Cloud, Linux

Description: Deploy and configure RHEL on Google Cloud Platform Compute Engine with proper networking, storage, and monitoring setup.

---

Google Cloud Platform provides certified RHEL images for Compute Engine instances. This guide covers deploying RHEL on GCP with best practices for networking, storage, and integration with GCP services.

## Step 1: Create a RHEL Instance

```bash
# Create a RHEL instance on GCP
gcloud compute instances create rhel9-instance \
  --zone=us-central1-a \
  --machine-type=e2-standard-4 \
  --image-project=rhel-cloud \
  --image-family=rhel-9 \
  --boot-disk-size=50GB \
  --boot-disk-type=pd-ssd \
  --network-tier=PREMIUM \
  --tags=http-server,https-server \
  --metadata=enable-oslogin=TRUE

# Attach an additional data disk
gcloud compute disks create rhel9-data \
  --zone=us-central1-a \
  --size=200GB \
  --type=pd-ssd

gcloud compute instances attach-disk rhel9-instance \
  --disk=rhel9-data \
  --zone=us-central1-a
```

## Step 2: Configure the Instance

```bash
# SSH into the instance (uses OS Login by default)
gcloud compute ssh rhel9-instance --zone=us-central1-a

# Update the system
sudo dnf update -y

# Format and mount the data disk
sudo mkfs.xfs /dev/sdb
sudo mkdir -p /data
echo '/dev/sdb /data xfs defaults,noatime 0 0' | sudo tee -a /etc/fstab
sudo mount -a
```

## Step 3: Configure Firewall Rules

```bash
# Create GCP firewall rules
gcloud compute firewall-rules create allow-https \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:443 \
  --target-tags=https-server

# Configure firewalld on the instance
sudo systemctl enable --now firewalld
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Step 4: Install the Ops Agent

```bash
# Install the Google Cloud Ops Agent for monitoring and logging
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
sudo bash add-google-cloud-ops-agent-repo.sh --also-install

# Verify the agent is running
sudo systemctl status google-cloud-ops-agent

# Configure custom metrics collection
sudo tee /etc/google-cloud-ops-agent/config.yaml > /dev/null <<'OPSCONFIG'
metrics:
  receivers:
    hostmetrics:
      type: hostmetrics
      collection_interval: 60s
  service:
    pipelines:
      default_pipeline:
        receivers: [hostmetrics]
logging:
  receivers:
    syslog:
      type: files
      include_paths:
        - /var/log/messages
        - /var/log/secure
  service:
    pipelines:
      default_pipeline:
        receivers: [syslog]
OPSCONFIG

sudo systemctl restart google-cloud-ops-agent
```

## Step 5: Set Up Service Account Access

```bash
# Create a service account for the VM
gcloud iam service-accounts create rhel9-sa \
  --display-name="RHEL Service Account"

# Grant necessary roles
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:rhel9-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/monitoring.metricWriter"

# Associate the service account with the instance
gcloud compute instances set-service-account rhel9-instance \
  --zone=us-central1-a \
  --service-account=rhel9-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --scopes=cloud-platform
```

## Conclusion

RHEL on GCP benefits from SSD persistent disks, the Ops Agent for integrated monitoring, and OS Login for identity management. The certified RHEL images are maintained by Red Hat and Google, ensuring compatibility and timely security patches.
