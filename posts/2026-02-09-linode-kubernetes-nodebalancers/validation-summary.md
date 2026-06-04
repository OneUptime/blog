# Validation Summary: How to Configure Linode Kubernetes Engine (LKE) with NodeBalancers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linode Kubernetes Engine (LKE)
- Linode Cloud Controller Manager
- Linode NodeBalancers
- Kubernetes Services and Ingress
- Kubernetes TLS Secrets
- cert-manager
- ingress-nginx
- Linode CLI and API
- Prometheus
- Nginx Proxy Protocol configuration

## Sources Consulted
- Akamai TechDocs: Load balancing on LKE: https://techdocs.akamai.com/cloud-computing/docs/get-started-with-load-balancing-on-an-lke-cluster
- Akamai TechDocs: NodeBalancer configuration options: https://techdocs.akamai.com/cloud-computing/docs/configuration-options-for-nodebalancers
- Akamai TechDocs: NodeBalancers overview and pricing: https://techdocs.akamai.com/cloud-computing/docs/nodebalancer
- Akamai TechDocs: LKE CLI commands: https://techdocs.akamai.com/cloud-computing/docs/cli-commands-for-lke
- Akamai Linode API reference: Create Kubernetes cluster: https://techdocs.akamai.com/linode-api/reference/post-lke-cluster
- Akamai Linode API reference: Get NodeBalancer statistics: https://techdocs.akamai.com/linode-api/reference/get-node-balancer-stats
- Linode Cloud Controller Manager annotation reference: https://linode.github.io/linode-cloud-controller-manager/docs/configuration/annotations.html
- Linode Cloud Controller Manager firewall setup: https://linode.github.io/linode-cloud-controller-manager/docs/configuration/firewall.html
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- cert-manager installation documentation: https://cert-manager.io/docs/installation/kubectl/
- ingress-nginx Helm chart documentation: https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/README.md

## Issues Found
- The NodeBalancer protocol description overstated Layer 7 behavior as header inspection. Updated it to describe TCP, HTTP, HTTPS, and Premium UDP support, and clarified HTTPS termination behavior.
- The health check description described passive checks as the main/default behavior. Updated it to distinguish active health checks from optional passive checks.
- The LKE creation command used Kubernetes `1.28`, which is outdated for current examples. Updated it to `1.33`, matching current Akamai API examples.
- The kubeconfig command omitted `--no-headers`, which can cause Linode CLI table headers to be piped into `base64 -d`. Added `--no-headers`.
- The TLS termination example used the stale `linode-loadbalancer-tls` annotation format. Replaced it with current `linode-loadbalancer-port-443` per-port JSON configuration and `default-protocol`.
- The cert-manager install URL used old version `v1.13.0`. Updated it to the current documented static manifest version `v1.20.2`.
- The balancing algorithm examples used `linode-loadbalancer-algorithm`, which is not the current annotation. Replaced it with `linode-loadbalancer-default-algorithm`.
- The Proxy Protocol example used deprecated `linode-loadbalancer-proxy-protocol`. Replaced it with `linode-loadbalancer-default-proxy-protocol`.
- The source IP restriction example used `loadBalancerSourceRanges` and claimed enforcement at the NodeBalancer. Replaced it with the Linode CCM `firewall-acl` annotation and adjusted the explanation to Cloud Firewall enforcement.
- The Linode API stats example included unsupported `start` and `end` query parameters. Replaced it with the documented `/nodebalancers/{id}/stats` endpoint.
- The Prometheus example implied a NodeBalancer exposes metrics on port `9100`. Replaced it with ingress-controller metrics scraping and enabled ingress-nginx metrics in the Helm install command.
- The cost optimization Service comment said a single NodeBalancer was for multiple services. Clarified that the single Service exposes an ingress controller, which then routes to multiple services.

## Review Notes
- The examples remain illustrative and still require real DNS records, reachable backends, and a working ingress controller for the Let's Encrypt HTTP-01 flow.
- Linode/Akamai pricing and supported Kubernetes versions can change over time; future reviews should re-check both before publication.
