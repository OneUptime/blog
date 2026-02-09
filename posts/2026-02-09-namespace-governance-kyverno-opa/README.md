# How to Build Namespace Governance Policies with Kyverno and OPA

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Policy

Description: Learn how to implement comprehensive namespace governance using Kyverno and OPA (Open Policy Agent) to enforce security, compliance, and operational best practices.

---

As Kubernetes environments grow, maintaining consistent security and operational standards across namespaces becomes challenging. Manual reviews and documentation are insufficient for enforcing policies at scale. Policy engines like Kyverno and OPA provide automated governance that validates, mutates, and generates resources according to your organization's rules.

Namespace governance policies ensure resource requests and limits are set, prevent privileged containers, enforce naming conventions, require specific labels and annotations, validate image sources, and implement multi-tenancy boundaries.

## Understanding Policy Engines

Kyverno is a Kubernetes-native policy engine that uses YAML to define policies. OPA is a general-purpose policy engine using Rego language. Both can enforce admission control policies, but Kyverno is simpler for Kubernetes-specific use cases while OPA offers more flexibility for complex logic.

## Installing Kyverno

Deploy Kyverno to your cluster:

```bash
kubectl create -f https://github.com/kyverno/kyverno/releases/download/v1.10.0/install.yaml

# Verify installation
kubectl get pods -n kyverno
kubectl get validatingwebhookconfigurations
kubectl get mutatingwebhookconfigurations
```

## Enforcing Resource Limits Per Namespace

Create a policy that requires resource limits on all containers:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-resource-limits
spec:
  validationFailureAction: enforce
  background: true
  rules:
  - name: check-cpu-memory-limits
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      message: "CPU and memory limits are required for all containers"
      pattern:
        spec:
          containers:
          - resources:
              limits:
                memory: "?*"
                cpu: "?*"
```

## Namespace-Specific Resource Policies

Apply different policies based on namespace labels:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: namespace-specific-limits
spec:
  validationFailureAction: enforce
  background: false
  rules:
  # Production namespaces require higher limits
  - name: production-resource-requirements
    match:
      any:
      - resources:
          kinds:
          - Pod
          namespaceSelector:
            matchLabels:
              environment: production
    validate:
      message: "Production pods must have at least 1 CPU and 1Gi memory"
      pattern:
        spec:
          containers:
          - resources:
              requests:
                memory: ">=1Gi"
                cpu: ">=1"
              limits:
                memory: ">=2Gi"
                cpu: ">=2"
  # Development namespaces have lower requirements
  - name: development-resource-requirements
    match:
      any:
      - resources:
          kinds:
          - Pod
          namespaceSelector:
            matchLabels:
              environment: development
    validate:
      message: "Development pods must specify resources"
      pattern:
        spec:
          containers:
          - resources:
              requests:
                memory: "?*"
                cpu: "?*"
```

## Enforcing Image Registry Restrictions

Ensure pods only use approved container registries:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: restrict-image-registries
spec:
  validationFailureAction: enforce
  background: true
  rules:
  - name: validate-image-registry
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      message: "Images must come from approved registries: myregistry.io or gcr.io/myproject"
      pattern:
        spec:
          containers:
          - image: "myregistry.io/* | gcr.io/myproject/*"
```

## Generating Network Policies for New Namespaces

Automatically create network policies when namespaces are created:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: generate-network-policies
spec:
  rules:
  - name: deny-all-ingress
    match:
      any:
      - resources:
          kinds:
          - Namespace
          selector:
            matchLabels:
              auto-netpol: "true"
    generate:
      synchronize: true
      apiVersion: networking.k8s.io/v1
      kind: NetworkPolicy
      name: deny-all-ingress
      namespace: "{{request.object.metadata.name}}"
      data:
        spec:
          podSelector: {}
          policyTypes:
          - Ingress
  - name: allow-dns
    match:
      any:
      - resources:
          kinds:
          - Namespace
          selector:
            matchLabels:
              auto-netpol: "true"
    generate:
      synchronize: true
      apiVersion: networking.k8s.io/v1
      kind: NetworkPolicy
      name: allow-dns
      namespace: "{{request.object.metadata.name}}"
      data:
        spec:
          podSelector: {}
          policyTypes:
          - Egress
          egress:
          - to:
            - namespaceSelector:
                matchLabels:
                  name: kube-system
            ports:
            - protocol: UDP
              port: 53
```

## Mutating Policies for Automatic Compliance

Automatically add labels and annotations to resources:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-default-labels
spec:
  background: false
  rules:
  - name: add-team-label
    match:
      any:
      - resources:
          kinds:
          - Pod
          namespaces:
          - team-*
    mutate:
      patchStrategicMerge:
        metadata:
          labels:
            managed-by: platform-team
            +(team): "{{request.namespace | split('-') | [1]}}"
        spec:
          containers:
          - (name): "*"
            securityContext:
              allowPrivilegeEscalation: false
              runAsNonRoot: true
```

## Installing OPA Gatekeeper

Deploy OPA Gatekeeper for more complex policies:

```bash
kubectl apply -f https://raw.githubusercontent.com/open-policy-agent/gatekeeper/release-3.13/deploy/gatekeeper.yaml

# Verify installation
kubectl get pods -n gatekeeper-system
```

## OPA Constraint Template for Namespace Quotas

Create a constraint template to validate resource quotas:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredquotas
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredQuotas
      validation:
        openAPIV3Schema:
          type: object
          properties:
            requiredQuotas:
              type: array
              items:
                type: string
  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package k8srequiredquotas

      violation[{"msg": msg}] {
        input.review.kind.kind == "Namespace"
        namespace := input.review.object.metadata.name
        not has_required_quotas(namespace)
        msg := sprintf("Namespace %v must have ResourceQuota defined", [namespace])
      }

      has_required_quotas(namespace) {
        quota := data.inventory.cluster["v1"]["ResourceQuota"][namespace][_]
        required := input.parameters.requiredQuotas[_]
        quota.spec.hard[required]
      }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredQuotas
metadata:
  name: require-namespace-quotas
spec:
  match:
    kinds:
    - apiGroups: [""]
      kinds: ["Namespace"]
    excludedNamespaces:
    - kube-system
    - kube-public
    - kube-node-lease
  parameters:
    requiredQuotas:
    - "requests.cpu"
    - "requests.memory"
    - "limits.cpu"
    - "limits.memory"
```

## OPA Policy for Pod Security Standards

Enforce pod security standards using OPA:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8spspprivileged
spec:
  crd:
    spec:
      names:
        kind: K8sPSPPrivileged
  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package k8spspprivileged

      violation[{"msg": msg}] {
        container := input_containers[_]
        container.securityContext.privileged
        msg := sprintf("Privileged container is not allowed: %v", [container.name])
      }

      violation[{"msg": msg}] {
        not input.review.object.spec.securityContext.runAsNonRoot
        msg := "Containers must run as non-root user"
      }

      input_containers[c] {
        c := input.review.object.spec.containers[_]
      }

      input_containers[c] {
        c := input.review.object.spec.initContainers[_]
      }
---
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sPSPPrivileged
metadata:
  name: psp-privileged
spec:
  match:
    kinds:
    - apiGroups: [""]
      kinds: ["Pod"]
    namespaceSelector:
      matchLabels:
        enforce-psp: "true"
```

## Namespace Naming Convention Policy

Enforce naming conventions for namespaces:

```yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: namespace-naming-convention
spec:
  validationFailureAction: enforce
  rules:
  - name: check-namespace-name
    match:
      any:
      - resources:
          kinds:
          - Namespace
    validate:
      message: "Namespace must follow naming convention: team-<teamname>-<environment>"
      pattern:
        metadata:
          name: "team-*-dev | team-*-staging | team-*-prod | kube-* | default"
```

## Monitoring Policy Violations

Create alerts for policy violations:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-rules-policies
  namespace: monitoring
data:
  policy-rules.yaml: |
    groups:
    - name: policy-violations
      interval: 30s
      rules:
      - alert: HighPolicyViolations
        expr: |
          sum(rate(kyverno_policy_results_total{policy_result="fail"}[5m])) by (policy_name)
          > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High rate of policy violations"
          description: "Policy {{ $labels.policy_name }} has {{ $value }} violations per second"

      - alert: GatekeeperConstraintViolations
        expr: |
          sum(gatekeeper_violations{enforcement_action="deny"}) by (constraint_kind)
          > 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Gatekeeper constraint violations detected"
```

## Testing Policies

Test policies before enforcing them:

```bash
# Test with audit mode first
kubectl apply -f - <<EOF
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: test-policy
spec:
  validationFailureAction: audit  # Use audit mode
  rules:
  - name: test-rule
    match:
      any:
      - resources:
          kinds:
          - Pod
    validate:
      message: "Test message"
      pattern:
        metadata:
          labels:
            team: "?*"
EOF

# Check policy reports
kubectl get policyreport -A
kubectl describe policyreport -n myapp

# View violations without blocking
kubectl get policyreport -n myapp -o jsonpath='{.items[*].results[?(@.result=="fail")]}'
```

By combining Kyverno and OPA, you can implement comprehensive namespace governance that enforces security, compliance, and operational best practices automatically across your Kubernetes environment.
