# How to Set Up Runbooks for Common Flux CD Alerts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Monitoring, Runbook, Incident Response, Alerting

Description: Learn how to create operational runbooks for the most common Flux CD alerts to enable faster incident response and troubleshooting.

---

When Flux CD alerts fire, the on-call engineer needs to know exactly what to do. Runbooks bridge the gap between automated alerting and human action by providing step-by-step procedures for diagnosing and resolving common issues. Well-written runbooks reduce mean time to resolution and allow engineers who are less familiar with Flux to respond effectively.

This guide provides runbook templates for the most common Flux CD alerts and explains how to integrate them into your alerting workflow.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- Prometheus and Alertmanager configured for Flux CD monitoring
- `kubectl` and the `flux` CLI installed
- A documentation platform for hosting runbooks (wiki, Git repository, or incident management tool)

## Linking Runbooks to Alerts

Every Prometheus alert should include a `runbook_url` annotation that links directly to the relevant runbook. This ensures the on-call engineer can access instructions immediately when an alert fires:

```yaml
groups:
  - name: flux-alerts
    rules:
      - alert: FluxReconciliationFailed
        expr: gotk_reconcile_condition{type="Ready", status="False"} == 1
        for: 15m
        labels:
          severity: critical
        annotations:
          summary: "Flux reconciliation failing for {{ $labels.kind }}/{{ $labels.name }}"
          runbook_url: "https://wiki.example.com/runbooks/flux-reconciliation-failed"
```

## Runbook 1: Reconciliation Failed

**Alert**: FluxReconciliationFailed
**Severity**: Critical
**Description**: A Flux resource has been in a non-ready state for more than 15 minutes.

**Diagnosis steps**:

```bash
# Check which resources are failing
flux get all --status-selector ready=false

# Get detailed status for the failing resource
flux get kustomizations <name> -n <namespace>

# Check the controller logs for errors
kubectl logs -n flux-system deployment/kustomize-controller --tail=50 | grep <resource-name>

# Check Kubernetes events
kubectl get events -n flux-system --sort-by=.lastTimestamp | tail -20
```

**Common causes and remediation**:

- **Syntax error in manifests**: Fix the YAML in the Git repository and push the correction
- **Missing secret or configmap**: Create the missing resource or check if it was accidentally deleted
- **RBAC permission denied**: Verify the Flux service account has the required permissions
- **Dependency not ready**: Check if a dependent Kustomization or source is failing using `flux tree kustomization <name>`

## Runbook 2: Source Fetch Failed

**Alert**: FluxSourceFetchFailed
**Severity**: Warning
**Description**: A GitRepository or HelmRepository source cannot be fetched.

**Diagnosis steps**:

```bash
# Check source status
flux get sources all

# Get detailed error message
kubectl describe gitrepository <name> -n flux-system

# Test Git connectivity from the cluster
kubectl run git-test --rm -it --image=alpine/git -- git ls-remote <repo-url>

# Check if credentials secret exists and is valid
kubectl get secret <secret-name> -n flux-system -o yaml
```

**Common causes and remediation**:

- **Authentication failure**: Rotate the deploy key or token, update the Kubernetes secret
- **Repository not found**: Verify the repository URL is correct and accessible
- **Rate limiting**: Check if you are hitting API rate limits (especially with GitHub). Increase the reconciliation interval
- **Network issue**: Verify DNS resolution and network policies allow egress to the Git provider

## Runbook 3: Helm Release Failed

**Alert**: FluxHelmReleaseFailed
**Severity**: Critical
**Description**: A HelmRelease has failed to install or upgrade.

**Diagnosis steps**:

```bash
# Check HelmRelease status
flux get helmreleases --all-namespaces

# Get detailed error information
kubectl describe helmrelease <name> -n <namespace>

# Check Helm history for the release
helm history <release-name> -n <namespace>

# Check the helm-controller logs
kubectl logs -n flux-system deployment/helm-controller --tail=100 | grep <release-name>
```

**Common causes and remediation**:

- **Values validation error**: Check that the values in the HelmRelease spec are valid for the chart version
- **Resource conflict**: Another release or manual deployment owns a resource the chart tries to create. Use `--force` or delete the conflicting resource
- **Timeout**: Increase `spec.timeout` in the HelmRelease if the chart takes longer than expected to install
- **OOM killed**: Check if Helm controller pods are being OOM killed during large releases. Increase memory limits

## Runbook 4: Image Scan Failed

**Alert**: FluxImageScanFailed
**Severity**: Warning
**Description**: An ImageRepository scan has been failing for more than 15 minutes.

**Diagnosis steps**:

```bash
# Check image repository status
flux get image repository --all-namespaces

# Get detailed error
kubectl describe imagerepository <name> -n flux-system

# Verify registry credentials
kubectl get secret <secret-name> -n flux-system -o jsonpath='{.data.\.dockerconfigjson}' | base64 -d

# Test registry access
kubectl run registry-test --rm -it --image=curlimages/curl -- curl -v https://<registry>/v2/
```

**Common causes and remediation**:

- **Expired credentials**: Refresh the registry authentication token
- **Registry unavailable**: Check the registry status page. Wait for recovery if it is a provider outage
- **Too many tags**: Add exclusion patterns to reduce the scan scope

## Runbook 5: Notification Delivery Failed

**Alert**: FluxNotificationDeliveryFailed
**Severity**: Warning
**Description**: The notification controller is unable to deliver alerts to the configured provider.

**Diagnosis steps**:

```bash
# Check provider status
kubectl get providers -n flux-system

# Check notification controller logs
kubectl logs -n flux-system deployment/notification-controller --tail=50

# Verify the webhook secret
kubectl get secret <webhook-secret> -n flux-system
```

**Common causes and remediation**:

- **Webhook URL changed**: Update the secret with the new webhook URL
- **Network policy blocking egress**: Ensure the notification controller can reach the external webhook endpoint
- **Provider rate limiting**: Reduce notification frequency or batch notifications

## Organizing Your Runbooks

Structure your runbooks consistently with these sections:

1. **Alert description**: What the alert means in plain language
2. **Impact**: What is affected if this issue is not resolved
3. **Diagnosis**: Step-by-step commands to determine the root cause
4. **Remediation**: Actions to fix each common cause
5. **Escalation**: When and how to escalate if the runbook steps do not resolve the issue

Store runbooks in a Git repository alongside your Flux configuration, or in a wiki that your team actively maintains. Review and update runbooks after each incident to capture new failure modes and improved diagnostic steps.

## Summary

Runbooks transform Flux CD alerts from cryptic notifications into actionable procedures. By creating structured runbooks for reconciliation failures, source fetch errors, Helm release problems, image scan issues, and notification delivery failures, you equip your on-call team with the knowledge they need to respond quickly. Link runbooks directly from alert annotations so they are always one click away when an incident occurs, and keep them updated as your Flux configuration evolves.
