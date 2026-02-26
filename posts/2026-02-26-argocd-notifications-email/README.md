# How to Send ArgoCD Notifications to Email

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Email, Notifications

Description: Learn how to configure ArgoCD to send deployment notification emails using SMTP, with HTML templates, multiple recipients, and trigger-based routing.

---

Email notifications from ArgoCD are essential for teams that need audit trails, stakeholders who do not use Slack, or compliance requirements that mandate email records of deployments. ArgoCD supports sending emails through any SMTP server, including Gmail, SendGrid, AWS SES, and corporate Exchange servers. This guide covers the complete setup.

## SMTP Configuration

ArgoCD sends emails through SMTP. You need an SMTP server, credentials, and a sender address.

### Basic SMTP Setup

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.email: |
    host: smtp.example.com
    port: 587
    from: argocd@example.com
    username: $email-username
    password: $email-password
---
apiVersion: v1
kind: Secret
metadata:
  name: argocd-notifications-secret
  namespace: argocd
type: Opaque
stringData:
  email-username: argocd@example.com
  email-password: your-smtp-password
```

### Gmail SMTP

```yaml
  service.email: |
    host: smtp.gmail.com
    port: 587
    from: argocd-notifications@gmail.com
    username: $email-username
    password: $email-password
```

For Gmail, you need to use an App Password (not your regular password). Generate one at https://myaccount.google.com/apppasswords.

### AWS SES

```yaml
  service.email: |
    host: email-smtp.us-east-1.amazonaws.com
    port: 587
    from: argocd@yourdomain.com
    username: $ses-smtp-username
    password: $ses-smtp-password
```

### SendGrid

```yaml
  service.email: |
    host: smtp.sendgrid.net
    port: 587
    from: argocd@yourdomain.com
    username: apikey
    password: $sendgrid-api-key
```

### Corporate Exchange Server

```yaml
  service.email: |
    host: mail.corporate.com
    port: 25
    from: argocd@corporate.com
    # Some internal SMTP servers do not require auth
    # username: $email-username
    # password: $email-password
```

## Creating Email Templates

### Plain Text Template

```yaml
  template.app-sync-succeeded-email: |
    email:
      subject: "ArgoCD: {{ .app.metadata.name }} synced successfully"
      body: |
        Application: {{ .app.metadata.name }}
        Project: {{ .app.spec.project }}
        Sync Status: {{ .app.status.sync.status }}
        Health Status: {{ .app.status.health.status }}
        Revision: {{ .app.status.sync.revision }}
        Namespace: {{ .app.spec.destination.namespace }}
        Cluster: {{ .app.spec.destination.server }}

        View in ArgoCD: https://argocd.example.com/applications/{{ .app.metadata.name }}
```

### HTML Email Template

For professional-looking emails, use HTML:

```yaml
  template.app-deployed-email: |
    email:
      subject: "Deployed: {{ .app.metadata.name }} to {{ .app.spec.destination.namespace }}"
      content-type: text/html
      body: |
        <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="background-color: #18be52; padding: 20px; color: white;">
              <h1 style="margin: 0; font-size: 20px;">Deployment Successful</h1>
            </div>
            <div style="padding: 20px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #666;">Application</td>
                  <td style="padding: 8px 0;">{{ .app.metadata.name }}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #666;">Project</td>
                  <td style="padding: 8px 0;">{{ .app.spec.project }}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #666;">Revision</td>
                  <td style="padding: 8px 0;"><code>{{ .app.status.sync.revision | trunc 7 }}</code></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #666;">Namespace</td>
                  <td style="padding: 8px 0;">{{ .app.spec.destination.namespace }}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-weight: bold; color: #666;">Health</td>
                  <td style="padding: 8px 0;">{{ .app.status.health.status }}</td>
                </tr>
              </table>
              <div style="margin-top: 20px;">
                <a href="https://argocd.example.com/applications/{{ .app.metadata.name }}"
                   style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
                  View in ArgoCD
                </a>
              </div>
            </div>
          </div>
        </body>
        </html>

  template.app-sync-failed-email: |
    email:
      subject: "FAILED: {{ .app.metadata.name }} sync failed"
      content-type: text/html
      body: |
        <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="background-color: #E96D76; padding: 20px; color: white;">
              <h1 style="margin: 0; font-size: 20px;">Sync Failed</h1>
            </div>
            <div style="padding: 20px;">
              <p><strong>Application:</strong> {{ .app.metadata.name }}</p>
              <p><strong>Project:</strong> {{ .app.spec.project }}</p>
              <p><strong>Revision:</strong> <code>{{ .app.status.sync.revision | trunc 7 }}</code></p>
              <p><strong>Error:</strong></p>
              <pre style="background-color: #f8f8f8; padding: 12px; border-radius: 4px; overflow-x: auto;">{{ .app.status.operationState.message }}</pre>
              <div style="margin-top: 20px;">
                <a href="https://argocd.example.com/applications/{{ .app.metadata.name }}"
                   style="background-color: #cc0000; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
                  Investigate in ArgoCD
                </a>
              </div>
            </div>
          </div>
        </body>
        </html>
```

## Configuring Triggers and Subscriptions

### Triggers

```yaml
  trigger.on-deployed: |
    - when: app.status.operationState.phase in ['Succeeded'] and app.status.health.status == 'Healthy'
      send: [app-deployed-email]

  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [app-sync-failed-email]
```

### Subscribing Individual Applications

```bash
# Send to a single recipient
kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-deployed.email="devops@example.com"

# Send to multiple recipients (comma-separated)
kubectl annotate app my-app -n argocd \
  notifications.argoproj.io/subscribe.on-sync-failed.email="devops@example.com;oncall@example.com"
```

### Default Subscriptions

```yaml
  subscriptions: |
    - recipients:
        - email:devops-team@example.com
      triggers:
        - on-deployed
        - on-sync-failed
    - recipients:
        - email:management@example.com
      triggers:
        - on-sync-failed
```

## Routing Emails by Severity

Send different events to different distribution lists:

```bash
# Routine deployments go to the team
kubectl annotate app production-api -n argocd \
  notifications.argoproj.io/subscribe.on-deployed.email="team@example.com"

# Failures go to on-call and management
kubectl annotate app production-api -n argocd \
  notifications.argoproj.io/subscribe.on-sync-failed.email="oncall@example.com;cto@example.com"

# Health degradation goes to SRE
kubectl annotate app production-api -n argocd \
  notifications.argoproj.io/subscribe.on-health-degraded.email="sre@example.com"
```

## Debugging Email Delivery

```bash
# Check notification controller logs
kubectl logs -n argocd deploy/argocd-notifications-controller -f

# Common errors:
# "dial tcp: connection refused" - SMTP host/port wrong or blocked by network policy
# "authentication failed" - Wrong username/password
# "certificate is not trusted" - SMTP server uses self-signed cert
# "550 relay not permitted" - SMTP server rejects the sender address
```

Test SMTP connectivity from inside the cluster:

```bash
# Test SMTP connection from a pod
kubectl run smtp-test --rm -it --image=alpine -n argocd -- sh -c \
  "apk add --no-cache openssl && echo QUIT | openssl s_client -connect smtp.example.com:587 -starttls smtp"
```

For self-signed SMTP certificates, you can configure ArgoCD to skip TLS verification (not recommended for production):

```yaml
  service.email: |
    host: smtp.internal.com
    port: 587
    from: argocd@internal.com
    username: $email-username
    password: $email-password
    insecure_skip_verify: true
```

## Email Rate Limiting

Be careful with auto-sync enabled applications - they can generate a lot of notifications. Use the `oncePer` field in triggers to prevent notification spam:

```yaml
  trigger.on-deployed: |
    - when: app.status.operationState.phase in ['Succeeded'] and app.status.health.status == 'Healthy'
      oncePer: app.status.sync.revision
      send: [app-deployed-email]
```

The `oncePer` field ensures only one notification per unique revision, preventing duplicate emails when ArgoCD re-evaluates the trigger condition.

For other notification services, see our guides on [Slack notifications](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-slack/view), [Microsoft Teams](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-microsoft-teams/view), and [webhook endpoints](https://oneuptime.com/blog/post/2026-02-26-argocd-notifications-webhook-endpoints/view).

Email notifications from ArgoCD provide the paper trail that many organizations need. Once configured, they run silently in the background, giving your team deployment records without any extra effort.
