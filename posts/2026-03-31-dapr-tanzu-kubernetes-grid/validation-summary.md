# Validation Summary: How to Use Dapr with Tanzu Kubernetes Grid

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (distributed application runtime)
- VMware Tanzu Kubernetes Grid (TKG) 2.x
- Tanzu CLI
- Helm
- Kubernetes Pod Security Admission (PSA)
- Tanzu Observability / Wavefront
- OpenTelemetry (OTLP)
- Cluster API (ClusterResourceSet)
- NSX-T networking
- Wavefront Proxy

## Sources Consulted
- Dapr Configuration CRD source code (`pkg/config/configuration.go` in github.com/dapr/dapr) for OTel tracing spec field names and endpoint format
- Dapr Helm chart documentation (https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/#install-with-helm)
- Kubernetes Pod Security Admission documentation (https://kubernetes.io/docs/concepts/security/pod-security-admission/)
- VMware Tanzu CLI documentation for `tanzu cluster` commands
- NSX-T NCP (NSX Container Plugin) documentation for LoadBalancer service handling on vSphere
- AWS Load Balancer Controller annotation reference (to confirm `service.beta.kubernetes.io/aws-load-balancer-type` is AWS-specific)
- Cluster API Addon Provider documentation for ClusterResourceSet API

## Issues Found

### 1. AWS annotation used in NSX-T networking section
- **What was wrong:** The Service definition in the "Networking with NSX-T" section included the annotation `service.beta.kubernetes.io/aws-load-balancer-type: nlb`, which is an AWS-specific annotation for the AWS Load Balancer Controller. This annotation has no effect on NSX-T on vSphere.
- **What was changed:** Removed the `annotations` block entirely from the Service definition.
- **Why:** NSX-T handles `type: LoadBalancer` services natively through NCP without requiring any special annotations. The post itself states "NSX-T allocates an external IP automatically from the configured IP pool," which contradicts the need for any load balancer annotation.

### 2. Incorrect OTLP endpoint address for Wavefront
- **What was wrong:** The Dapr tracing configuration used `endpointAddress: "https://vmware.wavefront.com/report"`. This has two problems: (a) the `endpointAddress` field expects a bare `host:port` format without a URL scheme, as the Dapr source code strips schemes; (b) the Wavefront `/report` endpoint uses Wavefront's proprietary data format and does not accept OTLP data.
- **What was changed:** Changed to `endpointAddress: "wavefront-proxy.observability:4318"` pointing to a Wavefront proxy that accepts OTLP over HTTP, set `isSecure: false` for in-cluster communication, and updated the intro text to mention the Wavefront proxy requirement.
- **Why:** To send OTLP traces to Tanzu Observability, a Wavefront proxy must be deployed as an intermediary that receives OTLP data and translates it to Wavefront format. Port 4318 is the standard OTLP HTTP receiver port.

### 3. Singular `metric` field changed to plural `metrics`
- **What was wrong:** The configuration used `spec.metric.enabled` (singular).
- **What was changed:** Updated to `spec.metrics.enabled` (plural).
- **Why:** While Dapr's CRD accepts both `metric` and `metrics`, the plural form is the newer preferred convention. Using `metrics` ensures forward compatibility.

## Review Notes
- The Tanzu CLI installation via Homebrew (`brew install vmware-tanzu/tanzu/tanzu-cli`) and the `tanzu cluster` commands are correct.
- The Dapr Helm chart URL (`https://dapr.github.io/helm-charts/`) and installation flags (`global.ha.enabled`, `global.logLevel`) are correct.
- The Pod Security Admission labels and their values (`privileged`, `baseline`) are standard Kubernetes and appropriate for TKG 2.x.
- The ClusterResourceSet YAML uses the correct Cluster API addon API group (`addons.cluster.x-k8s.io/v1beta1`), though the example is intentionally minimal/illustrative.
- Note: VMware Tanzu products have been undergoing rebranding following the Broadcom acquisition. Some CLI commands and product names may change in future releases.
