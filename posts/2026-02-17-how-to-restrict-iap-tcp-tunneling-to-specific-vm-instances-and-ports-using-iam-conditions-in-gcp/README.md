# How to Restrict IAP TCP Tunneling to Specific VM Instances and Ports Using IAM Conditions in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IAP, TCP Tunneling, IAM Conditions, SSH, Access Control

Description: Learn how to use IAM conditions to restrict Identity-Aware Proxy TCP tunneling access to specific virtual machine instances and ports in Google Cloud Platform.

---

Granting the `iap.tunnelResourceAccessor` role at the project level gives a user IAP tunnel access to every VM in the project on every port. That is way too broad for most production environments. A database administrator should not have SSH access to application servers, and a developer should not be able to tunnel to the database port on production machines.

IAM conditions let you scope IAP tunnel access to specific VM instances, specific zones, and specific ports. This post shows you how to set up these fine-grained controls.

## The Problem with Broad Tunnel Access

Without conditions, a single IAM binding gives unrestricted tunnel access:

```bash
# This grants tunnel access to ALL VMs on ALL ports - too broad
gcloud projects add-iam-policy-binding my-project-id \
    --member="user:developer@company.com" \
    --role="roles/iap.tunnelResourceAccessor"
```

A user with this binding can SSH into any VM, tunnel to any database port, access any internal service - essentially having a skeleton key to your entire infrastructure.

## Restricting to Specific VM Instances

You can bind the tunnel role at the instance level instead of the project level.

```bash
# Grant tunnel access to only a specific VM
gcloud compute instances add-iam-policy-binding web-server-01 \
    --zone=us-central1-a \
    --member="user:developer@company.com" \
    --role="roles/iap.tunnelResourceAccessor" \
    --project=my-project-id
```

The user can now only tunnel to `web-server-01` and no other VM. But this still allows access on any port. Let us tighten that too.

## Restricting to Specific Ports

Use IAM conditions to limit which destination ports a user can tunnel to.

```bash
# Grant tunnel access to a specific VM on port 22 (SSH) only
gcloud compute instances add-iam-policy-binding web-server-01 \
    --zone=us-central1-a \
    --member="user:developer@company.com" \
    --role="roles/iap.tunnelResourceAccessor" \
    --condition="expression=destination.port == 22,title=ssh-only,description=Allow SSH tunnel only" \
    --project=my-project-id
```

Now the user can SSH into `web-server-01` but cannot tunnel to any other port on that machine.

## Common Port Restriction Patterns

### SSH Only (Port 22)

```bash
# Allow only SSH tunneling
gcloud compute instances add-iam-policy-binding my-vm \
    --zone=us-central1-a \
    --member="group:developers@company.com" \
    --role="roles/iap.tunnelResourceAccessor" \
    --condition="expression=destination.port == 22,title=ssh-only" \
    --project=my-project-id
```

### Database Access Only (Port 5432 for PostgreSQL)

```bash
# Allow only PostgreSQL tunneling for DBAs
gcloud compute instances add-iam-policy-binding db-server-01 \
    --zone=us-central1-a \
    --member="group:database-admins@company.com" \
    --role="roles/iap.tunnelResourceAccessor" \
    --condition="expression=destination.port == 5432,title=postgres-only,description=Allow PostgreSQL tunnel only" \
    --project=my-project-id
```

### Multiple Ports

Use the `||` operator to allow multiple ports.

```bash
# Allow SSH and RDP (for Windows VMs)
gcloud compute instances add-iam-policy-binding windows-server \
    --zone=us-central1-a \
    --member="group:ops-team@company.com" \
    --role="roles/iap.tunnelResourceAccessor" \
    --condition="expression=destination.port == 22 || destination.port == 3389,title=ssh-and-rdp" \
    --project=my-project-id
```

### Port Range

For a range of ports, use comparison operators.

```bash
# Allow tunneling to ports 8080-8090 (application ports)
gcloud compute instances add-iam-policy-binding app-server \
    --zone=us-central1-a \
    --member="group:developers@company.com" \
    --role="roles/iap.tunnelResourceAccessor" \
    --condition="expression=destination.port >= 8080 && destination.port <= 8090,title=app-ports" \
    --project=my-project-id
```

## Project-Level Bindings with Conditions

You can also apply conditions at the project level. This is useful when you want to give someone SSH access to all VMs but restrict the port.

```bash
# Allow SSH to all VMs in the project, but only on port 22
gcloud projects add-iam-policy-binding my-project-id \
    --member="group:developers@company.com" \
    --role="roles/iap.tunnelResourceAccessor" \
    --condition="expression=destination.port == 22,title=project-wide-ssh-only"
```

## Combining Instance and Port Restrictions

For the tightest control, apply bindings at the instance level with port conditions. Here is a practical example for a team managing a multi-tier application.

```bash
# Frontend developers: SSH access to web servers only
gcloud compute instances add-iam-policy-binding web-server-01 \
    --zone=us-central1-a \
    --member="group:frontend-devs@company.com" \
    --role="roles/iap.tunnelResourceAccessor" \
    --condition="expression=destination.port == 22,title=ssh-only" \
    --project=my-project-id

# Backend developers: SSH to app servers and tunnel to debug port
gcloud compute instances add-iam-policy-binding app-server-01 \
    --zone=us-central1-a \
    --member="group:backend-devs@company.com" \
    --role="roles/iap.tunnelResourceAccessor" \
    --condition="expression=destination.port == 22 || destination.port == 5005,title=ssh-and-debug" \
    --project=my-project-id

# DBAs: Database port access on DB server, no SSH
gcloud compute instances add-iam-policy-binding db-server-01 \
    --zone=us-central1-a \
    --member="group:database-admins@company.com" \
    --role="roles/iap.tunnelResourceAccessor" \
    --condition="expression=destination.port == 5432,title=postgres-only" \
    --project=my-project-id
```

## Terraform Configuration

Here is the Terraform approach for managing these bindings as code.

```hcl
# Frontend developers - SSH to web servers only
resource "google_compute_instance_iam_member" "frontend_ssh" {
  project       = var.project_id
  zone          = "us-central1-a"
  instance_name = google_compute_instance.web_server.name
  role          = "roles/iap.tunnelResourceAccessor"
  member        = "group:frontend-devs@company.com"

  condition {
    title       = "ssh-only"
    description = "Allow SSH tunnel only"
    expression  = "destination.port == 22"
  }
}

# Backend developers - SSH and debug port on app servers
resource "google_compute_instance_iam_member" "backend_ssh_debug" {
  project       = var.project_id
  zone          = "us-central1-a"
  instance_name = google_compute_instance.app_server.name
  role          = "roles/iap.tunnelResourceAccessor"
  member        = "group:backend-devs@company.com"

  condition {
    title       = "ssh-and-debug"
    description = "Allow SSH and remote debug port"
    expression  = "destination.port == 22 || destination.port == 5005"
  }
}

# DBAs - PostgreSQL port on database server only
resource "google_compute_instance_iam_member" "dba_postgres" {
  project       = var.project_id
  zone          = "us-central1-a"
  instance_name = google_compute_instance.db_server.name
  role          = "roles/iap.tunnelResourceAccessor"
  member        = "group:database-admins@company.com"

  condition {
    title       = "postgres-only"
    description = "Allow PostgreSQL tunnel only"
    expression  = "destination.port == 5432"
  }
}
```

## Viewing Current Tunnel IAM Bindings

To audit who has tunnel access and what conditions apply.

```bash
# View IAM bindings on a specific instance
gcloud compute instances get-iam-policy web-server-01 \
    --zone=us-central1-a \
    --project=my-project-id \
    --format=json
```

The output includes all bindings with their conditions, letting you verify the configuration.

## Removing Conditional Bindings

When removing a conditional binding, you must specify the exact condition. Otherwise, the removal will fail or remove the wrong binding.

```bash
# Remove a conditional tunnel binding
gcloud compute instances remove-iam-policy-binding web-server-01 \
    --zone=us-central1-a \
    --member="group:frontend-devs@company.com" \
    --role="roles/iap.tunnelResourceAccessor" \
    --condition="expression=destination.port == 22,title=ssh-only" \
    --project=my-project-id
```

## Audit Logging for Tunnel Access

All IAP tunnel connections are logged. You can see who tunneled to which VM and on which port.

```bash
# View IAP tunnel connection logs
gcloud logging read \
    'resource.type="gce_instance" AND protoPayload.methodName="AuthorizeUser" AND protoPayload.resourceName:"tunnelInstances"' \
    --limit=20 \
    --project=my-project-id \
    --format="table(timestamp, protoPayload.authenticationInfo.principalEmail, protoPayload.resourceName)"
```

## Best Practices

1. **Never grant tunnel access at the project level without conditions**: Always restrict by port at minimum.

2. **Use groups, not individual users**: Manage access through Google Groups. Adding someone to the `database-admins` group automatically gives them DB tunnel access.

3. **Separate SSH from application ports**: Grant SSH access to ops teams and application-specific port access to developers who need it.

4. **Document your bindings**: Keep a mapping of which groups have access to which VMs and ports. Terraform makes this self-documenting.

5. **Regular access reviews**: Periodically audit tunnel IAM bindings to remove stale access.

## Summary

IAM conditions transform IAP TCP tunneling from an all-or-nothing feature into a precise access control tool. By restricting tunnel access to specific VM instances and ports, you ensure that each team member can only reach the infrastructure they need. Apply bindings at the instance level with port conditions for the tightest control, use groups for manageable access management, and audit tunnel connections through Cloud Audit Logs. This approach aligns with the principle of least privilege and gives you a clear picture of who can access what in your infrastructure.
