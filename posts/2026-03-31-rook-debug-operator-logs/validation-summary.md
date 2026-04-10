# Validation Summary: How to Debug Rook Operator Logs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook-Ceph operator
- Kubernetes (kubectl CLI)
- Helm
- Ceph storage (OSDs, monitors, pools)

## Sources Consulted
- Rook GitHub repository operator.yaml: https://github.com/rook/rook/blob/master/deploy/examples/operator.yaml
- Rook Helm chart values.yaml: https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml
- Rook Helm chart configmap template: https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/templates/configmap.yaml
- Rook Operator Helm Chart docs: https://rook.io/docs/rook/latest-release/Helm-Charts/operator-chart/
- Rook OSD daemon source (pkg/daemon/ceph/osd/daemon.go): https://github.com/rook/rook/blob/master/pkg/daemon/ceph/osd/daemon.go
- Rook monitor source (pkg/operator/ceph/cluster/mon/mon.go): https://github.com/rook/rook/blob/master/pkg/operator/ceph/cluster/mon/mon.go
- Rook mon health troubleshooting docs: https://github.com/rook/rook/blob/master/Documentation/Storage-Configuration/Advanced/ceph-mon-health.md
- controller-runtime controller source: https://github.com/kubernetes-sigs/controller-runtime/blob/main/pkg/internal/controller/controller.go

## Issues Found

1. **`kubectl set env` for ROOK_LOG_LEVEL was not the recommended method.** The post used `kubectl set env deployment/rook-ceph-operator` to set `ROOK_LOG_LEVEL=DEBUG`. While this works, the operator reads `ROOK_LOG_LEVEL` from the `rook-ceph-operator-config` ConfigMap and watches it dynamically — so patching the ConfigMap is the recommended approach (no pod restart needed). Changed to `kubectl -n rook-ceph patch configmap rook-ceph-operator-config --type merge -p '{"data":{"ROOK_LOG_LEVEL":"DEBUG"}}'`.

2. **"reconciliation succeeded" log message was inaccurate.** The post claimed successful reconciliation shows `reconciliation succeeded`. The actual Rook operator message is `done reconciling ceph cluster in namespace`. Updated the text accordingly.

3. **OSD skip log message was fabricated.** The example `skipping device "sdb": no valid OSD found or the partition table is not GPT` does not exist in the Rook source. Real messages follow patterns like `skipping device "sdb" because it contains a filesystem "ext4"`. Replaced with the realistic message.

4. **Monitor quorum log message was inaccurate.** The example `failed to get mon quorum, retrying: ...` was a simplified version of the real message. The actual message is `failed to check mon health. failed to get mon quorum status: mon quorum status failed`. Replaced with the correct message.

5. **Controller rate limiting log message was fabricated.** The example `Reconciler rate limited, wait time: 10s` does not exist in either the Rook operator or the controller-runtime framework. Replaced with a more accurate description of controller requeueing behavior.

## Review Notes
- The core kubectl and Helm commands (log access, label selectors, Helm chart references, `--set logLevel` parameter) are all correct.
- The `app=rook-ceph-operator` and `app=rook-ceph-mon` label selectors are correct per the Rook source code and official docs.
- The `rook-release/rook-ceph` Helm chart reference matches the official installation documentation.
- The `--sort-by='.lastTimestamp'` flag on `kubectl get events` is correct but note that `.lastTimestamp` is deprecated in newer Kubernetes versions in favor of `.metadata.creationTimestamp` or the events.k8s.io/v1 API.
