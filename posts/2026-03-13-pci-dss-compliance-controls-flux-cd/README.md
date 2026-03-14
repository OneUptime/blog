# How to Implement PCI DSS Compliance Controls with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, PCI DSS, Compliance, Payment, Security

Description: Satisfy PCI DSS change control requirements using Flux CD GitOps workflows to manage Kubernetes infrastructure handling cardholder data environments.

---

## Introduction

PCI DSS (Payment Card Industry Data Security Standard) mandates rigorous controls over systems that store, process, or transmit cardholder data. Requirement 6 (Develop and Maintain Secure Systems) and Requirement 10 (Log and Monitor All Access) are most directly addressed by how your team manages infrastructure changes. Flux CD GitOps provides a technical foundation for satisfying these requirements.

The core PCI DSS requirement for change management (Requirement 6.5) demands that all system components have a documented change control process that includes impact analysis, testing, authorization, rollback procedures, and audit documentation. A GitOps workflow with Flux CD satisfies every element of this requirement — each PR is a documented change record with authorization evidence, test status, rollback capability (git revert), and a permanent audit entry in Git history.

## Prerequisites

- Flux CD managing a Kubernetes cluster in or adjacent to the Cardholder Data Environment (CDE)
- Separate namespaces and network policies for CDE workloads
- A log aggregation system with 12-month retention (PCI DSS Requirement 10.7)
- `flux` CLI and `kubectl` installed

## Step 1: Isolate the Cardholder Data Environment

PCI DSS Requirement 1 requires network segmentation around the CDE. Implement this in Kubernetes with namespaces and NetworkPolicies:

```yaml
# clusters/cde/namespaces/cardholder-data.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: cardholder-data
  labels:
    pci-scope: in-scope     # Label marks this as a PCI-scoped namespace
    compliance: pci-dss
  annotations:
    pci.control: "Requirement 1 — Network Security Controls"
---
# Deny all ingress by default in the CDE namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: cardholder-data
  annotations:
    pci.control: "Requirement 1.3 — Restrict inbound/outbound traffic"
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
# Allow only payment processor pods to accept traffic from API gateway
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-payment-processor
  namespace: cardholder-data
spec:
  podSelector:
    matchLabels:
      app: payment-processor
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              role: api-gateway
      ports:
        - port: 8443
          protocol: TCP
```

## Step 2: Enforce Authorized Changes with PR Controls

PCI DSS Requirement 6.5.1 requires that change control procedures include documentation and authorization. Configure strict branch protection and a change record PR template:

```markdown
<!-- .github/PULL_REQUEST_TEMPLATE/pci-change.md -->
## PCI DSS Change Control Record

**PCI Scope**: [ ] In-scope (CDE or connected system) [ ] Out-of-scope

**PCI Requirement(s) Affected**:
- Requirement 6 — Secure Development
- Requirement 1 — Network Controls
- Other: ___

**Change Impact Analysis**:
_Describe impact on cardholder data security, availability, and integrity_

**Testing Evidence**:
- [ ] Tested in non-production environment that matches production configuration
- [ ] Security scan passed (attach results or link)
- [ ] No cardholder data present in test environment

**Authorization**:
- [ ] Approved by system owner
- [ ] Approved by security team (required for in-scope changes)

**Rollback Procedure**:
`git revert <commit-sha>` — describe any additional rollback steps

**Backout Test**: [ ] Rollback tested in non-production
```

## Step 3: Require Security Team Approval for CDE Changes

```
# .github/CODEOWNERS
# All in-scope CDE changes require QSA-designated security approver
/clusters/cde/                  @your-org/pci-security-team
/apps/cardholder-data/          @your-org/pci-security-team @your-org/platform-team
/apps/payment-processor/        @your-org/pci-security-team @your-org/dev-team
```

Configure branch protection with 2 required reviewers and Code Owner requirements.

## Step 4: Implement Comprehensive Audit Logging

PCI DSS Requirement 10 requires audit logs for all access and changes. Configure Flux to emit all events to your log management system:

```yaml
# clusters/cde/monitoring/pci-audit-provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: pci-audit-system
  namespace: flux-system
spec:
  type: generic
  url: https://siem.example.com/pci/events
  secretRef:
    name: audit-webhook-token
---
# Alert on ALL Flux events in CDE namespaces (info level for full audit trail)
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: pci-full-audit
  namespace: flux-system
spec:
  summary: "PCI Audit: Flux event in CDE"
  providerRef:
    name: pci-audit-system
  eventSeverity: info         # Capture every event, not just errors
  eventSources:
    - kind: Kustomization
      namespace: flux-system
    - kind: HelmRelease
      namespace: cardholder-data
```

## Step 5: Pin All Dependency Versions

PCI DSS Requirement 6.3.3 requires all system components are protected from known vulnerabilities. Pin exact versions for all chart and image dependencies:

```yaml
# apps/payment-processor/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: payment-processor
  namespace: cardholder-data
  annotations:
    pci.control: "Requirement 6.3.3 — Protect against known vulnerabilities"
spec:
  interval: 10m
  chart:
    spec:
      chart: payment-processor
      version: "3.4.2"        # Exact version — no ranges in PCI scope
      sourceRef:
        kind: HelmRepository
        name: internal-charts
        namespace: flux-system
  values:
    image:
      repository: registry.example.com/payment-processor
      tag: "3.4.2"            # Exact immutable tag — not 'latest'
      pullPolicy: IfNotPresent
```

## Step 6: Enforce Resource Security Standards

```yaml
# clusters/cde/policies/pci-resource-policy.yaml
# Use Kyverno or OPA Gatekeeper to enforce PCI security standards
# Example: Require all CDE containers to run as non-root
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: pci-no-root-containers
  annotations:
    pci.control: "Requirement 2.2 — System configuration standards"
spec:
  validationFailureAction: enforce
  rules:
    - name: check-containers-non-root
      match:
        any:
          - resources:
              kinds: ["Pod"]
              namespaces: ["cardholder-data"]
      validate:
        message: "PCI DSS: Containers in CDE must run as non-root"
        pattern:
          spec:
            securityContext:
              runAsNonRoot: true
            containers:
              - securityContext:
                  allowPrivilegeEscalation: false
                  readOnlyRootFilesystem: true
```

## Step 7: Quarterly Change Management Review

```bash
#!/bin/bash
# scripts/pci-quarterly-review.sh
# Generate PCI DSS Req 6 compliance evidence for quarterly review

QUARTER_START=$(date -u -d '3 months ago' +%Y-%m-%d)
OUTPUT="pci-evidence/Q$(date +%q)-$(date +%Y)-change-log.csv"

echo "Generating PCI change management evidence..."

# All merges to main affecting CDE paths
git log --merges \
  --pretty=format:'"%H","%an","%ae","%ad","%s"' \
  --date=iso-strict \
  --since="$QUARTER_START" \
  -- clusters/cde/ apps/cardholder-data/ apps/payment-processor/ \
  > "$OUTPUT"

echo "Change records: $(wc -l < "$OUTPUT")"
echo "Evidence file: $OUTPUT"
```

## Best Practices

- Engage a Qualified Security Assessor (QSA) early to confirm that Git-based PR approvals satisfy their interpretation of PCI DSS authorization requirements for your specific Report on Compliance (ROC).
- Never store cardholder data or primary account numbers (PANs) in your Git repository — use Sealed Secrets or External Secrets for all credentials.
- Retain Git history and Flux event logs for a minimum of 12 months online and 12 months offline storage to satisfy PCI DSS Requirement 10.7.
- Run automated vulnerability scans on all container images in CI before they are referenced in the GitOps repository.
- Conduct a full Flux configuration review whenever your PCI DSS scope changes.

## Conclusion

Flux CD GitOps provides a strong technical foundation for PCI DSS change control compliance. The immutable Git audit trail satisfies Requirement 10 logging requirements, PR-based authorization satisfies Requirement 6.5 change control procedures, namespace isolation supports Requirement 1 network segmentation, and pinned versions support Requirement 6.3 vulnerability management. With these configurations in place, your team can demonstrate PCI DSS compliance with evidence gathered directly from your standard development workflow.
