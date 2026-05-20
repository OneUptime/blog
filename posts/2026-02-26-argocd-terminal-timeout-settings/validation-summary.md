# Validation Summary: How to Configure Terminal Timeout Settings in ArgoCD

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Argo CD web-based terminal
- Kubernetes exec streaming
- Kubernetes kubelet configuration
- ingress-nginx
- Traefik IngressRoute and entryPoint configuration
- AWS Application Load Balancer
- Bash shell timeout configuration

## Sources Consulted
- Argo CD Web-based Terminal documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/web_based_terminal/
- Argo CD argocd-server command reference: https://argo-cd.readthedocs.io/en/release-2.12/operator-manual/server-commands/argocd-server/
- Argo CD additional configuration method: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/additional-configuration-method/
- Kubernetes kubelet configuration API reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes blog, "Kubernetes 1.31: Streaming Transitions from SPDY to WebSockets": https://kubernetes.io/blog/2024/08/20/websockets-transition/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Traefik IngressRoute documentation: https://doc.traefik.io/traefik/v3.3/reference/routing-configuration/kubernetes/crd/http/ingressroute/
- Traefik entryPoints documentation: https://doc.traefik.io/traefik/v3.3/routing/entrypoints/
- AWS Application Load Balancer attributes documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html
- AWS Application Load Balancer target group attributes documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html
- AWS Application Load Balancer idle timeout documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html

## Issues Found
- Corrected the Argo CD `server.request.timeout` example from `"300"` to `"300s"` and updated the stated default from 60 seconds to 0, matching the `argocd-server --request-timeout` command reference.
- Removed the implied Argo CD terminal idle timer from the lifecycle diagram because Argo CD does not document a built-in terminal-specific idle timeout.
- Removed manual ingress-nginx WebSocket upgrade headers from the Ingress example and clarified `proxy-read-timeout` / `proxy-send-timeout` semantics as time between successive read/write operations.
- Replaced the Traefik middleware timeout example with an entryPoint `respondingTimeouts.idleTimeout` example because Traefik timeout settings are static entryPoint configuration rather than per-`IngressRoute` middleware settings.
- Removed AWS ALB cookie stickiness from the WebSocket example because AWS documents upgraded WebSocket connections as inherently bound to the selected target after HTTP 101.
- Corrected the Kubernetes streaming timeout section: the setting is `streamingConnectionIdleTimeout` in kubelet configuration, not a kube-apiserver flag, and current Kubernetes documentation marks it deprecated and no longer effective.
- Updated the exec streaming diagram from SPDY-specific wording to version-neutral "exec stream" language because Kubernetes v1.31 moved default streaming from SPDY to WebSockets.
- Corrected the `exit code 137` explanation because it indicates SIGKILL of the container process, not a Kubernetes API server idle timeout.
- Replaced the unrelated `upstream-keepalive-timeout` keepalive recommendation with the relevant ingress-nginx proxy read/send timeout annotations.

## Review Notes
The post is technically relevant and useful after correction. Timeout behavior can still vary by Argo CD, Kubernetes, ingress controller, and managed load-balancer versions, so future updates should state tested versions when making operational recommendations.
