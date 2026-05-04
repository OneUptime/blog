# How to Configure Shared VPC for IPv4 Networking in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Shared VPC, IPv4, Networking, Organization, Multi-Project

Description: Configure GCP Shared VPC to allow multiple service projects to use subnets from a centrally managed host project, enabling consistent IPv4 networking across teams.

## Introduction

Shared VPC allows an organization to designate a host project that owns the VPC network and subnets. Service projects can then use those subnets to deploy their workloads. This enables centralized network management while giving teams autonomy over their compute resources.

## Architecture

```text
Organization
├── Host Project (network-host-project)
│   └── prod-vpc
│       ├── web-subnet (10.1.1.0/24)
│       ├── app-subnet (10.1.2.0/24)
│       └── db-subnet  (10.1.3.0/24)
├── Service Project A (team-alpha-project)
│   └── VMs using web-subnet and app-subnet
└── Service Project B (team-beta-project)
    └── VMs using app-subnet
```

## Step 1: Enable the Host Project

Requires `roles/compute.xpnAdmin` at the organization level:

```bash
ORG_ID="123456789"
HOST_PROJECT="network-host-project"

gcloud compute shared-vpc enable $HOST_PROJECT
```

Or using resource management:

```bash
gcloud beta resource-manager org-policies set-policy \
  --organization=$ORG_ID <(cat << 'EOF'
constraint: constraints/compute.restrictSharedVpcHostProjects
listPolicy:
  allowedValues:
    - projects/network-host-project
EOF
)
```

## Step 2: Attach Service Projects to the Host Project

```bash
SERVICE_PROJECT_A="team-alpha-project"
SERVICE_PROJECT_B="team-beta-project"

# Attach service projects

gcloud compute shared-vpc associated-projects add $HOST_PROJECT \
  --associated-project=$SERVICE_PROJECT_A

gcloud compute shared-vpc associated-projects add $HOST_PROJECT \
  --associated-project=$SERVICE_PROJECT_B
```

## Step 3: Grant IAM Permissions on Subnets

Service project's service accounts and users need permission to use host project subnets:

```bash
# Grant Compute Network User role on specific subnets
gcloud compute networks subnets add-iam-policy-binding web-subnet \
  --project=$HOST_PROJECT \
  --region=us-central1 \
  --member="serviceAccount:$(gcloud projects describe $SERVICE_PROJECT_A --format='get(projectNumber)')@cloudservices.gserviceaccount.com" \
  --role="roles/compute.networkUser"

# Grant to a user/group
gcloud compute networks subnets add-iam-policy-binding app-subnet \
  --project=$HOST_PROJECT \
  --region=us-central1 \
  --member="group:team-alpha@example.com" \
  --role="roles/compute.networkUser"
```

## Step 4: Create VMs in Service Projects Using Host Subnets

```bash
# Get the full subnet resource URI
SUBNET_URI="projects/$HOST_PROJECT/regions/us-central1/subnetworks/web-subnet"

# Create a VM in service project A using the shared subnet
gcloud compute instances create web-vm-01 \
  --project=$SERVICE_PROJECT_A \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --subnet=$SUBNET_URI \
  --no-address  # Private IP only
```

## Viewing Shared VPC Configuration

```bash
# Check if a project is a host
gcloud compute shared-vpc get-host-project $SERVICE_PROJECT_A

# List attached service projects
gcloud compute shared-vpc associated-projects list $HOST_PROJECT

# List subnets available in a shared VPC from service project
gcloud compute networks subnets list-usable \
  --project=$SERVICE_PROJECT_A
```

## Disassociating a Service Project

```bash
gcloud compute shared-vpc associated-projects remove $HOST_PROJECT \
  --associated-project=$SERVICE_PROJECT_A
```

## Conclusion

Shared VPC centralizes network management in a host project while service projects deploy workloads. Grant `roles/compute.networkUser` on specific subnets for least-privilege access. Use `gcloud compute networks subnets list-usable` from a service project to see available shared subnets. This model separates network ownership from workload ownership across teams.
