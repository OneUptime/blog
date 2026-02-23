# How to Use CDKTF with GCP Provider

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CDKTF, Google Cloud, GCP, Infrastructure as Code

Description: A practical guide to using CDKTF with the Google Cloud provider to build and manage GCP infrastructure using TypeScript and type-safe constructs.

---

Google Cloud Platform has a strong Terraform provider that covers compute, networking, storage, databases, Kubernetes, and more. Using CDKTF with the GCP provider means you can define all your Google Cloud resources in TypeScript (or Python, Go, Java, or C#) with full type safety and IDE support. This guide walks through setting up CDKTF for GCP and building practical infrastructure.

## Setting Up CDKTF for GCP

Create a new project and install the Google provider:

```bash
# Initialize the project
mkdir cdktf-gcp && cd cdktf-gcp
cdktf init --template=typescript --local

# Install the pre-built Google provider
npm install @cdktf/provider-google
```

Configure authentication. During development, use the gcloud CLI:

```bash
# Login to GCP
gcloud auth login

# Set application default credentials (used by Terraform)
gcloud auth application-default login

# Set your project
gcloud config set project your-project-id
```

For CI/CD, use a service account:

```bash
# Create a service account
gcloud iam service-accounts create cdktf-deployer \
  --display-name "CDKTF Deployer"

# Grant it the necessary roles
gcloud projects add-iam-policy-binding your-project-id \
  --member "serviceAccount:cdktf-deployer@your-project-id.iam.gserviceaccount.com" \
  --role "roles/editor"

# Create and download the key
gcloud iam service-accounts keys create key.json \
  --iam-account cdktf-deployer@your-project-id.iam.gserviceaccount.com

# Set the environment variable
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"
```

## Configuring the Google Provider

```typescript
import { Construct } from "constructs";
import { App, TerraformStack, TerraformOutput } from "cdktf";
import { GoogleProvider } from "@cdktf/provider-google/lib/provider";

class GcpStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Configure the Google provider
    new GoogleProvider(this, "google", {
      project: "your-project-id",
      region: "us-central1",
      zone: "us-central1-a",
    });
  }
}

const app = new App();
new GcpStack(app, "gcp-infra");
app.synth();
```

## Building a VPC Network

GCP networking uses VPC networks with subnets. Here is a complete setup:

```typescript
import { ComputeNetwork } from "@cdktf/provider-google/lib/compute-network";
import { ComputeSubnetwork } from "@cdktf/provider-google/lib/compute-subnetwork";
import { ComputeRouter } from "@cdktf/provider-google/lib/compute-router";
import { ComputeRouterNat } from "@cdktf/provider-google/lib/compute-router-nat";
import { ComputeFirewall } from "@cdktf/provider-google/lib/compute-firewall";

// Create a VPC network
// GCP VPCs are global, but subnets are regional
const network = new ComputeNetwork(this, "vpc", {
  name: "production-vpc",
  autoCreateSubnetworks: false,
  routingMode: "REGIONAL",
});

// Create a subnet in us-central1
const usSubnet = new ComputeSubnetwork(this, "us-subnet", {
  name: "us-central1-subnet",
  network: network.id,
  region: "us-central1",
  ipCidrRange: "10.0.1.0/24",
  privateIpGoogleAccess: true,
  // Secondary ranges for GKE pods and services
  secondaryIpRange: [
    {
      rangeName: "pods",
      ipCidrRange: "10.1.0.0/16",
    },
    {
      rangeName: "services",
      ipCidrRange: "10.2.0.0/20",
    },
  ],
});

// Create a Cloud Router for NAT
const router = new ComputeRouter(this, "router", {
  name: "production-router",
  network: network.id,
  region: "us-central1",
});

// Create Cloud NAT for outbound internet access from private instances
new ComputeRouterNat(this, "nat", {
  name: "production-nat",
  router: router.name,
  region: router.region,
  natIpAllocateOption: "AUTO_ONLY",
  sourceSubnetworkIpRangesToNat: "ALL_SUBNETWORKS_ALL_IP_RANGES",
  logConfig: {
    enable: true,
    filter: "ERRORS_ONLY",
  },
});

// Create firewall rules
new ComputeFirewall(this, "allow-http", {
  name: "allow-http",
  network: network.name,
  allow: [
    {
      protocol: "tcp",
      ports: ["80", "443"],
    },
  ],
  sourceRanges: ["0.0.0.0/0"],
  targetTags: ["web-server"],
});

// Allow internal traffic
new ComputeFirewall(this, "allow-internal", {
  name: "allow-internal",
  network: network.name,
  allow: [
    {
      protocol: "tcp",
      ports: ["0-65535"],
    },
    {
      protocol: "udp",
      ports: ["0-65535"],
    },
    {
      protocol: "icmp",
    },
  ],
  sourceRanges: ["10.0.0.0/8"],
});
```

## Creating Compute Engine Instances

```typescript
import { ComputeInstance } from "@cdktf/provider-google/lib/compute-instance";
import { ComputeAddress } from "@cdktf/provider-google/lib/compute-address";

// Reserve a static external IP
const staticIp = new ComputeAddress(this, "web-ip", {
  name: "web-server-ip",
  region: "us-central1",
});

// Create a Compute Engine instance
const webServer = new ComputeInstance(this, "web-server", {
  name: "web-server-01",
  machineType: "e2-medium",
  zone: "us-central1-a",
  tags: ["web-server"],
  bootDisk: {
    initializeParams: {
      image: "debian-cloud/debian-12",
      size: 50,
      type: "pd-ssd",
    },
  },
  networkInterface: [
    {
      network: network.id,
      subnetwork: usSubnet.id,
      accessConfig: [
        {
          natIp: staticIp.address,
        },
      ],
    },
  ],
  // Startup script to install nginx
  metadataStartupScript: `#!/bin/bash
    apt-get update
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
  `,
  serviceAccount: {
    scopes: ["cloud-platform"],
  },
  labels: {
    environment: "production",
    managed_by: "cdktf",
  },
});

// Output the public IP
new TerraformOutput(this, "web-server-ip-output", {
  value: staticIp.address,
});
```

## Setting Up Google Kubernetes Engine (GKE)

```typescript
import { ContainerCluster } from "@cdktf/provider-google/lib/container-cluster";
import { ContainerNodePool } from "@cdktf/provider-google/lib/container-node-pool";

// Create a GKE cluster
const cluster = new ContainerCluster(this, "gke", {
  name: "production-cluster",
  location: "us-central1",
  // Remove the default node pool and manage it separately
  removeDefaultNodePool: true,
  initialNodeCount: 1,
  network: network.name,
  subnetwork: usSubnet.name,
  ipAllocationPolicy: {
    clusterSecondaryRangeName: "pods",
    servicesSecondaryRangeName: "services",
  },
  // Enable Workload Identity
  workloadIdentityConfig: {
    workloadPool: "your-project-id.svc.id.goog",
  },
  // Network policy for pod-to-pod communication control
  networkPolicy: {
    enabled: true,
    provider: "CALICO",
  },
  // Enable binary authorization
  releaseChannel: {
    channel: "REGULAR",
  },
});

// Create a managed node pool
new ContainerNodePool(this, "primary-nodes", {
  name: "primary-pool",
  cluster: cluster.name,
  location: "us-central1",
  nodeCount: 3,
  autoscaling: {
    minNodeCount: 2,
    maxNodeCount: 10,
  },
  nodeConfig: {
    machineType: "e2-standard-4",
    diskSizeGb: 100,
    diskType: "pd-ssd",
    oauthScopes: [
      "https://www.googleapis.com/auth/cloud-platform",
    ],
    labels: {
      environment: "production",
    },
    // Enable workload identity on the node pool
    workloadMetadataConfig: {
      mode: "GKE_METADATA",
    },
  },
  management: {
    autoRepair: true,
    autoUpgrade: true,
  },
});
```

## Cloud SQL Database

```typescript
import { SqlDatabaseInstance } from "@cdktf/provider-google/lib/sql-database-instance";
import { SqlDatabase } from "@cdktf/provider-google/lib/sql-database";
import { SqlUser } from "@cdktf/provider-google/lib/sql-user";

// Create a Cloud SQL PostgreSQL instance
const sqlInstance = new SqlDatabaseInstance(this, "postgres", {
  name: "production-postgres",
  region: "us-central1",
  databaseVersion: "POSTGRES_15",
  deletionProtection: true,
  settings: {
    tier: "db-custom-4-16384",
    diskSize: 50,
    diskType: "PD_SSD",
    diskAutoresize: true,
    diskAutoresizeLimit: 200,
    availabilityType: "REGIONAL",
    backupConfiguration: {
      enabled: true,
      startTime: "03:00",
      pointInTimeRecoveryEnabled: true,
      backupRetentionSettings: {
        retainedBackups: 7,
      },
    },
    ipConfiguration: {
      ipv4Enabled: false,
      privateNetwork: network.id,
    },
    maintenanceWindow: {
      day: 7,
      hour: 4,
    },
  },
});

// Create a database
new SqlDatabase(this, "app-database", {
  name: "applicationdb",
  instance: sqlInstance.name,
});

// Create a user
new SqlUser(this, "app-user", {
  name: "appuser",
  instance: sqlInstance.name,
  password: "change-this-use-secret-manager",
});
```

## Cloud Storage Buckets

```typescript
import { StorageBucket } from "@cdktf/provider-google/lib/storage-bucket";
import { StorageBucketIamMember } from "@cdktf/provider-google/lib/storage-bucket-iam-member";

// Create a Cloud Storage bucket
const bucket = new StorageBucket(this, "data-bucket", {
  name: "production-data-bucket-unique-name",
  location: "US",
  storageClass: "STANDARD",
  uniformBucketLevelAccess: true,
  versioning: {
    enabled: true,
  },
  lifecycleRule: [
    {
      action: {
        type: "SetStorageClass",
        storageClass: "NEARLINE",
      },
      condition: {
        age: 30,
      },
    },
    {
      action: {
        type: "SetStorageClass",
        storageClass: "COLDLINE",
      },
      condition: {
        age: 90,
      },
    },
  ],
  labels: {
    environment: "production",
  },
});

// Grant a service account access to the bucket
new StorageBucketIamMember(this, "bucket-access", {
  bucket: bucket.name,
  role: "roles/storage.objectViewer",
  member: "serviceAccount:my-app@your-project-id.iam.gserviceaccount.com",
});
```

## Deploying Your GCP Infrastructure

```bash
# Generate the Terraform JSON
cdktf synth

# Preview changes
cdktf diff

# Deploy
cdktf deploy

# View outputs
cdktf output
```

## Tips for GCP with CDKTF

1. **Enable required APIs first**. GCP requires you to enable APIs before using them. Either do this manually or use the `GoogleProjectService` resource.

2. **Use Workload Identity** for GKE instead of service account keys.

3. **Set deletion protection** on production databases and critical resources.

4. **Use uniform bucket-level access** on Cloud Storage for simpler IAM management.

5. **Take advantage of labels**. GCP labels are useful for cost tracking and resource organization.

The CDKTF GCP provider gives you type-safe access to the full Google Cloud resource catalog. For more on CDKTF architecture patterns, see our guide on [CDKTF stacks for deployment units](https://oneuptime.com/blog/post/2026-02-23-how-to-use-cdktf-stacks-for-deployment-units/view).
