# How to Migrate from Google Deployment Manager to Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Google Deployment Manager, Migration, Infrastructure as Code

Description: Learn how to migrate your Google Cloud Deployment Manager configurations to Terraform with resource mapping, import strategies, and safe transition steps.

---

Google Cloud Deployment Manager is Google's native infrastructure as code service, but many teams are moving to Terraform for its multi-cloud support, richer module ecosystem, and more expressive configuration language. Migrating from Deployment Manager to Terraform requires transferring resource ownership carefully to avoid disrupting running infrastructure. This guide provides a complete migration path.

## Why Migrate from Deployment Manager to Terraform

Deployment Manager uses YAML or Python/Jinja2 templates, which can become complex for large deployments. Terraform offers HCL, a purpose-built configuration language with better readability. Terraform also has broader provider coverage, an extensive module registry, and active community development. Google itself has invested significantly in the Terraform Google provider, making it a well-supported option for GCP infrastructure.

## Understanding Deployment Manager Resource Ownership

Deployment Manager deployments own their resources. Deleting a deployment by default deletes all the resources within it. This is similar to CloudFormation and means you need a careful strategy to transfer resources to Terraform without deleting them.

Deployment Manager supports an "abandon" policy that removes resources from the deployment without deleting them. This is the key mechanism for safe migration.

## Step 1: Inventory Your Deployments

List all deployments and their resources:

```bash
# List all deployments
gcloud deployment-manager deployments list

# List resources in a deployment
gcloud deployment-manager deployments describe my-deployment \
  --format='table(resources.name, resources.type, resources.id)'

# Export the deployment configuration
gcloud deployment-manager deployments describe my-deployment \
  --format=yaml > deployment-config.yaml

# Get the expanded configuration (with all templates resolved)
gcloud deployment-manager manifests describe \
  --deployment=my-deployment \
  --format='value(expandedConfig)' > expanded-config.yaml
```

## Step 2: Map Deployment Manager Types to Terraform

Create a mapping between Deployment Manager resource types and Terraform:

```text
Deployment Manager Type                    Terraform Resource
-----------------------                    ------------------
compute.v1.instance                    ->  google_compute_instance
compute.v1.network                     ->  google_compute_network
compute.v1.subnetwork                  ->  google_compute_subnetwork
compute.v1.firewall                    ->  google_compute_firewall
compute.v1.disk                        ->  google_compute_disk
sqladmin.v1beta4.instance              ->  google_sql_database_instance
storage.v1.bucket                      ->  google_storage_bucket
dns.v1.managedZone                     ->  google_dns_managed_zone
container.v1.cluster                   ->  google_container_cluster
iam.v1.serviceAccount                  ->  google_service_account
```

## Step 3: Write Terraform Configuration

Convert your Deployment Manager YAML to Terraform HCL:

Deployment Manager YAML:

```yaml
resources:
  - name: my-network
    type: compute.v1.network
    properties:
      autoCreateSubnetworks: false

  - name: my-subnet
    type: compute.v1.subnetwork
    properties:
      network: $(ref.my-network.selfLink)
      ipCidrRange: 10.0.1.0/24
      region: us-central1

  - name: my-instance
    type: compute.v1.instance
    properties:
      zone: us-central1-a
      machineType: zones/us-central1-a/machineTypes/e2-medium
      disks:
        - boot: true
          autoDelete: true
          initializeParams:
            sourceImage: projects/debian-cloud/global/images/family/debian-11
      networkInterfaces:
        - subnetwork: $(ref.my-subnet.selfLink)
```

Terraform equivalent:

```hcl
# Provider configuration
provider "google" {
  project = var.project_id
  region  = "us-central1"
}

# Network
resource "google_compute_network" "main" {
  name                    = "my-network"
  auto_create_subnetworks = false
}

# Subnet
resource "google_compute_subnetwork" "main" {
  name          = "my-subnet"
  network       = google_compute_network.main.id
  ip_cidr_range = "10.0.1.0/24"
  region        = "us-central1"
}

# Instance
resource "google_compute_instance" "main" {
  name         = "my-instance"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

  boot_disk {
    auto_delete = true
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.main.id
  }
}
```

## Step 4: Import Resources into Terraform

Create import blocks for all resources:

```hcl
# imports.tf
import {
  to = google_compute_network.main
  id = "projects/my-project/global/networks/my-network"
}

import {
  to = google_compute_subnetwork.main
  id = "projects/my-project/regions/us-central1/subnetworks/my-subnet"
}

import {
  to = google_compute_instance.main
  id = "projects/my-project/zones/us-central1-a/instances/my-instance"
}
```

Find the correct import IDs using gcloud:

```bash
# Get self links for resources
gcloud compute networks describe my-network --format='value(selfLink)'
gcloud compute instances describe my-instance --zone=us-central1-a --format='value(selfLink)'
```

Execute the import:

```bash
terraform init
terraform plan
terraform apply
```

## Step 5: Verify the Import

Ensure Terraform matches the actual infrastructure:

```bash
# Verify no changes are planned
terraform plan

# Compare specific resources
terraform state show google_compute_instance.main
gcloud compute instances describe my-instance --zone=us-central1-a
```

## Step 6: Abandon Resources from Deployment Manager

After Terraform successfully manages the resources, remove them from Deployment Manager using the abandon policy:

```bash
# Delete the deployment with abandon policy
# This removes the deployment but keeps all resources
gcloud deployment-manager deployments delete my-deployment \
  --delete-policy=ABANDON

# Confirm the resources still exist
gcloud compute instances describe my-instance --zone=us-central1-a
```

The `--delete-policy=ABANDON` flag is critical. Without it, Deployment Manager would delete all resources.

## Step 7: Final Verification

After abandoning the deployment, verify everything works:

```bash
# Verify Terraform still manages the resources
terraform plan
# Should show: No changes.

# Verify resources are running
gcloud compute instances list --filter="name=my-instance"
```

## Handling Deployment Manager Templates (Jinja2/Python)

If your Deployment Manager configurations use Jinja2 or Python templates, you need to understand the logic they contain before converting:

```python
# Deployment Manager Python template
def GenerateConfig(context):
    resources = []
    for i in range(context.properties['instance_count']):
        resources.append({
            'name': f'instance-{i}',
            'type': 'compute.v1.instance',
            'properties': {
                'zone': context.properties['zone'],
                'machineType': f'zones/{context.properties["zone"]}/machineTypes/{context.properties["machine_type"]}',
            }
        })
    return {'resources': resources}
```

Terraform equivalent using count:

```hcl
variable "instance_count" {
  default = 3
}

variable "zone" {
  default = "us-central1-a"
}

variable "machine_type" {
  default = "e2-medium"
}

resource "google_compute_instance" "server" {
  count        = var.instance_count
  name         = "instance-${count.index}"
  machine_type = var.machine_type
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
  }
}
```

## Automating the Migration

For deployments with many resources, automate discovery and import generation:

```bash
#!/bin/bash
# dm-to-terraform.sh
# Generate Terraform imports from a Deployment Manager deployment

DEPLOYMENT=$1
PROJECT=$(gcloud config get-value project)

echo "# Import blocks for deployment: $DEPLOYMENT"

# Get resources from the deployment
gcloud deployment-manager resources list \
  --deployment="$DEPLOYMENT" \
  --format='csv[no-heading](name,type)' | while IFS=',' read -r name type; do

  case "$type" in
    "compute.v1.instance")
      ZONE=$(gcloud compute instances list --filter="name=$name" --format='value(zone)')
      echo "import {"
      echo "  to = google_compute_instance.${name//-/_}"
      echo "  id = \"projects/$PROJECT/zones/$ZONE/instances/$name\""
      echo "}"
      echo ""
      ;;
    "compute.v1.network")
      echo "import {"
      echo "  to = google_compute_network.${name//-/_}"
      echo "  id = \"projects/$PROJECT/global/networks/$name\""
      echo "}"
      echo ""
      ;;
    "storage.v1.bucket")
      echo "import {"
      echo "  to = google_storage_bucket.${name//-/_}"
      echo "  id = \"$name\""
      echo "}"
      echo ""
      ;;
    *)
      echo "# Unsupported type: $type for resource: $name"
      ;;
  esac
done
```

## Best Practices

Migrate one deployment at a time. Always use `--delete-policy=ABANDON` when removing deployments. Test the complete migration workflow in a non-production project first. Keep Deployment Manager configurations in version control alongside Terraform code during the transition. Verify every import with `terraform plan` before moving to the next deployment. Document the mapping between Deployment Manager resource names and Terraform resource addresses.

## Conclusion

Migrating from Google Deployment Manager to Terraform follows a clear pattern: write equivalent configuration, import existing resources, verify, and then abandon the deployment. The `--delete-policy=ABANDON` flag makes this a safe operation. With the Google Terraform provider's comprehensive resource support, most Deployment Manager configurations translate directly to Terraform HCL. Take a methodical approach, and you will have your GCP infrastructure fully managed by Terraform.

For related guides, see [How to Use the GCP Config Connector with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-the-gcp-config-connector-with-terraform/view) and [How to Use Terraformer to Auto-Generate Terraform from Cloud](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraformer-to-auto-generate-terraform-from-cloud/view).
