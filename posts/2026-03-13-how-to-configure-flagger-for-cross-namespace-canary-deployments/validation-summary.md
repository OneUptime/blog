# Validation Summary: How to Configure Flagger for Cross-Namespace Canary Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger Canary resources
- Kubernetes Deployments, Services, DNS, namespaces, and RBAC
- Istio VirtualService, DestinationRule, Sidecar, mTLS, and sidecar injection
- Progressive delivery and canary analysis

## Sources Consulted
- Flagger docs: How it works - https://docs.flagger.app/usage/how-it-works
- Flagger docs: FAQ - https://docs.flagger.app/faq
- Flagger docs: Istio Canary Deployments - https://docs.flagger.app/main/tutorials/istio-progressive-delivery
- Flagger docs: Install on Kubernetes - https://docs.flagger.app/install/flagger-install-on-kubernetes
- Istio docs: VirtualService reference - https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio docs: Sidecar reference - https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio docs: Configuration scoping - https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Istio docs: Sidecar injection - https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Kubernetes docs: Namespaces and DNS - https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes docs: DNS for Services and Pods - https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/

## Issues Found
- The post stated that Istio VirtualServices are scoped to their namespace by default. Istio's VirtualService reference says that when `exportTo` is omitted, a VirtualService is exported to all namespaces by default. Updated Step 5 to explain that `exportTo` is only needed when mesh defaults or existing config restrict visibility.
- The post suggested creating an Istio `ServiceEntry` for cross-namespace access to an in-cluster Kubernetes Service. `ServiceEntry` is for adding services to Istio's service registry, while Kubernetes Services are already in the platform registry. Updated Step 4 to say no `ServiceEntry` is required for this backend service.
- The Istio `VirtualService` and `Sidecar` examples used `networking.istio.io/v1beta1`. Updated them to the current `networking.istio.io/v1` API version shown in current Istio documentation.
- The note about patching Flagger's generated VirtualService could imply a durable fix. Flagger documentation says it keeps generated VirtualServices and DestinationRules in sync with the Canary service spec and direct spec modifications can be overwritten. Updated the note to prefer default visibility or mesh-wide export defaults.

## Review Notes
The Flagger Canary fields, generated service naming model, target deployment selector, Istio mTLS setting, Kubernetes DNS FQDN usage, namespace labeling commands, and RBAC resource groups are consistent with the consulted documentation. The sample assumes the Flagger controller ServiceAccount is named `flagger` in `flagger-system`; installations that place Flagger in another namespace, such as `istio-system`, should adjust the `subjects` namespace.
