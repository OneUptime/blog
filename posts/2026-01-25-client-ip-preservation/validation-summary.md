# Validation Summary: How to Implement Client IP Preservation

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- X-Forwarded-For headers
- NGINX reverse proxy and realip module
- HAProxy HTTP header forwarding
- Python Flask and Django request handling
- AWS Application Load Balancer and CloudFront
- Linux Virtual Server / IPVS Direct Server Return
- Kubernetes Services and ingress-nginx
- Prometheus Python client metrics

## Sources Consulted
- NGINX ngx_http_realip_module documentation: https://nginx.org/en/docs/http/ngx_http_realip_module.html
- NGINX ngx_http_geo_module documentation: https://nginx.org/en/docs/http/ngx_http_geo_module.html
- HAProxy configuration manual: https://docs.haproxy.org/2.8/configuration.html
- AWS Application Load Balancer X-Forwarded headers documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/x-forwarded-headers.html
- AWS CloudFront request header documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/adding-cloudfront-headers.html
- AWS CloudFront custom origin request behavior documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/RequestAndResponseBehaviorCustomOrigin.html
- Kubernetes external load balancer documentation: https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/
- Kubernetes source IP tutorial: https://kubernetes.io/docs/tutorials/services/source-ip/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx source IP documentation: https://kubernetes.github.io/ingress-nginx/user-guide/miscellaneous/
- Red Hat Virtual Server Administration documentation for LVS direct routing behavior: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/4/pdf/virtual_server_administration/Red_Hat_Enterprise_Linux-4-Virtual_Server_Administration-en-US.pdf
- Python standard library ipaddress documentation: https://docs.python.org/3/library/ipaddress.html

## Issues Found
- The NGINX spoofing-prevention snippet used `map` with CIDR ranges. NGINX `map` performs string-style mapping and is not the right directive for IP CIDR matching. Changed it to `geo`, which officially supports CIDR matches against client IP addresses.
- The generic Python X-Forwarded-For extractor could return a malformed header entry as the client IP because invalid IP strings were treated as untrusted. Updated the loop to skip invalid IP values before returning an untrusted address.
- The AWS example stated that CloudFront adds `CloudFront-Viewer-Address` unconditionally. CloudFront can add this header when configured through CloudFront request headers/origin request policy; otherwise CloudFront uses `X-Forwarded-For` behavior. Updated the wording.
- The AWS parsing example used a simple colon split for `CloudFront-Viewer-Address`, which breaks for IPv6 and can return `IP:port` for ALB XFF when ALB client port preservation is enabled. Added a helper that handles plain IPs, `IP:port`, and `[IPv6]:port`.

## Review Notes
- The local environment did not have `nginx`, `haproxy`, or `ipvsadm` installed, so configuration and command validation for those tools was performed against official documentation rather than local `--help` or config-test output.
- The Python code blocks were checked with Python AST parsing and are syntactically valid.
- The HAProxy examples are valid, but production deployments should avoid configuring duplicate X-Forwarded-For insertion paths unless the intended header chain is explicitly tested.
