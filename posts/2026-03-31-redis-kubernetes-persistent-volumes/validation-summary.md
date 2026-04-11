# Validation Summary: How to Configure Redis Persistent Volumes in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis 7.x (redis:7-alpine, redis:7.2-alpine)
- Kubernetes (StorageClass, PersistentVolumeClaim, Pod, StatefulSet)
- AWS EBS (gp3 volumes via CSI driver)
- kubectl CLI

## Sources Consulted
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes PersistentVolumeClaims documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StatefulSet volumeClaimTemplates documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- AWS EBS CSI Driver documentation: https://github.com/kubernetes-sigs/aws-ebs-csi-driver
- Kubernetes CSI Migration documentation: https://kubernetes.io/docs/concepts/storage/volumes/#csi-migration
- Redis persistence configuration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/

## Issues Found

1. **Deprecated in-tree AWS EBS provisioner**: The StorageClass used `provisioner: kubernetes.io/aws-ebs`, which is the deprecated in-tree provisioner. CSI migration for AWS EBS was GA in Kubernetes 1.24, and in-tree storage plugins are being removed from Kubernetes. Changed to `provisioner: ebs.csi.aws.com` (the AWS EBS CSI driver).

2. **Incorrect `--save` argument format in Pod YAML**: The command array had `"900 1"` as a single string argument to `--save`. Redis's command-line argument parser converts `--option value` pairs into config file format lines. Passing `"900 1"` as one argument produces the config line `save "900 1"` (2 tokens), but the `save` directive requires 3 tokens (directive name, seconds, changes). Split into separate arguments `"900"` and `"1"` so Redis constructs the correct config line `save "900" "1"`.

## Review Notes
- The StatefulSet references a ConfigMap `redis-config` that is not defined in the post. This is not an error since the post focuses on persistent volume configuration, but readers will need to create this ConfigMap separately.
- The StatefulSet does not define a headless Service, which is required for StatefulSet DNS-based pod discovery. Again, this is outside the scope of the post but worth noting for readers implementing this.
- The PVC naming convention (`redis-data-redis-0`, etc.) is correctly documented.
- All kubectl commands use correct syntax and flags.
- The volume expansion procedure is correct and properly notes the `allowVolumeExpansion: true` prerequisite.
