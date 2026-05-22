# Validation Summary: How to Configure Istio for CRI-O Runtime

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Istio
- Istio CNI
- CRI-O
- Kubernetes
- OpenShift
- OpenShift Security Context Constraints
- crictl
- Kubernetes logging and kubelet log rotation

## Sources Consulted
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio OpenShift platform setup: https://istio.io/latest/docs/setup/platform-setup/openshift/
- Istio installation configuration profiles: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio CNI installation documentation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio OpenShift platform profile source: https://raw.githubusercontent.com/istio/istio/master/manifests/helm-profiles/platform-openshift.yaml
- Istio 1.30 release announcement: https://istio.io/latest/news/releases/1.30.x/announcing-1.30/
- Kubernetes runtime detection documentation: https://kubernetes.io/docs/tasks/administer-cluster/migrating-from-dockershim/find-out-runtime-you-use/
- Kubernetes logging architecture: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Kubernetes kubelet configuration API: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1
- CRI-O README and configuration docs: https://github.com/cri-o/cri-o and https://raw.githubusercontent.com/cri-o/cri-o/main/docs/crio.conf.5.md
- containers-registries.conf documentation: https://raw.githubusercontent.com/containers/image/main/docs/containers-registries.conf.5.md
- cri-tools crictl documentation: https://github.com/kubernetes-sigs/cri-tools/blob/master/docs/crictl.md
- Red Hat OpenShift Service Mesh documentation: https://docs.redhat.com/en/documentation/red_hat_openshift_service_mesh/latest/html/installing/ossm-installing-service-mesh

## Issues Found
- The post said the Istio `openshift` profile configures SCCs. Current upstream Istio describes this as an OpenShift platform profile, and the profile source shows OpenShift-specific chart values including Istio CNI settings. Updated the wording to avoid implying SCCs are the main mechanism.
- The SCC example granted `anyuid` and `privileged` to all service accounts in `istio-system`, but workload `istio-init` containers run under workload service accounts. Replaced this with a scoped example granting `privileged` to the workload service account in the workload namespace.
- The OpenShift Istio CNI example used the generic CNI config directory. Updated it to the current OpenShift platform profile values: CNI in `kube-system`, `/var/lib/cni/bin`, `/etc/cni/multus/net.d`, `istio-cni.conf`, `chained: false`, and `provider: multus`.
- The log rotation guidance used CRI-O `log_size_max`, which current CRI-O marks deprecated. Replaced it with kubelet configuration fields `containerLogMaxSize` and `containerLogMaxFiles`.
- The Istio image examples used Docker Hub and an old Istio 1.20 tag. Updated examples to the current Istio 1.30 image registry and tag, `registry.istio.io/proxyv2:1.30.0`.

## Review Notes
- The remaining CRI-O, Kubernetes, crictl, image registry, and Istio sidecar resource examples are consistent with the official documentation consulted.
- OpenShift installations may still differ by distribution policy and operator choice; Red Hat OpenShift Service Mesh is the supported productized path on OpenShift, while upstream Istio can be installed with the OpenShift platform profile.
