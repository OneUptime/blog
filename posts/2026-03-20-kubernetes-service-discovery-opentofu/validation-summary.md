# Validation Summary: How to Configure Kubernetes Service Discovery with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes Services
- Kubernetes DNS-based service discovery
- Kubernetes headless Services
- Kubernetes ExternalName Services
- Kubernetes EndpointSlices
- OpenTofu CLI
- HashiCorp Kubernetes provider used with OpenTofu

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes blog on Endpoints deprecation in v1.33: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- OpenTofu `init` command: https://opentofu.org/docs/cli/commands/init/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/cli/commands/apply/
- Kubernetes provider `kubernetes_service_v1` resource docs: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/service_v1.md
- Kubernetes provider `kubernetes_endpoint_slice_v1` resource docs: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/endpoint_slice_v1.md
- Kubernetes provider `kubernetes_endpoints_v1` resource docs: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/endpoints_v1.md
- Kubernetes provider `kubernetes_namespace_v1` resource docs: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/namespace_v1.md

## Issues Found
1. The introduction stated that every Service follows `service.namespace.svc.cluster.local`. I corrected this to reflect that `cluster.local` is the default cluster domain rather than a universal fixed value.
2. The headless Service explanation implied direct per-Pod resolution in a way that was too broad. I changed it to the documented behavior: the Service DNS name returns the backing Pod IPs, which StatefulSets use for stable network identities.
3. The ExternalName description implied traffic routing/proxying. I corrected it to describe DNS-based name mapping, which is how `ExternalName` Services actually work.
4. The manual backend example used `kubernetes_endpoints_v1`, which maps to the legacy Endpoints API. I replaced it with `kubernetes_endpoint_slice_v1`, which is the current Kubernetes-recommended API for selectorless Services and manual endpoint registration.
5. The selectorless Service example exposed port `80` but did not set `target_port`, while the backend endpoint port was `8080`. I fixed the Service and EndpointSlice port definitions so the mapping is internally consistent and would work as described.
6. The DNS examples mixed `default` and `production` namespaces in a way that was not generally correct. I replaced them with namespace-generic examples and clarified the fully qualified default form.

## Review Notes
- `tofu init`, `tofu plan -out=tfplan`, and `tofu apply tfplan` are valid current OpenTofu CLI commands.
- The post is focused on Service discovery objects and intentionally omits Kubernetes provider authentication and cluster connection setup; readers still need a configured Kubernetes provider for the examples to apply successfully.
- The Endpoints API still exists for compatibility, but as of Kubernetes 1.33 it is officially deprecated and emits warnings when read or written.
