# Preventing Namespace Selector Problems with Unlabeled Namespaces in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy

Description: Implement proactive measures to prevent namespace selector mismatches in Calico network policies by enforcing namespace labeling standards and policy best practices.

---

## Introduction

Namespace selector problems in Calico network policies are preventable. The root cause is always the same: a policy assumes a namespace label exists, but the namespace was created without it. Prevention requires enforcing that every namespace carries the labels your policies depend on, and that policies are written defensively to handle edge cases.

Many teams discover this problem only after a security incident or outage. A namespace is created by a developer or automation tool without the required labels, traffic flows through that the policy was supposed to block, and the gap is only found during an audit. By that point, the unlabeled namespace may have been running for weeks.

This guide establishes guardrails at the cluster level to make unlabeled namespaces impossible and policies resilient.

## Prerequisites

- A Kubernetes cluster with Calico CNI
- `kubectl` with cluster-admin access
- Familiarity with admission controllers (Kyverno, Gatekeeper, or built-in ValidatingAdmissionPolicy)
- GitOps or CI/CD pipeline for managing Kubernetes resources

## Enforcing Namespace Labels with Admission Controllers

Use an admission controller to reject namespace creation requests that lack required labels.

Using the built-in ValidatingAdmissionPolicy (Kubernetes 1.30+):

```yaml
# validating-admission-policy.yaml
# Requires namespaces to have environment and team labels
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: require-namespace-labels
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
      - apiGroups: [""]
        apiVersions: ["v1"]
        resources: ["namespaces"]
        operations: ["CREATE", "UPDATE"]
  matchConditions:
    # Exclude system namespaces from this requirement
    - name: exclude-system-namespaces
      expression: >-
        !object.metadata.name.startsWith("kube-") &&
        object.metadata.name != "default" &&
        !object.metadata.name.startsWith("calico-")
  validations:
    - expression: >-
        has(object.metadata.labels) &&
        has(object.metadata.labels.environment) &&
        object.metadata.labels.environment in ["production", "staging", "development"]
      message: "Namespace must have an 'environment' label set to production, staging, or development"
    - expression: >-
        has(object.metadata.labels) &&
        has(object.metadata.labels.team)
      message: "Namespace must have a 'team' label"
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: require-namespace-labels-binding
spec:
  policyName: require-namespace-labels
  validationActions:
    - Deny
```

For older clusters, use Kyverno:

```yaml
# kyverno-require-ns-labels.yaml
# Kyverno policy to enforce namespace labels
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-namespace-labels
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: check-required-labels
      match:
        any:
          - resources:
              kinds:
                - Namespace
      exclude:
        any:
          - resources:
              names:
                - kube-system
                - kube-public
                - kube-node-lease
                - calico-system
                - calico-apiserver
                - default
      validate:
        message: >-
          Namespace {{request.object.metadata.name}} must have
          'environment' and 'team' labels.
        pattern:
          metadata:
            labels:
              environment: "production | staging | development"
              team: "?*"
```

## Writing Defensive Calico Policies

Structure your policies to be explicit about what they match rather than relying on labels that may not exist:

```yaml
# defensive-policy.yaml
# Uses both positive and negative selectors for clarity
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: isolate-production
spec:
  # Explicitly target production namespaces
  namespaceSelector: environment == 'production'
  types:
    - Ingress
  ingress:
    # Allow from other production namespaces
    - action: Allow
      source:
        namespaceSelector: environment == 'production'
    # Explicitly allow from monitoring regardless of environment label
    - action: Allow
      source:
        namespaceSelector: kubernetes.io/metadata.name == 'monitoring'
    # Deny everything else
    - action: Deny
```

Create a catch-all policy for unlabeled namespaces:

```yaml
# catch-unlabeled-namespaces.yaml
# Restricts traffic from namespaces missing the environment label
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: restrict-unlabeled-namespaces
spec:
  # Match namespaces that do NOT have the environment label
  namespaceSelector: "!has(environment)"
  order: 1000
  types:
    - Egress
  egress:
    # Allow DNS so pods can still resolve names
    - action: Allow
      protocol: UDP
      destination:
        ports:
          - 53
    # Allow access to the Kubernetes API
    - action: Allow
      destination:
        nets:
          - 10.96.0.1/32
      protocol: TCP
      destination:
        ports:
          - 443
    # Deny all other egress from unlabeled namespaces
    - action: Deny
```

## CI/CD Pipeline Checks

Add pre-deployment validation to catch missing labels before they reach the cluster:

```bash
#!/bin/bash
# ci-check-namespace-labels.sh
# Run in CI/CD pipeline to validate namespace manifests have required labels

REQUIRED_LABELS=("environment" "team")
ERRORS=0

# Find all namespace YAML files in the repository
for file in $(find . -name "*.yaml" -o -name "*.yml" | xargs grep -l "kind: Namespace"); do
  # Extract namespace names and labels using python
  python3 -c "
import yaml, sys
with open('$file') as f:
    for doc in yaml.safe_load_all(f):
        if doc and doc.get('kind') == 'Namespace':
            name = doc['metadata']['name']
            labels = doc['metadata'].get('labels', {})
            for req in $( printf "'%s'," "${REQUIRED_LABELS[@]}" | sed 's/,$//' | sed "s/'/"/g" | xargs -I{} echo "[{}]" ):
                pass
            missing = [l for l in ['environment', 'team'] if l not in labels]
            if missing and not name.startswith('kube-') and name not in ['default', 'calico-system']:
                print(f'ERROR: {name} in $file missing labels: {missing}')
                sys.exit(1)
" || ERRORS=$((ERRORS + 1))
done

if [ $ERRORS -gt 0 ]; then
  echo "FAILED: $ERRORS namespace(s) missing required labels"
  exit 1
fi
echo "PASSED: All namespaces have required labels"
```

## Periodic Audit Job

Run a CronJob that reports unlabeled namespaces:

```yaml
# namespace-audit-cronjob.yaml
# Weekly audit of namespace labels
apiVersion: batch/v1
kind: CronJob
metadata:
  name: namespace-label-audit
  namespace: monitoring
spec:
  schedule: "0 9 * * 1"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: namespace-auditor
          restartPolicy: Never
          containers:
            - name: auditor
              image: bitnami/kubectl:1.29
              command:
                - sh
                - -c
                - |
                  echo "=== Namespace Label Audit ==="
                  echo "Date: $(date)"
                  echo ""
                  echo "Namespaces missing 'environment' label:"
                  kubectl get ns -o json | python3 -c "
                  import sys, json
                  for ns in json.load(sys.stdin)['items']:
                    labels = ns['metadata'].get('labels', {})
                    name = ns['metadata']['name']
                    if 'environment' not in labels and not name.startswith('kube-'):
                      print(f'  WARNING: {name}')
                  "
```

## Verification

Test that the prevention measures are working:

```bash
# Test 1: Try creating a namespace without required labels (should be rejected)
kubectl create namespace test-no-labels 2>&1 || echo "Correctly rejected"

# Test 2: Create a namespace with required labels (should succeed)
kubectl create namespace test-labeled
kubectl label namespace test-labeled environment=development team=test
# Or create with labels inline:
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: test-with-labels
  labels:
    environment: development
    team: test
EOF

# Cleanup
kubectl delete namespace test-labeled test-with-labels test-no-labels 2>/dev/null
```

## Troubleshooting

- **Admission controller blocks system namespace updates**: Ensure your exclude rules cover all system namespaces including those created by add-ons like `cert-manager`, `ingress-nginx`, etc.
- **Existing unlabeled namespaces not caught**: Admission controllers only validate on create/update. Run the audit CronJob or a one-time script to find and fix existing unlabeled namespaces.
- **CI/CD check fails on Helm-generated namespaces**: Helm may create namespaces implicitly. Use `--create-namespace` with Helm and add labels via the Chart values or a post-install hook.
- **Developers bypass labels with `kubectl create namespace`**: The admission controller catches this. Educate teams on the required label format and provide a namespace creation template.

## Conclusion

Preventing namespace selector problems requires enforcing labels at the point of namespace creation through admission controllers, writing defensive policies that handle missing labels gracefully, validating in CI/CD pipelines, and auditing periodically. The combination of admission control and catch-all policies for unlabeled namespaces ensures your Calico network policies always match the intended scope.
