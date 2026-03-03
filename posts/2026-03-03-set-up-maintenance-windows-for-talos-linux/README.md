# How to Set Up Maintenance Windows for Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Maintenance Window, Operations, Infrastructure

Description: Learn how to define, implement, and enforce maintenance windows for Talos Linux clusters to keep operations predictable and minimize service disruptions.

---

Every production cluster needs maintenance windows. Without them, you end up with ad-hoc changes happening at random times, unexpected disruptions during business hours, and a general sense of chaos. Talos Linux clusters are no exception. Even though Talos simplifies many operational tasks with its immutable, API-driven design, you still need structured time periods for upgrades, patches, and other maintenance activities.

This guide covers how to set up proper maintenance windows for your Talos Linux clusters, from defining the windows themselves to enforcing them with tooling.

## Why You Need Maintenance Windows

A maintenance window is a pre-agreed time period during which disruptive changes are allowed. Outside these windows, the cluster should be left alone unless there is an emergency.

The benefits are straightforward:

- Teams know when to expect potential disruptions
- On-call engineers are prepared during maintenance windows
- Stakeholders can plan around known maintenance periods
- Change management becomes auditable
- Risk is reduced because changes happen when people are paying attention

## Choosing Your Maintenance Window Times

The best maintenance window time depends on your specific situation. Consider these factors:

**Traffic patterns** - Look at your application traffic. Find the lowest traffic period and schedule maintenance there.

**Team availability** - Your operations team needs to be available during the window. Late night windows sound good for low traffic, but they are terrible for your team's health.

**Dependent services** - If your cluster depends on external services that have their own maintenance windows, avoid overlapping schedules.

**Geographic distribution** - For globally distributed teams, find a window that works across time zones, or rotate the window schedule.

```bash
# Check your cluster's resource usage patterns to find low-traffic periods
# Run this over a week to identify patterns
kubectl top pods --all-namespaces --sort-by=cpu
```

A common setup for a US-based team:

```yaml
# maintenance-windows.yaml
maintenance_windows:
  weekly_patch:
    day: "Tuesday"
    start: "02:00 UTC"
    end: "06:00 UTC"
    duration: "4 hours"
    allowed_operations:
      - minor_upgrades
      - configuration_changes
      - certificate_renewals
    max_nodes_affected: "25%"

  monthly_upgrade:
    day: "first Saturday"
    start: "00:00 UTC"
    end: "08:00 UTC"
    duration: "8 hours"
    allowed_operations:
      - major_upgrades
      - kubernetes_version_upgrades
      - node_replacements
    max_nodes_affected: "50%"

  emergency:
    trigger: "P1 security incident"
    approval_required: "VP Engineering"
    duration: "as needed"
    allowed_operations:
      - any
```

## Implementing Maintenance Windows with System Upgrade Controller

The Talos System Upgrade Controller can be configured to respect maintenance windows. It works by scheduling upgrades and ensuring they only happen during allowed time periods.

First, install the system upgrade controller if you have not already:

```bash
# Apply the system upgrade controller
kubectl apply -f https://github.com/siderolabs/system-upgrade-controller/releases/latest/download/system-upgrade-controller.yaml
```

Then create upgrade plans that respect your maintenance windows:

```yaml
apiVersion: upgrade.cattle.io/v1
kind: Plan
metadata:
  name: talos-upgrade
  namespace: system-upgrade
spec:
  concurrency: 1
  nodeSelector:
    matchExpressions:
      - key: node-role.kubernetes.io/control-plane
        operator: DoesNotExist
  serviceAccountName: system-upgrade
  tolerations:
    - operator: Exists
  upgrade:
    image: ghcr.io/siderolabs/installer
    command:
      - /bin/sh
      - -c
      - |
        # Check if we are inside a maintenance window
        HOUR=$(date -u +%H)
        DAY=$(date -u +%u)  # 1=Monday, 2=Tuesday

        # Only proceed on Tuesdays between 02:00 and 06:00 UTC
        if [ "$DAY" != "2" ] || [ "$HOUR" -lt 2 ] || [ "$HOUR" -ge 6 ]; then
          echo "Outside maintenance window. Skipping upgrade."
          exit 0
        fi

        # Proceed with upgrade
        talosctl upgrade --image ghcr.io/siderolabs/installer:v1.9.1
```

## Enforcing Windows with Admission Webhooks

For stricter enforcement, you can use a Kubernetes admission webhook that rejects disruptive operations outside maintenance windows. This prevents someone from accidentally (or intentionally) making changes when they should not.

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: maintenance-window-enforcement
webhooks:
  - name: maintenance.enforcement.local
    clientConfig:
      service:
        name: maintenance-enforcer
        namespace: kube-system
        path: /validate
    rules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["DELETE"]
        resources: ["nodes"]
      - apiGroups: [""]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["nodes/status"]
    failurePolicy: Ignore
    sideEffects: None
    admissionReviewVersions: ["v1"]
```

The webhook service would check the current time against your defined maintenance windows and reject operations that fall outside them.

## Setting Up Notifications

People need to know when a maintenance window is approaching. Set up automated notifications:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: maintenance-window-reminder
  namespace: maintenance
spec:
  # Run 2 hours before the Tuesday maintenance window
  schedule: "0 0 * * 2"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: notifier
            image: curlimages/curl:latest
            env:
            - name: SLACK_WEBHOOK
              valueFrom:
                secretKeyRef:
                  name: slack-webhook
                  key: url
            command:
            - /bin/sh
            - -c
            - |
              curl -X POST "$SLACK_WEBHOOK" \
                -H 'Content-Type: application/json' \
                -d '{
                  "text": "Reminder: Maintenance window opens in 2 hours (02:00-06:00 UTC). Please prepare your workloads."
                }'
          restartPolicy: OnFailure
```

Create similar CronJobs for window-open and window-close notifications.

## Pre-Window Health Checks

Before the maintenance window opens, run automated health checks to confirm the cluster is in a good state:

```bash
#!/bin/bash
# pre-maintenance-check.sh

echo "Running pre-maintenance health checks..."

# Check node health
NODES_NOT_READY=$(kubectl get nodes --no-headers | grep -v "Ready" | wc -l)
if [ "$NODES_NOT_READY" -gt 0 ]; then
    echo "FAIL: $NODES_NOT_READY nodes are not Ready"
    exit 1
fi

# Check etcd health
talosctl etcd status -n <control-plane-ip> || {
    echo "FAIL: etcd is not healthy"
    exit 1
}

# Check for pending PVCs
PENDING_PVCS=$(kubectl get pvc --all-namespaces --no-headers | grep Pending | wc -l)
if [ "$PENDING_PVCS" -gt 0 ]; then
    echo "WARNING: $PENDING_PVCS PVCs are in Pending state"
fi

# Take etcd backup
talosctl etcd snapshot /backup/etcd-pre-maintenance-$(date +%Y%m%d%H%M).db -n <control-plane-ip>

echo "Pre-maintenance checks passed. Window is safe to open."
```

## Documenting Maintenance Windows

Create clear documentation that is accessible to everyone who needs it:

```yaml
# maintenance-policy.yaml
policy:
  version: "1.0"
  last_updated: "2026-03-01"

  regular_windows:
    - name: "Weekly Patch Tuesday"
      schedule: "Every Tuesday 02:00-06:00 UTC"
      scope: "Minor patches, config changes"
      lead: "on-call SRE"
      notification_channels:
        - "#ops-maintenance (Slack)"
        - "ops-team@company.com"

    - name: "Monthly Major Upgrade"
      schedule: "First Saturday 00:00-08:00 UTC"
      scope: "Major upgrades, node replacements"
      lead: "Platform Engineering Lead"
      notification_channels:
        - "#ops-maintenance (Slack)"
        - "#engineering (Slack)"
        - "all-eng@company.com"

  emergency_procedure:
    trigger: "P1 security vulnerability or critical outage"
    approval: "VP Engineering + Security Lead"
    notification: "Immediate via PagerDuty"

  blackout_periods:
    - "Black Friday through Cyber Monday"
    - "Last week of December"
    - "Company product launches (as announced)"
```

## Post-Window Verification

After the maintenance window closes, run verification to confirm everything is healthy:

```bash
#!/bin/bash
# post-maintenance-check.sh

echo "Running post-maintenance verification..."

# Verify all nodes
kubectl get nodes -o wide

# Check all system pods
kubectl get pods -n kube-system

# Verify Talos versions
for node in $(kubectl get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}'); do
    echo "Node $node:"
    talosctl version -n "$node" 2>/dev/null | grep Tag
done

# Check certificate status
talosctl get certificate -n <control-plane-ip>

# Verify etcd
talosctl etcd status -n <control-plane-ip>

echo "Post-maintenance verification complete."
```

## Tracking Maintenance History

Keep a log of everything that happens during each maintenance window. This helps with troubleshooting, auditing, and improving your processes over time.

```yaml
# maintenance-log-2026-03-03.yaml
window: "Weekly Patch Tuesday"
date: "2026-03-03"
start_time: "02:00 UTC"
end_time: "04:30 UTC"
engineer: "Jane Smith"
activities:
  - description: "Upgraded worker nodes to Talos v1.9.1"
    nodes_affected: ["worker-01", "worker-02", "worker-03"]
    result: "success"
  - description: "Applied network policy update"
    result: "success"
issues:
  - description: "worker-02 took longer than expected to rejoin"
    resolution: "Node had slow disk I/O, resolved after reboot"
    duration: "15 minutes"
overall_status: "success"
```

## Conclusion

Setting up maintenance windows for Talos Linux is about creating a predictable rhythm for your operations. Define clear windows based on your traffic patterns and team availability, automate notifications, run pre-flight checks, and document everything. The immutable nature of Talos Linux makes maintenance operations more predictable than traditional systems, but you still need the discipline of structured change management to run a reliable production cluster.
