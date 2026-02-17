# How to Create a Golden Image from an Existing Compute Engine VM Using Custom Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Custom Images, Golden Image, DevOps

Description: A practical guide to creating golden images from existing Compute Engine VMs using custom images, including preparation steps and best practices for image management.

---

A golden image is a pre-configured VM image that serves as the baseline for all your instances. Instead of having every new VM run a startup script that installs packages, configures services, and applies settings (which takes time and can fail), you bake all of that into an image once. Every instance launched from that image comes up ready to go in seconds.

This is a standard practice in any mature cloud environment, and GCP makes it straightforward through custom images. Let me walk you through the entire process.

## Why Golden Images

Before we get into the how, let me explain why you should care:

- **Faster boot times**: A VM from a golden image starts in under a minute. A VM that needs to run a 10-minute setup script takes, well, 10 minutes plus boot time.
- **Consistency**: Every instance is identical. No more "it works on my instance but not yours" situations caused by a flaky install script.
- **Reliability**: If a package repository is down, your startup script fails. A golden image has everything already installed.
- **Security**: You can scan and harden the image once, and every instance inherits those protections.

## Step 1: Prepare the Source VM

Start with a VM that has everything you need installed and configured. If you do not already have one, create it:

```bash
# Create a base VM to configure
gcloud compute instances create golden-image-base \
    --zone=us-central1-a \
    --machine-type=e2-medium \
    --image-family=debian-12 \
    --image-project=debian-cloud
```

SSH in and install everything your application needs:

```bash
# SSH into the VM
gcloud compute ssh golden-image-base --zone=us-central1-a
```

Inside the VM, install your software stack:

```bash
# Update the system and install required packages
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y nginx docker.io python3-pip htop

# Configure services
sudo systemctl enable nginx
sudo systemctl enable docker

# Install application dependencies
pip3 install flask gunicorn

# Apply security hardening
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## Step 2: Clean Up the VM Before Imaging

This is the step that most people skip, and it leads to problems. Before creating the image, you need to generalize the VM by removing instance-specific data.

```bash
# Remove SSH host keys (they will be regenerated on first boot of new instances)
sudo rm -f /etc/ssh/ssh_host_*

# Clean up apt cache to reduce image size
sudo apt-get clean
sudo apt-get autoremove -y

# Remove temporary files
sudo rm -rf /tmp/*
sudo rm -rf /var/tmp/*

# Clear log files
sudo truncate -s 0 /var/log/*.log
sudo truncate -s 0 /var/log/**/*.log 2>/dev/null

# Remove bash history
history -c
rm -f ~/.bash_history
sudo rm -f /root/.bash_history

# Remove the authorized_keys file (new instances will get their own)
rm -f ~/.ssh/authorized_keys

# Clear machine ID so each instance gets a unique one
sudo truncate -s 0 /etc/machine-id
```

These cleanup steps ensure that each VM created from the image gets its own unique identity.

## Step 3: Stop the VM

You need to stop the VM before creating an image from its disk. While GCP technically allows creating an image from a running instance, it is not recommended because the filesystem might be in an inconsistent state.

```bash
# Stop the VM to ensure a clean disk state
gcloud compute instances stop golden-image-base --zone=us-central1-a
```

## Step 4: Create the Custom Image

Now create the image from the stopped VM's boot disk:

```bash
# Create a custom image from the VM's boot disk
gcloud compute images create my-app-golden-v1 \
    --source-disk=golden-image-base \
    --source-disk-zone=us-central1-a \
    --family=my-app \
    --description="Golden image with Nginx, Docker, and Python stack - v1" \
    --labels=version=v1,team=platform,os=debian-12 \
    --storage-location=us
```

The key parameters here:

- **--family=my-app**: Image families let you always reference the latest image in a family. When you create a new version, it automatically becomes the default.
- **--labels**: Labels help you track and manage images. Include the version, team, and base OS at minimum.
- **--storage-location**: Where the image is stored. Multi-region (like `us`) for availability, or a specific region for cost savings.

## Step 5: Use the Image

Now you can create new VMs from your golden image:

```bash
# Create a new VM from the custom image
gcloud compute instances create production-server-1 \
    --zone=us-central1-a \
    --machine-type=e2-medium \
    --image=my-app-golden-v1

# Or use the image family to always get the latest version
gcloud compute instances create production-server-2 \
    --zone=us-central1-a \
    --machine-type=e2-medium \
    --image-family=my-app
```

Using `--image-family` is the recommended approach for production. When you create a new version of your golden image and add it to the same family, all new instances automatically use the latest version.

## Creating an Instance Template from the Golden Image

For managed instance groups, create an instance template that references your image:

```bash
# Create an instance template using the golden image family
gcloud compute instance-templates create my-app-template-v1 \
    --machine-type=e2-medium \
    --image-family=my-app \
    --tags=http-server,https-server
```

## Terraform Configuration

Here is the Terraform setup for managing golden images.

```hcl
# Create a custom image from an existing disk
resource "google_compute_image" "golden" {
  name        = "my-app-golden-v1"
  family      = "my-app"
  description = "Golden image with Nginx, Docker, and Python stack"
  source_disk = google_compute_instance.base.boot_disk[0].source

  labels = {
    version = "v1"
    team    = "platform"
    os      = "debian-12"
  }
}

# Use the image family in an instance template
resource "google_compute_instance_template" "app" {
  name_prefix  = "my-app-"
  machine_type = "e2-medium"

  disk {
    # Reference the image family - always gets the latest
    source_image = "my-app"
    auto_delete  = true
    boot         = true
  }

  network_interface {
    network = "default"
  }

  lifecycle {
    create_before_destroy = true
  }
}
```

## Image Versioning Strategy

A good versioning strategy keeps things manageable:

1. **Use image families**: Always add images to a family. The family always points to the most recent non-deprecated image.
2. **Include version in the name**: Use names like `my-app-golden-v1`, `my-app-golden-v2`, etc.
3. **Deprecate old images**: Instead of deleting old images immediately, deprecate them first.

```bash
# Deprecate an old image version
gcloud compute images deprecate my-app-golden-v1 \
    --state=DEPRECATED \
    --replacement=my-app-golden-v2

# Later, when you are sure nobody needs it
gcloud compute images delete my-app-golden-v1
```

## Automating the Image Build Process

For a production-grade workflow, you should automate image creation. Here is a simplified Cloud Build configuration:

```yaml
# cloudbuild.yaml - Automated golden image build pipeline
steps:
  # Step 1: Create a temporary VM
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - compute
      - instances
      - create
      - image-builder-temp
      - --zone=us-central1-a
      - --machine-type=e2-medium
      - --image-family=debian-12
      - --image-project=debian-cloud
      - --metadata-from-file=startup-script=scripts/setup.sh

  # Step 2: Wait for setup to complete
  - name: 'gcr.io/cloud-builders/gcloud'
    entrypoint: bash
    args:
      - -c
      - sleep 300

  # Step 3: Stop the VM
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - compute
      - instances
      - stop
      - image-builder-temp
      - --zone=us-central1-a

  # Step 4: Create the image
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - compute
      - images
      - create
      - my-app-golden-${SHORT_SHA}
      - --source-disk=image-builder-temp
      - --source-disk-zone=us-central1-a
      - --family=my-app

  # Step 5: Delete the temporary VM
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - compute
      - instances
      - delete
      - image-builder-temp
      - --zone=us-central1-a
      - --quiet
```

For more advanced setups, consider using Packer, which is purpose-built for creating machine images.

## Best Practices

- **Rebuild regularly**: Do not let your golden image get stale. Rebuild it at least monthly to include security patches.
- **Test before promoting**: Create a test VM from the new image and run your test suite before adding it to the image family.
- **Keep images small**: Remove unnecessary packages, caches, and logs before imaging. Smaller images mean faster instance creation.
- **Document what is in the image**: Keep a changelog or manifest that lists what software and versions are baked into each image version.
- **Do not bake in secrets**: Never include API keys, passwords, or certificates in the image. Use Secret Manager or instance metadata for that.

## Wrapping Up

Golden images are a foundational practice for running reliable infrastructure on GCP. They eliminate the unpredictability of runtime provisioning scripts and give you fast, consistent, and secure VM deployments. Start with a manual process to get comfortable, then automate the build pipeline once you have a stable workflow. Your on-call engineers will thank you when new instances come up in 30 seconds instead of 10 minutes.
