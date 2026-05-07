# How to Configure Pod Security Standards in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Security, Pod Security

Description: Learn how to configure Pod Security Standards in Rancher to enforce security baselines for pods using the built-in admission controller.

Pod Security Standards (PSS), enforced through the Pod Security Admission (PSA) controller, replace Pod Security Policies in Kubernetes 1.25+. They provide three predefined security levels enforced through the built-in admission controller. Rancher-managed clusters can use standard namespace labels, and Rancher provides cluster-level PSA configuration templates and defaults. This guide covers setting up PSS in your Rancher-managed clusters.

## Prerequisites

- Rancher v2.7.2 or later
- Kubernetes 1.23+ clusters (PSA is enabled by default in 1.23+ and stable in 1.25+)
- Admin access to Rancher
- kubectl access to the cluster

## Step 1: Understand Pod Security Standards Levels

PSS defines three security levels:

**Privileged**: Unrestricted policy. Allows all pod configurations. Use only for system-level workloads that truly need elevated access.

**Baseline**: Minimally restrictive policy. Prevents known privilege escalations while remaining compatible with most workloads. Blocks hostNetwork, hostPID, hostIPC, privileged containers, and HostPath volumes.

**Restricted**: Heavily restricted policy. Follows security best practices. Requires running as non-root, disallows privilege escalation, requires an approved seccomp profile, and requires dropping all capabilities.

Each level can be applied in three modes:

- **enforce**: Reject pods that violate the policy.
- **audit**: Log violations but allow the pod.
- **warn**: Display a warning to the user but allow the pod.

## Step 2: Configure PSS at the Namespace Level

Apply PSS to a namespace using labels:

```bash
kubectl label namespace production \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
```

For a less restrictive namespace:

```bash
kubectl label namespace staging \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
```

This enforces baseline but warns on restricted violations, helping you prepare for tighter security.

## Step 3: Configure PSS via Rancher UI

1. In the upper left corner, click **☰** > **Cluster Management**.
2. To create or edit a PSA template, go to **Advanced** > **Pod Security Admissions**.
3. Create a new template or edit an existing one, then configure the defaults and exemptions you want.
4. Save the template.
5. Assign the template to a downstream cluster during cluster creation under **Basics** > **Security**, or update an existing cluster with **⋮** > **Edit Config** and select the **Pod Security Admission Configuration Template**.

## Step 4: Set Cluster-Wide Defaults

Configure default PSS for namespaces that do not set Pod Security labels by setting up an AdmissionConfiguration. Use `pod-security.admission.config.k8s.io/v1` on Kubernetes 1.25+; for Kubernetes 1.23 and 1.24, use `v1beta1` instead. Create the configuration file:

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
    exemptions:
      usernames: []
      runtimeClasses: []
      namespaces:
      - kube-system
      - cattle-system
      - cattle-fleet-system
      - cattle-impersonation-system
      - cis-operator-system
      - cattle-resources-system
```

For RKE2 clusters, place this file on the server node:

```bash
mkdir -p /etc/rancher/rke2/
cat > /etc/rancher/rke2/rancher-pss.yaml << 'EOF'
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
    exemptions:
      usernames: []
      runtimeClasses: []
      namespaces:
      - kube-system
      - cattle-system
      - cattle-fleet-system
EOF
```

Reference it in the RKE2 config:

```yaml
# /etc/rancher/rke2/config.yaml

pod-security-admission-config-file: /etc/rancher/rke2/rancher-pss.yaml
```

## Step 5: Exempt System Namespaces

System namespaces often need a less restrictive policy. Exempt them in the cluster-wide configuration (as shown above), or set their namespace labels to `privileged` for all modes. The exact list depends on the Rancher components installed:

```bash
kubectl label --overwrite namespace kube-system \
  pod-security.kubernetes.io/enforce=privileged \
  pod-security.kubernetes.io/audit=privileged \
  pod-security.kubernetes.io/warn=privileged

kubectl label --overwrite namespace cattle-system \
  pod-security.kubernetes.io/enforce=privileged \
  pod-security.kubernetes.io/audit=privileged \
  pod-security.kubernetes.io/warn=privileged

kubectl label --overwrite namespace cattle-fleet-system \
  pod-security.kubernetes.io/enforce=privileged \
  pod-security.kubernetes.io/audit=privileged \
  pod-security.kubernetes.io/warn=privileged
```

## Step 6: Test PSS Enforcement

Deploy a pod that violates the restricted policy:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-violation
  namespace: production
spec:
  containers:
  - name: test
    image: nginx
    securityContext:
      privileged: true
```

```bash
kubectl apply -f test-violation.yaml
```

Expected result when enforce is set to restricted:

```plaintext
Error from server (Forbidden): error when creating "test-violation.yaml":
pods "test-violation" is forbidden: violates PodSecurity "restricted:latest": ...
```

Deploy a compliant pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-compliant
  namespace: production
spec:
  securityContext:
    runAsNonRoot: true
    seccompProfile:
      type: RuntimeDefault
  containers:
  - name: test
    image: busybox:1.36
    command: ["sh", "-c", "sleep 3600"]
    securityContext:
      runAsUser: 1000
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
```

## Step 7: Gradual Rollout Strategy

Roll out PSS gradually to avoid breaking existing workloads:

1. **Phase 1 - Audit Only**: Apply restricted in audit mode to all namespaces:

```bash
kubectl label --overwrite namespace --all \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
```

2. **Phase 2 - Preview Enforcement**: Use server-side dry run to see which existing pods would violate the target policy:

```bash
kubectl label --dry-run=server --overwrite namespace --all \
  pod-security.kubernetes.io/enforce=restricted
```

3. **Phase 3 - Fix Workloads**: Update workload manifests to comply with the target level.

4. **Phase 4 - Enforce**: Switch from audit to enforce mode:

```bash
kubectl label namespace production \
  pod-security.kubernetes.io/enforce=restricted \
  --overwrite
```

## Step 8: Monitor PSS Violations

Set up monitoring for Pod Security Admission violations:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: pss-alerts
  namespace: cattle-monitoring-system
spec:
  groups:
  - name: pod-security
    rules:
    - alert: PodSecurityViolation
      expr: |
        increase(pod_security_evaluations_total{
          decision="deny",
          mode=~"audit|enforce"
        }[5m]) > 0
      labels:
        severity: warning
      annotations:
        summary: "Pod Security Standard violations detected"
```

## Conclusion

Pod Security Standards provide a straightforward way to enforce security baselines across your Rancher-managed clusters. By using namespace labels with enforce, audit, and warn modes, you can gradually roll out security restrictions without disrupting existing workloads. Start with audit mode, fix violations, and progressively move to enforcement for a smooth transition.
