# Validation Summary: How to Configure Default Fallback Routes in VirtualService

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio traffic management
- Kubernetes custom resources
- Envoy route configuration via istioctl

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Traffic Management Best Practices: https://istio.io/latest/docs/ops/best-practices/traffic-management/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- Corrected the explanation of behavior without an explicit fallback route. The original text said Istio generates a default route to the VirtualService `hosts` field when no fallback route is present. Official Istio guidance says default routing to all service versions applies when no route rules are set, while VirtualService route rules are evaluated in order and only matching rules are used. The post now distinguishes default behavior with no VirtualService from unmatched requests inside a VirtualService.
- Updated all VirtualService examples from `networking.istio.io/v1beta1` to the current stable `networking.istio.io/v1` API version used in the official Istio 1.30 documentation.
- Corrected the "Missing fallback entirely" common mistake to avoid implying unmatched VirtualService traffic falls back to Kubernetes service routing.

## Review Notes
The examples use short service names such as `my-app` and `api-service`, which Istio resolves relative to the VirtualService namespace. That is valid, but fully qualified service names are safer in production examples when services may live in different namespaces.
