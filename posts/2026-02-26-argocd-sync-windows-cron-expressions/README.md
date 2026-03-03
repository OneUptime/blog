# How to Schedule Sync Windows with Cron Expressions in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Cron, Scheduling

Description: A practical reference for writing cron expressions in ArgoCD sync windows, covering common scheduling patterns, timezone handling, and edge cases with real examples.

---

ArgoCD sync windows use standard cron expressions to define when windows start. Getting the cron expression right is critical because a wrong schedule can either block deployments when you need them or allow them when you do not. This guide is a practical reference for cron expressions in the context of ArgoCD sync windows.

## Cron Expression Format

ArgoCD uses standard five-field cron expressions.

```text
┌───────── minute (0-59)
│ ┌─────── hour (0-23)
│ │ ┌───── day of month (1-31)
│ │ │ ┌─── month (1-12 or JAN-DEC)
│ │ │ │ ┌─ day of week (0-6, 0=Sunday, or SUN-SAT)
│ │ │ │ │
* * * * *
```

Each field can contain:
- A specific value: `5`
- A range: `1-5`
- A list: `1,3,5`
- A step: `*/2` (every 2 units)
- A wildcard: `*` (every value)

## Common Scheduling Patterns

### Daily Windows

```yaml
# Every day at midnight
schedule: '0 0 * * *'

# Every day at 2 AM
schedule: '0 2 * * *'

# Every day at 11 PM
schedule: '0 23 * * *'

# Every day at 2:30 AM
schedule: '30 2 * * *'
```

### Weekday Windows

```yaml
# Monday through Friday at 2 AM
schedule: '0 2 * * 1-5'

# Monday, Wednesday, Friday at 10 PM
schedule: '0 22 * * 1,3,5'

# Tuesday and Thursday at 3 AM
schedule: '0 3 * * 2,4'
```

### Weekend Windows

```yaml
# Saturday and Sunday at midnight
schedule: '0 0 * * 0,6'

# Saturday only at 2 PM
schedule: '0 14 * * 6'

# Sunday only at 6 AM
schedule: '0 6 * * 0'
```

### Monthly Windows

```yaml
# First day of every month at midnight
schedule: '0 0 1 * *'

# 15th of every month at 2 AM
schedule: '0 2 15 * *'

# Last business day approximation (28th) at 10 PM
schedule: '0 22 28 * *'

# First Monday of the month (approximate with 1-7 range and day-of-week)
# Note: standard cron does not support "first Monday" directly
# Use day 1-7 combined with Monday
schedule: '0 2 1-7 * 1'
```

### Quarterly Windows

```yaml
# Start of each quarter (Jan 1, Apr 1, Jul 1, Oct 1) at midnight
schedule: '0 0 1 1,4,7,10 *'

# End of each quarter (Mar 31, Jun 30, Sep 30, Dec 31) at 10 PM
schedule: '0 22 28 3,6,9,12 *'
# Note: Using 28 instead of 30/31 to avoid February issues
```

### Biweekly Windows

Standard cron cannot express "every other week." Use two approaches:

```yaml
# Option 1: Use specific dates per month (approximate)
schedule: '0 2 1,15 * *'  # 1st and 15th of each month

# Option 2: Use odd/even weeks via day-of-month ranges
# This is an approximation - true biweekly requires external scheduling
schedule: '0 2 1-7,15-21 * *'
```

## Duration Strings

The duration field defines how long the window stays open after the cron trigger.

```yaml
# Hours
duration: 1h
duration: 4h
duration: 12h
duration: 24h

# Minutes
duration: 30m
duration: 90m

# Combined
duration: 2h30m
duration: 1h15m

# Days (expressed in hours)
duration: 48h   # 2 days
duration: 168h  # 1 week
duration: 720h  # 30 days
```

## Building Common Sync Window Schedules

Here are complete examples combining cron expressions with durations.

### Nightly maintenance window (2-6 AM on weekdays)

```yaml
syncWindows:
  - kind: allow
    schedule: '0 2 * * 1-5'
    duration: 4h
    applications:
      - '*'
```

### Business hours block (9 AM to 5 PM on weekdays)

```yaml
syncWindows:
  - kind: deny
    schedule: '0 9 * * 1-5'
    duration: 8h
    applications:
      - '*'
```

### Weekend-only deployments

```yaml
syncWindows:
  - kind: allow
    schedule: '0 0 * * 6'
    duration: 48h
    applications:
      - '*'
```

### No Friday afternoon to Monday morning

```yaml
syncWindows:
  - kind: deny
    schedule: '0 14 * * 5'
    duration: 62h  # Friday 2 PM to Monday 4 AM
    applications:
      - '*'
```

### Holiday freeze (Christmas through New Year)

```yaml
syncWindows:
  - kind: deny
    schedule: '0 0 24 12 *'
    duration: 216h  # 9 days, through Jan 1
    applications:
      - '*'
    manualSync: false
```

## Timezone Handling

ArgoCD 2.7+ supports the `timeZone` field using IANA timezone identifiers.

```yaml
syncWindows:
  # 2 AM Eastern Time
  - kind: allow
    schedule: '0 2 * * *'
    duration: 4h
    applications:
      - '*'
    timeZone: 'America/New_York'

  # 2 AM Central European Time
  - kind: allow
    schedule: '0 2 * * *'
    duration: 4h
    applications:
      - '*'
    timeZone: 'Europe/Berlin'

  # 2 AM Japan Standard Time
  - kind: allow
    schedule: '0 2 * * *'
    duration: 4h
    applications:
      - '*'
    timeZone: 'Asia/Tokyo'
```

Common IANA timezone identifiers:

| Timezone | Identifier |
|---|---|
| US Eastern | America/New_York |
| US Central | America/Chicago |
| US Mountain | America/Denver |
| US Pacific | America/Los_Angeles |
| UK | Europe/London |
| Central Europe | Europe/Berlin |
| India | Asia/Kolkata |
| Japan | Asia/Tokyo |
| Australia Eastern | Australia/Sydney |
| UTC | UTC |

Without the `timeZone` field, ArgoCD interprets the cron schedule in UTC. To manually convert to UTC for older ArgoCD versions:

```yaml
# Want 2 AM US Eastern (UTC-5 in winter, UTC-4 in summer)
# Winter: 2 AM EST = 7 AM UTC
# Summer: 2 AM EDT = 6 AM UTC
# Pick one or use the wider window
schedule: '0 6 * * *'  # 6 AM UTC covers summer (2 AM EDT)
duration: 5h  # Extra hour covers winter offset
```

## Validating Cron Expressions

Before applying a sync window, validate your cron expression.

```bash
# Use a cron expression validator to check the next occurrences
# Many online tools exist, or use the Python croniter library

python3 -c "
from croniter import croniter
from datetime import datetime
cron = croniter('0 2 * * 1-5', datetime.now())
for i in range(5):
    print(cron.get_next(datetime))
"
```

If you do not have croniter, test by applying the window and checking the ArgoCD project.

```bash
# Apply the project and check the windows
kubectl apply -f project.yaml
argocd proj windows list my-project

# Verify the window timing by checking the sync status
argocd app get my-app
```

## Edge Cases and Pitfalls

**Duration spanning midnight.** A window starting at 11 PM with a 4-hour duration runs from 11 PM to 3 AM the next day. This works correctly in ArgoCD.

**Duration spanning day boundaries.** A deny window starting Friday at 2 PM with duration 62h runs until Monday at 4 AM. ArgoCD handles multi-day durations correctly.

**Overlapping windows.** If two allow windows overlap, the union of their active periods is allowed. If a deny window overlaps with an allow window, the deny window wins during the overlap.

**Month boundaries.** A window starting on January 31 with a monthly schedule (`0 0 31 * *`) will only trigger in months that have 31 days. Use 28 for a safe monthly trigger that works every month.

**Daylight saving time.** Without the `timeZone` field, ArgoCD uses UTC which is not affected by DST. With the `timeZone` field, ArgoCD adjusts for DST automatically. Be aware that the window duration stays the same; only the start time shifts.

For the full sync window configuration reference, see the [sync windows configuration guide](https://oneuptime.com/blog/post/2026-02-26-argocd-configure-sync-windows/view). For practical allow and deny window patterns, check the [allow windows guide](https://oneuptime.com/blog/post/2026-02-26-argocd-allow-sync-windows-maintenance/view) and the [deny windows guide](https://oneuptime.com/blog/post/2026-02-26-argocd-deny-sync-windows/view).
