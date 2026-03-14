# How to Implement HIPAA Compliance Controls with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, HIPAA, Compliance, Healthcare, Security

Description: Use Flux CD GitOps workflows to implement HIPAA-compliant deployment processes for healthcare Kubernetes infrastructure, covering access controls, audit logging, and change management.

---

## Introduction

HIPAA (Health Insurance Portability and Accountability Act) requires organizations that handle Protected Health Information (PHI) to implement technical, administrative, and physical safeguards. For Kubernetes infrastructure teams, the most relevant HIPAA Technical Safeguards are access controls (§164.312(a)), audit controls (§164.312(b)), integrity (§164.312(c)), and transmission security (§164.312(e)).

Flux CD GitOps supports HIPAA compliance by ensuring all changes to PHI-adjacent infrastructure are authorized (via PR review), auditable (via Git history and Kubernetes events), consistent (via declarative configuration), and reversible (via git revert). This guide maps HIPAA requirements to specific Flux configurations and shows how to gather audit evidence.

## Prerequisites

- Flux CD managing a HIPAA-scoped Kubernetes cluster
- Sealed Secrets or External Secrets Operator for secret management
- Dedicated namespaces for PHI-adjacent workloads
- Log aggregation with a minimum 6-year retention (HIPAA requirement)

## Step 1: Isolate PHI Workloads with Dedicated Namespaces

HIPAA requires access controls that limit who and what can interact with PHI. Use namespace isolation to create a boundary:

```yaml
# clusters/hipaa/namespaces/phi-workloads.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: phi-workloads
  labels:
    compliance: hipaa
    data-classification: phi
  annotations:
    # Document the HIPAA control this namespace supports
    hipaa.control: "164.312(a)(1) - Access Control"
    hipaa.owner: "privacy-officer@example.com"
---
# Apply strict NetworkPolicy to isolate PHI namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: phi-isolation
  namespace: phi-workloads
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Only allow traffic from the API gateway namespace
    - from:
        - namespaceSelector:
            matchLabels:
              role: api-gateway
  egress:
    # Only allow traffic to the PHI database namespace
    - to:
        - namespaceSelector:
            matchLabels:
              role: phi-database
    # Allow DNS resolution
    - ports:
        - port: 53
          protocol: UDP
```

## Step 2: Manage Secrets with GitOps-Compatible Encryption

HIPAA requires encryption of PHI at rest and in transit. Use Sealed Secrets to store encrypted secrets in Git:

```yaml
# clusters/hipaa/secrets/database-credentials.yaml
# This is a SealedSecret — safe to commit to Git
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: phi-db-credentials
  namespace: phi-workloads
  annotations:
    hipaa.control: "164.312(a)(2)(iv) - Encryption and Decryption"
spec:
  encryptedData:
    # Encrypted with the cluster's public key — only the cluster can decrypt
    DB_PASSWORD: AgAK3x9...  # Encrypted value from kubeseal
    DB_HOST: AgBR7p2...
  template:
    metadata:
      name: phi-db-credentials
      namespace: phi-workloads
    type: Opaque
```

Install Sealed Secrets via Flux:

```yaml
# infrastructure/controllers/sealed-secrets.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: sealed-secrets
  namespace: flux-system
spec:
  interval: 10m
  chart:
    spec:
      chart: sealed-secrets
      version: ">=2.15.0"
      sourceRef:
        kind: HelmRepository
        name: sealed-secrets
        namespace: flux-system
  values:
    fullnameOverride: sealed-secrets-controller
```

## Step 3: Configure Strict RBAC for PHI Namespaces

HIPAA §164.312(a)(2)(i) — Unique User Identification requires that access to PHI be tied to specific, identifiable accounts:

```yaml
# clusters/hipaa/rbac/phi-workloads-rbac.yaml
# Only the phi-deployer service account can create/modify deployments in phi-workloads
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: phi-deployer
  namespace: phi-workloads
  annotations:
    hipaa.control: "164.312(a)(2)(i) - Unique User Identification"
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch"]
  # Explicitly deny secret access from application service accounts
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: flux-phi-deployer
  namespace: phi-workloads
subjects:
  - kind: ServiceAccount
    name: flux-system       # Only Flux can deploy to this namespace
    namespace: flux-system
roleRef:
  kind: Role
  name: phi-deployer
  apiGroup: rbac.authorization.k8s.io
```

## Step 4: Enable Comprehensive Audit Logging

HIPAA §164.312(b) — Audit Controls requires recording and examining activity in information systems:

```yaml
# clusters/hipaa/monitoring/flux-audit-alert.yaml
# Send all Flux events to the audit log system
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: hipaa-audit-log
  namespace: flux-system
spec:
  summary: "HIPAA Audit: Flux reconciliation event"
  providerRef:
    name: audit-log-webhook   # Webhook to your SIEM
  eventSeverity: info         # Capture info-level events too, not just errors
  eventSources:
    - kind: Kustomization
      namespace: phi-workloads
    - kind: HelmRelease
      namespace: phi-workloads
```

```yaml
# clusters/hipaa/monitoring/audit-webhook-provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: audit-log-webhook
  namespace: flux-system
spec:
  type: generic
  url: https://siem.example.com/api/flux-events
  secretRef:
    name: audit-webhook-token
```

## Step 5: Enforce Change Management for PHI Infrastructure

Document in your HIPAA Security Risk Analysis that all changes to PHI infrastructure require:

```yaml
# .github/CODEOWNERS
# PHI namespace changes require both platform team and privacy officer approval
/clusters/hipaa/              @your-org/platform-team @your-org/privacy-officer
/apps/phi-workloads/          @your-org/phi-app-team @your-org/privacy-officer
```

Create a HIPAA-specific PR template:

```markdown
<!-- .github/PULL_REQUEST_TEMPLATE/hipaa.md -->
## HIPAA Change Management Record

**PHI Impact**: [ ] Yes — this change affects PHI processing/storage/transmission
               [ ] No — this change is infrastructure only

**HIPAA Controls Affected**:
- [ ] 164.312(a) — Access Control
- [ ] 164.312(b) — Audit Controls
- [ ] 164.312(c) — Integrity
- [ ] 164.312(e) — Transmission Security

**Risk Assessment**:
_Describe any risk to PHI confidentiality, integrity, or availability_

**Privacy Officer Approval**: Required for any PHI-impacting changes
**Testing**: Validated that PHI data cannot be exposed by this change
```

## Step 6: Implement Configuration Drift Alerts

HIPAA requires integrity controls to detect unauthorized changes. Flux drift detection provides this:

```bash
# Check for any drift between Git state and cluster state
flux diff kustomization phi-workloads --path ./apps/phi-workloads

# Set up a recurring drift check job
kubectl create job drift-check \
  --from=cronjob/flux-drift-check \
  -n flux-system
```

```yaml
# Flux Alert for any reconciliation failure in PHI namespace
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: phi-drift-alert
  namespace: flux-system
spec:
  summary: "HIPAA ALERT: Configuration drift detected in PHI workloads"
  providerRef:
    name: pagerduty-provider    # Page on-call for PHI drift
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: phi-workloads
  inclusionList:
    - ".*ReconciliationFailed.*"
    - ".*DriftDetected.*"
```

## Best Practices

- Retain all Flux event logs and Git history for a minimum of 6 years to satisfy HIPAA retention requirements.
- Conduct quarterly access reviews of CODEOWNERS and RBAC bindings for PHI namespaces.
- Run annual HIPAA Security Risk Assessments that include a review of Flux configuration for the PHI scope.
- Never allow any application workload to directly access the Flux service account — only Flux reconcilers should have deployment permissions.
- Use a dedicated Flux instance (separate flux-system namespace or cluster) for PHI workloads if your risk assessment requires isolation of the GitOps control plane.

## Conclusion

Flux CD GitOps is well-suited for HIPAA-compliant infrastructure management. The combination of immutable Git audit trails, mandatory PR-based change authorization, namespace isolation, encrypted secret management, and real-time event alerting provides evidence for the HIPAA Technical Safeguards that auditors most commonly examine. Each configuration in this guide maps to a specific HIPAA control reference, making it straightforward to build your HIPAA evidence package around your Flux deployment.
