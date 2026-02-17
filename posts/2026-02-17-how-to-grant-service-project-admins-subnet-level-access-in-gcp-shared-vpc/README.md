# How to Grant Service Project Admins Subnet-Level Access in GCP Shared VPC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Shared VPC, IAM, Subnet Access, Networking

Description: Learn how to grant fine-grained subnet-level access to service project administrators in GCP Shared VPC using IAM conditions and best practices for least privilege.

---

When you set up Shared VPC in GCP, one of the critical decisions is how to grant service project admins access to specific subnets in the host project. The naive approach - granting `roles/compute.networkUser` at the project level - gives them access to every subnet. That works for small organizations, but as you scale, you want each team to only see and use the subnets allocated to them.

In this post, I will show you how to implement subnet-level access control for service project admins, including IAM conditions, service account permissions for GKE, and common patterns for managing this at scale.

## The Access Control Problem

Consider an organization with three teams sharing a VPC:

- **Web team**: Should only use subnets in us-central1
- **Data team**: Should only use subnets in us-east1
- **Platform team**: Needs access to all subnets

If you grant everyone `roles/compute.networkUser` at the host project level, any team can deploy resources into any subnet. That defeats the purpose of having separate subnets for different teams.

## Subnet-Level IAM Bindings

The cleanest approach is to grant `roles/compute.networkUser` at the individual subnet level:

```bash
# Grant the web team access to only the web subnet
gcloud compute networks subnets add-iam-policy-binding web-subnet \
  --project=host-project \
  --region=us-central1 \
  --member="group:web-team@mycompany.com" \
  --role="roles/compute.networkUser"
```

```bash
# Grant the data team access to only the data subnet
gcloud compute networks subnets add-iam-policy-binding data-subnet \
  --project=host-project \
  --region=us-east1 \
  --member="group:data-team@mycompany.com" \
  --role="roles/compute.networkUser"
```

```bash
# Grant the platform team access to all subnets (at project level)
gcloud projects add-iam-policy-binding host-project \
  --member="group:platform-team@mycompany.com" \
  --role="roles/compute.networkUser"
```

When you bind the role at the subnet level, the team can only create resources in that specific subnet. They cannot even see other subnets in the list when deploying VMs through the Console.

## Using IAM Conditions for Flexible Access

IAM conditions let you add more sophisticated access rules. For example, granting access to multiple subnets with a naming pattern:

```bash
# Grant access to all subnets starting with "web-" using IAM conditions
gcloud projects add-iam-policy-binding host-project \
  --member="group:web-team@mycompany.com" \
  --role="roles/compute.networkUser" \
  --condition='expression=resource.name.contains("/subnetworks/web-"),title=web-subnets-only,description=Access to web team subnets only'
```

You can also restrict access by region:

```bash
# Grant access to all subnets in us-central1 only
gcloud projects add-iam-policy-binding host-project \
  --member="group:web-team@mycompany.com" \
  --role="roles/compute.networkUser" \
  --condition='expression=resource.name.contains("/regions/us-central1/"),title=us-central1-subnets-only'
```

## Service Account Permissions for GKE

GKE clusters require special attention in Shared VPC. Beyond granting `roles/compute.networkUser` to the users who create clusters, you also need to grant roles to GKE's service accounts.

Each GKE cluster uses two service accounts that need host project permissions:

1. **Google Kubernetes Engine Service Agent**: `service-PROJECT_NUMBER@container-engine-robot.iam.gserviceaccount.com`
2. **Google APIs Service Agent**: `PROJECT_NUMBER@cloudservices.gserviceaccount.com`

```bash
# First, get the project number for the service project
PROJECT_NUMBER=$(gcloud projects describe service-project-a --format='value(projectNumber)')

# Grant the GKE service agent the Host Service Agent User role
gcloud projects add-iam-policy-binding host-project \
  --member="serviceAccount:service-${PROJECT_NUMBER}@container-engine-robot.iam.gserviceaccount.com" \
  --role="roles/container.hostServiceAgentUser"

# Grant the Google APIs service agent networkUser at the subnet level
gcloud compute networks subnets add-iam-policy-binding web-subnet \
  --project=host-project \
  --region=us-central1 \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudservices.gserviceaccount.com" \
  --role="roles/compute.networkUser"
```

If you forget these service account bindings, GKE cluster creation will fail with a permission error that can be hard to diagnose.

## Permissions for Internal Load Balancers

Service project teams that create internal load balancers also need the `roles/compute.networkUser` role. The load balancer's forwarding rule consumes an IP from the shared subnet:

```bash
# Grant the service account used by the service project's load balancers
gcloud compute networks subnets add-iam-policy-binding web-subnet \
  --project=host-project \
  --region=us-central1 \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudservices.gserviceaccount.com" \
  --role="roles/compute.networkUser"
```

## Viewing Current Access Bindings

Audit who has access to each subnet:

```bash
# View IAM policy for a specific subnet
gcloud compute networks subnets get-iam-policy web-subnet \
  --project=host-project \
  --region=us-central1 \
  --format=yaml
```

To get a broader view across all subnets:

```bash
# List all subnets and their IAM bindings
for subnet in $(gcloud compute networks subnets list \
  --project=host-project \
  --network=shared-vpc \
  --format="value(name,region)" | tr '\t' ','); do
    name=$(echo $subnet | cut -d',' -f1)
    region=$(echo $subnet | cut -d',' -f2)
    echo "=== $name ($region) ==="
    gcloud compute networks subnets get-iam-policy $name \
      --project=host-project \
      --region=$region \
      --format="table(bindings.role, bindings.members)" 2>/dev/null
done
```

## Managing Access with Terraform

For organizations managing many subnets and teams, Terraform makes this much more maintainable:

```hcl
# Define subnet-level IAM bindings in Terraform
# This makes access auditable and version-controlled
resource "google_compute_subnetwork_iam_binding" "web_team_access" {
  project    = "host-project"
  region     = "us-central1"
  subnetwork = "web-subnet"
  role       = "roles/compute.networkUser"

  members = [
    "group:web-team@mycompany.com",
    "serviceAccount:12345@cloudservices.gserviceaccount.com",
  ]
}

resource "google_compute_subnetwork_iam_binding" "data_team_access" {
  project    = "host-project"
  region     = "us-east1"
  subnetwork = "data-subnet"
  role       = "roles/compute.networkUser"

  members = [
    "group:data-team@mycompany.com",
    "serviceAccount:67890@cloudservices.gserviceaccount.com",
  ]
}
```

## Common Mistakes

Here are pitfalls I have seen teams run into:

1. **Forgetting GKE service account bindings**: Granting `networkUser` to the human users but forgetting the GKE robot service account. The cluster creation fails with a cryptic permissions error.

2. **Using `iam-policy-binding set` instead of `add`**: The `set-iam-policy` command replaces the entire policy. One team can accidentally remove another team's access. Always use `add-iam-policy-binding`.

3. **Not granting access to secondary ranges**: For GKE, the service accounts need access to the subnet that contains the secondary ranges (pod and service ranges). Since secondary ranges are part of the subnet, granting access to the subnet automatically includes the secondary ranges.

4. **Granting too broad access during troubleshooting**: When something breaks, teams often grant project-level `networkUser` to "just get it working." Then they forget to scope it back down. Use subnet-level bindings from the start to avoid this drift.

5. **Not using groups**: Binding roles to individual user emails instead of groups. When someone joins or leaves the team, you have to update every IAM binding individually.

## Revoking Access

To remove a team's access to a subnet:

```bash
# Remove the web team's access to a subnet
gcloud compute networks subnets remove-iam-policy-binding web-subnet \
  --project=host-project \
  --region=us-central1 \
  --member="group:web-team@mycompany.com" \
  --role="roles/compute.networkUser"
```

Before revoking access, check that no active resources in the service project are using that subnet. Revoking access does not delete existing resources, but it prevents creating new ones.

## Wrapping Up

Subnet-level IAM is the right way to manage access in Shared VPC. It follows the principle of least privilege and prevents teams from accidentally deploying into the wrong subnet. The initial setup takes more effort than project-level bindings, but it pays off as your organization grows. Use Google Groups for team-based access, remember to include service account bindings for GKE and load balancers, and manage everything through Terraform or another IaC tool so your access policies are version-controlled and auditable.
