# Validation Summary: How to Debug Why Sidecar is Not Being Injected

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Istio sidecar injection
- Kubernetes mutating admission webhooks
- Kubernetes namespaces, labels, pods, deployments, and events
- Istio CNI
- Kubernetes Pod Security Standards / Pod Security Admission
- Google Kubernetes Engine / Cloud Service Mesh private cluster firewalling

## Sources Consulted
- Istio documentation: Installing the Sidecar - https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio documentation: Sidecar Injection Problems - https://istio.io/latest/docs/ops/common-problems/injection/
- Istio documentation: Verifying Istio Sidecar Injection with Istioctl Check-Inject - https://istio.io/latest/docs/ops/diagnostic-tools/check-inject/
- Istio reference: Resource Labels - https://istio.io/latest/docs/reference/config/labels/
- Istio reference: Resource Annotations - https://istio.io/latest/docs/reference/config/annotations/
- Istio reference: istioctl kube-inject command - https://istio.io/latest/docs/reference/commands/istioctl/
- Istio documentation: Install Istio with Pod Security Admission - https://istio.io/latest/docs/setup/additional-setup/pod-security-admission/
- Istio documentation: Install the Istio CNI node agent - https://istio.io/latest/docs/setup/additional-setup/cni/
- Kubernetes documentation: Pod Security Standards - https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Google Cloud documentation: Open ports on a private cluster - https://docs.cloud.google.com/service-mesh/docs/operate-and-maintain/private-cluster-open-port

## Issues Found
- The post said revision labels and `istio-injection` labels cannot both be used. Istio documents that if both are present, `istio-injection` takes precedence. Updated the wording to reflect precedence and advise removing the unintended label.
- The post treated `sidecar.istio.io/inject` as a pod annotation. Istio currently documents the label as the supported control and the annotation as deprecated. Updated the section and primary commands to inspect pod/template labels, while retaining an annotation check for older manifests.
- The webhook examples omitted revision-specific injector names such as `istio-sidecar-injector-<revision>`. Added that expected form.
- The post said webhook reachability failures create pods without sidecars silently. Istio documents that invoked webhook failures usually fail pod creation and surface in Deployment status or namespace events. Updated the explanation and replaced the readiness check with an endpoint check for `istiod`.
- The GKE note referred to a GKE CNI guide. The relevant current Google Cloud guidance is the Cloud Service Mesh private cluster port-opening guide for port 15017. Updated the wording.
- The `kube-inject` preview command only supplied mesh config and called it a dry-run. Updated it to render to stdout with inject config, mesh config, and values files, matching documented `istioctl kube-inject` inputs.
- The Pod Security section said changing to `baseline` would allow the Istio init container. Istio and Kubernetes documentation show that `baseline` does not allow `NET_ADMIN`/`NET_RAW`. Updated the remediation to use Istio CNI or a policy that explicitly allows the required capabilities.

## Review Notes
The guide is technically relevant and useful. Future improvements could add `istioctl experimental check-inject` as a first-class diagnostic command, but I did not add a new section because the requested edits were limited to correcting technical inaccuracies.
