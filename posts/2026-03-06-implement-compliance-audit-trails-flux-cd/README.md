# How to Implement Compliance and Audit Trails with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Compliance, Audit Trail, Security, Governance

Description: A practical guide to implementing compliance controls and audit trails using Flux CD and GitOps for regulated environments.

---

Regulated industries need to demonstrate who changed what, when, and why. Traditional compliance approaches rely on ticketing systems and manual audit logs. With Flux CD, Git provides an immutable audit trail, and policy enforcement happens automatically. This guide covers how to implement compliance controls with Flux CD.

## Git as an Immutable Audit Trail

Every change in a GitOps workflow is a Git commit. Git provides cryptographic integrity - every commit hash depends on the content and all preceding commits. This makes the audit trail tamper-evident.

```bash
# Every deployment has a traceable history
git log --pretty=format:"%H | %ai | %an | %s" -- apps/production/

# Output:
# a1b2c3d4 | 2024-01-15 14:30:00 | jane.doe | Deploy my-app v2.1.0 to production
# e5f6g7h8 | 2024-01-14 10:15:00 | john.smith | Update resource limits for my-app
# i9j0k1l2 | 2024-01-13 09:00:00 | jane.doe | Add network policy for my-app

# View the exact change for any deployment
git show a1b2c3d4
```

## Signed Commits for Non-Repudiation

Require GPG or SSH-signed commits to prove the identity of who made each change.

```bash
# Configure Git to sign commits with GPG
git config --global commit.gpgsign true
git config --global user.signingkey ABCDEF1234567890

# Verify commit signatures
git log --show-signature -1

# Output:
# commit a1b2c3d4...
# gpg: Signature made Mon 15 Jan 2024 02:30:00 PM UTC
# gpg: using RSA key ABCDEF1234567890
# gpg: Good signature from "Jane Doe <jane.doe@my-org.com>"
```

```yaml
# GitHub branch protection: require signed commits
# Configure via GitHub API
# gh api repos/my-org/fleet-infra/branches/main/protection \
#   --method PUT \
#   --field required_signatures=true
```

```yaml
# Flux can verify signed commits from the Git source
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-infra
  namespace: flux-system
spec:
  interval: 5m
  url: https://github.com/my-org/fleet-infra.git
  ref:
    branch: main
  # Verify commit signatures
  verify:
    mode: head
    secretRef:
      # Contains the public GPG keys of authorized committers
      name: git-pgp-public-keys
```

```yaml
# Secret containing authorized GPG public keys
apiVersion: v1
kind: Secret
metadata:
  name: git-pgp-public-keys
  namespace: flux-system
type: Opaque
stringData:
  # Public keys of all authorized committers
  jane.doe.pub: |
    -----BEGIN PGP PUBLIC KEY BLOCK-----
    ... (key content) ...
    -----END PGP PUBLIC KEY BLOCK-----
  john.smith.pub: |
    -----BEGIN PGP PUBLIC KEY BLOCK-----
    ... (key content) ...
    -----END PGP PUBLIC KEY BLOCK-----
```

## Policy Enforcement with OPA Gatekeeper

Use OPA Gatekeeper to enforce compliance policies at the Kubernetes admission level. Flux deploys the policies themselves.

```yaml
# Deploy Gatekeeper constraint templates via Flux
# infrastructure/gatekeeper/constraint-templates.yaml

# Require all containers to use approved registries
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8sallowedregistries
spec:
  crd:
    spec:
      names:
        kind: K8sAllowedRegistries
      validation:
        openAPIV3Schema:
          type: object
          properties:
            registries:
              type: array
              items:
                type: string
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8sallowedregistries
        violation[{"msg": msg}] {
          container := input.review.object.spec.template.spec.containers[_]
          not startswith(container.image, input.parameters.registries[_])
          msg := sprintf("Container image %s is not from an approved registry", [container.image])
        }
---
# Apply the constraint
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sAllowedRegistries
metadata:
  name: approved-registries
spec:
  match:
    kinds:
      - apiGroups: ["apps"]
        kinds: ["Deployment", "StatefulSet"]
  parameters:
    registries:
      - "ghcr.io/my-org/"
      - "my-org.azurecr.io/"
```

```yaml
# Require resource limits on all containers
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredresources
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredResources
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredresources
        violation[{"msg": msg}] {
          container := input.review.object.spec.template.spec.containers[_]
          not container.resources.limits
          msg := sprintf("Container %s must have resource limits", [container.name])
        }
        violation[{"msg": msg}] {
          container := input.review.object.spec.template.spec.containers[_]
          not container.resources.requests
          msg := sprintf("Container %s must have resource requests", [container.name])
        }
```

## Kyverno Policies for Compliance

Alternatively, use Kyverno for more Kubernetes-native policy enforcement.

```yaml
# Require labels for compliance tracking on all deployments
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-compliance-labels
spec:
  validationFailureAction: Enforce
  rules:
    - name: require-labels
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - StatefulSet
      validate:
        message: "All workloads must have compliance labels: owner, cost-center, data-classification"
        pattern:
          metadata:
            labels:
              owner: "?*"
              cost-center: "?*"
              data-classification: "?*"
---
# Automatically add audit annotations
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-audit-annotations
spec:
  rules:
    - name: add-managed-by
      match:
        any:
          - resources:
              kinds:
                - Deployment
                - StatefulSet
                - Service
      mutate:
        patchStrategicMerge:
          metadata:
            annotations:
              audit.my-org.com/managed-by: "flux-cd"
              audit.my-org.com/last-applied: "{{request.object.metadata.creationTimestamp}}"
```

## Audit Event Logging

Capture all Flux reconciliation events for compliance reporting.

```yaml
# Forward Flux events to an external audit log system
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: audit-log
  namespace: flux-system
spec:
  type: generic-hmac
  address: https://audit.my-org.com/api/events/flux
  secretRef:
    name: audit-webhook-secret
---
# Capture all events for the audit trail
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: audit-all-events
  namespace: flux-system
spec:
  providerRef:
    name: audit-log
  # Capture everything, including info-level events
  eventSeverity: info
  eventSources:
    - kind: GitRepository
      name: "*"
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
    - kind: HelmRepository
      name: "*"
```

```yaml
# Kubernetes audit policy to log Flux actions
apiVersion: audit.k8s.io/v1
kind: Policy
metadata:
  name: flux-audit-policy
rules:
  # Log all changes made by Flux controllers
  - level: RequestResponse
    users:
      - "system:serviceaccount:flux-system:kustomize-controller"
      - "system:serviceaccount:flux-system:helm-controller"
    resources:
      - group: "apps"
        resources: ["deployments", "statefulsets", "daemonsets"]
      - group: ""
        resources: ["services", "configmaps", "secrets"]
    verbs: ["create", "update", "patch", "delete"]
  # Log all access to secrets
  - level: Metadata
    resources:
      - group: ""
        resources: ["secrets"]
    verbs: ["get", "list", "watch"]
```

## Compliance Scanning in CI

Run compliance checks before changes are merged.

```yaml
# .github/workflows/compliance-check.yaml
name: Compliance Check
on:
  pull_request:
    branches: [main]

jobs:
  compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check for required labels
        run: |
          # Verify all Deployments have compliance labels
          for file in $(find apps/ -name "*.yaml"); do
            if grep -q "kind: Deployment" "$file"; then
              for label in owner cost-center data-classification; do
                if ! grep -q "$label:" "$file"; then
                  echo "ERROR: $file missing required label: $label"
                  exit 1
                fi
              done
            fi
          done
          echo "All compliance labels present"

      - name: Verify no secrets in plaintext
        run: |
          # Check that no unencrypted secrets are committed
          for file in $(find . -name "*secret*" -o -name "*credential*"); do
            if [[ "$file" == *.yaml ]] || [[ "$file" == *.yml ]]; then
              if ! grep -q "sops:" "$file" && grep -q "kind: Secret" "$file"; then
                echo "ERROR: Unencrypted secret found: $file"
                exit 1
              fi
            fi
          done
          echo "No unencrypted secrets found"

      - name: Run Trivy config scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: config
          scan-ref: .
          exit-code: 1
          severity: HIGH,CRITICAL
```

## Generating Compliance Reports

Create automated compliance reports from Git and Flux data.

```bash
#!/bin/bash
# compliance-report.sh
# Generate a compliance report for auditors

echo "# Compliance Report"
echo "## Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

echo "## 1. Change History (Last 90 Days)"
git log --since="90 days ago" --merges \
  --pretty=format:"| %H | %ai | %an | %s |" \
  -- apps/production/
echo ""

echo "## 2. Signature Verification"
git log --since="90 days ago" --merges \
  --pretty=format:"%H %G? %GS" \
  -- apps/production/ | while read hash status signer; do
  if [ "$status" = "G" ]; then
    echo "| $hash | VERIFIED | $signer |"
  else
    echo "| $hash | UNSIGNED | N/A |"
  fi
done
echo ""

echo "## 3. Active Policies"
kubectl get constrainttemplates -o custom-columns=NAME:.metadata.name,AGE:.metadata.creationTimestamp
echo ""

echo "## 4. Policy Violations"
kubectl get constraints -o json | jq -r '.items[] | .status.totalViolations // 0'
echo ""

echo "## 5. Flux Reconciliation Status"
flux get all -A --status-selector ready=true 2>/dev/null | wc -l
echo " resources in healthy state"
flux get all -A --status-selector ready=false 2>/dev/null | wc -l
echo " resources in failed state"
```

## Best Practices for Compliance

1. Enable commit signature verification in Flux to ensure only authorized changes are applied.
2. Use OPA Gatekeeper or Kyverno to enforce compliance policies at admission time.
3. Forward all Flux events to a centralized audit log system.
4. Run compliance checks in CI before changes are merged.
5. Require signed commits on protected branches.
6. Generate automated compliance reports for auditors.
7. Use SOPS or Sealed Secrets so secrets are never stored in plaintext in Git.
8. Configure Kubernetes audit logging to capture all Flux controller actions.
9. Tag deployments with change request identifiers for traceability.
