# Validation Summary: How to Set Up Istio on KubeSphere Container Platform

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- KubeSphere Container Platform
- Istio
- Kubernetes
- kubectl
- KubeSphere Service Mesh
- Istio VirtualService and DestinationRule resources
- Bookinfo sample application

## Sources Consulted
- KubeSphere 3.4 Service Mesh documentation: https://www.kubesphere.io/docs/v3.4/pluggable-components/service-mesh/
- KubeSphere 3.4 Minimal KubeSphere on Kubernetes: https://www.kubesphere.io/docs/v3.4/quick-start/minimal-kubesphere-on-k8s/
- KubeSphere 3.4 Kubernetes installation prerequisites: https://www.kubesphere.io/docs/v3.4/installing-on-kubernetes/introduction/prerequisites/
- KubeSphere 3.4 Deploy and Access Bookinfo: https://www.kubesphere.io/docs/v3.4/quick-start/deploy-bookinfo-to-k8s/
- KubeSphere 3.4 Grayscale Release overview: https://www.kubesphere.io/docs/v3.4/project-user-guide/grayscale-release/overview/
- KubeSphere 3.4 Canary Release guide: https://www.kubesphere.io/docs/v3.4/project-user-guide/grayscale-release/canary-release/
- KubeSphere 3.4 Project Gateway documentation: https://www.kubesphere.io/docs/v3.4/project-administration/project-gateway/
- Istio Getting Started documentation: https://istio.io/latest/docs/setup/getting-started/
- Istio supported releases and Kubernetes compatibility: https://istio.io/latest/docs/releases/supported-releases/
- Istio KubeSphere platform setup page: https://istio.io/latest/docs/setup/platform-setup/kubesphere/

## Issues Found
- The prerequisites said Kubernetes 1.25+, but KubeSphere 3.4 documentation supports Kubernetes v1.20.x through v1.26.x and requires a default StorageClass. Updated the prerequisite list accordingly.
- The KubeSphere installation flow applied the remote `cluster-configuration.yaml` before enabling `servicemesh`, which is not the documented pre-installation flow. Updated the steps to download, edit, and then apply the local configuration.
- The installer log command targeted `deploy/ks-installer`, while KubeSphere's documented command selects the installer pod by label. Updated the command to the documented label-based form.
- The manual Istio download command fetched the latest Istio release but then changed into `istio-1.24.0`, which would fail unless the downloaded version happened to match. Updated the command to pin `ISTIO_VERSION=1.24.0` and added a warning that Istio 1.24 is no longer supported as of May 2026.
- The post claimed KubeSphere would detect a manually installed Istio and show mesh UI features. KubeSphere's service mesh UI features are tied to the KubeSphere Service Mesh component, so the text now distinguishes manual Istio APIs from KubeSphere's integrated service mesh UI.
- Several KubeSphere UI labels and feature requirements were imprecise. Updated "Composing App" to "Composed Apps", clarified that Bookinfo mesh traffic appears when KubeSphere Service Mesh and Application Governance are enabled, and corrected the gateway/app governance instructions.
- The Bookinfo sample commands assumed the reader was already in an Istio release directory, which is only true after a manual Istio download. Clarified that requirement and noted the KubeSphere console sample-app option.
- The post suggested directly editing the `istio` ConfigMap for detailed customization. Replaced that with a safer note to use supported Istio APIs and configuration fields for the Istio version installed by KubeSphere.
- The tracing section implied `istioctl dashboard jaeger` was generally available. KubeSphere's documented tracing depends on KubeSphere Service Mesh and logging/tracing components, so the access guidance was corrected to the KubeSphere console path.

## Review Notes
KubeSphere 3.4.1 is an older platform release, and current supported Istio releases in May 2026 target newer Kubernetes versions than KubeSphere 3.4.x officially supports. The post is still technically useful for KubeSphere 3.4.x environments, but production users should check both the KubeSphere and Istio support matrices before choosing a manual Istio version.
