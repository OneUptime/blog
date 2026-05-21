# Validation Summary: How to Install Istio on Virtual Machines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Istio virtual machine mesh expansion
- Kubernetes
- Envoy sidecar proxy
- WorkloadGroup and WorkloadEntry resources
- East-west gateways
- Mutual TLS

## Sources Consulted
- Istio virtual machine installation guide: https://istio.io/latest/docs/setup/install/virtual-machine/
- Istio VM architecture guide: https://istio.io/latest/docs/ops/deployment/vm-architecture/
- Istio WorkloadGroup reference: https://istio.io/latest/docs/reference/config/networking/workload-group/
- Istio WorkloadEntry reference: https://istio.io/latest/docs/reference/config/networking/workload-entry/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio multicluster `expose-istiod.yaml` sample: https://raw.githubusercontent.com/istio/istio/release-1.30/samples/multicluster/expose-istiod.yaml
- Istio 1.30.0 Debian and RPM sidecar package URLs under `https://storage.googleapis.com/istio-release/releases/1.30.0/`

## Issues Found
- The post said mTLS is enforced between all mesh members. Istio uses mTLS between sidecars when mutual TLS is enabled, but enforcement depends on mesh and workload policy, so the claim was narrowed.
- The prerequisites referenced Istio 1.14+ while the examples hard-coded Istio 1.24.0 sidecar packages. The post now points readers to a supported Istio installation and uses Istio 1.30.0 package URLs, which were verified to exist.
- The automatic WorkloadEntry registration and health checking sections assumed Istio was installed with the required pilot feature flags. The prerequisites now call out `PILOT_ENABLE_WORKLOAD_ENTRY_AUTOREGISTRATION=true` and `PILOT_ENABLE_WORKLOAD_ENTRY_HEALTHCHECKS=true`.
- The `expose-istiod.yaml` example used `AUTO_PASSTHROUGH` and only routed port 15012. It now follows Istio's official `expose-istiod` sample pattern by using `PASSTHROUGH`, wildcard hosts, and routes for both 15012 and 15017.
- The VM bootstrap command did not enable DNS capture, but the VM-to-Kubernetes verification used short Kubernetes service names. The command now includes `--capture-dns`, and the token regeneration command was updated to use the same relevant flags.
- The VM setup command copied `mesh.yaml` into `/etc/istio/config/mesh` without creating `/etc/istio/config`, and it omitted `/etc/istio/proxy`. The directory creation command now creates both paths.
- The ownership command used a group-qualified `istio-proxy:istio-proxy` ownership form. Istio's current VM guide uses `chown -R istio-proxy`, so the command was adjusted to match the documented sidecar package setup.
- The mTLS checking command targeted a Kubernetes WorkloadEntry name with `istioctl proxy-config secret`, which is not how the VM proxy is queried. It now reads the VM Envoy config dump from `localhost:15000` and passes it to `istioctl proxy-config secret --file -`.

## Review Notes
The east-west gateway installation is still a simplified manual example. Istio's documentation also provides generated gateway manifests for real deployments, especially multicluster or multinetwork installations.
