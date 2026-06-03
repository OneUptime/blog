# Validation Summary: How to Configure Kubernetes Service Session Affinity with clientIP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Services
- Kubernetes kube-proxy service proxy modes
- iptables, nftables, and IPVS
- Kubernetes LoadBalancer and externalTrafficPolicy
- ingress-nginx cookie affinity
- Kubernetes Deployments and StatefulSets
- kubectl commands
- Flask logging example

## Sources Consulted
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes Virtual IPs and Service Proxies documentation: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes Create an External Load Balancer task: https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- ingress-nginx sticky sessions example: https://kubernetes.github.io/ingress-nginx/examples/affinity/cookie/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- POSIX Shell Command Language: https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html
- GNU Bash brace expansion documentation: https://www.gnu.org/software/bash/manual/bash.html#Brace-Expansion

## Issues Found
- The post described iptables ClientIP session affinity as primarily using `--probability` and conntrack. Kubernetes iptables mode uses normal service selection for the first connection, but ClientIP stickiness is implemented with iptables `recent` match rules (`--set` and `--rcheck --seconds`). I updated the explanation to distinguish first backend selection, affinity tracking, and conntrack for established connections.
- The post covered iptables and IPVS but omitted current nftables context and did not mention that IPVS proxy mode is deprecated in current Kubernetes documentation. I added a short nftables subsection and an IPVS deprecation caveat without restructuring the article.
- The shell test loop used Bash brace expansion (`{1..10}`) even though the command starts `sh` in the test pod. I changed it to a POSIX-compatible explicit list.
- Two `apps/v1` Deployment snippets omitted required `.spec.selector` and matching `.spec.template.metadata.labels`. I added the required fields so the manifests are valid examples.
- The wording said every request always routes to the same pod. I narrowed that language to new connections during the configured affinity timeout, which matches Kubernetes Service behavior more accurately.

## Review Notes
- Local `kubectl` is not installed in this environment, so live client-side Kubernetes schema validation and `kubectl --help` checks could not be run.
- I parsed all 12 YAML code blocks with PyYAML after edits; they are syntactically valid YAML.
