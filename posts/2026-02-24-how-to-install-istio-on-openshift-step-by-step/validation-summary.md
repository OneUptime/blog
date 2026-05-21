# Validation Summary: How to Install Istio on OpenShift Step by Step

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Istio
- OpenShift
- Kubernetes
- Security Context Constraints
- Istio CNI
- OpenShift Routes
- Kubernetes NetworkPolicy
- OpenShift monitoring and ServiceMonitor resources

## Sources Consulted
- Istio OpenShift platform setup: https://istio.io/latest/docs/setup/platform-setup/openshift/
- Istio CNI node agent documentation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio installation configuration profiles: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio 1.30 release announcement: https://istio.io/latest/news/releases/1.30.x/announcing-1.30/
- Istio download documentation: https://istio.io/latest/docs/setup/additional-setup/download-istio-release/
- OpenShift monitoring troubleshooting and ServiceMonitor documentation: https://docs.openshift.com/container-platform/4.18/support/troubleshooting/diagnosing-oc-issues.html
- OpenShift ingress and route documentation: https://docs.openshift.com/container-platform/4.14/networking/ingress-sharding.html

## Issues Found
- The download command fetched the latest Istio release but then changed into a hardcoded `istio-1.24.0` directory. Updated the commands to set `ISTIO_VERSION=1.30.0` and use `cd istio-$ISTIO_VERSION`.
- The prerequisite said OpenShift 4.12+ without tying that to Istio's Kubernetes support matrix. Updated it to require an OpenShift cluster whose Kubernetes version is supported by the chosen Istio release.
- The SCC section implied application namespaces with sidecars always need `anyuid` and `privileged` SCCs. Updated the text to explain that Istio CNI avoids privileged init containers for application pods and that privileged SCC grants are only a non-CNI fallback or separate workload requirement.
- The Istio CNI configuration set `values.cni.chained: false`, which conflicts with Istio's documented chained CNI behavior on Kubernetes/OpenShift. Changed it to `true`.
- The OpenShift Route command omitted the ingress gateway service port. Updated it to `oc expose svc/istio-ingressgateway -n istio-system --port=http2`, matching Istio's OpenShift documentation.
- The NetworkPolicy section described namespace isolation as the OpenShift 4.x OVN-Kubernetes default. Reworded it to apply only when the cluster enforces namespace isolation with NetworkPolicy.
- The monitoring section described OpenShift's built-in monitoring as "Prometheus + Grafana". Updated it to the documented OpenShift monitoring stack and noted that user workload monitoring must be enabled before scraping user project metrics with ServiceMonitor resources.

## Review Notes
The post remains a practical upstream-Istio-on-OpenShift guide. Future updates should re-check the pinned Istio version and Kubernetes/OpenShift compatibility table, because Istio's supported release window changes quarterly.
