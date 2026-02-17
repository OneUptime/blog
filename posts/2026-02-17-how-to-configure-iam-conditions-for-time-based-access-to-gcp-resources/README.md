# How to Configure IAM Conditions for Time-Based Access to GCP Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IAM, IAM Conditions, Time-Based Access, Security, Access Control

Description: Learn how to configure IAM conditions in GCP to restrict access to resources based on time of day, day of week, or specific date ranges for enhanced security.

---

There are situations where you want someone to have access to GCP resources only during certain hours. Maybe your support team should only be able to restart production VMs during business hours. Or a contractor should only have access during their contract period. Or you want to ensure no one makes infrastructure changes on weekends outside of maintenance windows.

IAM Conditions in GCP let you express these time-based restrictions using the Common Expression Language (CEL). In this post, I will show you how to set them up with practical examples.

## How Time-Based Conditions Work

IAM conditions have access to the `request.time` object, which represents the current time in UTC when the request is made. You can extract components like:

- `request.time.getHours("timezone")` - Hour of the day (0-23)
- `request.time.getDayOfWeek("timezone")` - Day of week (0=Sunday, 6=Saturday)
- `request.time.getMonth("timezone")` - Month (0-11)
- `request.time.getFullYear("timezone")` - Year

You can also compare `request.time` directly with timestamps for absolute date ranges.

## Example 1: Business Hours Only

Restrict access to Monday through Friday, 9 AM to 5 PM Eastern:

```bash
# Grant role only during business hours (Mon-Fri, 9-17 ET)
gcloud projects add-iam-policy-binding my-project \
    --member="group:support-team@example.com" \
    --role="roles/compute.instanceAdmin.v1" \
    --condition="expression=request.time.getHours('America/New_York') >= 9 && request.time.getHours('America/New_York') < 17 && request.time.getDayOfWeek('America/New_York') >= 1 && request.time.getDayOfWeek('America/New_York') <= 5,title=Business Hours Only,description=Access restricted to Mon-Fri 9AM-5PM ET"
```

Breaking this down:

- `request.time.getHours('America/New_York') >= 9` - After 9 AM
- `request.time.getHours('America/New_York') < 17` - Before 5 PM
- `request.time.getDayOfWeek('America/New_York') >= 1` - Monday or later
- `request.time.getDayOfWeek('America/New_York') <= 5` - Friday or earlier

Day of week values: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday.

## Example 2: Contractor Access with Expiry Date

Grant access that automatically expires at the end of a contract:

```bash
# Grant access that expires on a specific date
gcloud projects add-iam-policy-binding my-project \
    --member="user:contractor@consulting.com" \
    --role="roles/bigquery.dataViewer" \
    --condition="expression=request.time < timestamp('2026-06-30T23:59:59Z'),title=Contract Period,description=Access expires June 30 2026"
```

This is particularly useful because you do not need to remember to revoke the access - it stops working automatically after the expiry time.

## Example 3: Maintenance Window Access

Allow infrastructure changes only during a weekly maintenance window:

```bash
# Allow changes only during maintenance window (Saturday 2AM-6AM UTC)
gcloud projects add-iam-policy-binding my-project \
    --member="group:infra-team@example.com" \
    --role="roles/compute.admin" \
    --condition="expression=request.time.getDayOfWeek('UTC') == 6 && request.time.getHours('UTC') >= 2 && request.time.getHours('UTC') < 6,title=Maintenance Window,description=Saturday 2AM-6AM UTC maintenance window"
```

Combine this with a read-only role that has no time restriction:

```bash
# Read-only access anytime (no condition)
gcloud projects add-iam-policy-binding my-project \
    --member="group:infra-team@example.com" \
    --role="roles/compute.viewer"
```

Now the team can view resources anytime but can only make changes during the maintenance window.

## Example 4: Emergency Break-Glass Access

Create a time-limited escalation mechanism. An admin grants temporary broad access that expires after a few hours:

```bash
# Grant emergency admin access for 4 hours from now
# Calculate the expiry time (4 hours from current time)
EXPIRY=$(date -u -v+4H +%Y-%m-%dT%H:%M:%SZ)

gcloud projects add-iam-policy-binding my-project \
    --member="user:oncall@example.com" \
    --role="roles/editor" \
    --condition="expression=request.time < timestamp('${EXPIRY}'),title=Emergency Access,description=Temporary emergency access expiring at ${EXPIRY}"
```

After 4 hours, the access automatically stops working. You can clean up the binding later at your convenience.

## Example 5: Exclude Weekends

Allow access every day except weekends:

```bash
# Grant access on weekdays only
gcloud projects add-iam-policy-binding my-project \
    --member="group:dev-team@example.com" \
    --role="roles/cloudsql.editor" \
    --condition="expression=request.time.getDayOfWeek('America/Los_Angeles') != 0 && request.time.getDayOfWeek('America/Los_Angeles') != 6,title=Weekdays Only,description=No database changes on weekends"
```

## Example 6: Date Range for a Project

Useful for time-boxed projects:

```bash
# Grant access only during a specific project phase
gcloud projects add-iam-policy-binding my-project \
    --member="group:migration-team@example.com" \
    --role="roles/compute.instanceAdmin.v1" \
    --condition="expression=request.time >= timestamp('2026-03-01T00:00:00Z') && request.time < timestamp('2026-04-01T00:00:00Z'),title=Migration Phase,description=Access limited to March 2026 migration window"
```

## Using YAML for Complex Conditions

For conditions that are too complex for a single command line, use a YAML file:

```yaml
# complex-condition.yaml
# Condition: Business hours OR during a scheduled maintenance window
condition:
  title: "Business Hours or Maintenance"
  description: "Access during business hours Mon-Fri or Saturday maintenance window"
  expression: >
    (request.time.getHours('America/New_York') >= 9 &&
     request.time.getHours('America/New_York') < 17 &&
     request.time.getDayOfWeek('America/New_York') >= 1 &&
     request.time.getDayOfWeek('America/New_York') <= 5) ||
    (request.time.getDayOfWeek('America/New_York') == 6 &&
     request.time.getHours('America/New_York') >= 2 &&
     request.time.getHours('America/New_York') < 6)
```

## Terraform Configuration

Here is how to configure time-based conditions with Terraform:

```hcl
# Time-based IAM condition with Terraform
resource "google_project_iam_member" "business_hours_admin" {
  project = "my-project"
  role    = "roles/compute.instanceAdmin.v1"
  member  = "group:support-team@example.com"

  condition {
    title       = "Business Hours Only"
    description = "Access restricted to Mon-Fri 9AM-5PM ET"
    expression  = join(" && ", [
      "request.time.getHours('America/New_York') >= 9",
      "request.time.getHours('America/New_York') < 17",
      "request.time.getDayOfWeek('America/New_York') >= 1",
      "request.time.getDayOfWeek('America/New_York') <= 5"
    ])
  }
}

# Temporary contractor access
resource "google_project_iam_member" "contractor_access" {
  project = "my-project"
  role    = "roles/bigquery.dataViewer"
  member  = "user:contractor@consulting.com"

  condition {
    title       = "Contract Period"
    description = "Access expires at end of contract"
    expression  = "request.time < timestamp('2026-06-30T23:59:59Z')"
  }
}
```

## Combining Time Conditions with IP Restrictions

For the strongest controls, combine time and IP conditions:

```bash
# Access only from office, only during business hours
gcloud projects add-iam-policy-binding my-project \
    --member="user:admin@example.com" \
    --role="roles/owner" \
    --condition="expression=request.auth.access_levels.exists(level, level == 'accessPolicies/POLICY_ID/accessLevels/office-network') && request.time.getHours('America/New_York') >= 9 && request.time.getHours('America/New_York') < 17 && request.time.getDayOfWeek('America/New_York') >= 1 && request.time.getDayOfWeek('America/New_York') <= 5,title=Office Hours from Office,description=Admin access only from office during business hours"
```

## Auditing Time-Based Bindings

List all bindings that have conditions to review your time-based policies:

```bash
# Find all conditional bindings in a project
gcloud projects get-iam-policy my-project --format=json | \
    python3 -c "
import json, sys
policy = json.load(sys.stdin)
for binding in policy.get('bindings', []):
    cond = binding.get('condition', {})
    if 'request.time' in cond.get('expression', ''):
        print(f\"Role: {binding['role']}\")
        print(f\"Members: {', '.join(binding['members'])}\")
        print(f\"Title: {cond.get('title', 'N/A')}\")
        print(f\"Expression: {cond['expression']}\")
        print()
"
```

## Important Considerations

### Timezone Handling

Always specify a timezone in `getHours()` and `getDayOfWeek()`. If you omit it, the function uses UTC, which may not be what you want:

```
# Correct - explicit timezone
request.time.getHours('America/New_York')

# Risky - defaults to UTC, might surprise you
request.time.getHours()
```

Use IANA timezone identifiers (e.g., `America/New_York`, `Europe/London`, `Asia/Tokyo`).

### Expired Conditions

Bindings with expired time conditions still exist in the IAM policy - they just never evaluate to true. Clean up expired bindings periodically to keep your policy readable:

```bash
# List the full policy to find expired conditions
gcloud projects get-iam-policy my-project --format=yaml
```

### Testing Conditions

Test your CEL expressions before applying them:

```bash
# Use the IAM Policy Simulator in the Cloud Console
# Or test the expression logic manually:
# Does "request.time.getHours('America/New_York') >= 9" work at 9:30 AM ET? Yes.
# Does it work at 8:59 AM ET? No.
```

### Service Accounts

Time conditions apply to the time of the API request, not when a job was scheduled. If a Cloud Scheduler job runs at 3 AM using a service account with a business-hours condition, it will be denied.

## Wrapping Up

Time-based IAM conditions give you precise control over when access is granted. They are perfect for maintenance windows, contractor access periods, business-hour restrictions, and emergency break-glass scenarios. The CEL expressions are straightforward once you get the syntax right. Remember to always specify timezones, clean up expired bindings, and test your conditions before applying them to production. When combined with IP restrictions, time-based conditions provide a solid multi-factor access control layer without any additional tooling.
