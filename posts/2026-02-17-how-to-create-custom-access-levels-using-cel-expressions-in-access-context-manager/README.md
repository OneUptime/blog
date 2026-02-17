# How to Create Custom Access Levels Using CEL Expressions in Access Context Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Access Context Manager, CEL Expressions, Custom Access Levels, Advanced Security

Description: Learn how to create custom access levels using Common Expression Language (CEL) in Access Context Manager for advanced conditional access that goes beyond basic access level capabilities.

---

Basic access levels in Access Context Manager cover common scenarios like IP ranges and device policies. But what if you need more complex logic? What if you want to allow access only during business hours, or only for users in a specific group, or based on a combination of attributes that basic levels cannot express?

That is where custom access levels come in. Custom access levels use the Common Expression Language (CEL) to define arbitrary conditions. CEL is a lightweight expression language designed for policy evaluation - it is the same language used in Firebase Security Rules and IAM Conditions.

With CEL, you can write access conditions that check request attributes, device attributes, identity attributes, and combine them with arbitrary boolean logic.

## What CEL Can Do That Basic Levels Cannot

Basic access levels support:
- IP range matching
- Device policy checks
- Region-based access
- Combining other access levels

Custom CEL access levels add:
- Time-based conditions (business hours, maintenance windows)
- Identity attribute matching (email domain, specific users)
- Complex boolean logic (nested AND/OR/NOT)
- String pattern matching on request attributes
- Combining any of the above in a single expression

## Prerequisites

- Access Context Manager with an access policy
- The `roles/accesscontextmanager.policyAdmin` role
- Familiarity with boolean expressions

```bash
# Get your access policy ID
ACCESS_POLICY_ID=$(gcloud access-context-manager policies list \
  --organization=ORGANIZATION_ID \
  --format="value(name)")
```

## CEL Expression Basics

CEL expressions in Access Context Manager evaluate to a boolean (true/false). The expression has access to several variables:

- `origin.ip` - The source IP address
- `request.time` - The timestamp of the request
- `device` - Device attributes from Endpoint Verification
- `levels` - Reference to other access levels

Here is a simple example:

```
origin.ip == "203.0.113.1"
```

This evaluates to true if the request comes from the IP 203.0.113.1.

## Step 1: Create a Time-Based Access Level

Allow access only during business hours (9 AM to 6 PM UTC, Monday through Friday).

```bash
# Create a business-hours-only access level
gcloud access-context-manager levels create business-hours \
  --title="Business Hours Only (UTC)" \
  --custom-level-spec=business-hours.yaml \
  --policy=$ACCESS_POLICY_ID
```

Create `business-hours.yaml`:

```yaml
# business-hours.yaml
expression: |
  request.time.getHours("UTC") >= 9 &&
  request.time.getHours("UTC") < 18 &&
  request.time.getDayOfWeek("UTC") >= 1 &&
  request.time.getDayOfWeek("UTC") <= 5
```

Days of the week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday.

## Step 2: Create a Maintenance Window Access Level

Allow access only during a specific maintenance window.

```yaml
# maintenance-window.yaml
expression: |
  request.time >= timestamp("2026-02-20T22:00:00Z") &&
  request.time <= timestamp("2026-02-21T06:00:00Z")
```

```bash
# Create the maintenance window access level
gcloud access-context-manager levels create maintenance-window \
  --title="Maintenance Window Feb 20-21" \
  --custom-level-spec=maintenance-window.yaml \
  --policy=$ACCESS_POLICY_ID
```

## Step 3: IP Range with Time Restriction

Allow access from the office network, but only during business hours.

```yaml
# office-business-hours.yaml
expression: |
  inIpRange(origin.ip, "203.0.113.0/24") &&
  request.time.getHours("UTC") >= 9 &&
  request.time.getHours("UTC") < 18
```

```bash
# Create the combined access level
gcloud access-context-manager levels create office-business-hours \
  --title="Office Network During Business Hours" \
  --custom-level-spec=office-business-hours.yaml \
  --policy=$ACCESS_POLICY_ID
```

## Step 4: Reference Other Access Levels in CEL

You can reference existing basic access levels within CEL expressions.

```yaml
# combined-levels.yaml
expression: |
  "accessPolicies/POLICY_ID/accessLevels/office-network" in request.auth.access_levels &&
  device.encryption_status == DeviceEncryptionStatus.ENCRYPTED
```

```bash
# Create the combined access level
gcloud access-context-manager levels create combined-trust \
  --title="Office Network with Encrypted Device" \
  --custom-level-spec=combined-levels.yaml \
  --policy=$ACCESS_POLICY_ID
```

## Step 5: Device Attribute Checks with CEL

CEL gives you more granular control over device attribute checks than basic levels.

```yaml
# advanced-device.yaml
expression: |
  device.is_admin_approved_device == true &&
  device.encryption_status == DeviceEncryptionStatus.ENCRYPTED &&
  (
    device.os_type == OsType.DESKTOP_MAC ||
    device.os_type == OsType.DESKTOP_WINDOWS ||
    device.os_type == OsType.DESKTOP_CHROME_OS
  )
```

```bash
# Create the access level
gcloud access-context-manager levels create advanced-device-check \
  --title="Admin Approved Encrypted Desktop" \
  --custom-level-spec=advanced-device.yaml \
  --policy=$ACCESS_POLICY_ID
```

## Step 6: Multiple IP Ranges with CEL

Check against multiple IP ranges with OR logic.

```yaml
# multi-ip.yaml
expression: |
  inIpRange(origin.ip, "203.0.113.0/24") ||
  inIpRange(origin.ip, "198.51.100.0/24") ||
  inIpRange(origin.ip, "192.0.2.0/24") ||
  inIpRange(origin.ip, "34.120.50.0/24")
```

This is equivalent to a basic access level with multiple IP subnets, but CEL lets you add more complex logic around it.

## Step 7: Complex Policy Expressions

Here is a more realistic example that combines multiple conditions:

Allow access if:
- Request is from the office network with any device, OR
- Request is from the VPN with an encrypted device, OR
- Request is from any IP during a maintenance window with an admin-approved device

```yaml
# complex-policy.yaml
expression: |
  (
    inIpRange(origin.ip, "203.0.113.0/24")
  ) ||
  (
    inIpRange(origin.ip, "34.120.50.0/24") &&
    device.encryption_status == DeviceEncryptionStatus.ENCRYPTED
  ) ||
  (
    request.time >= timestamp("2026-02-20T22:00:00Z") &&
    request.time <= timestamp("2026-02-21T06:00:00Z") &&
    device.is_admin_approved_device == true
  )
```

```bash
# Create the complex access level
gcloud access-context-manager levels create complex-policy \
  --title="Complex Multi-Condition Policy" \
  --custom-level-spec=complex-policy.yaml \
  --policy=$ACCESS_POLICY_ID
```

## Step 8: Using CEL for Geo-Restriction

Restrict access based on geographic regions while combining with other conditions.

```yaml
# geo-restricted.yaml
expression: |
  origin.region_code in ["US", "CA", "GB", "DE"] &&
  device.encryption_status == DeviceEncryptionStatus.ENCRYPTED
```

```bash
# Create the geo-restricted access level
gcloud access-context-manager levels create geo-restricted \
  --title="Allowed Countries with Encrypted Device" \
  --custom-level-spec=geo-restricted.yaml \
  --policy=$ACCESS_POLICY_ID
```

## CEL Function Reference

Here are the most useful CEL functions for access levels:

| Function | Description | Example |
|---|---|---|
| `inIpRange(ip, cidr)` | Check if IP is in CIDR range | `inIpRange(origin.ip, "10.0.0.0/8")` |
| `request.time.getHours(tz)` | Get hour of day | `request.time.getHours("UTC") >= 9` |
| `request.time.getDayOfWeek(tz)` | Get day of week (0=Sun) | `request.time.getDayOfWeek("UTC") <= 5` |
| `timestamp(string)` | Parse a timestamp | `request.time >= timestamp("2026-01-01T00:00:00Z")` |
| `in` | Check membership | `origin.region_code in ["US", "CA"]` |

## CEL Device Variables

| Variable | Type | Description |
|---|---|---|
| `device.encryption_status` | Enum | ENCRYPTED, UNENCRYPTED |
| `device.os_type` | Enum | DESKTOP_MAC, DESKTOP_WINDOWS, DESKTOP_CHROME_OS, DESKTOP_LINUX |
| `device.is_admin_approved_device` | Bool | Admin approved in directory |
| `device.is_corp_owned_device` | Bool | Corporate owned device |

## Applying Custom Access Levels

Custom access levels are used exactly like basic access levels in perimeters.

```bash
# Add a custom access level to a perimeter
gcloud access-context-manager perimeters update my-perimeter \
  --add-access-levels="accessPolicies/$ACCESS_POLICY_ID/accessLevels/business-hours" \
  --policy=$ACCESS_POLICY_ID
```

## Testing CEL Expressions

CEL expressions can be tricky to get right. Here are some testing tips:

1. Start with dry-run mode to see if the expression matches as expected.

2. Use simple expressions first and add complexity incrementally.

3. Check audit logs to see which access levels a request matched:

```bash
# Check access level matching in audit logs
gcloud logging read \
  'protoPayload.metadata.@type="type.googleapis.com/google.cloud.audit.VpcServiceControlAuditMetadata"' \
  --limit=10 \
  --format="table(timestamp, protoPayload.metadata.accessLevels, protoPayload.metadata.violationReason)" \
  --project=my-project-id
```

## Common Mistakes

1. **Timezone issues**: Always specify the timezone in time functions. `request.time.getHours("UTC")` is correct. Omitting the timezone will cause errors.

2. **Enum values**: Device attributes use enum types, not strings. Use `DeviceEncryptionStatus.ENCRYPTED`, not `"ENCRYPTED"`.

3. **Expression length**: CEL expressions have a maximum length. Very complex expressions may need to be split across multiple access levels.

4. **Evaluation performance**: Simple expressions are evaluated faster. Avoid deeply nested logic when possible.

## Conclusion

Custom access levels with CEL expressions give you the flexibility to implement access policies that would be impossible with basic access levels alone. Time-based access, complex device checks, and multi-condition policies are all achievable with CEL. The key is to start simple, test thoroughly with dry-run mode, and document your expressions so future maintainers understand the logic. With CEL in your toolkit, Access Context Manager can express virtually any access policy your organization requires.
