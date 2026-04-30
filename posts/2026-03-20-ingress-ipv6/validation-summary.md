# Validation Summary: How to Configure IPv6 Ingress in Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes Ingress
- Kubernetes Services
- IPv6
- Dual-stack networking
- ingress-nginx
- AWS EKS Network Load Balancers
- Google Kubernetes Engine LoadBalancer Services
- `kubectl`
- `curl`
- DNS (`dig`)

## Sources Consulted
- Kubernetes dual-stack Services: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes Service concept reference: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes `kubectl` JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- ingress-nginx installation guide: https://kubernetes.github.io/ingress-nginx/deploy/
- ingress-nginx ConfigMap options: https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/docs/user-guide/nginx-configuration/configmap.md
- ingress-nginx generated NGINX template: https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/rootfs/etc/nginx/template/nginx.tmpl
- ingress-nginx source IP and forwarded-header guidance: https://kubernetes.github.io/ingress-nginx/user-guide/miscellaneous/
- Amazon EKS Network Load Balancer annotations: https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html
- GKE LoadBalancer Service parameters: https://cloud.google.com/kubernetes-engine/docs/concepts/service-load-balancer-parameters
- curl man page (`--resolve` and IPv6 syntax): https://curl.se/docs/manpage.html

## Issues Found
- The post pinned the ingress-nginx install manifest to `controller-v1.9.5`, which is not the current manifest used in the official installation guide. Updated it to `controller-v1.15.1`.
- The post said IPv6 required setting `bind-address: "::"` and included `use-forwarded-headers: "true"` as part of IPv6 setup. ingress-nginx already listens on IPv6 by default when IPv6 is enabled and `disable-ipv6` is not set, and `use-forwarded-headers` is only appropriate behind another L7 proxy. Rewrote this section as a verification step using the generated `nginx.conf`.
- The post used `ss -tlnp6` inside the controller container to verify IPv6 listeners. Replaced it with inspection of `/etc/nginx/nginx.conf`, which is documented and more reliable for ingress-nginx.
- The Ingress example included `nginx.ingress.kubernetes.io/proxy-real-ip-header`, which is not a documented ingress-nginx Ingress annotation. Removed it.
- The Ingress example also included `nginx.ingress.kubernetes.io/rewrite-target: /`, which would rewrite all matching paths to `/` and was unrelated to the IPv6 topic. Removed it to avoid misleading routing behavior.
- The command `jsonpath='{.status.loadBalancer.ingress[?(@.ip contains ":")].ip}'` relied on unsupported `contains` syntax in `kubectl` JSONPath. Replaced it with a supported `range` expression plus shell filtering.
- The GCP example used `cloud.google.com/load-balancer-type: "External"` as if it enabled dual-stack behavior. Replaced it with `cloud.google.com/l4-rbs: "enabled"` and added a note that GKE dual-stack external load balancers can require additional IPv6 subnet or static-address annotations.
- The Service example selector did not match the official ingress-nginx controller labels closely enough. Updated the selector to include `app.kubernetes.io/component`, `app.kubernetes.io/instance`, and `app.kubernetes.io/name`, and added named `targetPort` fields to match the official manifest shape.
- The HTTPS test used a raw IPv6 address with a manual `Host` header. Replaced it with `curl --resolve`, which better matches TLS SNI and host-based routing behavior.
- The IPv6 log verification command used `grep "::"`, which would miss many valid IPv6 addresses. Replaced it with a broader IPv6-oriented pattern and changed `dig AAAA` to `dig +short AAAA` for clearer output.

## Review Notes
- The post remains technically relevant after correction, but ingress-nginx now documents that best-effort maintenance continued only until March 2026. Existing deployments still work, but readers should verify current support status for their chosen ingress controller.
- `ipFamilyPolicy: PreferDualStack` only yields dual-stack addresses on clusters that actually have dual-stack networking enabled; on single-stack clusters it falls back to single-stack behavior.
- Cloud-provider IPv6 LoadBalancer behavior is highly provider-specific. AWS and GKE examples in the post are illustrative, not interchangeable one-size-fits-all manifests.
