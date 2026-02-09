# How to Implement Deployment Freezes and Release Calendars in Kubernetes CI/CD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CI/CD, Kubernetes, DevOps

Description: Learn how to implement deployment freezes and release calendars in Kubernetes CI/CD pipelines to control when changes can be deployed to production environments.

---

Deployment freezes prevent production changes during critical business periods like holidays, major sales events, or end-of-quarter financial closes. While continuous deployment delivers value quickly, uncontrolled deployments during sensitive windows create unnecessary risk. This guide shows how to implement smart deployment controls using Kubernetes admission controllers, CI/CD pipeline gates, and release calendar automation.

## Why Deployment Freezes Matter

Every organization has periods when production stability takes priority over new features. A bug introduced during Black Friday can cost millions in lost revenue. A configuration change during quarter-end can disrupt financial reporting. Deployment freezes aren't about slowing down development but rather ensuring changes land at the right time.

Traditional freeze approaches rely on manual processes: sending email reminders, updating wiki pages, hoping engineers notice. These fail regularly. Automated enforcement integrated into your deployment pipeline provides reliable protection without manual oversight.

## Kubernetes-Native Freeze Implementation

The most robust approach uses Kubernetes admission webhooks to block deployments during freeze windows. This prevents any deployment from proceeding, regardless of what CI/CD tool triggered it.

Start by creating a custom admission webhook that validates deployment attempts against your release calendar:

```go
// freeze-webhook/main.go
package main

import (
    "encoding/json"
    "net/http"
    "time"

    admissionv1 "k8s.io/api/admission/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type FreezeWindow struct {
    Name      string    `json:"name"`
    Start     time.Time `json:"start"`
    End       time.Time `json:"end"`
    Reason    string    `json:"reason"`
    Namespace []string  `json:"namespaces"` // empty means all namespaces
}

// Load freeze calendar from ConfigMap or external API
func getFreezeWindows() ([]FreezeWindow, error) {
    // In production, load from ConfigMap or database
    return []FreezeWindow{
        {
            Name:      "holiday-freeze-2026",
            Start:     time.Date(2026, 12, 23, 0, 0, 0, 0, time.UTC),
            End:       time.Date(2026, 12, 27, 0, 0, 0, 0, time.UTC),
            Reason:    "Holiday freeze - reduced engineering support",
            Namespace: []string{"production"},
        },
        {
            Name:   "quarter-end-freeze",
            Start:  time.Date(2026, 3, 30, 0, 0, 0, 0, time.UTC),
            End:    time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC),
            Reason: "Q1 financial close - no production changes",
            Namespace: []string{"production", "staging"},
        },
    }, nil
}

func handleAdmission(w http.ResponseWriter, r *http.Request) {
    var admissionReview admissionv1.AdmissionReview
    if err := json.NewDecoder(r.Body).Decode(&admissionReview); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    // Check if we're in a freeze window
    freezeWindows, err := getFreezeWindows()
    if err != nil {
        respondError(w, admissionReview, err.Error())
        return
    }

    request := admissionReview.Request
    now := time.Now()

    for _, window := range freezeWindows {
        if now.After(window.Start) && now.Before(window.End) {
            // Check if freeze applies to this namespace
            if len(window.Namespace) == 0 || contains(window.Namespace, request.Namespace) {
                respondDenied(w, admissionReview, window)
                return
            }
        }
    }

    // No freeze active - allow the deployment
    respondAllowed(w, admissionReview)
}

func respondDenied(w http.ResponseWriter, review admissionv1.AdmissionReview, window FreezeWindow) {
    response := admissionv1.AdmissionReview{
        TypeMeta: metav1.TypeMeta{
            APIVersion: "admission.k8s.io/v1",
            Kind:       "AdmissionReview",
        },
        Response: &admissionv1.AdmissionResponse{
            UID:     review.Request.UID,
            Allowed: false,
            Result: &metav1.Status{
                Message: fmt.Sprintf("Deployment blocked by freeze '%s': %s (ends %s)",
                    window.Name, window.Reason, window.End.Format(time.RFC3339)),
            },
        },
    }
    json.NewEncoder(w).Encode(response)
}

func respondAllowed(w http.ResponseWriter, review admissionv1.AdmissionReview) {
    response := admissionv1.AdmissionReview{
        TypeMeta: metav1.TypeMeta{
            APIVersion: "admission.k8s.io/v1",
            Kind:       "AdmissionReview",
        },
        Response: &admissionv1.AdmissionResponse{
            UID:     review.Request.UID,
            Allowed: true,
        },
    }
    json.NewEncoder(w).Encode(response)
}
```

Deploy this webhook as a service in your cluster:

```yaml
# freeze-webhook.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: freeze-webhook
  namespace: kube-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: freeze-webhook
  template:
    metadata:
      labels:
        app: freeze-webhook
    spec:
      containers:
        - name: webhook
          image: your-registry/freeze-webhook:latest
          ports:
            - containerPort: 8443
          volumeMounts:
            - name: webhook-certs
              mountPath: /etc/webhook/certs
              readOnly: true
      volumes:
        - name: webhook-certs
          secret:
            secretName: freeze-webhook-certs
---
apiVersion: v1
kind: Service
metadata:
  name: freeze-webhook
  namespace: kube-system
spec:
  ports:
    - port: 443
      targetPort: 8443
  selector:
    app: freeze-webhook
```

Register the webhook with Kubernetes:

```yaml
# validating-webhook-config.yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: freeze-enforcement
webhooks:
  - name: freeze.deployment.k8s.io
    clientConfig:
      service:
        name: freeze-webhook
        namespace: kube-system
        path: /validate
      caBundle: LS0tLS... # Base64 encoded CA cert
    rules:
      - operations: ["CREATE", "UPDATE"]
        apiGroups: ["apps"]
        apiVersions: ["v1"]
        resources: ["deployments"]
    namespaceSelector:
      matchLabels:
        freeze-enforcement: enabled
    failurePolicy: Fail  # Block deployments if webhook is unavailable
    sideEffects: None
    admissionReviewVersions: ["v1"]
```

This configuration blocks all Deployment creates and updates in namespaces labeled with `freeze-enforcement: enabled`.

## Managing Freeze Windows with ConfigMaps

Store your release calendar in a ConfigMap for easy updates without redeploying the webhook:

```yaml
# freeze-calendar.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: freeze-calendar
  namespace: kube-system
data:
  windows.json: |
    [
      {
        "name": "holiday-freeze-2026",
        "start": "2026-12-23T00:00:00Z",
        "end": "2026-12-27T00:00:00Z",
        "reason": "Holiday freeze - reduced engineering support",
        "namespaces": ["production"]
      },
      {
        "name": "quarter-end-freeze",
        "start": "2026-03-30T00:00:00Z",
        "end": "2026-04-01T00:00:00Z",
        "reason": "Q1 financial close",
        "namespaces": ["production", "staging"]
      }
    ]
```

Update the webhook to watch this ConfigMap and reload when it changes. This allows updating the calendar without service restarts.

## CI/CD Pipeline Integration

While admission webhooks provide ultimate enforcement, failing at the Kubernetes API is frustrating. Better to fail fast in the CI/CD pipeline before attempting deployment.

Here's a GitHub Actions job that checks the freeze calendar:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  check-freeze:
    runs-on: ubuntu-latest
    outputs:
      can_deploy: ${{ steps.check.outputs.can_deploy }}
      freeze_reason: ${{ steps.check.outputs.freeze_reason }}
    steps:
      - name: Check deployment freeze
        id: check
        run: |
          # Query freeze calendar API
          RESPONSE=$(curl -s https://freeze-calendar.company.com/api/check \
            -d "{\"namespace\": \"production\", \"time\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}")

          CAN_DEPLOY=$(echo $RESPONSE | jq -r '.allowed')
          REASON=$(echo $RESPONSE | jq -r '.reason // "No freeze active"')

          echo "can_deploy=$CAN_DEPLOY" >> $GITHUB_OUTPUT
          echo "freeze_reason=$REASON" >> $GITHUB_OUTPUT

  deploy:
    needs: check-freeze
    if: needs.check-freeze.outputs.can_deploy == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to production
        run: |
          kubectl apply -f k8s/production/

  freeze-blocked:
    needs: check-freeze
    if: needs.check-freeze.outputs.can_deploy == 'false'
    runs-on: ubuntu-latest
    steps:
      - name: Report freeze
        run: |
          echo "::error::Deployment blocked: ${{ needs.check-freeze.outputs.freeze_reason }}"
          exit 1
```

This fails the pipeline immediately with a clear error message if a freeze is active.

## Emergency Override Mechanism

Sometimes you need to deploy during a freeze for critical hotfixes. Implement an override mechanism with proper audit trails:

```yaml
# Override annotation on the Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  annotations:
    freeze.company.com/override: "true"
    freeze.company.com/override-reason: "Critical security patch CVE-2026-12345"
    freeze.company.com/override-approver: "john.doe@company.com"
```

Update the webhook to honor this annotation:

```go
func isOverrideValid(request *admissionv1.AdmissionRequest) bool {
    // Parse the deployment object
    var deployment appsv1.Deployment
    json.Unmarshal(request.Object.Raw, &deployment)

    override := deployment.Annotations["freeze.company.com/override"]
    reason := deployment.Annotations["freeze.company.com/override-reason"]
    approver := deployment.Annotations["freeze.company.com/override-approver"]

    if override != "true" {
        return false
    }

    // Verify all required override fields are present
    if reason == "" || approver == "" {
        return false
    }

    // Log the override for audit trail
    logOverride(deployment.Name, reason, approver)

    return true
}
```

This allows emergency deployments while maintaining a complete audit trail of who approved what and why.

## Freeze Calendar UI

Build a simple web interface for teams to view upcoming freezes:

```html
<!-- freeze-calendar.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Deployment Calendar</title>
    <script src="https://cdn.jsdelivr.net/npm/fullcalendar@6.1.0/index.global.min.js"></script>
</head>
<body>
    <div id="calendar"></div>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            fetch('/api/freeze-windows')
                .then(r => r.json())
                .then(windows => {
                    const events = windows.map(w => ({
                        title: `🔒 ${w.name}`,
                        start: w.start,
                        end: w.end,
                        description: w.reason,
                        color: 'red'
                    }));

                    const calendar = new FullCalendar.Calendar(
                        document.getElementById('calendar'),
                        {
                            initialView: 'dayGridMonth',
                            events: events,
                            eventClick: function(info) {
                                alert(info.event.extendedProps.description);
                            }
                        }
                    );
                    calendar.render();
                });
        });
    </script>
</body>
</html>
```

Host this dashboard so teams can easily see when deployments are restricted.

## Notifications and Alerts

Integrate freeze events into team communication channels:

```python
# freeze-notifier.py
import requests
from datetime import datetime, timedelta

def notify_upcoming_freeze(freeze_window):
    """Send Slack notification 48 hours before freeze starts"""
    slack_webhook = "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

    message = {
        "text": f"⚠️ Deployment Freeze Starting Soon",
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*{freeze_window['name']}*\n"
                            f"Starts: {freeze_window['start']}\n"
                            f"Ends: {freeze_window['end']}\n"
                            f"Reason: {freeze_window['reason']}\n"
                            f"Affected: {', '.join(freeze_window['namespaces'])}"
                }
            }
        ]
    }

    requests.post(slack_webhook, json=message)

# Run this as a CronJob in Kubernetes
# Checks twice daily for upcoming freezes
```

Deploy as a Kubernetes CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: freeze-notifier
  namespace: kube-system
spec:
  schedule: "0 9,17 * * *"  # 9 AM and 5 PM daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: notifier
              image: your-registry/freeze-notifier:latest
          restartPolicy: OnFailure
```

## Conclusion

Deployment freezes protect your business during critical periods without requiring manual enforcement. By implementing admission webhooks, CI/CD gates, and a centralized calendar, you create a system that prevents risky deployments while allowing emergency overrides with full audit trails.

The key is making freeze windows visible and failing fast when deployments are attempted during restricted periods. Teams can plan around freezes, and the rare emergency deployment during a freeze is properly documented and approved. This approach maintains the speed of continuous deployment while adding necessary controls for business-critical periods.
