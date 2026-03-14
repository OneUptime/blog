# Preventing CIDRNotAvailable Errors in Calico and kubeadm

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPAM, Troubleshooting

Description: Proactive measures and best practices to prevent CIDRNotAvailable errors from occurring in Kubernetes clusters running Calico and kubeadm.

---

## Introduction

CIDRNotAvailable errors occur when Calico cannot find a suitable CIDR block to allocate IPs from. This typically happens when the pod CIDR configured in kubeadm does not match the Calico IPPool configuration, or when the IP address space is exhausted.

Prevention is always better than remediation. This guide covers the proactive steps, configuration practices, and operational habits that prevent CIDRNotAvailable errors from occurring in the first place.

By implementing these measures, you reduce the risk of networking incidents and make your Calico-based Kubernetes cluster more resilient and predictable.

## Prerequisites

- A Kubernetes cluster running Calico (v3.26+)
- `kubectl` and `calicoctl` installed
- Cluster-admin access

## Prevention Strategy 1: Configuration Validation

Validate Calico configurations before applying them to production:

```bash
# Use calicoctl to validate manifests
calicoctl apply -f calico-config.yaml --dry-run

# Compare your manifest against the live configuration
diff <(calicoctl get ippools -o yaml) ippool.yaml
```

Store all Calico resource manifests in version control and require code review for changes.

## Prevention Strategy 2: CI/CD Pipeline Checks

Add Calico configuration validation to your CI/CD pipeline:

```bash
#!/bin/bash
# ci-validate-calico.sh
set -euo pipefail

for manifest in calico-resources/*.yaml; do
  echo "Validating $manifest..."
  calicoctl apply -f "$manifest" --dry-run || exit 1
done

echo "All Calico manifests are valid."
```

## Prevention Strategy 3: Resource Monitoring

Set up monitoring to detect drift before it causes errors:

```bash
# Check IPAM usage regularly
calicoctl ipam show

# Verify all calico-node pods are healthy
kubectl get pods -n calico-system -l k8s-app=calico-node

# Check for warning events
kubectl get events -n calico-system --field-selector type=Warning
```

## Prevention Strategy 4: Capacity Planning

Prevent IP exhaustion by monitoring pool usage:

```bash
calicoctl ipam show
calicoctl ipam show --show-blocks | tail -5
```

Plan additional IP pools before usage exceeds 80%:

```yaml
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: overflow-pool
spec:
  cidr: 10.245.0.0/16
  blockSize: 26
  ipipMode: Always
  natOutgoing: true
  disabled: true
```

## Prevention Strategy 5: Upgrade Procedures

Follow safe upgrade procedures for Calico:

```bash
# Before upgrading, snapshot all resources
calicoctl get ippools -o yaml > pre-upgrade-ippools.yaml
calicoctl get felixconfiguration -o yaml > pre-upgrade-felix.yaml
calicoctl get bgpconfigurations -o yaml > pre-upgrade-bgp.yaml
calicoctl get globalnetworkpolicies -o yaml > pre-upgrade-gnp.yaml

# Verify cluster health before upgrading
kubectl get pods -n calico-system
calicoctl node status
```

## Verification

Verify your preventive measures are in place:

```bash
# Confirm configurations are in version control
git log --oneline calico-resources/

# Check IPAM capacity has headroom
calicoctl ipam show
```

## Troubleshooting

**CI validation passes but production still has issues:**
- Ensure CI uses the same version of calicoctl as production.
- Validate against a staging cluster that mirrors production topology.


## Operational Checklists

### Pre-Deployment Checklist

Before deploying any Calico configuration change to production, verify the following:

- [ ] The change has been tested in a staging environment that mirrors production
- [ ] All Calico resource manifests are stored in version control
- [ ] A backup of the current Calico configuration has been taken
- [ ] The change has been reviewed by at least one other team member
- [ ] A rollback plan is documented and ready to execute
- [ ] Monitoring dashboards are open and alerting thresholds are appropriate

### Post-Deployment Checklist

After deploying a Calico configuration change:

- [ ] All calico-node pods are Running with zero restarts
- [ ] Cross-node pod connectivity has been tested
- [ ] DNS resolution works from test pods
- [ ] No new Warning events in the calico-system namespace
- [ ] Prometheus metrics show no anomalies
- [ ] The change has been documented in the team's change log

```bash
# Automated post-deployment verification
echo "Checking calico-node pods..."
kubectl get pods -n calico-system -l k8s-app=calico-node --no-headers | grep -v Running && echo "FAIL: Some calico-node pods not running" || echo "PASS: All calico-node pods running"

echo "Checking for warning events..."
WARNINGS=$(kubectl get events -n calico-system --field-selector type=Warning --no-headers 2>/dev/null | wc -l)
echo "Warning events in calico-system: $WARNINGS"

echo "Checking IPAM health..."
calicoctl ipam show
```

### Quarterly Review Checklist

Every quarter, review your Calico deployment:

- [ ] Calico version is within the supported release window
- [ ] IPPool capacity has at least 30% headroom
- [ ] Monitoring alerts have been tested (fire a test alert)
- [ ] Runbooks have been reviewed and updated
- [ ] Team members have access to `calicoctl` and know how to use it

## Conclusion

Preventing CIDRNotAvailable errors requires a combination of configuration validation, capacity planning, monitoring, and disciplined change management. Investing in prevention is significantly cheaper than debugging production networking incidents.
