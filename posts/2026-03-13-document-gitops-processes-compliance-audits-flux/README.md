# How to Document GitOps Processes for Compliance Audits with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Compliance, Documentation, Audit, Change Management

Description: Document Flux CD GitOps processes in a way that satisfies compliance audit requirements, mapping each technical control to its audit evidence and creating a complete documentation package auditors can evaluate.

---

## Introduction

Technical controls are only half of compliance. The other half is documentation — written evidence that the controls exist, that they work as intended, and that your team follows them consistently. Auditors evaluate both the controls and the documentation. A perfectly configured Flux CD deployment that lacks documentation will fail an audit just as surely as one with poor configuration.

The good news is that a GitOps repository already contains most of the documentation an auditor needs. The Git history is a change log, the PR review trail is an approval record, branch protection settings are access control documentation, and Flux events are deployment records. The work is organizing and presenting this information in a form auditors expect, supplemented with narrative documentation that explains the overall process.

This guide shows how to structure compliance documentation for a Flux CD GitOps environment, what documents to create, and how to maintain them as living documents rather than point-in-time snapshots.

## Prerequisites

- Flux CD managing production workloads
- A GitOps repository with PR review history
- A document management system or wiki for policy documents
- Designated compliance owner (CISO, compliance manager, or similar role)

## Step 1: Create a System Overview Document

The System Overview (sometimes called a System Description or System Security Plan section) explains what Flux CD does and how it fits into your change management process:

```markdown
# GitOps Change Management System Overview

## System Purpose
This document describes the GitOps-based change management process implemented
using Flux CD for the [Organization Name] production Kubernetes infrastructure.

## System Components

| Component | Purpose | Tool |
|-----------|---------|------|
| Version Control | Source of truth for all configuration | GitHub (fleet-infra repo) |
| GitOps Controller | Reconciles cluster state to Git state | Flux CD v2.4.0 |
| Admission Controller | Enforces resource standards | Kyverno v3.1.x |
| Secret Management | Encrypts secrets at rest | Sealed Secrets v2.15.x |
| Scanning | Vulnerability and compliance scanning | Trivy Operator v0.20.x |

## Change Flow

All changes to production infrastructure follow this path:
1. Developer creates a feature branch and opens a Pull Request
2. Automated CI validates manifests (syntax, schema, policy compliance)
3. Required reviewers (defined in CODEOWNERS) approve the PR
4. PR is merged to the protected `main` branch
5. Flux CD detects the new commit and reconciles the cluster
6. Health checks verify the cluster reached the desired state
7. Flux emits a reconciliation event (logged to audit system)

## Authorization Boundaries
[Diagram of your cluster architecture and authorization boundaries]
```

## Step 2: Document Each Control in a Controls Matrix

Create a controls matrix that maps compliance requirements to specific technical controls:

```markdown
# Compliance Controls Matrix

## Change Management Controls

| Control ID | Requirement | Implementation | Evidence Location |
|-----------|-------------|----------------|-------------------|
| CC8.1 (SOC 2) | All production changes authorized | Branch protection requires 2 approvers | GitHub branch protection settings + PR merge history |
| CM-3 (FedRAMP) | Documented change control process | PR template with change record fields | `.github/PULL_REQUEST_TEMPLATE/` |
| CM-5 (FedRAMP) | Access restriction for changes | CODEOWNERS restricts who can approve | `.github/CODEOWNERS` |
| PCI 6.5.1 | Testing before production | CI validation gate + staging environment | GitHub Actions workflows |
| SOC 2 CC6.2 | New access authorization | PR approval required for any access change | PR review history |

## Audit Logging Controls

| Control ID | Requirement | Implementation | Evidence Location |
|-----------|-------------|----------------|-------------------|
| AU-2 (FedRAMP) | Audit event logging | Flux events forwarded to SIEM | Elasticsearch flux-events-* index |
| AU-3 (FedRAMP) | Content of audit records | Events include who/what/when/outcome | SIEM query: `reason:ReconciliationSucceeded` |
| PCI Req 10 | Log all access and changes | Git commit history + Flux events | Git log + audit database |
| HIPAA 164.312(b) | Audit controls | Full Flux event logging enabled | Audit webhook configuration |
```

## Step 3: Create a Change Management Procedure Document

The procedure document describes how your team follows the process in practice:

```markdown
# Change Management Procedure — GitOps with Flux CD

**Document Owner**: Platform Team
**Review Frequency**: Quarterly
**Last Reviewed**: 2026-03-13
**Version**: 1.0

## Scope
This procedure applies to all changes to infrastructure managed by Flux CD,
including Kubernetes Deployments, Services, ConfigMaps, HelmReleases, and
Flux configuration itself.

## Change Classifications

### Standard Change (Routine, Pre-Approved)
- **Definition**: Changes with a well-understood, repeatable procedure and low risk
- **Examples**: Dependency patch updates (Renovate), config value adjustments within pre-approved ranges
- **Approval**: 1 reviewer from the relevant team
- **Timeline**: Same-day merge permitted during deployment windows

### Normal Change
- **Definition**: Changes requiring individual assessment
- **Examples**: New service deployments, version promotions, RBAC changes
- **Approval**: 2 reviewers including a CODEOWNER
- **Timeline**: Minimum 24-hour review period for production changes

### Emergency Change
- **Definition**: Critical changes that cannot wait for the normal review cycle
- **Examples**: Security patches for active CVEs, rollbacks for production incidents
- **Approval**: Incident Commander authorization + 1 reviewer
- **Timeline**: Expedited; post-implementation review required within 48 hours

## Step-by-Step Change Process

### For Normal Changes
1. Create a branch: `git checkout -b <type>/<description>`
2. Make changes and validate locally: `flux diff kustomization <name>`
3. Push branch and open PR using the standard PR template
4. Complete all required template fields including risk assessment and rollback plan
5. CI validation must pass before requesting review
6. Request review from CODEOWNERS (auto-assigned by GitHub)
7. Address review feedback; update PR as needed
8. After 2 approvals, merge during next deployment window
9. Monitor Flux reconciliation: `flux get kustomizations --watch`
10. Confirm health checks pass within timeout period

### Rollback Procedure
If a change causes problems after deployment:
1. Use `git revert <sha>` to create a rollback commit
2. Push through the same PR process (expedited review for active incidents)
3. File an incident ticket referencing the rollback commit SHA
4. Conduct post-incident review within 5 business days
```

## Step 4: Document the Evidence Collection Process

Create a guide for collecting audit evidence on demand:

```bash
#!/bin/bash
# scripts/collect-audit-evidence.sh
# Collects all evidence needed for a compliance audit
# Usage: ./collect-audit-evidence.sh "2026-01-01" "2026-03-31"

START_DATE=${1:-"90 days ago"}
END_DATE=${2:-"today"}
OUTPUT_DIR="audit-evidence-$(date +%Y-%m-%d)"

mkdir -p "$OUTPUT_DIR"

echo "Collecting audit evidence for period: $START_DATE to $END_DATE"

# 1. Git change history
echo "1. Collecting Git change history..."
git log \
  --merges \
  --pretty=format:"%H|%an|%ae|%aI|%s" \
  --since="$START_DATE" \
  --until="$END_DATE" \
  -- apps/ clusters/ \
  > "$OUTPUT_DIR/change-history.csv"

# 2. Branch protection settings
echo "2. Collecting branch protection settings..."
gh api repos/your-org/fleet-infra/branches/main/protection \
  > "$OUTPUT_DIR/branch-protection.json"

# 3. CODEOWNERS content
echo "3. Collecting CODEOWNERS..."
cp .github/CODEOWNERS "$OUTPUT_DIR/CODEOWNERS.txt"
git log --oneline -10 -- .github/CODEOWNERS \
  > "$OUTPUT_DIR/CODEOWNERS-change-history.txt"

# 4. Recent PR approvals
echo "4. Collecting PR approval records..."
gh pr list \
  --state merged \
  --json number,title,mergedAt,mergedBy,reviews \
  --jq '[.[] | {
    number: .number,
    title: .title,
    merged_at: .mergedAt,
    merged_by: .mergedBy.login,
    approvers: [.reviews[] | select(.state=="APPROVED") | .author.login]
  }]' \
  > "$OUTPUT_DIR/pr-approvals.json"

# 5. Flux events from cluster
echo "5. Collecting Flux events..."
kubectl get events -n flux-system \
  --sort-by='.lastTimestamp' \
  -o json \
  > "$OUTPUT_DIR/flux-events.json"

echo ""
echo "Evidence collected in: $OUTPUT_DIR/"
ls -la "$OUTPUT_DIR/"
```

## Step 5: Maintain a Living Documentation Repository

Store all compliance documentation in Git alongside your configuration:

```
fleet-infra/
├── compliance/
│   ├── README.md                        # Compliance documentation index
│   ├── system-overview.md               # System description
│   ├── controls-matrix.md               # Control-to-implementation mapping
│   ├── change-management-procedure.md   # How-to-change procedure
│   ├── evidence-collection-guide.md     # How to collect audit evidence
│   ├── reports/                         # Generated compliance reports
│   │   └── .gitkeep
│   └── exceptions/                      # Documented policy exceptions
│       └── exception-register.md
```

```yaml
# clusters/production/flux-system/compliance-kustomization.yaml
# The compliance documentation directory is also managed by Flux
# so any changes to it go through PR review
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: compliance-docs
  namespace: flux-system
spec:
  interval: 10m
  path: ./compliance
  prune: false           # Never prune compliance documents
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 6: Prepare an Auditor Walkthrough Guide

Create a guide specifically for walking an auditor through your controls:

```markdown
# Auditor Walkthrough Guide — Flux CD GitOps

## How to Verify Change Authorization Controls

1. **Requirement**: All production changes are authorized before implementation.

   **Evidence**: Open the GitHub repository at fleet-infra.
   Navigate to Pull Requests → Closed.
   Every merged PR shows the required approvals under "Reviewers."

   **Verification**: Spot-check 10 random merged PRs and confirm each has ≥2 approvals.

2. **Requirement**: Unauthorized changes are detected and corrected.

   **Evidence**: Query the SIEM for Flux "pruned" events:
   `reason:Synced AND message:*pruned*`
   Each event represents an unauthorized resource that Flux removed.

   **Verification**: Confirm the event log contains all expected fields (timestamp, resource, action).

3. **Requirement**: Access to make production changes is restricted.

   **Evidence**: Navigate to GitHub → Settings → Branches → main → Protection rules.
   Screenshot shows: 2 required approvals, Code Owner requirement, admin bypass disabled.

   **Verification**: Attempt to push directly to main as a non-admin (should be rejected).
```

## Best Practices

- Review and update all compliance documentation quarterly, or whenever a significant process change occurs — stale documentation is worse than no documentation because it actively misleads auditors.
- Store compliance documents in Git so changes to the documentation itself are tracked and auditable.
- Designate a documentation owner who is responsible for keeping each document current.
- Walk through the auditor guide internally before the audit to identify gaps between your documentation and your actual practice.
- Use version numbers and "last reviewed" dates on all policy documents so auditors can confirm they are current.

## Conclusion

Compliance documentation for a Flux CD GitOps environment is straightforward to create because the technical controls leave evidence trails that can be referenced directly. The system overview explains what Flux does, the controls matrix maps requirements to implementations, the procedure document describes how the team operates, and the evidence collection guide shows auditors exactly where to find what they need. Keeping all of this in Git ensures the documentation is version-controlled, reviewed, and as trustworthy as the infrastructure it describes.
