# Validation Summary: How to Add DRBD Support to Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.7.0)
- Talos Image Factory
- DRBD 9.2.x (Distributed Replicated Block Device)
- LINSTOR
- Piraeus Operator v2 (Piraeus Datastore)
- Kubernetes CSI (linstor.csi.linbit.com)
- Helm

## Sources Consulted
- Talos Linux system extensions docs: https://www.talos.dev/v1.7/talos-guides/configuration/system-extensions/
- Talos Image Factory: https://factory.talos.dev and https://www.talos.dev/v1.7/learn-more/image-factory/
- siderolabs/extensions catalog: https://github.com/siderolabs/extensions
- Talos machine config reference (install.image / install.extensions deprecation)
- Piraeus Operator v2 docs: https://github.com/piraeusdatastore/piraeus-operator/tree/v2
- LinstorSatelliteConfiguration / LinstorCluster API reference (api/v1)
- LINSTOR CSI driver parameters: https://github.com/LINBIT/linstor-csi
- DRBD 9 user guide (LINBIT): proc/drbd, drbdsetup status, drbdadm status
- Piraeus Helm chart values: https://github.com/piraeusdatastore/piraeus-operator/tree/v2/charts/piraeus

## Issues Found

1. **Deprecated `machine.install.extensions` block.** The original post installed extensions through `machine.install.extensions`, which was deprecated/removed in Talos 1.5+. In v1.7 you must bake the extension into the installer with the Image Factory and reference it via `machine.install.image`. Reordered the section so Image Factory comes first, then the worker config consumes the resulting installer image.

2. **Upgrade command used the stock installer.** `talosctl ... upgrade --image ghcr.io/siderolabs/installer:v1.7.0` would not include the DRBD extension (and would in fact strip it). Replaced with the Image Factory installer URL `factory.talos.dev/installer/${SCHEMATIC_ID}:v1.7.0`.

3. **Invalid Piraeus Operator v2 Helm flags.** `--set operator.controller.enabled=true` and `--set operator.csi.enabled=true` are not values in the v2 chart (they look like v1 patterns). Removed them.

4. **Missing `LinstorCluster` resource.** In Piraeus Operator v2 the operator alone does not deploy the LINSTOR controller or CSI driver — you must apply a `LinstorCluster` CR. Added a minimal `LinstorCluster` manifest immediately after the Helm install, otherwise later references to `deploy/linstor-controller` would not exist.

5. **DRBD 9 `/proc/drbd` example was DRBD 8.x format.** In DRBD 9, `/proc/drbd` only reports the module version (`version: 9.2.6 (api:2/proto:118-122) GIT-hash: ...`); per-resource state lives in `drbdsetup status` / `drbdadm status`. Replaced the misleading `0: cs:Connected ro:Primary/Secondary ds:UpToDate/UpToDate` line with the correct version-only output and an example `drbdsetup status` invocation/output.

6. **Redundant LINSTOR CSI parameter.** The StorageClass set both `linstor.csi.linbit.com/placementCount: "2"` and the legacy alias `linstor.csi.linbit.com/autoPlace: "2"`. They map to the same setting; removed `autoPlace` and kept `placementCount`.

## Review Notes
- The DRBD extension tag `ghcr.io/siderolabs/drbd:9.2.6-v1.7.0` follows the standard Talos extension format (`<software-version>-<talos-version>`) but the exact tag was not verified against the live registry. Readers should `crane ls ghcr.io/siderolabs/drbd` (or browse the extensions catalog) and pin to a tag that matches their Talos version.
- The post defines storage pools in both `LinstorSatelliteConfiguration.spec.storagePools` and via manual `linstor storage-pool create` commands. The operator will create the pool automatically from the satellite config, so the manual commands are usually unnecessary. Left as-is because the post presents them as alternatives ("Or create a file-based pool for testing").
- The Helm install uses the `piraeus-charts` repo at `https://piraeus.io/helm-charts/`, which is valid for v2. The v2 OCI install (`oci://ghcr.io/piraeusdatastore/piraeus-operator/piraeus`) is also documented and would be an alternative.
- `talosctl -n $node health` works against a single node, but the `health` subcommand is really a cluster-wide check; `talosctl -n $node version` or `talosctl -n $node service` is a more targeted readiness probe per node. Left unchanged as the original usage still functions.
- The default Piraeus namespace in the v2 docs is `piraeus-datastore`. The post uses `piraeus-system`, which works but readers copying snippets from upstream docs may need to adjust.
- The DRBD 9.2.6 release predates several later fixes; readers should consider pinning to a more recent 9.2.x release when reproducing this guide.
