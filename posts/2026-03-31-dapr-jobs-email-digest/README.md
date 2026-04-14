# How to Use Dapr Jobs for Email Digest Scheduling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Job, Email, Digest, Scheduling, Microservice

Description: Learn how to schedule email digest delivery using Dapr Jobs API, aggregating content and sending periodic digest emails to users on a recurring schedule.

---

Email digests - daily summaries, weekly newsletters, or activity roundups - require reliable scheduling and content aggregation. Dapr Jobs provides the scheduling layer while Dapr bindings or Pub/Sub handle email delivery, making it easy to build robust digest pipelines.

## Architecture for Email Digest Scheduling

```text
Dapr Jobs (trigger) --> Digest Service
                             |
                             +-- Query activity data
                             |
                             +-- Aggregate per user
                             |
                             +-- Send via SMTP binding or SendGrid
```

## Scheduling Digest Jobs

Create jobs for different digest types:

```bash
# Daily digest - every day at 7 AM
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/daily-digest \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "0 0 7 * * *",
    "data": {
      "@type": "type.googleapis.com/google.protobuf.StringValue",
      "value": "{\"digestType\": \"daily\", \"lookback\": \"24h\"}"
    }
  }'

# Weekly newsletter - every Monday at 8 AM
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/weekly-newsletter \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "0 0 8 * * 1",
    "data": {
      "@type": "type.googleapis.com/google.protobuf.StringValue",
      "value": "{\"digestType\": \"weekly\", \"lookback\": \"168h\"}"
    }
  }'
```

## Implementing the Digest Handler

```python
from flask import Flask, request, jsonify
import requests
import json
from datetime import datetime
from jinja2 import Template

app = Flask(__name__)
DAPR_URL = "http://localhost:3500"

DIGEST_TEMPLATE = Template("""
<html>
<body>
  <h2>Your {{ period }} digest - {{ date }}</h2>
  {% for item in items %}
  <div>
    <h3>{{ item.title }}</h3>
    <p>{{ item.summary }}</p>
  </div>
  {% endfor %}
  <p>Unsubscribe: <a href="{{ unsubscribe_url }}">click here</a></p>
</body>
</html>
""")

@app.route('/job/daily-digest', methods=['POST'])
def send_daily_digest():
    payload = request.get_json()
    params = json.loads(payload.get('data', {}).get('value', '{}'))

    digest_type = params['digestType']
    lookback = params['lookback']
    sent_count = 0

    # Get all users subscribed to this digest type
    subscribers = get_digest_subscribers(digest_type)

    for user in subscribers:
        try:
            # Aggregate activity for this user
            items = get_user_activity(user['id'], lookback)

            if not items:
                continue  # Skip users with no activity

            # Render email
            html = DIGEST_TEMPLATE.render(
                period=digest_type,
                date=datetime.utcnow().strftime("%B %d, %Y"),
                items=items,
                unsubscribe_url=f"https://example.com/unsubscribe/{user['id']}"
            )

            # Send via Dapr SMTP binding
            send_email_via_dapr(
                to=user['email'],
                subject=f"Your {digest_type} digest",
                html=html
            )
            sent_count += 1

        except Exception as e:
            print(f"Failed to send digest to {user['email']}: {e}")

    print(f"Sent {digest_type} digest to {sent_count}/{len(subscribers)} subscribers")
    return jsonify({"sent": sent_count, "total": len(subscribers)}), 200

def send_email_via_dapr(to: str, subject: str, html: str):
    requests.post(
        f"{DAPR_URL}/v1.0/bindings/smtp",
        json={
            "operation": "create",
            "metadata": {
                "emailTo": to,
                "subject": subject
            },
            "data": html
        }
    )

if __name__ == '__main__':
    app.run(port=6001)
```

## Configuring the SMTP Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: smtp
spec:
  type: bindings.smtp
  version: v1
  metadata:
    - name: host
      value: "smtp.sendgrid.net"
    - name: port
      value: "587"
    - name: user
      value: "apikey"
    - name: password
      secretKeyRef:
        name: smtp-secrets
        key: sendgrid-api-key
    - name: skipTLSVerify
      value: "false"
    - name: emailFrom
      value: "noreply@example.com"
```

## Handling User Preferences

Respect user digest preferences stored in Dapr State:

```python
def get_digest_subscribers(digest_type: str) -> list:
    # Get all user preference keys
    # In production, use your user database directly
    response = requests.get(
        f"{DAPR_URL}/v1.0/state/statestore/digest-subscribers:{digest_type}"
    )
    return response.json() if response.ok else []
```

## Summary

Dapr Jobs combined with Dapr SMTP or SendGrid bindings provides a complete solution for scheduled email digest delivery. The architecture cleanly separates scheduling concerns from email logic, making it easy to add new digest types or adjust delivery schedules without modifying core email templates.
