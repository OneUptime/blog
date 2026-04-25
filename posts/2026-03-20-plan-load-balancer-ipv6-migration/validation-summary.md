# Validation Summary: How to Plan Load Balancer Changes for IPv6 Migration

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Load balancers
- HAProxy
- Nginx
- Kubernetes Services
- AWS Load Balancer Controller / Amazon EKS
- Python / Flask
- curl

## Sources Consulted
- HAProxy Configuration Manual: https://docs.haproxy.org/dev/configuration.html
- HAProxy Frontends tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/configuration-basics/frontends/
- HAProxy Runtime API `show servers state`: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-servers-state/
- NGINX `ngx_http_core_module` (`listen`): https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- NGINX `ngx_http_proxy_module`: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Kubernetes dual-stack Services: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- AWS Load Balancer Controller, Network Load Balancer guide: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/nlb/
- AWS Load Balancer Controller, Service annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/service/annotations/
- Amazon EKS Network Load Balancing: https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html
- Flask API reference: https://flask.palletsprojects.com/en/stable/api/
- Python `ipaddress` library: https://docs.python.org/3/library/ipaddress.html
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- HAProxy used separate IPv4 and IPv6 frontends, but the IPv6 binds did not make IPv6-only behavior explicit. I changed them to `bind [::]:80 v6only` and `bind [::]:443 v6only ...` so the dedicated IPv6 listeners are unambiguous when IPv4 listeners are also defined.
- The NGINX example set `X-Forwarded-For` to `$remote_addr`, which overwrote any existing forwarding chain. I changed it to `$proxy_add_x_forwarded_for`, which is the documented way to append the client address while preserving any prior `X-Forwarded-For` value.
- The Kubernetes example used `service.beta.kubernetes.io/aws-load-balancer-type: "nlb"`, which is outdated for current AWS Load Balancer Controller guidance, and it omitted the scheme annotation even though current controller defaults are internal NLBs. I changed the example to `aws-load-balancer-type: "external"` and added `aws-load-balancer-scheme: "internet-facing"` so the snippet matches a public dual-stack NLB example.
- The HAProxy verification command was labeled as “stats” even though `show servers state` is a Runtime API command, and the `socat` invocation was not in the documented socket form. I corrected the label and changed the example to `socat stdio unix-connect:/var/run/haproxy/admin.sock`.

## Review Notes
- The AWS annotations in the Kubernetes section are controller-specific. They are accurate for the AWS Load Balancer Controller path reviewed here, but EKS Auto Mode uses different conventions such as `spec.loadBalancerClass`.
- The HTTPS `curl -6` example is syntactically valid, but in real deployments certificate verification still depends on the backend certificate matching the hostname or IP being tested.
