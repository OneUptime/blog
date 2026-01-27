# How to Configure PagerDuty On-Call Schedules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PagerDuty, On-Call, Incident Management, Scheduling, Escalation Policies, API, Automation

Description: A comprehensive guide to configuring PagerDuty on-call schedules, covering schedule layers, rotation types, handoff times, overrides, escalation policies, and API automation.

---

> "A well-designed on-call schedule is the difference between a team that responds to incidents and a team that burns out responding to incidents."

---

## Understanding Schedule Layers

Schedule layers are the foundation of PagerDuty on-call configurations. Each layer represents a distinct rotation of users that can be stacked on top of each other. The topmost layer with an active user takes precedence.

### Why Use Multiple Layers?

- **Primary and backup coverage**: Layer 1 handles primary on-call, Layer 2 provides backup
- **Business hours vs after-hours**: Different teams can cover different time windows
- **Specialized coverage**: Database experts on one layer, application experts on another

### Creating a Schedule Layer

```yaml
# Example schedule layer configuration
# Layer 1: Primary On-Call Rotation
schedule:
  name: "Backend Team Primary"
  time_zone: "America/New_York"
  layers:
    - name: "Primary"
      # Start date for this layer
      start: "2026-01-01T00:00:00"
      # Rotation interval
      rotation_virtual_start: "2026-01-01T00:00:00"
      rotation_turn_length_seconds: 604800  # 7 days
      users:
        - id: "P123ABC"  # Alice
        - id: "P456DEF"  # Bob
        - id: "P789GHI"  # Charlie
```

Each layer operates independently. When you stack layers, PagerDuty evaluates from top to bottom and assigns the incident to the first layer with an available user during that time slot.

---

## Rotation Types

PagerDuty supports several rotation patterns. Choosing the right one depends on your team size, coverage requirements, and burnout prevention goals.

### Daily Rotations

Best for large teams where you want to spread the load evenly.

```yaml
# Daily rotation: Each person covers one 24-hour period
rotation:
  type: "daily"
  turn_length_seconds: 86400  # 24 hours
  # Rotation starts at 9 AM each day
  handoff_time: "09:00:00"
```

### Weekly Rotations

The most common pattern. One engineer owns the week, reducing context-switching.

```yaml
# Weekly rotation: One week on-call per person
rotation:
  type: "weekly"
  turn_length_seconds: 604800  # 7 days
  # Week starts Monday at 9 AM
  handoff_time: "09:00:00"
  start_day_of_week: 1  # Monday
```

### Custom Rotations

For follow-the-sun or split-shift models.

```yaml
# Custom rotation: 12-hour shifts
rotation:
  type: "custom"
  turn_length_seconds: 43200  # 12 hours
  # Day shift: 6 AM to 6 PM
  # Night shift: 6 PM to 6 AM
  restrictions:
    - type: "daily_restriction"
      start_time_of_day: "06:00:00"
      duration_seconds: 43200
```

### Choosing the Right Rotation

| Team Size | Recommended Rotation | Notes |
|-----------|---------------------|-------|
| 3-4 engineers | Weekly | Longer intervals reduce fatigue |
| 5-8 engineers | Weekly or bi-weekly | Balance between coverage and rest |
| 8+ engineers | Daily or custom shifts | Follow-the-sun becomes viable |
| Global teams | Follow-the-sun | Split by timezone for 24/7 coverage |

---

## Handoff Times

Handoff time determines when on-call responsibility transfers from one person to the next. Getting this right prevents confusion during incident response.

### Best Practices for Handoff Times

1. **Align with work hours**: Schedule handoffs during business hours when both engineers are available
2. **Avoid problematic times**: Never schedule handoffs at midnight, during deployments, or on weekends
3. **Allow overlap**: Build in a 30-minute overlap window for knowledge transfer

```yaml
# Recommended handoff configuration
handoff:
  # Handoff at 10 AM - both shifts are awake and available
  time: "10:00:00"
  timezone: "America/New_York"

  # Optional: Create a 30-minute overlap period
  overlap_minutes: 30

  # Notify both engineers 15 minutes before handoff
  notification_minutes_before: 15
```

### Handoff Checklist

Create a standardized handoff process:

```markdown
## On-Call Handoff Template

### Active Incidents
- [ ] List any ongoing incidents
- [ ] Document current status and next steps

### Recent Changes
- [ ] Deployments in the last 24 hours
- [ ] Configuration changes
- [ ] Known issues or degradations

### Upcoming Events
- [ ] Scheduled maintenance windows
- [ ] Expected high-traffic periods
- [ ] Planned releases
```

---

## Schedule Overrides

Overrides allow temporary changes to the schedule without modifying the underlying rotation. Use them for vacations, sick days, or shift swaps.

### Creating an Override

```bash
# Using PagerDuty CLI to create an override
pd schedule override create \
  --schedule-id "PSCHEDULE1" \
  --start "2026-02-01T09:00:00-05:00" \
  --end "2026-02-08T09:00:00-05:00" \
  --user-id "PUSER123"
```

### Override via API

```python
# Python example: Create a schedule override
import requests
from datetime import datetime, timedelta

def create_override(schedule_id, user_id, start_time, end_time, api_key):
    """
    Create a schedule override in PagerDuty.

    Args:
        schedule_id: The PagerDuty schedule ID
        user_id: The user who will cover this override
        start_time: Override start (ISO 8601 format)
        end_time: Override end (ISO 8601 format)
        api_key: Your PagerDuty API key

    Returns:
        The created override object
    """
    url = f"https://api.pagerduty.com/schedules/{schedule_id}/overrides"

    headers = {
        "Authorization": f"Token token={api_key}",
        "Content-Type": "application/json",
        "Accept": "application/vnd.pagerduty+json;version=2"
    }

    payload = {
        "override": {
            "start": start_time,
            "end": end_time,
            "user": {
                "id": user_id,
                "type": "user_reference"
            }
        }
    }

    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    return response.json()

# Example usage
override = create_override(
    schedule_id="PSCHEDULE1",
    user_id="PUSER456",
    start_time="2026-02-01T09:00:00-05:00",
    end_time="2026-02-08T09:00:00-05:00",
    api_key="your-api-key"
)
```

### Managing Override Requests

Build a simple Slack workflow for override requests:

```python
# Slack bot handler for override requests
def handle_override_request(requesting_user, covering_user, start, end):
    """
    Process an override request from Slack.

    1. Validate the covering user is available
    2. Create the override in PagerDuty
    3. Notify both users
    4. Update the team calendar
    """
    # Check if covering user has conflicts
    conflicts = check_schedule_conflicts(covering_user, start, end)

    if conflicts:
        return f"Cannot create override: {covering_user} has conflicts"

    # Create the override
    override = create_override(
        schedule_id=get_team_schedule(),
        user_id=covering_user,
        start_time=start,
        end_time=end,
        api_key=get_api_key()
    )

    # Send notifications
    notify_user(requesting_user, f"Override approved: {covering_user} will cover")
    notify_user(covering_user, f"You are covering for {requesting_user}")

    return "Override created successfully"
```

---

## Escalation Policies

Escalation policies define what happens when an incident is not acknowledged. They chain together schedules and users to ensure incidents always reach someone.

### Basic Escalation Policy Structure

```yaml
# Three-tier escalation policy
escalation_policy:
  name: "Backend Service Escalation"
  # Number of times to repeat the entire policy
  num_loops: 2

  escalation_rules:
    # Level 1: Primary on-call
    - escalation_delay_in_minutes: 5
      targets:
        - type: "schedule_reference"
          id: "PSCHEDULE_PRIMARY"

    # Level 2: Secondary on-call + Team Lead
    - escalation_delay_in_minutes: 10
      targets:
        - type: "schedule_reference"
          id: "PSCHEDULE_SECONDARY"
        - type: "user_reference"
          id: "PUSER_TEAMLEAD"

    # Level 3: Engineering Manager
    - escalation_delay_in_minutes: 15
      targets:
        - type: "user_reference"
          id: "PUSER_ENGMANAGER"
```

### Escalation Timing Best Practices

| Escalation Level | Delay | Who | Purpose |
|-----------------|-------|-----|---------|
| Level 1 | 0 min | Primary on-call | Immediate response |
| Level 2 | 5 min | Secondary on-call | Backup if primary unavailable |
| Level 3 | 15 min | Team lead | Awareness and coordination |
| Level 4 | 30 min | Engineering manager | Executive visibility |

### Creating an Escalation Policy via API

```python
# Create a complete escalation policy
def create_escalation_policy(name, schedule_ids, manager_id, api_key):
    """
    Create a multi-tier escalation policy.

    Args:
        name: Policy name
        schedule_ids: List of schedule IDs [primary, secondary]
        manager_id: User ID for final escalation
        api_key: PagerDuty API key

    Returns:
        The created escalation policy
    """
    url = "https://api.pagerduty.com/escalation_policies"

    headers = {
        "Authorization": f"Token token={api_key}",
        "Content-Type": "application/json",
        "Accept": "application/vnd.pagerduty+json;version=2"
    }

    payload = {
        "escalation_policy": {
            "name": name,
            "escalation_rules": [
                {
                    # Primary on-call - immediate
                    "escalation_delay_in_minutes": 5,
                    "targets": [{
                        "id": schedule_ids[0],
                        "type": "schedule_reference"
                    }]
                },
                {
                    # Secondary on-call - 5 minute delay
                    "escalation_delay_in_minutes": 10,
                    "targets": [{
                        "id": schedule_ids[1],
                        "type": "schedule_reference"
                    }]
                },
                {
                    # Manager - 10 minute delay
                    "escalation_delay_in_minutes": 15,
                    "targets": [{
                        "id": manager_id,
                        "type": "user_reference"
                    }]
                }
            ],
            "num_loops": 2,  # Repeat twice before giving up
            "on_call_handoff_notifications": "if_has_services"
        }
    }

    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    return response.json()
```

---

## API Automation

Automating schedule management via the PagerDuty API reduces manual work and prevents configuration drift.

### Authentication Setup

```python
# PagerDuty API client setup
import os
import requests
from typing import Optional, Dict, List

class PagerDutyClient:
    """
    A simple PagerDuty API client for schedule management.
    """

    BASE_URL = "https://api.pagerduty.com"

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the client with an API key.

        Args:
            api_key: PagerDuty API token. Falls back to
                     PAGERDUTY_API_KEY environment variable.
        """
        self.api_key = api_key or os.environ.get("PAGERDUTY_API_KEY")
        if not self.api_key:
            raise ValueError("API key required")

        self.headers = {
            "Authorization": f"Token token={self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/vnd.pagerduty+json;version=2"
        }

    def _request(self, method: str, endpoint: str, **kwargs) -> Dict:
        """Make an API request."""
        url = f"{self.BASE_URL}{endpoint}"
        response = requests.request(method, url, headers=self.headers, **kwargs)
        response.raise_for_status()
        return response.json()

    def list_schedules(self) -> List[Dict]:
        """Get all schedules."""
        return self._request("GET", "/schedules")["schedules"]

    def get_schedule(self, schedule_id: str) -> Dict:
        """Get a specific schedule."""
        return self._request("GET", f"/schedules/{schedule_id}")["schedule"]

    def get_oncall(self, schedule_id: str) -> Dict:
        """Get current on-call user for a schedule."""
        params = {"schedule_ids[]": schedule_id}
        oncalls = self._request("GET", "/oncalls", params=params)["oncalls"]
        return oncalls[0] if oncalls else None
```

### Automated Schedule Rotation Report

```python
# Generate weekly on-call report
from datetime import datetime, timedelta

def generate_oncall_report(client: PagerDutyClient, schedule_ids: List[str]):
    """
    Generate a report of who was on-call and incident counts.

    Args:
        client: PagerDutyClient instance
        schedule_ids: List of schedule IDs to report on

    Returns:
        Formatted report string
    """
    report_lines = ["# Weekly On-Call Report", ""]

    # Get date range for last week
    end = datetime.now()
    start = end - timedelta(days=7)

    for schedule_id in schedule_ids:
        schedule = client.get_schedule(schedule_id)
        report_lines.append(f"## {schedule['name']}")

        # Get who was on-call during this period
        params = {
            "since": start.isoformat(),
            "until": end.isoformat(),
            "schedule_ids[]": schedule_id
        }
        oncalls = client._request("GET", "/oncalls", params=params)["oncalls"]

        for oncall in oncalls:
            user = oncall["user"]["summary"]
            start_time = oncall["start"]
            end_time = oncall["end"]
            report_lines.append(f"- {user}: {start_time} to {end_time}")

        report_lines.append("")

    return "\n".join(report_lines)
```

### Terraform Integration

For infrastructure-as-code management of PagerDuty schedules:

```hcl
# Terraform configuration for PagerDuty schedule
terraform {
  required_providers {
    pagerduty = {
      source  = "PagerDuty/pagerduty"
      version = "~> 3.0"
    }
  }
}

provider "pagerduty" {
  # Token set via PAGERDUTY_TOKEN environment variable
}

# Define team members
data "pagerduty_user" "oncall_engineers" {
  for_each = toset([
    "alice@example.com",
    "bob@example.com",
    "charlie@example.com"
  ])
  email = each.value
}

# Create the on-call schedule
resource "pagerduty_schedule" "primary" {
  name      = "Backend Primary On-Call"
  time_zone = "America/New_York"

  layer {
    name                         = "Primary Rotation"
    start                        = "2026-01-01T09:00:00-05:00"
    rotation_virtual_start       = "2026-01-01T09:00:00-05:00"
    rotation_turn_length_seconds = 604800  # 7 days

    users = [for user in data.pagerduty_user.oncall_engineers : user.id]
  }
}

# Create escalation policy
resource "pagerduty_escalation_policy" "backend" {
  name      = "Backend Escalation"
  num_loops = 2

  rule {
    escalation_delay_in_minutes = 5
    target {
      type = "schedule_reference"
      id   = pagerduty_schedule.primary.id
    }
  }
}
```

---

## Best Practices Summary

### Schedule Design

- **Keep rotations predictable**: Publish schedules at least 4-6 weeks in advance
- **Balance load fairly**: Track on-call hours per engineer monthly
- **Provide adequate rest**: Minimum 7 days between on-call shifts for weekly rotations
- **Use schedule layers**: Separate primary and backup coverage cleanly

### Handoffs and Overrides

- **Schedule handoffs during business hours**: Both engineers should be awake and available
- **Document handoff procedures**: Create a checklist for knowledge transfer
- **Make overrides easy**: Build self-service tools for shift swaps
- **Track override patterns**: Frequent overrides may indicate schedule problems

### Escalation Policies

- **Start with the right schedule**: Ensure primary on-call is properly configured
- **Set reasonable timeouts**: 5-10 minutes between escalation levels
- **Include management visibility**: Escalate to leadership after 30 minutes
- **Test your escalations**: Run fire drills to verify the chain works

### Automation

- **Version control configurations**: Use Terraform or similar for schedule definitions
- **Automate reporting**: Weekly summaries of on-call load and incidents
- **Integrate with calendars**: Sync schedules with Google Calendar or Outlook
- **Build self-service tools**: Slack bots for common operations reduce friction

### Monitoring Schedule Health

Track these metrics to ensure your on-call program remains sustainable:

| Metric | Target | Action if Exceeded |
|--------|--------|--------------------|
| Pages per shift | Less than 10 | Review alert thresholds |
| After-hours pages | Less than 2 per week | Improve reliability or coverage |
| Time to acknowledge | Less than 5 minutes | Review notification settings |
| Escalation rate | Less than 10% | Verify primary coverage |
| Override frequency | Less than 20% | Adjust base schedule |

---

## Conclusion

Effective on-call scheduling in PagerDuty requires thoughtful configuration of schedule layers, rotation types, handoff times, overrides, and escalation policies. By automating management tasks via the API and following established best practices, you can build a sustainable on-call program that keeps your services reliable without burning out your team.

For a unified approach to incident management, monitoring, and on-call scheduling with an open-source solution, check out [OneUptime](https://oneuptime.com). It provides integrated alerting, status pages, and on-call management in a single platform.
