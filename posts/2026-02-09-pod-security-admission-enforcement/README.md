# How to use Pod Security Admission controller for policy enforcement

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Pod Security, Admission Control, Policy Enforcement

Description: Learn how to implement and configure the Pod Security Admission controller in Kubernetes to enforce security policies across namespaces with baseline, privileged, and restricted standards.

---

The Pod Security Admission controller replaced PodSecurityPolicy in Kubernetes 1.25, providing a simpler and more maintainable way to enforce security policies. Instead of complex policy objects, it uses three predefined security standards that cover most use cases while remaining easy to understand and implement.

## Understanding Pod Security Standards

Kubernetes defines three security standards that represent different security postures. The privileged standard is completely unrestricted, the baseline standard prevents known privilege escalations while remaining functional for most workloads, and the restricted standard implements security best practices with defense in depth.

These standards are not custom resources or configuration files. They are built into Kubernetes itself and maintained by the community. This built-in nature means they evolve with security best practices and require no additional installation.

## Configuring Pod Security at the Namespace Level

You apply Pod Security standards using namespace labels. Each namespace can enforce, audit, and warn about different standards:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production-apps
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

The enforce mode blocks pods that violate the policy. The audit mode logs violations to the audit log without blocking. The warn mode returns warnings to users without blocking. You can use different standards for each mode.

## Gradual Policy Adoption Strategy

Rolling out security policies across an existing cluster requires careful planning. Start with audit and warn modes to understand violations without breaking applications:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: legacy-apps
  labels:
    # Don't block anything yet
    pod-security.kubernetes.io/enforce: privileged
    # But audit violations of restricted standard
    pod-security.kubernetes.io/audit: restricted
    # And warn users about baseline violations
    pod-security.kubernetes.io/warn: baseline
```

This configuration lets all pods run while collecting information about security violations. You can analyze audit logs to understand what changes applications need before enforcing stricter standards.

## Baseline Standard Requirements

The baseline standard prevents known privilege escalations while allowing most common container configurations:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: baseline-namespace
  labels:
    pod-security.kubernetes.io/enforce: baseline
---
apiVersion: v1
kind: Pod
metadata:
  name: baseline-compliant
  namespace: baseline-namespace
spec:
  containers:
  - name: app
    image: nginx:1.21
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
      runAsNonRoot: true
      runAsUser: 1000
```

Baseline standard blocks privileged containers, host namespace sharing, and dangerous capabilities. It requires `allowPrivilegeEscalation: false` but allows running as root and writable root filesystems.

## Restricted Standard Requirements

The restricted standard implements defense in depth with multiple security layers:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: restricted-namespace
  labels:
    pod-security.kubernetes.io/enforce: restricted
---
apiVersion: v1
kind: Pod
metadata:
  name: restricted-compliant
  namespace: restricted-namespace
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 2000
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: app
    image: myapp:1.0
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      runAsNonRoot: true
      capabilities:
        drop:
        - ALL
    volumeMounts:
    - name: tmp
      mountPath: /tmp
  volumes:
  - name: tmp
    emptyDir: {}
```

Restricted standard requires everything from baseline plus running as non-root, read-only root filesystem, dropping all capabilities, and seccomp profile. This provides maximum security but requires careful application design.

## Version-Specific Policy Enforcement

Pod Security standards evolve across Kubernetes versions. You can pin policies to specific versions:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: version-pinned
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: v1.28
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: latest
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest
```

Pinning enforcement to a specific version prevents policy changes from breaking applications when you upgrade Kubernetes. Using latest for audit and warn helps you prepare for future policy changes.

## Exempting Specific Pods and Users

Sometimes you need to exempt certain workloads from policy enforcement. Configure exemptions in the admission controller configuration:

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
      usernames:
      - system:serviceaccount:kube-system:replicaset-controller
      runtimeClasses:
      - kata-containers
      namespaces:
      - kube-system
      - monitoring
```

This configuration exempts the kube-system namespace, specific service accounts, and pods using the kata-containers runtime class. Use exemptions sparingly and document the security implications.

## Cluster-Wide Default Policies

Set cluster-wide defaults that apply to namespaces without explicit labels:

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
      enforce-version: latest
      audit: restricted
      audit-version: latest
      warn: restricted
      warn-version: latest
```

These defaults ensure that even newly created namespaces without labels get security policies. You can override defaults by adding labels to specific namespaces.

## Monitoring Policy Violations

Track policy violations through audit logs and warnings. Configure your logging infrastructure to alert on violations:

```bash
# View admission webhook decisions in audit log
kubectl get events --all-namespaces | grep "PodSecurity"

# Check for warning messages in kubectl output
kubectl apply -f pod.yaml
# Warning: would violate PodSecurity "restricted:latest"...
```

Set up dashboards that show violation trends across namespaces. Increasing violations might indicate policy drift or new insecure deployments.

## Transitioning from PodSecurityPolicy

If you are migrating from PodSecurityPolicy, map your existing policies to Pod Security standards:

```yaml
# Old PodSecurityPolicy (deprecated)
apiVersion: policy/v1beta1
kind: PodSecurityPolicy
metadata:
  name: restricted
spec:
  privileged: false
  allowPrivilegeEscalation: false
  requiredDropCapabilities:
  - ALL
  runAsUser:
    rule: MustRunAsNonRoot
  seLinux:
    rule: RunAsAny
  fsGroup:
    rule: RunAsAny

# New approach with Pod Security Admission
apiVersion: v1
kind: Namespace
metadata:
  name: my-namespace
  labels:
    pod-security.kubernetes.io/enforce: restricted
```

Pod Security Admission is simpler because it does not require RBAC bindings between policies and service accounts. The namespace label applies to all pods in the namespace.

## Testing Policy Configurations

Before enforcing policies in production, test thoroughly:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: policy-test
  labels:
    # Start with audit-only
    pod-security.kubernetes.io/enforce: privileged
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

Deploy test workloads and review warnings and audit logs. Fix violations in your pod specifications, then increase enforcement level:

```bash
# Check for violations
kubectl run test --image=nginx --namespace=policy-test

# Review warnings in output
kubectl get pods -n policy-test

# Check audit logs for violations
kubectl logs -n kube-system -l component=kube-apiserver | grep PodSecurity
```

## Handling Special Workload Types

Some workload types need special consideration. DaemonSets that access host resources might need exemptions or separate namespaces:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: system-daemons
  labels:
    # More permissive for infrastructure pods
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/audit: baseline
    pod-security.kubernetes.io/warn: restricted
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-monitor
  namespace: system-daemons
spec:
  selector:
    matchLabels:
      app: node-monitor
  template:
    metadata:
      labels:
        app: node-monitor
    spec:
      hostNetwork: true  # Allowed by baseline
      hostPID: true      # Allowed by baseline
      containers:
      - name: monitor
        image: monitoring-agent:1.0
        securityContext:
          allowPrivilegeEscalation: false
```

Separate infrastructure workloads that need elevated privileges from application workloads that should run with restricted policies.

## Documentation and Communication

Document your policy decisions and communicate them to development teams:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-alpha
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
  annotations:
    policy-documentation: "https://wiki.company.com/pod-security-restricted"
    policy-contact: "security-team@company.com"
    policy-enforcement-date: "2026-03-01"
```

Provide examples of compliant pod specifications and tools to help developers test their manifests before deployment.

## Conclusion

Pod Security Admission provides a straightforward way to enforce security policies across your Kubernetes cluster. By using built-in standards and namespace labels, you can quickly implement security controls without complex custom resources. Start with audit and warn modes to understand your cluster's security posture, fix violations in applications, then enforce stricter standards gradually. The three-tier standard system covers most security requirements while remaining simple enough for teams to understand and implement. Make Pod Security Admission part of your cluster setup from day one, using restricted standard as the default and requiring explicit justification for any exceptions.
