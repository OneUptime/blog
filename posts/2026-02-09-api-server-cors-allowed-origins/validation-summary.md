# Validation Summary: How to Configure API Server CORS and Allowed Origins

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes API server
- kubeadm static Pod manifests
- CORS
- Kubernetes Dashboard
- NGINX reverse proxy
- PrometheusRule
- JavaScript Fetch API

## Sources Consulted
- Kubernetes kube-apiserver command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes kubeadm implementation details: https://kubernetes.io/docs/reference/setup-tools/kubeadm/implementation-details/
- Kubernetes static Pods documentation: https://kubernetes.io/docs/tasks/configure-pod-container/static-pod/
- Kubernetes Dashboard documentation: https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/
- Kubernetes API server CORS filter source: https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/apiserver/pkg/server/filters/cors.go
- MDN CORS documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- NGINX add_header directive documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html#add_header

## Issues Found
- The `--cors-allowed-origins` examples used unescaped, unanchored regex values such as `https://dashboard.example.com`. Because Kubernetes treats allowed origins as regular expressions, dots match any character and unanchored expressions can match unintended origins. I updated exact-origin examples to anchored regexes with escaped dots.
- The expected API server preflight response showed `200 OK` and an incomplete header set. Kubernetes' CORS filter returns `204 No Content` for preflight requests and uses default method/header/exposed-header values, so I corrected the expected response.
- The Kubernetes Dashboard section used the old `v2.7.0` raw manifest flow and stated that Dashboard requires API server CORS. Current Kubernetes documentation recommends Helm installation and port-forwarding to `svc/kubernetes-dashboard-kong-proxy`; Dashboard access through its own service/proxy does not require API server CORS. I updated the commands and service name.
- The NGINX preflight block added headers inside an `if` block without repeating the CORS headers. Since NGINX `add_header` inheritance stops when headers are defined at the current level, the preflight response could omit the required CORS headers. I repeated the CORS headers inside the OPTIONS block.
- The monitoring section claimed API server logs can show `"origin not allowed"`. The Kubernetes CORS filter does not emit that message; disallowed origins are normally visible as responses without CORS headers. I changed the examples to monitor OPTIONS traffic and rejected OPTIONS requests instead.
- The testing section said a disallowed-origin curl request should fail. Curl does not enforce browser CORS policy, so I clarified that curl should show missing CORS headers for disallowed origins.
- The troubleshooting section implied that adding `credentials: 'include'` fixes all credential issues. I narrowed this to cookie-based credentials and noted that the server must return `Access-Control-Allow-Credentials: true`.

## Review Notes
The reverse proxy example remains illustrative. In production, the proxy should verify the upstream API server certificate instead of using `proxy_ssl_verify off`, and operators should prefer a supported authentication flow over exposing direct browser access to the Kubernetes API server.
