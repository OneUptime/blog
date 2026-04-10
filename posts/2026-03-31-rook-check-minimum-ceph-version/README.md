# How to Check Minimum Ceph Version for Rook Upgrades

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Version, Upgrade, Compatibility

Description: Learn how to check Ceph version compatibility requirements before upgrading Rook to avoid unsupported configurations and failed upgrades.

---

Rook manages Ceph daemons using container images. Each Rook version supports a specific range of Ceph versions. Upgrading Rook to a version that requires a newer Ceph release than you are running - or that drops support for your current Ceph version - requires a coordinated upgrade of both components.

## Rook and Ceph Version Compatibility

Rook maps to specific Ceph releases. The compatibility information is published on the Rook upgrade documentation at `https://rook.io/docs/rook/latest/Upgrade/ceph-upgrade/` and in the CephCluster CRD documentation.

Example compatibility:

```text
Rook v1.14.x supports:
  - Ceph Reef (v18.x) - recommended
  - Ceph Quincy (v17.x) - minimum

Rook v1.15.x supports:
  - Ceph Squid (v19.x) - recommended
  - Ceph Reef (v18.x) - supported
```

## Checking Current Ceph Version

Check the running Ceph version using the toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph version
```

```text
ceph version 18.2.0 (abc123def456) reef (stable)
```

The version string contains both the version number and the release name (reef, quincy, pacific, etc.).

Check all daemon versions to ensure they are consistent:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph versions
```

```json
{
    "mon": {
        "ceph version 18.2.0 (abc123) reef (stable)": 3
    },
    "mgr": {
        "ceph version 18.2.0 (abc123) reef (stable)": 1
    },
    "osd": {
        "ceph version 18.2.0 (abc123) reef (stable)": 6
    },
    "mds": {
        "ceph version 18.2.0 (abc123) reef (stable)": 2
    }
}
```

All daemons should show the same version. Mixed versions indicate a partially completed previous upgrade.

## Checking the Configured Ceph Image

The Ceph version used by Rook is configured in the CephCluster CR:

```bash
kubectl -n rook-ceph get cephcluster rook-ceph \
  -o jsonpath='{.spec.cephVersion.image}'
```

```text
quay.io/ceph/ceph:v18.2.0
```

This is the image Rook uses to run Ceph daemons. If you want to upgrade to a newer Ceph patch release, update this image tag.

## Minimum Ceph Version for Target Rook

The minimum Ceph version for your target Rook release is in the Rook documentation. Verify your current Ceph version meets the minimum:

```bash
#!/bin/bash

TARGET_ROOK="v1.15.0"
MINIMUM_CEPH="17.2.0"  # quincy minimum for Rook v1.15

CURRENT_CEPH=$(kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
  ceph version --format json | python3 -c "
import json, sys
d = json.load(sys.stdin)
print(d['version'].split()[2])
")

echo "Current Ceph version: ${CURRENT_CEPH}"
echo "Minimum required for Rook ${TARGET_ROOK}: ${MINIMUM_CEPH}"

python3 -c "
import sys
def parse_ver(s):
    return tuple(int(x) for x in s.split('.'))
current = parse_ver('${CURRENT_CEPH}')
minimum = parse_ver('${MINIMUM_CEPH}')
if current >= minimum:
    print('PASS: Version requirement met')
else:
    print('FAIL: Ceph upgrade required before Rook upgrade')
    sys.exit(1)
"
```

## Checking Minimum Feature Requirements

Some Rook features require specific Ceph capabilities. Check if your Ceph version supports the features you are using:

```bash
# Check if RADOS namespace support is available (requires Ceph Pacific+)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph tell osd.0 help | grep -i namespace

# Check connected daemon and client feature flags
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph features
```

## Upgrading Ceph Before Rook

If your Ceph version is below the minimum for the target Rook version, upgrade Ceph first by updating the image in the CephCluster CR:

```yaml
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.0
    allowUnsupported: false
```

Apply the change:

```bash
kubectl -n rook-ceph patch cephcluster rook-ceph \
  --type merge \
  -p '{"spec":{"cephVersion":{"image":"quay.io/ceph/ceph:v18.2.0"}}}'
```

The Rook operator will perform a rolling update of all Ceph daemons. Monitor the upgrade:

```bash
watch -n 10 "kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph versions"
```

Wait until all daemons show the new version before proceeding with the Rook operator upgrade.

## Verifying Ceph Upgrade Compatibility

Ceph itself has a version skew limitation - you can only upgrade one major version at a time. If you are running Ceph Pacific (v16) and need Ceph Squid (v19), you must upgrade through Quincy (v17) and Reef (v18) first.

```text
Allowed upgrade paths:
  Pacific (v16) -> Quincy (v17) -> Reef (v18) -> Squid (v19)

NOT allowed:
  Pacific (v16) -> Reef (v18)  [skips Quincy]
  Pacific (v16) -> Squid (v19) [skips two versions]
```

Plan your upgrade path accordingly when multiple version jumps are required.

## Summary

Verifying minimum Ceph version compatibility before Rook upgrades requires checking the current Ceph version with `ceph version` and `ceph versions`, comparing it against the minimum required for the target Rook release, and upgrading Ceph first if needed by updating the `cephVersion.image` in the CephCluster CR. Remember that Ceph itself only supports single major version upgrades, so plan a sequential upgrade path when jumping multiple versions.
