# Validation Summary: How to Tune Calico on IBM Kubernetes Service for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IBM Kubernetes Service
- Calico
- calicoctl
- Kubernetes
- Tigera Operator
- IBM Cloud Monitoring
- IBM Cloud CLI

## Sources Consulted
- IBM Cloud Kubernetes Service limitations: https://cloud.ibm.com/docs/containers?topic=containers-limitations
- IBM Cloud network policies and Calico CLI setup: https://cloud.ibm.com/docs/containers?topic=containers-network_policies
- IBM Cloud Calico debugging and namespace guidance: https://cloud.ibm.com/docs/containers?topic=containers-calico_log_level
- IBM Cloud Kubernetes Service CLI reference: https://cloud.ibm.com/docs/containers?interface=ui&topic=containers-kubernetes-service-cli
- IBM Cloud Calico MTU tuning documentation: https://cloud.ibm.com/docs/containers?topic=containers-kernel
- IBM Cloud Monitoring Kubernetes cluster documentation: https://cloud.ibm.com/docs/monitoring?topic=monitoring-kubernetes_cluster
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics

## Issues Found
- The post claimed IKS administrators have access to the full Calico tuning API and should tune IPAM, BGP, Felix, and Typha directly. IBM documentation states that changing Calico components, default settings, default IPPool resources, daemon sets, deployments, and Calico nodes is not supported. Updated the introduction and workflow to focus on IBM-supported Calico operations.
- The IPPool patch examples changed `ipipMode`, `vxlanMode`, and `natOutgoing` on `default-ipv4-ippool`. IBM documentation explicitly lists default IPPool modification as unsupported on IKS. Replaced the patch commands with supported `calicoctl` setup and inspection commands.
- The FelixConfiguration example changed default Felix settings and enabled metrics directly. Because IBM does not support modifying default Calico settings directly, replaced it with supported MTU tuning through `installation.operator.tigera.io`.
- The Typha section patched the `calico-typha` Deployment replica count in `kube-system`. IBM documentation says Calico components run in `calico-system` for IKS 1.29 and later, and that the Calico operator determines Typha pod count in newer clusters. Replaced the patch with a cross-version pod check and operator-managed guidance.
- The resource limits section patched the `calico-node` DaemonSet. IBM documentation says modifying Calico daemon sets is unsupported. Replaced it with resource inspection commands and a support-escalation recommendation.
- The monitoring section created a Service for Felix metrics in `kube-system`. Current IBM Monitoring documentation uses the IBM Cloud Monitoring agent, and Calico component namespaces differ by IKS version. Replaced the Service with IBM Monitoring agent verification and cross-version Calico log collection.
- The BGP section implied direct multi-zone BGP configuration on IKS. Updated it to review BGP state only when the deployment uses BGP and to avoid creating or patching BGP peers without IBM Support confirmation.
- The verification commands restarted `calico-node` in `kube-system` and inspected default Calico settings. Replaced the restart with non-disruptive Calico pod, Tigera Installation, IPPool, and policy checks.

## Review Notes
The original commands were mostly syntactically plausible for self-managed Calico, but they were not appropriate for IBM Kubernetes Service because IKS treats the Calico plug-in and default resources as managed service components. The corrected guide is intentionally more conservative and version-aware, especially for the IKS 1.29 namespace change from `kube-system` to `calico-system`.
