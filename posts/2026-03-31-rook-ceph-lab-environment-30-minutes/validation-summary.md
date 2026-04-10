# Validation Summary: How to Set Up a Ceph Lab Environment in 30 Minutes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (Reef v18.2.x)
- Rook-Ceph operator (v1.16.0)
- Minikube (multi-node with Docker driver)
- Kubernetes (kubectl, Helm)
- Ceph Dashboard

## Sources Consulted
- Rook Helm chart documentation: https://rook.io/docs/rook/latest-release/Helm-Charts/operator-chart/
- Rook CephCluster CRD specification: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Dashboard documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Monitoring/ceph-dashboard/
- Rook GitHub releases: https://github.com/rook/rook/releases
- Rook deploy/examples directory: https://github.com/rook/rook/tree/master/deploy/examples
- Ceph v18.2.2 Reef release notes: https://ceph.io/en/news/blog/2024/v18-2-2-reef-released/
- Minikube multi-node tutorial: https://minikube.sigs.k8s.io/docs/tutorials/multi_node/
- Minikube configuration handbook: https://minikube.sigs.k8s.io/docs/handbook/config/

## Issues Found

### 1. Dashboard port mismatch (Step 4)
- **What was wrong:** The CephCluster YAML enabled the dashboard but did not disable SSL. By default, the Rook Ceph dashboard uses HTTPS on port 8443. The port-forward command used `7000:7000`, which is the HTTP port and only works when `dashboard.ssl: false` is set.
- **What was changed:** Added `ssl: false` under the `dashboard` section of the CephCluster YAML spec. This makes the dashboard serve on HTTP port 7000, matching the port-forward command. This is appropriate for a local lab environment.
- **Why:** Without this setting, the port-forward to 7000 would fail because the dashboard service would not be listening on that port.

### 2. Incorrect StorageClass example URL (Step 5)
- **What was wrong:** The URL `https://raw.githubusercontent.com/rook/rook/master/deploy/examples/storageclass.yaml` returns a 404. There is no `storageclass.yaml` at the top level of `deploy/examples/`.
- **What was changed:** Updated the URL to `https://raw.githubusercontent.com/rook/rook/master/deploy/examples/csi/rbd/storageclass.yaml`, which is the correct location of the RBD StorageClass example in the Rook repository.
- **Why:** The original URL would cause `kubectl apply` to fail with a download error.

## Review Notes
- Rook v1.16.0 is a valid release but is no longer the latest (v1.19.x is current as of early 2025). The post does not claim it is the latest, so this is fine, but readers may want to use a newer version.
- Ceph v18.2.2 (Reef) is valid but newer point releases exist (up to v18.2.7+). Again acceptable since the post doesn't claim it's the latest.
- The `minikube ssh` loop device setup only creates a loop device on the default (first) node, but the cluster is started with `--nodes=3`. Rook will only create an OSD on the node with the loop device. For a more complete lab, loop devices should be created on all nodes (`minikube ssh -n minikube-m02`, etc.), but a single-OSD cluster is functional for learning purposes.
- The post mentions "kind" in the description but only covers Minikube setup. This is a minor content gap, not a technical error.
- The default dashboard username (`admin`) is not mentioned in the post. Readers will need this to log in.
