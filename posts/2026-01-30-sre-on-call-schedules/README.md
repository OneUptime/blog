# How to Create On-Call Schedules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: SRE, On-Call, Scheduling, Operations

Description: Design effective on-call schedules that balance coverage, fairness, and engineer wellbeing with rotation patterns and handoff procedures.

---

On-call schedules determine who responds when production systems break at 3 AM. A well-designed schedule ensures coverage without burning out your team. This guide covers rotation patterns, handoff procedures, compensation models, and automation to help you build schedules that work for both your systems and your people.

## Why On-Call Schedule Design Matters

| Problem | Impact | Solution |
|---------|--------|----------|
| Uneven distribution | Burnout, resentment, turnover | Fair rotation algorithms |
| Poor handoffs | Dropped context, slower response | Structured handoff procedures |
| No compensation | Low morale, on-call avoidance | Clear compensation policy |
| Coverage gaps | Incidents with no responder | Automated gap detection |
| Alert fatigue | Ignored pages, slow MTTA | Noise reduction, alert hygiene |

The goal: predictable schedules with primary and secondary coverage, fair distribution, and clear escalation paths.

---

## Rotation Pattern Options

### Weekly Rotation

The most common pattern. One engineer owns primary on-call for a full week.

| Day | Primary | Secondary |
|-----|---------|-----------|
| Mon-Sun Week 1 | Alice | Bob |
| Mon-Sun Week 2 | Bob | Carol |
| Mon-Sun Week 3 | Carol | Dave |
| Mon-Sun Week 4 | Dave | Alice |

**Pros:**
- Simple to understand and implement
- Clear ownership for the entire week
- Fewer handoffs (only 1 per week)

**Cons:**
- Long stretches of responsibility
- One bad week can exhaust an engineer
- Harder for part-time or distributed teams

**Best for:** Teams of 4-8 engineers, services with moderate incident volume.

### Daily Rotation

Engineers rotate every 24 hours.

| Day | Primary | Secondary |
|-----|---------|-----------|
| Monday | Alice | Bob |
| Tuesday | Bob | Carol |
| Wednesday | Carol | Dave |
| Thursday | Dave | Alice |
| Friday | Alice | Bob |

**Pros:**
- Shorter commitment periods
- Less exhausting if incidents are frequent
- Easier to swap shifts

**Cons:**
- Daily handoffs increase context loss
- More coordination overhead
- Harder to track issues across days

**Best for:** High-incident-volume services, teams wanting to spread load evenly.

### Follow-the-Sun Rotation

Global teams hand off on-call as the workday moves around the planet.

| Time (UTC) | Region | Primary |
|------------|--------|---------|
| 00:00-08:00 | APAC | Kenji (Tokyo) |
| 08:00-16:00 | EMEA | Priya (London) |
| 16:00-24:00 | Americas | Alex (New York) |

**Pros:**
- No overnight pages
- Engineers work during their normal hours
- Better quality of life

**Cons:**
- Requires teams in multiple time zones
- Complex handoff coordination
- Different team cultures and processes

**Best for:** Companies with global engineering presence and 24/7 SLA requirements.

### Hybrid Pattern

Combine patterns based on service criticality or time of day.

This example shows business hours coverage by primary, with best-effort overnight.

| Time | Coverage Type | Responder |
|------|---------------|-----------|
| 09:00-18:00 | Primary | Weekly rotation engineer |
| 18:00-09:00 | Secondary | Manager escalation only |
| Weekends | Best effort | Volunteer with comp time |

**Best for:** Startups, internal tools, services without 24/7 SLAs.

---

## Schedule Configuration Examples

### YAML Schedule Definition

Define your on-call schedule in a configuration file that can be version-controlled.

```yaml
# on-call-schedule.yaml
# Configuration for the platform team on-call rotation

schedule:
  name: "Platform Team On-Call"
  timezone: "America/New_York"

  # Rotation configuration
  rotation:
    type: weekly
    handoff_day: monday
    handoff_time: "09:00"

  # Team members in rotation order
  members:
    - id: alice
      name: "Alice Chen"
      email: "alice@company.com"
      phone: "+1-555-0101"
      slack: "@alice"

    - id: bob
      name: "Bob Smith"
      email: "bob@company.com"
      phone: "+1-555-0102"
      slack: "@bob"

    - id: carol
      name: "Carol Davis"
      email: "carol@company.com"
      phone: "+1-555-0103"
      slack: "@carol"

    - id: dave
      name: "Dave Wilson"
      email: "dave@company.com"
      phone: "+1-555-0104"
      slack: "@dave"

  # Coverage requirements
  coverage:
    primary: 1
    secondary: 1
    # Secondary is the next person in rotation
    secondary_offset: 1

  # Escalation configuration
  escalation:
    primary_timeout_minutes: 5
    secondary_timeout_minutes: 10
    manager_escalation: true
    manager:
      name: "Emily Manager"
      email: "emily@company.com"
      phone: "+1-555-0100"

  # Override rules
  overrides:
    # Company holidays - reduced coverage
    - name: "Christmas"
      start: "2026-12-25T00:00:00"
      end: "2026-12-26T00:00:00"
      coverage: best_effort

    # Scheduled maintenance - primary only
    - name: "Monthly Maintenance Window"
      recurrence: "0 2 1 * *"  # First of month at 2 AM
      duration_hours: 4
      suppress_alerts: true
```

### Follow-the-Sun Configuration

A schedule definition for teams distributed across multiple regions.

```yaml
# follow-the-sun-schedule.yaml
# 24/7 coverage using regional teams

schedule:
  name: "Global Platform On-Call"

  regions:
    - name: "APAC"
      timezone: "Asia/Tokyo"
      coverage_hours:
        start: "09:00"
        end: "17:00"
      members:
        - id: kenji
          name: "Kenji Tanaka"
          email: "kenji@company.com"
        - id: yuki
          name: "Yuki Sato"
          email: "yuki@company.com"
      rotation: weekly

    - name: "EMEA"
      timezone: "Europe/London"
      coverage_hours:
        start: "09:00"
        end: "17:00"
      members:
        - id: priya
          name: "Priya Sharma"
          email: "priya@company.com"
        - id: james
          name: "James Brown"
          email: "james@company.com"
      rotation: weekly

    - name: "Americas"
      timezone: "America/New_York"
      coverage_hours:
        start: "09:00"
        end: "17:00"
      members:
        - id: alex
          name: "Alex Johnson"
          email: "alex@company.com"
        - id: maria
          name: "Maria Garcia"
          email: "maria@company.com"
      rotation: weekly

  # Handoff configuration
  handoff:
    overlap_minutes: 30
    require_sync: true
    sync_channel: "#oncall-handoff"

  # Global escalation
  escalation:
    regional_manager_first: true
    global_escalation_after_minutes: 30
```

### Python Schedule Generator

Automate schedule generation and distribution with a Python script.

```python
#!/usr/bin/env python3
"""
on_call_scheduler.py
Generate on-call schedules with fair distribution and gap detection.
"""

from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import Optional
import json


@dataclass
class Engineer:
    """Represents an on-call engineer."""
    id: str
    name: str
    email: str
    phone: str
    # Track on-call load for fairness
    shifts_this_quarter: int = 0
    weekend_shifts_this_quarter: int = 0
    # Availability exceptions
    unavailable_dates: list = None

    def __post_init__(self):
        if self.unavailable_dates is None:
            self.unavailable_dates = []


@dataclass
class Shift:
    """Represents a single on-call shift."""
    start: datetime
    end: datetime
    primary: Engineer
    secondary: Engineer
    is_weekend: bool = False
    is_holiday: bool = False


class OnCallScheduler:
    """
    Generate and manage on-call schedules.

    Features:
    - Fair distribution across team members
    - Weekend shift balancing
    - PTO and unavailability handling
    - Gap detection
    - Overlap validation
    """

    def __init__(self, engineers: list[Engineer], rotation_days: int = 7):
        self.engineers = engineers
        self.rotation_days = rotation_days
        self.shifts: list[Shift] = []

    def generate_schedule(
        self,
        start_date: datetime,
        weeks: int = 12
    ) -> list[Shift]:
        """
        Generate an on-call schedule for the specified period.

        Args:
            start_date: When the schedule begins
            weeks: Number of weeks to generate

        Returns:
            List of Shift objects
        """
        self.shifts = []
        current_date = start_date

        # Sort engineers by least shifts for fairness
        available = sorted(
            self.engineers,
            key=lambda e: (e.shifts_this_quarter, e.weekend_shifts_this_quarter)
        )

        primary_index = 0

        for week in range(weeks):
            shift_start = current_date
            shift_end = current_date + timedelta(days=self.rotation_days)

            # Find available primary
            primary = self._find_available_engineer(
                available, primary_index, shift_start, shift_end
            )

            # Secondary is next in rotation
            secondary_index = (available.index(primary) + 1) % len(available)
            secondary = self._find_available_engineer(
                available, secondary_index, shift_start, shift_end
            )

            # Create the shift
            shift = Shift(
                start=shift_start,
                end=shift_end,
                primary=primary,
                secondary=secondary,
                is_weekend=self._includes_weekend(shift_start, shift_end)
            )

            self.shifts.append(shift)

            # Update counters
            primary.shifts_this_quarter += 1
            if shift.is_weekend:
                primary.weekend_shifts_this_quarter += 1

            # Move to next week
            current_date = shift_end
            primary_index = (primary_index + 1) % len(available)

        return self.shifts

    def _find_available_engineer(
        self,
        engineers: list[Engineer],
        start_index: int,
        shift_start: datetime,
        shift_end: datetime
    ) -> Engineer:
        """Find an available engineer starting from the given index."""
        for i in range(len(engineers)):
            index = (start_index + i) % len(engineers)
            engineer = engineers[index]

            if self._is_available(engineer, shift_start, shift_end):
                return engineer

        # No one available - this is a coverage gap
        raise ValueError(
            f"No engineer available for {shift_start} to {shift_end}"
        )

    def _is_available(
        self,
        engineer: Engineer,
        start: datetime,
        end: datetime
    ) -> bool:
        """Check if engineer is available for the given period."""
        for unavailable in engineer.unavailable_dates:
            # Check for overlap
            if unavailable['start'] < end and unavailable['end'] > start:
                return False
        return True

    def _includes_weekend(self, start: datetime, end: datetime) -> bool:
        """Check if the shift includes weekend days."""
        current = start
        while current < end:
            if current.weekday() >= 5:  # Saturday = 5, Sunday = 6
                return True
            current += timedelta(days=1)
        return False

    def detect_gaps(self) -> list[dict]:
        """Detect coverage gaps in the schedule."""
        gaps = []

        for i in range(len(self.shifts) - 1):
            current_end = self.shifts[i].end
            next_start = self.shifts[i + 1].start

            if next_start > current_end:
                gaps.append({
                    'start': current_end,
                    'end': next_start,
                    'duration_hours': (next_start - current_end).total_seconds() / 3600
                })

        return gaps

    def get_load_distribution(self) -> dict:
        """Get the distribution of shifts across engineers."""
        distribution = {}

        for engineer in self.engineers:
            distribution[engineer.name] = {
                'total_shifts': engineer.shifts_this_quarter,
                'weekend_shifts': engineer.weekend_shifts_this_quarter,
                'total_hours': engineer.shifts_this_quarter * self.rotation_days * 24
            }

        return distribution

    def export_to_json(self, filepath: str):
        """Export the schedule to JSON format."""
        schedule_data = {
            'generated_at': datetime.now().isoformat(),
            'rotation_days': self.rotation_days,
            'shifts': [
                {
                    'start': shift.start.isoformat(),
                    'end': shift.end.isoformat(),
                    'primary': {
                        'name': shift.primary.name,
                        'email': shift.primary.email,
                        'phone': shift.primary.phone
                    },
                    'secondary': {
                        'name': shift.secondary.name,
                        'email': shift.secondary.email,
                        'phone': shift.secondary.phone
                    }
                }
                for shift in self.shifts
            ]
        }

        with open(filepath, 'w') as f:
            json.dump(schedule_data, f, indent=2)


# Example usage
if __name__ == '__main__':
    # Define team members
    team = [
        Engineer(
            id='alice',
            name='Alice Chen',
            email='alice@company.com',
            phone='+1-555-0101'
        ),
        Engineer(
            id='bob',
            name='Bob Smith',
            email='bob@company.com',
            phone='+1-555-0102',
            unavailable_dates=[
                {
                    'start': datetime(2026, 2, 15),
                    'end': datetime(2026, 2, 22),
                    'reason': 'PTO'
                }
            ]
        ),
        Engineer(
            id='carol',
            name='Carol Davis',
            email='carol@company.com',
            phone='+1-555-0103'
        ),
        Engineer(
            id='dave',
            name='Dave Wilson',
            email='dave@company.com',
            phone='+1-555-0104'
        ),
    ]

    # Generate schedule
    scheduler = OnCallScheduler(team, rotation_days=7)
    schedule = scheduler.generate_schedule(
        start_date=datetime(2026, 2, 1),
        weeks=12
    )

    # Check for gaps
    gaps = scheduler.detect_gaps()
    if gaps:
        print(f"Warning: Found {len(gaps)} coverage gaps")
        for gap in gaps:
            print(f"  {gap['start']} to {gap['end']}")

    # Show distribution
    print("\nLoad Distribution:")
    for name, stats in scheduler.get_load_distribution().items():
        print(f"  {name}: {stats['total_shifts']} shifts, "
              f"{stats['weekend_shifts']} weekends")

    # Export
    scheduler.export_to_json('schedule.json')
```

---

## Handoff Procedures

A good handoff transfers context, not just responsibility. Without proper handoffs, the incoming on-call engineer starts from zero when an incident occurs.

### Handoff Checklist

Before every rotation change, the outgoing engineer should cover:

| Item | Description | Example |
|------|-------------|---------|
| Active incidents | Any ongoing issues | "Payment service is degraded, ETA 2 hours" |
| Recent deploys | What changed this week | "v2.3.1 rolled out Tuesday, watch for latency" |
| Known issues | Problems that might page | "Disk alert on db-03 is flapping" |
| Scheduled work | Maintenance windows coming | "Redis upgrade Sunday 2 AM" |
| Runbook updates | New or changed procedures | "Added rollback steps for auth service" |

### Handoff Document Template

Create a shared document or Slack post for each handoff.

```markdown
# On-Call Handoff: Week of Feb 2, 2026

## Outgoing: Alice Chen
## Incoming: Bob Smith

---

### Active Incidents
- None currently open

### Recent Deployments
| Service | Version | Deployed | Notes |
|---------|---------|----------|-------|
| api-gateway | v4.2.1 | Feb 1 | New rate limiting |
| user-service | v3.0.0 | Jan 30 | Breaking change in /users endpoint |

### Known Issues
- **db-replica-02**: Replication lag alerts are noisy. Safe to snooze for
  10 minutes, auto-resolves. Ticket: OPS-1234
- **cdn-cache**: Cache invalidation taking longer than usual after last
  week's config change. Monitoring, not actionable yet.

### Upcoming Maintenance
- **Sunday Feb 8, 02:00-04:00 UTC**: Database maintenance window
  - Alerts suppressed
  - Runbook: [DB Maintenance Playbook](link)

### Runbook Updates
- Added new section to [API Gateway Runbook](link) for rate limit tuning
- Updated [Deployment Rollback](link) with new Helm commands

### Things to Watch
- Marketing campaign launches Wednesday, expect 2x traffic spike
- New customer onboarding Friday, large data import expected

### Questions or Context Needed?
Reach me on Slack @alice until Tuesday if anything is unclear.

---
Handoff completed: Feb 2, 2026 09:15 UTC
```

### Automated Handoff Reminders

Set up automated notifications to ensure handoffs happen.

```python
#!/usr/bin/env python3
"""
handoff_reminder.py
Send automated handoff reminders before rotation changes.
"""

import requests
from datetime import datetime, timedelta


def send_slack_reminder(
    outgoing: dict,
    incoming: dict,
    handoff_time: datetime,
    slack_webhook: str
):
    """
    Send a Slack reminder for upcoming handoff.

    Args:
        outgoing: Outgoing engineer details
        incoming: Incoming engineer details
        handoff_time: When the handoff occurs
        slack_webhook: Slack webhook URL
    """
    message = {
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "On-Call Handoff Reminder"
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Outgoing:* {outgoing['name']}"
                    },
                    {
                        "type": "mrkdwn",
                        "text": f"*Incoming:* {incoming['name']}"
                    }
                ]
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"Handoff scheduled for *{handoff_time.strftime('%A, %B %d at %H:%M %Z')}*"
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": (
                        "*Handoff Checklist:*\n"
                        "- [ ] Active incidents reviewed\n"
                        "- [ ] Recent deployments discussed\n"
                        "- [ ] Known issues documented\n"
                        "- [ ] Upcoming maintenance noted\n"
                        "- [ ] Runbook updates shared"
                    )
                }
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "View Schedule"
                        },
                        "url": "https://oneuptime.com/dashboard/on-call"
                    },
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "Handoff Doc Template"
                        },
                        "url": "https://wiki.company.com/oncall-handoff"
                    }
                ]
            }
        ]
    }

    response = requests.post(slack_webhook, json=message)
    response.raise_for_status()


def send_handoff_reminders(schedule: list, slack_webhook: str):
    """
    Send reminders for all upcoming handoffs in the next 48 hours.

    Args:
        schedule: List of shift dictionaries
        slack_webhook: Slack webhook URL
    """
    now = datetime.now()
    reminder_window = now + timedelta(hours=48)

    for i, shift in enumerate(schedule):
        handoff_time = datetime.fromisoformat(shift['start'])

        # Skip past handoffs
        if handoff_time < now:
            continue

        # Skip handoffs outside reminder window
        if handoff_time > reminder_window:
            continue

        # Get outgoing engineer from previous shift
        if i > 0:
            outgoing = schedule[i - 1]['primary']
        else:
            outgoing = {'name': 'Previous rotation'}

        incoming = shift['primary']

        send_slack_reminder(outgoing, incoming, handoff_time, slack_webhook)


if __name__ == '__main__':
    import json

    with open('schedule.json', 'r') as f:
        schedule_data = json.load(f)

    send_handoff_reminders(
        schedule_data['shifts'],
        slack_webhook='https://hooks.slack.com/services/xxx/yyy/zzz'
    )
```

---

## Escalation Policies

When the primary on-call engineer does not respond, escalation policies define who gets paged next and when.

### Escalation Tiers

| Tier | Who | Timeout | Method |
|------|-----|---------|--------|
| 1 | Primary on-call | 0 min | Page (SMS + push notification) |
| 2 | Secondary on-call | 5 min | Page (SMS + push notification) |
| 3 | Team lead | 15 min | Page + phone call |
| 4 | Engineering manager | 25 min | Phone call |
| 5 | VP Engineering | 35 min | Phone call |

### Escalation Policy Configuration

Define escalation policies in your incident management system.

```yaml
# escalation-policy.yaml
# Multi-tier escalation for production incidents

policies:
  - name: "Platform Critical"
    description: "Escalation for critical platform incidents"

    # Repeat the entire policy if no one acknowledges
    repeat_policy: true
    repeat_after_minutes: 60

    tiers:
      - level: 1
        delay_minutes: 0
        targets:
          - type: on_call_schedule
            schedule: "Platform Team On-Call"
            role: primary
        notification_channels:
          - push
          - sms

      - level: 2
        delay_minutes: 5
        targets:
          - type: on_call_schedule
            schedule: "Platform Team On-Call"
            role: secondary
        notification_channels:
          - push
          - sms
          - phone

      - level: 3
        delay_minutes: 15
        targets:
          - type: user
            email: "team-lead@company.com"
        notification_channels:
          - phone

      - level: 4
        delay_minutes: 25
        targets:
          - type: user
            email: "engineering-manager@company.com"
        notification_channels:
          - phone

  - name: "Platform Warning"
    description: "Escalation for warning-level platform alerts"

    repeat_policy: false

    tiers:
      - level: 1
        delay_minutes: 0
        targets:
          - type: on_call_schedule
            schedule: "Platform Team On-Call"
            role: primary
        notification_channels:
          - push

      - level: 2
        delay_minutes: 15
        targets:
          - type: on_call_schedule
            schedule: "Platform Team On-Call"
            role: secondary
        notification_channels:
          - push
          - sms
```

### Severity-Based Routing

Route incidents to different escalation policies based on severity.

| Severity | Response Time SLA | Escalation Policy | Examples |
|----------|-------------------|-------------------|----------|
| SEV1 - Critical | 5 minutes | Platform Critical | Complete outage, data loss |
| SEV2 - High | 15 minutes | Platform Critical | Major feature unavailable |
| SEV3 - Medium | 1 hour | Platform Warning | Degraded performance |
| SEV4 - Low | Next business day | None (ticket) | Cosmetic issues |

---

## On-Call Compensation

Engineers who carry the pager deserve recognition. Compensation models vary, but transparency is essential.

### Compensation Models

| Model | Description | Pros | Cons |
|-------|-------------|------|------|
| **Flat rate** | Fixed amount per shift | Simple, predictable | Does not account for incident load |
| **Per-incident** | Paid per acknowledged page | Rewards actual work | Can discourage thorough investigation |
| **Comp time** | Time off after on-call | Promotes recovery | Scheduling complexity |
| **Salary premium** | Higher base for on-call teams | Stable income | May feel mandatory |
| **Hybrid** | Flat rate + per-incident bonus | Balances fairness and workload | More complex to administer |

### Example Compensation Structure

This structure combines base compensation with workload-based bonuses.

```
On-Call Compensation Policy
---------------------------

Base Rate:
- Weekday on-call shift (24h): $100
- Weekend on-call shift (24h): $150
- Holiday on-call shift (24h): $200

Incident Response Bonus:
- Per acknowledged incident: $25
- Night incident (10 PM - 6 AM): Additional $25
- Incident lasting > 1 hour: Additional $50

Comp Time:
- After 7-day rotation: 1 comp day (to be taken within 30 days)
- After weekend on-call: Half comp day

Monthly Cap: None (we pay for all work performed)

Payment Schedule: Monthly, with regular payroll
```

### Tracking Compensation

Automate compensation tracking by integrating with your incident management system.

```python
#!/usr/bin/env python3
"""
oncall_compensation.py
Calculate on-call compensation based on shifts and incidents.
"""

from datetime import datetime, time
from dataclasses import dataclass


@dataclass
class CompensationRates:
    """Compensation rates configuration."""
    weekday_shift: float = 100.0
    weekend_shift: float = 150.0
    holiday_shift: float = 200.0
    per_incident: float = 25.0
    night_bonus: float = 25.0
    long_incident_bonus: float = 50.0
    long_incident_threshold_hours: float = 1.0


def calculate_shift_compensation(
    shift_start: datetime,
    shift_end: datetime,
    incidents: list[dict],
    rates: CompensationRates,
    holidays: list[datetime] = None
) -> dict:
    """
    Calculate compensation for a single on-call shift.

    Args:
        shift_start: When the shift began
        shift_end: When the shift ended
        incidents: List of incidents with 'acknowledged_at' and 'resolved_at'
        rates: Compensation rates to apply
        holidays: List of holiday dates

    Returns:
        Dictionary with compensation breakdown
    """
    if holidays is None:
        holidays = []

    compensation = {
        'base': 0.0,
        'incident_bonus': 0.0,
        'night_bonus': 0.0,
        'long_incident_bonus': 0.0,
        'total': 0.0,
        'details': []
    }

    # Calculate base rate for each day in shift
    current = shift_start
    while current < shift_end:
        if current.date() in [h.date() for h in holidays]:
            compensation['base'] += rates.holiday_shift
            compensation['details'].append(
                f"{current.date()}: Holiday rate ${rates.holiday_shift}"
            )
        elif current.weekday() >= 5:  # Weekend
            compensation['base'] += rates.weekend_shift
            compensation['details'].append(
                f"{current.date()}: Weekend rate ${rates.weekend_shift}"
            )
        else:
            compensation['base'] += rates.weekday_shift
            compensation['details'].append(
                f"{current.date()}: Weekday rate ${rates.weekday_shift}"
            )

        current = datetime.combine(
            current.date(),
            time(0, 0)
        ) + timedelta(days=1)

    # Calculate incident bonuses
    night_start = time(22, 0)  # 10 PM
    night_end = time(6, 0)     # 6 AM

    for incident in incidents:
        ack_time = datetime.fromisoformat(incident['acknowledged_at'])
        resolved_time = datetime.fromisoformat(incident['resolved_at'])

        # Per-incident bonus
        compensation['incident_bonus'] += rates.per_incident

        # Night bonus
        ack_hour = ack_time.time()
        if ack_hour >= night_start or ack_hour <= night_end:
            compensation['night_bonus'] += rates.night_bonus
            compensation['details'].append(
                f"Night incident at {ack_time}: +${rates.night_bonus}"
            )

        # Long incident bonus
        duration_hours = (resolved_time - ack_time).total_seconds() / 3600
        if duration_hours > rates.long_incident_threshold_hours:
            compensation['long_incident_bonus'] += rates.long_incident_bonus
            compensation['details'].append(
                f"Long incident ({duration_hours:.1f}h): +${rates.long_incident_bonus}"
            )

    compensation['total'] = (
        compensation['base'] +
        compensation['incident_bonus'] +
        compensation['night_bonus'] +
        compensation['long_incident_bonus']
    )

    return compensation


# Usage example
from datetime import timedelta

rates = CompensationRates()

shift_comp = calculate_shift_compensation(
    shift_start=datetime(2026, 2, 2, 9, 0),
    shift_end=datetime(2026, 2, 9, 9, 0),
    incidents=[
        {
            'acknowledged_at': '2026-02-03T14:30:00',
            'resolved_at': '2026-02-03T15:00:00'
        },
        {
            'acknowledged_at': '2026-02-05T02:15:00',
            'resolved_at': '2026-02-05T04:30:00'
        },
    ],
    rates=rates
)

print(f"Total compensation: ${shift_comp['total']:.2f}")
for detail in shift_comp['details']:
    print(f"  {detail}")
```

---

## Reducing Burnout

On-call burnout is real. It leads to turnover, slower incident response, and degraded system reliability. Prevention requires deliberate effort.

### Warning Signs

| Signal | What It Looks Like | Action |
|--------|-------------------|--------|
| Increased MTTA | Acknowledgment times creeping up | Review workload distribution |
| Frequent swaps | Engineers asking to trade shifts | Check for uneven incident load |
| Missed pages | Pages going unacknowledged | Investigate root cause immediately |
| Turnover | On-call engineers leaving | Exit interviews, compensation review |
| Quiet quitting | Minimal effort on incidents | 1:1 conversations, reduce load |

### Burnout Prevention Strategies

**1. Cap page volume**

Set a target maximum pages per shift. If exceeded, take action.

```yaml
# Alert thresholds for on-call health
oncall_health:
  targets:
    max_pages_per_week: 10
    max_pages_per_night: 2
    max_incident_duration_hours: 4

  alerts:
    - name: "High page volume"
      condition: "pages_this_week > 10"
      action: "Notify team lead, review alert rules"

    - name: "Night disruption"
      condition: "night_pages > 2"
      action: "Prioritize noise reduction next sprint"
```

**2. Noise reduction sprints**

Dedicate time to fixing noisy alerts.

| Week | Focus | Outcome |
|------|-------|---------|
| 1 | Audit all alerts | List of noisy alerts by frequency |
| 2 | Fix top 5 noisy alerts | Reduced page volume |
| 3 | Improve runbooks | Faster resolution times |
| 4 | Measure improvement | Validate page reduction |

**3. Protected recovery time**

After a heavy on-call week, engineers need time to recover.

- One comp day after every 7-day rotation
- Two comp days after rotations with more than 5 incidents
- No meetings the day after overnight incidents

**4. Fair distribution**

Use tooling to ensure even distribution of shifts and incidents.

```python
def check_distribution_fairness(engineers: list, shifts: list) -> dict:
    """
    Analyze fairness of on-call distribution.

    Returns metrics indicating distribution fairness.
    """
    shift_counts = {}
    incident_counts = {}
    night_incident_counts = {}

    for engineer in engineers:
        shift_counts[engineer.name] = 0
        incident_counts[engineer.name] = 0
        night_incident_counts[engineer.name] = 0

    for shift in shifts:
        shift_counts[shift.primary.name] += 1
        incident_counts[shift.primary.name] += len(shift.incidents)
        night_incident_counts[shift.primary.name] += len([
            i for i in shift.incidents if is_night_incident(i)
        ])

    # Calculate fairness metrics
    shift_variance = calculate_variance(list(shift_counts.values()))
    incident_variance = calculate_variance(list(incident_counts.values()))

    return {
        'shift_counts': shift_counts,
        'incident_counts': incident_counts,
        'night_incident_counts': night_incident_counts,
        'shift_variance': shift_variance,
        'incident_variance': incident_variance,
        'is_fair': shift_variance < 1.0 and incident_variance < 5.0
    }
```

**5. On-call health reviews**

Hold monthly reviews to assess on-call health.

```markdown
# On-Call Health Review - February 2026

## Metrics
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Pages per week (avg) | < 10 | 7.2 | OK |
| MTTA (median) | < 5 min | 3.2 min | OK |
| Night pages | < 2/week | 4.5 | NEEDS ATTENTION |
| Engineer satisfaction | > 7/10 | 6.8 | NEEDS ATTENTION |

## Distribution
| Engineer | Shifts | Incidents | Night Incidents |
|----------|--------|-----------|-----------------|
| Alice | 4 | 12 | 3 |
| Bob | 4 | 18 | 7 |
| Carol | 4 | 10 | 2 |
| Dave | 4 | 14 | 4 |

Bob had significantly more incidents and night pages. Investigate why.

## Action Items
1. Review alerts that page overnight - reduce non-critical night alerts
2. Balance incident distribution - consider service-based routing
3. Add one more engineer to rotation to reduce frequency

## Next Review: March 15, 2026
```

---

## Integrating with OneUptime

OneUptime provides built-in on-call scheduling, escalation policies, and incident management. Here is how to configure it.

### Setting Up On-Call Schedules

1. Navigate to **On-Call Duty** in your project
2. Create a new on-call schedule
3. Add team members to the rotation
4. Set rotation interval (daily, weekly, custom)
5. Configure handoff time and timezone
6. Link to escalation policies

### Configuring Escalation Policies

1. Go to **Escalation Policies**
2. Create tiers with appropriate timeouts
3. Assign on-call schedules or specific users to each tier
4. Configure notification channels (email, SMS, phone, Slack)
5. Set up repeat policies for critical alerts

### Connecting Alerts to Schedules

1. In **Monitors** or **Alerts**, select your alert rule
2. Under escalation, choose your escalation policy
3. Configure severity to route to the appropriate policy
4. Test the integration with a manual alert

### Viewing On-Call Reports

OneUptime provides reports showing:

- Page volume by engineer and time period
- MTTA and MTTR trends
- Incident distribution across team members
- Escalation frequency

Use these reports in your monthly on-call health reviews.

---

## Common Mistakes to Avoid

| Mistake | Why It Hurts | Fix |
|---------|--------------|-----|
| No secondary on-call | Single point of failure | Always have backup coverage |
| Skipping handoffs | Lost context, slower response | Require documented handoffs |
| Alerting on everything | Alert fatigue, ignored pages | SLO-based alerting only |
| No compensation | Resentment, avoidance | Pay for on-call work |
| Static schedules | Does not account for PTO | Automate with availability |
| No escalation | Incidents sit unacknowledged | Multi-tier escalation policies |
| Ignoring burnout | Turnover, degraded response | Monitor and act on warning signs |

---

## Summary

Effective on-call schedules require:

1. **Clear rotation patterns** - Weekly, daily, or follow-the-sun based on team size and SLA requirements
2. **Structured handoffs** - Document active issues, recent changes, and known problems
3. **Multi-tier escalation** - Automatic escalation when primary does not respond
4. **Fair compensation** - Pay engineers for carrying the pager and responding to incidents
5. **Burnout prevention** - Monitor page volume, ensure fair distribution, provide recovery time
6. **Tooling support** - Use platforms like OneUptime to automate scheduling, alerting, and reporting

Start with a simple weekly rotation, add secondary coverage, and iterate based on what the metrics tell you. The goal is reliable incident response without sacrificing engineer wellbeing.

---

## Further Reading

- [Designing an SRE On-Call Rotation Without Burning Out Your Team](https://oneuptime.com/blog/post/2025-11-28-sre-on-call-rotation-design/view)
- [The Ultimate SRE Reliability Checklist](https://oneuptime.com/blog/post/2025-09-10-sre-checklist/view)
- [Effective Incident Postmortem Templates](https://oneuptime.com/blog/post/2025-09-09-effective-incident-postmortem-templates-ready-to-use-examples/view)
- [What is Toil and How to Eliminate It](https://oneuptime.com/blog/post/2025-10-01-what-is-toil-and-how-to-eliminate-it/view)
