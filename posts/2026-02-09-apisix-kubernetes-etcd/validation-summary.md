# Validation Summary: How to Deploy Apache APISIX on Kubernetes with etcd Configuration Storage

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Apache APISIX
- Apache APISIX Admin API
- Apache APISIX Ingress Controller
- APISIX Helm charts
- Kubernetes Deployments, StatefulSets, Services, probes, and PersistentVolumeClaims
- etcd and etcdctl
- Helm
- kubectl

## Sources Consulted
- Apache APISIX 3.7.0 default configuration: https://github.com/apache/apisix/blob/3.7.0/conf/config-default.yaml
- Apache APISIX deployment modes documentation: https://apisix.apache.org/docs/apisix/3.12/deployment-modes/
- Apache APISIX Admin API documentation: https://apisix.apache.org/docs/apisix/admin-api/
- Apache APISIX Control API documentation: https://apisix.apache.org/docs/apisix/control-api/
- Apache APISIX Helm chart documentation: https://apisix.apache.org/docs/helm-chart/apisix/
- Apache APISIX Helm chart values: https://github.com/apache/apisix-helm-chart/blob/master/charts/apisix/values.yaml
- Apache APISIX Ingress Controller installation documentation: https://apisix.apache.org/docs/ingress-controller/install/
- Apache APISIX Ingress Controller Helm values: https://github.com/apache/apisix-helm-chart/blob/master/charts/apisix-ingress-controller/values.yaml
- Apache APISIX Ingress Controller v1.8.0 sample manifests: https://github.com/apache/apisix-ingress-controller/tree/v1.8.0/samples/deploy
- etcd Kubernetes StatefulSet operations guide: https://etcd.io/docs/v3.6/op-guide/kubernetes/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The etcd StatefulSet mounted `/var/lib/etcd` but did not set `ETCD_DATA_DIR`, so the persistent volume would not necessarily be used by etcd. Added `ETCD_DATA_DIR=/var/lib/etcd`.
- The etcd headless Service did not publish not-ready addresses, which can break static etcd bootstrap in Kubernetes. Added `publishNotReadyAddresses: true`.
- The APISIX `allow_admin` setting was placed under `apisix`, but APISIX expects it under `deployment.admin.allow_admin`. Moved the field to the correct location.
- The APISIX probes and status test used `/apisix/status`, but the `node-status` plugin that exposes that endpoint was not enabled. Added `node-status` to the plugin list.
- The APISIX plugin list included `prometheus-native`, which is not present in APISIX 3.7.0. Removed it.
- The APISIX container port for the Control API was listed as `9092`, while APISIX 3.7 defaults to `9090`. Corrected the port.
- The Helm repository URL used the older APISIX chart repository. Updated it to the current official `https://apache.github.io/apisix-helm-chart`.
- The APISIX Helm values used outdated keys such as `gateway` and top-level `admin`. Updated them to current chart keys under `service` and `apisix.admin`.
- The APISIX Ingress Controller raw manifest URLs pointed at `master` paths that now return 404. Pinned the sample manifest URLs to the working `v1.8.0` tag.
- The Ingress Controller Helm values used outdated `controller.config.apisix` keys. Updated them to current chart keys including `deployment.replicas`, `apisix.adminService`, and `gatewayProxy`.

## Review Notes
The manual Kubernetes manifests are suitable as tutorial examples, but production deployments should add TLS and authentication for etcd, replace the default APISIX Admin API key, avoid broad Admin API allowlists, and consider using an externally managed production etcd cluster instead of the APISIX chart's built-in etcd.
