# Validation Summary: How to Use Ansible to Configure Service Mesh (Istio)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- kubernetes.core Ansible collection
- Kubernetes
- Istio
- istioctl
- Istio PeerAuthentication
- Istio DestinationRule, VirtualService, and Gateway resources

## Sources Consulted
- Istio installation configuration profiles: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio installation customization: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio authentication policy documentation: https://istio.io/latest/docs/tasks/security/authentication/authn-policy/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio traffic management reference: https://istio.io/latest/docs/reference/config/networking/
- Ansible kubernetes.core.k8s module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible kubernetes.core.k8s_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_info_module.html
- Ansible from_yaml_all filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/from_yaml_all_filter.html

## Issues Found
- The prerequisite Python packages included `openshift`, which is not listed in the current `kubernetes.core.k8s` module requirements. Updated the command to install `kubernetes`, `PyYAML`, and `jsonpatch`.
- The installation example used Istio `1.20.2`, which is outdated for a 2026 post. Updated the default version to Istio `1.30.0`, matching the current Istio documentation reviewed on 2026-05-26.
- The `istioctl manifest generate` output can contain multiple YAML documents, but the post passed stdout directly to `kubernetes.core.k8s`. Updated the task to parse it with `from_yaml_all | list`.
- The resource limit defaults were defined but not used in the generated Istio manifest command. Added the matching `values.global.proxy.resources.limits.*` overrides.
- The profile comment listed `custom` as though it were a built-in profile. Updated the comment to list the built-in deployment profiles documented by Istio.
- The Istio custom resource examples used older `v1beta1` API versions. Updated `PeerAuthentication`, `DestinationRule`, `VirtualService`, and `Gateway` examples to the current `v1` API versions.
- The mTLS `DestinationRule` used `host: "*.local"`, which is not a reliable Kubernetes service host and would not match normal service FQDNs. Replaced it with an explicit fully qualified service host variable.

## Review Notes
The examples assume a Linux amd64 Ansible execution target for the `istioctl` archive and may need `become: true` when copying to `/usr/local/bin/istioctl`. The gateway example also assumes that an ingress gateway workload with the `istio: ingressgateway` selector exists in the cluster.
