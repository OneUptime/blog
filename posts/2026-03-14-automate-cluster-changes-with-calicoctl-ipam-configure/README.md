# Automating IPAM Configuration with calicoctl ipam configure

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Calicoctl, IPAM, Automation, Kubernetes, CI/CD

Description: Automate Calico IPAM configuration across multiple clusters using scripts and CI/CD pipelines to ensure consistent IP address management settings.

---

## Introduction

In multi-cluster environments, IPAM configuration must be consistent to prevent IP address allocation issues. Automating `calicoctl ipam configure` ensures that strict affinity settings and other IPAM parameters are uniformly applied across all clusters.

## Prerequisites

- Multiple Kubernetes clusters with Calico
- CI/CD pipeline access
- `calicoctl` available in automation environments

## Multi-Cluster IPAM Configuration Script

```bash
#!/bin/bash
# configure-ipam-fleet.sh
# Applies consistent IPAM configuration across clusters

STRICT_AFFINITY="${1:-true}"
CLUSTERS=$(kubectl config get-contexts -o name)

echo "=== Fleet IPAM Configuration ==="
echo "Strict Affinity: $STRICT_AFFINITY"
echo ""

for CLUSTER in $CLUSTERS; do
  echo "--- $CLUSTER ---"
  
  export KUBECONFIG=$(kubectl config view --raw -o json | python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin)))" 2>/dev/null)
  
  # Check current state
  CURRENT=$(kubectl --context="$CLUSTER" exec -n calico-system \
    $(kubectl --context="$CLUSTER" get pod -n calico-system -l k8s-app=calico-kube-controllers -o jsonpath='{.items[0].metadata.name}' 2>/dev/null) \
    -- calicoctl ipam show --show-configuration 2>/dev/null | grep StrictAffinity | awk '{print $2}')
  
  echo "  Current: StrictAffinity=$CURRENT"
  
  if [ "$CURRENT" = "$STRICT_AFFINITY" ]; then
    echo "  Status: Already configured correctly"
  else
    echo "  Applying: StrictAffinity=$STRICT_AFFINITY"
    calicoctl ipam configure --strictaffinity="$STRICT_AFFINITY"
    echo "  Status: Updated"
  fi
done
```

## GitOps IPAM Configuration

Store IPAM configuration in Git:

```yaml
# ipam-config/production.yaml
apiVersion: projectcalico.org/v3
kind: IPAMConfiguration
metadata:
  name: default
spec:
  strictAffinity: true
  maxBlocksPerHost: 4
```

Apply via CI/CD:

```yaml
# .github/workflows/apply-ipam-config.yaml
name: Apply IPAM Configuration
on:
  push:
    paths:
      - 'ipam-config/**'

jobs:
  apply:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Apply IPAM configuration
        run: |
          calicoctl ipam configure --strictaffinity=$(grep strictAffinity ipam-config/production.yaml | awk '{print $2}')
          calicoctl ipam show --show-configuration
```

## IPAM Configuration Drift Detection

```bash
#!/bin/bash
# check-ipam-drift.sh

EXPECTED_STRICT_AFFINITY="true"

ACTUAL=$(calicoctl ipam show --show-configuration | grep StrictAffinity | awk '{print $2}')

if [ "$ACTUAL" = "$EXPECTED_STRICT_AFFINITY" ]; then
  echo "OK: IPAM configuration matches expected state"
else
  echo "DRIFT: StrictAffinity is $ACTUAL (expected $EXPECTED_STRICT_AFFINITY)"
  exit 1
fi
```

## Verification

```bash
# Verify configuration across clusters
./configure-ipam-fleet.sh true

# Check for drift
./check-ipam-drift.sh
```

## Troubleshooting

- **Configuration reverts after restart**: Ensure the configuration is persisted in the datastore. Check that no other automation is overwriting it.
- **Different clusters need different settings**: Use environment-specific configuration files and apply them selectively.
- **CI/CD pipeline cannot reach clusters**: Configure kubeconfig secrets for each target cluster in your CI/CD system.

## Conclusion

Automating IPAM configuration ensures consistency across your cluster fleet. By combining CI/CD pipelines with drift detection, you maintain predictable IP address management behavior and catch configuration changes before they cause allocation issues.
