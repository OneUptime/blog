# How to Implement AKS Pod Security Admission Controller to Enforce Restricted Security Context

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AKS, Kubernetes, Pod Security, Security Context, Azure, Container Security, Admission Controller

Description: Learn how to implement the Pod Security Admission controller on AKS to enforce restricted security contexts and harden your cluster workloads.

---

Running workloads on AKS without enforcing security standards is a recipe for trouble. A single container running as root or with elevated privileges can become a gateway for attackers to compromise the entire node - or worse, the whole cluster. Kubernetes introduced the Pod Security Admission (PSA) controller as a built-in replacement for the deprecated PodSecurityPolicy, and it is the recommended way to enforce security standards on AKS today.

In this guide, we will walk through configuring the PSA controller on AKS, applying the restricted security profile, and handling the practical challenges that come up when you start enforcing these policies on real workloads.

## Understanding Pod Security Standards

Kubernetes defines three security profiles that the PSA controller can enforce:

- **Privileged**: No restrictions at all. This is essentially the default behavior.
- **Baseline**: Prevents known privilege escalations. Blocks things like hostNetwork, hostPID, and privileged containers, but still allows running as root.
- **Restricted**: The most locked-down profile. Requires containers to run as non-root, drop all capabilities, use a read-only root filesystem concept, and set a restrictive seccomp profile.

Each profile can be applied in three modes:

- **enforce**: Rejects pods that violate the policy.
- **audit**: Allows pods but logs violations in the audit log.
- **warn**: Allows pods but returns a warning to the user.

## Checking Your AKS Version

The PSA controller is available in Kubernetes 1.25 and later, which means any recent AKS cluster supports it natively. You can verify your cluster version with this command.

```bash
# Check the current Kubernetes version of your AKS cluster
az aks show --resource-group myResourceGroup --name myAKSCluster --query kubernetesVersion -o tsv
```

If you are running 1.25 or newer, the PSA controller is already enabled and active. There is no add-on to install or feature flag to flip.

## Applying Restricted Profile to a Namespace

The PSA controller is configured through namespace labels. This is the key concept - you do not configure it cluster-wide through a single config file. Instead, you label each namespace with the desired security profile and mode.

Here is how to create a namespace with the restricted profile enforced.

```yaml
# restricted-namespace.yaml
# This namespace enforces the restricted Pod Security Standard
# Pods that do not meet the restricted criteria will be rejected
apiVersion: v1
kind: Namespace
metadata:
  name: production-apps
  labels:
    # Enforce the restricted profile - non-compliant pods are rejected
    pod-security.kubernetes.io/enforce: restricted
    # Set the version to lock behavior to a specific Kubernetes version
    pod-security.kubernetes.io/enforce-version: v1.28
    # Audit mode logs violations without blocking
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: v1.28
    # Warn mode returns warnings to kubectl users
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: v1.28
```

Apply this with kubectl.

```bash
# Create the namespace with security labels
kubectl apply -f restricted-namespace.yaml
```

The version pinning is important. Without it, the behavior changes every time you upgrade Kubernetes, which can break workloads unexpectedly. Pin it to a specific version and update it deliberately as part of your upgrade process.

## What the Restricted Profile Actually Requires

Before you start enforcing the restricted profile, you need to understand what it demands from your pods. Here is what every container in the pod must satisfy.

The pod spec must not set `hostNetwork`, `hostPID`, or `hostIPC` to true. Containers must run as non-root by setting `runAsNonRoot: true`. The `seccompProfile` must be set to `RuntimeDefault` or `Localhost`. Containers must drop `ALL` capabilities and may only add back `NET_BIND_SERVICE`. The `allowPrivilegeEscalation` field must be set to `false`. Volume types are restricted to configMap, emptyDir, projected, secret, downwardAPI, persistentVolumeClaim, and ephemeral.

Here is a pod spec that fully complies with the restricted profile.

```yaml
# compliant-pod.yaml
# A pod spec that passes the restricted Pod Security Standard
apiVersion: v1
kind: Pod
metadata:
  name: compliant-app
  namespace: production-apps
spec:
  # Set the security context at the pod level
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 1000
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: app
      image: myregistry.azurecr.io/myapp:v1.2.3
      # Container-level security context
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop:
            - ALL
      resources:
        requests:
          memory: "128Mi"
          cpu: "100m"
        limits:
          memory: "256Mi"
          cpu: "500m"
      volumeMounts:
        - name: tmp
          mountPath: /tmp
  volumes:
    # Use emptyDir for writable directories since root fs is read-only
    - name: tmp
      emptyDir: {}
```

## Gradually Rolling Out Enforcement

Jumping straight to enforcement on existing namespaces is risky. A better approach is to start with warn and audit modes first, fix any violations you find, and then switch to enforce.

Here is a practical rollout strategy.

```bash
# Step 1: Start with warn and audit only
kubectl label namespace production-apps \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/warn-version=v1.28 \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/audit-version=v1.28

# Step 2: Check audit logs for violations
# On AKS, audit logs go to Azure Monitor if diagnostic settings are configured
az monitor diagnostic-settings create \
  --resource "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.ContainerService/managedClusters/myAKS" \
  --name "aks-audit-logs" \
  --workspace "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.OperationalInsights/workspaces/myWorkspace" \
  --logs '[{"category": "kube-audit-admin", "enabled": true}]'

# Step 3: Query for PSA violations in Log Analytics
# Use this KQL query in Azure Monitor
# AzureDiagnostics
# | where Category == "kube-audit-admin"
# | where log_s contains "pod-security.kubernetes.io"
# | project TimeGenerated, log_s

# Step 4: After fixing all violations, switch to enforce
kubectl label namespace production-apps \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=v1.28 \
  --overwrite
```

## Handling Common Violations on AKS

When you start enforcing the restricted profile, certain AKS-specific workloads will fail. Here are the most common issues and how to deal with them.

**System namespaces**: Never apply the restricted profile to `kube-system`, `gatekeeper-system`, or other AKS-managed namespaces. These run privileged system components that need elevated permissions by design. The PSA controller already exempts `kube-system` by default.

**Ingress controllers**: NGINX ingress and other controllers often need `NET_BIND_SERVICE` to bind to ports 80 and 443. The restricted profile allows this specific capability, so most ingress controllers work fine as long as you configure them to run as non-root.

```yaml
# ingress-values.yaml
# Helm values for nginx-ingress that comply with restricted profile
controller:
  containerSecurityContext:
    allowPrivilegeEscalation: false
    runAsNonRoot: true
    runAsUser: 101
    capabilities:
      drop:
        - ALL
      add:
        - NET_BIND_SERVICE
    seccompProfile:
      type: RuntimeDefault
  podSecurityContext:
    fsGroup: 101
```

**Monitoring agents**: Tools like Prometheus node-exporter need hostNetwork or hostPID access. Run these in a dedicated namespace with a baseline or privileged profile. Do not try to force them into the restricted profile.

## Exempting Specific Users or Namespaces

Sometimes you need exemptions. The PSA controller supports exemptions through an AdmissionConfiguration file, but on AKS you cannot directly modify the API server configuration. Instead, use namespace-level labels to set different profiles per namespace.

```bash
# Monitoring namespace gets baseline instead of restricted
kubectl label namespace monitoring \
  pod-security.kubernetes.io/enforce=baseline \
  pod-security.kubernetes.io/enforce-version=v1.28 \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/warn-version=v1.28

# This way, monitoring tools run under baseline enforcement
# but you still get warnings about restricted violations
```

## Automating Label Application with Azure Policy

To make sure new namespaces automatically get the right labels, use Azure Policy for AKS.

```bash
# Assign a built-in Azure Policy that enforces pod security standards
az policy assignment create \
  --name 'enforce-psa-restricted' \
  --display-name 'Enforce restricted PSA on app namespaces' \
  --scope "/subscriptions/<sub-id>/resourceGroups/myRG/providers/Microsoft.ContainerService/managedClusters/myAKS" \
  --policy "/providers/Microsoft.Authorization/policyDefinitions/95edb821-ddaf-4404-9732-666045e056b4" \
  --params '{"effect": {"value": "Deny"}, "excludedNamespaces": {"value": ["kube-system", "gatekeeper-system", "azure-arc"]}}'
```

## Testing Your Security Context

Before deploying to a namespace with enforcement, you can dry-run your deployments to see if they would be accepted.

```bash
# Dry-run to test if a pod would be accepted
kubectl apply -f compliant-pod.yaml --dry-run=server

# If there are violations, you will see a clear error message like:
# Error: pods "my-pod" is forbidden: violates PodSecurity "restricted:v1.28":
# allowPrivilegeEscalation != false, unrestricted capabilities, ...
```

## Monitoring Compliance Over Time

Set up a recurring check to ensure namespaces maintain their security labels and that no one has quietly removed them.

```bash
# List all namespaces and their PSA labels
kubectl get namespaces -o json | jq -r '
  .items[] |
  select(.metadata.labels["pod-security.kubernetes.io/enforce"] != null) |
  "\(.metadata.name): \(.metadata.labels["pod-security.kubernetes.io/enforce"])"
'
```

## Wrapping Up

The Pod Security Admission controller is a straightforward, built-in mechanism to enforce security standards on AKS without installing third-party tools. Start with warn and audit modes to understand your current security posture, fix violations iteratively, and then move to enforcement. The restricted profile is strict, but it represents genuine security best practices - running containers as non-root with minimal capabilities significantly reduces the blast radius of any compromise. Pin your version labels, exempt system namespaces appropriately, and use Azure Policy to keep things consistent as your cluster grows.
