# How to Migrate from Deprecated PodSecurityPolicy to Pod Security Admission

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Migration

Description: Learn how to migrate from deprecated PodSecurityPolicy to Pod Security Admission with minimal disruption to existing workloads and security posture.

---

PodSecurityPolicy (PSP) was removed in Kubernetes 1.25 after a long deprecation period. Pod Security Admission (PSA) replaces it with a simpler, more maintainable approach to pod security enforcement. Migrating from PSP to PSA requires careful planning to maintain your security posture while avoiding disruptions.

## Understanding the Differences

PodSecurityPolicy used custom policy resources bound to service accounts through RBAC. This approach provided fine-grained control but created significant operational complexity. Common problems included difficult troubleshooting, unclear policy precedence, and accidental security gaps from misconfigured RBAC bindings.

Pod Security Admission uses namespace labels to apply one of three built-in profiles (privileged, baseline, restricted). This simpler model trades fine-grained control for operational simplicity and clarity. Most organizations find the three standard profiles sufficient for their security needs.

## Assessment Phase

First, understand your current PSP usage:

```bash
# List all PodSecurityPolicies
kubectl get psp

# Check which PSPs are actually used
kubectl get psp -o yaml | grep -A 5 "^metadata:"

# Find which service accounts use each PSP
kubectl get rolebindings,clusterrolebindings --all-namespaces -o json | \
  jq -r '.items[] | select(.roleRef.kind=="ClusterRole") |
  select(.roleRef.name | contains("psp")) |
  {namespace:.metadata.namespace, name:.metadata.name, subjects:.subjects}'
```

Create an inventory of your policies:

```bash
#!/bin/bash
# inventory-psps.sh

echo "PodSecurityPolicy Inventory"
echo "============================"

for psp in $(kubectl get psp -o name); do
  psp_name=$(echo $psp | cut -d'/' -f2)
  echo ""
  echo "Policy: $psp_name"

  # Check privileged settings
  privileged=$(kubectl get psp $psp_name -o jsonpath='{.spec.privileged}')
  echo "  Privileged: $privileged"

  # Check volume types
  volumes=$(kubectl get psp $psp_name -o jsonpath='{.spec.volumes[*]}')
  echo "  Allowed volumes: $volumes"

  # Check host settings
  hostNetwork=$(kubectl get psp $psp_name -o jsonpath='{.spec.hostNetwork}')
  hostPID=$(kubectl get psp $psp_name -o jsonpath='{.spec.hostPID}')
  hostIPC=$(kubectl get psp $psp_name -o jsonpath='{.spec.hostIPC}')
  echo "  Host access: network=$hostNetwork, pid=$hostPID, ipc=$hostIPC"

  # Check runAsUser settings
  runAsUser=$(kubectl get psp $psp_name -o jsonpath='{.spec.runAsUser.rule}')
  echo "  RunAsUser: $runAsUser"

  # Find which service accounts are bound
  bindings=$(kubectl get clusterrolebindings -o json | \
    jq -r ".items[] | select(.roleRef.name==\"$psp_name\" or .roleRef.name==\"use-$psp_name\") | .metadata.name")
  echo "  Bound via: $bindings"
done
```

## Mapping PSPs to PSA Profiles

Map each PSP to the equivalent PSA profile:

**Restrictive PSPs map to restricted**: Policies that require runAsNonRoot, drop all capabilities, and enforce read-only root filesystems.

**Moderate PSPs map to baseline**: Policies that block hostNetwork, privileged containers, and host path volumes but allow most configurations.

**Permissive PSPs map to privileged**: Policies used by system components that need unrestricted access.

Create a mapping document:

```yaml
# psp-to-psa-mapping.yaml
mappings:
  # Restrictive policies -> restricted profile
  restricted-psp:
    target_profile: restricted
    namespaces:
      - production
      - critical-services

  # Moderate policies -> baseline profile
  default-psp:
    target_profile: baseline
    namespaces:
      - development
      - staging
      - default

  # Permissive policies -> privileged profile
  privileged-psp:
    target_profile: privileged
    namespaces:
      - kube-system
      - monitoring
```

## Running PSP and PSA Together

During migration, run both systems concurrently in warn/audit mode:

```yaml
# Enable PSA in warn mode for all namespaces
apiVersion: v1
kind: Namespace
metadata:
  name: development
  labels:
    pod-security.kubernetes.io/warn: baseline
    pod-security.kubernetes.io/audit: baseline
    # Don't enforce yet - PSP still active
```

This configuration allows you to see what would happen when PSA enforces without breaking existing workloads.

Monitor warnings:

```bash
# Deploy a test pod and check warnings
kubectl run test --image=nginx -n development

# Check events for PSA warnings
kubectl get events -n development | grep PodSecurity

# Review audit logs
kubectl logs -n kube-system kube-apiserver-xxx | grep pod-security-admission
```

## Automated Migration Tool

Create a script to assist migration:

```bash
#!/bin/bash
# migrate-psp-to-psa.sh

set -e

function map_psp_to_profile() {
  local psp_name=$1

  # Check PSP characteristics
  privileged=$(kubectl get psp $psp_name -o jsonpath='{.spec.privileged}')
  hostNetwork=$(kubectl get psp $psp_name -o jsonpath='{.spec.hostNetwork}')
  runAsUser=$(kubectl get psp $psp_name -o jsonpath='{.spec.runAsUser.rule}')

  # Map to PSA profile
  if [[ "$privileged" == "true" ]] || [[ "$hostNetwork" == "true" ]]; then
    echo "privileged"
  elif [[ "$runAsUser" == "MustRunAsNonRoot" ]]; then
    echo "restricted"
  else
    echo "baseline"
  fi
}

function apply_psa_labels() {
  local namespace=$1
  local profile=$2

  echo "Applying $profile profile to $namespace"

  kubectl label namespace $namespace \
    pod-security.kubernetes.io/warn=$profile \
    pod-security.kubernetes.io/audit=$profile \
    --overwrite

  # Don't enforce yet in migration mode
  if [[ "$ENFORCE" == "true" ]]; then
    kubectl label namespace $namespace \
      pod-security.kubernetes.io/enforce=$profile \
      --overwrite
  fi
}

# Main migration logic
echo "Starting PSP to PSA migration"
echo "============================="

for psp in $(kubectl get psp -o name | cut -d'/' -f2); do
  echo ""
  echo "Processing PSP: $psp"

  # Determine target profile
  profile=$(map_psp_to_profile $psp)
  echo "  Mapped to profile: $profile"

  # Find namespaces using this PSP
  bindings=$(kubectl get clusterrolebindings,rolebindings --all-namespaces -o json | \
    jq -r ".items[] | select(.roleRef.name==\"$psp\" or .roleRef.name==\"use-$psp\") |
    {namespace:.metadata.namespace} | .namespace")

  for ns in $bindings; do
    if [[ "$ns" != "null" ]] && [[ -n "$ns" ]]; then
      apply_psa_labels $ns $profile
    fi
  done
done

echo ""
echo "Migration complete. Review warnings before setting ENFORCE=true"
```

Run in warning mode first:

```bash
# Warn mode - doesn't enforce
ENFORCE=false ./migrate-psp-to-psa.sh

# Review warnings for a week

# Enforce mode - actually enforces
ENFORCE=true ./migrate-psp-to-psa.sh
```

## Handling Edge Cases

Some PSPs have custom configurations that don't map cleanly:

**Custom allowed capabilities**: PSA restricted profile drops all capabilities. If your PSP allows specific capabilities, you may need baseline profile plus documentation for developers.

**Custom volume type restrictions**: PSA doesn't restrict volume types as granularly as PSP. Document acceptable volume types in your security policy.

**Custom seccomp/AppArmor profiles**: PSA restricted requires seccomp but doesn't specify which profile. Use pod annotations for custom profiles.

Create compensating controls:

```yaml
# Deployment template with documented security requirements
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
  annotations:
    security.company.com/required-capabilities: "NET_BIND_SERVICE"
    security.company.com/volume-types: "emptyDir,configMap,secret"
spec:
  template:
    metadata:
      annotations:
        container.apparmor.security.beta.kubernetes.io/app: localhost/custom-profile
    spec:
      securityContext:
        seccompProfile:
          type: Localhost
          localhostProfile: profiles/custom.json
```

## Phased Migration Plan

Phase 1: Enable audit/warn (Week 1-2)

```bash
# Apply PSA labels in audit/warn mode to all namespaces
for ns in $(kubectl get ns -o name | cut -d'/' -f2); do
  # Skip kube-system
  [[ "$ns" =~ ^kube- ]] && continue

  kubectl label namespace $ns \
    pod-security.kubernetes.io/warn=baseline \
    pod-security.kubernetes.io/audit=baseline \
    --overwrite
done
```

Phase 2: Review violations (Week 3)

```bash
# Collect violation reports
kubectl get events --all-namespaces | grep "violates PodSecurity" > violations.txt

# Analyze and remediate top violations
cat violations.txt | awk '{print $5}' | sort | uniq -c | sort -rn
```

Phase 3: Enforce baseline (Week 4)

```bash
# Enforce baseline on development namespaces first
for ns in development staging; do
  kubectl label namespace $ns \
    pod-security.kubernetes.io/enforce=baseline \
    --overwrite
done
```

Phase 4: Enforce restricted (Week 5+)

```bash
# Enforce restricted on production namespaces
for ns in production; do
  kubectl label namespace $ns \
    pod-security.kubernetes.io/enforce=restricted \
    --overwrite
done
```

Phase 5: Remove PSP (Week 6)

```bash
# Delete PSPs
kubectl delete psp --all

# Remove PSP RBAC bindings
kubectl delete clusterrole,clusterrolebinding -l 'rbac.authorization.k8s.io/psp=true'
```

## Testing Migration

Create comprehensive tests:

```yaml
# test-psa-migration.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: psa-test
  labels:
    pod-security.kubernetes.io/enforce: baseline
---
# Should succeed - baseline compliant
apiVersion: v1
kind: Pod
metadata:
  name: compliant-pod
  namespace: psa-test
spec:
  containers:
  - name: nginx
    image: nginx:1.21
    securityContext:
      allowPrivilegeEscalation: false
---
# Should fail - violates baseline
apiVersion: v1
kind: Pod
metadata:
  name: non-compliant-pod
  namespace: psa-test
spec:
  hostNetwork: true
  containers:
  - name: nginx
    image: nginx:1.21
```

Apply and verify:

```bash
kubectl apply -f test-psa-migration.yaml

# Should succeed
kubectl get pod compliant-pod -n psa-test

# Should fail
kubectl get pod non-compliant-pod -n psa-test
# Error: pods "non-compliant-pod" is forbidden
```

## Rollback Plan

If PSA enforcement causes issues:

```bash
# Quickly revert to warn mode
for ns in $(kubectl get ns -o name | cut -d'/' -f2); do
  kubectl label namespace $ns \
    pod-security.kubernetes.io/enforce- \
    --overwrite

  kubectl label namespace $ns \
    pod-security.kubernetes.io/warn=baseline \
    --overwrite
done

# If PSP is still installed, it takes over again
```

## Documentation Updates

Update your documentation:

```markdown
# Pod Security Standards

## Development Namespaces
- Profile: baseline
- Allows: Most common pod configurations
- Blocks: hostNetwork, privileged containers

## Production Namespaces
- Profile: restricted
- Requires: runAsNonRoot, dropped capabilities, seccomp
- Use template: kubectl get -f templates/restricted-pod.yaml

## Requesting Exemptions
Contact: security-team@company.com
Process: File ticket with justification
```

## Best Practices

Plan migration during low-activity periods. Avoid migrating during peak deployment times or major releases.

Use warn/audit mode extensively before enforcing. Collect at least one full sprint of data to understand impact.

Start with development environments. Gain confidence before touching production.

Communicate extensively with development teams. They need time to update manifests and understand new requirements.

Keep PSP enabled until fully migrated. Running both systems concurrently provides a safety net.

## Conclusion

Migrating from PodSecurityPolicy to Pod Security Admission requires careful planning and gradual rollout. By using warn/audit modes, automating the migration process, and following a phased approach, you can maintain your security posture while adopting the simpler PSA model. Take time to understand your current policies and communicate changes clearly to avoid disrupting workloads.
