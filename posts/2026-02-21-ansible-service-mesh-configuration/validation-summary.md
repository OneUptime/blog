# Validation Summary: How to Use Ansible for Service Mesh Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Kubernetes
- Istio service mesh
- Istio traffic management APIs
- Istio security APIs
- Istio Telemetry API
- EnvoyFilter local rate limiting
- Kiali

## Sources Consulted
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Telemetry API task documentation: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio Envoy rate limiting task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Ansible kubernetes.core.k8s module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible kubernetes.core.k8s_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_info_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html

## Issues Found
- The playbook used Istio 1.20.0, which is outside the current supported release window. Updated the example to Istio 1.30.0 and added `istio_major_version: "1.30"` so the Kiali addon URL resolves to the matching release branch.
- The install command used `meshConfig.enableTracing=true` without configuring a current tracing provider. Replaced it with Zipkin `extensionProviders` settings so the later Telemetry resource can reference a configured `zipkin` provider.
- Kubernetes module tasks did not pass `kubeconfig_path`, even though the command tasks did. Added `kubeconfig: "{{ kubeconfig_path }}"` to the `kubernetes.core.k8s` and `kubernetes.core.k8s_info` examples so they target the intended cluster.
- Several Kubernetes/Istio numeric fields lacked explicit type conversion, including VirtualService route weights, Envoy local rate limit token values, and Telemetry sampling percentage. Added Ansible type filters so the rendered values are numeric.
- The AuthorizationPolicy example placed the Ansible `loop` key inside the Kubernetes manifest, making it part of the resource definition instead of the Ansible task. Moved `loop` to the task level and made the generated policy names unique per service account.
- The Telemetry resource used `telemetry.istio.io/v1alpha1`. Updated it to `telemetry.istio.io/v1`, which is the current stable API documented by Istio.

## Review Notes
- The EnvoyFilter API is intentionally low-level and Istio warns that it exposes implementation details that may change during upgrades. The example now matches the current local rate limit shape, but production users should retest EnvoyFilter patches during Istio upgrades.
