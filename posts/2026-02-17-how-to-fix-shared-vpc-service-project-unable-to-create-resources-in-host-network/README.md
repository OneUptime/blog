# How to Fix Shared VPC Service Project Unable to Create Resources in Host Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Shared VPC, Networking, IAM, Google Cloud

Description: Learn how to fix the common issue where a service project in Google Cloud Shared VPC cannot create resources like VMs or load balancers in the host project network.

---

If you have ever set up a Shared VPC in Google Cloud, you probably know the pain of getting a service project to actually use the host network. You configure everything according to the docs, try to create a VM in a shared subnet, and get hit with a permissions error. This post walks through the most common causes and how to fix each one.

## Understanding Shared VPC Architecture

Shared VPC lets you connect multiple projects to a common VPC network. The project that owns the network is called the host project, and the projects that consume it are called service projects. This setup is great for centralized network management, but it introduces a layer of IAM complexity that trips people up regularly.

When a service project tries to create a resource - say, a Compute Engine instance - in a subnet belonging to the host project, the service account performing the creation needs specific permissions on that subnet. This is where things usually break.

## Common Error Messages

You might see errors like:

```
Required 'compute.subnetworks.use' permission for 'projects/host-project/regions/us-central1/subnetworks/shared-subnet'
```

Or sometimes:

```
The resource 'projects/host-project/regions/us-central1/subnetworks/shared-subnet' was not found
```

The second one is particularly confusing because the subnet clearly exists. What is actually happening is that the caller does not have permission to even see it.

## Step 1: Verify the Service Project is Properly Attached

First, make sure your service project is actually attached to the host project. This is a basic check, but it is worth confirming.

The following command lists all service projects associated with a host project:

```bash
# List all service projects attached to the host project
gcloud compute shared-vpc associated-projects list \
    --project=host-project-id
```

If your service project is not in the list, attach it:

```bash
# Attach the service project to the host project
gcloud compute shared-vpc associated-projects add service-project-id \
    --host-project=host-project-id
```

You need the `compute.organizations.enableXpnResource` permission or the Shared VPC Admin role at the organization or folder level to do this.

## Step 2: Grant the Correct Subnet-Level Permissions

This is the most common fix. The service project's service accounts need the `compute.networkUser` role on either the entire host project or on specific subnets. Granting it at the subnet level is more secure and follows the principle of least privilege.

Here is how to grant it at the subnet level:

```bash
# Grant the Compute Network User role on a specific subnet
gcloud compute networks subnets add-iam-policy-binding shared-subnet \
    --project=host-project-id \
    --region=us-central1 \
    --member='serviceAccount:service-project-number@cloudservices.gserviceaccount.com' \
    --role='roles/compute.networkUser'
```

Notice the service account format. You need to use the Google APIs service account, which follows the pattern `PROJECT_NUMBER@cloudservices.gserviceaccount.com`. This is not the default Compute Engine service account - it is a different one that Google Cloud uses internally to manage resources on your behalf.

## Step 3: Grant Permissions to the Correct Service Accounts

This is where most people get confused. Depending on what you are creating, you might need to grant permissions to different service accounts:

For Compute Engine VMs, grant the role to:
- `PROJECT_NUMBER@cloudservices.gserviceaccount.com` (Google APIs service account)

For GKE clusters, you also need to grant the role to:
- `service-PROJECT_NUMBER@container-engine-robot.iam.gserviceaccount.com` (GKE service agent)

For internal load balancers, grant the role to:
- `PROJECT_NUMBER@cloudservices.gserviceaccount.com`

Here is an example granting the GKE service agent access:

```bash
# Grant network user role to the GKE service agent for the service project
gcloud compute networks subnets add-iam-policy-binding shared-subnet \
    --project=host-project-id \
    --region=us-central1 \
    --member='serviceAccount:service-123456789@container-engine-robot.iam.gserviceaccount.com' \
    --role='roles/compute.networkUser'
```

## Step 4: Check for Organization Policy Constraints

Sometimes the IAM is correct but an organization policy is blocking resource creation. Check for these constraints:

```bash
# Check for constraints that might restrict Shared VPC usage
gcloud resource-manager org-policies describe \
    constraints/compute.restrictSharedVpcSubnetworks \
    --project=service-project-id
```

The `compute.restrictSharedVpcSubnetworks` constraint can limit which subnets a service project is allowed to use. If this constraint is active, make sure the subnet you are targeting is in the allowed list.

Another constraint to check is `compute.restrictSharedVpcHostProjects`, which limits which host projects a service project can connect to.

## Step 5: Verify Network and Subnet Visibility

From the service project, try listing available subnets:

```bash
# List subnets available to the service project from the host project
gcloud compute networks subnets list-usable \
    --project=service-project-id
```

This command shows subnets that the current caller can actually use. If the subnet you need does not show up here, there is a permissions problem somewhere in the chain.

## Step 6: Check for IP Range Exhaustion

If permissions look correct but resource creation still fails, the subnet might be out of IP addresses. This happens more often than you would think, especially with GKE clusters that consume IP ranges quickly.

```bash
# Check the IP utilization of a subnet
gcloud compute networks subnets describe shared-subnet \
    --project=host-project-id \
    --region=us-central1 \
    --format="json(ipCidrRange, secondaryIpRanges, purpose)"
```

If the CIDR range is small and you have many resources, consider expanding the subnet or creating a new one.

## Step 7: Terraform-Specific Considerations

If you are using Terraform to manage your Shared VPC setup, make sure the `google_compute_shared_vpc_service_project` resource is created before any resources that depend on it. Also, the IAM bindings need to be in place before resource creation.

Here is a typical Terraform snippet for the IAM binding:

```hcl
# Grant compute.networkUser on the shared subnet to the service project
resource "google_compute_subnetwork_iam_member" "service_project_network_user" {
  project    = var.host_project_id
  region     = "us-central1"
  subnetwork = "shared-subnet"
  role       = "roles/compute.networkUser"
  member     = "serviceAccount:${var.service_project_number}@cloudservices.gserviceaccount.com"
}
```

Add a `depends_on` to your compute resources referencing this IAM binding to avoid race conditions during `terraform apply`.

## Debugging Checklist

When you are stuck, run through this list:

1. Is the service project attached to the host project?
2. Does the Google APIs service account have `compute.networkUser` on the target subnet?
3. If using GKE, does the GKE service agent also have that role?
4. Are there org policies restricting subnet usage?
5. Does `subnets list-usable` show the target subnet?
6. Is there IP space available in the subnet?
7. Are you targeting the correct region?

Most Shared VPC permission issues come down to granting the wrong service account the right role, or the right service account the wrong role. Double-check the project number (not the project ID) and the service account suffix, and you should be able to sort it out.

## Monitoring with OneUptime

Once your Shared VPC is working, consider setting up monitoring with [OneUptime](https://oneuptime.com) to track network connectivity between your service projects and host network. This can help you catch issues before they affect production workloads.
