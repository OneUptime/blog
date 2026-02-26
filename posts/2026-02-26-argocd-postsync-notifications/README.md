# How to Send Notifications as PostSync Hooks in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, PostSync Hooks, Notifications

Description: Learn how to configure ArgoCD PostSync hooks to send deployment notifications to Slack, Teams, email, and other channels after successful syncs.

---

After a deployment completes, your team needs to know about it. What version was deployed? Which environment? Did everything go smoothly? ArgoCD PostSync hooks let you run notification jobs that fire after all application resources are successfully deployed, giving you reliable deployment notifications without any external CI/CD integration.

While ArgoCD has a built-in notifications system (argocd-notifications), PostSync hooks give you complete flexibility to run any notification logic you want, including custom formatting, aggregating deployment info, and hitting APIs that the built-in system does not support.

## Basic PostSync Notification Hook

Here is a simple hook that sends a Slack notification:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: notify-deploy-v42
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: notify
          image: curlimages/curl:latest
          command:
            - /bin/sh
            - -c
            - |
              curl -X POST "$SLACK_WEBHOOK" \
                -H 'Content-Type: application/json' \
                -d '{
                  "blocks": [
                    {
                      "type": "section",
                      "text": {
                        "type": "mrkdwn",
                        "text": ":white_check_mark: *Deployment Successful*\n*App:* web-service\n*Version:* v42\n*Environment:* production"
                      }
                    }
                  ]
                }'
          env:
            - name: SLACK_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: slack-webhook
                  key: url
      restartPolicy: Never
  backoffLimit: 1
```

## Slack Notification with Rich Formatting

For a more detailed Slack notification that includes deployment metadata:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: slack-notify
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: notify
          image: curlimages/curl:latest
          command:
            - /bin/sh
            - -c
            - |
              TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

              curl -X POST "$SLACK_WEBHOOK" \
                -H 'Content-Type: application/json' \
                -d "{
                  \"blocks\": [
                    {
                      \"type\": \"header\",
                      \"text\": {
                        \"type\": \"plain_text\",
                        \"text\": \"Deployment Complete\"
                      }
                    },
                    {
                      \"type\": \"section\",
                      \"fields\": [
                        {
                          \"type\": \"mrkdwn\",
                          \"text\": \"*Application:*\n${APP_NAME}\"
                        },
                        {
                          \"type\": \"mrkdwn\",
                          \"text\": \"*Environment:*\n${ENVIRONMENT}\"
                        },
                        {
                          \"type\": \"mrkdwn\",
                          \"text\": \"*Version:*\n${APP_VERSION}\"
                        },
                        {
                          \"type\": \"mrkdwn\",
                          \"text\": \"*Timestamp:*\n${TIMESTAMP}\"
                        }
                      ]
                    },
                    {
                      \"type\": \"actions\",
                      \"elements\": [
                        {
                          \"type\": \"button\",
                          \"text\": {
                            \"type\": \"plain_text\",
                            \"text\": \"View in ArgoCD\"
                          },
                          \"url\": \"https://argocd.example.com/applications/${APP_NAME}\"
                        }
                      ]
                    }
                  ]
                }"
          env:
            - name: SLACK_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: slack-webhook
                  key: url
            - name: APP_NAME
              value: "web-service"
            - name: ENVIRONMENT
              value: "production"
            - name: APP_VERSION
              value: "v42"
      restartPolicy: Never
  backoffLimit: 2
```

## Microsoft Teams Notification

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: teams-notify
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: notify
          image: curlimages/curl:latest
          command:
            - /bin/sh
            - -c
            - |
              curl -X POST "$TEAMS_WEBHOOK" \
                -H 'Content-Type: application/json' \
                -d '{
                  "@type": "MessageCard",
                  "@context": "http://schema.org/extensions",
                  "themeColor": "00cc00",
                  "summary": "Deployment Complete",
                  "sections": [{
                    "activityTitle": "Deployment Successful",
                    "facts": [
                      {"name": "Application", "value": "web-service"},
                      {"name": "Environment", "value": "production"},
                      {"name": "Version", "value": "v42"}
                    ],
                    "markdown": true
                  }],
                  "potentialAction": [{
                    "@type": "OpenUri",
                    "name": "View in ArgoCD",
                    "targets": [{
                      "os": "default",
                      "uri": "https://argocd.example.com/applications/web-service"
                    }]
                  }]
                }'
          env:
            - name: TEAMS_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: teams-webhook
                  key: url
      restartPolicy: Never
  backoffLimit: 2
```

## PagerDuty Change Event

Sending a PagerDuty change event helps correlate deployments with incidents:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pagerduty-change
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: notify
          image: curlimages/curl:latest
          command:
            - /bin/sh
            - -c
            - |
              TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

              curl -X POST "https://events.pagerduty.com/v2/change/enqueue" \
                -H 'Content-Type: application/json' \
                -d "{
                  \"routing_key\": \"${PD_ROUTING_KEY}\",
                  \"payload\": {
                    \"summary\": \"Deployed web-service v42 to production\",
                    \"timestamp\": \"${TIMESTAMP}\",
                    \"source\": \"argocd\",
                    \"custom_details\": {
                      \"application\": \"web-service\",
                      \"environment\": \"production\",
                      \"version\": \"v42\"
                    }
                  },
                  \"links\": [{
                    \"href\": \"https://argocd.example.com/applications/web-service\",
                    \"text\": \"ArgoCD Dashboard\"
                  }]
                }"
          env:
            - name: PD_ROUTING_KEY
              valueFrom:
                secretKeyRef:
                  name: pagerduty
                  key: routing-key
      restartPolicy: Never
  backoffLimit: 1
```

## Custom Webhook to Internal Systems

Many teams have internal deployment tracking systems. Here is how to hit a custom API:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: deploy-tracker
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: tracker
          image: curlimages/curl:latest
          command:
            - /bin/sh
            - -c
            - |
              # Register deployment in internal tracking system
              curl -X POST "${DEPLOY_API}/deployments" \
                -H "Authorization: Bearer ${API_TOKEN}" \
                -H "Content-Type: application/json" \
                -d "{
                  \"service\": \"web-service\",
                  \"version\": \"v42\",
                  \"environment\": \"production\",
                  \"deployer\": \"argocd\",
                  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",
                  \"commit\": \"${GIT_COMMIT}\"
                }"
          env:
            - name: DEPLOY_API
              value: "https://deploys.internal.example.com"
            - name: API_TOKEN
              valueFrom:
                secretKeyRef:
                  name: deploy-tracker
                  key: token
            - name: GIT_COMMIT
              value: "abc1234"
      restartPolicy: Never
  backoffLimit: 2
```

## Multi-Channel Notification

Send to multiple channels in a single hook:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: multi-notify
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: notify
          image: curlimages/curl:latest
          command:
            - /bin/sh
            - -c
            - |
              MESSAGE="Deployed web-service v42 to production"

              # Slack
              echo "Sending to Slack..."
              curl -sf -X POST "$SLACK_WEBHOOK" \
                -H 'Content-Type: application/json' \
                -d "{\"text\": \"$MESSAGE\"}" || echo "Slack failed"

              # Discord
              echo "Sending to Discord..."
              curl -sf -X POST "$DISCORD_WEBHOOK" \
                -H 'Content-Type: application/json' \
                -d "{\"content\": \"$MESSAGE\"}" || echo "Discord failed"

              # Custom API
              echo "Recording in deploy tracker..."
              curl -sf -X POST "${DEPLOY_API}/deployments" \
                -H "Authorization: Bearer ${API_TOKEN}" \
                -H 'Content-Type: application/json' \
                -d "{\"message\": \"$MESSAGE\", \"service\": \"web-service\"}" || echo "Tracker failed"

              echo "Notifications complete"
          env:
            - name: SLACK_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: notification-webhooks
                  key: slack
            - name: DISCORD_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: notification-webhooks
                  key: discord
            - name: DEPLOY_API
              value: "https://deploys.internal.example.com"
            - name: API_TOKEN
              valueFrom:
                secretKeyRef:
                  name: notification-webhooks
                  key: api-token
      restartPolicy: Never
  backoffLimit: 1
```

## PostSync Hook Failure Considerations

PostSync hooks run after the application is already deployed. If a notification hook fails:

- The application is already running the new version
- ArgoCD marks the sync as "Failed" even though the application resources are deployed
- The failed hook Job remains for debugging

This means a notification failure should not be critical. Use `|| true` or `|| echo "failed"` to prevent the hook from failing if a notification channel is down:

```bash
# Non-critical notification - do not fail the hook
curl -sf -X POST "$SLACK_WEBHOOK" ... || echo "Slack notification failed, continuing"
```

If you want the hook to always succeed regardless of notification failures:

```yaml
command:
  - /bin/sh
  - -c
  - |
    # Try to notify, but always exit 0
    curl -sf -X POST "$SLACK_WEBHOOK" ... || true
    exit 0
```

## PostSync vs ArgoCD Notifications

ArgoCD has a built-in notification system (argocd-notifications-controller) that can send notifications on various events. When should you use PostSync hooks instead?

**Use PostSync hooks when:**
- You need complex notification logic (aggregation, formatting, multiple API calls)
- You need to query the cluster for deployment details
- You need to interact with APIs that require custom authentication

**Use built-in ArgoCD notifications when:**
- Simple Slack/Teams/email notifications are sufficient
- You want centralized notification configuration
- You need notifications for events other than sync (health changes, sync started, etc.)

## Summary

PostSync notification hooks give you full control over deployment notifications. They run after all resources are deployed, support any notification channel reachable via HTTP, and integrate naturally with the ArgoCD sync lifecycle. Keep notification hooks non-critical by handling errors gracefully, and use `BeforeHookCreation` delete policy to automatically clean up previous notification Jobs.
