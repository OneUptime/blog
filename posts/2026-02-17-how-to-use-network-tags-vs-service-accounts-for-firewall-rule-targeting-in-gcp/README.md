# How to Use Network Tags vs Service Accounts for Firewall Rule Targeting in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firewall Rules, Network Tags, Service Accounts, Security

Description: A detailed comparison of network tags and service accounts for targeting GCP firewall rules, with practical examples showing when to use each approach and how to migrate between them.

---

When you create a firewall rule in GCP, you can apply it to all VMs in the network, to VMs with specific network tags, or to VMs running as a specific service account. Most teams default to network tags because they are easier to understand, but service account-based targeting is often the better choice for production environments.

In this post, I will compare both approaches, show practical examples of each, and explain when one is clearly better than the other.

## How Network Tags Work

Network tags are simple string labels you attach to VM instances. Firewall rules can target VMs by tag, and routes can apply to tagged VMs only.

```bash
# Create a VM with network tags
gcloud compute instances create web-server \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --subnet=production-subnet \
  --tags=http-server,https-server
```

```bash
# Create a firewall rule targeting the tag
gcloud compute firewall-rules create allow-http \
  --network=production-vpc \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:80 \
  --target-tags=http-server \
  --source-ranges=0.0.0.0/0
```

Tags are simple and intuitive. But they have some significant limitations.

### Tag Limitations

1. **Anyone with instance edit permission can add or remove tags.** A developer with `compute.instances.setTags` permission can tag any VM with `http-server` and suddenly expose it to traffic that the firewall rule allows. There is no way to restrict who can assign specific tags.

2. **Tags are not part of the IAM model.** You cannot audit who changed a tag or require approval for tag changes. They are just metadata on the instance.

3. **Tags are mutable at any time.** A running VM's tags can be changed without stopping it, which makes it easy for tags to drift from the intended configuration.

## How Service Account-Based Targeting Works

Instead of tags, you can target firewall rules to VMs running as a specific service account:

```bash
# Create a dedicated service account for web servers
gcloud iam service-accounts create web-server-sa \
  --display-name="Web Server Service Account"

# Create a VM that uses this service account
gcloud compute instances create web-server \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --subnet=production-subnet \
  --service-account=web-server-sa@my-project.iam.gserviceaccount.com \
  --scopes=cloud-platform
```

```bash
# Create a firewall rule targeting the service account
gcloud compute firewall-rules create allow-http-to-web-servers \
  --network=production-vpc \
  --direction=INGRESS \
  --action=ALLOW \
  --rules=tcp:80 \
  --target-service-accounts=web-server-sa@my-project.iam.gserviceaccount.com \
  --source-ranges=0.0.0.0/0
```

### Service Account Advantages

1. **IAM-controlled assignment.** To run a VM with a specific service account, you need `iam.serviceAccounts.actAs` permission on that service account. This means a network admin can create firewall rules tied to service accounts, and only users with explicit permission can launch VMs that match those rules.

2. **Immutable after creation.** A VM's service account cannot be changed without stopping and recreating it. This prevents runtime drift.

3. **Auditable.** IAM policy changes are logged, so you can track who granted the ability to use a specific service account.

4. **Works with Shared VPC.** In Shared VPC setups, service accounts from service projects can be used in host project firewall rules, providing cross-project targeting.

## Practical Comparison

Let me walk through a realistic scenario. You have three types of VMs: web servers, API servers, and databases. Each should have different firewall rules.

### Using Network Tags

```bash
# Firewall rules using tags
gcloud compute firewall-rules create allow-http-web \
  --network=production-vpc \
  --action=ALLOW --direction=INGRESS \
  --rules=tcp:80,tcp:443 \
  --target-tags=web-server \
  --source-ranges=0.0.0.0/0

gcloud compute firewall-rules create allow-api-internal \
  --network=production-vpc \
  --action=ALLOW --direction=INGRESS \
  --rules=tcp:8080 \
  --target-tags=api-server \
  --source-tags=web-server

gcloud compute firewall-rules create allow-db-from-api \
  --network=production-vpc \
  --action=ALLOW --direction=INGRESS \
  --rules=tcp:5432 \
  --target-tags=database \
  --source-tags=api-server
```

The problem: any developer who can edit a VM can add the `api-server` tag to their VM and gain access to the database on port 5432.

### Using Service Accounts

```bash
# Create service accounts for each role
gcloud iam service-accounts create web-sa --display-name="Web Servers"
gcloud iam service-accounts create api-sa --display-name="API Servers"
gcloud iam service-accounts create db-sa --display-name="Database Servers"

# Firewall rules using service accounts
gcloud compute firewall-rules create allow-http-web \
  --network=production-vpc \
  --action=ALLOW --direction=INGRESS \
  --rules=tcp:80,tcp:443 \
  --target-service-accounts=web-sa@my-project.iam.gserviceaccount.com \
  --source-ranges=0.0.0.0/0

gcloud compute firewall-rules create allow-api-internal \
  --network=production-vpc \
  --action=ALLOW --direction=INGRESS \
  --rules=tcp:8080 \
  --target-service-accounts=api-sa@my-project.iam.gserviceaccount.com \
  --source-service-accounts=web-sa@my-project.iam.gserviceaccount.com

gcloud compute firewall-rules create allow-db-from-api \
  --network=production-vpc \
  --action=ALLOW --direction=INGRESS \
  --rules=tcp:5432 \
  --target-service-accounts=db-sa@my-project.iam.gserviceaccount.com \
  --source-service-accounts=api-sa@my-project.iam.gserviceaccount.com
```

Now a developer cannot gain database access by modifying their VM. They would need `iam.serviceAccounts.actAs` permission on the `api-sa` service account, which is controlled by IAM and logged.

## When to Use Tags

Tags are appropriate when:

- **Quick prototyping and development environments** where security is less critical
- **Route targeting** since custom routes can only target by tags, not service accounts
- **Simple environments** with a small team where everyone is trusted
- **Legacy workloads** where changing service accounts is too disruptive

## When to Use Service Accounts

Service accounts are the better choice when:

- **Security matters** and you need to prevent unauthorized VMs from matching firewall rules
- **Compliance requirements** demand auditable access controls
- **Shared VPC environments** where service projects need cross-project firewall targeting
- **Automated deployments** where VMs are created by CI/CD pipelines with specific service accounts

## Migrating from Tags to Service Accounts

If you want to migrate an existing environment from tags to service accounts, do it incrementally:

```bash
# Step 1: Create service accounts that match your existing tag categories
gcloud iam service-accounts create web-sa --display-name="Web Servers"

# Step 2: Create duplicate firewall rules using service accounts
gcloud compute firewall-rules create allow-http-web-sa \
  --network=production-vpc \
  --action=ALLOW --direction=INGRESS \
  --rules=tcp:80,tcp:443 \
  --target-service-accounts=web-sa@my-project.iam.gserviceaccount.com \
  --source-ranges=0.0.0.0/0

# Step 3: Update VMs to use the new service account (requires VM restart)
gcloud compute instances stop web-server-1 --zone=us-central1-a
gcloud compute instances set-service-account web-server-1 \
  --zone=us-central1-a \
  --service-account=web-sa@my-project.iam.gserviceaccount.com \
  --scopes=cloud-platform
gcloud compute instances start web-server-1 --zone=us-central1-a

# Step 4: After all VMs are migrated, remove the old tag-based rules
gcloud compute firewall-rules delete allow-http-web --quiet
```

## Combining Both Approaches

You can use both tags and service accounts in the same network. Some teams use service accounts for security-sensitive rules (database access, admin access) and tags for operational rules (health check access, monitoring):

```bash
# Security-sensitive rule using service account
gcloud compute firewall-rules create allow-db-access \
  --network=production-vpc \
  --action=ALLOW --direction=INGRESS \
  --rules=tcp:5432 \
  --target-service-accounts=db-sa@my-project.iam.gserviceaccount.com \
  --source-service-accounts=api-sa@my-project.iam.gserviceaccount.com

# Operational rule using tags (less security-sensitive)
gcloud compute firewall-rules create allow-health-checks \
  --network=production-vpc \
  --action=ALLOW --direction=INGRESS \
  --rules=tcp \
  --target-tags=allow-health-checks \
  --source-ranges=35.191.0.0/16,130.211.0.0/22
```

## Wrapping Up

Network tags are simple but offer weak security guarantees. Service account-based targeting ties firewall rules to IAM, giving you auditable, permission-controlled access. For production environments, especially those handling sensitive data, service accounts should be your default choice for firewall rule targeting. Tags still have their place for non-security-critical rules and for route targeting, but lean toward service accounts whenever security matters.
