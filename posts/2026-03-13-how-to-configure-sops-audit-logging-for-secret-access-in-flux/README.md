# How to Configure SOPS Audit Logging for Secret Access in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, SOPS, Secrets, Encryption, Audit, Logging, Compliance, Security

Description: Learn how to set up audit logging for SOPS secret access in Flux to track who decrypts secrets and when for compliance and security monitoring.

---

Tracking who accesses encrypted secrets and when is a critical requirement for security compliance. While SOPS encrypts secrets at rest, you also need visibility into decryption events. This guide covers multiple approaches to audit logging for SOPS secret access in a Flux environment, from SOPS built-in audit features to Kubernetes-level monitoring.

## Why Audit Logging Matters

Compliance frameworks like SOC 2, HIPAA, and PCI DSS require tracking access to sensitive data. Audit logs help you detect unauthorized access attempts, investigate security incidents, prove compliance during audits, and understand access patterns across your team.

## SOPS Built-In Audit Logging

SOPS supports an audit logging feature that records decryption events. Configure it by creating a SOPS audit configuration file.

Create `/etc/sops/audit.yaml` (or a custom path):

```yaml
backends:
  file:
    - path: /var/log/sops-audit.log
```

Set the environment variable to enable it:

```bash
export SOPS_AUDIT_LOG=/etc/sops/audit.yaml
```

Each decryption event is logged with the file path, timestamp, and encryption keys used. However, this only works for local SOPS operations, not for Flux in-cluster decryption.

## Kubernetes Audit Logging for Secrets

Kubernetes audit logging captures Secret creation and access events. Since Flux creates Kubernetes Secrets from SOPS-encrypted files, you can track when secrets are created or updated.

Configure the Kubernetes audit policy:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log all Secret operations
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets"]
    verbs: ["create", "update", "patch", "delete"]

  # Log detailed Secret reads (be careful with volume)
  - level: Request
    resources:
      - group: ""
        resources: ["secrets"]
    verbs: ["get", "list", "watch"]
    users: ["system:serviceaccount:flux-system:kustomize-controller"]

  # Catch-all for other resources
  - level: Metadata
    resources:
      - group: ""
```

Apply the audit policy to the API server. On managed Kubernetes services:

For EKS:

```bash
aws eks update-cluster-config \
  --name my-cluster \
  --logging '{"clusterLogging":[{"types":["audit"],"enabled":true}]}'
```

For GKE:

```bash
gcloud container clusters update my-cluster \
  --enable-master-global-access \
  --region us-central1
```

GKE enables audit logging by default and sends logs to Cloud Logging.

## Flux Event Monitoring

Flux emits Kubernetes events during reconciliation, including when it decrypts SOPS secrets. Monitor these events:

```bash
# Watch Flux events in real time
kubectl get events -n flux-system --watch --field-selector reason=ReconciliationSucceeded

# Get events related to a specific Kustomization
kubectl describe kustomization secrets -n flux-system
```

Create an event-driven alerting system with Flux notification controller:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: secret-changes
  namespace: flux-system
spec:
  providerRef:
    name: slack-webhook
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: secrets
      namespace: flux-system
  inclusionList:
    - ".*[Ss]ecret.*"
```

Configure the notification provider:

```yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: slack-webhook
  namespace: flux-system
spec:
  type: slack
  channel: security-alerts
  secretRef:
    name: slack-webhook-url
```

## Git-Based Audit Trail

Git itself provides an audit trail for secret changes. Track who modified encrypted files:

```bash
# View history of a specific secret file
git log --follow --all -- secrets/app-secret.yaml

# Show who last modified each secret file
git log --format='%H %ai %an %s' -- secrets/

# Find all commits that touched secret files
git log --all --diff-filter=M -- '*secret*'
```

Enforce signed commits for secret files to ensure attribution:

```yaml
# .github/workflows/verify-signatures.yaml
name: Verify Commit Signatures
on:
  pull_request:
    paths:
      - '**/secret*.yaml'
      - '**/credential*.yaml'
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Verify signatures
        run: |
          COMMITS=$(git log --format=%H origin/main..HEAD -- '*secret*')
          for commit in $COMMITS; do
            if ! git verify-commit "$commit" 2>/dev/null; then
              echo "WARNING: Unsigned commit $commit modifies secret files"
            fi
          done
```

## Cloud KMS Audit Logs

When using cloud KMS providers with SOPS, each decryption operation is logged by the cloud provider.

### AWS KMS CloudTrail

AWS CloudTrail automatically logs all KMS Decrypt API calls:

```bash
# Query CloudTrail for KMS decrypt events
aws cloudtrail lookup-events \
  --lookup-attributes AttributeKey=EventName,AttributeValue=Decrypt \
  --start-time 2026-03-01 \
  --end-time 2026-03-13
```

### GCP Cloud KMS Audit Logs

GCP Cloud Audit Logs records KMS operations:

```bash
gcloud logging read 'resource.type="cloudkms_cryptokey" AND protoPayload.methodName="Decrypt"' \
  --project=my-project \
  --limit=50
```

### Azure Key Vault Diagnostics

Enable diagnostics on Azure Key Vault:

```bash
az monitor diagnostic-settings create \
  --resource /subscriptions/.../vaults/sops-flux-vault \
  --name sops-audit \
  --logs '[{"category":"AuditEvent","enabled":true}]' \
  --workspace /subscriptions/.../workspaces/my-workspace
```

## Custom Audit Sidecar

Deploy a sidecar container alongside the Flux kustomize-controller to monitor secret operations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: audit-logger
          image: bitnami/kubectl:latest
          command:
            - sh
            - -c
            - |
              while true; do
                kubectl get events -n flux-system \
                  --field-selector reason=ReconciliationSucceeded \
                  --sort-by='.lastTimestamp' \
                  --no-headers | tail -5
                sleep 60
              done
```

## Centralized Logging

Forward audit logs to a centralized logging system. Using Fluentd or Fluent Bit to collect Kubernetes audit logs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  filter.conf: |
    [FILTER]
        Name    grep
        Match   kube.*
        Regex   $kubernetes['labels']['app'] kustomize-controller

    [FILTER]
        Name    grep
        Match   audit.*
        Regex   objectRef.resource secrets
```

## Building an Audit Dashboard

Create a simple audit report from Git and Kubernetes data:

```bash
#!/bin/bash
# scripts/audit-report.sh

echo "=== SOPS Secret Audit Report ==="
echo "Generated: $(date -u)"
echo ""

echo "--- Recent Secret File Changes (Git) ---"
git log --since="30 days ago" --format='%ai | %an | %s' -- '*secret*' '*credential*'

echo ""
echo "--- Current Encrypted Files ---"
find . -name '*.yaml' -exec grep -l "sops:" {} \; | while read f; do
  LAST_MODIFIED=$(git log -1 --format='%ai' -- "$f")
  LAST_AUTHOR=$(git log -1 --format='%an' -- "$f")
  echo "$f | Last modified: $LAST_MODIFIED by $LAST_AUTHOR"
done

echo ""
echo "--- Flux Reconciliation Status ---"
kubectl get kustomizations -A -o custom-columns='NAME:.metadata.name,STATUS:.status.conditions[0].status,LAST:.status.lastAppliedRevision'
```

## Conclusion

Audit logging for SOPS secret access in Flux requires a multi-layered approach. Git provides the change history, Kubernetes audit logs capture runtime access, cloud KMS providers log decryption operations, and Flux notifications alert on reconciliation events. By combining these layers, you create a comprehensive audit trail that satisfies compliance requirements and supports security investigations.
