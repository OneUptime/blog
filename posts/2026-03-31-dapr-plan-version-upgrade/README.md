# How to Plan a Dapr Version Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Upgrade, Kubernetes, Planning, DevOps

Description: A practical checklist and planning guide for upgrading Dapr to a new version, covering compatibility checks, staging validation, and production rollout strategy.

---

## Why Dapr Upgrades Require Planning

Dapr upgrades can involve runtime API changes, component spec changes, and SDK compatibility requirements. An unplanned upgrade can break service-to-service communication, cause component initialization failures, or introduce behavioral changes that affect application logic. Structured upgrade planning minimizes these risks.

## Pre-Upgrade Checklist

Run through this checklist before upgrading:

```bash
#!/bin/bash
# pre-upgrade-checklist.sh

CURRENT_VERSION=$(dapr --version 2>/dev/null | grep "Runtime version" | awk '{print $3}')
TARGET_VERSION="${1:-1.14.0}"

echo "=== Dapr Upgrade Pre-Check ==="
echo "Current version: $CURRENT_VERSION"
echo "Target version: $TARGET_VERSION"
echo ""

echo "[1] Checking Dapr CLI version..."
dapr --version

echo "[2] Current Kubernetes version..."
kubectl version

echo "[3] Listing installed Dapr components..."
kubectl get components --all-namespaces

echo "[4] Listing Dapr configurations..."
kubectl get configurations --all-namespaces

echo "[5] Checking for deprecated API versions in components..."
kubectl get components --all-namespaces -o json | \
  jq '.items[] | select(.apiVersion | test("v1alpha1")) |
  {name: .metadata.name, apiVersion: .apiVersion}'

echo "[6] SDK versions in use..."
kubectl get deployments --all-namespaces -o json | \
  jq '.items[].spec.template.spec.containers[].env[] |
  select(.name | test("DAPR.*VERSION"; "i"))'
```

## Reading the Release Notes

Before any upgrade, review the release notes for:
- Breaking changes in component specs
- Deprecated building block APIs
- New required fields in CRDs
- Changes to default behavior

```bash
# Fetch release notes for target version
curl -s "https://api.github.com/repos/dapr/dapr/releases/tags/v${TARGET_VERSION}" | \
  jq -r '.body' | head -100
```

## Upgrade Strategy Selection

Choose an upgrade strategy based on your risk tolerance:

| Strategy | Downtime | Risk | Best For |
|----------|----------|------|----------|
| In-place rolling | None | Medium | Non-critical services |
| Blue-green | Minimal | Low | Production services |
| Canary | None | Low | High-traffic services |

## Planning the Upgrade Sequence

Dapr recommends upgrading control plane before sidecars:

```text
1. Upgrade Dapr control plane (dapr-operator, dapr-sentry, dapr-sidecar-injector, dapr-scheduler-server, dapr-placement-server)
2. Restart services one by one to update sidecar versions
3. Upgrade Dapr CLI on developer workstations
4. Update Dapr SDK versions in application code (separate sprint if needed)
```

Document the sequence in a runbook:

```yaml
# upgrade-runbook.yaml
upgrade_plan:
  target_version: "1.14.0"
  scheduled_date: "2026-04-15T02:00:00Z"
  steps:
  - step: 1
    action: "Backup all Dapr component configurations"
    command: "bash scripts/backup-dapr-config.sh"
    rollback: "N/A"
  - step: 2
    action: "Deploy to staging cluster"
    command: "helm upgrade dapr dapr/dapr --version 1.14.0 -n dapr-system --wait"
    rollback: "helm rollback dapr -n dapr-system"
  - step: 3
    action: "Run integration tests in staging"
    command: "pytest tests/integration/ -v"
    rollback: "Abort and investigate failures"
  - step: 4
    action: "Upgrade production control plane"
    command: "helm upgrade dapr dapr/dapr --version 1.14.0 -n dapr-system --wait"
    rollback: "helm rollback dapr -n dapr-system"
```

## Communicating the Upgrade Plan

Notify stakeholders and set a maintenance window:

```bash
# Record the planned upgrade as an annotation on the dapr-system namespace
kubectl annotate namespace dapr-system \
  dapr.io/upgrade-planned="v1.14.0 scheduled for 2026-04-15T02:00:00Z" \
  --overwrite
```

## Summary

Planning a Dapr version upgrade requires checking current and target version compatibility, reviewing release notes for breaking changes, selecting an appropriate upgrade strategy (rolling, blue-green, or canary), and documenting the upgrade sequence as an executable runbook. Always validate the upgrade in staging before production, keep a tested rollback procedure ready, and back up all Dapr component configurations before starting. Schedule upgrades during low-traffic windows and communicate the maintenance plan to all stakeholders.
