# How to Implement Incident Response Procedures

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: SRE, Incident Management, On-Call, Reliability

Description: Build effective incident response procedures with clear roles, communication protocols, and escalation paths for rapid incident resolution.

---

When your production system goes down at 3 AM, the last thing you want is confusion about who does what. Incident response procedures exist to eliminate that chaos. This guide walks through building a complete incident response framework, from defining roles to writing runbooks that actually help during an outage.

## Why Incident Response Procedures Matter

Without documented procedures, incidents become fire drills where everyone runs in different directions. Teams waste time figuring out basics: Who declares the incident? Where do we communicate? When do we escalate?

Good incident response procedures provide:

- Clear ownership at every stage
- Predictable communication patterns
- Faster resolution times
- Reduced stress for on-call engineers
- Better post-incident learning

## Core Roles in Incident Response

Every incident needs defined roles. Here are the essential ones:

| Role | Responsibility | Skills Required |
|------|----------------|-----------------|
| Incident Commander (IC) | Coordinates response, makes decisions, delegates tasks | Leadership, communication, system knowledge |
| Technical Lead | Drives investigation and remediation | Deep technical expertise |
| Communications Lead | Updates stakeholders, manages status page | Clear writing, customer empathy |
| Scribe | Documents timeline, actions, and decisions | Attention to detail, fast typing |
| Subject Matter Expert | Provides specialized knowledge as needed | Domain expertise |

### The Incident Commander Role

The Incident Commander is the single point of coordination during an incident. This person does not fix the problem directly. Instead, they orchestrate the response.

Key responsibilities:

1. Declare the incident and assign severity
2. Assemble the response team
3. Create and manage the incident channel
4. Delegate tasks to team members
5. Make decisions when the team is stuck
6. Authorize changes and rollbacks
7. Declare incident resolution
8. Initiate the post-incident review

Here is a configuration file defining IC responsibilities and escalation triggers:

```yaml
# incident-commander-config.yaml
# Defines the Incident Commander role, responsibilities, and escalation triggers

incident_commander:
  title: "Incident Commander"
  alias: "IC"

  # Core responsibilities during an active incident
  responsibilities:
    - "Open incident channel and invite relevant teams"
    - "Assign severity level based on impact assessment"
    - "Delegate technical investigation to Technical Lead"
    - "Ensure communications lead updates status page every 15 minutes"
    - "Make go/no-go decisions on proposed fixes"
    - "Track time spent in each incident phase"
    - "Call for additional resources when needed"
    - "Declare incident resolved when services restored"

  # When IC should escalate to senior leadership
  escalation_triggers:
    - condition: "Incident duration exceeds 60 minutes"
      action: "Notify Engineering Director"
    - condition: "Customer data potentially exposed"
      action: "Notify Security team and Legal immediately"
    - condition: "Revenue impact exceeds $10,000"
      action: "Notify VP of Engineering and Finance"
    - condition: "Multiple critical systems affected"
      action: "Consider declaring company-wide emergency"

  # IC rotation schedule
  rotation:
    schedule: "weekly"
    handoff_day: "Monday"
    handoff_time: "09:00 UTC"
    backup_required: true
```

### Technical Lead Responsibilities

The Technical Lead focuses entirely on the technical investigation. They work with engineers to identify root cause and implement fixes.

```yaml
# technical-lead-config.yaml
# Configuration for Technical Lead role in incident response

technical_lead:
  title: "Technical Lead"
  alias: "TL"

  responsibilities:
    - "Lead root cause investigation"
    - "Coordinate with Subject Matter Experts"
    - "Propose remediation options to IC"
    - "Implement approved fixes"
    - "Verify service restoration"
    - "Document technical findings for post-mortem"

  # Tools the TL should have immediate access to
  required_access:
    - "Production database read access"
    - "Log aggregation platform"
    - "APM and tracing tools"
    - "Infrastructure dashboards"
    - "Deployment pipeline"

  # Decision authority
  can_authorize:
    - "Rollback to previous deployment"
    - "Scale infrastructure resources"
    - "Enable feature flags"

  requires_ic_approval:
    - "Database schema changes"
    - "Third-party vendor contact"
    - "Customer data access"
```

## Severity Levels

Consistent severity classification ensures appropriate response. Here is a four-level system:

| Severity | Definition | Response Time | Update Frequency | Example |
|----------|------------|---------------|------------------|---------|
| SEV1 | Complete outage, all users affected | Immediate | Every 15 min | Main application down |
| SEV2 | Major feature broken, many users affected | 15 minutes | Every 30 min | Payment processing failing |
| SEV3 | Minor feature broken, some users affected | 1 hour | Every 2 hours | Search returning slow results |
| SEV4 | Cosmetic issue, minimal impact | Next business day | Daily | Typo in UI |

Here is a severity classification script that helps on-call engineers quickly categorize incidents:

```python
#!/usr/bin/env python3
"""
severity_classifier.py

Helps on-call engineers determine incident severity based on impact metrics.
Run this script when you detect an anomaly and need to classify its severity.

Usage: python severity_classifier.py
"""

from dataclasses import dataclass
from enum import Enum
from typing import Optional


class Severity(Enum):
    """Incident severity levels from most to least critical."""
    SEV1 = 1  # Complete outage
    SEV2 = 2  # Major degradation
    SEV3 = 3  # Minor degradation
    SEV4 = 4  # Cosmetic/minimal impact


@dataclass
class IncidentMetrics:
    """Metrics used to determine incident severity."""
    error_rate_percent: float  # Current error rate percentage
    affected_users_percent: float  # Percentage of users impacted
    revenue_impact_per_hour: float  # Estimated revenue loss per hour
    is_security_incident: bool  # Whether security is compromised
    is_data_loss: bool  # Whether data loss occurred
    core_feature_affected: bool  # Whether a core feature is down


def classify_severity(metrics: IncidentMetrics) -> Severity:
    """
    Determine incident severity based on provided metrics.

    Security incidents and data loss automatically escalate to SEV1.
    Otherwise, classification is based on error rates and user impact.
    """

    # Security incidents and data loss are always SEV1
    if metrics.is_security_incident or metrics.is_data_loss:
        return Severity.SEV1

    # High error rate with significant user impact is SEV1
    if metrics.error_rate_percent > 50 and metrics.affected_users_percent > 75:
        return Severity.SEV1

    # Core feature down with moderate impact is SEV1
    if metrics.core_feature_affected and metrics.affected_users_percent > 50:
        return Severity.SEV1

    # Significant revenue impact escalates to SEV1 or SEV2
    if metrics.revenue_impact_per_hour > 10000:
        return Severity.SEV1
    if metrics.revenue_impact_per_hour > 1000:
        return Severity.SEV2

    # Moderate error rates or user impact is SEV2
    if metrics.error_rate_percent > 10 or metrics.affected_users_percent > 25:
        return Severity.SEV2

    # Low but noticeable impact is SEV3
    if metrics.error_rate_percent > 1 or metrics.affected_users_percent > 5:
        return Severity.SEV3

    # Minimal impact is SEV4
    return Severity.SEV4


def get_response_requirements(severity: Severity) -> dict:
    """Return response requirements for each severity level."""

    requirements = {
        Severity.SEV1: {
            "response_time": "Immediate",
            "update_frequency": "Every 15 minutes",
            "required_roles": ["IC", "Technical Lead", "Comms Lead", "Scribe"],
            "status_page": "Major outage banner",
            "leadership_notification": True,
            "bridge_call": True,
        },
        Severity.SEV2: {
            "response_time": "Within 15 minutes",
            "update_frequency": "Every 30 minutes",
            "required_roles": ["IC", "Technical Lead", "Comms Lead"],
            "status_page": "Degraded performance notice",
            "leadership_notification": True,
            "bridge_call": True,
        },
        Severity.SEV3: {
            "response_time": "Within 1 hour",
            "update_frequency": "Every 2 hours",
            "required_roles": ["Technical Lead"],
            "status_page": "Minor issue notice",
            "leadership_notification": False,
            "bridge_call": False,
        },
        Severity.SEV4: {
            "response_time": "Next business day",
            "update_frequency": "Daily",
            "required_roles": ["Assigned engineer"],
            "status_page": "None required",
            "leadership_notification": False,
            "bridge_call": False,
        },
    }

    return requirements[severity]


def main():
    """Interactive severity classification."""

    print("Incident Severity Classifier")
    print("-" * 40)

    # Gather metrics from user input
    metrics = IncidentMetrics(
        error_rate_percent=float(input("Current error rate (%): ")),
        affected_users_percent=float(input("Affected users (%): ")),
        revenue_impact_per_hour=float(input("Revenue impact per hour ($): ")),
        is_security_incident=input("Security incident? (y/n): ").lower() == "y",
        is_data_loss=input("Data loss occurred? (y/n): ").lower() == "y",
        core_feature_affected=input("Core feature affected? (y/n): ").lower() == "y",
    )

    # Classify and display results
    severity = classify_severity(metrics)
    requirements = get_response_requirements(severity)

    print("\n" + "=" * 40)
    print(f"SEVERITY: {severity.name}")
    print("=" * 40)
    print(f"Response time: {requirements['response_time']}")
    print(f"Update frequency: {requirements['update_frequency']}")
    print(f"Required roles: {', '.join(requirements['required_roles'])}")
    print(f"Status page: {requirements['status_page']}")
    print(f"Notify leadership: {requirements['leadership_notification']}")
    print(f"Bridge call needed: {requirements['bridge_call']}")


if __name__ == "__main__":
    main()
```

## Communication Channels

Clear communication channels prevent chaos. Define where different types of communication happen:

| Channel Type | Purpose | Tool Example | Who Participates |
|--------------|---------|--------------|------------------|
| Incident Channel | Real-time coordination | Slack #incident-123 | Response team |
| Bridge Call | Voice coordination for SEV1/SEV2 | Zoom/Meet | Response team |
| Status Page | Customer communication | StatusPage, Cachet | Public |
| Internal Updates | Leadership briefings | Email, Slack #incidents | Leadership, stakeholders |
| Post-Incident | Review and learning | Confluence, Notion | All engineers |

Here is a script that automates incident channel creation:

```bash
#!/bin/bash
# create_incident_channel.sh
#
# Creates a new Slack channel for incident coordination.
# Automatically invites relevant team members and posts initial context.
#
# Prerequisites:
# - SLACK_BOT_TOKEN environment variable set
# - jq installed for JSON parsing
#
# Usage: ./create_incident_channel.sh <incident_id> <severity> <description>

set -euo pipefail

# Validate inputs
if [[ $# -lt 3 ]]; then
    echo "Usage: $0 <incident_id> <severity> <description>"
    echo "Example: $0 INC-2024-0142 SEV1 'Payment processing failing'"
    exit 1
fi

INCIDENT_ID="$1"
SEVERITY="$2"
DESCRIPTION="$3"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Channel name format: incident-YYYYMMDD-id
CHANNEL_NAME="incident-$(date +%Y%m%d)-${INCIDENT_ID,,}"

# Slack API base URL
SLACK_API="https://slack.com/api"

# Create the channel
echo "Creating incident channel: #${CHANNEL_NAME}"
CHANNEL_RESPONSE=$(curl -s -X POST "${SLACK_API}/conversations.create" \
    -H "Authorization: Bearer ${SLACK_BOT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"${CHANNEL_NAME}\"}")

CHANNEL_ID=$(echo "$CHANNEL_RESPONSE" | jq -r '.channel.id')

if [[ "$CHANNEL_ID" == "null" ]]; then
    echo "Error creating channel: $(echo "$CHANNEL_RESPONSE" | jq -r '.error')"
    exit 1
fi

echo "Channel created: ${CHANNEL_ID}"

# Define team members to invite based on severity
# SEV1 and SEV2 get the full response team
# SEV3 and SEV4 get a smaller team
case "$SEVERITY" in
    SEV1|SEV2)
        INVITE_GROUPS="incident-commanders,sre-team,engineering-leads"
        ;;
    SEV3)
        INVITE_GROUPS="sre-team"
        ;;
    *)
        INVITE_GROUPS="on-call"
        ;;
esac

# Post initial incident context
INITIAL_MESSAGE=$(cat <<EOF
:rotating_light: *Incident Declared: ${INCIDENT_ID}*

*Severity:* ${SEVERITY}
*Description:* ${DESCRIPTION}
*Declared at:* ${TIMESTAMP}

---

*Roles:*
- Incident Commander: _unassigned_
- Technical Lead: _unassigned_
- Communications Lead: _unassigned_
- Scribe: _unassigned_

*Quick Links:*
- <https://grafana.example.com|Dashboards>
- <https://logs.example.com|Logs>
- <https://statuspage.example.com/admin|Status Page>
- <https://runbooks.example.com|Runbooks>

---

React with :hand: to claim a role. IC will assign tasks.
EOF
)

curl -s -X POST "${SLACK_API}/chat.postMessage" \
    -H "Authorization: Bearer ${SLACK_BOT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{
        \"channel\": \"${CHANNEL_ID}\",
        \"text\": $(echo "$INITIAL_MESSAGE" | jq -Rs .),
        \"unfurl_links\": false
    }" > /dev/null

# Set channel topic
TOPIC="${SEVERITY} - ${DESCRIPTION} - IC: TBD"
curl -s -X POST "${SLACK_API}/conversations.setTopic" \
    -H "Authorization: Bearer ${SLACK_BOT_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"channel\": \"${CHANNEL_ID}\", \"topic\": \"${TOPIC}\"}" > /dev/null

echo "Incident channel setup complete"
echo "Channel: #${CHANNEL_NAME}"
echo "Link: https://slack.com/app_redirect?channel=${CHANNEL_ID}"
```

## Escalation Matrix

An escalation matrix defines who to contact when issues exceed certain thresholds. Here is a complete escalation configuration:

```yaml
# escalation-matrix.yaml
# Defines escalation paths based on incident characteristics and duration

escalation_matrix:
  # Time-based escalation
  time_based:
    - trigger: "30 minutes without resolution"
      severity: ["SEV1"]
      escalate_to: "Engineering Manager on-call"
      method: "phone"

    - trigger: "60 minutes without resolution"
      severity: ["SEV1"]
      escalate_to: "Director of Engineering"
      method: "phone"

    - trigger: "90 minutes without resolution"
      severity: ["SEV1"]
      escalate_to: "VP of Engineering"
      method: "phone"

    - trigger: "60 minutes without resolution"
      severity: ["SEV2"]
      escalate_to: "Engineering Manager on-call"
      method: "slack"

  # Impact-based escalation
  impact_based:
    - trigger: "Revenue loss exceeds $50,000"
      escalate_to: ["VP of Engineering", "CFO"]
      method: "phone"

    - trigger: "Customer data exposed"
      escalate_to: ["CISO", "Legal", "CEO"]
      method: "phone"
      immediate: true

    - trigger: "SLA breach imminent"
      escalate_to: ["Account Manager", "Customer Success Director"]
      method: "slack"

    - trigger: "Third-party dependency failure"
      escalate_to: "Vendor contact on file"
      method: "email and phone"

  # On-call escalation chain
  on_call_chain:
    primary:
      role: "Primary On-Call Engineer"
      response_time: "5 minutes"
      contact_methods: ["pagerduty", "phone"]

    secondary:
      role: "Secondary On-Call Engineer"
      trigger: "Primary unresponsive for 10 minutes"
      response_time: "5 minutes"
      contact_methods: ["pagerduty", "phone"]

    tertiary:
      role: "Engineering Manager"
      trigger: "Secondary unresponsive for 10 minutes"
      response_time: "10 minutes"
      contact_methods: ["phone"]

  # Contact directory
  contacts:
    engineering_manager:
      name: "Current EM on-call"
      schedule: "pagerduty://schedules/EM_ONCALL"

    director_engineering:
      name: "Sarah Chen"
      phone: "+1-555-0101"
      slack: "@sarah.chen"

    vp_engineering:
      name: "Marcus Johnson"
      phone: "+1-555-0102"
      slack: "@marcus.johnson"

    ciso:
      name: "Alex Rivera"
      phone: "+1-555-0103"
      slack: "@alex.rivera"
      emergency_only: true
```

## Status Page Updates

Keeping customers informed is critical during incidents. Here are templates for status page updates at different stages:

```markdown
## Status Page Update Templates

### Investigating (Initial Update)

**Title:** Investigating issues with [Service Name]

**Body:**
We are currently investigating reports of [brief description of symptoms].
Our team is actively working to identify the root cause.

We will provide an update within [timeframe based on severity].

**Affected Components:** [List components]
**Status:** Investigating

---

### Identified (Root Cause Found)

**Title:** [Service Name] - Root cause identified

**Body:**
We have identified the root cause of the [service] issues as [brief technical explanation in customer-friendly terms].

Our team is implementing a fix. We expect to have more information within [timeframe].

Customers may experience [specific symptoms] during this time.

**Affected Components:** [List components]
**Status:** Identified

---

### Implementing Fix

**Title:** [Service Name] - Fix being deployed

**Body:**
We are deploying a fix for the [service] issues. The deployment is expected to complete within [timeframe].

Some customers may continue to experience [symptoms] until the fix is fully deployed.

**Affected Components:** [List components]
**Status:** Monitoring

---

### Resolved

**Title:** [Service Name] - Issue resolved

**Body:**
The issue affecting [service] has been resolved. All systems are operating normally.

**What happened:**
[1-2 sentence summary of the issue and resolution]

**Impact:**
- Duration: [start time] to [end time] ([total duration])
- Affected users: [percentage or count if known]

We apologize for any inconvenience this may have caused. A detailed post-incident report will be available within [timeframe].

**Affected Components:** [List components]
**Status:** Resolved
```

Here is a Python script for programmatic status page updates:

```python
#!/usr/bin/env python3
"""
status_page_updater.py

Automates status page updates during incidents.
Supports multiple status page providers through a unified interface.

Usage:
    python status_page_updater.py create --service "API" --status investigating
    python status_page_updater.py update --incident-id INC-123 --status resolved
"""

import argparse
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Optional
import requests


class IncidentStatus(Enum):
    """Standard incident statuses for status pages."""
    INVESTIGATING = "investigating"
    IDENTIFIED = "identified"
    MONITORING = "monitoring"
    RESOLVED = "resolved"


class ComponentStatus(Enum):
    """Component health statuses."""
    OPERATIONAL = "operational"
    DEGRADED = "degraded_performance"
    PARTIAL = "partial_outage"
    MAJOR = "major_outage"


@dataclass
class StatusUpdate:
    """Represents a status page update."""
    incident_id: Optional[str]
    title: str
    body: str
    status: IncidentStatus
    affected_components: list[str]
    component_status: ComponentStatus


class StatusPageProvider(ABC):
    """Abstract base class for status page providers."""

    @abstractmethod
    def create_incident(self, update: StatusUpdate) -> str:
        """Create a new incident. Returns incident ID."""
        pass

    @abstractmethod
    def update_incident(self, update: StatusUpdate) -> bool:
        """Update an existing incident. Returns success status."""
        pass

    @abstractmethod
    def resolve_incident(self, incident_id: str, message: str) -> bool:
        """Resolve an incident. Returns success status."""
        pass


class StatuspageIO(StatusPageProvider):
    """Implementation for Atlassian Statuspage."""

    def __init__(self, api_key: str, page_id: str):
        self.api_key = api_key
        self.page_id = page_id
        self.base_url = f"https://api.statuspage.io/v1/pages/{page_id}"
        self.headers = {
            "Authorization": f"OAuth {api_key}",
            "Content-Type": "application/json",
        }

    def create_incident(self, update: StatusUpdate) -> str:
        """Create incident on Statuspage.io."""

        payload = {
            "incident": {
                "name": update.title,
                "body": update.body,
                "status": update.status.value,
                "component_ids": update.affected_components,
                "deliver_notifications": True,
            }
        }

        response = requests.post(
            f"{self.base_url}/incidents",
            headers=self.headers,
            json=payload,
        )
        response.raise_for_status()

        return response.json()["id"]

    def update_incident(self, update: StatusUpdate) -> bool:
        """Update existing incident on Statuspage.io."""

        payload = {
            "incident": {
                "body": update.body,
                "status": update.status.value,
            }
        }

        response = requests.patch(
            f"{self.base_url}/incidents/{update.incident_id}",
            headers=self.headers,
            json=payload,
        )

        return response.status_code == 200

    def resolve_incident(self, incident_id: str, message: str) -> bool:
        """Resolve incident on Statuspage.io."""

        payload = {
            "incident": {
                "body": message,
                "status": "resolved",
            }
        }

        response = requests.patch(
            f"{self.base_url}/incidents/{incident_id}",
            headers=self.headers,
            json=payload,
        )

        return response.status_code == 200


def generate_update_message(
    status: IncidentStatus,
    service_name: str,
    details: str,
) -> str:
    """Generate appropriate message based on incident status."""

    templates = {
        IncidentStatus.INVESTIGATING: (
            f"We are investigating reports of issues with {service_name}. "
            f"{details} We will provide updates as we learn more."
        ),
        IncidentStatus.IDENTIFIED: (
            f"We have identified the cause of the {service_name} issues. "
            f"{details} Our team is working on a fix."
        ),
        IncidentStatus.MONITORING: (
            f"A fix has been deployed for the {service_name} issues. "
            f"{details} We are monitoring to ensure stability."
        ),
        IncidentStatus.RESOLVED: (
            f"The {service_name} issue has been resolved. "
            f"{details} We apologize for any inconvenience."
        ),
    }

    return templates[status]


def main():
    """Command-line interface for status page updates."""

    parser = argparse.ArgumentParser(description="Update status page")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Create incident command
    create_parser = subparsers.add_parser("create", help="Create new incident")
    create_parser.add_argument("--service", required=True, help="Affected service")
    create_parser.add_argument("--status", required=True, choices=[s.value for s in IncidentStatus])
    create_parser.add_argument("--details", default="", help="Additional details")
    create_parser.add_argument("--components", nargs="+", default=[], help="Component IDs")

    # Update incident command
    update_parser = subparsers.add_parser("update", help="Update existing incident")
    update_parser.add_argument("--incident-id", required=True, help="Incident ID")
    update_parser.add_argument("--status", required=True, choices=[s.value for s in IncidentStatus])
    update_parser.add_argument("--message", required=True, help="Update message")

    args = parser.parse_args()

    # Initialize provider from environment
    provider = StatuspageIO(
        api_key=os.environ["STATUSPAGE_API_KEY"],
        page_id=os.environ["STATUSPAGE_PAGE_ID"],
    )

    if args.command == "create":
        status = IncidentStatus(args.status)
        message = generate_update_message(status, args.service, args.details)

        update = StatusUpdate(
            incident_id=None,
            title=f"{args.service} - {status.value.title()}",
            body=message,
            status=status,
            affected_components=args.components,
            component_status=ComponentStatus.DEGRADED,
        )

        incident_id = provider.create_incident(update)
        print(f"Created incident: {incident_id}")

    elif args.command == "update":
        update = StatusUpdate(
            incident_id=args.incident_id,
            title="",
            body=args.message,
            status=IncidentStatus(args.status),
            affected_components=[],
            component_status=ComponentStatus.OPERATIONAL,
        )

        success = provider.update_incident(update)
        print(f"Update {'successful' if success else 'failed'}")


if __name__ == "__main__":
    main()
```

## Handoff Procedures

Long-running incidents require shift handoffs. A proper handoff ensures continuity and prevents information loss.

### Handoff Checklist

Before handing off, the outgoing IC must provide:

1. **Current Status Summary**
   - What is broken
   - What has been tried
   - Current working theory

2. **Timeline of Events**
   - Key milestones
   - Important decisions made
   - Rollbacks or changes applied

3. **Open Questions**
   - What still needs investigation
   - Blocked items

4. **Stakeholder Status**
   - Who has been notified
   - Last customer communication
   - Pending follow-ups

Here is a handoff document template:

```yaml
# incident-handoff-template.yaml
# Complete this template when handing off incident responsibility

handoff_document:
  incident_id: "INC-2024-0142"
  handoff_time: "2024-03-15T14:00:00Z"

  participants:
    outgoing_ic: "Jane Smith"
    incoming_ic: "Bob Wilson"
    witnesses: ["Tech Lead Mike", "Scribe Sarah"]

  current_status:
    severity: "SEV1"
    duration: "4 hours 30 minutes"
    state: "Identified, fix in progress"
    summary: |
      Database connection pool exhaustion causing API timeouts.
      Root cause identified as connection leak in payment service v2.3.1.
      Rollback to v2.3.0 in progress, 60% of pods updated.

  timeline_highlights:
    - time: "09:30"
      event: "Initial alert - API error rate spike to 15%"
    - time: "09:45"
      event: "Incident declared SEV2, upgraded to SEV1 at 10:00"
    - time: "10:30"
      event: "Root cause identified - DB connection leak"
    - time: "11:00"
      event: "Decision made to rollback payment service"
    - time: "13:00"
      event: "Rollback started, gradual pod replacement"

  actions_taken:
    - "Scaled up API replicas from 10 to 25"
    - "Enabled circuit breaker on payment endpoints"
    - "Increased database connection pool timeout"
    - "Started rollback of payment-service to v2.3.0"

  pending_actions:
    - action: "Complete rollback"
      owner: "Platform team"
      eta: "14:30"
    - action: "Verify error rates return to baseline"
      owner: "Incoming IC"
      eta: "15:00"
    - action: "Post customer communication"
      owner: "Comms Lead"
      eta: "After resolution confirmed"

  open_questions:
    - "Why did connection leak only manifest in v2.3.1?"
    - "Should we increase baseline connection pool size?"
    - "Need to verify no data corruption from failed transactions"

  stakeholder_status:
    leadership:
      last_update: "13:30"
      next_update: "15:00"
      contact: "VP Engineering - Marcus"
    customers:
      status_page: "Last updated 13:45"
      major_accounts_notified: ["Acme Corp", "BigCo Inc"]
    support_team:
      briefed: true
      escalation_contact: "Jane Smith until 14:00"

  environment_state:
    dashboards_open:
      - "https://grafana.example.com/d/api-health"
      - "https://grafana.example.com/d/db-connections"
    logs_filtered:
      - "service:payment-service level:error last:6h"
    alerts_silenced:
      - "PaymentServiceHighLatency until 15:00"

  handoff_confirmed:
    outgoing_signature: "Jane Smith"
    incoming_signature: "Bob Wilson"
    handoff_complete: true
```

### Handoff Meeting Script

Run through this script during the handoff meeting:

```markdown
## Incident Handoff Meeting Agenda

### 1. Current State (5 minutes)
- [ ] Outgoing IC summarizes current status
- [ ] Review severity and impact
- [ ] Confirm what is and is not working

### 2. Timeline Review (5 minutes)
- [ ] Walk through major events
- [ ] Highlight key decisions and rationale
- [ ] Note any rollbacks or changes applied

### 3. Technical Context (10 minutes)
- [ ] Current hypothesis for root cause
- [ ] What has been tried
- [ ] What has been ruled out
- [ ] Relevant dashboards and logs

### 4. Pending Actions (5 minutes)
- [ ] Review in-flight work
- [ ] Transfer ownership of active tasks
- [ ] Confirm ETAs and blockers

### 5. Stakeholder Status (5 minutes)
- [ ] Last leadership update
- [ ] Customer communication status
- [ ] Support team briefing status

### 6. Questions and Clarification (5 minutes)
- [ ] Incoming IC asks questions
- [ ] Clarify any ambiguities
- [ ] Confirm contact info for outgoing IC

### 7. Handoff Confirmation
- [ ] Incoming IC confirms understanding
- [ ] Update incident channel with new IC
- [ ] Outgoing IC stands down
```

## Building an Incident Timeline

Accurate timelines are essential for post-incident reviews. Here is a structured approach:

```python
#!/usr/bin/env python3
"""
incident_timeline.py

Tools for building and managing incident timelines.
Automatically captures events from various sources and compiles
a unified timeline for post-incident review.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional
import json


class EventType(Enum):
    """Types of events that can occur during an incident."""
    ALERT = "alert"
    DECLARATION = "declaration"
    ESCALATION = "escalation"
    INVESTIGATION = "investigation"
    ACTION = "action"
    DECISION = "decision"
    COMMUNICATION = "communication"
    RESOLUTION = "resolution"


class EventSource(Enum):
    """Sources of timeline events."""
    MONITORING = "monitoring"
    HUMAN = "human"
    AUTOMATION = "automation"
    EXTERNAL = "external"


@dataclass
class TimelineEvent:
    """A single event in the incident timeline."""
    timestamp: datetime
    event_type: EventType
    description: str
    source: EventSource
    actor: Optional[str] = None
    details: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        """Convert event to dictionary for serialization."""
        return {
            "timestamp": self.timestamp.isoformat(),
            "event_type": self.event_type.value,
            "description": self.description,
            "source": self.source.value,
            "actor": self.actor,
            "details": self.details,
        }


class IncidentTimeline:
    """Manages the timeline for a single incident."""

    def __init__(self, incident_id: str):
        self.incident_id = incident_id
        self.events: list[TimelineEvent] = []
        self.created_at = datetime.utcnow()

    def add_event(
        self,
        event_type: EventType,
        description: str,
        source: EventSource = EventSource.HUMAN,
        actor: Optional[str] = None,
        timestamp: Optional[datetime] = None,
        **details,
    ) -> None:
        """Add an event to the timeline."""

        event = TimelineEvent(
            timestamp=timestamp or datetime.utcnow(),
            event_type=event_type,
            description=description,
            source=source,
            actor=actor,
            details=details,
        )

        self.events.append(event)
        # Keep events sorted by timestamp
        self.events.sort(key=lambda e: e.timestamp)

    def get_events_by_type(self, event_type: EventType) -> list[TimelineEvent]:
        """Filter events by type."""
        return [e for e in self.events if e.event_type == event_type]

    def get_duration(self) -> Optional[float]:
        """Get incident duration in minutes, if resolved."""

        declarations = self.get_events_by_type(EventType.DECLARATION)
        resolutions = self.get_events_by_type(EventType.RESOLUTION)

        if not declarations or not resolutions:
            return None

        start = declarations[0].timestamp
        end = resolutions[-1].timestamp

        return (end - start).total_seconds() / 60

    def generate_summary(self) -> str:
        """Generate a human-readable timeline summary."""

        lines = [
            f"Incident Timeline: {self.incident_id}",
            "=" * 50,
            "",
        ]

        for event in self.events:
            time_str = event.timestamp.strftime("%H:%M:%S")
            actor_str = f" [{event.actor}]" if event.actor else ""
            lines.append(f"{time_str} - {event.event_type.value.upper()}{actor_str}")
            lines.append(f"    {event.description}")

            if event.details:
                for key, value in event.details.items():
                    lines.append(f"    - {key}: {value}")

            lines.append("")

        duration = self.get_duration()
        if duration:
            lines.append(f"Total Duration: {duration:.1f} minutes")

        return "\n".join(lines)

    def export_json(self) -> str:
        """Export timeline as JSON for storage."""

        data = {
            "incident_id": self.incident_id,
            "created_at": self.created_at.isoformat(),
            "events": [e.to_dict() for e in self.events],
            "duration_minutes": self.get_duration(),
        }

        return json.dumps(data, indent=2)


# Example usage demonstrating timeline construction
def example_timeline():
    """Build an example incident timeline."""

    timeline = IncidentTimeline("INC-2024-0142")

    # Alert received
    timeline.add_event(
        EventType.ALERT,
        "High error rate detected on API gateway",
        source=EventSource.MONITORING,
        timestamp=datetime(2024, 3, 15, 9, 30, 0),
        alert_name="APIHighErrorRate",
        threshold="10%",
        actual_value="15.3%",
    )

    # Incident declared
    timeline.add_event(
        EventType.DECLARATION,
        "Incident declared at SEV2",
        source=EventSource.HUMAN,
        actor="Jane Smith",
        timestamp=datetime(2024, 3, 15, 9, 45, 0),
        initial_severity="SEV2",
    )

    # Escalation
    timeline.add_event(
        EventType.ESCALATION,
        "Upgraded to SEV1 due to increasing impact",
        source=EventSource.HUMAN,
        actor="Jane Smith",
        timestamp=datetime(2024, 3, 15, 10, 0, 0),
        previous_severity="SEV2",
        new_severity="SEV1",
        reason="Error rate exceeded 25%, affecting checkout",
    )

    # Investigation
    timeline.add_event(
        EventType.INVESTIGATION,
        "Database connection pool exhaustion identified",
        source=EventSource.HUMAN,
        actor="Tech Lead Mike",
        timestamp=datetime(2024, 3, 15, 10, 30, 0),
        finding="Connection leak in payment-service v2.3.1",
    )

    # Decision
    timeline.add_event(
        EventType.DECISION,
        "Decided to rollback payment-service to v2.3.0",
        source=EventSource.HUMAN,
        actor="Jane Smith",
        timestamp=datetime(2024, 3, 15, 11, 0, 0),
        alternatives_considered=["Hotfix", "Increase pool size"],
        rationale="Rollback is fastest path to recovery",
    )

    # Action
    timeline.add_event(
        EventType.ACTION,
        "Rollback initiated for payment-service",
        source=EventSource.AUTOMATION,
        timestamp=datetime(2024, 3, 15, 11, 5, 0),
        deployment_id="deploy-12345",
        target_version="v2.3.0",
    )

    # Communication
    timeline.add_event(
        EventType.COMMUNICATION,
        "Status page updated - fix being deployed",
        source=EventSource.HUMAN,
        actor="Comms Lead Sarah",
        timestamp=datetime(2024, 3, 15, 11, 10, 0),
    )

    # Resolution
    timeline.add_event(
        EventType.RESOLUTION,
        "Incident resolved - error rates returned to normal",
        source=EventSource.HUMAN,
        actor="Bob Wilson",
        timestamp=datetime(2024, 3, 15, 14, 30, 0),
        resolution_method="Rollback completed successfully",
    )

    return timeline


if __name__ == "__main__":
    timeline = example_timeline()
    print(timeline.generate_summary())
```

## Putting It All Together: Incident Response Runbook

Here is a complete runbook that ties all the pieces together:

```yaml
# incident-response-runbook.yaml
# Complete incident response procedure from detection to resolution

runbook:
  name: "Standard Incident Response Procedure"
  version: "2.0"
  last_updated: "2024-03-15"
  owner: "SRE Team"

  phases:
    detection:
      description: "Incident is detected through monitoring or user report"
      steps:
        - step: "Acknowledge alert within SLA"
          sla:
            sev1: "5 minutes"
            sev2: "15 minutes"
            sev3: "1 hour"

        - step: "Perform initial assessment"
          checklist:
            - "Check error rates and latency"
            - "Check recent deployments"
            - "Check dependent services"
            - "Check infrastructure health"

        - step: "Determine if incident declaration is needed"
          criteria:
            - "User-facing impact confirmed"
            - "Issue not self-resolving"
            - "Requires coordination to resolve"

    declaration:
      description: "Formally declare the incident and mobilize response"
      steps:
        - step: "Classify severity using severity matrix"
          reference: "See severity_classifier.py"

        - step: "Create incident channel"
          command: "./create_incident_channel.sh INC-XXXX SEVX 'Description'"

        - step: "Assign initial roles"
          required_roles:
            sev1: ["IC", "Technical Lead", "Comms Lead", "Scribe"]
            sev2: ["IC", "Technical Lead", "Comms Lead"]
            sev3: ["Technical Lead"]

        - step: "Post initial status page update"
          template: "investigating"

        - step: "Notify stakeholders per escalation matrix"

    investigation:
      description: "Identify root cause and develop remediation plan"
      steps:
        - step: "Technical Lead coordinates investigation"
          activities:
            - "Review dashboards and metrics"
            - "Analyze logs and traces"
            - "Check recent changes"
            - "Test hypotheses"

        - step: "Scribe documents timeline"
          capture:
            - "All significant findings"
            - "Actions taken"
            - "Decisions made"

        - step: "IC manages communication cadence"
          internal_updates: "Every 15 minutes for SEV1"
          status_page_updates: "Every 15-30 minutes"

        - step: "Escalate if needed"
          triggers:
            - "No progress after 30 minutes"
            - "Need specialized expertise"
            - "Scope expanding"

    remediation:
      description: "Implement fix and restore service"
      steps:
        - step: "Technical Lead proposes remediation options"
          considerations:
            - "Speed of implementation"
            - "Risk of making things worse"
            - "Completeness of fix"

        - step: "IC approves remediation approach"
          decision_factors:
            - "Customer impact during fix"
            - "Resource requirements"
            - "Rollback capability"

        - step: "Implement fix with proper change management"
          requirements:
            - "Document what is being changed"
            - "Have rollback plan ready"
            - "Monitor closely during change"

        - step: "Verify fix is working"
          verification:
            - "Error rates returning to normal"
            - "User reports stopping"
            - "Metrics within acceptable range"

    resolution:
      description: "Confirm service restored and close incident"
      steps:
        - step: "Confirm all affected services recovered"
          checklist:
            - "All error rates below threshold"
            - "Latency within SLA"
            - "No new related alerts"

        - step: "Post resolution status page update"
          template: "resolved"
          include:
            - "Brief summary of issue"
            - "Duration of impact"
            - "Promise of post-incident report"

        - step: "Notify stakeholders of resolution"

        - step: "IC declares incident resolved"

        - step: "Archive incident channel"
          retention: "30 days"

    post_incident:
      description: "Learn from the incident"
      steps:
        - step: "Schedule post-incident review"
          timing: "Within 3 business days"
          attendees:
            - "All incident responders"
            - "Service owners"
            - "Optional: leadership for SEV1"

        - step: "Prepare incident report"
          contents:
            - "Executive summary"
            - "Complete timeline"
            - "Root cause analysis"
            - "Impact assessment"
            - "Action items"

        - step: "Conduct blameless review meeting"
          agenda:
            - "Timeline walkthrough"
            - "What went well"
            - "What could be improved"
            - "Action item assignment"

        - step: "Track action items to completion"
          tracking: "JIRA project: INCIDENT-FOLLOWUP"
          sla: "All P1 items completed within 2 weeks"
```

## Automation Recommendations

Manual processes do not scale. Here are key areas to automate:

| Process | Automation Approach | Tool Examples |
|---------|---------------------|---------------|
| Alert routing | PagerDuty schedules and policies | PagerDuty, Opsgenie |
| Channel creation | Bot creates channel on incident declaration | Custom Slack bot |
| Status page updates | API integration with incident tooling | Statuspage API |
| Timeline capture | Auto-capture from Slack messages | Incident.io, FireHydrant |
| Stakeholder notification | Triggered by severity level | PagerDuty, custom scripts |
| Post-incident scheduling | Auto-create calendar invite on resolution | Zapier, custom integration |

## Metrics to Track

Measure your incident response effectiveness:

| Metric | Definition | Target |
|--------|------------|--------|
| MTTA | Mean Time to Acknowledge | < 5 min for SEV1 |
| MTTD | Mean Time to Detect | < 5 min |
| MTTR | Mean Time to Resolve | < 60 min for SEV1 |
| Incident frequency | Incidents per week | Trending down |
| Repeat incidents | Same root cause within 30 days | < 10% |
| Post-incident completion | Action items completed on time | > 90% |

## Common Pitfalls to Avoid

1. **No clear IC**: Everyone investigates, nobody coordinates. Always assign an IC first.

2. **Too many people in the channel**: Noise drowns signal. Keep response team small, use a bridge call for SEV1.

3. **Forgetting to update stakeholders**: Silence breeds anxiety. Set timers for regular updates.

4. **Skipping post-incident review**: Without learning, you repeat mistakes. Make reviews non-negotiable.

5. **Hero culture**: One person always saving the day leads to burnout and single points of failure. Rotate roles.

6. **Over-engineering severity**: Keep it simple. Four levels are usually enough.

7. **Not practicing**: Run game days and tabletop exercises. Muscle memory matters at 3 AM.

## Conclusion

Effective incident response comes down to preparation. Define your roles, document your procedures, automate what you can, and practice regularly. When the next incident hits, your team will respond with confidence instead of confusion.

Start by implementing the severity classification system and IC role definition. Then build out communication channels and escalation paths. Finally, add automation to reduce toil and improve consistency.

Remember: incidents will happen. What matters is how quickly and effectively you respond.
