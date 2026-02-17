# How to Migrate On-Premises Container Workloads to GKE Using Migrate to Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Migrate to Containers, Kubernetes, Migration

Description: Learn how to use Google Migrate to Containers to move on-premises VM-based and container workloads to Google Kubernetes Engine.

---

Google's Migrate to Containers tool does something genuinely useful - it takes workloads running on VMs (whether on-premises, on AWS, or on Azure) and converts them into containers that run on GKE. This is not just about moving containers from one orchestrator to another. The real value is when you have applications running on VMs that you want to containerize without rewriting them from scratch. The tool analyzes the VM, extracts the application layer, generates a container image, and produces Kubernetes deployment manifests.

## What Migrate to Containers Actually Does

The tool works in three phases:

1. **Assessment** - Analyzes source VMs to determine migration feasibility
2. **Migration** - Creates a container image from the VM's filesystem and generates Kubernetes YAML
3. **Optimization** - Iteratively refines the container image to reduce size and improve startup time

It supports migrating from:
- VMware vSphere VMs
- AWS EC2 instances
- Azure VMs
- Compute Engine VMs
- Physical servers (via VMware conversion)

## Prerequisites

Set up the migration infrastructure:

```bash
# Create a GKE cluster that will run the migration processing components
gcloud container clusters create migration-cluster \
  --zone us-central1-a \
  --machine-type e2-standard-4 \
  --num-nodes 3 \
  --enable-ip-alias

# Install Migrate to Containers on the cluster
migctl setup install --gke-cluster migration-cluster --gke-zone us-central1-a

# Verify the installation
migctl doctor
```

## Step 1 - Set Up the Source

Connect Migrate to Containers to your on-premises VMware environment:

```bash
# Create a source for VMware vSphere
migctl source create vsphere my-vsphere-source \
  --manager-address vcenter.internal.mycompany.com \
  --username migration-user@mycompany.com \
  --password-file /path/to/password-file \
  --dc my-datacenter

# Verify the source connection
migctl source status my-vsphere-source
```

For AWS sources:

```bash
# Create a source for AWS EC2
migctl source create aws my-aws-source \
  --region us-east-1 \
  --access-key-id AKIAIOSFODNN7EXAMPLE \
  --secret-access-key-file /path/to/secret-key-file
```

## Step 2 - Assess Workloads

Before migrating, assess which VMs are good candidates:

```bash
# Create a migration assessment
migctl assessment create my-app-assessment \
  --source my-vsphere-source \
  --vm-id vm-12345 \
  --os-type linux

# Check the assessment status
migctl assessment status my-app-assessment

# Download the assessment report
migctl assessment get my-app-assessment -o assessment-report.yaml
```

The assessment report tells you:

- Whether the VM is compatible with containerization
- Estimated container image size
- Detected services and listening ports
- Recommended Kubernetes resource requirements
- Potential issues (like kernel dependencies or hardware-specific drivers)

Review the assessment carefully:

```yaml
# Example assessment report highlights
assessment:
  compatibility: COMPATIBLE
  detected_services:
    - name: nginx
      ports: [80, 443]
    - name: my-java-app
      ports: [8080]
  estimated_image_size: 2.1 GB
  warnings:
    - "NFS mounts detected - will need PersistentVolume configuration"
    - "Cron jobs detected - consider Kubernetes CronJob resources"
  recommendations:
    cpu_request: "500m"
    memory_request: "1Gi"
    cpu_limit: "2000m"
    memory_limit: "4Gi"
```

## Step 3 - Create the Migration

Start the actual migration process:

```bash
# Create a migration for a Linux VM
migctl migration create my-app-migration \
  --source my-vsphere-source \
  --vm-id vm-12345 \
  --intent Image

# Monitor the migration progress
migctl migration status my-app-migration

# The migration goes through these phases:
# 1. Extracting - copies the VM filesystem
# 2. Generating - creates the container image
# 3. Completed - image is ready in the artifact repository
```

The tool generates several artifacts:

```bash
# Download the generated Kubernetes manifests
migctl migration get-artifacts my-app-migration -o /tmp/migration-artifacts/

# The artifacts directory contains:
# - Dockerfile - the generated Dockerfile
# - deployment_spec.yaml - Kubernetes Deployment
# - service.yaml - Kubernetes Service
# - migration-plan.yaml - customizable migration plan
```

## Step 4 - Customize the Migration Plan

Before generating the final image, customize the migration plan:

```yaml
# migration-plan.yaml - customize before generating the image
apiVersion: anthos-migrate.cloud.google.com/v1
kind: MigrationPlan
metadata:
  name: my-app-migration
spec:
  # Exclude unnecessary files from the container image
  dataVolumes:
    - folders:
        # Exclude log files and temp directories to reduce image size
        - /var/log/*
        - /tmp/*
        - /var/cache/*
        # Exclude system directories not needed in containers
        - /boot/*
        - /usr/src/*

  # Configure which services should start in the container
  services:
    nginx:
      enabled: true
    my-java-app:
      enabled: true
    # Disable services that are not needed in the container
    sshd:
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
# Update the migration with the customized plan
migctl migration update my-app-migration --plan /tmp/migration-artifacts/migration-plan.yaml

# Generate the container image with the updated plan
migctl migration generate-artifacts my-app-migration
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
          image: gcr.io/my-project/my-app-migration:v1
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
# Deploy to the production GKE cluster (not the migration cluster)
kubectl apply -f /tmp/migration-artifacts/deployment_spec.yaml
kubectl apply -f /tmp/migration-artifacts/service.yaml

# Verify the deployment
kubectl get pods -l app=my-app
kubectl logs -l app=my-app --tail=50

# Check that the application is healthy
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
  storageClassName: filestore-standard
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
              image: gcr.io/my-project/my-app-migration:v1
              command: ["/usr/local/bin/cleanup.sh"]
          restartPolicy: OnFailure
```

## Step 7 - Optimize the Container Image

The initial migrated image is often larger than necessary because it contains the full VM filesystem. Iteratively optimize it:

```bash
# Check the initial image size
docker images gcr.io/my-project/my-app-migration:v1

# Common optimizations:
# 1. Remove unnecessary packages
# 2. Exclude more filesystem paths in the migration plan
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
