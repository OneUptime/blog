# How to Set Up IAM Conditions to Restrict Access by IP Address in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IAM, IAM Conditions, IP Restriction, Security, Access Control

Description: Learn how to use IAM Conditions in GCP to restrict resource access based on the requester's IP address for enhanced security and compliance.

---

Sometimes granting a role to a user or service account is not enough - you also need to control where they can access resources from. Maybe your compliance team requires that certain GCP resources can only be managed from the corporate network. Or maybe you want to restrict a contractor's access to specific IP ranges. IAM Conditions in GCP let you add these kinds of restrictions directly to IAM policy bindings.

In this post, I will show you how to set up IP-based IAM conditions to restrict who can access your GCP resources and from where.

## What Are IAM Conditions?

IAM Conditions are expressions that you attach to IAM policy bindings. The binding only takes effect when the condition evaluates to true. You can write conditions based on:

- **Request attributes**: IP address, access time, resource attributes
- **Resource attributes**: Resource name, type, tags
- **Date/time**: Time of day, day of week

Conditions use the Common Expression Language (CEL). Here is a simple example:

```
request.auth.claims.ip_address == "203.0.113.0"
```

But for IP-based restrictions, you will actually use the `origin` attributes.

## How IP-Based Conditions Work

When a request hits GCP's IAM system, it includes information about the caller including their IP address. You can reference this in conditions using `request.auth.access_levels` (for Access Context Manager) or by using VPC Service Controls for network-based restrictions.

However, the most direct approach for IAM conditions is using the `request.auth.claims` attribute or configuring Access Context Manager access levels.

Let me walk through the practical approach.

## Method 1: Using Access Context Manager (Recommended)

The recommended way to restrict by IP address is to create an Access Level in Access Context Manager and reference it in IAM conditions.

### Step 1: Create an Access Policy

If you do not already have an Access Context Manager policy:

```bash
# Create an access policy for your organization
gcloud access-context-manager policies create \
    --organization=123456789 \
    --title="Organization Access Policy"
```

### Step 2: Create an Access Level with IP Conditions

```bash
# Create an access level that allows specific IP ranges
gcloud access-context-manager levels create corporate-network \
    --title="Corporate Network" \
    --basic-level-spec=corporate-network-spec.yaml \
    --policy=POLICY_ID
```

The spec file defines the IP ranges:

```yaml
# corporate-network-spec.yaml
# Define the conditions for the corporate network access level
conditions:
  - ipSubnetworks:
      - "203.0.113.0/24"
      - "198.51.100.0/24"
      - "2001:db8::/32"
```

You can also include device policy requirements:

```yaml
# corporate-network-spec.yaml
conditions:
  - ipSubnetworks:
      - "203.0.113.0/24"
      - "198.51.100.0/24"
  - ipSubnetworks:
      - "192.0.2.0/24"
    devicePolicy:
      requireScreenlock: true
      osConstraints:
        - osType: DESKTOP_CHROME_OS
```

### Step 3: Use the Access Level in an IAM Condition

Now you can reference this access level in an IAM policy binding:

```bash
# Grant a role with an access level condition
gcloud projects add-iam-policy-binding my-project \
    --member="user:admin@example.com" \
    --role="roles/compute.instanceAdmin.v1" \
    --condition="expression=request.auth.access_levels.exists(level, level == 'accessPolicies/POLICY_ID/accessLevels/corporate-network'),title=Corporate Network Only,description=Only allow access from corporate network"
```

Breaking down the condition expression:

```
request.auth.access_levels.exists(level, level == 'accessPolicies/POLICY_ID/accessLevels/corporate-network')
```

This evaluates to true only when the request originates from an IP address within the ranges defined in the `corporate-network` access level.

## Method 2: Direct IP Condition in IAM (Limited)

For simpler cases, you can write IP conditions directly without Access Context Manager, but this approach is more limited and only works with certain resource types:

```bash
# Grant role with direct IP condition
gcloud projects add-iam-policy-binding my-project \
    --member="user:developer@example.com" \
    --role="roles/storage.objectViewer" \
    --condition='expression=request.auth.claims.client_ip == "203.0.113.50",title=Office IP Only'
```

Note: Direct IP conditions in IAM are not universally supported across all GCP services. Access Context Manager is the more reliable approach.

## Practical Examples

### Example 1: Restrict Cloud Console Access to Corporate Network

```bash
# Create access level for corporate offices
gcloud access-context-manager levels create office-network \
    --title="Office Network" \
    --basic-level-spec=- <<EOF
conditions:
  - ipSubnetworks:
      - "203.0.113.0/24"
      - "198.51.100.0/24"
EOF
    --policy=POLICY_ID

# Bind with condition
gcloud projects add-iam-policy-binding my-project \
    --member="group:developers@example.com" \
    --role="roles/editor" \
    --condition="expression=request.auth.access_levels.exists(level, level == 'accessPolicies/POLICY_ID/accessLevels/office-network'),title=Office Only"
```

### Example 2: Allow VPN and Office Access

```yaml
# vpn-and-office-spec.yaml
# Include both office and VPN exit IP ranges
conditions:
  - ipSubnetworks:
      - "203.0.113.0/24"
      - "198.51.100.0/24"
      - "192.0.2.100/32"
      - "192.0.2.101/32"
```

### Example 3: Different Access Levels for Different Roles

```bash
# Full admin access only from office
gcloud projects add-iam-policy-binding my-project \
    --member="user:admin@example.com" \
    --role="roles/owner" \
    --condition="expression=request.auth.access_levels.exists(level, level == 'accessPolicies/POLICY_ID/accessLevels/office-network'),title=Admin Office Only"

# Read-only access from anywhere (no condition)
gcloud projects add-iam-policy-binding my-project \
    --member="user:admin@example.com" \
    --role="roles/viewer"
```

This gives the admin full access from the office but read-only access when working remotely.

## Combining IP Conditions with Other Restrictions

IAM conditions support logical operators, so you can combine IP restrictions with other criteria:

```bash
# Allow access only from corporate network AND only during business hours
gcloud projects add-iam-policy-binding my-project \
    --member="user:contractor@example.com" \
    --role="roles/compute.viewer" \
    --condition="expression=request.auth.access_levels.exists(level, level == 'accessPolicies/POLICY_ID/accessLevels/office-network') && request.time.getHours('America/New_York') >= 9 && request.time.getHours('America/New_York') < 17,title=Office Hours from Office Only"
```

## Using Terraform

For infrastructure-as-code, here is how to set up IP-restricted IAM with Terraform:

```hcl
# Create the access level
resource "google_access_context_manager_access_level" "corporate" {
  parent = "accessPolicies/${var.access_policy_id}"
  name   = "accessPolicies/${var.access_policy_id}/accessLevels/corporate"
  title  = "Corporate Network"

  basic {
    conditions {
      ip_subnetworks = [
        "203.0.113.0/24",
        "198.51.100.0/24"
      ]
    }
  }
}

# IAM binding with condition
resource "google_project_iam_binding" "admin_from_office" {
  project = "my-project"
  role    = "roles/compute.instanceAdmin.v1"

  members = [
    "group:admins@example.com"
  ]

  condition {
    title       = "Corporate Network Only"
    description = "Only allow access from corporate network"
    expression  = "request.auth.access_levels.exists(level, level == '${google_access_context_manager_access_level.corporate.name}')"
  }
}
```

## Viewing Active Conditions

To see which bindings have conditions:

```bash
# List all IAM bindings with conditions
gcloud projects get-iam-policy my-project \
    --format="yaml(bindings)" | grep -A 10 "condition"
```

Or for a cleaner view:

```bash
# Get full IAM policy showing conditions
gcloud projects get-iam-policy my-project \
    --format=json | python3 -c "
import json, sys
policy = json.load(sys.stdin)
for binding in policy.get('bindings', []):
    if 'condition' in binding:
        print(f\"Role: {binding['role']}\")
        print(f\"Members: {binding['members']}\")
        print(f\"Condition: {binding['condition']['title']}\")
        print(f\"Expression: {binding['condition']['expression']}\")
        print()
"
```

## Important Limitations

Be aware of these constraints:

1. **Not all resources support conditions**: Check the GCP documentation for which resource types support conditional IAM bindings.
2. **Condition length limit**: CEL expressions cannot exceed 12,800 bytes.
3. **Performance impact**: Complex conditions add slight latency to IAM evaluation.
4. **Service accounts**: IP conditions apply to the direct caller. If a service account makes a request, the IP is the IP of the machine running the code, not the user who triggered it.
5. **Cloud Console**: IP conditions work with Console access since the browser's IP is what gets checked.

## Wrapping Up

IP-based IAM conditions are a powerful tool for enforcing network-based access controls in GCP. The recommended approach is to define IP ranges in Access Context Manager access levels and reference those levels in IAM conditions. This gives you a clean separation between the IP policy definition and the IAM bindings, making both easier to manage. Combine IP restrictions with time-based conditions for even tighter control, and always test your conditions in a non-production environment before rolling them out.
