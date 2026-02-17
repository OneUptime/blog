# How to Disable Root Access and Enforce Security Best Practices on Google Cloud Workstations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Workstations, Security, IAM, Access Control, DevSecOps

Description: Learn how to lock down Google Cloud Workstations by disabling root access, enforcing least-privilege permissions, and implementing security best practices for development environments.

---

Development environments are often the weakest link in an organization's security posture. Developers need flexibility to install tools, run services, and experiment, but that same flexibility - especially root access - creates risk. A compromised workstation with root access can become a pivot point into your cloud environment.

Google Cloud Workstations gives you controls to lock things down without making the developer experience miserable. This post covers how to disable root access, enforce security policies, and implement best practices for workstation security.

## Why Root Access on Workstations Is Risky

When a developer has root access on a workstation, they can:

- Install arbitrary software, including potentially malicious packages
- Modify system configurations and disable security tools
- Access credentials and tokens for other services
- Escalate privileges if the workstation has broad IAM permissions

In a cloud workstation that has access to your VPC, databases, and APIs, root access multiplies the blast radius of any compromise. The goal is to give developers what they need to do their jobs without handing them the keys to everything.

## Step 1: Create a Non-Root Container Image

The default Cloud Workstations base image runs as the `user` account, but it grants sudo access. To disable root, build a custom image that removes sudo entirely.

```dockerfile
# Custom workstation image without root access
FROM us-central1-docker.pkg.dev/cloud-workstations-images/predefined/base:latest

# Install all required development tools as root during build
RUN apt-get update && apt-get install -y \
    git \
    curl \
    nodejs \
    npm \
    python3 \
    python3-pip \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

# Remove sudo access completely
RUN apt-get purge -y sudo && apt-get autoremove -y

# Ensure the user account cannot escalate
RUN passwd -l root

# Set the default user for the workstation
USER user
WORKDIR /home/user
```

Build and push this to Artifact Registry:

```bash
# Build the hardened workstation image
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/MY_PROJECT/workstations/secure-dev:latest .
```

## Step 2: Apply the Hardened Image to Your Workstation Config

Update or create a workstation configuration that uses the hardened image.

```bash
# Create a secure workstation configuration
gcloud workstations configs create secure-dev-config \
  --cluster=dev-cluster \
  --region=us-central1 \
  --machine-type=e2-standard-8 \
  --pd-disk-size=100 \
  --pd-disk-type=pd-ssd \
  --container-custom-image=us-central1-docker.pkg.dev/MY_PROJECT/workstations/secure-dev:latest \
  --disable-public-ip-addresses \
  --idle-timeout=1800s \
  --running-timeout=28800s
```

The `--disable-public-ip-addresses` flag is important - it ensures workstations are only reachable through the Cloud Workstations proxy, not directly from the internet.

## Step 3: Restrict IAM Permissions

Workstation access is controlled through IAM. Be granular about who can do what.

```bash
# Grant a developer the ability to use workstations but not create configurations
gcloud projects add-iam-policy-binding MY_PROJECT \
  --member="user:developer@example.com" \
  --role="roles/workstations.user"

# Only admins should be able to create or modify workstation configs
gcloud projects add-iam-policy-binding MY_PROJECT \
  --member="group:platform-admins@example.com" \
  --role="roles/workstations.admin"
```

The key roles are:

| Role | What It Allows |
|---|---|
| `roles/workstations.user` | Start, stop, and use workstations |
| `roles/workstations.creator` | Create and manage their own workstations |
| `roles/workstations.admin` | Full control including configs and clusters |

Most developers should only have `roles/workstations.user` or `roles/workstations.creator`. Admin access should be limited to platform team members.

## Step 4: Configure the Workstation Service Account

Each workstation configuration can specify a service account that the workstation runs with. This is where you enforce least-privilege access to GCP resources.

```bash
# Create a dedicated service account for developer workstations
gcloud iam service-accounts create ws-developer \
  --display-name="Workstation Developer SA"

# Grant only the permissions developers need
# Read access to Artifact Registry
gcloud projects add-iam-policy-binding MY_PROJECT \
  --member="serviceAccount:ws-developer@MY_PROJECT.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

# Access to Cloud SQL through the proxy
gcloud projects add-iam-policy-binding MY_PROJECT \
  --member="serviceAccount:ws-developer@MY_PROJECT.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Read-only access to secrets they need
gcloud secrets add-iam-policy-binding dev-config \
  --member="serviceAccount:ws-developer@MY_PROJECT.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Apply the service account to the workstation config
gcloud workstations configs update secure-dev-config \
  --cluster=dev-cluster \
  --region=us-central1 \
  --service-account=ws-developer@MY_PROJECT.iam.gserviceaccount.com
```

Avoid using the default compute service account, which typically has overly broad permissions.

## Step 5: Enforce Network Security

Restrict outbound network access from workstations to limit what a compromised environment can reach.

```bash
# Create a firewall rule to restrict outbound traffic from workstations
gcloud compute firewall-rules create ws-restrict-egress \
  --direction=EGRESS \
  --priority=1000 \
  --network=default \
  --action=DENY \
  --rules=all \
  --target-tags=workstation \
  --destination-ranges=0.0.0.0/0

# Allow specific egress - for example, to Artifact Registry and GitHub
gcloud compute firewall-rules create ws-allow-required-egress \
  --direction=EGRESS \
  --priority=900 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:443 \
  --target-tags=workstation \
  --destination-ranges=199.36.153.4/30,140.82.112.0/20
```

Also use VPC Service Controls to create a security perimeter if your workstations access sensitive GCP services.

## Step 6: Enable Audit Logging

Turn on audit logging so you have visibility into what happens on and around workstations.

```bash
# Enable Data Access audit logs for Cloud Workstations
gcloud projects add-iam-audit-config MY_PROJECT \
  --service=workstations.googleapis.com \
  --log-type=ADMIN_READ \
  --log-type=DATA_READ \
  --log-type=DATA_WRITE
```

You can also forward these logs to a SIEM or monitoring system for alerting:

```bash
# Create a log sink for workstation events
gcloud logging sinks create workstation-audit-sink \
  pubsub.googleapis.com/projects/MY_PROJECT/topics/audit-events \
  --log-filter='resource.type="workstations.googleapis.com/Workstation"'
```

## Step 7: Use Organization Policies

If you manage multiple projects, use Organization Policies to enforce workstation security at the org level.

```yaml
# org-policy-workstations.yaml
# Restrict which container images can be used for workstations
constraint: constraints/workstations.allowedContainerImages
listPolicy:
  allowedValues:
    - us-central1-docker.pkg.dev/MY_PROJECT/workstations/*
  deniedValues:
    - "*"
```

Apply the policy:

```bash
# Apply the organization policy
gcloud org-policies set-policy org-policy-workstations.yaml \
  --project=MY_PROJECT
```

This prevents developers from creating workstation configurations with unauthorized container images.

## Step 8: Manage Secrets Properly

Developers need credentials for various services. Instead of storing them on the workstation, use Secret Manager and inject them at runtime.

```bash
# Access secrets from within the workstation using the service account
gcloud secrets versions access latest --secret="db-password"

# Or use environment variables in the workstation config
gcloud workstations configs update secure-dev-config \
  --cluster=dev-cluster \
  --region=us-central1 \
  --container-env-vars="DB_HOST=10.0.0.5,APP_ENV=development"
```

Never bake secrets into the container image. They will be visible in the image layers.

## Security Checklist

Before rolling out workstations to your team, verify each of these:

- Root access is disabled (sudo removed from image)
- Public IP addresses are disabled on the configuration
- A dedicated service account with minimal permissions is assigned
- Egress firewall rules restrict outbound network access
- Audit logging is enabled for workstation operations
- Organization policies restrict allowed container images
- Secrets are accessed through Secret Manager, not stored in the image
- Idle timeout is set to automatically stop unused workstations
- Running timeout limits maximum session length

## Wrapping Up

Securing Cloud Workstations is about layering controls. Disabling root access is the foundation, but it is not enough on its own. You need to combine it with least-privilege IAM, network restrictions, audit logging, and proper secrets management. The good news is that GCP provides all the knobs you need. It just takes the upfront effort to configure them properly. The result is a development environment that gives developers the tools they need while keeping your security team comfortable.
