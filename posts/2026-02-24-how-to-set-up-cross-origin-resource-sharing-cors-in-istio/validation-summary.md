# Validation Summary: How to Set Up Cross-Origin Resource Sharing (CORS) in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio Gateway
- Istio corsPolicy
- Cross-Origin Resource Sharing (CORS)
- HTTP preflight requests
- istioctl
- Kubernetes YAML manifests

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/
- Istio Traffic Management FAQ: https://istio.io/latest/about/faq/traffic-management/
- MDN CORS guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- MDN Preflight request glossary: https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request
- Fetch Standard, forbidden request headers: https://fetch.spec.whatwg.org/

## Issues Found
- Updated Istio `Gateway` and `VirtualService` snippets from `networking.istio.io/v1beta1` to the current stable `networking.istio.io/v1` API, matching Istio's current documentation and the Istio 1.22 API promotion.
- Clarified the CORS explanation to say browsers send preflight requests for non-simple cross-origin API calls, not every cross-origin API call.
- Removed `OPTIONS` from `allowMethods` examples. `Access-Control-Allow-Methods` authorizes the requested actual method from `Access-Control-Request-Method`; browsers do not require `OPTIONS` itself to be listed for a preflight response to pass.
- Tightened the subdomain regex from `https://.*[.]example[.]com` to `^https://([a-zA-Z0-9-]+[.])+example[.]com$` so it only matches HTTPS origins under `example.com`.
- Removed `cookie` from `allowHeaders` in the credentials example. Browser JavaScript cannot set the `Cookie` header directly; cookies are handled through credentialed requests and `Access-Control-Allow-Credentials`.
- Removed `origin` from the production `allowHeaders` list because `Origin` is a browser-controlled CORS request header, not an application request header that needs to be allowed through `Access-Control-Allow-Headers`.
- Updated the troubleshooting note from "missing OPTIONS in allowMethods" to "missing requested method in allowMethods" to match how CORS preflight validation works.

## Review Notes
- The remaining Istio `corsPolicy` fields (`allowOrigins`, `allowMethods`, `allowHeaders`, `exposeHeaders`, `allowCredentials`, and `maxAge`) match the official VirtualService schema.
- The `istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system -o json` command uses a current `istioctl proxy-config routes` form, assuming the ingress gateway deployment is named `istio-ingressgateway` in `istio-system`.
