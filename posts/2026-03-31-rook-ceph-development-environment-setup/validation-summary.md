# Validation Summary: How to Set Up a Ceph Development Environment

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (Reef v18.2.x)
- Rook (Rook-Ceph operator, Helm chart)
- Kubernetes (minikube, kind)
- kubectl
- Helm
- Docker
- Loop devices for OSD storage

## Sources Consulted
- kind configuration documentation: https://kind.sigs.k8s.io/docs/user/configuration/
- Rook Ceph operator Helm chart: https://rook.io/docs/rook/latest-release/Helm-Charts/operator-chart/
- Rook Ceph Helm chart values.yaml: https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml
- Rook Ceph toolbox documentation: https://rook.io/docs/rook/latest-release/Troubleshooting/ceph-toolbox/
- minikube start command documentation: https://minikube.sigs.k8s.io/docs/commands/start/
- Ceph Reef release notes: https://docs.ceph.com/en/reef/releases/

## Issues Found

1. **Loop device script used wrong container name for first worker node**: The original script used `ceph-dev-worker${i}` with `i` iterating `1 2 3`, producing `ceph-dev-worker1` as the first name. However, kind names the first worker `ceph-dev-worker` (no number suffix), so `docker exec ceph-dev-worker1` would fail. Fixed the loop to explicitly iterate over `ceph-dev-worker ceph-dev-worker2 ceph-dev-worker3`.

2. **Missing Rook toolbox deployment step**: The post ran `kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash` without first deploying the toolbox. The Rook toolbox is not included with the operator or CephCluster deployment and must be deployed separately. Added the `kubectl apply` command to deploy the toolbox manifest before the exec command.

3. **`--extra-disks` used with unsupported driver**: The minikube `--extra-disks` flag was paired with `--driver=virtualbox`, but this flag is only supported with `kvm2`, `hyperkit`, `qemu2`, and similar VM-based drivers. Changed to `--driver=kvm2`.

4. **Ambiguous dual minikube start commands**: Two sequential `minikube start` commands with different drivers (docker and virtualbox) appeared as if they should both be run in sequence. Clarified that the second command is an alternative for when extra disks are needed, not a follow-up step.

## Review Notes
- The Ceph image `quay.io/ceph/ceph:v18.2.0` is valid but outdated; the latest Reef release is v18.2.8. Additionally, Ceph Reef reached end-of-life around March 2026. For new development environments, users may want to consider Ceph Squid (v19.x) instead. This was not changed in the post since v18.2.0 remains functional for development purposes and the post's configuration is still applicable.
- The `kind.x-k8s.io/v1alpha4` API version, Helm repo URL, Helm chart values (`csi.enableRbdDriver`, `csi.enableCephfsDriver`, `logLevel`), and CephCluster CRD fields were all verified as correct.
- The CephCluster node names (`ceph-dev-worker`, `ceph-dev-worker2`, `ceph-dev-worker3`) correctly match kind's naming convention for the configured cluster.
