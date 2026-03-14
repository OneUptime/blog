# How to Implement GDPR Data Handling Controls with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, GDPR, Compliance, Privacy, Data Protection

Description: Use Flux CD to enforce GDPR-compliant data handling practices in Kubernetes deployments, including data residency controls, access restrictions, and audit trails for personal data processing.

---

## Introduction

GDPR (General Data Protection Regulation) imposes strict requirements on organizations that process personal data of EU residents. For Kubernetes infrastructure teams, the most relevant GDPR obligations are data minimization, purpose limitation, storage limitation, data residency requirements, and the need for demonstrable accountability.

Flux CD GitOps supports GDPR compliance by making all infrastructure decisions explicit, reviewable, and auditable through Git. Data residency constraints (which regions process personal data), access controls (which workloads can reach personal data stores), and retention policies (which resources exist in personal data namespaces) are all declared in Git manifests and enforced by Flux reconciliation.

This guide shows how to implement GDPR-relevant controls in your Flux configuration and how to collect evidence for data protection impact assessments (DPIAs).

## Prerequisites

- Flux CD managing clusters in GDPR-relevant regions
- Regional cluster configurations (or regional namespaces)
- Network policies for data isolation
- A Data Protection Officer (DPO) contact for review
- `flux` CLI and `kubectl` installed

## Step 1: Declare Data Residency with Region-Scoped Kustomizations

GDPR Article 44 restricts cross-border transfers of personal data. Declare data residency requirements in your Flux configuration:

```yaml
# clusters/eu-west-1/flux-system/data-residency.yaml
# This cluster is designated for EU personal data processing only
apiVersion: v1
kind: ConfigMap
metadata:
  name: data-residency-policy
  namespace: flux-system
  labels:
    compliance: gdpr
    data-residency: eu
  annotations:
    gdpr.article: "Article 44 — Transfers subject to appropriate safeguards"
    gdpr.region: "EU (eu-west-1)"
    gdpr.dpo: "dpo@example.com"
data:
  ALLOWED_DATA_CLASSES: "personal-data,sensitive-personal-data"
  GDPR_REGION: "EU"
  DATA_RESIDENCY_ENFORCED: "true"
  CROSS_BORDER_TRANSFER_ALLOWED: "false"
```

```yaml
# clusters/eu-west-1/namespaces/personal-data.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: personal-data
  labels:
    gdpr-scope: in-scope
    data-class: personal
    data-residency: eu
  annotations:
    gdpr.article: "Article 5 — Principles of personal data processing"
    gdpr.retention: "3-years"         # Retention period for DPA compliance
    gdpr.legal-basis: "consent"       # Legal basis for processing
    gdpr.controller: "Example Corp"
```

## Step 2: Restrict Personal Data Namespace Access

GDPR requires access controls to limit who processes personal data (data minimization principle, Article 5(1)(c)):

```yaml
# clusters/eu-west-1/rbac/personal-data-rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: personal-data-processor
  namespace: personal-data
  annotations:
    gdpr.control: "Article 5(1)(f) — Integrity and confidentiality"
rules:
  # Minimal permissions — only what is necessary for the workload
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]
  # Explicitly NO access to Secrets from application accounts
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: personal-data-egress-control
  namespace: personal-data
  annotations:
    gdpr.control: "Article 44 — Cross-border transfer restriction"
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    # Only allow connections to EU-region databases
    - to:
        - namespaceSelector:
            matchLabels:
              data-residency: eu
              role: database
    # Allow DNS
    - ports:
        - port: 53
          protocol: UDP
    # Block all other egress (prevents cross-border data transfers)
```

## Step 3: Implement Data Retention Controls

GDPR Article 5(1)(e) — Storage Limitation requires personal data to be kept no longer than necessary. Manage retention labels and automated cleanup via GitOps:

```yaml
# apps/personal-data/base/retention-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: personal-data-retention-cleanup
  namespace: personal-data
  annotations:
    gdpr.control: "Article 5(1)(e) — Storage limitation"
    gdpr.retention-period: "3 years"
spec:
  # Run daily at 02:00 UTC
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          serviceAccountName: retention-cleanup-sa
          containers:
            - name: cleanup
              image: my-registry/retention-cleanup:1.0.0
              env:
                - name: RETENTION_DAYS
                  value: "1095"    # 3 years = 1095 days
                - name: DRY_RUN
                  value: "false"
              resources:
                requests:
                  cpu: 100m
                  memory: 128Mi
                limits:
                  cpu: 500m
                  memory: 256Mi
```

## Step 4: Audit Logging for Personal Data Access

GDPR Article 30 requires records of processing activities. Configure Flux to log all changes to personal data namespaces:

```yaml
# clusters/eu-west-1/monitoring/gdpr-audit-alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: gdpr-audit-log
  namespace: flux-system
  annotations:
    gdpr.control: "Article 30 — Records of processing activities"
spec:
  summary: "GDPR Audit: Change to personal data infrastructure"
  providerRef:
    name: gdpr-audit-system
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      namespace: flux-system
    - kind: HelmRelease
      namespace: personal-data
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: gdpr-audit-system
  namespace: flux-system
spec:
  type: generic
  url: https://dpa-audit.example.com/api/events
  secretRef:
    name: gdpr-audit-token
```

## Step 5: Right to Erasure Support

GDPR Article 17 (Right to Erasure) requires the ability to delete personal data on request. Document the erasure procedure in your GitOps repository:

```yaml
# apps/personal-data/erasure/erasure-job-template.yaml
# Template for GDPR erasure requests — instantiated per request via CI/CD
apiVersion: batch/v1
kind: Job
metadata:
  name: gdpr-erasure-request-TICKET-ID   # Replace with actual ticket ID
  namespace: personal-data
  labels:
    gdpr.operation: erasure
    gdpr.request-id: "TICKET-ID"
  annotations:
    gdpr.article: "Article 17 — Right to erasure"
    gdpr.requested-at: "TIMESTAMP"
    gdpr.requestor: "DPO"
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: erasure
          image: my-registry/gdpr-tools:1.0.0
          command:
            - /bin/sh
            - -c
            - |
              # Erase personal data for user ID from all stores
              ./erase-user.sh --user-id="$USER_ID" \
                              --databases="postgres,redis" \
                              --log-to="/logs/erasure-$(date +%Y%m%d).log"
          env:
            - name: USER_ID
              valueFrom:
                secretKeyRef:
                  name: erasure-request-USER_ID
                  key: user-id
```

## Step 6: DPIA Support — Export Infrastructure Configuration

For Data Protection Impact Assessments, export your Flux configuration to show how personal data is handled:

```bash
#!/bin/bash
# scripts/gdpr-dpia-export.sh
# Generate infrastructure evidence for DPIA documentation

OUTPUT_DIR="dpia-evidence/$(date +%Y-%m-%d)"
mkdir -p "$OUTPUT_DIR"

# Export all personal-data namespace resources
kubectl get all,networkpolicies,configmaps \
  -n personal-data -o yaml \
  > "$OUTPUT_DIR/personal-data-namespace.yaml"

# Export RBAC for personal data access
kubectl get roles,rolebindings \
  -n personal-data -o yaml \
  > "$OUTPUT_DIR/personal-data-rbac.yaml"

# Git log of all personal data changes
git log --pretty=format:'%H|%an|%ae|%ad|%s' \
  --date=iso-strict \
  -- apps/personal-data/ clusters/eu-west-1/ \
  > "$OUTPUT_DIR/change-history.csv"

echo "DPIA evidence exported to $OUTPUT_DIR"
```

## Best Practices

- Involve your Data Protection Officer in the review of any CODEOWNERS change that affects personal data namespaces.
- Label every Kubernetes resource in personal data namespaces with GDPR metadata (`gdpr-scope`, `data-class`, `gdpr.retention`) to make DPIAs easier.
- Never store real personal data in your Git repository — only configuration that governs how personal data is processed.
- Test your erasure procedures regularly to confirm they work correctly before a real data subject request arrives.
- Keep a register of processing activities (Article 30 record) that references specific Git commits and Kubernetes resources.

## Conclusion

Flux CD GitOps makes GDPR compliance infrastructure changes explicit, reviewable, and auditable. Data residency is enforced through region-specific Kustomizations and NetworkPolicies in Git. Access is restricted via RBAC managed by Flux. Every change to personal data infrastructure is reviewed via PR and permanently recorded in Git — providing the accountability evidence that GDPR Article 5(2) requires organizations to demonstrate.
