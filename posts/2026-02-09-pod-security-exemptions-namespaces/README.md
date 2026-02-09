# How to use Pod Security Standards with exemptions for specific namespaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Pod Security, Policy Exemptions, Namespace Security

Description: Learn how to configure Pod Security Admission exemptions for specific namespaces, users, and runtime classes while maintaining strong security policies across your Kubernetes cluster.

---

While Pod Security Standards provide essential security controls, some workloads legitimately need exemptions. System components, monitoring agents, and infrastructure tools often require privileges that application workloads should never have. Pod Security Admission lets you configure granular exemptions while maintaining strict policies for the majority of your cluster.

## Understanding Exemption Mechanisms

Pod Security Admission supports three exemption types: namespace exemptions, user exemptions, and runtime class exemptions. These exemptions let specific workloads bypass policy enforcement while audit and warning modes continue tracking violations. This approach balances security with operational requirements.

Exemptions should be narrowly scoped and well-documented. Every exemption represents a potential security risk and requires regular review to ensure it remains necessary.

## Configuring Namespace Exemptions

Exempt entire namespaces from policy enforcement for system components:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: AdmissionConfiguration
plugins:
- name: PodSecurity
  configuration:
    apiVersion: pod-security.admission.config.k8s.io/v1
    kind: PodSecurityConfiguration
    defaults:
      enforce: baseline
      audit: restricted
      warn: restricted
    exemptions:
      namespaces:
      - kube-system
      - kube-public
      - kube-node-lease
      - monitoring
      - logging
```

This configuration exempts system namespaces and infrastructure namespaces from enforcement while still auditing and warning about violations.

## User-Based Exemptions

Exempt specific service accounts or users:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: AdmissionConfiguration
plugins:
- name: PodSecurity
  configuration:
    apiVersion: pod-security.admission.config.k8s.io/v1
    kind: PodSecurityConfiguration
    defaults:
      enforce: restricted
      audit: restricted
      warn: restricted
    exemptions:
      usernames:
      - system:serviceaccount:kube-system:replicaset-controller
      - system:serviceaccount:kube-system:daemon-set-controller
      - system:serviceaccount:monitoring:prometheus
      runtimeClasses: []
      namespaces: []
```

User exemptions apply regardless of which namespace creates the pod. This enables specific system controllers to create privileged pods even in otherwise restricted namespaces.

## Runtime Class Exemptions

Exempt pods using specific runtime classes:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: AdmissionConfiguration
plugins:
- name: PodSecurity
  configuration:
    apiVersion: pod-security.admission.config.k8s.io/v1
    kind: PodSecurityConfiguration
    defaults:
      enforce: baseline
      audit: restricted
      warn: restricted
    exemptions:
      runtimeClasses:
      - kata-containers
      - gvisor
      usernames: []
      namespaces: []
```

Pods using kata-containers or gvisor runtime classes bypass enforcement. This accommodates alternative container runtimes that provide strong isolation through different mechanisms.

## Complete Exemption Configuration Example

Here's a comprehensive configuration combining all exemption types:

```yaml
apiVersion: apiserver.config.k8s.io/v1
kind: AdmissionConfiguration
plugins:
- name: PodSecurity
  configuration:
    apiVersion: pod-security.admission.config.k8s.io/v1
    kind: PodSecurityConfiguration
    defaults:
      enforce: restricted
      enforce-version: v1.28
      audit: restricted
      audit-version: latest
      warn: restricted
      warn-version: latest
    exemptions:
      usernames:
      - system:serviceaccount:kube-system:replicaset-controller
      - system:serviceaccount:kube-system:daemon-set-controller
      - system:serviceaccount:kube-system:job-controller
      runtimeClasses:
      - kata-containers
      namespaces:
      - kube-system
      - monitoring
      - istio-system
```

This configuration enforces restricted standard cluster-wide with targeted exemptions for system components.

## Documenting Exemption Rationale

Always document why exemptions exist:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
  annotations:
    pod-security-exemption: "true"
    exemption-reason: "Node monitoring requires hostPath and hostNetwork access"
    exemption-date: "2026-02-09"
    exemption-reviewer: "security-team@company.com"
    exemption-review-date: "2026-08-09"
  labels:
    exemption-category: "infrastructure"
```

Regular reviews ensure exemptions remain justified and get removed when no longer needed.

## Partial Exemptions with Different Modes

Instead of full exemptions, use different enforcement levels:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: infrastructure
  labels:
    # Enforce baseline, but audit/warn on restricted
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
  annotations:
    policy-rationale: "Infrastructure components need some privileges but we track restricted violations"
```

This approach enforces minimum security while collecting data about additional violations.

## Workload-Specific Exemption Patterns

Create separate namespaces for different exemption needs:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: node-agents
  labels:
    pod-security.kubernetes.io/enforce: privileged
  annotations:
    exemption-reason: "DaemonSets requiring host access"
---
apiVersion: v1
kind: Namespace
metadata:
  name: network-policy
  labels:
    pod-security.kubernetes.io/enforce: baseline
  annotations:
    exemption-reason: "Network controllers need some elevated privileges"
---
apiVersion: v1
kind: Namespace
metadata:
  name: applications
  labels:
    pod-security.kubernetes.io/enforce: restricted
  annotations:
    policy-note: "No exemptions - all applications must comply"
```

Segregate workloads by security requirements into appropriate namespaces.

## Monitoring Exempted Workloads

Track usage of exemptions to prevent abuse:

```bash
# List exempted namespaces
kubectl get namespaces -l pod-security.kubernetes.io/enforce=privileged

# Find pods in exempted namespaces
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.metadata.namespace == "kube-system" or
                           .metadata.namespace == "monitoring") |
         "\(.metadata.namespace)/\(.metadata.name)"'

# Check for unexpected privileged pods
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.securityContext.privileged == true) |
         "\(.metadata.namespace)/\(.metadata.name)"'
```

Regular audits identify when exemptions enable unnecessary privilege.

## Temporary Exemptions for Migrations

Use exemptions during security policy rollout:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: legacy-apps
  labels:
    # Temporary privileged mode during migration
    pod-security.kubernetes.io/enforce: privileged
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
  annotations:
    migration-plan: "https://wiki.company.com/pod-security-migration"
    target-compliance-date: "2026-06-01"
    migration-owner: "platform-team@company.com"
```

Time-box temporary exemptions and track progress toward full compliance.

## Alternative to Exemptions: Validating Admission Webhooks

For complex exemption logic, use admission webhooks instead:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingWebhookConfiguration
metadata:
  name: custom-pod-security
webhooks:
- name: validate-pod-security.company.com
  clientConfig:
    service:
      name: pod-security-webhook
      namespace: security-system
      path: /validate
  rules:
  - apiGroups: [""]
    apiVersions: ["v1"]
    operations: ["CREATE", "UPDATE"]
    resources: ["pods"]
  namespaceSelector:
    matchExpressions:
    - key: custom-pod-security
      operator: In
      values: ["enabled"]
```

Webhooks enable sophisticated exemption logic based on multiple factors.

## Security Considerations

Exemptions weaken security posture. Minimize their scope:

```yaml
# BAD: Broad exemption
exemptions:
  namespaces:
  - "*-system"  # Too broad, exempts everything ending in -system

# GOOD: Specific exemption
exemptions:
  namespaces:
  - kube-system
  - monitoring-system
  usernames:
  - system:serviceaccount:kube-system:daemon-set-controller
```

Explicit exemption lists prevent accidental security holes.

## Regular Exemption Reviews

Schedule periodic reviews of all exemptions:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: exemption-registry
  namespace: security-system
data:
  exemptions.yaml: |
    exemptions:
    - namespace: monitoring
      reason: "Node metrics collection requires hostPath"
      created: "2026-01-15"
      reviewer: "security-team"
      next-review: "2026-07-15"
      status: "active"
    - namespace: legacy-app
      reason: "Migration in progress"
      created: "2026-02-01"
      reviewer: "platform-team"
      next-review: "2026-03-01"
      status: "temporary"
      removal-date: "2026-06-01"
```

Treat exemptions as technical debt requiring regular evaluation.

## Conclusion

Pod Security Admission exemptions provide necessary flexibility while maintaining strong default security policies. Use namespace exemptions for infrastructure components, user exemptions for system controllers, and runtime class exemptions for alternative isolation technologies. Always document exemption rationale and schedule regular reviews to ensure exemptions remain justified. Prefer partial exemptions with different enforcement levels over complete policy bypass. Monitor exempted workloads carefully and treat exemptions as temporary where possible. The goal is maximum security with minimal exceptions, achieved through thoughtful exemption design, comprehensive documentation, and regular security reviews. Start with restrictive policies and grant exemptions judiciously based on documented operational requirements.
