# How to Test Disaster Recovery Procedures with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Disaster Recovery, Testing, Chaos Engineering, Runbooks

Description: Build and run disaster recovery drills for Flux-managed clusters, validating your recovery procedures before a real incident occurs.

---

## Introduction

A disaster recovery plan that has never been tested is not a plan — it is a hope. Recovery procedures documented in a wiki and never practiced will fail at the worst possible moment, when the team is stressed, the incident is real, and the documentation has drifted from reality. The only way to have confidence in your DR capabilities is to practice them regularly.

Flux CD makes DR testing significantly more tractable. Because your desired state lives in Git, you can spin up a replica of your production environment, run destructive tests against it, and validate that Flux can restore it to the expected state. The test cluster is disposable, and the tests are repeatable.

This guide covers building a DR testing framework for Flux-managed clusters, including specific test scenarios, success criteria, and automation approaches.

## Prerequisites

- Flux CD managing a production cluster
- A separate DR test cluster (can be a temporary cluster, not production)
- `flux` and `kubectl` CLI tools
- Access to spin up temporary Kubernetes clusters (kind, k3d, or cloud provider)
- Your Flux bootstrap credentials

## Step 1: Create a DR Test Environment

Use kind or k3d to create a lightweight local cluster that mirrors your production setup.

```bash
#!/bin/bash
# create-dr-test-cluster.sh
set -euo pipefail

CLUSTER_NAME="dr-test-$(date +%Y%m%d)"

# Create a kind cluster with production-like configuration
cat > /tmp/kind-config.yaml << 'EOF'
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: worker
  - role: worker
EOF

kind create cluster --name "$CLUSTER_NAME" --config /tmp/kind-config.yaml
kubectl cluster-info --context "kind-$CLUSTER_NAME"

echo "DR test cluster created: $CLUSTER_NAME"
echo "Run: export KUBECONFIG=$(kind get kubeconfig --name $CLUSTER_NAME)"
```

## Step 2: Bootstrap Flux on the Test Cluster

Bootstrap Flux on the test cluster pointing at a test branch of your repository.

```bash
# Create a test branch from the current production state
git checkout -b "dr-test/$(date +%Y%m%d)"
git push origin "dr-test/$(date +%Y%m%d)"

# Bootstrap Flux on the test cluster
export KUBECONFIG=$(kind get kubeconfig --name "$CLUSTER_NAME" --internal)
flux bootstrap github \
  --owner=my-org \
  --repository=my-fleet \
  --branch="dr-test/$(date +%Y%m%d)" \
  --path=clusters/dr-test \
  --token-env=GITHUB_TOKEN

# Verify Flux is reconciling
flux get all -A --watch
```

## Step 3: Define DR Test Scenarios

Document each test scenario with prerequisites, steps, success criteria, and cleanup.

```yaml
# dr-tests/scenarios.yaml (stored in Git for version control)
scenarios:
  - name: namespace-deletion-recovery
    description: "Delete production namespace, verify Flux restores it"
    severity: high
    steps:
      - "Record all resources in production namespace"
      - "Delete production namespace: kubectl delete ns production"
      - "Wait 5 seconds"
      - "Force Flux reconciliation: flux reconcile kustomization apps"
      - "Verify namespace restored with all resources"
    success_criteria:
      - "Namespace recreated within 2 minutes"
      - "All pods Running within 5 minutes"
      - "All services restored"
    rto_target_minutes: 5

  - name: flux-system-deletion
    description: "Delete flux-system namespace, verify re-bootstrap"
    severity: critical
    steps:
      - "Record current Flux resource states"
      - "Delete flux-system namespace"
      - "Re-run flux bootstrap command"
      - "Verify all Flux resources restored"
    success_criteria:
      - "Flux controllers running within 3 minutes"
      - "All Kustomizations reconciled within 10 minutes"
    rto_target_minutes: 10

  - name: crd-deletion-recovery
    description: "Delete a managed CRD, verify restoration"
    severity: high
    steps:
      - "Identify a CRD managed by Flux"
      - "Delete the CRD"
      - "Trigger Flux reconciliation"
      - "Verify CRD and all CRs restored"
    success_criteria:
      - "CRD restored within 3 minutes"
      - "All CRs restored within 5 minutes"
    rto_target_minutes: 5
```

## Step 4: Automate DR Tests

```bash
#!/bin/bash
# run-dr-tests.sh
set -euo pipefail

PASS=0
FAIL=0
RESULTS=()

run_test() {
  local name="$1"
  local test_fn="$2"
  local rto_minutes="$3"

  echo "==> Running: $name"
  START_TIME=$(date +%s)

  if $test_fn; then
    END_TIME=$(date +%s)
    DURATION=$(( (END_TIME - START_TIME) / 60 ))
    if [ "$DURATION" -le "$rto_minutes" ]; then
      echo "PASS: $name (${DURATION}m, target ${rto_minutes}m)"
      RESULTS+=("PASS: $name - ${DURATION}m")
      PASS=$((PASS + 1))
    else
      echo "FAIL: $name exceeded RTO (${DURATION}m > ${rto_minutes}m)"
      RESULTS+=("FAIL: $name - RTO exceeded ${DURATION}m > ${rto_minutes}m")
      FAIL=$((FAIL + 1))
    fi
  else
    echo "FAIL: $name - recovery failed"
    RESULTS+=("FAIL: $name - recovery failed")
    FAIL=$((FAIL + 1))
  fi
}

test_namespace_deletion() {
  kubectl delete namespace production --wait=false
  sleep 5
  flux reconcile kustomization apps --with-source
  kubectl wait namespace/production --for=jsonpath='{.status.phase}'=Active --timeout=120s
  kubectl wait pods -n production --for=condition=Ready --timeout=300s --all
}

test_crd_deletion() {
  local crd="certificates.cert-manager.io"
  kubectl delete crd "$crd"
  flux reconcile kustomization cert-manager-crds --with-source
  kubectl wait crd/"$crd" --for=condition=Established --timeout=120s
}

run_test "namespace-deletion" test_namespace_deletion 5
run_test "crd-deletion" test_crd_deletion 3

echo ""
echo "=== DR Test Results ==="
for result in "${RESULTS[@]}"; do
  echo "  $result"
done
echo ""
echo "Passed: $PASS | Failed: $FAIL"
[ "$FAIL" -eq 0 ] || exit 1
```

## Step 5: Measure and Record RTO

Track RTO measurements over time to validate improvement.

```bash
# Record test results to a metrics file in Git
cat >> dr-test-results.json << EOF
{
  "date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "cluster": "$CLUSTER_NAME",
  "tests": {
    "namespace_deletion_rto_minutes": $NAMESPACE_DELETION_RTO,
    "crd_deletion_rto_minutes": $CRD_DELETION_RTO,
    "full_rebuild_rto_minutes": $FULL_REBUILD_RTO
  },
  "passed": $PASS,
  "failed": $FAIL
}
EOF

git add dr-test-results.json
git commit -m "test: DR results $(date +%Y-%m-%d)"
git push
```

## Step 6: Clean Up and Schedule Regular Drills

```bash
#!/bin/bash
# cleanup-dr-test.sh
CLUSTER_NAME="${1:?Usage: $0 <cluster-name>}"

echo "Destroying DR test cluster: $CLUSTER_NAME"
kind delete cluster --name "$CLUSTER_NAME"

# Delete the test branch
git push origin --delete "dr-test/$(date +%Y%m%d)" || true

echo "Cleanup complete"
```

Schedule DR drills as a calendar event: monthly for high-severity scenarios, quarterly for full cluster rebuild.

## Best Practices

- Treat DR tests as code — store scenarios, scripts, and results in Git.
- Run DR tests against a disposable copy of production data, never against production itself.
- Measure actual RTO for each test and compare against targets.
- Require that any team member can run the DR test suite independently, not just senior engineers.
- Update DR runbooks after every test to reflect what actually worked.
- Run a full DR drill before major infrastructure changes (Kubernetes upgrades, Flux upgrades).

## Conclusion

Regular DR testing with Flux CD is not as difficult as it sounds. The Git-based model means you can create a test cluster, bootstrap Flux, run destructive tests, and measure recovery time in a controlled environment. The investment in building a DR test suite pays back immediately — you will find gaps in your runbooks before a real incident does.
