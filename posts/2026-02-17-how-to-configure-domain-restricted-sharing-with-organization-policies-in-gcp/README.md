# How to Configure Domain-Restricted Sharing with Organization Policies in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Organization Policy, IAM, Security, Domain Restriction

Description: Learn how to use GCP organization policies to restrict IAM sharing to specific domains, preventing accidental exposure of resources to external users or accounts.

---

A surprisingly common security incident in cloud environments happens when someone adds an external email address to an IAM policy. Maybe a contractor gets added directly with their personal Gmail account. Maybe a developer shares a BigQuery dataset with a partner's email during a proof of concept and forgets to remove it. Whatever the reason, once an external identity has access to your GCP resources, you have a data exposure risk that is hard to track.

GCP's domain-restricted sharing constraint solves this by enforcing a policy at the organization or folder level that prevents IAM bindings from being created for identities outside your approved domains.

## What Is Domain-Restricted Sharing

Domain-restricted sharing is an organization policy constraint identified as `constraints/iam.allowedPolicyMemberDomains`. When enabled, it restricts which domains can appear in IAM policy bindings across all projects under the organization or folder where the policy is applied.

For example, if your company's Google Workspace domain is `example.com`, you can set the constraint so that only identities from `example.com` can be granted IAM roles. Any attempt to add `someone@gmail.com` or `partner@otherdomain.com` to an IAM binding will be blocked.

This works for all identity types, including user accounts, groups, and service accounts from external projects.

## Prerequisites

You need the following before you can set this up:

- A GCP organization (this constraint requires an org node - it does not work on standalone projects)
- The `roles/orgpolicy.policyAdmin` role on the organization or folder
- Your GCP Customer ID (found in the Google Workspace or Cloud Identity admin console)

To find your Customer ID, go to the Google Admin console at `admin.google.com`, navigate to **Account > Account settings**, and copy the Customer ID. It looks something like `C01234abc`.

## Setting Up the Constraint via Console

Navigate to **IAM & Admin > Organization Policies** in the Google Cloud Console. Make sure you have selected the organization node at the top of the resource hierarchy.

Search for `Domain restricted sharing` or scroll to find `iam.allowedPolicyMemberDomains`. Click on the constraint and then click **Edit**.

Set the policy to **Customize** and add an **Allow** rule. In the allowed values, enter your Customer ID (the `C01234abc` format, not the domain name). You can add multiple Customer IDs if your organization has multiple Workspace or Cloud Identity tenants.

Save the policy and it will take effect within a few minutes.

## Setting Up the Constraint via gcloud

The gcloud approach gives you more control and is easier to script. First, create a policy YAML file:

```yaml
# domain-restricted-sharing-policy.yaml
# This restricts IAM bindings to identities from specified domains only
constraint: constraints/iam.allowedPolicyMemberDomains
listPolicy:
  allowedValues:
    - C01234abc
    - C56789def
```

Then apply it at the organization level:

```bash
# Apply the domain restriction policy to the entire organization
gcloud resource-manager org-policies set-policy \
  domain-restricted-sharing-policy.yaml \
  --organization=ORG_ID
```

You can also apply it at the folder level if you want to restrict only certain parts of your hierarchy:

```bash
# Apply to a specific folder instead of the whole org
gcloud resource-manager org-policies set-policy \
  domain-restricted-sharing-policy.yaml \
  --folder=FOLDER_ID
```

## Setting Up Using Terraform

If you manage your organization policies through infrastructure as code, here is how to configure domain-restricted sharing with the Terraform Google provider:

```hcl
# Terraform configuration for domain-restricted sharing
# This prevents IAM bindings to identities outside approved domains
resource "google_org_policy_policy" "domain_restricted_sharing" {
  name   = "organizations/${var.org_id}/policies/iam.allowedPolicyMemberDomains"
  parent = "organizations/${var.org_id}"

  spec {
    rules {
      values {
        allowed_values = [
          "C01234abc",  # Primary Workspace domain
          "C56789def",  # Secondary Cloud Identity domain
        ]
      }
    }
  }
}
```

## Handling Exceptions

There are legitimate cases where you need to grant access to external identities. For example, you might have a shared project with a partner, or you might need Google support to access your resources during an incident.

You can create exceptions by applying a less restrictive policy at a lower level of the hierarchy. Organization policies in GCP follow an inheritance model where child nodes can override parent policies if the parent allows it.

To allow exceptions for a specific project, apply a policy at the project level that includes additional Customer IDs:

```bash
# Create an exception policy for a specific project
# that allows an additional external domain
gcloud resource-manager org-policies set-policy \
  exception-policy.yaml \
  --project=shared-partner-project
```

The exception YAML would include the additional allowed Customer ID:

```yaml
# exception-policy.yaml
# Allows the partner's domain in addition to our own
constraint: constraints/iam.allowedPolicyMemberDomains
listPolicy:
  allowedValues:
    - C01234abc
    - PARTNER_CUSTOMER_ID
```

Alternatively, you can use tags to create conditional exceptions, which gives you finer control without having to manage policies at the individual project level.

## What Gets Blocked

When domain-restricted sharing is active, the following actions are blocked:

- Adding an external user to a project IAM policy
- Adding an external user to a resource-level IAM policy (Cloud Storage buckets, BigQuery datasets, etc.)
- Creating IAM bindings through the console, gcloud, API, or Terraform
- Adding external groups to IAM policies

The constraint also blocks service accounts from external projects unless those projects belong to an allowed domain.

## What Is Not Blocked

There are some things the constraint does not cover:

- **allUsers and allAuthenticatedUsers** - These special members are controlled by a separate constraint called `constraints/iam.allowedPublicMemberTypes`. You should set that one too.
- **Existing bindings** - The constraint only applies to new bindings. If an external identity already has access, the policy will not retroactively remove it.
- **VPC Service Controls** - Domain-restricted sharing is about IAM bindings. For network-level controls, you need VPC Service Controls.

## Auditing Existing Violations

After enabling the policy, you should audit existing IAM bindings to find any external identities that were added before the policy was in place. You can use Asset Inventory for this:

```bash
# Search for IAM bindings that include external domains
gcloud asset search-all-iam-policies \
  --scope="organizations/ORG_ID" \
  --query="policy:gmail.com" \
  --format="table(resource, policy.bindings.role, policy.bindings.members)"
```

Run this for each external domain you want to check. The results show you every resource in your organization that has IAM bindings including identities from that domain.

## Combining with Other Constraints

Domain-restricted sharing works best as part of a broader organization policy strategy. Consider enabling these related constraints:

- `constraints/iam.disableServiceAccountKeyCreation` - prevents the creation of user-managed service account keys
- `constraints/compute.restrictSharedVpcSubnetworks` - controls which subnets can be shared
- `constraints/storage.uniformBucketLevelAccess` - enforces uniform access control on Cloud Storage buckets

Together, these constraints create a strong baseline security posture that reduces the chance of accidental data exposure.

## Rollout Strategy

Do not enable domain-restricted sharing across your entire organization at once. Start with a test folder containing non-production projects. Verify that legitimate workflows are not broken. Then gradually expand the policy to production folders.

Communicate the change to your teams beforehand. Developers who are used to adding external collaborators will suddenly get permission denied errors, and they need to know the proper process for requesting exceptions.

Keep a runbook for handling exception requests. Document who can approve exceptions, how to create them, and how long they should last. Temporary exceptions should be reviewed and removed regularly.

Domain-restricted sharing is one of the most impactful organization policies you can enable. It prevents a whole class of accidental exposure incidents with minimal operational overhead, and it puts you in a much better position for compliance audits.
