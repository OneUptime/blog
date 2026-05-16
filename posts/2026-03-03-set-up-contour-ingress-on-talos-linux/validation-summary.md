# Validation Summary: How to Set Up Contour Ingress on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Project Contour (ingress controller)
- Envoy proxy
- Kubernetes (Ingress, CRDs)
- Contour HTTPProxy custom resource
- Helm 3 (Bitnami chart)
- MetalLB (mentioned for bare-metal scenarios)
- talosctl
- kubectl

## Sources Consulted
- Project Contour official site: https://projectcontour.io/
- Project Contour GitHub: https://github.com/projectcontour/contour
- Contour HTTPProxy reference (timeoutPolicy / retryPolicy / includes / TLS minimumProtocolVersion fields)
- Contour quickstart manifest URL: https://projectcontour.io/quickstart/contour.yaml
- Bitnami Contour Helm chart: https://github.com/bitnami/charts/tree/main/bitnami/contour (verified envoy.service.type / envoy.service.nodePorts.{http,https} value paths)
- Kubernetes Ingress v1 API (networking.k8s.io/v1) reference
- Talos Linux talosctl resource reference (addresses / routes resource types, -n NODE flag)

## Issues Found
- **Incorrect attribution of Contour's origin.** The post claimed Contour was "originally created at VMware (now Broadcom)." Contour was created at Heptio in 2017; Heptio was acquired by VMware in 2018, and VMware was later acquired by Broadcom. Updated the sentence to reflect the Heptio origin and the subsequent acquisitions so the lineage is accurate.

## Review Notes
- HTTPProxy field names and structure (`virtualhost.fqdn`, `routes[].conditions[].prefix`, `services[].weight`, `timeoutPolicy.{response,idle}`, `retryPolicy.{count,perTryTimeout}`, `includes[]`, `tls.minimumProtocolVersion`) match the current `projectcontour.io/v1` API.
- The standard Kubernetes Ingress example uses `networking.k8s.io/v1` with `ingressClassName: contour`, which is the correct modern form.
- The Bitnami Contour chart value paths (`envoy.service.type`, `envoy.service.nodePorts.http`, `envoy.service.nodePorts.https`) are correct. Note that the Bitnami public chart repository has been undergoing changes in 2025 (some images / charts moving to a paid registry); readers may want to also consider the project's own OCI chart at `oci://ghcr.io/projectcontour/charts/contour` as an alternative — left unchanged because the Bitnami path still works at the time of review.
- Contour is confirmed as a CNCF Incubating project (as stated on projectcontour.io).
- The pod label selectors `app=contour` and `app=envoy` match the labels used by the official quickstart manifests.
- `talosctl get addresses` and `talosctl get routes` with `-n <NODE_IP>` are valid; both are standard Talos network resource types.
- HTTPProxy child proxies legitimately omit `virtualhost` (only the root proxy carries it) — the delegation example is structured correctly.
