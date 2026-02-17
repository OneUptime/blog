# How to Automate Compute Engine Instance Creation with gcloud CLI and Shell Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, gcloud, Automation, Shell Scripts

Description: A practical guide to automating Google Compute Engine VM creation using gcloud CLI commands and shell scripts, covering parameterization, startup scripts, and batch operations.

---

Manually clicking through the Cloud Console to create VMs works fine when you need one or two. But when you are spinning up environments regularly - for testing, staging, or scaling workloads - you need automation. The gcloud CLI combined with shell scripts is a straightforward way to get there without pulling in heavier tools like Terraform.

In this post, I will cover how to script Compute Engine instance creation, handle parameterization, attach startup scripts, and create multiple VMs in a loop.

## Basic Instance Creation with gcloud

Let us start with the simplest case. This command creates a single Compute Engine instance with reasonable defaults:

```bash
# Create a basic e2-medium instance in us-central1-a
gcloud compute instances create my-vm \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=20GB \
  --tags=http-server,https-server
```

This gives you a Debian 12 VM with a 20GB boot disk and network tags for HTTP/HTTPS traffic. But hardcoding all these values is not great for automation. Let us make this more flexible.

## Parameterizing with Shell Variables

The first step toward a reusable script is pulling values into variables. This lets you change configurations without editing the gcloud command itself.

```bash
#!/bin/bash
# Script to create a Compute Engine instance with configurable parameters

# Configuration variables
PROJECT_ID="my-project"
ZONE="us-central1-a"
INSTANCE_NAME="web-server-01"
MACHINE_TYPE="e2-medium"
IMAGE_FAMILY="debian-12"
IMAGE_PROJECT="debian-cloud"
BOOT_DISK_SIZE="20GB"
NETWORK_TAGS="http-server,https-server"
SERVICE_ACCOUNT="my-sa@${PROJECT_ID}.iam.gserviceaccount.com"

# Set the active project
gcloud config set project "${PROJECT_ID}"

# Create the instance
gcloud compute instances create "${INSTANCE_NAME}" \
  --zone="${ZONE}" \
  --machine-type="${MACHINE_TYPE}" \
  --image-family="${IMAGE_FAMILY}" \
  --image-project="${IMAGE_PROJECT}" \
  --boot-disk-size="${BOOT_DISK_SIZE}" \
  --tags="${NETWORK_TAGS}" \
  --service-account="${SERVICE_ACCOUNT}" \
  --scopes=cloud-platform

echo "Instance ${INSTANCE_NAME} created in ${ZONE}"
```

Now you can change the zone, machine type, or any other parameter by editing the variables at the top. But we can do better.

## Accepting Command-Line Arguments

For real automation, you want to pass parameters at runtime. Here is a script that accepts arguments:

```bash
#!/bin/bash
# Create a Compute Engine instance with command-line arguments
# Usage: ./create-vm.sh <instance-name> <zone> <machine-type>

# Validate that required arguments are provided
if [ $# -lt 1 ]; then
  echo "Usage: $0 <instance-name> [zone] [machine-type]"
  exit 1
fi

# Assign arguments with defaults for optional parameters
INSTANCE_NAME="$1"
ZONE="${2:-us-central1-a}"
MACHINE_TYPE="${3:-e2-medium}"

# Create the instance with the provided parameters
gcloud compute instances create "${INSTANCE_NAME}" \
  --zone="${ZONE}" \
  --machine-type="${MACHINE_TYPE}" \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=20GB \
  --labels="created-by=automation,environment=dev"

# Check if the creation was successful
if [ $? -eq 0 ]; then
  echo "Successfully created ${INSTANCE_NAME} in ${ZONE}"
else
  echo "Failed to create ${INSTANCE_NAME}" >&2
  exit 1
fi
```

The `${2:-us-central1-a}` syntax provides default values when arguments are not supplied. This keeps the script flexible without requiring every parameter every time.

## Adding Startup Scripts

Most VMs need some initial configuration - installing packages, pulling code, setting up services. Startup scripts handle this automatically when the instance boots.

You can inline a short startup script:

```bash
# Create an instance with an inline startup script
gcloud compute instances create web-server \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --metadata=startup-script='#!/bin/bash
apt-get update
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx
echo "Server ready" > /var/www/html/index.html'
```

For anything more than a few lines, use a separate file:

```bash
# Create an instance with a startup script from a file
gcloud compute instances create web-server \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --metadata-from-file=startup-script=./startup.sh
```

Here is what a more complete startup script file might look like:

```bash
#!/bin/bash
# startup.sh - Configure the VM on first boot

# Log all output to a file for debugging
exec > /var/log/startup-script.log 2>&1
set -ex

# Update packages and install dependencies
apt-get update
apt-get install -y nginx docker.io

# Enable and start services
systemctl enable nginx docker
systemctl start nginx docker

# Pull and run the application container
docker pull gcr.io/my-project/my-app:latest
docker run -d --restart=always -p 8080:8080 gcr.io/my-project/my-app:latest

echo "Startup script completed at $(date)"
```

## Creating Multiple Instances in a Loop

When you need several VMs - say, a cluster of workers - a loop makes this painless:

```bash
#!/bin/bash
# Create multiple Compute Engine instances in a loop

INSTANCE_PREFIX="worker"
ZONE="us-central1-a"
MACHINE_TYPE="e2-standard-4"
COUNT=5

for i in $(seq 1 ${COUNT}); do
  INSTANCE_NAME="${INSTANCE_PREFIX}-$(printf '%03d' $i)"

  echo "Creating ${INSTANCE_NAME}..."

  # Create each instance with a unique name and index label
  gcloud compute instances create "${INSTANCE_NAME}" \
    --zone="${ZONE}" \
    --machine-type="${MACHINE_TYPE}" \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --labels="role=worker,index=${i}" \
    --metadata="worker-index=${i}" \
    --async  # Don't wait for each instance to finish before starting the next
done

echo "All ${COUNT} instances creation initiated"
```

The `--async` flag is important here. Without it, gcloud waits for each instance to be fully created before starting the next one. With `--async`, all creation requests are sent immediately and run in parallel.

## Spreading Instances Across Zones

For high availability, you probably want VMs in different zones:

```bash
#!/bin/bash
# Create instances spread across multiple zones

ZONES=("us-central1-a" "us-central1-b" "us-central1-c")
INSTANCE_PREFIX="app-server"
MACHINE_TYPE="e2-medium"

for i in "${!ZONES[@]}"; do
  ZONE="${ZONES[$i]}"
  INSTANCE_NAME="${INSTANCE_PREFIX}-${ZONE}"

  echo "Creating ${INSTANCE_NAME} in ${ZONE}..."

  # Create one instance per zone for geographic distribution
  gcloud compute instances create "${INSTANCE_NAME}" \
    --zone="${ZONE}" \
    --machine-type="${MACHINE_TYPE}" \
    --image-family=debian-12 \
    --image-project=debian-cloud \
    --labels="role=app-server,zone=${ZONE}" \
    --async
done
```

## Adding Error Handling and Idempotency

Production scripts need to handle failures gracefully and be safe to run multiple times:

```bash
#!/bin/bash
# Idempotent instance creation with error handling

create_instance() {
  local name="$1"
  local zone="$2"

  # Check if the instance already exists
  if gcloud compute instances describe "${name}" --zone="${zone}" &>/dev/null; then
    echo "Instance ${name} already exists in ${zone}, skipping."
    return 0
  fi

  # Attempt to create the instance
  if gcloud compute instances create "${name}" \
    --zone="${zone}" \
    --machine-type=e2-medium \
    --image-family=debian-12 \
    --image-project=debian-cloud; then
    echo "Created ${name} successfully"
    return 0
  else
    echo "Failed to create ${name}" >&2
    return 1
  fi
}

# Track failures
FAILURES=0

# Create instances and count failures
for name in "web-1" "web-2" "web-3"; do
  create_instance "${name}" "us-central1-a" || ((FAILURES++))
done

if [ ${FAILURES} -gt 0 ]; then
  echo "${FAILURES} instance(s) failed to create" >&2
  exit 1
fi

echo "All instances created successfully"
```

## Cleanup Script

Always pair your creation script with a cleanup script. It saves money and keeps your project tidy:

```bash
#!/bin/bash
# Delete all instances matching a prefix

PREFIX="worker"
ZONE="us-central1-a"

# List instances matching the prefix
INSTANCES=$(gcloud compute instances list \
  --filter="name~^${PREFIX}" \
  --zones="${ZONE}" \
  --format="value(name)")

if [ -z "${INSTANCES}" ]; then
  echo "No instances found with prefix ${PREFIX}"
  exit 0
fi

echo "Deleting instances: ${INSTANCES}"

# Delete all matching instances in one command
gcloud compute instances delete ${INSTANCES} \
  --zone="${ZONE}" \
  --quiet  # Skip confirmation prompt
```

## When to Move Beyond Shell Scripts

Shell scripts with gcloud are perfect for simple automation, quick prototyping, and CI/CD pipelines. But if you find yourself managing complex dependencies between resources, needing state tracking, or coordinating across many resource types, that is when tools like Terraform or Pulumi start making more sense.

The gcloud approach shines when you need something running fast without the overhead of learning a new tool or managing state files. Start here, and graduate to IaC tools when the complexity demands it.
