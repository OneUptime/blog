# How to configure Pod Security Standards for namespace-level enforcement

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Pod Security

Description: Learn how to implement Pod Security Standards at the namespace level to enforce security policies across all pods while maintaining flexibility for different workload requirements.

---

Pod Security Standards (PSS) replaced Pod Security Policies in Kubernetes 1.25, providing a simpler way to enforce security baselines. Rather than creating complex policy objects, you apply labels to namespaces that automatically enforce one of three security profiles: Privileged, Baseline, or Restricted. This namespace-level enforcement makes it easy to apply different security postures to different parts of your cluster.

Understanding how to configure PSS at the namespace level is essential for maintaining secure Kubernetes clusters. The right profile depends on your workload requirements, balancing security with operational needs.

## Understanding the three security profiles

Pod Security Standards define three profiles with increasing restrictions:

**Privileged**: Unrestricted policy, allowing all pod configurations. Use for system-level workloads that need full cluster access.

**Baseline**: Minimally restrictive policy preventing known privilege escalations. Good default for most applications.

**Restricted**: Heavily restricted policy following security hardening best practices. Recommended for security-sensitive workloads.

Each profile builds on the previous, with Restricted being the most secure and Privileged the most permissive.

## Applying Pod Security Standards with labels

Configure PSS by adding labels to namespace resources:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production-apps
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

This configuration enforces the baseline profile while auditing and warning about restricted profile violations. Pods that violate the baseline policy are rejected, while restricted violations generate audit logs and warnings without blocking deployment.

## Enforcing the Baseline profile

The baseline profile prevents common security issues without being overly restrictive:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: web-applications
  labels:
    pod-security.kubernetes.io/enforce: baseline
```

This blocks pods that:
- Run as root with privilege escalation enabled
- Use privileged containers
- Mount host paths
- Use host networking, PID, or IPC namespaces
- Add dangerous capabilities

Most applications work fine under baseline restrictions. Here's a pod that passes baseline checks:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: webapp
  namespace: web-applications
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
  containers:
  - name: app
    image: webapp:v1.0
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
```

## Enforcing the Restricted profile

The restricted profile implements defense-in-depth security:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: sensitive-data
  labels:
    pod-security.kubernetes.io/enforce: restricted
```

Restricted profile requires:
- Running as non-root user
- Dropping all capabilities
- Read-only root filesystem
- No privilege escalation
- Seccomp profile must be RuntimeDefault or Localhost
- SELinux context must be set

Pods must explicitly configure all these settings:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
  namespace: sensitive-data
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: secure-app:v1.0
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
      readOnlyRootFilesystem: true
    volumeMounts:
    - name: tmp
      mountPath: /tmp
  volumes:
  - name: tmp
    emptyDir: {}
```

The emptyDir volume provides writable space since the root filesystem is read-only.

## Using Privileged profile for system workloads

System components often need privileged access:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kube-system
  labels:
    pod-security.kubernetes.io/enforce: privileged
```

The privileged profile allows all pod configurations without restrictions. Use it only for trusted system components like CNI plugins, CSI drivers, and monitoring agents that genuinely need elevated privileges.

## Combining enforce, audit, and warn modes

Use different modes to gradually tighten security:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: legacy-apps
  labels:
    # Current enforcement (permissive)
    pod-security.kubernetes.io/enforce: baseline
    # Track restricted violations for future enforcement
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

This configuration enforces baseline while collecting data on what would break under restricted. Review audit logs to understand violations before enforcing restricted profile.

## Version-specific policy enforcement

Pin policies to specific Kubernetes versions:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: stable-apps
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: v1.27
```

The enforce-version label pins the policy definition to Kubernetes 1.27. This prevents surprise breakages when upgrading clusters if policy definitions evolve. Omitting the version uses the latest policy definition.

## Per-namespace security strategies

Different namespaces can have different security postures:

```yaml
# Development - Permissive for flexibility
apiVersion: v1
kind: Namespace
metadata:
  name: development
  labels:
    pod-security.kubernetes.io/enforce: privileged
---
# Staging - Baseline for reasonable security
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: restricted
---
# Production - Restricted for maximum security
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
```

This progressive approach lets developers work freely in development while enforcing strict security in production.

## Handling violations

When a pod violates the enforced profile, Kubernetes rejects it:

```
Error from server (Forbidden): error when creating "pod.yaml": pods "app" is forbidden:
violates PodSecurity "baseline:latest": allowPrivilegeEscalation != false
(container "app" must set securityContext.allowPrivilegeEscalation=false)
```

The error message indicates exactly which requirement failed. Fix the pod specification to comply with the profile requirements.

## Exempt namespaces from PSS

Exempt specific namespaces from pod security enforcement:

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
      - monitoring
```

This cluster-level configuration exempts kube-system and monitoring namespaces from PSS checks. Use exemptions sparingly for system components that legitimately need privileged access.

## Monitoring PSS violations

Track violations through audit logs:

```bash
# View PSS audit events
kubectl get events -A --field-selector reason=PodSecurityViolation

# Check namespace labels
kubectl get namespaces -L pod-security.kubernetes.io/enforce

# View detailed pod security info
kubectl describe pod problematic-pod -n namespace
```

Set up monitoring alerts for PSS violations:

```yaml
# PrometheusRule for PSS violations
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: pod-security-alerts
spec:
  groups:
  - name: pod-security
    rules:
    - alert: PodSecurityViolation
      expr: |
        rate(apiserver_admission_webhook_rejection_count{
          name="pod-security.kubernetes.io"
        }[5m]) > 0
      annotations:
        summary: "Pod Security Standard violations detected"
```

## Migrating to Restricted profile

Gradually migrate workloads from baseline to restricted:

1. Set audit and warn to restricted while enforcing baseline
2. Collect violations from audit logs over several days
3. Fix pod specs to comply with restricted profile
4. Switch enforcement to restricted

```yaml
# Phase 1: Collect data
apiVersion: v1
kind: Namespace
metadata:
  name: apps
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

After fixing violations:

```yaml
# Phase 2: Enforce restricted
apiVersion: v1
kind: Namespace
metadata:
  name: apps
  labels:
    pod-security.kubernetes.io/enforce: restricted
```

## Creating deployment templates

Provide templates that comply with restricted profile:

```yaml
# templates/secure-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-template
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: app
        image: app:latest
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /var/cache/app
      volumes:
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir: {}
```

Teams can copy and modify this template knowing it passes restricted checks.

## Best practices for namespace-level PSS

Start with baseline enforcement in production and restricted in audit mode. This provides immediate security benefits while you work toward full restricted compliance.

Use restricted profile for namespaces handling sensitive data or exposed to untrusted inputs. The additional restrictions significantly reduce attack surface.

Document why specific namespaces use privileged profile. Regularly review these exemptions to ensure they remain necessary.

Create namespace provisioning automation that applies appropriate PSS labels by default. Don't rely on manual configuration.

Monitor PSS violations continuously and treat them as security incidents requiring investigation.

## Conclusion

Pod Security Standards provide a straightforward way to enforce security policies at the namespace level. By applying appropriate labels to namespaces, you ensure all pods meet minimum security requirements without complex policy management.

The three-profile model (Privileged, Baseline, Restricted) covers most use cases, from system components needing full access to security-sensitive applications requiring maximum restrictions. Using audit and warn modes alongside enforcement enables gradual security hardening without breaking existing workloads. This approach makes Kubernetes security accessible and maintainable for teams of all sizes.
