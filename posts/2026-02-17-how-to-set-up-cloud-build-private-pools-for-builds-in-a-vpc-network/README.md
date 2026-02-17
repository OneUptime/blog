# How to Set Up Cloud Build Private Pools for Builds in a VPC Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, Private Pools, VPC, Networking, CI/CD, Security

Description: Learn how to create and configure Cloud Build private pools to run builds within your VPC network for accessing private resources securely.

---

By default, Cloud Build runs your builds on shared, Google-managed infrastructure. This works great until you need to access resources inside a private VPC - like a database with no public IP, an internal package registry, or a service running on a GKE cluster with private nodes. Cloud Build private pools solve this by running your builds on dedicated workers that are peered with your VPC network. In this post, I will cover how to set up private pools and connect them to your VPC.

## What Are Private Pools?

A private pool is a set of dedicated build workers managed by Google but connected to your VPC through VPC Network Peering. Unlike the default shared pool, private pool workers can reach private IP addresses in your network, giving your builds access to resources that are not exposed to the internet.

Key characteristics of private pools:

- Workers are dedicated to your project (not shared with other customers)
- Connected to your VPC via network peering
- Customizable machine types (up to 32 vCPUs and 100 GB disk)
- Support for all the same build features as the default pool
- Higher pricing than the default pool (you pay for the worker capacity)

## When to Use Private Pools

You need a private pool when your builds need to:

- Pull dependencies from a private artifact repository running in your VPC
- Connect to a database with only a private IP (Cloud SQL private IP, for example)
- Access internal services or APIs that are not exposed publicly
- Push images to a registry behind a firewall
- Run builds in a specific region for compliance reasons
- Use larger machine types than the default pool offers

## Setting Up a Private Pool

### Step 1: Enable Required APIs

```bash
# Enable the Cloud Build and Service Networking APIs
gcloud services enable cloudbuild.googleapis.com
gcloud services enable servicenetworking.googleapis.com
gcloud services enable compute.googleapis.com
```

### Step 2: Configure VPC Network Peering

Private pools connect to your VPC through a Service Networking connection. First, allocate an IP range for the peering:

```bash
# Allocate an IP range for the private pool workers
gcloud compute addresses create private-pool-range \
  --global \
  --purpose=VPC_PEERING \
  --addresses=192.168.0.0 \
  --prefix-length=24 \
  --network=my-vpc-network
```

Then create the peering connection:

```bash
# Create the private service connection
gcloud services vpc-peerings connect \
  --service=servicenetworking.googleapis.com \
  --ranges=private-pool-range \
  --network=my-vpc-network
```

This establishes the network path between Cloud Build private pool workers and your VPC. It can take a few minutes to complete.

### Step 3: Create the Private Pool

```bash
# Create a private worker pool with VPC connectivity
gcloud builds worker-pools create my-private-pool \
  --region=us-central1 \
  --peered-network="projects/$PROJECT_ID/global/networks/my-vpc-network" \
  --peered-network-ip-range="/private-pool-range"
```

You can also specify machine configuration:

```bash
# Create a private pool with custom machine settings
gcloud builds worker-pools create my-private-pool \
  --region=us-central1 \
  --peered-network="projects/$PROJECT_ID/global/networks/my-vpc-network" \
  --peered-network-ip-range="/private-pool-range" \
  --worker-machine-type=e2-standard-8 \
  --worker-disk-size=100
```

Available machine types include:
- `e2-standard-2` - 2 vCPUs, 8 GB RAM
- `e2-standard-4` - 4 vCPUs, 16 GB RAM
- `e2-standard-8` - 8 vCPUs, 32 GB RAM
- `e2-standard-16` - 16 vCPUs, 64 GB RAM
- `e2-standard-32` - 32 vCPUs, 128 GB RAM

### Step 4: Verify the Private Pool

```bash
# Check the status of the private pool
gcloud builds worker-pools describe my-private-pool \
  --region=us-central1
```

The pool should show a state of `RUNNING` once it is ready.

## Using the Private Pool in Builds

### In cloudbuild.yaml

Add the `pool` option to your cloudbuild.yaml:

```yaml
# Build configuration that runs on a private pool
steps:
  # This step can access resources in your VPC
  - name: 'bash'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Access a private database for running migrations
        apt-get update && apt-get install -y postgresql-client
        PGPASSWORD=$$DB_PASS psql -h 10.0.1.5 -U admin -d mydb -c "SELECT version();"

  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
      - '.'

options:
  pool:
    name: 'projects/$PROJECT_ID/locations/us-central1/workerPools/my-private-pool'

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
```

### With gcloud Command

```bash
# Submit a build to run on the private pool
gcloud builds submit \
  --config=cloudbuild.yaml \
  --worker-pool="projects/$PROJECT_ID/locations/us-central1/workerPools/my-private-pool" \
  .
```

### In Trigger Configuration

When creating a build trigger, specify the private pool:

```bash
# Create a trigger that uses the private pool
gcloud builds triggers create github \
  --name="build-with-private-pool" \
  --repo-name="my-app" \
  --repo-owner="my-org" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --worker-pool="projects/$PROJECT_ID/locations/us-central1/workerPools/my-private-pool"
```

## Practical Use Cases

### Accessing a Private Cloud SQL Instance

A very common scenario - your Cloud SQL database has only a private IP, and your build needs to run database migrations:

```yaml
# Run database migrations against a private Cloud SQL instance
steps:
  - name: 'gcr.io/cloud-builders/docker'
    id: 'build-migration-image'
    args:
      - 'build'
      - '-f'
      - 'Dockerfile.migrations'
      - '-t'
      - 'migration-runner'
      - '.'

  - name: 'migration-runner'
    id: 'run-migrations'
    secretEnv: ['DB_PASSWORD']
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Connect to the private Cloud SQL instance and run migrations
        DATABASE_URL="postgresql://admin:$$DB_PASSWORD@10.20.30.40:5432/production"
        npm run migrate -- --url "$$DATABASE_URL"

options:
  pool:
    name: 'projects/$PROJECT_ID/locations/us-central1/workerPools/my-private-pool'

availableSecrets:
  secretManager:
    - versionName: projects/$PROJECT_ID/secrets/db-password/versions/latest
      env: 'DB_PASSWORD'
```

### Pulling from a Private Artifact Repository

If you host an internal npm registry or Maven repository on a VM in your VPC:

```yaml
# Install packages from an internal registry
steps:
  - name: 'node:20'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Configure npm to use the internal registry running in the VPC
        npm config set registry http://10.0.2.50:4873/
        npm ci

  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/my-app:$SHORT_SHA', '.']

options:
  pool:
    name: 'projects/$PROJECT_ID/locations/us-central1/workerPools/my-private-pool'
```

### Deploying to a Private GKE Cluster

For GKE clusters with private endpoints:

```yaml
# Deploy to a private GKE cluster from a private pool
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/my-app:$SHORT_SHA', '.']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/my-app:$SHORT_SHA']

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Get credentials for the private GKE cluster
        gcloud container clusters get-credentials my-private-cluster \
          --region us-central1 \
          --internal-ip
        # Deploy the new image
        kubectl set image deployment/my-app \
          my-app=gcr.io/$PROJECT_ID/my-app:$SHORT_SHA

options:
  pool:
    name: 'projects/$PROJECT_ID/locations/us-central1/workerPools/my-private-pool'
```

## Network Configuration Details

### Firewall Rules

The VPC peering gives private pool workers IP addresses from the allocated range. You may need to create firewall rules to allow traffic from these addresses to your internal resources:

```bash
# Allow traffic from private pool workers to internal services
gcloud compute firewall-rules create allow-private-pool-to-internal \
  --network=my-vpc-network \
  --allow=tcp:5432,tcp:3306,tcp:443 \
  --source-ranges=192.168.0.0/24 \
  --target-tags=internal-services \
  --description="Allow Cloud Build private pool workers to reach internal services"
```

### DNS Resolution

Private pool workers can resolve private DNS names in your VPC if you have Cloud DNS configured. This means you can reference internal services by hostname:

```yaml
# Reference internal services by private DNS name
steps:
  - name: 'bash'
    entrypoint: 'bash'
    args:
      - '-c'
      - 'curl http://internal-registry.mycompany.internal:8080/health'
```

### Egress to the Internet

By default, private pool workers can still access the internet through Google's default internet gateway. If you need to route internet traffic through a specific path (like a proxy or NAT gateway), configure the VPC routing accordingly.

## Updating and Deleting Private Pools

```bash
# Update the machine type of an existing pool
gcloud builds worker-pools update my-private-pool \
  --region=us-central1 \
  --worker-machine-type=e2-standard-16

# Delete a private pool
gcloud builds worker-pools delete my-private-pool \
  --region=us-central1
```

## Cost Considerations

Private pools cost more than the default pool because you are paying for dedicated compute resources. The pricing is based on vCPU-hours and GB-hours of the machine type you select. To manage costs:

- Use the smallest machine type that meets your needs
- Consider using the default pool for builds that do not need VPC access
- Set up multiple pools with different machine types for different workloads

## Wrapping Up

Private pools bridge the gap between Cloud Build's managed build infrastructure and your private network resources. The setup involves allocating IP ranges, creating a VPC peering connection, and creating the pool itself - about 30 minutes of work. Once configured, your builds can reach private databases, internal registries, and private GKE clusters without exposing those resources to the public internet. Use private pools when you need VPC access, and stick with the default pool for everything else to optimize costs.
