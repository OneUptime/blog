# How to Secure Calico on Kubernetes Upgrades

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Upgrades, Security

Description: Apply security best practices during Calico upgrades including image verification, change control, policy continuity checks, and rollback preparedness.

---

## Introduction

Calico upgrades represent a critical security moment: you're replacing core networking components that enforce your network policies. During the rolling update window, nodes are in a mixed state that requires careful management. Security practices for upgrades focus on verifying image integrity, maintaining policy enforcement continuity, and ensuring the upgrade doesn't introduce security regressions.

## Security Control 1: Image Verification Before Upgrade

```bash
# Verify new Calico images with cosign before updating ImageSet
CALICO_VERSION="v3.28.0"
REGISTRY="registry.internal.example.com/calico"

for img in cni node kube-controllers typha; do
  echo "Verifying ${img}..."
  cosign verify --key cosign.pub \
    "${REGISTRY}/${img}:${CALICO_VERSION}" && echo "OK" || echo "FAIL - STOP UPGRADE"
done
```

## Security Control 2: CVE Scan Before Upgrade

```bash
# Scan new images for critical CVEs before deploying
for img in cni node kube-controllers typha; do
  trivy image --severity CRITICAL,HIGH \
    "docker.io/calico/${img}:v3.28.0" \
    --exit-code 1  # Fail if critical CVEs found
done
```

## Security Control 3: Policy Continuity Audit

```bash
# Snapshot current policies before upgrade
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p "pre-upgrade-snapshot-${TIMESTAMP}"

calicoctl get globalnetworkpolicies -o yaml > "pre-upgrade-snapshot-${TIMESTAMP}/gnps.yaml"
calicoctl get networkpolicies --all-namespaces -o yaml > "pre-upgrade-snapshot-${TIMESTAMP}/netpols.yaml"

# After upgrade, compare policy state
diff <(calicoctl get globalnetworkpolicies -o yaml) \
     "pre-upgrade-snapshot-${TIMESTAMP}/gnps.yaml"
echo "Policy diff complete - review any changes carefully"
```

## Security Control 4: Change Management

```markdown
## Calico Upgrade Change Request Template

**Risk Classification**: Medium
**Change Type**: Standard (if pre-approved path) / Normal (if new version)

**Pre-conditions**:
- [ ] Images scanned for CVEs (zero critical)
- [ ] Images signed and verified
- [ ] Tested in staging for 48+ hours
- [ ] Security team reviewed release notes for security changes
- [ ] Rollback procedure tested in staging

**Implementation Plan**:
1. Create new ImageSet with verified image digests
2. Apply to staging cluster via GitOps PR
3. Run automated validation suite
4. Peer review + security team sign-off on PR
5. Merge and monitor production rollout
6. Run post-upgrade security validation

**Rollback Plan**:
Revert GitOps PR - estimated 15 minutes
```

## Security Validation Post-Upgrade

```bash
# Verify policy enforcement is unchanged after upgrade
kubectl run sec-test-blocked --image=busybox --restart=Never \
  -n default -- wget -qO/dev/null --timeout=3 http://8.8.8.8
kubectl wait pod/sec-test-blocked --for=condition=completed --timeout=30s 2>/dev/null || \
  echo "EXPECTED: External access blocked by policy"

# Compare active policy count to pre-upgrade snapshot
CURRENT_POLICY_COUNT=$(calicoctl get gnp --no-headers | wc -l)
SNAPSHOT_POLICY_COUNT=$(grep "^- " pre-upgrade-snapshot-*/gnps.yaml | wc -l)
[[ "${CURRENT_POLICY_COUNT}" -eq "${SNAPSHOT_POLICY_COUNT}" ]] && \
  echo "OK: Policy count unchanged" || \
  echo "WARN: Policy count changed from ${SNAPSHOT_POLICY_COUNT} to ${CURRENT_POLICY_COUNT}"
```

## Conclusion

Securing Calico upgrades requires treating the process as a security-sensitive change: verify images with cosign, scan for CVEs before deploying, snapshot policy state before the upgrade for comparison afterward, and maintain a formal change management record. The most important security check is verifying that all network policies are still enforced after the upgrade — a policy regression during an upgrade could silently allow traffic that was previously blocked.
