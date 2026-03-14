# How to Implement SOC 2 Compliance Controls with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, SOC 2, Compliance, Change Management, Audit

Description: Configure Flux CD to satisfy SOC 2 Type II control requirements for change management, access control, and audit trail by leveraging GitOps workflows.

---

## Introduction

SOC 2 (Service Organization Control 2) is an auditing framework that evaluates how organizations manage data security, availability, processing integrity, confidentiality, and privacy. For engineering teams running Kubernetes infrastructure, SOC 2 change management controls require evidence that all production changes are authorized, reviewed, tested, and traceable.

Flux CD's GitOps model aligns naturally with SOC 2 requirements. Every change to production flows through Git (creating an immutable audit trail), requires a PR with approvals (providing authorization evidence), and is applied automatically only from the approved state (eliminating unauthorized manual changes). This guide maps specific SOC 2 Common Criteria to Flux CD configurations and explains how to collect evidence for each.

## Prerequisites

- Flux CD bootstrapped on a production cluster
- GitHub repository with branch protection configured
- A logging and event collection system (Loki, Elasticsearch, or similar)
- `flux` CLI and `kubectl` installed

## Step 1: Map SOC 2 Common Criteria to Flux Controls

| SOC 2 Common Criteria | Flux CD Control |
|---|---|
| CC6.1 — Logical access controls | Branch protection + CODEOWNERS |
| CC6.2 — New access authorization | PR review requirement |
| CC7.1 — System components monitoring | Flux health checks + alerting |
| CC8.1 — Change management | GitOps PR workflow |
| CC9.2 — Vendor and business partner management | HelmRepository with pinned versions |

## Step 2: Enforce Authorized Changes via Branch Protection

Document this in your SOC 2 control evidence as "CC8.1 — Production changes require PR approval":

```yaml
# The GitRepository Flux watches — production changes come ONLY from this branch
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 1m
  ref:
    branch: main     # Protected branch — no direct push allowed
  url: ssh://git@github.com/your-org/fleet-infra
  secretRef:
    name: flux-system
```

Branch protection configuration (document the settings for SOC 2 evidence):
- Require 2 approving reviews before merging
- Dismiss stale reviews when new commits are pushed
- Require review from Code Owners
- Require status checks: `validate-flux-manifests`
- Block direct pushes to `main` — including admins

## Step 3: Create an Immutable Audit Trail

SOC 2 requires evidence that all changes are traceable. Git provides this automatically:

```bash
# Export the full change history for a specific path (evidence collection)
git log --pretty=format:"%H|%an|%ae|%ad|%s" \
  --date=iso-strict \
  -- apps/production/ > audit-trail-apps-production.csv

# Show who merged each PR with timestamps
git log --merges --pretty=format:"%H|%an|%ae|%ad|%s" \
  --date=iso-strict \
  -- apps/ | head -50
```

## Step 4: Configure Flux Event Logging for Audit Evidence

Flux emits Kubernetes events for every reconciliation. Collect and retain these for SOC 2 evidence:

```yaml
# infrastructure/monitoring/flux-event-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flux-event-exporter
  namespace: flux-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: flux-event-exporter
  template:
    metadata:
      labels:
        app: flux-event-exporter
    spec:
      serviceAccountName: flux-event-exporter-sa
      containers:
        - name: event-exporter
          image: ghcr.io/resmoio/kubernetes-event-exporter:latest
          volumeMounts:
            - name: config
              mountPath: /data
      volumes:
        - name: config
          configMap:
            name: flux-event-exporter-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: flux-event-exporter-config
  namespace: flux-system
data:
  config.yaml: |
    logLevel: debug
    logFormat: json
    route:
      routes:
        - match:
            - receiver: audit-log
    receivers:
      - name: audit-log
        # Export to your SIEM or log aggregation system
        elasticsearch:
          hosts:
            - http://elasticsearch.logging:9200
          index: flux-audit-{.metadata.namespace}
          indexFormat: "flux-audit-{2006.01.02}"
```

## Step 5: Enforce Separation of Duties with CODEOWNERS

SOC 2 CC6.3 requires separation of duties. Use CODEOWNERS to ensure no single person can approve their own changes:

```
# .github/CODEOWNERS

# Production infrastructure changes require platform team senior engineers
/clusters/production/           @your-org/senior-platform-engineers

# Application changes require the app team AND a platform reviewer
/apps/production/               @your-org/app-team @your-org/platform-team

# Security-sensitive configurations require security team sign-off
/clusters/production/policies/  @your-org/security-team @your-org/platform-team

# Flux system configuration requires two senior platform engineers
/clusters/production/flux-system/ @your-org/senior-platform-engineers
```

## Step 6: Implement Change Records with PR Templates

Create a PR template that captures SOC 2-required change record information:

```markdown
<!-- .github/pull_request_template.md -->
## Change Record

**Change Type**: [ ] Standard [ ] Emergency [ ] Maintenance

**Risk Level**: [ ] Low [ ] Medium [ ] High

**Testing Completed**:
- [ ] Validated in staging environment
- [ ] Manifests pass kubeconform validation
- [ ] Rollback procedure verified

**SOC 2 Control Evidence**:
- [ ] Change is authorized by an approver with appropriate access
- [ ] Change has been tested before production deployment
- [ ] Rollback plan is documented (describe below or link to runbook)

**Rollback Plan**:
_Describe how this change can be reversed if problems occur_

**Related Tickets**:

**Incident Reference** (if emergency):
```

## Step 7: Generate Monthly Compliance Reports

Create a script that produces SOC 2 evidence summaries:

```bash
#!/bin/bash
# scripts/soc2-evidence-report.sh
# Run monthly to generate SOC 2 change management evidence

REPORT_DATE=$(date -u +%Y-%m)
OUTPUT="compliance-reports/soc2-${REPORT_DATE}.md"

mkdir -p compliance-reports

cat > "$OUTPUT" << EOF
# SOC 2 Change Management Evidence Report — ${REPORT_DATE}

## CC8.1 — Change Management

### All Production Changes (via Git log)
$(git log --merges \
    --pretty=format:"| %ad | %an | %s |" \
    --date=short \
    --since="$(date -u -d '1 month ago' +%Y-%m-01)" \
    -- apps/production/ clusters/production/ \
  | sort)

### Flux Reconciliation Events
$(kubectl get events -n flux-system \
    --field-selector reason=ReconciliationSucceeded \
    --sort-by='.lastTimestamp' \
  | tail -50)

## CC6.1 — Access Controls
Branch protection status: ENABLED
Required reviewers: 2
Admin bypass: DISABLED

Generated: $(date -u)
EOF

echo "Report generated: $OUTPUT"
```

## Best Practices

- Retain Git history indefinitely (or for at least 7 years for SOC 2 Type II) — configure your Git host to prevent force pushes that rewrite history.
- Export Flux events to a SIEM or log management system with a minimum 1-year retention.
- Run quarterly access reviews to ensure CODEOWNERS lists reflect current team membership.
- Document each SOC 2 control in a controls matrix that maps the control requirement to the specific Flux/Git configuration that satisfies it.
- Engage your auditor early to confirm that Git-based evidence (PR approvals, commit history) satisfies their specific evidence requirements.

## Conclusion

Flux CD's GitOps model provides a strong foundation for SOC 2 compliance. The Git repository serves as an immutable audit log of every change, branch protection enforces authorization requirements, CODEOWNERS implements separation of duties, and Flux events provide reconciliation records. With the configurations in this guide, your engineering team can collect SOC 2 change management evidence directly from tools you already use every day.
