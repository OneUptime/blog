# How to Test Flux CD Upgrade in a Staging Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, upgrade, staging, testing, kubernetes, gitops

Description: A practical guide to safely testing Flux CD version upgrades in a staging cluster before rolling out to production.

---

Upgrading Flux CD in production without testing is risky. CRD changes, controller behavior differences, and API version deprecations can break reconciliation. This guide covers how to set up a staging cluster to test Flux CD upgrades, validate all resources, and confidently roll out to production.

## Why Test Flux CD Upgrades in Staging

Flux CD upgrades can introduce:

- New CRD versions that require manifest changes
- Deprecated API fields that stop working
- Changed default behaviors in controllers
- New dependencies or prerequisites
- Breaking changes in reconciliation logic

Testing in staging catches these issues before they affect production workloads.

## Step 1: Set Up a Staging Cluster That Mirrors Production

Create a staging cluster that replicates your production Flux CD setup.

```bash
# Option 1: Create a kind cluster for local testing
cat <<EOF | kind create cluster --name flux-staging --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: worker
  - role: worker
EOF

# Option 2: Create a staging cluster in your cloud provider
# This is preferred for more realistic testing
# Example with EKS:
eksctl create cluster \
  --name flux-staging \
  --region us-east-1 \
  --nodegroup-name standard \
  --node-type t3.medium \
  --nodes 3
```

## Step 2: Bootstrap Flux at the Current Version

Install the same Flux version that runs in production.

```bash
# Check current production Flux version
kubectl --context production get deployment -n flux-system \
  source-controller -o jsonpath='{.spec.template.spec.containers[0].image}'

# Install the matching Flux CLI version
# For example, if production runs v2.2.0:
curl -sL https://github.com/fluxcd/flux2/releases/download/v2.2.0/flux_2.2.0_linux_amd64.tar.gz \
  | tar xz
sudo mv flux /usr/local/bin/flux-old

# Bootstrap with the current version in the staging cluster
kubectl config use-context kind-flux-staging

flux-old bootstrap github \
  --owner=your-org \
  --repository=fleet-infra-staging \
  --branch=main \
  --path=clusters/staging \
  --personal
```

## Step 3: Replicate Production Flux Resources

Copy all Flux resources from production to staging.

```bash
# Export all Flux source resources from production
kubectl --context production get gitrepositories -n flux-system -o yaml > /tmp/git-repos.yaml
kubectl --context production get helmrepositories -n flux-system -o yaml > /tmp/helm-repos.yaml
kubectl --context production get helmcharts -n flux-system -o yaml > /tmp/helm-charts.yaml

# Export all Kustomizations
kubectl --context production get kustomizations -n flux-system -o yaml > /tmp/kustomizations.yaml

# Export all HelmReleases
kubectl --context production get helmreleases -A -o yaml > /tmp/helmreleases.yaml

# Export image automation resources
kubectl --context production get imagerepositories -n flux-system -o yaml > /tmp/image-repos.yaml
kubectl --context production get imagepolicies -n flux-system -o yaml > /tmp/image-policies.yaml

# Export alerts and providers
kubectl --context production get alerts -n flux-system -o yaml > /tmp/alerts.yaml
kubectl --context production get providers -n flux-system -o yaml > /tmp/providers.yaml
```

Create a script to clean and apply these resources in staging:

```bash
#!/bin/bash
# clean-and-apply.sh
# Remove metadata that should not be carried over

for file in /tmp/git-repos.yaml /tmp/helm-repos.yaml /tmp/kustomizations.yaml /tmp/helmreleases.yaml; do
  # Remove cluster-specific metadata
  yq eval 'del(.items[].metadata.resourceVersion)' -i "$file"
  yq eval 'del(.items[].metadata.uid)' -i "$file"
  yq eval 'del(.items[].metadata.creationTimestamp)' -i "$file"
  yq eval 'del(.items[].status)' -i "$file"

  # Apply to staging cluster
  kubectl --context kind-flux-staging apply -f "$file"
done

echo "All Flux resources replicated to staging"
```

## Step 4: Verify Staging Matches Production

Before upgrading, confirm staging reconciles correctly.

```bash
# Check all Kustomizations are ready
flux get kustomizations -A

# Check all HelmReleases are ready
flux get helmreleases -A

# Check all sources are ready
flux get sources all -A

# Compare resource counts between clusters
echo "Production Kustomizations:"
kubectl --context production get kustomizations -n flux-system --no-headers | wc -l

echo "Staging Kustomizations:"
kubectl --context kind-flux-staging get kustomizations -n flux-system --no-headers | wc -l
```

## Step 5: Create a Pre-Upgrade Snapshot

Record the state before upgrading so you can compare after.

```bash
#!/bin/bash
# pre-upgrade-snapshot.sh
# Capture the state of all Flux resources before upgrade

SNAPSHOT_DIR="/tmp/flux-upgrade-snapshot/before"
mkdir -p "$SNAPSHOT_DIR"

# Record Flux version
flux version > "$SNAPSHOT_DIR/version.txt"

# Record all resource statuses
flux get all -A > "$SNAPSHOT_DIR/all-resources.txt"

# Record CRD versions
kubectl get crds | grep fluxcd > "$SNAPSHOT_DIR/crds.txt"

# Record controller versions
kubectl get deployments -n flux-system \
  -o custom-columns=NAME:.metadata.name,IMAGE:.spec.template.spec.containers[0].image \
  > "$SNAPSHOT_DIR/controllers.txt"

# Record all reconciliation statuses
for ks in $(kubectl get kustomizations -n flux-system -o name); do
  name=$(basename "$ks")
  kubectl get "$ks" -n flux-system -o jsonpath='{.status.conditions}' \
    > "$SNAPSHOT_DIR/ks-${name}-status.json"
done

echo "Pre-upgrade snapshot saved to $SNAPSHOT_DIR"
```

## Step 6: Perform the Upgrade

Upgrade Flux CD in the staging cluster.

```bash
# Install the new Flux CLI version
curl -s https://fluxcd.io/install.sh | sudo bash

# Check the new version
flux version --client

# Run pre-flight checks
flux check --pre

# Review what will change before applying
# Export the new manifests without applying
flux install --export > /tmp/flux-new-manifests.yaml

# Diff against current installation
kubectl diff -f /tmp/flux-new-manifests.yaml
```

```bash
# Perform the upgrade
# Option 1: Using flux install (if not using bootstrap)
flux install

# Option 2: Using bootstrap (recommended, updates Git repo too)
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-infra-staging \
  --branch=main \
  --path=clusters/staging \
  --personal
```

## Step 7: Validate the Upgrade

Run comprehensive checks after the upgrade.

```bash
#!/bin/bash
# post-upgrade-validate.sh
# Validate Flux upgrade was successful

SNAPSHOT_DIR="/tmp/flux-upgrade-snapshot/after"
mkdir -p "$SNAPSHOT_DIR"

echo "=== Flux Version ==="
flux version

echo ""
echo "=== Pre-flight Check ==="
flux check

echo ""
echo "=== Controller Status ==="
kubectl get deployments -n flux-system

echo ""
echo "=== All Flux Resources Status ==="
flux get all -A

# Save post-upgrade state
flux get all -A > "$SNAPSHOT_DIR/all-resources.txt"

echo ""
echo "=== Checking for Failed Reconciliations ==="
FAILED=$(flux get all -A 2>/dev/null | grep -i "false" | wc -l)
if [ "$FAILED" -gt 0 ]; then
  echo "WARNING: $FAILED resources have failed reconciliation"
  flux get all -A | grep -i "false"
else
  echo "All resources reconciling successfully"
fi

echo ""
echo "=== CRD Changes ==="
kubectl get crds | grep fluxcd > "$SNAPSHOT_DIR/crds.txt"
diff /tmp/flux-upgrade-snapshot/before/crds.txt "$SNAPSHOT_DIR/crds.txt"
```

## Step 8: Test Specific Scenarios

Run targeted tests to validate critical functionality.

```yaml
# Test 1: Create a new Kustomization and verify it reconciles
# test/kustomization-test.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: upgrade-test
  namespace: flux-system
spec:
  interval: 1m
  path: ./test/simple-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 2m
```

```yaml
# Test 2: Create a new HelmRelease and verify it installs
# test/helmrelease-test.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: upgrade-test-helm
  namespace: flux-system
spec:
  interval: 5m
  targetNamespace: default
  chart:
    spec:
      chart: podinfo
      version: ">=6.0.0"
      sourceRef:
        kind: HelmRepository
        name: podinfo
  values:
    replicaCount: 1
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: podinfo
  namespace: flux-system
spec:
  url: https://stefanprodan.github.io/podinfo
  interval: 30m
```

```bash
# Apply the test resources
kubectl apply -f test/kustomization-test.yaml
kubectl apply -f test/helmrelease-test.yaml

# Wait and verify
flux get kustomization upgrade-test --watch
flux get helmrelease upgrade-test-helm --watch

# Test 3: Force a reconciliation
flux reconcile kustomization flux-system --with-source

# Test 4: Verify image automation still works
flux get image all -A

# Test 5: Verify notifications still fire
flux get alerts -A
```

## Step 9: Test Rollback Procedure

Before upgrading production, verify you can roll back if needed.

```bash
# Rollback Flux to the previous version
# Re-install the old CLI
curl -sL https://github.com/fluxcd/flux2/releases/download/v2.2.0/flux_2.2.0_linux_amd64.tar.gz \
  | tar xz
sudo mv flux /usr/local/bin/flux

# Rollback the controllers
flux install --version=v2.2.0

# Verify everything still works after rollback
flux check
flux get all -A

# If rollback works, re-apply the upgrade
curl -s https://fluxcd.io/install.sh | sudo bash
flux install
```

## Step 10: Document and Execute Production Upgrade

Create a runbook based on staging results.

```yaml
# production-upgrade-runbook.yaml
# Use this as a checklist for production upgrade

# Pre-upgrade:
# 1. Verify staging upgrade was successful
# 2. Schedule maintenance window
# 3. Notify team via Slack/Teams
# 4. Take pre-upgrade snapshot of production

# Upgrade steps:
# 1. Run flux check --pre
# 2. Run flux install --export and review diff
# 3. Run flux bootstrap (or flux install)
# 4. Monitor controller pods restarting

# Post-upgrade validation:
# 1. flux check (all controllers healthy)
# 2. flux get all -A (all resources reconciling)
# 3. Verify critical HelmReleases
# 4. Verify image automation
# 5. Verify notifications

# Rollback plan:
# 1. flux install --version=<previous-version>
# 2. Verify all resources reconcile
# 3. Investigate root cause
```

```bash
# Production upgrade commands
kubectl config use-context production

# Pre-flight
flux check --pre

# Upgrade
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --personal

# Validate
flux check
flux get all -A

# Monitor for 30 minutes
watch flux get all -A
```

## Automating Future Upgrade Testing

Set up a CI pipeline to test Flux upgrades automatically.

```yaml
# .github/workflows/flux-upgrade-test.yaml
name: Test Flux CD Upgrade
on:
  schedule:
    # Run weekly to catch new Flux releases
    - cron: "0 6 * * 1"
  workflow_dispatch:

jobs:
  test-upgrade:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Create kind cluster
        uses: helm/kind-action@v1
        with:
          cluster_name: flux-upgrade-test

      - name: Install current Flux version
        run: |
          # Install the version matching production
          curl -sL https://github.com/fluxcd/flux2/releases/download/v2.2.0/flux_2.2.0_linux_amd64.tar.gz | tar xz
          sudo mv flux /usr/local/bin/flux
          flux install

      - name: Apply test resources
        run: |
          kubectl apply -f test/flux-resources/

      - name: Wait for reconciliation
        run: |
          flux get all -A
          sleep 30

      - name: Upgrade to latest Flux
        run: |
          curl -s https://fluxcd.io/install.sh | sudo bash
          flux install

      - name: Validate upgrade
        run: |
          flux check
          flux get all -A
          # Fail if any resource is not ready
          FAILED=$(flux get all -A 2>/dev/null | grep -c "False" || true)
          if [ "$FAILED" -gt 0 ]; then
            echo "Upgrade validation failed"
            flux get all -A
            exit 1
          fi
```

## Summary

Testing Flux CD upgrades in a staging cluster involves creating a mirror of your production setup, bootstrapping Flux at the current version, replicating all Flux resources, taking a pre-upgrade snapshot, performing the upgrade, validating all resources reconcile correctly, testing rollback procedures, and documenting a production runbook. Automating this process with CI ensures you catch upgrade issues early and can upgrade production with confidence.
