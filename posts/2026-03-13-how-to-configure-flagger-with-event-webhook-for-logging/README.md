# How to Configure Flagger with event Webhook for Logging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flagger, Canary, Webhook, Event, Logging, Notification, Kubernetes, Progressive Delivery

Description: Learn how to configure event webhooks in Flagger to log canary deployment state transitions and integrate with external notification and tracking systems.

---

## Introduction

Flagger's `event` webhook type fires whenever Flagger emits a Kubernetes event for a canary. Unlike other webhook types that fire at specific points in the deployment lifecycle, event webhooks fire for the actions Flagger takes during a canary deployment: when the canary starts progressing, when it advances to a new traffic weight, when it succeeds, and when it fails. This makes event webhooks the best choice for comprehensive deployment logging, audit trails, and real-time monitoring dashboards.

The event webhook provides a unified stream of canary lifecycle events, eliminating the need to configure separate webhooks for each lifecycle point. If you need a complete log of Flagger's actions during a canary deployment, the event webhook is the right tool.

This guide covers how to configure event webhooks, the event payload structure, and patterns for logging and notification integration.

## Prerequisites

- A running Kubernetes cluster with Flagger installed
- A Canary resource targeting a Deployment
- kubectl access to your cluster
- A logging or notification service that accepts HTTP POST requests

## How event Webhooks Work

Flagger fires event webhooks when it records canary events. The key events include:

- Canary starts progressing (new revision detected)
- Traffic weight increases
- Metric checks pass or fail
- Canary is promoted
- Canary is rolled back
- Canary analysis reaches a new phase

The event webhook receives a POST request with the canary name, namespace, current phase, checksum, event metadata, and any configured metadata. The `phase` field in the payload reflects the canary phase at the time of the event.

## Configuring an event Webhook

Add a webhook with `type: event` to the analysis section:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: default
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  service:
    port: 80
    targetPort: 8080
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    webhooks:
      - name: event-logger
        type: event
        url: http://event-logger.default.svc.cluster.local/events
```

Flagger sends a POST request for each emitted event with a payload like:

```json
{
  "name": "my-app",
  "namespace": "default",
  "phase": "Progressing",
  "checksum": "85d557f47b",
  "metadata": {
    "eventMessage": "New revision detected! Scaling up my-app.default",
    "eventType": "Normal",
    "timestamp": "1578607635167"
  }
}
```

The `phase` field reflects the current canary phase. Common phases include `Initialized`, `Waiting`, `Progressing`, `WaitingPromotion`, `Promoting`, `Finalising`, `Succeeded`, and `Failed`.

## Logging to an External System

To send events to an external logging service, point the webhook URL to your log aggregation endpoint:

```yaml
    webhooks:
      - name: deployment-log
        type: event
        url: http://deployment-tracker.default.svc.cluster.local/log
        timeout: 15s
        metadata:
          service: my-app
          environment: production
          team: backend
```

Your logging service receives each event with Flagger's event metadata and the metadata you define. This creates a complete audit trail of each deployment.

## Sending Events to Slack

For real-time team notifications on every deployment event, combine the event webhook with a Slack integration service:

```yaml
    webhooks:
      - name: slack-events
        type: event
        url: http://slack-notifier.default.svc.cluster.local/notify
        timeout: 10s
        metadata:
          channel: "#deployments"
          service: my-app
```

Your Slack notifier service formats the event data and posts it to the specified channel. The team sees messages for each stage of the canary deployment.

## Using the Load Tester for Event Logging

If you do not have a dedicated event logging service, you can use the Flagger load tester to execute commands on each event:

```yaml
    webhooks:
      - name: event-log
        type: event
        url: http://flagger-loadtester.test/
        timeout: 15s
        metadata:
          type: bash
          cmd: |
            echo "Flagger event: $(date) - Phase change detected" >> /tmp/flagger-events.log
```

This is a simple approach for development environments. For production, use a proper logging service that persists events.

## Building a Comprehensive Event Logger

A production event logger should capture and store all event data for querying. Here is an example Deployment for a simple event logger:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flagger-event-logger
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: flagger-event-logger
  template:
    metadata:
      labels:
        app: flagger-event-logger
    spec:
      containers:
        - name: logger
          image: your-registry/flagger-event-logger:latest
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: flagger-event-logger
  namespace: default
spec:
  selector:
    app: flagger-event-logger
  ports:
    - port: 80
      targetPort: 8080
```

The logger application accepts POST requests, parses the JSON payload, and stores events in a database or forwards them to your observability stack.

## Combining event with Other Webhook Types

The event webhook can coexist with all other webhook types. Event webhooks provide a stream of Flagger events, while targeted webhooks handle specific lifecycle actions:

```yaml
    webhooks:
      - name: event-stream
        type: event
        url: http://event-logger.default/events
        timeout: 10s
        metadata:
          service: my-app
      - name: smoke-test
        type: pre-rollout
        url: http://flagger-loadtester.test/
        timeout: 60s
        metadata:
          type: bash
          cmd: "curl -sf http://my-app-canary.default:80/healthz"
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.test/
        timeout: 5s
        metadata:
          cmd: "hey -z 1m -q 10 -c 2 http://my-app-canary.default:80/"
      - name: rollback-alert
        type: rollback
        url: http://alerting.default/rollback
        timeout: 15s
```

The event webhook logs Flagger's emitted events, while the rollback webhook handles the specific case of sending an alert when a rollback occurs.

## Multiple Event Webhooks

You can define multiple event webhooks to send events to different systems simultaneously:

```yaml
    webhooks:
      - name: log-to-elk
        type: event
        url: http://elk-ingest.monitoring/flagger-events
        timeout: 10s
      - name: log-to-datadog
        type: event
        url: http://datadog-forwarder.monitoring/flagger-events
        timeout: 10s
        metadata:
          service: my-app
      - name: notify-teams
        type: event
        url: http://teams-webhook.default/notify
        timeout: 10s
```

Each event webhook receives the same event data independently.

## Conclusion

The `event` webhook in Flagger provides a unified stream of canary lifecycle events. It fires when Flagger emits Kubernetes events during initialization, progression, promotion, success, or failure. This makes it the best choice for comprehensive deployment logging, audit trails, and real-time monitoring. Unlike targeted webhook types that fire at specific lifecycle points, the event webhook covers the emitted canary events in a single configuration, simplifying observability for your progressive delivery pipeline.
