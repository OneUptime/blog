# Validation Summary: How to Configure IPv6 ExternalIPs in Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes Services
- Kubernetes dual-stack / IPv6 networking
- kube-proxy
- `kubectl`
- Linux networking tools (`ip`, `ip6tables`, `ping6`)
- `curl`

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes JSONPath support reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes kube-proxy configuration reference: https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/
- Kubernetes virtual IPs and Service proxies reference: https://kubernetes.io/docs/reference/networking/virtual-ips/
- curl tutorial, IPv6 section: https://curl.se/docs/tutorial.html
- curl URL syntax reference: https://curl.se/docs/url-syntax.html
- Linux `ping(8)` manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- OneUptime homepage link verification: https://oneuptime.com/

## Issues Found
- The prerequisite incorrectly required `cluster-admin` rights. I changed this to the actual permissions needed for the documented steps: listing nodes plus creating or updating Services in the target namespace.
- The post said the `externalIPs` address must be manually assigned to a node. Kubernetes documents `externalIPs` as addresses whose traffic must arrive at one or more nodes, so I corrected the wording to a routing-based requirement.
- The Service manifest did not explicitly request an IPv6 Service family. On dual-stack clusters, the default Service family can still be IPv4, so I added `ipFamilyPolicy: SingleStack` and `ipFamilies: [IPv6]` to make the example reliably IPv6.
- The `curl` example omitted `-g`, which curl requires when using bracketed IPv6 literals in URLs. I updated the command to `curl -g -6 ...`.
- The kube-proxy verification step implied only iptables or IPVS backends. Current Kubernetes supports `iptables`, `ipvs`, and `nftables`, so I scoped the inspection step specifically to `iptables` mode.
- The post did not mention that `externalIPs` is deprecated in Kubernetes v1.36. I added a deprecation caveat and pointed readers toward load balancer controllers or Gateway API for new deployments.

## Review Notes
- The `ip6tables` inspection step is a troubleshooting check for Linux nodes using kube-proxy in `iptables` mode; it is not a portable verification method for `nftables`, Windows, or future proxy implementations.
- The `ping6` example is still valid on Linux systems with iputils, as documented by the current `ping(8)` manual page.
