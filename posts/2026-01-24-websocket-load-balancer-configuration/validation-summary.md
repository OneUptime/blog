# Validation Summary: How to Configure WebSocket with Load Balancers

## Status
validated

## Post Type
Guide

## Technologies Covered
- WebSocket
- Nginx reverse proxy and load balancing
- HAProxy
- AWS Application Load Balancer
- Terraform AWS provider
- AWS CLI elbv2
- Kubernetes Ingress
- ingress-nginx
- Traefik Kubernetes CRDs
- Node.js ws
- Redis Pub/Sub
- wscat

## Sources Consulted
- NGINX WebSocket proxying docs: https://nginx.org/en/docs/http/websocket.html
- NGINX proxy module docs: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- NGINX load balancing docs: https://nginx.org/en/docs/http/load_balancing.html
- HAProxy WebSocket configuration tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/protocol-support/websocket/
- HAProxy configuration manual: https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/
- AWS ALB load balancer attributes docs: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html
- AWS ALB target group attributes and stickiness docs: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html
- AWS CLI elbv2 modify-target-group-attributes docs: https://docs.aws.amazon.com/cli/latest/reference/elbv2/modify-target-group-attributes.html
- AWS CLI elbv2 create-target-group docs: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-target-group.html
- Terraform AWS provider aws_lb and aws_lb_target_group docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Kubernetes Ingress docs: https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx WebSocket docs: https://kubernetes.github.io/ingress-nginx/user-guide/miscellaneous/#websockets
- ingress-nginx sticky session docs: https://github.com/kubernetes/ingress-nginx/blob/main/docs/examples/affinity/cookie/README.md
- Traefik IngressRoute docs: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/ingressroute/
- Traefik Service docs: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/service/
- Traefik ServersTransport docs: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/serverstransport/
- wscat CLI help output from `npx --yes wscat --help`

## Issues Found
- The post overstated sticky sessions as mandatory for the duration of a WebSocket connection. Updated the language to clarify that the accepted upgraded connection is inherently attached to one backend, while sticky sessions are useful for reconnects and related requests when local state requires affinity.
- The Nginx basic proxy example set `proxy_connect_timeout 7d`, but NGINX documents that this timeout cannot usually exceed 75 seconds. Changed it to `75s` while leaving long read/send timeouts for the persistent WebSocket tunnel.
- The advanced Nginx example referenced `api_backend` without defining it. Added a matching upstream block so the configuration is complete.
- The HAProxy cookie-stickiness example referenced `api_backend` without defining it. Added a small regular HTTP backend so the snippet is syntactically complete.
- The AWS Terraform example declared two `aws_lb` resources with the same load balancer name and two HTTPS listeners on port 443 for the same ALB. Consolidated `idle_timeout` into the main `aws_lb` resource and removed the duplicate listener/load-balancer resources.
- The ingress-nginx example used `nginx.ingress.kubernetes.io/websocket-services`, which is not the ingress-nginx WebSocket requirement and belongs to a different NGINX Ingress controller family. Removed it and kept the documented ingress-nginx timeout annotations.
- The Traefik CRDs used the old `traefik.containo.us/v1alpha1` API group. Updated them to the current `traefik.io/v1alpha1` group.
- The Traefik `ServersTransport` object was defined but not referenced by the service. Added `serversTransport: websocket-transport` to make the example effective.
- The `wscat` test used unsupported `--execute-timeout`. Replaced it with the supported `-w 5` wait option.
- The summary table and final sticky-session bullet repeated the overstated affinity claim. Updated both to match AWS ALB and ingress-nginx documentation.

## Review Notes
The remaining examples are illustrative and use placeholder hosts, ARNs, certificates, and security group IDs. The AWS CLI was not installed locally, so AWS command validation was performed against the official AWS CLI documentation rather than local `aws --help` output.
