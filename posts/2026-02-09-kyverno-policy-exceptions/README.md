# How to Configure Kyverno Policy Exceptions for Specific Namespaces or Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kyverno, Policy Exceptions, Governance, Compliance

Description: Learn how to use Kyverno PolicyException resources to grant exemptions from policies for specific namespaces, resources, or use cases while maintaining overall governance and security controls.

---

Policy exceptions are necessary in real-world Kubernetes environments. Some workloads need privileged access, certain namespaces require different rules, and legacy applications might not comply with current standards. Kyverno PolicyException resources let you grant targeted exemptions while keeping policies enforced everywhere else. This guide shows you how to implement exceptions safely and manage them effectively.

## Understanding PolicyException Resources

PolicyException is a Kyverno custom resource that exempts specific resources from policy enforcement. Exceptions work by matching resources and listing which policies or rules should not apply. They provide an audit trail of who requested exceptions and why, making governance more transparent.

Exceptions are scoped to namespaces, so you need cluster-scoped policies but namespace-scoped exceptions. This gives namespace administrators control over exceptions within their scope while platform teams maintain policy definitions.

## Creating Your First Exception

Start with a simple exception for a pod that needs to run as root. First, create a policy that blocks running as root:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-run-as-nonroot
spec:
  validationFailureAction: Enforce
  background: true
  rules:
    - name: check-runAsNonRoot
      match:
        any:
          - resources:
              kinds:
                - Pod
      validate:
        message: "Running as root is not allowed."
        pattern:
          spec:
            containers:
              - securityContext:
                  runAsNonRoot: true
```

Now create an exception for a specific pod:

```yaml
apiVersion: kyverno.io/v2beta1
kind: PolicyException
metadata:
  name: allow-root-for-database
  namespace: production
spec:
  exceptions:
    - policyName: require-run-as-nonroot
      ruleNames:
        - check-runAsNonRoot
  match:
    any:
      - resources:
          kinds:
            - Pod
          namespaces:
            - production
          names:
            - postgres-*
```

This exception allows pods whose names start with `postgres-` in the production namespace to run as root, while all other pods must still comply with the policy.

## Exempting Entire Namespaces

Create exceptions that apply to all resources in specific namespaces, useful for system or infrastructure namespaces:

```yaml
apiVersion: kyverno.io/v2beta1
kind: PolicyException
metadata:
  name: system-namespace-exception
  namespace: kube-system
spec:
  exceptions:
    - policyName: require-run-as-nonroot
      ruleNames:
        - check-runAsNonRoot
    - policyName: restrict-host-namespaces
      ruleNames:
        - check-hostPID
        - check-hostIPC
        - check-hostNetwork
  match:
    any:
      - resources:
          kinds:
            - Pod
          namespaces:
            - kube-system
```

This exception exempts all pods in kube-system from multiple policies, acknowledging that system components often need elevated privileges.

## Using Label Selectors for Exceptions

Target exceptions using labels instead of names for more flexible matching:

```yaml
apiVersion: kyverno.io/v2beta1
kind: PolicyException
metadata:
  name: legacy-app-exception
  namespace: default
spec:
  exceptions:
    - policyName: require-resource-limits
      ruleNames:
        - check-memory-limits
        - check-cpu-limits
  match:
    any:
      - resources:
          kinds:
            - Pod
          namespaces:
            - default
          selector:
            matchLabels:
              app: legacy-crm
              exception-approved: "true"
```

This requires two labels to match, ensuring exceptions are explicitly approved. The `exception-approved` label provides documentation that someone intentionally requested the exception.

## Time-Bound Exceptions

Document temporary exceptions by adding expiration information in annotations:

```yaml
apiVersion: kyverno.io/v2beta1
kind: PolicyException
metadata:
  name: temp-privileged-exception
  namespace: development
  annotations:
    expires: "2026-03-01"
    reason: "Debugging kernel issue, remove after fix deployed"
    approved-by: "platform-team@company.com"
spec:
  exceptions:
    - policyName: restrict-privileged-containers
      ruleNames:
        - check-privileged
  match:
    any:
      - resources:
          kinds:
            - Pod
          namespaces:
            - development
          names:
            - debug-pod-*
```

While Kyverno does not automatically expire exceptions, the annotations provide documentation for manual cleanup and audit trails for compliance reviews.

## Exceptions for Multiple Policies

Create a single exception that covers multiple related policies:

```yaml
apiVersion: kyverno.io/v2beta1
kind: PolicyException
metadata:
  name: monitoring-stack-exception
  namespace: monitoring
spec:
  exceptions:
    - policyName: require-run-as-nonroot
      ruleNames:
        - check-runAsNonRoot
    - policyName: restrict-host-paths
      ruleNames:
        - check-hostPath
    - policyName: restrict-host-namespaces
      ruleNames:
        - check-hostNetwork
  match:
    any:
      - resources:
          kinds:
            - Pod
          namespaces:
            - monitoring
          selector:
            matchLabels:
              app: node-exporter
```

This exception grants node-exporter the privileges it needs while keeping policies enforced for other workloads in the monitoring namespace.

## Subject-Based Exceptions

Restrict who can create resources that use exceptions by matching on subjects:

```yaml
apiVersion: kyverno.io/v2beta1
kind: PolicyException
metadata:
  name: admin-only-exception
  namespace: production
spec:
  exceptions:
    - policyName: require-resource-limits
      ruleNames:
        - check-memory-limits
  match:
    any:
      - resources:
          kinds:
            - Pod
          namespaces:
            - production
  conditions:
    all:
      - key: "{{request.userInfo.username}}"
        operator: In
        value:
          - admin@company.com
          - platform-team@company.com
```

This exception only applies when specific users create the resources, preventing developers from bypassing resource limits while allowing administrators flexibility.

## Background Scanning Exceptions

Create exceptions that apply to background scans of existing resources:

```yaml
apiVersion: kyverno.io/v2beta1
kind: PolicyException
metadata:
  name: existing-workload-exception
  namespace: default
  annotations:
    reason: "Legacy workloads deployed before policy implementation"
spec:
  background: true
  exceptions:
    - policyName: require-labels
      ruleNames:
        - check-team-label
        - check-owner-label
  match:
    any:
      - resources:
          kinds:
            - Deployment
            - StatefulSet
          namespaces:
            - default
          selector:
            matchLabels:
              legacy: "true"
```

The `background: true` setting applies the exception to resources that already exist, preventing policy violations for workloads deployed before policy enforcement began.

## Wildcard Exceptions for Development

Allow broader exceptions in development environments while maintaining strict enforcement in production:

```yaml
apiVersion: kyverno.io/v2beta1
kind: PolicyException
metadata:
  name: development-exception
  namespace: dev-*
spec:
  exceptions:
    - policyName: "*"  # Exempt from all policies
  match:
    any:
      - resources:
          kinds:
            - Pod
          namespaces:
            - dev-*
```

Use wildcard exceptions sparingly and only in non-production environments. They bypass all governance controls and should never apply to production workloads.

## Documenting Exception Rationale

Add comprehensive documentation to exception resources:

```yaml
apiVersion: kyverno.io/v2beta1
kind: PolicyException
metadata:
  name: gpu-workload-exception
  namespace: ml-training
  annotations:
    rationale: |
      GPU workloads require privileged access to NVIDIA device plugins
      and host-mounted GPU devices for training operations.
    approved-by: security-team@company.com
    approval-date: "2026-02-01"
    review-date: "2026-08-01"
    ticket: JIRA-1234
spec:
  exceptions:
    - policyName: restrict-privileged-containers
      ruleNames:
        - check-privileged
  match:
    any:
      - resources:
          kinds:
            - Pod
          namespaces:
            - ml-training
          selector:
            matchLabels:
              workload-type: gpu-training
```

Detailed annotations provide context for auditors and help with future policy reviews.

## Managing Exception Lifecycle

Create a GitOps workflow for exception management:

```yaml
# exceptions/production/database-exception.yaml
apiVersion: kyverno.io/v2beta1
kind: PolicyException
metadata:
  name: database-root-exception
  namespace: production
  labels:
    exception-category: database
    risk-level: high
    requires-review: quarterly
spec:
  exceptions:
    - policyName: require-run-as-nonroot
      ruleNames:
        - check-runAsNonRoot
  match:
    any:
      - resources:
          kinds:
            - StatefulSet
          namespaces:
            - production
          names:
            - postgres
            - mysql
```

Store exceptions in Git with required approvals through pull request reviews. Use labels to categorize exceptions by risk level and review frequency.

## Auditing Policy Exceptions

Query exceptions to understand your security posture:

```bash
# List all policy exceptions
kubectl get policyexception -A

# Get detailed exception information
kubectl get policyexception -A -o custom-columns=\
NAME:.metadata.name,\
NAMESPACE:.metadata.namespace,\
POLICY:.spec.exceptions[*].policyName

# Find high-risk exceptions
kubectl get policyexception -A -l risk-level=high

# Check exceptions that need review
kubectl get policyexception -A -l requires-review=quarterly
```

Regular audits ensure exceptions remain necessary and appropriately scoped.

## Monitoring Exception Usage

Track which resources are actually using exceptions:

```bash
# Get policy reports showing exception usage
kubectl get policyreport -A

# Check for resources matching exception criteria
kubectl get pods -A -l exception-approved=true

# View Kyverno metrics for exceptions
kubectl port-forward -n kyverno svc/kyverno-svc-metrics 8000
curl localhost:8000/metrics | grep policy_exception
```

High exception usage might indicate policies that are too strict or need refinement.

## Restricting Exception Creation

Use RBAC to control who can create exceptions:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: policy-exception-admin
rules:
  - apiGroups: ["kyverno.io"]
    resources: ["policyexceptions"]
    verbs: ["create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: platform-team-exceptions
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: policy-exception-admin
subjects:
  - kind: Group
    name: platform-team
    apiGroup: rbac.authorization.k8s.io
```

Restrict exception creation to appropriate teams, preventing developers from self-approving exceptions to security policies.

## Conclusion

Kyverno PolicyException resources provide controlled flexibility in policy enforcement. Use exceptions for legitimate use cases like system components, infrastructure workloads, and legacy applications. Document exceptions thoroughly with annotations explaining rationale and approval. Implement RBAC to control exception creation and establish review processes for high-risk exceptions. Store exceptions in GitOps repositories with required approvals, and regularly audit exceptions to ensure they remain necessary.

Exceptions should be the exception, not the rule. Well-designed policies minimize the need for exceptions, but when they are necessary, PolicyException resources provide a transparent, auditable mechanism for granting them.
