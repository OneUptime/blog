# How to Implement FedRAMP Controls with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, FedRAMP, Compliance, Government, NIST

Description: Configure Flux CD to meet FedRAMP authorization requirements by implementing NIST SP 800-53 controls for change management, configuration management, and audit logging.

---

## Introduction

FedRAMP (Federal Risk and Authorization Management Program) requires cloud service providers serving U.S. federal agencies to meet NIST SP 800-53 security control standards. For Kubernetes infrastructure teams, the most relevant control families are Configuration Management (CM), Change Control (CM-3, CM-4, CM-5), Audit and Accountability (AU), and Access Control (AC).

Flux CD's GitOps model maps directly to many FedRAMP CM controls. The Git repository is your System Security Plan (SSP) artifact for baseline configuration (CM-2), every PR is a documented change (CM-3), branch protection enforces access restrictions for privileged functions (CM-5), and Git history provides the audit trail for AU controls. This guide maps FedRAMP controls to Flux configurations and shows how to structure evidence collection.

## Prerequisites

- Flux CD bootstrapped on a FedRAMP-authorized cloud platform (AWS GovCloud, Azure Government, or Google Public Sector)
- FIPS 140-2 compliant cryptographic modules where required
- Log management system meeting FedRAMP retention requirements (3 years minimum)
- A System Security Plan in progress or completed
- `flux` CLI and `kubectl` installed

## Step 1: Establish the Configuration Baseline (CM-2)

FedRAMP CM-2 requires a documented, controlled baseline configuration. Your Flux GitOps repository IS the baseline:

```yaml
# clusters/fedramp/flux-system/baseline-metadata.yaml
# Document the baseline version in a ConfigMap for CM-2 evidence
apiVersion: v1
kind: ConfigMap
metadata:
  name: system-baseline
  namespace: flux-system
  labels:
    fedramp-control: CM-2
    compliance: fedramp-moderate  # or fedramp-high
  annotations:
    fedramp.control: "CM-2 Baseline Configuration"
    fedramp.ato: "ATO-2026-0001"       # Your Authorization to Operate number
    fedramp.baseline-date: "2026-03-13"
    fedramp.authorizing-official: "agency-ao@agency.gov"
data:
  BASELINE_VERSION: "v1.2.0"
  FLUX_VERSION: "v2.4.0"
  KUBERNETES_VERSION: "1.29"
  CLUSTER_NAME: "fedramp-production"
  IMPACT_LEVEL: "Moderate"
```

## Step 2: Implement Change Control Process (CM-3)

FedRAMP CM-3 requires a formal change control process. Configure it in Git:

```yaml
# .github/PULL_REQUEST_TEMPLATE/fedramp-change.md (create as a file, not YAML)
```

```markdown
## FedRAMP Change Request

**Change Request Number**: CR-YYYY-NNNN (from your change management system)

**Control Impact Analysis** (CM-4):
- [ ] CM — Configuration Management
- [ ] AC — Access Control
- [ ] AU — Audit and Accountability
- [ ] SI — System and Information Integrity
- [ ] Other: ___

**Security Impact Analysis**:
_Describe impact on system security posture and NIST 800-53 controls_

**Authorization** (CM-5):
- [ ] Approved by Information System Security Officer (ISSO)
- [ ] Approved by System Owner
- [ ] Approved by Authorizing Official Designated Representative (AODR) [for significant changes]

**Testing Documentation** (CM-4):
- [ ] Tested in accredited test environment
- [ ] Security scan results attached
- [ ] Regression testing completed

**Rollback Procedure** (CP-10):
`git revert <SHA>` — describe additional steps if needed

**POAM Reference** (if applicable):
```

## Step 3: Restrict Privileged Access to Configuration (CM-5, AC-6)

FedRAMP CM-5 requires explicit access restrictions for configuration changes. Implement with branch protection and CODEOWNERS:

```
# .github/CODEOWNERS

# FedRAMP system configuration requires ISSO and ISSO Deputy approval
/clusters/fedramp/                @your-org/isso @your-org/isso-deputy

# Application changes require ISSO plus system owner
/apps/fedramp-apps/               @your-org/isso @your-org/system-owner

# Flux system itself requires ISSO and two senior engineers
/clusters/fedramp/flux-system/    @your-org/isso @your-org/senior-engineers
```

Branch protection settings to document in your SSP:
- Required reviewers: 2 (minimum)
- Required: ISSO as mandatory Code Owner for all changes
- No bypass allowed for any user including administrators
- Required status checks: `fedramp-validate`, `security-scan`

## Step 4: Implement Audit Logging (AU-2, AU-3, AU-12)

FedRAMP requires comprehensive, tamper-evident audit logging. Configure Flux to send all events to your audit system:

```yaml
# clusters/fedramp/monitoring/fedramp-audit.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: fedramp-audit-siem
  namespace: flux-system
  annotations:
    fedramp.control: "AU-2 Event Logging, AU-12 Audit Record Generation"
spec:
  type: generic
  url: https://siem.fedramp-boundary.gov/api/events
  secretRef:
    name: siem-webhook-token
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: fedramp-full-audit-trail
  namespace: flux-system
spec:
  summary: "FedRAMP Audit: Infrastructure change event"
  providerRef:
    name: fedramp-audit-siem
  # Capture ALL events per AU-12 requirement for comprehensive audit records
  eventSeverity: info
  eventSources:
    - kind: GitRepository
      namespace: flux-system
    - kind: Kustomization
      namespace: flux-system
    - kind: HelmRelease
```

## Step 5: Enforce Configuration Integrity with Signature Verification (SI-7)

FedRAMP SI-7 requires software and firmware integrity verification. Use Flux's OCI artifact signing to verify manifests:

```yaml
# clusters/fedramp/flux-system/signed-source.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
  annotations:
    fedramp.control: "SI-7 Software, Firmware, and Information Integrity"
spec:
  interval: 1m
  ref:
    branch: main
  url: ssh://git@github.com/your-org/fedramp-fleet-infra
  secretRef:
    name: flux-system
  verify:
    # Require Git commit signatures from authorized signers
    mode: HEAD
    secretRef:
      name: git-signing-keys    # Public keys of authorized committers
```

Enforce signed commits in your organization:

```bash
# Require GPG-signed commits on the protected branch
# Configure in GitHub: Settings → Branches → Require signed commits

# Verify signatures in CI
git log --show-signature --oneline -5
```

## Step 6: Continuous Monitoring (CA-7, SI-4)

FedRAMP requires continuous monitoring of system configuration. Configure drift detection alerts:

```yaml
# clusters/fedramp/monitoring/drift-detection.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: configuration-drift-alert
  namespace: flux-system
  annotations:
    fedramp.control: "CA-7 Continuous Monitoring, SI-4 Information System Monitoring"
spec:
  summary: "FedRAMP ALERT: Configuration drift detected — immediate investigation required"
  providerRef:
    name: fedramp-audit-siem
  eventSeverity: error
  eventSources:
    - kind: Kustomization
  inclusionList:
    - ".*ReconciliationFailed.*"
    - ".*drift.*"
    - ".*unauthorized.*"
```

## Step 7: Generate SSP Configuration Evidence

```bash
#!/bin/bash
# scripts/fedramp-ssap-evidence.sh
# Generate System Security Plan appendix for CM controls

OUTPUT="ssap-artifacts/cm-controls-$(date +%Y-%m-%d).md"
mkdir -p ssap-artifacts

cat > "$OUTPUT" << 'EOF'
# Configuration Management Control Evidence

## CM-2 Baseline Configuration
The system baseline is defined in Git repository: fleet-infra
Current baseline: see clusters/fedramp/flux-system/baseline-metadata.yaml

## CM-3 Configuration Change Control
All changes require:
1. PR creation with FedRAMP change request template
2. ISSO approval (enforced via CODEOWNERS + branch protection)
3. CI validation (kubeconform + security scan)
4. Merge to protected main branch only

## CM-5 Access Restrictions for Change
Branch protection settings prevent direct pushes.
Only ISSO-approved team members can approve PRs.
No bypass available for any user role.
EOF

# Append actual change log
git log --merges \
  --pretty=format:"| %ad | %an | %s | %H |" \
  --date=short \
  --since="3 months ago" \
  -- clusters/fedramp/ \
  >> "$OUTPUT"

echo "SSP evidence generated: $OUTPUT"
```

## Best Practices

- Work with your Third Party Assessment Organization (3PAO) before finalizing your Flux configuration to ensure your specific control implementation satisfies their assessment methodology.
- Use FIPS 140-2 validated cryptographic libraries for all secrets management within the FedRAMP authorization boundary.
- Maintain a FedRAMP-specific branch in your GitOps repository if your system has multiple authorization boundaries.
- Conduct monthly continuous monitoring reviews of Flux event logs and submit findings to your Authorizing Official.
- Keep the System Security Plan updated whenever the Flux configuration that implements a control changes.

## Conclusion

Flux CD GitOps provides a strong technical foundation for FedRAMP control implementation, particularly for CM (Configuration Management), AU (Audit and Accountability), and SI (System and Information Integrity) control families. The Git repository serves as the documented baseline configuration (CM-2), PR workflow as the change control process (CM-3), branch protection as access restriction (CM-5), and Flux events as audit records (AU-12). With the configurations in this guide, your team can implement FedRAMP controls in a way that is both technically sound and straightforward to evidence for your 3PAO assessment.
