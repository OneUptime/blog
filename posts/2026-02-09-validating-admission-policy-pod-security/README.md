# How to Enforce Minimum Pod Security Standards with ValidatingAdmissionPolicy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Pod Security

Description: Learn how to use Kubernetes ValidatingAdmissionPolicy to enforce Pod Security Standards and ensure containers meet baseline, restricted, or custom security requirements.

---

The Kubernetes Pod Security Standards define three levels of security policies: Privileged, Baseline, and Restricted. While Pod Security Admission provides built-in enforcement of these standards, ValidatingAdmissionPolicy offers more granular control and the ability to create custom security policies tailored to your organization's needs.

This guide demonstrates how to implement Pod Security Standards using ValidatingAdmissionPolicy with CEL expressions.

## Understanding Pod Security Standards

The three Pod Security Standards are:

**Privileged**: Unrestricted policy, allowing all configurations. Suitable for system-level workloads.

**Baseline**: Minimally restrictive policy that prevents known privilege escalations. Suitable for most applications.

**Restricted**: Heavily restricted policy following security hardening best practices. Required for security-sensitive workloads.

ValidatingAdmissionPolicy lets you enforce these standards programmatically while providing flexibility to customize rules.

## Prerequisites

Before implementing these policies, ensure you have:

- Kubernetes 1.30 or later (ValidatingAdmissionPolicy is stable)
- kubectl with cluster admin access
- Understanding of Pod Security contexts
- Familiarity with CEL expressions (helpful)

## Implementing Baseline Pod Security Standard

The Baseline standard prevents the most common privilege escalations. Here's a Pod-focused policy:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: baseline-pod-security
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      operations: ["CREATE", "UPDATE"]
      resources: ["pods"]
  validations:
  # Disallow privileged containers
  - expression: |
      object.spec.containers.all(c,
        !has(c.securityContext) ||
        !has(c.securityContext.privileged) ||
        c.securityContext.privileged == false
      )
    message: "Privileged containers are not allowed (Baseline)"

  # Disallow host namespaces
  - expression: |
      !has(object.spec.hostNetwork) || object.spec.hostNetwork == false
    message: "Host network is not allowed (Baseline)"

  - expression: |
      !has(object.spec.hostPID) || object.spec.hostPID == false
    message: "Host PID namespace is not allowed (Baseline)"

  - expression: |
      !has(object.spec.hostIPC) || object.spec.hostIPC == false
    message: "Host IPC namespace is not allowed (Baseline)"

  # Disallow host path volumes
  - expression: |
      !has(object.spec.volumes) ||
      object.spec.volumes.all(v, !has(v.hostPath))
    message: "HostPath volumes are not allowed (Baseline)"

  # Restrict host ports
  - expression: |
      object.spec.containers.all(c,
        !has(c.ports) ||
        c.ports.all(p, !has(p.hostPort) || p.hostPort == 0)
      )
    message: "Host ports are not allowed (Baseline)"

  # Additional hardening: disallow privilege escalation
  - expression: |
      object.spec.containers.all(c,
        !has(c.securityContext) ||
        !has(c.securityContext.allowPrivilegeEscalation) ||
        c.securityContext.allowPrivilegeEscalation == false
      )
    message: "Privilege escalation must be disabled"

  # Restrict capabilities
  - expression: |
      object.spec.containers.all(c,
        !has(c.securityContext) ||
        !has(c.securityContext.capabilities) ||
        !has(c.securityContext.capabilities.add) ||
        c.securityContext.capabilities.add.all(cap,
          cap in [
            'AUDIT_WRITE', 'CHOWN', 'DAC_OVERRIDE', 'FOWNER',
            'FSETID', 'KILL', 'MKNOD', 'NET_BIND_SERVICE',
            'SETFCAP', 'SETGID', 'SETPCAP', 'SETUID', 'SYS_CHROOT'
          ]
        )
      )
    message: "Only Baseline-approved capabilities are allowed"

  # Disallow unsafe sysctls
  - expression: |
      !has(object.spec.securityContext) ||
      !has(object.spec.securityContext.sysctls) ||
      object.spec.securityContext.sysctls.all(s,
        s.name in [
          'kernel.shm_rmid_forced',
          'net.ipv4.ip_local_port_range',
          'net.ipv4.ip_unprivileged_port_start',
          'net.ipv4.tcp_syncookies',
          'net.ipv4.ping_group_range',
          'net.ipv4.ip_local_reserved_ports',
          'net.ipv4.tcp_keepalive_time',
          'net.ipv4.tcp_fin_timeout',
          'net.ipv4.tcp_keepalive_intvl',
          'net.ipv4.tcp_keepalive_probes'
        ]
      )
    message: "Unsafe sysctls are not allowed (Baseline)"
```

Create a binding to apply this policy:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: baseline-security-binding
spec:
  policyName: baseline-pod-security
  validationActions: ["Deny"]
  matchResources:
    namespaceSelector:
      matchExpressions:
      - key: pod-security.kubernetes.io/enforce
        operator: In
        values: ["baseline", "restricted"]
```

## Implementing Restricted Pod Security Standard

The Restricted standard enforces security hardening best practices:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: restricted-pod-security
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      operations: ["CREATE", "UPDATE"]
      resources: ["pods"]
  validations:
  # Apply this alongside the Baseline policy, or include those validations here.

  # Require runAsNonRoot
  - expression: |
      (has(object.spec.securityContext) &&
      has(object.spec.securityContext.runAsNonRoot) &&
      object.spec.securityContext.runAsNonRoot == true) ||
      object.spec.containers.all(c,
        has(c.securityContext) &&
        has(c.securityContext.runAsNonRoot) &&
        c.securityContext.runAsNonRoot == true
      )
    message: "Containers must run as non-root user (Restricted)"

  # Require non-root UID
  - expression: |
      (!has(object.spec.securityContext) ||
      !has(object.spec.securityContext.runAsUser) ||
      object.spec.securityContext.runAsUser > 0) &&
      object.spec.containers.all(c,
        !has(c.securityContext) ||
        !has(c.securityContext.runAsUser) ||
        c.securityContext.runAsUser > 0
      )
    message: "Containers must not run as UID 0 (Restricted)"

  # Require dropping ALL capabilities
  - expression: |
      object.spec.containers.all(c,
        has(c.securityContext) &&
        has(c.securityContext.capabilities) &&
        has(c.securityContext.capabilities.drop) &&
        'ALL' in c.securityContext.capabilities.drop
      )
    message: "All capabilities must be dropped (Restricted)"

  # Restrict volume types
  - expression: |
      !has(object.spec.volumes) ||
      object.spec.volumes.all(v,
        has(v.configMap) || has(v.csi) ||
        has(v.downwardAPI) ||
        has(v.emptyDir) || has(v.projected) ||
        has(v.secret) || has(v.persistentVolumeClaim) ||
        has(v.ephemeral)
      )
    message: "Only approved volume types are allowed (Restricted)"

  # Require read-only root filesystem
  - expression: |
      object.spec.containers.all(c,
        has(c.securityContext) &&
        has(c.securityContext.readOnlyRootFilesystem) &&
        c.securityContext.readOnlyRootFilesystem == true
      )
    message: "Root filesystem must be read-only (Restricted)"

  # Require seccomp profile
  - expression: |
      (has(object.spec.securityContext) &&
      has(object.spec.securityContext.seccompProfile) &&
      object.spec.securityContext.seccompProfile.type in ['RuntimeDefault', 'Localhost']) ||
      object.spec.containers.all(c,
        has(c.securityContext) &&
        has(c.securityContext.seccompProfile) &&
        c.securityContext.seccompProfile.type in ['RuntimeDefault', 'Localhost']
      )
    message: "Seccomp profile is required (Restricted)"
```

Bind the restricted policy to high-security namespaces:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: restricted-security-binding
spec:
  policyName: restricted-pod-security
  validationActions: ["Deny"]
  matchResources:
    namespaceSelector:
      matchLabels:
        pod-security.kubernetes.io/enforce: restricted
```

## Creating Tiered Security Policies

Implement a tiered approach where different namespaces have different requirements:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production-apps
  labels:
    pod-security.kubernetes.io/enforce: restricted
    environment: production
---
apiVersion: v1
kind: Namespace
metadata:
  name: staging-apps
  labels:
    pod-security.kubernetes.io/enforce: baseline
    environment: staging
---
apiVersion: v1
kind: Namespace
metadata:
  name: system-workloads
  labels:
    pod-security.kubernetes.io/enforce: privileged
    environment: system
```

## Custom Security Policies

Extend the standard policies with organization-specific requirements:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: custom-security-requirements
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      operations: ["CREATE", "UPDATE"]
      resources: ["pods"]
  validations:
  # Require specific AppArmor profile
  - expression: |
      (has(object.spec.securityContext) &&
      has(object.spec.securityContext.appArmorProfile) &&
      object.spec.securityContext.appArmorProfile.type == 'Localhost' &&
      has(object.spec.securityContext.appArmorProfile.localhostProfile) &&
      object.spec.securityContext.appArmorProfile.localhostProfile.startsWith('company/')) ||
      object.spec.containers.all(c,
        has(c.securityContext) &&
        has(c.securityContext.appArmorProfile) &&
        c.securityContext.appArmorProfile.type == 'Localhost' &&
        has(c.securityContext.appArmorProfile.localhostProfile) &&
        c.securityContext.appArmorProfile.localhostProfile.startsWith('company/')
      )
    message: "Custom AppArmor profile is required"

  # Enforce resource limits
  - expression: |
      object.spec.containers.all(c,
        has(c.resources) &&
        has(c.resources.limits) &&
        has(c.resources.limits.memory) &&
        has(c.resources.limits.cpu) &&
        isQuantity(c.resources.limits.memory) &&
        isQuantity(c.resources.limits.cpu) &&
        quantity(c.resources.limits.memory).compareTo(quantity('4Gi')) <= 0 &&
        quantity(c.resources.limits.cpu).compareTo(quantity('2')) <= 0
      )
    message: "Resource limits must be set and within allowed ranges"

  # Require specific security labels
  - expression: |
      has(object.metadata.labels) &&
      'security-scan' in object.metadata.labels &&
      'security-owner' in object.metadata.labels
    message: "Security tracking labels are required"

  # Block images from untrusted registries
  - expression: |
      object.spec.containers.all(c,
        c.image.startsWith('registry.company.com/') ||
        c.image.startsWith('gcr.io/company-project/')
      )
    message: "Images must come from approved registries"
```

## Exemptions and Exceptions

Some workloads need exemptions from standard policies. Use separate bindings with exclusions:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: restricted-with-exemptions
spec:
  policyName: restricted-pod-security
  validationActions: ["Deny"]
  matchResources:
    namespaceSelector:
      matchLabels:
        pod-security.kubernetes.io/enforce: restricted
    objectSelector:
      matchExpressions:
      # Exempt pods with a specific label
      - key: pod-security.kubernetes.io/exempt
        operator: DoesNotExist
```

Exempt specific service accounts:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: restricted-with-sa-exemption
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      operations: ["CREATE", "UPDATE"]
      resources: ["pods"]
  validations:
  - expression: |
      request.userInfo.username.startsWith('system:serviceaccount:kube-system:') ||
      (has(object.spec.securityContext) &&
      has(object.spec.securityContext.runAsNonRoot) &&
      object.spec.securityContext.runAsNonRoot == true)
    message: "Must run as non-root unless system service account"
```

## Audit Mode for Gradual Rollout

Start with audit mode to understand impact before enforcement:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: baseline-audit
spec:
  policyName: baseline-pod-security
  validationActions: ["Audit"]  # Only log violations
  matchResources:
    namespaceSelector:
      matchLabels:
        pod-security.kubernetes.io/audit: baseline
```

Monitor audit logs to identify violations:

```bash
# View API server audit logs

kubectl logs -n kube-system kube-apiserver-<node> | \
  grep ValidatingAdmissionPolicy | \
  grep baseline-pod-security
```

After addressing violations, switch to enforcement:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: baseline-enforce
spec:
  policyName: baseline-pod-security
  validationActions: ["Deny"]
  matchResources:
    namespaceSelector:
      matchLabels:
        pod-security.kubernetes.io/enforce: baseline
```

## Testing and Validation

Test policies in a development environment before production:

```bash
# Create test pod that violates policy
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: privileged-test
  namespace: test-security
spec:
  containers:
  - name: test
    image: nginx
    securityContext:
      privileged: true
EOF
```

Expected output:

```text
Error from server: ValidatingAdmissionPolicy 'baseline-pod-security' with binding 'baseline-security-binding' denied request: Privileged containers are not allowed (Baseline)
```

## Monitoring and Alerting

Set up monitoring for policy violations using OneUptime or your preferred monitoring solution:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: policy-monitoring
data:
  alert-rules.yaml: |
    groups:
    - name: admission-policy
      interval: 30s
      rules:
      - alert: HighPolicyViolationRate
        expr: sum(rate(apiserver_request_total{resource="pods",code=~"4.."}[5m])) > 10
        annotations:
          summary: "High rate of rejected Pod API requests"
```

## Conclusion

ValidatingAdmissionPolicy provides a flexible, declarative approach to enforcing Pod Security Standards in Kubernetes. By implementing tiered policies matched to namespace security levels, you can ensure that workloads meet appropriate security requirements without blocking legitimate use cases.

Start with Baseline policies in audit mode across all namespaces, gradually move to enforcement as teams remediate violations, then implement Restricted policies for production workloads. This phased approach minimizes disruption while improving your cluster's security posture over time.
