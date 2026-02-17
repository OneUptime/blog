# How to Grant Fine-Grained Access Control to Individual Secrets in GCP Secret Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Secret Manager, IAM, Access Control, Security

Description: Learn how to implement per-secret access control in GCP Secret Manager using resource-level IAM bindings, ensuring each service only accesses the secrets it needs.

---

A common mistake with Secret Manager is granting project-level access. Someone gives a service account `roles/secretmanager.secretAccessor` on the entire project, and suddenly that service account can read every secret in the project - the database passwords, the API keys, the TLS certificates, the third-party tokens, everything. If that service account is compromised, the attacker gets the full set.

Secret Manager supports resource-level IAM, which means you can grant access to individual secrets. The payment service gets access only to the payment gateway API key. The user service gets access only to the user database password. No service can read secrets that belong to other services. This is least-privilege access applied to secret management, and it significantly reduces the blast radius of any single compromise.

## Project-Level vs Secret-Level IAM

When you grant a role at the project level, it applies to all secrets in the project:

```bash
# This grants access to ALL secrets in the project - avoid this
gcloud projects add-iam-policy-binding my-project-id \
  --member="serviceAccount:my-sa@my-project-id.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

When you grant a role at the secret level, it applies only to that specific secret:

```bash
# This grants access to only ONE secret - preferred approach
gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:my-sa@my-project-id.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=my-project-id
```

The difference is where the binding lives. Project-level bindings are on the project's IAM policy. Secret-level bindings are on the secret's IAM policy.

## Secret Manager IAM Roles

Secret Manager provides several predefined roles with different levels of access:

| Role | What It Can Do |
|------|---------------|
| `roles/secretmanager.secretAccessor` | Read secret values (access versions) |
| `roles/secretmanager.secretVersionAdder` | Add new versions to existing secrets |
| `roles/secretmanager.secretVersionManager` | Add, disable, enable, and destroy versions |
| `roles/secretmanager.viewer` | View secret metadata (not values) |
| `roles/secretmanager.admin` | Full control over secrets |

For most application service accounts, `secretAccessor` is all they need. For rotation functions, `secretVersionManager` or `secretVersionAdder` is appropriate.

## Setting Up Per-Secret Access

Let's walk through a practical example. Suppose you have three microservices, each needing different secrets:

- **Payment service** needs `stripe-api-key` and `payment-db-password`
- **User service** needs `user-db-password` and `auth-signing-key`
- **Email service** needs `sendgrid-api-key`

First, create the secrets:

```bash
# Create secrets for each service
echo -n "sk_live_stripe_key" | gcloud secrets create stripe-api-key --data-file=- --replication-policy=automatic --project=my-project-id
echo -n "payment-db-pass-123" | gcloud secrets create payment-db-password --data-file=- --replication-policy=automatic --project=my-project-id
echo -n "user-db-pass-456" | gcloud secrets create user-db-password --data-file=- --replication-policy=automatic --project=my-project-id
echo -n "auth-key-789" | gcloud secrets create auth-signing-key --data-file=- --replication-policy=automatic --project=my-project-id
echo -n "SG.sendgrid-key" | gcloud secrets create sendgrid-api-key --data-file=- --replication-policy=automatic --project=my-project-id
```

Create dedicated service accounts for each microservice:

```bash
# Create service accounts for each service
gcloud iam service-accounts create payment-service --display-name="Payment Service" --project=my-project-id
gcloud iam service-accounts create user-service --display-name="User Service" --project=my-project-id
gcloud iam service-accounts create email-service --display-name="Email Service" --project=my-project-id
```

Now grant each service account access only to its secrets:

```bash
# Payment service: access to stripe-api-key and payment-db-password
gcloud secrets add-iam-policy-binding stripe-api-key \
  --member="serviceAccount:payment-service@my-project-id.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=my-project-id

gcloud secrets add-iam-policy-binding payment-db-password \
  --member="serviceAccount:payment-service@my-project-id.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=my-project-id

# User service: access to user-db-password and auth-signing-key
gcloud secrets add-iam-policy-binding user-db-password \
  --member="serviceAccount:user-service@my-project-id.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=my-project-id

gcloud secrets add-iam-policy-binding auth-signing-key \
  --member="serviceAccount:user-service@my-project-id.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=my-project-id

# Email service: access to sendgrid-api-key only
gcloud secrets add-iam-policy-binding sendgrid-api-key \
  --member="serviceAccount:email-service@my-project-id.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=my-project-id
```

## Managing Access with Terraform

At scale, managing per-secret IAM bindings by hand becomes tedious. Terraform makes this manageable with a data-driven approach:

```hcl
# Define the mapping between services and their secrets
locals {
  # Map of service account -> list of secrets it needs
  secret_access = {
    "payment-service" = ["stripe-api-key", "payment-db-password"]
    "user-service"    = ["user-db-password", "auth-signing-key"]
    "email-service"   = ["sendgrid-api-key"]
  }

  # Flatten the map into individual bindings
  secret_bindings = flatten([
    for sa, secrets in local.secret_access : [
      for secret in secrets : {
        service_account = sa
        secret_id       = secret
      }
    ]
  ])
}

# Create the IAM bindings
resource "google_secret_manager_secret_iam_member" "access" {
  for_each = { for binding in local.secret_bindings : "${binding.service_account}-${binding.secret_id}" => binding }

  project   = var.project_id
  secret_id = each.value.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${each.value.service_account}@${var.project_id}.iam.gserviceaccount.com"
}
```

This approach keeps the access mapping in one place, making it easy to audit and update.

## Auditing Secret Access

Review who has access to a specific secret:

```bash
# View the IAM policy for a specific secret
gcloud secrets get-iam-policy stripe-api-key \
  --project=my-project-id \
  --format="table(bindings.role, bindings.members)"
```

To audit all access across all secrets in a project, use Asset Inventory:

```bash
# Search all IAM policies related to Secret Manager
gcloud asset search-all-iam-policies \
  --scope="projects/my-project-id" \
  --query="policy.role.permissions:secretmanager" \
  --format="table(resource, policy.bindings.role, policy.bindings.members)"
```

## Using IAM Conditions for Even Finer Control

You can add conditions to secret-level bindings for additional control. For example, restrict access to business hours or require a specific attribute:

```bash
# Grant access only during business hours (UTC)
gcloud secrets add-iam-policy-binding production-db-password \
  --member="serviceAccount:debug-service@my-project-id.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --condition="expression=request.time.getHours('UTC') >= 9 && request.time.getHours('UTC') <= 17,title=business-hours-only,description=Restrict access to business hours" \
  --project=my-project-id
```

Or grant access only until a specific date for temporary debugging:

```bash
# Grant temporary access that expires automatically
gcloud secrets add-iam-policy-binding production-db-password \
  --member="user:oncall@example.com" \
  --role="roles/secretmanager.secretAccessor" \
  --condition="expression=request.time < timestamp('2026-03-01T00:00:00Z'),title=temp-access,description=Temporary access for incident response" \
  --project=my-project-id
```

## Detecting Over-Permissioned Access

Use IAM Recommender to identify service accounts that have broader secret access than they need:

```bash
# Check for IAM recommendations related to Secret Manager
gcloud recommender recommendations list \
  --project=my-project-id \
  --location=global \
  --recommender=google.iam.policy.Recommender \
  --filter="description:secretmanager" \
  --format="table(name, description, priority)"
```

If a service account has project-level `secretAccessor` but only accesses two specific secrets, the recommender will suggest scoping the access down to those specific secrets.

## Naming Conventions for Secrets

A good naming convention helps with access management. Include the owning service and the purpose in the secret name:

```
{service}-{type}-{environment}
```

Examples:
- `payment-stripe-key-production`
- `user-db-password-staging`
- `email-sendgrid-key-production`

This makes it obvious which service should have access and makes auditing much easier.

## Common Mistakes to Avoid

Do not grant `roles/secretmanager.admin` to application service accounts. Admin includes the ability to delete secrets and modify IAM policies, which applications should never need.

Do not mix project-level and secret-level bindings for the same role. If a service account has project-level `secretAccessor`, adding a secret-level binding does not restrict it further - IAM is additive. The project-level binding still grants access to everything.

Do not forget about inherited bindings from folders and organizations. A service account might have secret access granted at a level above the project. Check the full IAM hierarchy when auditing.

Per-secret IAM is straightforward to implement and provides a meaningful security improvement. It takes a few extra minutes of setup compared to project-level grants, but it ensures that a compromised service account only exposes the secrets it actually needs, not every secret in the project.
