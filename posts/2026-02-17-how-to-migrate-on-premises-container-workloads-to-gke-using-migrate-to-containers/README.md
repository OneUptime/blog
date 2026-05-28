# How to Migrate On-Premises Container Workloads to GKE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Migrate to Containers, Kubernetes, Migration

Description: Learn how to use Google Migrate to Containers to move on-premises VM-based and container workloads to Google Kubernetes Engine.

---

Google's Migrate to Containers tool does something genuinely useful - it takes workloads running on VMs and converts them into containers that run on GKE. This is not just about moving containers from one orchestrator to another. The real value is when you have applications running on VMs that you want to containerize without rewriting them from scratch. The tool copies the VM filesystem, analyzes the application, generates a container image build configuration, and produces Kubernetes deployment manifests.

## What Migrate to Containers Actually Does

The tool works in four phases:

1. **Copy** - Copies the source VM filesystem locally
2. **Analyze** - Creates a migration plan from the copied filesystem
3. **Generate** - Generates migration artifacts, including Kubernetes YAML and image build files
4. **Optimization** - Iteratively refines the container image to reduce size and improve startup time

It supports migrating from:
- VMware vSphere VMs
- Compute Engine VMs
- Linux machines that can be copied over SSH

## Prerequisites

Set up a GKE cluster and a Linux machine where you will run the migration CLI:

```bash
# Create a GKE cluster where you will deploy the migrated workload

gcloud container clusters create migration-cluster \
  --zone us-central1-a \
  --machine-type e2-medium \
  --image-type ubuntu_containerd \
  --num-nodes 1 \
  --logging=SYSTEM,WORKLOAD,API_SERVER,SCHEDULER,CONTROLLER_MANAGER

# Install Docker and Skaffold on the machine where you will run the migration
curl -fsSL https://get.docker.com -o install-docker.sh
sudo sh install-docker.sh
sudo usermod -aG docker $USER
newgrp docker

curl -Lo skaffold https://storage.googleapis.com/skaffold/releases/latest/skaffold-linux-amd64
sudo install skaffold /usr/local/bin/

# Download the Migrate to Containers CLI
curl -O "https://m2c-cli-release.storage.googleapis.com/$(curl -s https://m2c-cli-release.storage.googleapis.com/latest)/linux/amd64/m2c"
chmod +x ./m2c
```

## Step 1 - Set Up the Source

Connect Migrate to Containers to your on-premises VM over SSH by copying the VM filesystem locally:

```bash
# Start from the default rsync filters
./m2c copy default-filters > filters.txt

# Copy the source machine's filesystem over SSH
./m2c copy ssh migration-user@app-server.internal.mycompany.com \
  --identity-file /path/to/private-key \
  --remote-sudo \
  --output my-app-filesystem \
  --filters filters.txt
```

For Compute Engine sources:

```bash
./m2c copy gcloud \
  --project my-project \
  --zone us-central1-a \
  --vm-name my-app-vm \
  --remote-sudo \
  --output my-app-filesystem \
  --filters filters.txt
```

## Step 2 - Assess Workloads

Before migrating, assess which VMs are good candidates. For a technical fit assessment, use Migration Center discovery tools; for the containerization step itself, run `m2c analyze` to inspect the copied filesystem and produce a migration plan:

```bash
# Analyze the copied filesystem and create a migration plan
./m2c analyze \
  --source my-app-filesystem \
  --plugin linux-vm-container \
  --output analysis-output

# Review the generated migration plan
less analysis-output/config.yaml
```

The analysis output helps you review:

- Whether the VM is a reasonable candidate for containerization
- Detected services and listening ports
- Potential issues (like kernel dependencies or hardware-specific drivers)
- Filesystem paths that are included or excluded from the generated artifacts

Review the generated `config.yaml` carefully:

```yaml
# Example areas to review in analysis-output/config.yaml
services:
  nginx:
    enabled: true
  my-java-app:
    enabled: true
  ssh:
    enabled: false
endpoints:
  - name: http
    port: 80
    protocol: TCP
  - name: app
    port: 8080
    protocol: TCP
```

## Step 3 - Create the Migration

Start the actual migration process:

```bash
# Generate the migration artifacts from the analysis output
./m2c generate --input analysis-output --output migration-artifacts

# The migration goes through these phases:
# 1. Copying - copies the VM filesystem
# 2. Analyzing - creates the migration plan
# 3. Generating - creates the deployment and image artifacts
```

The tool generates several artifacts:

```bash
# Inspect the generated artifacts
ls migration-artifacts/

# The artifacts directory contains:
# - Dockerfile or Skaffold build files for the generated image
# - deployment_spec.yaml - Kubernetes Deployment
# - skaffold.yaml - build and deploy configuration
# - services-config.yaml - service initialization configuration when applicable
```

## Step 4 - Customize the Migration Plan

Before generating the final image, customize the migration plan in `analysis-output/config.yaml`:

```yaml
# config.yaml - customize before generating the image
# Configure which services should start in the container
services:
  nginx:
    enabled: true
  my-java-app:
    enabled: true
  # Disable services that are not needed in the container
  ssh:
    enabled: false
  cron:
    enabled: false
  rsyslog:
    enabled: false

# Map VM ports to container ports
endpoints:
  - name: http
    port: 80
    protocol: TCP
  - name: app
    port: 8080
    protocol: TCP
```

Apply the customized plan:

```bash
# Generate the container artifacts with the updated plan
./m2c generate --input analysis-output --output migration-artifacts
```

## Step 5 - Deploy to GKE

Review and deploy the generated Kubernetes manifests:

```yaml
# deployment_spec.yaml - generated by Migrate to Containers
# Review and customize before deploying
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  labels:
    app: my-app
    migrated-from: vsphere
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: gcr.io/my-project/my-app-migration
          ports:
            - containerPort: 80
              name: http
            - containerPort: 8080
              name: app
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2000m"
              memory: "4Gi"
          # Readiness probe to check if the app is ready
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          # Liveness probe to restart if the app hangs
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 60
            periodSeconds: 30
```

Deploy to your target GKE cluster:

```bash
# Connect to the target GKE cluster
gcloud container clusters get-credentials migration-cluster \
  --zone us-central1-a \
  --project my-project

# Build and deploy the generated workload
cd migration-artifacts
skaffold run -d gcr.io/my-project

# Verify the deployment
kubectl get pods -l app=my-app
kubectl logs -l app=my-app --tail=50

# Check that the application is healthy, if you configured a Service named my-app
kubectl port-forward svc/my-app 8080:8080
curl http://localhost:8080/health
```

## Step 6 - Handle External Dependencies

VMs typically have external dependencies that need attention:

```yaml
# NFS mounts become PersistentVolumeClaims
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-app-data
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: enterprise-rwx
  resources:
    requests:
      storage: 100Gi
---
# Mount the PVC in the deployment
# Add to the container spec:
# volumeMounts:
#   - name: data
#     mountPath: /data
# volumes:
#   - name: data
#     persistentVolumeClaim:
#       claimName: my-app-data
```

For cron jobs that ran on the VM:

```yaml
# Convert VM cron jobs to Kubernetes CronJobs
apiVersion: batch/v1
kind: CronJob
metadata:
  name: my-app-cleanup
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: cleanup
              image: gcr.io/my-project/my-app-migration
              command: ["/usr/local/bin/cleanup.sh"]
          restartPolicy: OnFailure
```

## Step 7 - Optimize the Container Image

The initial migrated image is often larger than necessary because it contains the full VM filesystem. Iteratively optimize it:

```bash
# Check the initial image size
docker images gcr.io/my-project/my-app-migration

# Common optimizations:
# 1. Remove unnecessary packages
# 2. Exclude more filesystem paths in the copy filters
# 3. Multi-stage builds for compiled applications
# 4. Eventually, create a proper Dockerfile from scratch

# For long-term optimization, use the migrated container as a reference
# to build a clean container from a base image
```

## When Not to Use Migrate to Containers

The tool works best for stateless applications and web services. It is not ideal for:

- **Databases** - use managed services (Cloud SQL, Firestore) instead
- **Stateful applications with complex disk I/O** - these need careful consideration
- **Applications with kernel module dependencies** - containers share the host kernel
- **Windows applications** - limited support compared to Linux
- **Applications that depend on specific hardware** - GPU or specialized devices

## Migration Strategy

For a fleet of VMs, prioritize based on complexity:

1. **Simple web servers and APIs** - migrate first, lowest risk
2. **Application servers with external database** - medium complexity
3. **Stateful applications** - highest complexity, migrate last or consider managed alternatives

Migrate to Containers is not a permanent solution - it is a bridge. The migrated containers get you running on GKE quickly, but plan to eventually refactor them into proper cloud-native containers with optimized Dockerfiles, proper health checks, and clean dependency management.
