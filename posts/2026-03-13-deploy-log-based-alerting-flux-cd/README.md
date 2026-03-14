# How to Deploy Log-Based Alerting with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Logging, Alerting, Elastalert, OpenSearch

Description: Set up log-based alerting using Elastalert2 managed by Flux CD to trigger alerts from Elasticsearch and OpenSearch log patterns.

---

## Introduction

Log-based alerting bridges the gap between your logging infrastructure and your incident response workflows. Rather than waiting for a user to notice an error pattern in Kibana, tools like Elastalert2 continuously query Elasticsearch or OpenSearch and fire alerts to Slack, PagerDuty, or email when rules match. Elastalert2 is the actively maintained community fork of the original Yelp Elastalert project.

Managing alert rules through Flux CD means your alert definitions live in Git alongside the logging infrastructure they monitor. New rules are added through pull requests, ensuring review and preventing runaway alert noise from untested rules landing in production. Rule changes are automatically applied when Elastalert2 restarts - no manual SSH or API calls required.

This guide deploys Elastalert2 as a Flux HelmRelease and configures a set of common alert rules stored as ConfigMaps in Git.

## Prerequisites

- Elasticsearch 7.x+ or OpenSearch with logs being indexed
- Flux CD bootstrapped to your Git repository
- Slack webhook URL or other notification endpoint
- `kubectl` and `flux` CLIs installed

## Step 1: Add the Elastalert2 HelmRepository

```yaml
# infrastructure/sources/elastalert2-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: elastalert2
  namespace: flux-system
spec:
  interval: 12h
  url: https://jertel.github.io/elastalert2
```

## Step 2: Store Alert Credentials in Secrets

```yaml
# infrastructure/logging/alerting-secrets.yaml (use SealedSecret in production)
apiVersion: v1
kind: Secret
metadata:
  name: alerting-credentials
  namespace: logging
type: Opaque
stringData:
  elasticsearch-password: "supersecret"
  slack-webhook-url: "https://hooks.slack.com/services/T.../B.../..."
  pagerduty-service-key: "abc123def456"
```

## Step 3: Define Alert Rules as a ConfigMap

```yaml
# infrastructure/logging/alert-rules-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: elastalert2-rules
  namespace: logging
data:
  # Rule 1: Alert on high error rate
  high-error-rate.yaml: |
    name: High Application Error Rate
    type: frequency
    index: kubernetes-*
    num_events: 50
    timeframe:
      minutes: 5
    filter:
      - term:
          level: "error"
    alert:
      - slack
    slack_webhook_url: "${SLACK_WEBHOOK_URL}"
    slack_channel_override: "#alerts-critical"
    slack_msg_color: danger
    alert_text: |
      High error rate detected!
      {0} errors in the last 5 minutes.
    alert_text_args:
      - num_events

  # Rule 2: Alert on OOMKilled containers
  oomkilled.yaml: |
    name: Container OOMKilled
    type: any
    index: kubernetes-*
    filter:
      - term:
          kubernetes.reason: "OOMKilled"
    alert:
      - slack
    slack_webhook_url: "${SLACK_WEBHOOK_URL}"
    slack_channel_override: "#alerts-infra"
    alert_text: "Container OOMKilled in namespace: {0}, pod: {1}"
    alert_text_args:
      - kubernetes.namespace_name
      - kubernetes.pod_name

  # Rule 3: Alert on 5xx HTTP errors
  http-5xx-errors.yaml: |
    name: HTTP 5xx Errors Spike
    type: spike
    index: nginx-*
    threshold_ref: 10
    threshold_cur: 50
    spike_height: 3
    spike_type: up
    timeframe:
      hours: 1
    filter:
      - range:
          response:
            gte: 500
            lt: 600
    alert:
      - pagerduty
    pagerduty_service_key: "${PAGERDUTY_SERVICE_KEY}"
    pagerduty_client: "Elastalert2"
```

## Step 4: Deploy Elastalert2 via HelmRelease

```yaml
# infrastructure/logging/elastalert2.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: elastalert2
  namespace: logging
spec:
  interval: 30m
  chart:
    spec:
      chart: elastalert2
      version: "2.18.0"
      sourceRef:
        kind: HelmRepository
        name: elastalert2
        namespace: flux-system
  values:
    replicaCount: 1

    resources:
      requests:
        cpu: "100m"
        memory: "256Mi"
      limits:
        cpu: "500m"
        memory: "512Mi"

    # Inject credentials as environment variables
    envFrom:
      - secretRef:
          name: alerting-credentials

    elastalertConfig:
      # Elastalert2 core configuration
      es_host: elasticsearch-master.logging.svc.cluster.local
      es_port: 9200
      es_username: elastic
      es_password: "${ELASTICSEARCH_PASSWORD}"
      # How frequently to run each rule
      run_every:
        minutes: 1
      # Buffer period
      buffer_time:
        minutes: 15
      # Where to store Elastalert's own state
      writeback_index: elastalert2_status
      alert_time_limit:
        days: 2

    # Mount rules from ConfigMap
    rules:
      - name: high-error-rate
        path: /opt/elastalert/rules/high-error-rate.yaml
      - name: oomkilled
        path: /opt/elastalert/rules/oomkilled.yaml
      - name: http-5xx-errors
        path: /opt/elastalert/rules/http-5xx-errors.yaml

    extraVolumes:
      - name: alert-rules
        configMap:
          name: elastalert2-rules
    extraVolumeMounts:
      - name: alert-rules
        mountPath: /opt/elastalert/rules
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/production/alerting-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: log-alerting
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/logging/alerting
  prune: true
  dependsOn:
    - name: elasticsearch
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: elastalert2
      namespace: logging
```

## Step 6: Verify Alert Rules

```bash
# Check Elastalert2 is running
kubectl get deployment elastalert2 -n logging

# View Elastalert2 logs to confirm rules are loading
kubectl logs -n logging deployment/elastalert2 --tail=50

# Manually test a rule
kubectl exec -n logging deployment/elastalert2 -- \
  elastalert-test-rule /opt/elastalert/rules/high-error-rate.yaml

# Check Elastalert status index in Elasticsearch
kubectl exec -n logging elasticsearch-master-0 -- \
  curl -s http://localhost:9200/elastalert2_status*/_count | jq .
```

## Best Practices

- Test all alert rules with `elastalert-test-rule` in a development environment before merging to the main branch.
- Use the `frequency` rule type for threshold-based alerting and `spike` for sudden changes to reduce alert fatigue.
- Set `realert.minutes` on rules to prevent the same alert from firing repeatedly within a short window.
- Store Slack webhook URLs and PagerDuty keys in Kubernetes Secrets - inject them as environment variables, never hardcode in ConfigMaps.
- Use Git tags and Flux image policies to manage Elastalert2 version upgrades systematically.

## Conclusion

Elastalert2 deployed and configured through Flux CD brings GitOps discipline to your log-based alerting. Alert rules are peer-reviewed, versioned, and automatically applied - eliminating the risk of unreviewed rules causing alert storms in production. Combined with your Flux-managed logging stack, you now have end-to-end observability infrastructure that is fully described in Git and automatically reconciled across your environments.
