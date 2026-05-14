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
oc get co --no-headers | awk '$3 != "True" || $4 != "False" || $5 != "False" {print}' | wc -l
# Should be 0 (no unavailable, progressing, or degraded operators)
```

## OpenShift-Specific Pre-flight Checks

```bash
#!/bin/bash
# ocp-calico-upgrade-preflight.sh
echo "=== OpenShift Calico Upgrade Pre-flight ==="

# 1. All MachineConfigPools stable
echo "Checking MachineConfigPools..."
UNREADY_MCPs=$(oc get mcp --no-headers | awk '$3 != "True" || $4 != "False" || $5 != "False" {print}' | wc -l)

if [[ "${UNREADY_MCPs}" -gt 0 ]]; then
  echo "WAIT: ${UNREADY_MCPs} MCPs are not updated, are updating, or are degraded. Retry after MCPs complete."
  oc get mcp
  exit 1
fi
echo "OK: All MCPs stable"

# 2. All cluster operators healthy
UNHEALTHY_COS=$(oc get co --no-headers | awk '$3 != "True" || $4 != "False" || $5 != "False" {print}' | wc -l)

if [[ "${UNHEALTHY_COS}" -gt 0 ]]; then
  echo "FAIL: ${UNHEALTHY_COS} cluster operators are unavailable, progressing, or degraded"
  oc get co --no-headers | awk '$3 != "True" || $4 != "False" || $5 != "False" {print}'
  exit 1
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
        description: Calico release tag, for example v3.32.0
      cluster_context:
        required: true

jobs:
  upgrade:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: OCP pre-flight check
        run: |
          test "$(oc --context=${{ github.event.inputs.cluster_context }} get mcp --no-headers | awk '$3 != "True" || $4 != "False" || $5 != "False" {print}' | wc -l)" -eq 0
          test "$(oc --context=${{ github.event.inputs.cluster_context }} get co --no-headers | awk '$3 != "True" || $4 != "False" || $5 != "False" {print}' | wc -l)" -eq 0
          echo "OpenShift pre-flight checks passed"

      - name: Apply Calico upgrade
        run: |
          oc --context=${{ github.event.inputs.cluster_context }} \
            apply --server-side --force-conflicts \
            -f https://raw.githubusercontent.com/projectcalico/calico/${{ github.event.inputs.calico_version }}/manifests/tigera-operator-ocp-upgrade.yaml

      - name: Wait for upgrade
        run: |
          oc --context=${{ github.event.inputs.cluster_context }} \
            rollout status deployment/tigera-operator -n tigera-operator --timeout=600s
          oc --context=${{ github.event.inputs.cluster_context }} \
            rollout status ds/calico-node -n calico-system --timeout=600s
          oc --context=${{ github.event.inputs.cluster_context }} \
            wait --for=condition=Available tigerastatus --all --timeout=600s

      - name: Post-upgrade validation
        run: |
          ./scripts/validate-calico-ocp-upgrade.sh \
            ${{ github.event.inputs.calico_version }} \
            ${{ github.event.inputs.cluster_context }}
```

## Post-Upgrade OCP Validation Script

```bash
#!/bin/bash
# validate-calico-ocp-upgrade.sh
TARGET_VERSION="${1:?Provide target version}"
CONTEXT="${2:-}"
FAILURES=0
OC=(oc)
if [[ -n "${CONTEXT}" ]]; then
  OC=(oc --context="${CONTEXT}")
fi

echo "=== OCP Calico Post-Upgrade Validation ==="

# Standard checks
RUNNING=$("${OC[@]}" get installation.operator.tigera.io default -o jsonpath='{.status.calicoVersion}')
[[ "${RUNNING}" == "${TARGET_VERSION}" ]] && echo "OK: Version ${TARGET_VERSION}" || \
  { echo "FAIL: Version mismatch"; FAILURES=$((FAILURES + 1)); }

# OCP-specific checks
echo "--- OCP-Specific Checks ---"

# SCC still in place
"${OC[@]}" get scc calico-node > /dev/null 2>&1 && echo "OK: calico-node SCC exists" || \
  { echo "FAIL: calico-node SCC missing"; FAILURES=$((FAILURES + 1)); }

# Tigera operator reports Calico components available
"${OC[@]}" wait --for=condition=Available tigerastatus --all --timeout=600s && echo "OK: TigeraStatus resources available" || \
  { echo "FAIL: TigeraStatus resources not available"; FAILURES=$((FAILURES + 1)); }

# No cluster operators newly degraded
DEGRADED=$("${OC[@]}" get co -o jsonpath='{range .items[*]}{.status.conditions[?(@.type=="Degraded")].status}{"\n"}{end}' | \
  grep -c True)
[[ "${DEGRADED}" -eq 0 ]] && echo "OK: No cluster operators degraded" || \
  { echo "WARN: ${DEGRADED} cluster operators degraded"; }

echo "=== Validation: ${FAILURES} failure(s) ==="
exit ${FAILURES}
```

## Conclusion

Automating Calico upgrades on OpenShift adds two critical steps beyond vanilla Kubernetes automation: MachineConfigPool stability check before starting the upgrade, and cluster operator degradation check after. These OpenShift-specific steps prevent upgrade conflicts and catch side effects of OCP-Calico interaction. By incorporating these into your CI/CD pipeline alongside standard Calico validation, you get comprehensive upgrade automation that handles OpenShift's unique operational model.
