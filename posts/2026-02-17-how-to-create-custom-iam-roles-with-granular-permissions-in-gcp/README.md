# How to Create Custom IAM Roles with Granular Permissions in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IAM, Custom Roles, Security, Access Control, Permissions

Description: Learn how to create custom IAM roles in Google Cloud Platform with precisely scoped permissions for fine-grained access control beyond predefined roles.

---

GCP comes with hundreds of predefined IAM roles, but they often grant more permissions than you actually need. The Storage Object Viewer role lets someone list all buckets in the project, even if you only want them to read objects. The Compute Instance Admin role lets someone delete VMs, even if you only want them to start and stop. Custom IAM roles let you pick exactly the permissions you need and bundle them together.

In this post, I will show you how to create, manage, and use custom IAM roles for tighter access control.

## Why Custom Roles?

The principle of least privilege says users should have only the permissions they need to do their job, nothing more. Predefined roles are convenient but broad. Custom roles let you:

- Remove dangerous permissions from otherwise useful roles
- Combine permissions from multiple predefined roles into one
- Create roles specific to your organization's workflows
- Meet compliance requirements for fine-grained access control

For example, you might need a role that can view VM instances and start/stop them, but cannot create or delete them. No predefined role does exactly this. A custom role can.

## Understanding Permissions

Before creating custom roles, you need to understand how permissions work in GCP.

Every permission has a format like `service.resource.action`:

```
compute.instances.get        # View a VM instance
compute.instances.start      # Start a VM instance
compute.instances.delete     # Delete a VM instance
storage.objects.get          # Download an object from Cloud Storage
storage.objects.list         # List objects in a bucket
```

A role is just a collection of these permissions with a name.

## Finding the Right Permissions

The first step is figuring out which permissions you need. There are several ways to do this.

### Option 1: Look at Predefined Roles

Start with a predefined role that is close to what you want, then add or remove permissions:

```bash
# List permissions in a predefined role
gcloud iam roles describe roles/compute.instanceAdmin.v1 \
    --format="yaml(includedPermissions)"
```

### Option 2: Search for Permissions

If you know the service, list all available permissions:

```bash
# List all Compute Engine permissions
gcloud iam list-testable-permissions \
    //cloudresourcemanager.googleapis.com/projects/my-project \
    --filter="name:compute.instances" \
    --format="table(name, stage)"
```

### Option 3: Use the IAM Troubleshooter

If a user gets a permission denied error, the error message usually tells you exactly which permission was missing. Use this to build your role incrementally.

## Creating a Custom Role at the Project Level

Here is a practical example: creating a role for operators who can view and manage VM lifecycle (start, stop, reset) but cannot create or delete VMs.

```bash
# Create a custom role for VM operators
gcloud iam roles create vmOperator \
    --project=my-project \
    --title="VM Operator" \
    --description="Can view, start, stop, and reset VMs but cannot create or delete them" \
    --permissions=compute.instances.get,compute.instances.list,compute.instances.start,compute.instances.stop,compute.instances.reset,compute.instances.getSerialPortOutput,compute.instances.getScreenshot,compute.zones.list,compute.zones.get,compute.projects.get \
    --stage=GA
```

The `--stage` flag indicates the role's lifecycle stage:
- `ALPHA`: Experimental, may change
- `BETA`: Feature complete but may change
- `GA`: Stable, production-ready
- `DISABLED`: Role exists but cannot be granted

## Creating a Custom Role at the Organization Level

If you want the role available across all projects in your organization:

```bash
# Create an org-level custom role
gcloud iam roles create vmOperator \
    --organization=123456789 \
    --title="VM Operator" \
    --description="Organization-wide VM operator role" \
    --permissions=compute.instances.get,compute.instances.list,compute.instances.start,compute.instances.stop,compute.instances.reset,compute.zones.list,compute.zones.get
```

Organization-level roles are useful when you want consistency across projects.

## Creating Roles from YAML Files

For complex roles with many permissions, a YAML file is easier to manage and review:

```yaml
# vm-operator-role.yaml
title: "VM Operator"
description: "Can view, start, stop, and reset VMs but cannot create or delete them"
stage: "GA"
includedPermissions:
  # VM instance read permissions
  - compute.instances.get
  - compute.instances.list
  - compute.instances.getSerialPortOutput
  - compute.instances.getScreenshot
  - compute.instances.getGuestAttributes
  # VM instance lifecycle management
  - compute.instances.start
  - compute.instances.stop
  - compute.instances.reset
  - compute.instances.resume
  - compute.instances.suspend
  # Required supporting permissions
  - compute.zones.list
  - compute.zones.get
  - compute.regions.list
  - compute.regions.get
  - compute.projects.get
  # Disk read permissions (to see attached disks)
  - compute.disks.get
  - compute.disks.list
```

Apply it:

```bash
# Create role from YAML file
gcloud iam roles create vmOperator \
    --project=my-project \
    --file=vm-operator-role.yaml
```

## Assigning the Custom Role

Once created, assign it like any other role:

```bash
# Grant the custom role to a user
gcloud projects add-iam-policy-binding my-project \
    --member="user:operator@example.com" \
    --role="projects/my-project/roles/vmOperator"

# Grant to a service account
gcloud projects add-iam-policy-binding my-project \
    --member="serviceAccount:my-sa@my-project.iam.gserviceaccount.com" \
    --role="projects/my-project/roles/vmOperator"

# Grant an org-level role
gcloud projects add-iam-policy-binding my-project \
    --member="user:operator@example.com" \
    --role="organizations/123456789/roles/vmOperator"
```

## Updating Custom Roles

Adding or removing permissions from an existing role:

```bash
# Add permissions to the role
gcloud iam roles update vmOperator \
    --project=my-project \
    --add-permissions=compute.instances.setMachineType,compute.instances.setLabels

# Remove permissions
gcloud iam roles update vmOperator \
    --project=my-project \
    --remove-permissions=compute.instances.getScreenshot
```

Or update from a modified YAML file:

```bash
# Update from YAML (this replaces all permissions with what is in the file)
gcloud iam roles update vmOperator \
    --project=my-project \
    --file=vm-operator-role-v2.yaml
```

## Common Custom Role Patterns

Here are some custom roles I have seen work well in practice:

### Read-Only Database Viewer

```yaml
# db-viewer-role.yaml
title: "Database Viewer"
description: "Can view Cloud SQL instances and connect to read replicas"
stage: "GA"
includedPermissions:
  - cloudsql.instances.get
  - cloudsql.instances.list
  - cloudsql.instances.connect
  - cloudsql.databases.get
  - cloudsql.databases.list
  - resourcemanager.projects.get
```

### Deploy-Only CI/CD Role

```yaml
# deployer-role.yaml
title: "Application Deployer"
description: "Can deploy to Cloud Run and GKE but cannot modify infrastructure"
stage: "GA"
includedPermissions:
  - run.services.get
  - run.services.list
  - run.services.update
  - run.revisions.get
  - run.revisions.list
  - container.deployments.create
  - container.deployments.update
  - container.deployments.get
  - container.pods.get
  - container.pods.list
```

### Log Viewer Without Sensitive Logs

```yaml
# restricted-log-viewer.yaml
title: "Restricted Log Viewer"
description: "Can view application logs but not data access or admin activity logs"
stage: "GA"
includedPermissions:
  - logging.logEntries.list
  - logging.logs.list
  - logging.logServices.list
  - logging.views.get
  - logging.views.list
```

## Limitations to Know About

Custom roles have some constraints:

- **Maximum 3000 permissions per role** at the project level
- **Maximum 300 custom roles per project**, 300 per organization
- Some permissions **cannot be used in custom roles** (they are only available in predefined roles). These are marked as `NOT_SUPPORTED` in the permission listing.
- Custom roles do not automatically get **new permissions** when Google adds them. You need to update roles manually.

Check if a permission supports custom roles:

```bash
# Check permission support for custom roles
gcloud iam list-testable-permissions \
    //cloudresourcemanager.googleapis.com/projects/my-project \
    --filter="name:compute.instances.get" \
    --format="table(name, customRolesSupportLevel)"
```

## Disabling and Deleting Roles

If you need to retire a role, disable it first to catch any dependencies:

```bash
# Disable the role (existing bindings remain but the role grants no access)
gcloud iam roles update vmOperator \
    --project=my-project \
    --stage=DISABLED

# After confirming nothing breaks, delete it
gcloud iam roles delete vmOperator \
    --project=my-project
```

Deleted roles can be undeleted within 7 days. After that, the role ID becomes available for reuse after 30 days.

## Wrapping Up

Custom IAM roles are essential for implementing least-privilege access in GCP. Start by looking at the predefined roles closest to what you need, then trim the excess permissions or combine permissions from multiple roles. Use YAML files for managing roles with many permissions, and test new roles thoroughly before rolling them out to production users. The upfront investment in creating precise roles pays off in reduced attack surface and easier auditing.
