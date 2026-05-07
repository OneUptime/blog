# How to Configure Pod Security Admission in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Pod Security, Security, Permission, RBAC

Description: A practical guide to configuring Pod Security Admission (PSA) in Rancher to enforce security standards for pod workloads.

Pod Security Admission (PSA) is the built-in replacement for Pod Security Policies (PSP), which were removed in Kubernetes 1.25. PSA enforces the Pod Security Standards at the namespace level, controlling what security contexts and capabilities pods can use. In Rancher, you can manage PSA with namespace labels and, in Rancher v2.7.2+, cluster-level PSA configuration templates. This guide walks through setting up PSA effectively.

## Prerequisites

- Rancher v2.7.2+ managing Kubernetes 1.25+ clusters
- Administrator or cluster owner access
- Understanding of the three Pod Security Standards: Privileged, Baseline, and Restricted

## Understanding Pod Security Standards

Kubernetes defines three security levels:

- **Privileged**: Unrestricted. Allows all pod configurations. Use only for system-level workloads.
- **Baseline**: Prevents known privilege escalations. Allows most standard workloads. A good starting point.
- **Restricted**: Most restrictive. Enforces current pod hardening best practices. Ideal for untrusted workloads.

Each level can be applied in three modes:

- **enforce**: Violations prevent pods from being created.
- **audit**: Violations are logged but pods are still created.
- **warn**: Violations generate warnings but pods are still created.

## Step 1: Check Current PSA Configuration

Verify your Kubernetes version and check whether namespaces already have PSA labels:

```bash
# Check the Kubernetes version (PSA is stable in 1.25+)
kubectl version

# Check namespace labels for existing PSA configuration
kubectl get namespaces \
  -L pod-security.kubernetes.io/enforce \
  -L pod-security.kubernetes.io/audit \
  -L pod-security.kubernetes.io/warn
```

## Step 2: Configure PSA at the Namespace Level

Apply Pod Security Standards to namespaces using labels:

```bash
# Apply Baseline enforcement to a namespace
kubectl label namespace production \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/enforce-version=latest \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted

# Apply Restricted enforcement to a sensitive namespace
kubectl label namespace sensitive-data \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=latest \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted
```

This configuration enforces baseline security, audits against restricted standards, and warns about restricted violations.

## Step 3: Configure PSA Through Rancher UI

Rancher lets you edit namespace PSA labels through the UI:

1. Navigate to your cluster in Rancher.
2. Go to **Cluster > Projects/Namespaces**.
3. Find the namespace you want to configure and click **Edit Config**.
4. Under **Labels**, add the PSA labels:

```plaintext
pod-security.kubernetes.io/enforce = baseline
pod-security.kubernetes.io/enforce-version = latest
pod-security.kubernetes.io/audit = restricted
pod-security.kubernetes.io/warn = restricted
```

5. Click **Save**.

## Step 4: Configure PSA at the Cluster Level

To set a default PSA level for the entire cluster, use Rancher's cluster-level PSA configuration:

In Rancher v2.7.2+, the supported cluster-level workflow is to assign a Pod Security Admission configuration template. Rancher includes built-in templates such as `rancher-privileged` and `rancher-restricted`, and you can create custom templates when you need different defaults or exemptions.

1. Go to the cluster's settings in Rancher.
2. Create or edit the PSA template under **Cluster Management > Advanced > Pod Security Admissions**.
3. Edit the cluster configuration and assign the template under **Pod Security Admission Configuration Template**.

For RKE2 clusters managed by Rancher, the cluster YAML includes the template name like this:

```yaml
spec:
  defaultPodSecurityAdmissionConfigurationTemplateName: rancher-restricted
```

## Step 5: Set Up PSA for Rancher Projects

Apply PSA labels to all namespaces in a Rancher project consistently:

```bash
#!/bin/bash
# apply-psa-to-project.sh

CLUSTER_ID="c-m-xxxxx"
PROJECT_ID="p-xxxxx"
PSA_LEVEL="baseline"

# Get all namespaces in the project
NAMESPACES=$(kubectl get namespaces -o json | \
  jq -r ".items[] | select(.metadata.annotations[\"field.cattle.io/projectId\"] == \"$CLUSTER_ID:$PROJECT_ID\") | .metadata.name")

for ns in $NAMESPACES; do
  echo "Applying PSA labels to namespace: $ns"
  kubectl label namespace $ns \
    pod-security.kubernetes.io/enforce=$PSA_LEVEL \
    pod-security.kubernetes.io/enforce-version=latest \
    pod-security.kubernetes.io/audit=restricted \
    pod-security.kubernetes.io/warn=restricted \
    --overwrite
done
```

## Step 6: Test PSA Enforcement

Test that PSA is working by trying to create a pod that violates the policy:

**Test against Baseline enforcement:**

```yaml
# This pod should be rejected under baseline enforcement
apiVersion: v1
kind: Pod
metadata:
  name: test-privileged
  namespace: production
spec:
  containers:
    - name: test
      image: nginx
      securityContext:
        privileged: true
```

```bash
kubectl apply -f test-privileged.yaml
# Expected: Error - pod violates the baseline Pod Security Standard
```

**Test a compliant pod:**

```yaml
# This pod should be accepted under baseline enforcement
apiVersion: v1
kind: Pod
metadata:
  name: test-compliant
  namespace: production
spec:
  containers:
    - name: test
      image: busybox:1.36
      command: ["sh", "-c", "sleep 3600"]
      securityContext:
        allowPrivilegeEscalation: false
        runAsNonRoot: true
        runAsUser: 1000
        seccompProfile:
          type: RuntimeDefault
        capabilities:
          drop:
            - ALL
```

```bash
kubectl apply -f test-compliant.yaml
# Expected: Pod created successfully
```

## Step 7: Exempt System Namespaces

Rancher and Kubernetes system namespaces need exemptions when you use a restrictive cluster-wide PSA template. Add them to the template's `exemptions.namespaces` list instead of relying only on namespace labels.

The exact list depends on which Rancher features and add-ons are installed. Rancher's sample restricted configuration includes namespaces such as `kube-system`, `kube-public`, `kube-node-lease`, `cattle-system`, `cattle-fleet-system`, `cattle-impersonation-system`, `fleet-default`, `fleet-local`, `cert-manager`, `cis-operator-system`, `compliance-operator-system`, `longhorn-system`, and `tigera-operator`.

## Step 8: Roll Out PSA Gradually

Use a phased approach to avoid disrupting existing workloads:

**Phase 1 - Warn and audit only:**

```bash
kubectl label namespace production \
  pod-security.kubernetes.io/audit=baseline \
  pod-security.kubernetes.io/warn=baseline
```

Review warnings and preview enforcement:

```bash
# Create a test workload and review the warning returned by kubectl
kubectl apply -f test-privileged.yaml

# Preview the impact of enforcing baseline without changing the namespace yet
kubectl label --dry-run=server --overwrite namespace production \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/enforce-version=latest
```

**Phase 2 - Warn and audit with restricted, enforce baseline:**

```bash
kubectl label namespace production \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/warn=restricted \
  --overwrite
```

**Phase 3 - Enforce restricted:**

```bash
kubectl label namespace production \
  pod-security.kubernetes.io/enforce=restricted \
  --overwrite
```

## Step 9: Monitor PSA Violations

Set up monitoring for PSA violations:

```bash
# On RKE2 clusters with API audit logging enabled, look for PSA audit annotations
grep 'pod-security.kubernetes.io/audit-violations' /var/lib/rancher/rke2/server/logs/audit.log
```

## Step 10: Document Exemption Procedures

Create a process for handling workloads that need elevated privileges:

1. The team submits a request explaining why elevated privileges are needed.
2. The platform team reviews the request and the pod's security context.
3. If approved, the workload is placed in a namespace with appropriate PSA labels.
4. The exemption is documented and reviewed periodically.

```yaml
# Create a dedicated namespace for privileged workloads
apiVersion: v1
kind: Namespace
metadata:
  name: privileged-workloads
  labels:
    pod-security.kubernetes.io/enforce: privileged
    pod-security.kubernetes.io/audit: baseline
    pod-security.kubernetes.io/warn: baseline
  annotations:
    field.cattle.io/projectId: "c-m-xxxxx:p-xxxxx"
    psa-exemption-reason: "Contains system monitoring agents requiring host access"
    psa-exemption-approved-by: "platform-team"
    psa-exemption-review-date: "2026-06-19"
```

## Best Practices

- **Start with warn and audit**: Begin by auditing and warning in restricted or baseline mode to identify violations before enforcing anything.
- **Exempt system namespaces**: Always exempt the Rancher and cluster add-on namespaces required by your environment.
- **Use baseline as the minimum**: Enforce at least the baseline standard for all user-facing namespaces.
- **Target restricted for production**: Work toward restricted enforcement for production workloads.
- **Phase the rollout**: Move gradually from audit to warn to enforce.
- **Document exemptions**: Maintain records of any namespace that runs with relaxed security standards.
- **Apply consistently**: Use scripts or automation to apply PSA labels consistently across all namespaces in a project.

## Conclusion

Pod Security Admission in Rancher lets you enforce pod security standards with namespace labels and cluster-level PSA templates. By configuring PSA at the namespace and cluster level, exempting required system namespaces, and rolling out enforcement gradually, you can harden your workloads without disrupting existing applications. Start with warn and audit, fix violations, and progressively tighten enforcement to reach the restricted standard for production workloads.
