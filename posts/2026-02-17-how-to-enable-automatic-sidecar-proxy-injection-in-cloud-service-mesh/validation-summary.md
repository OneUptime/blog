# Validation Summary: How to Enable Automatic Sidecar Proxy Injection in Cloud Service Mesh

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Service Mesh
- Managed Cloud Service Mesh / Managed Istiod
- Istio sidecar injection
- Envoy sidecar proxy
- Kubernetes mutating admission webhooks
- Kubernetes labels, annotations, Deployments, and Pods
- kubectl

## Sources Consulted
- Google Cloud Service Mesh: Onboard Kubernetes workloads, including current managed injection labeling guidance: https://docs.cloud.google.com/service-mesh/docs/onboarding/kubernetes-workloads
- Google Cloud Service Mesh: Control plane revisions and managed revision labels: https://docs.cloud.google.com/service-mesh/docs/revisions-overview
- Google Cloud Service Mesh: Managed service mesh troubleshooting and supported ControlPlaneRevision names: https://docs.cloud.google.com/service-mesh/docs/troubleshooting/troubleshoot-managed-service-mesh
- Istio: Installing the Sidecar and controlling injection policy: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio: Resource annotations reference for proxy resource and traffic-capture annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio: CNI node agent and init container behavior: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio: ProxyConfig reference for holdApplicationUntilProxyStarts: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Kubernetes: kubectl command reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The post said managed Cloud Service Mesh should always use the revision label `istio.io/rev`. Current Cloud Service Mesh documentation recommends default injection labels for managed Cloud Service Mesh, while revision-based injection is supported for existing Managed Istiod users. Updated the namespace-labeling commands and explanation accordingly.
- The namespace verification script only reported revision-based injection. Updated it to report both default injection (`istio-injection=enabled`) and revision-based injection.
- The revision-based namespace-labeling examples did not remove a possible `istio-injection` label. Google documentation warns that namespaces should not have both injection modes configured. Added `istio-injection-` to the revision-based examples.
- The post described per-pod injection overrides as annotations. Current Istio documentation documents `sidecar.istio.io/inject` as a pod label, and the annotation form is deprecated. Moved the disable-injection example to labels and removed the deprecated annotation from the enable-injection example.
- The post gave a fixed sizing rule of thumb for Envoy resources per 1000 requests per second. I could not verify that rule in official documentation, and proxy resource needs are workload-dependent. Replaced it with benchmarking and monitoring guidance.
- The post stated that sidecar traffic setup always uses the `istio-init` init container. Istio CNI can replace `istio-init`, and injected pods may use `istio-validation`. Updated the explanation and troubleshooting notes.

## Review Notes
- `kubectl` was not installed in the local workspace, so CLI syntax was checked against official Kubernetes and Google Cloud documentation rather than local `kubectl --help` output.
- Several Istio resource annotations used in the post are marked Alpha in the Istio reference. They are valid, but readers should verify support and behavior for their installed Cloud Service Mesh/Istio version before relying on them broadly.
