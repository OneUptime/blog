# How to Set Up IAM Conditions to Restrict Access by IP Address in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IAM, IAM Conditions, IP Restriction, Security, Access Control

Description: Learn how to use IAM Conditions in GCP to restrict resource access based on the requester's IP address for enhanced security and compliance.

---

Sometimes granting a role to a user or service account is not enough - you also need to control where they can access resources from. Maybe your compliance team requires that certain GCP resources can only be managed from the corporate network. Or maybe you want to restrict a contractor's access to specific IP ranges. For IAP-secured applications and TCP tunnels, IAM Conditions in GCP can reference Access Context Manager access levels to add these kinds of restrictions directly to IAM policy bindings.

In this post, I will show you how to set up IP-based IAM conditions for IAP-secured access and restrict who can access your resources and from where.

## What Are IAM Conditions?

IAM Conditions are expressions that you attach to IAM policy bindings. The binding only takes effect when the condition evaluates to true. You can write conditions based on:

- **Request attributes**: Access levels, access time, destination IP and port for IAP TCP tunneling, URL path and host for supported services
- **Resource attributes**: Resource name, type, tags
- **Date/time**: Time of day, day of week

Conditions use the Common Expression Language (CEL). Here is a simple example:

```text
request.time < timestamp("2026-12-31T23:59:59Z")
```

But for IP-based restrictions in IAM bindings, you will actually define the IP ranges in Access Context Manager and reference the resulting access level with `request.auth.access_levels`.

## How IP-Based Conditions Work

Access Context Manager evaluates request context, including attributes such as the origin IP address, device attributes, and time of day, and applies access levels when the request matches your policy.

IAM Conditions can then check whether a request has a specific Access Context Manager access level by using `request.auth.access_levels`. This IAM attribute is supported for Identity-Aware Proxy (IAP) access checks, such as IAP-secured web apps and IAP TCP tunneling. It is not a general-purpose way to restrict every Google Cloud IAM role by caller IP.

Let me walk through the practical approach.

## Method 1: Using Access Context Manager (Recommended)

The recommended way to restrict IAP-secured access by IP address is to create an Access Level in Access Context Manager and reference it in IAM conditions.

### Step 1: Create an Access Policy

If you do not already have an Access Context Manager policy:

```bash
# Create an access policy for your organization

gcloud access-context-manager policies create \
    --organization=123456789 \
    --title="Organization_Access_Policy"
```

### Step 2: Create an Access Level with IP Conditions

```bash
# Create an access level that allows specific IP ranges
gcloud access-context-manager levels create corporate_network \
    --title="Corporate Network" \
    --basic-level-spec=corporate-network-spec.yaml \
    --policy=POLICY_ID
```

The spec file defines the IP ranges:

```yaml
# corporate-network-spec.yaml
# Define the conditions for the corporate network access level
- ipSubnetworks:
    - "203.0.113.0/24"
    - "198.51.100.0/24"
    - "2001:db8::/32"
```

You can also include device policy requirements:

```yaml
# corporate-network-spec.yaml
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

Now you can reference this access level in an IAM policy binding for an IAP role:

```bash
# Grant IAP web app access with an access level condition
gcloud projects add-iam-policy-binding my-project \
    --member="user:admin@example.com" \
    --role="roles/iap.httpsResourceAccessor" \
    --condition="expression='accessPolicies/POLICY_ID/accessLevels/corporate_network' in request.auth.access_levels,title=Corporate Network Only,description=Only allow access from corporate network"
```

Breaking down the condition expression:

```text
'accessPolicies/POLICY_ID/accessLevels/corporate_network' in request.auth.access_levels
```

This evaluates to true only when the request satisfies the `corporate_network` access level.

## Method 2: Custom Access Level with an IP Expression

For more complex IP logic, you can create a custom Access Context Manager access level. The IP expression belongs in the access level, not directly in the IAM binding:

```yaml
# corporate-network-custom.yaml
expression: "inIpRange(origin.ip, ['203.0.113.0/24', '198.51.100.0/24'])"
```

```bash
# Create a custom access level that checks origin IP ranges
gcloud access-context-manager levels create corporate_network_custom \
    --title="Corporate Network Custom" \
    --custom-level-spec=corporate-network-custom.yaml \
    --policy=POLICY_ID
```

Note: IAM Conditions do not provide a documented general-purpose `request.auth.claims.client_ip` attribute for direct caller-IP checks. Access Context Manager is the reliable approach for IP-based access levels.

## Practical Examples

### Example 1: Restrict IAP Web App Access to Corporate Network

```bash
# Create access level for corporate offices
gcloud access-context-manager levels create office_network \
    --title="Office Network" \
    --basic-level-spec=office-network-spec.yaml \
    --policy=POLICY_ID
```

```yaml
# office-network-spec.yaml
- ipSubnetworks:
    - "203.0.113.0/24"
    - "198.51.100.0/24"
```

```bash
# Bind with condition
gcloud projects add-iam-policy-binding my-project \
    --member="group:developers@example.com" \
    --role="roles/iap.httpsResourceAccessor" \
    --condition="expression='accessPolicies/POLICY_ID/accessLevels/office_network' in request.auth.access_levels,title=Office Only"
```

### Example 2: Allow VPN and Office Access

```yaml
# vpn-and-office-spec.yaml
# Include both office and VPN exit IP ranges
- ipSubnetworks:
    - "203.0.113.0/24"
    - "198.51.100.0/24"
    - "192.0.2.100/32"
    - "192.0.2.101/32"
```

### Example 3: Different Access Levels for Different IAP Roles

```bash
# IAP web app access only from office
gcloud projects add-iam-policy-binding my-project \
    --member="user:admin@example.com" \
    --role="roles/iap.httpsResourceAccessor" \
    --condition="expression='accessPolicies/POLICY_ID/accessLevels/office_network' in request.auth.access_levels,title=Admin Office Only"

# IAP TCP tunnel access only from VPN
gcloud projects add-iam-policy-binding my-project \
    --member="user:admin@example.com" \
    --role="roles/iap.tunnelResourceAccessor" \
    --condition="expression='accessPolicies/POLICY_ID/accessLevels/vpn_network' in request.auth.access_levels,title=Admin VPN Only"
```

This gives the admin different IAP access paths depending on which access level the request satisfies.

## Combining IP Conditions with Other Restrictions

IAM conditions support logical operators, so you can combine access level restrictions with other criteria:

```bash
# Allow access only from corporate network AND only during business hours
gcloud projects add-iam-policy-binding my-project \
    --member="user:contractor@example.com" \
    --role="roles/iap.httpsResourceAccessor" \
    --condition="expression='accessPolicies/POLICY_ID/accessLevels/office_network' in request.auth.access_levels && request.time.getHours('America/New_York') >= 9 && request.time.getHours('America/New_York') < 17,title=Office Hours from Office Only"
```

## Using Terraform

For infrastructure-as-code, here is how to set up IP-restricted IAP access with Terraform:

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
resource "google_project_iam_binding" "iap_from_office" {
  project = "my-project"
  role    = "roles/iap.httpsResourceAccessor"

  members = [
    "group:admins@example.com"
  ]

  condition {
    title       = "Corporate Network Only"
    description = "Only allow access from corporate network"
    expression  = "'${google_access_context_manager_access_level.corporate.name}' in request.auth.access_levels"
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

1. **Access level conditions are limited to IAP IAM checks**: `request.auth.access_levels` is supported for IAP-secured web app and TCP tunnel access checks, not for arbitrary Google Cloud roles.
2. **Do not use basic roles with conditions**: The `gcloud projects add-iam-policy-binding --condition` flag cannot be used with basic roles such as Owner, Editor, and Viewer.
3. **Condition length limit**: CEL expressions cannot exceed 12,800 bytes.
4. **Service accounts**: IP-based access levels evaluate the request context for the caller making the request. If a service account makes a request, test carefully so you know which network path is being evaluated.
5. **Cloud Console**: Access level conditions do not provide a general Cloud Console IP allowlist for all Google Cloud resources. They apply where the referenced IAM condition attribute is supported, such as IAP access.

## Wrapping Up

IP-based IAM conditions are a powerful tool for enforcing network-based access controls for IAP-secured access in GCP. The recommended approach is to define IP ranges in Access Context Manager access levels and reference those levels in IAM conditions. This gives you a clean separation between the IP policy definition and the IAM bindings, making both easier to manage. Combine IP restrictions with time-based conditions for even tighter control, and always test your conditions in a non-production environment before rolling them out.
