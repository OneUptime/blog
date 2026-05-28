# How to Configure Domain-Restricted Sharing with Organization Policies in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Organization Policy, IAM, Security, Domain Restriction

Description: Learn how to use GCP organization policies to restrict IAM sharing to specific domains, preventing accidental exposure of resources to external users or accounts.

---

A surprisingly common security incident in cloud environments happens when someone adds an external email address to an IAM policy. Maybe a contractor gets added directly with their personal Gmail account. Maybe a developer shares a BigQuery dataset with a partner's email during a proof of concept and forgets to remove it. Whatever the reason, once an external identity has access to your GCP resources, you have a data exposure risk that is hard to track.

GCP's domain-restricted sharing constraint solves this by enforcing a policy at the organization or folder level that prevents IAM bindings from being created for identities outside your approved domains.

## What Is Domain-Restricted Sharing

Domain-restricted sharing can be implemented with the legacy organization policy constraint identified as `constraints/iam.allowedPolicyMemberDomains`. When enabled, it restricts which domains can appear in IAM policy bindings across all projects under the organization or folder where the policy is applied.

For example, if your company's Google Workspace domain is `example.com`, you can set the constraint so that only identities from `example.com` can be granted IAM roles. Any attempt to add `someone@gmail.com` or `partner@otherdomain.com` to an IAM binding will be blocked.

This works for principals in IAM allow policies, including user accounts, groups, service accounts, and workload identity pools. When you allow a Google Workspace Customer ID, Google Cloud also allows service accounts and workload identity pools in projects in that organization.

## Prerequisites

You need the following before you can set this up:

- A GCP organization (this constraint requires an org node - it does not work on standalone projects)
- The `roles/orgpolicy.policyAdmin` role on the organization or folder
- Your GCP Customer ID (found in the Google Workspace or Cloud Identity admin console)

To find your Customer ID, go to the Google Admin console at `admin.google.com`, navigate to **Account > Account settings**, and copy the Customer ID. It looks something like `C01234abc`. You can also run `gcloud organizations list`; the Customer ID is shown in the `DIRECTORY_CUSTOMER_ID` column.

## Setting Up the Constraint via Console

Navigate to **IAM & Admin > Organization Policies** in the Google Cloud Console. Make sure you have selected the organization node at the top of the resource hierarchy.

Search for `Domain restricted sharing` or scroll to find `iam.allowedPolicyMemberDomains`. Click on the constraint and then click **Edit**.

Set the policy to **Customize** and add an **Allow** rule. In the custom values, enter your Customer ID (not the domain name). For policy files and Terraform, use the `is:C01234abc` format. You can add multiple Customer IDs if your organization has multiple Workspace or Cloud Identity tenants.

Save the policy and it should take effect within 15 minutes.

## Setting Up the Constraint via gcloud

The gcloud approach gives you more control and is easier to script. First, create a policy YAML file:

```yaml
# domain-restricted-sharing-policy.yaml

# This restricts IAM bindings to identities from specified domains only
name: organizations/ORG_ID/policies/iam.allowedPolicyMemberDomains
spec:
  rules:
    - values:
        allowedValues:
          - is:C01234abc
          - is:C56789def
```

Then apply it at the organization level:

```bash
# Apply the domain restriction policy to the entire organization
gcloud org-policies set-policy domain-restricted-sharing-policy.yaml
```

You can also apply it at the folder level if you want to restrict only certain parts of your hierarchy:

```bash
# Apply to a specific folder instead of the whole org
gcloud org-policies set-policy folder-domain-restricted-sharing-policy.yaml
```

The folder policy file uses the same structure, but the `name` starts with `folders/FOLDER_ID/policies/iam.allowedPolicyMemberDomains`.

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
          "is:C01234abc",  # Primary Workspace domain
          "is:C56789def",  # Secondary Cloud Identity domain
        ]
      }
    }
  }
}
```

## Handling Exceptions

There are legitimate cases where you need to grant access to external identities. For example, you might have a shared project with a partner, or you might need Google support to access your resources during an incident.

You can create exceptions by applying a less restrictive policy at a lower level of the hierarchy. Organization policies in GCP follow an inheritance model where child nodes can override parent policies.

To allow exceptions for a specific project, apply a policy at the project level that includes additional Customer IDs:

```bash
# Create an exception policy for a specific project
# that allows an additional external domain
gcloud org-policies set-policy exception-policy.yaml
```

The exception YAML would include the additional allowed Customer ID:

```yaml
# exception-policy.yaml
# Allows the partner's domain in addition to our own
name: projects/PROJECT_ID/policies/iam.allowedPolicyMemberDomains
spec:
  rules:
    - values:
        allowedValues:
          - is:C01234abc
          - is:PARTNER_CUSTOMER_ID
```

Alternatively, you can use tags to create conditional policies, which gives you finer control without having to manage policies at the individual project level.

## What Gets Blocked

When domain-restricted sharing is active, the following actions are blocked:

- Adding an external user to a project IAM policy
- Adding an external user to a resource-level IAM policy (Cloud Storage buckets, BigQuery datasets, etc.)
- Creating IAM bindings through the console, gcloud, API, or Terraform
- Adding external groups to IAM policies

The constraint also blocks service accounts from external projects unless they are covered by an allowed organization principal set or Google Workspace Customer ID.

## What Is Not Blocked

There are some things the constraint does not cover:

- **allUsers and allAuthenticatedUsers** - With the legacy `iam.allowedPolicyMemberDomains` constraint, exceptions for these special principals are not added directly to the allowed values list. If you need public sharing, use a custom organization policy or a supported service-specific control such as Cloud Storage Public Access Prevention.
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
