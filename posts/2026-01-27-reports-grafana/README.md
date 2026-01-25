# How to Generate Reports in Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Reporting, PDF, Scheduled Reports, Enterprise, Analytics, Dashboards

Description: Learn how to create, schedule, and distribute reports from Grafana dashboards for stakeholders who need regular visibility into system health and performance.

---

## Why Generate Reports from Grafana?

Not everyone lives in dashboards. Executives want weekly summaries, compliance teams need monthly audits, and customers expect regular status reports. Grafana's reporting features transform dynamic dashboards into static documents that can be shared, archived, and referenced.

Reports serve several purposes:
- Executive briefings without dashboard access
- Compliance documentation
- Customer-facing status summaries
- Historical record keeping
- Meeting preparation materials

## Reporting Options

Grafana offers multiple approaches to reporting depending on your needs and license.

### Grafana Enterprise Reporting

Enterprise and Cloud Pro plans include native reporting with PDF generation and scheduling.

### Open Source Alternatives

For open source Grafana:
- grafana-image-renderer for panel screenshots
- Third-party tools like Grafana Reporter
- API-based custom solutions

## Setting Up Grafana Image Renderer

The image renderer is required for any screenshot-based reporting.

### Installation

```bash
# Plugin installation
grafana-cli plugins install grafana-image-renderer

# Or via Docker
docker run -p 8081:8081 grafana/grafana-image-renderer:latest
```

### Configuration

```ini
# grafana.ini
[rendering]
server_url = http://renderer:8081/render
callback_url = http://grafana:3000/

[unified_alerting.screenshots]
capture = true
max_concurrent_screenshots = 5
```

### Verify Installation

Test rendering by accessing:
```
https://grafana.example.com/render/d-solo/abc123/dashboard?panelId=1&width=1000&height=500
```

## Creating Reports (Enterprise)

### Configuring a Report

1. Open the dashboard you want to report on
2. Click Share > Report
3. Configure report settings:

```yaml
Report Name: Weekly Platform Health
Schedule: Every Monday at 9:00 AM UTC
Time Range: Last 7 days

Recipients:
  - platform-team@example.com
  - management@example.com

Format: PDF
Orientation: Landscape
Layout: Grid

Include:
  - Dashboard title: true
  - Time range: true
  - Variable values: true
```

### Report Scheduling Options

```yaml
# Daily report
Schedule Type: Daily
Time: 08:00

# Weekly report
Schedule Type: Weekly
Day: Monday
Time: 09:00

# Monthly report
Schedule Type: Monthly
Day: 1
Time: 08:00

# Custom cron
Schedule Type: Custom
Cron: 0 8 * * 1-5  # Weekdays at 8 AM
```

### Managing Multiple Reports

Reports are managed in Grafana under Reporting > Reports:

```yaml
Reports:
  - Name: Daily Platform Health
    Dashboard: Platform Overview
    Schedule: Daily 8:00 AM
    Recipients: [ops-team@example.com]

  - Name: Weekly SLO Review
    Dashboard: SLO Dashboard
    Schedule: Weekly Monday 9:00 AM
    Recipients: [engineering@example.com]

  - Name: Monthly Executive Summary
    Dashboard: Executive Dashboard
    Schedule: Monthly 1st 8:00 AM
    Recipients: [executives@example.com]
```

## Custom Report Generation

For more control or open source installations, build custom reporting.

### Using the Render API

```python
import requests
from datetime import datetime, timedelta

def render_panel(grafana_url: str, token: str, dashboard_uid: str,
                 panel_id: int, width: int = 1000, height: int = 500,
                 time_from: str = "now-7d", time_to: str = "now") -> bytes:
    """Render a single panel as PNG."""
    url = f"{grafana_url}/render/d-solo/{dashboard_uid}/dashboard"
    params = {
        "panelId": panel_id,
        "width": width,
        "height": height,
        "from": time_from,
        "to": time_to,
        "tz": "UTC"
    }
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(url, params=params, headers=headers)
    response.raise_for_status()
    return response.content


def render_dashboard(grafana_url: str, token: str, dashboard_uid: str,
                     width: int = 1200, height: int = 800) -> bytes:
    """Render full dashboard as PNG."""
    url = f"{grafana_url}/render/d/{dashboard_uid}/dashboard"
    params = {
        "width": width,
        "height": height,
        "from": "now-7d",
        "to": "now"
    }
    headers = {"Authorization": f"Bearer {token}"}

    response = requests.get(url, params=params, headers=headers)
    response.raise_for_status()
    return response.content
```

### Generating PDF Reports

```python
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Image, Paragraph, Spacer, Table
from reportlab.lib.styles import getSampleStyleSheet
from io import BytesIO

def generate_report(grafana_url: str, token: str, dashboards: list,
                    output_path: str):
    """Generate a PDF report from multiple dashboards."""

    doc = SimpleDocTemplate(output_path, pagesize=landscape(letter))
    styles = getSampleStyleSheet()
    story = []

    # Title
    story.append(Paragraph("Weekly Platform Report", styles['Title']))
    story.append(Paragraph(
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}",
        styles['Normal']
    ))
    story.append(Spacer(1, 20))

    for dashboard in dashboards:
        # Section header
        story.append(Paragraph(dashboard['name'], styles['Heading1']))

        # Render dashboard
        image_data = render_dashboard(
            grafana_url, token, dashboard['uid']
        )

        # Add to PDF
        img = Image(BytesIO(image_data))
        img.drawWidth = 700
        img.drawHeight = 400
        story.append(img)
        story.append(Spacer(1, 20))

    doc.build(story)

# Usage
dashboards = [
    {"name": "Platform Overview", "uid": "platform-overview"},
    {"name": "SLO Dashboard", "uid": "slo-dashboard"},
    {"name": "Incident Summary", "uid": "incident-summary"}
]

generate_report(
    grafana_url="https://grafana.example.com",
    token="glsa_xxx",
    dashboards=dashboards,
    output_path="weekly_report.pdf"
)
```

### Scheduling with Cron

```bash
# /etc/cron.d/grafana-reports
# Weekly report every Monday at 8 AM
0 8 * * 1 reporter /opt/reports/generate_weekly.py

# Monthly report on the 1st
0 8 1 * * reporter /opt/reports/generate_monthly.py
```

### Email Distribution

```python
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders

def send_report(report_path: str, recipients: list, subject: str):
    """Send report via email."""
    msg = MIMEMultipart()
    msg['From'] = 'reports@example.com'
    msg['To'] = ', '.join(recipients)
    msg['Subject'] = subject

    body = """
    Please find attached the weekly platform report.

    This report covers:
    - Platform health overview
    - SLO compliance
    - Notable incidents

    For questions, contact the platform team.
    """
    msg.attach(MIMEText(body, 'plain'))

    # Attach PDF
    with open(report_path, 'rb') as f:
        part = MIMEBase('application', 'pdf')
        part.set_payload(f.read())
        encoders.encode_base64(part)
        part.add_header(
            'Content-Disposition',
            f'attachment; filename="{report_path.split("/")[-1]}"'
        )
        msg.attach(part)

    # Send
    with smtplib.SMTP('smtp.example.com', 587) as server:
        server.starttls()
        server.login('reports@example.com', 'password')
        server.send_message(msg)
```

## Report Design Best Practices

### Dashboard Optimization for Reports

Design dashboards with reporting in mind:

```yaml
Report-Friendly Dashboard:
  - Clear titles and descriptions
  - Consistent time ranges
  - No interactive elements that don't render
  - Readable at PDF resolution
  - Summary panels at the top
```

### Static vs Dynamic Content

Some panel types render better than others:

```yaml
Good for Reports:
  - Stat panels
  - Gauge panels
  - Time series (simple)
  - Tables
  - Bar charts

Problematic:
  - Complex interactive visualizations
  - Panels with many series
  - Real-time updating panels
```

### Time Range Considerations

```yaml
# Set explicit time range for consistency
Report Time Range: Last 7 days

# Or use variables
from: ${__from}
to: ${__to}
```

## Compliance and Audit Reports

For compliance, include specific elements:

### SLA Compliance Report

```yaml
Report Sections:
  1. Executive Summary
     - Overall availability percentage
     - SLA target vs actual

  2. Service-Level Details
     - Per-service availability
     - Incidents affecting SLA

  3. Trend Analysis
     - Month-over-month comparison
     - Improvement areas

  4. Supporting Data
     - Raw metrics summary
     - Incident timeline
```

### Security Audit Report

```yaml
Report Sections:
  1. Authentication Events
     - Login success/failure trends
     - Unusual access patterns

  2. API Activity
     - Request volumes
     - Error rates

  3. Infrastructure Changes
     - Deployment events
     - Configuration changes

  4. Alert Summary
     - Security alerts triggered
     - Response times
```

## Integration with External Systems

### Slack Integration

```python
import requests

def post_report_to_slack(report_url: str, channel: str, webhook_url: str):
    """Post report notification to Slack."""
    payload = {
        "channel": channel,
        "text": "Weekly Platform Report",
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "Weekly Platform Report"
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"The weekly report is ready. <{report_url}|View Report>"
                }
            }
        ]
    }

    requests.post(webhook_url, json=payload)
```

### Cloud Storage Upload

```python
import boto3

def upload_to_s3(file_path: str, bucket: str, key: str):
    """Upload report to S3 for archival."""
    s3 = boto3.client('s3')
    s3.upload_file(
        file_path,
        bucket,
        key,
        ExtraArgs={'ContentType': 'application/pdf'}
    )
    return f"s3://{bucket}/{key}"
```

## Troubleshooting Reports

### Common Issues

**Panels not rendering:**
- Check image renderer is running
- Verify network connectivity between Grafana and renderer
- Increase timeout settings

```ini
[rendering]
concurrent_render_request_limit = 30
render_key_lifetime = 5m
```

**Report shows "No Data":**
- Verify time range covers data
- Check data source permissions for reporting user
- Ensure queries complete within timeout

**PDF quality issues:**
- Increase render width/height
- Simplify dashboard for better rendering
- Use vector-friendly visualizations

### Logging

Enable debug logging for troubleshooting:

```ini
[log]
filters = rendering:debug
```

## Conclusion

Grafana reporting bridges the gap between real-time dashboards and stakeholder communication. Enterprise users benefit from built-in scheduling and PDF generation, while open source users can build custom solutions using the render API. Design dashboards with reporting in mind, schedule appropriately for your audience, and integrate with your existing communication channels. Regular reports keep stakeholders informed without requiring them to become dashboard experts.
