# Preventing Namespace Selector Problems with Unlabeled Namespaces in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Network Policy

Description: Implement proactive measures to prevent namespace selector mismatches in Calico network policies by enforcing namespace labeling standards and policy best practices.

---

## Introduction

Namespace selector problems in Calico network policies are preventable. A common root cause is a policy that assumes a namespace label exists, but the namespace was created without it. Prevention requires enforcing that every namespace carries the labels your policies depend on, and that policies are written defensively to handle edge cases.

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
        'environment' in object.metadata.labels &&
        object.metadata.labels['environment'] in ["production", "staging", "development"]
      message: "Namespace must have an 'environment' label set to production, staging, or development"
    - expression: >-
        has(object.metadata.labels) &&
        'team' in object.metadata.labels
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
        failureAction: Enforce
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
# Uses explicit selectors for clarity
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
        ports:
          - 443
      protocol: TCP
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
REQUIRED_LABELS_CSV=$(IFS=,; echo "${REQUIRED_LABELS[*]}")
ERRORS=0

# Scan all YAML files in the repository
while IFS= read -r -d '' file; do
  # Extract namespace names and labels using python
  REQUIRED_LABELS_CSV="$REQUIRED_LABELS_CSV" python3 - "$file" <<'PY'
import os, yaml, sys
required = os.environ['REQUIRED_LABELS_CSV'].split(',')
path = sys.argv[1]
with open(path) as f:
    for doc in yaml.safe_load_all(f):
        if doc and doc.get('kind') == 'Namespace':
            name = doc['metadata']['name']
            labels = doc['metadata'].get('labels', {})
            missing = [label for label in required if label not in labels]
            if missing and not name.startswith('kube-') and name not in ['default', 'calico-system']:
                print(f'ERROR: {name} in {path} missing labels: {missing}')
                sys.exit(1)
PY
  if [ $? -ne 0 ]; then
    ERRORS=$((ERRORS + 1))
  fi
done < <(find . \( -name "*.yaml" -o -name "*.yml" \) -print0)

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
apiVersion: v1
kind: ServiceAccount
metadata:
  name: namespace-auditor
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: namespace-auditor
rules:
  - apiGroups: [""]
    resources: ["namespaces"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: namespace-auditor
subjects:
  - kind: ServiceAccount
    name: namespace-auditor
    namespace: monitoring
roleRef:
  kind: ClusterRole
  name: namespace-auditor
  apiGroup: rbac.authorization.k8s.io
---
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
                  kubectl get ns --no-headers \
                    -o custom-columns=NAME:.metadata.name,ENV:.metadata.labels.environment |
                    awk '$1 !~ /^kube-/ && $2 == "<none>" { print "  WARNING: " $1 }'
```

## Verification

Test that the prevention measures are working:

```bash
# Test 1: Try creating a namespace without required labels (should be rejected)
kubectl create namespace test-no-labels 2>&1 || echo "Correctly rejected"

# Test 2: Create a namespace with required labels (should succeed)
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: test-labeled
  labels:
    environment: development
    team: test
EOF

# Cleanup
kubectl delete namespace test-labeled test-no-labels 2>/dev/null
```

## Troubleshooting

- **Admission controller blocks system namespace updates**: Ensure your exclude rules cover all system namespaces including those created by add-ons like `cert-manager`, `ingress-nginx`, etc.
- **Existing unlabeled namespaces not caught**: Admission controllers only validate on create/update. Run the audit CronJob or a one-time script to find and fix existing unlabeled namespaces.
- **CI/CD check fails on Helm-generated namespaces**: Helm may create namespaces implicitly. Create the namespace with the required labels before running Helm, or manage a labeled Namespace manifest in the chart instead of relying on an unlabeled `--create-namespace` request.
- **Developers bypass labels with `kubectl create namespace`**: The admission controller catches this. Educate teams on the required label format and provide a namespace creation template.

## Conclusion

Preventing namespace selector problems requires enforcing labels at the point of namespace creation through admission controllers, writing defensive policies that handle missing labels gracefully, validating in CI/CD pipelines, and auditing periodically. The combination of admission control and catch-all policies for unlabeled namespaces ensures your Calico network policies always match the intended scope.
