# Validation Summary: How to Set Up Proxy Protocol on K8s Load Balancers to Preserve Client IP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kubernetes Services and NetworkPolicy
- AWS Network Load Balancer
- Google Cloud Load Balancing
- Azure Load Balancer
- ingress-nginx
- HAProxy Kubernetes Ingress Controller
- Traefik
- Go
- Python
- HAProxy
- socat

## Sources Consulted
- AWS Load Balancer Controller service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v3.2/guide/service/annotations/
- AWS Network Load Balancer target group attributes: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html
- Google Cloud proxy Network Load Balancer setup and `--proxy-header`: https://docs.cloud.google.com/load-balancing/docs/tcp/set-up-global-ext-proxy-tcp
- Google Cloud load balancer feature comparison: https://docs.cloud.google.com/load-balancing/docs/features
- Azure Load Balancer concepts: https://learn.microsoft.com/en-us/azure/load-balancer/concepts
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- HAProxy Kubernetes Ingress Controller ConfigMap options: https://www.haproxy.com/documentation/kubernetes-ingress/community/configuration-reference/configmap/
- HAProxy PROXY protocol configuration tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/client-ip-preservation/enable-proxy-protocol/
- Traefik entryPoints documentation: https://doc.traefik.io/traefik/reference/install-configuration/entrypoints/
- `pires/go-proxyproto` package documentation: https://pkg.go.dev/github.com/pires/go-proxyproto
- `proxy-protocol` Python package documentation: https://pypi.org/project/proxy-protocol/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The AWS Service example used the older `aws-load-balancer-type: "nlb"` form while the current AWS Load Balancer Controller documentation uses `external` or `nlb-ip`, and the explanation implied target groups rather than service ports for selective enablement. I changed the example to `aws-load-balancer-type: "external"`, added `aws-load-balancer-nlb-target-type: "instance"`, and clarified the per-target-group annotation behavior.
- The Google Cloud example used a GKE `BackendConfig`, but that object does not enable PROXY protocol. Google Cloud documents PROXY protocol v1 for proxy Network Load Balancers through the target TCP proxy `--proxy-header=PROXY_V1` setting, so I replaced the invalid Kubernetes YAML with the documented `gcloud compute target-tcp-proxies update` command and clarified which Google load balancer families use `X-Forwarded-For`, source IP preservation, or PROXY protocol.
- The Azure section implied limited native PROXY protocol support. Azure Load Balancer is a layer 4 load balancer that preserves the original source IP for inbound flows and does not add PROXY protocol headers, so I corrected that wording.
- The ingress-nginx ConfigMap included `real-ip-header: "proxy_protocol"`, which is not a documented community ingress-nginx ConfigMap key. I removed it and kept the documented `use-proxy-protocol` and `proxy-real-ip-cidr` keys.
- The ingress-nginx Deployment example used the deprecated `k8s.gcr.io` registry and an older controller image tag. I updated it to the current `registry.k8s.io/ingress-nginx/controller` registry.
- The HAProxy Ingress ConfigMap used undocumented keys (`accept-proxy`, `backend-proxy-protocol`, and `proxy-protocol-trusted-ips`). I replaced them with HAProxy Kubernetes Ingress Controller's documented `proxy-protocol` and `send-proxy-protocol` keys.
- The Python example used a `ProxyProtocolSocket` API that is not part of the published `proxy-protocol` package documentation. I replaced it with the package's documented asyncio reader callback pattern using `ProxyProtocolDetect`, `ProxyProtocolReader`, and `SocketInfo`.
- The testing examples sent plaintext HTTP traffic to port 443, which would fail for normal HTTPS backends. I changed the sample destination port to 80 so it matches the plaintext HTTP request being sent.
- The Go security snippet used the deprecated `Policy` field and a placeholder `isTrustedSource` function. I replaced it with the current `ConnPolicy` field and `ConnMustStrictWhiteListPolicy`.
- The timeout troubleshooting text said mismatched PROXY protocol configuration would make a backend wait indefinitely. In practice this more commonly produces malformed request or TLS errors, so I corrected the symptom explanation.

## Review Notes
- The post is now technically accurate as a general guide, but PROXY protocol behavior remains highly load-balancer- and controller-specific. Readers should still confirm the exact annotations for their managed Kubernetes provider and controller version.
- I checked the Python replacement with `ast.parse`; I did not run live cloud-provider commands or deploy the Kubernetes manifests.
