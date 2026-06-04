# Validation Summary: How to Use HAProxy Ingress Controller with Custom Backend Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Ingress
- HAProxy Kubernetes Ingress Controller
- HAProxy backend configuration
- Kubernetes YAML manifests

## Sources Consulted
- HAProxy Kubernetes Ingress Controller Ingress annotations: https://www.haproxy.com/documentation/kubernetes-ingress/community/configuration-reference/ingress/
- HAProxy Kubernetes Ingress Controller Service annotations: https://www.haproxy.com/documentation/kubernetes-ingress/community/configuration-reference/service/
- HAProxy Kubernetes Ingress Controller ConfigMap options: https://www.haproxy.com/documentation/kubernetes-ingress/community/configuration-reference/configmap/
- HAProxy configuration manual: https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The `haproxy.org/check` annotation used `"enabled"`, but the HAProxy Kubernetes Ingress Controller documentation lists boolean string values `"true"` and `"false"`. Changed the examples to use `"true"`.
- The advanced health check snippets mixed legacy `option httpchk` syntax with newer `http-check send` rules and did not explicitly enable checks. Simplified them to use `http-check send` plus `http-check expect`, and added `haproxy.org/check: "true"`.
- The connection limit examples used `maxconn` directly inside `backend-config-snippet`, which is not the appropriate way to set per-pod backend server limits in HAProxy Ingress examples. Changed these to use `haproxy.org/pod-maxconn` and kept `fullconn` in the backend snippet.
- The timeout example used `haproxy.org/timeout-connect`, `haproxy.org/timeout-client`, and `haproxy.org/timeout-tunnel` as Ingress annotations. Current HAProxy Ingress annotation docs expose `timeout-server` and `timeout-check` for Ingress resources, while those other timeout keys are ConfigMap-level options. Updated the Ingress examples to use `timeout-server` and `timeout-check`.
- The backend TLS example inserted a custom `server-template` line into the generated backend, which can conflict with the controller-managed server lines. Replaced it with the supported `haproxy.org/server-ssl: "true"` annotation for TLS to backend pods.
- The cookie persistence example combined `haproxy.org/cookie-persistence` with an additional manual `cookie` directive in `backend-config-snippet`, which would duplicate backend cookie configuration. Removed the manual snippet and used the supported cookie persistence annotation.
- The complete example included the same invalid check value, invalid timeout annotations, manual backend `maxconn`, duplicate cookie configuration, and conflicting connection reuse options. Updated it to use supported annotations and a consistent backend snippet.

## Review Notes
The post is now aligned with current HAProxy Kubernetes Ingress Controller annotation behavior. Some settings, such as global client/connect/tunnel timeouts, are available through the controller ConfigMap rather than per-Ingress annotations and could be covered in a future expanded article.
