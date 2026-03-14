# How to Automate Calico on OpenShift Upgrades

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Kubernetes, Networking, Upgrade, Automation

Description: Automate Calico upgrades on OpenShift using GitOps and CI/CD pipelines that account for OCP-specific requirements including MachineConfigPool completion checks.

---

## Introduction

Automating Calico upgrades on OpenShift builds on the standard Kubernetes automation approach but adds OpenShift-specific checks: waiting for MachineConfigPool completion, validating SCC bindings, and checking cluster operators after the upgrade. These additional steps protect against the interaction effects between Calico and OCP's own infrastructure management.

## Automation Prerequisites

```bash
# Verify oc CLI is available for OpenShift-specific commands
oc version

# Check current OCP cluster state is healthy before automation
oc get co | grep -E "False|True.*True" | wc -l
# Should be 0 (no degraded or unavailable operators)
```

## OpenShift-Specific Pre-flight Checks

```bash
#!/bin/bash
# ocp-calico-upgrade-preflight.sh
echo "=== OpenShift Calico Upgrade Pre-flight ==="

# 1. All MachineConfigPools stable
echo "Checking MachineConfigPools..."
UPDATING_MCPs=$(oc get mcp -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.status.conditions[?(@.type=="Updating")].status}{"\n"}{end}' | \
  grep " True" | wc -l)

if [[ "${UPDATING_MCPs}" -gt 0 ]]; then
  echo "WAIT: ${UPDATING_MCPs} MCPs still updating. Retry after MCPs complete."
  exit 1
fi
echo "OK: All MCPs stable"

# 2. All cluster operators healthy
DEGRADED_COS=$(oc get co -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.status.conditions[?(@.type=="Degraded")].status}{"\n"}{end}' | \
  grep " True" | wc -l)

if [[ "${DEGRADED_COS}" -gt 0 ]]; then
  echo "WARN: ${DEGRADED_COS} cluster operators degraded"
  oc get co | grep -v "True.*False.*False"
fi

# 3. Calico-system namespace exists and healthy
oc project calico-system > /dev/null 2>&1 || \
  { echo "FAIL: calico-system namespace not found"; exit 1; }

echo "Pre-flight checks passed"
```

## GitOps Automation for OCP Calico Upgrades

```yaml
# .github/workflows/calico-ocp-upgrade.yaml
name: Calico OpenShift Upgrade

on:
  workflow_dispatch:
    inputs:
      calico_version:
        required: true
      cluster_context:
        required: true

jobs:
  upgrade:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: OCP pre-flight check
        run: |
          oc --context=${{ github.event.inputs.cluster_context }} \
            get mcp | grep -v "True.*False" && echo "MCPs ready"

      - name: Apply Calico upgrade
        run: |
          kubectl --context=${{ github.event.inputs.cluster_context }} \
            patch installation default --type=merge \
            -p '{"spec":{"version":"${{ github.event.inputs.calico_version }}"}}'

      - name: Wait for upgrade
        run: |
          kubectl --context=${{ github.event.inputs.cluster_context }} \
            rollout status ds/calico-node -n calico-system --timeout=600s

      - name: Post-upgrade validation
        run: |
          ./scripts/validate-calico-ocp-upgrade.sh \
            ${{ github.event.inputs.calico_version }}
```

## Post-Upgrade OCP Validation Script

```bash
#!/bin/bash
# validate-calico-ocp-upgrade.sh
TARGET_VERSION="${1:?Provide target version}"
FAILURES=0

echo "=== OCP Calico Post-Upgrade Validation ==="

# Standard checks
RUNNING=$(kubectl get installation default -o jsonpath='{.status.calicoVersion}')
[[ "${RUNNING}" == "${TARGET_VERSION}" ]] && echo "OK: Version ${TARGET_VERSION}" || \
  { echo "FAIL: Version mismatch"; FAILURES=$((FAILURES + 1)); }

# OCP-specific checks
echo "--- OCP-Specific Checks ---"

# SCC still in place
oc get scc calico-node > /dev/null 2>&1 && echo "OK: calico-node SCC exists" || \
  { echo "FAIL: calico-node SCC missing"; FAILURES=$((FAILURES + 1)); }

# No cluster operators newly degraded
DEGRADED=$(oc get co -o jsonpath='{range .items[*]}{.status.conditions[?(@.type=="Degraded")].status}{"\n"}{end}' | \
  grep -c True)
[[ "${DEGRADED}" -eq 0 ]] && echo "OK: No cluster operators degraded" || \
  { echo "WARN: ${DEGRADED} cluster operators degraded"; }

echo "=== Validation: ${FAILURES} failure(s) ==="
exit ${FAILURES}
```

## Conclusion

Automating Calico upgrades on OpenShift adds two critical steps beyond vanilla Kubernetes automation: MachineConfigPool stability check before starting the upgrade, and cluster operator degradation check after. These OpenShift-specific steps prevent upgrade conflicts and catch side effects of OCP-Calico interaction. By incorporating these into your CI/CD pipeline alongside standard Calico validation, you get comprehensive upgrade automation that handles OpenShift's unique operational model.
