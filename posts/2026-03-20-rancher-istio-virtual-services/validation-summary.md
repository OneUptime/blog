# Validation Summary: How to Set Up Istio Virtual Services in Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- Istio
- Istio VirtualService
- `kubectl`
- `istioctl`

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio request routing task: https://istio.io/latest/docs/tasks/traffic-management/request-routing/
- Istio mirroring task: https://istio.io/latest/docs/tasks/traffic-management/mirroring/
- Istio CLI reference (`istioctl proxy-config`): https://istio.io/latest/docs/reference/commands/istioctl/
- Istio v1 API announcement and version guidance: https://istio.io/latest/blog/2024/v1-apis/
- Rancher Istio integration docs: https://ranchermanager.docs.rancher.com/v2.10/integrations-in-rancher/istio
- Rancher UI traffic management feature docs: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/advanced-user-guides/enable-experimental-features/istio-traffic-management-features
- Envoy retry policy reference for `retriable-4xx`: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html

## Issues Found
- All VirtualService YAML examples used `apiVersion: networking.istio.io/v1alpha3`. Updated them to `networking.istio.io/v1` to match Istio's current stable API for VirtualService.
- The `perTryTimeout` comment said it applied to "Each retry attempt". Updated it to "Each attempt" because Istio documents `perTryTimeout` as applying to the initial request attempt as well as retries.
- The `istioctl proxy-config` examples used `deploy/reviews-v1`. Updated both commands to `deployment/reviews-v1` to match the documented workload reference form in Istio's CLI reference.

## Review Notes
- The routing patterns shown in the post are technically valid for Istio's current VirtualService schema after the API version updates.
- The examples use short service names such as `reviews` and `my-api`. Istio supports this, but its reference documentation recommends fully qualified service names to avoid namespace-related ambiguity.
- Rancher still documents Istio integration and UI-based traffic management features, so the Rancher framing of the post remains technically relevant.
