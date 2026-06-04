# Validation Summary: How to Implement DaemonSet with hostNetwork for Node-Level Networking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes DaemonSet
- Kubernetes hostNetwork and hostPID
- Kubernetes DNS policies
- Kubernetes NetworkPolicy
- Kubernetes ValidatingAdmissionPolicy
- MetalLB speaker
- Prometheus node_exporter and PromQL recording/alerting rules
- tcpdump packet capture
- Go Kubernetes API types

## Sources Consulted
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes PodSecurityPolicy documentation: https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Kubernetes Validating Admission Policy documentation: https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/
- Kubernetes ValidatingAdmissionPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-admission-policy-v1/
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB v0.15.3 native manifest: https://raw.githubusercontent.com/metallb/metallb/v0.15.3/config/manifests/metallb-native.yaml
- Prometheus node_exporter README and Docker guidance: https://github.com/prometheus/node_exporter
- Prometheus node_exporter releases: https://github.com/prometheus/node_exporter/releases
- tcpdump manual page: https://www.tcpdump.org/manpages/tcpdump.1.html

## Issues Found
- The MetalLB speaker example used an older `quay.io/metallb/speaker:v0.13.0` manifest shape and incorrect current memberlist/metrics port details. Updated it to align with the v0.15.3 native manifest, including the current image, `METALLB_POD_NAME`, memberlist secret path, port names, memberlist TCP/UDP port 7946, and required volume mounts.
- The node_exporter example used `prom/node-exporter:v1.7.0` and the older `--collector.netclass.ignored-devices` flag. Updated the image to `quay.io/prometheus/node-exporter:v1.11.1` and changed the network metric exclusion to the current `--collector.netdev.device-exclude` flag documented by upstream node_exporter.
- The reserved port ConfigMap listed `9472` for MetalLB speaker, but the current MetalLB speaker manifest exposes metrics on `7472` and memberlist on `7946`. Updated the reserved port list accordingly.
- The Go admission webhook helper only detected duplicate `hostPort` declarations inside one pod and missed the important hostNetwork behavior where declared container ports occupy host ports. Updated the helper to include reserved ports, protocol-aware keys, and hostNetwork container port handling.
- The security policy example used `policy/v1beta1` `PodSecurityPolicy`, which was deprecated in Kubernetes v1.21 and removed in Kubernetes v1.25. Replaced it with a current `admissionregistration.k8s.io/v1` `ValidatingAdmissionPolicy` and binding.
- The NetworkPolicy section implied that NetworkPolicies universally limit hostNetwork pod traffic. Updated the wording to clarify that this only applies when the CNI plugin enforces policy for hostNetwork pods.
- The NetworkPolicy selector used `hostNetwork: "true"` but the example pods did not carry that label. Added the label to the relevant DaemonSet pod templates.

## Review Notes
- The YAML snippets were parsed successfully with PyYAML.
- Go tooling was not installed in the environment, so the Go snippet could not be compiled or formatted with `gofmt`.
- `ValidatingAdmissionPolicy` can validate declared pod fields such as `hostNetwork` and declared container ports, but it cannot prove which undeclared ports a process will bind at runtime. Runtime enforcement still needs host firewall rules, CNI-specific policy, or operational controls.
