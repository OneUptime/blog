# Validation Summary: How to Diagnose DigitalOcean PROXY Protocol Requests Inside a Cluster

## Status

validated

## Post Type

Networking troubleshooting guide

## Technologies Covered

- DigitalOcean CCM v0.1.69 hostname and PROXY protocol annotations
- Kubernetes load balancer status, kube-proxy/CNI routing and ipMode
- DNS, TLS, curl and kubectl

## Sources Consulted

- [DigitalOcean v0.1.69 hostname and PROXY annotations](https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/v0.1.69/docs/controllers/services/annotations.md)
- [DigitalOcean v0.1.69 hostname-only EnsureLoadBalancer result](https://github.com/digitalocean/digitalocean-cloud-controller-manager/blob/v0.1.69/cloud-controller-manager/do/loadbalancers.go)
- [DigitalOcean hostname setup procedure](https://docs.digitalocean.com/products/kubernetes/how-to/configure-load-balancers/#accessing-by-hostname)
- [Kubernetes load balancer IP modes](https://kubernetes.io/docs/concepts/services-networking/service/#load-balancer-ip-mode)
- [kubectl annotate](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/)
- [kubectl get output and resource syntax](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)

## Issues Found

No technical issues found.

## Review Notes

- The provider annotation reference explicitly documents the bypass problem for SSL or PROXY protocol processing. In `EnsureLoadBalancer`, a configured hostname returns an ingress entry containing Hostname instead of IP.
- Checked exact annotation spellings, string Boolean syntax, Service status field paths, diagnostic commands, and the DNS-record-before-annotation sequence. The hostname annotation does not create DNS or modify the requested application certificate.
- The article appropriately diagnoses actual proxy/CNI behavior and DNS address-family differences before applying the workaround. Kubernetes ipMode support is described conditionally, without claiming all networking implementations behave identically.
- External success alone does not validate a Pod-originated request, and a direct ClusterIP client does not synthesize a PROXY header. The separate-listener/application-Service guidance is technically consistent.
- Reviewed on 2026-09-10. All 6 shell examples passed `bash -n`; all 1 YAML examples parsed with PyYAML. These are syntax checks plus documentation/source review, not execution against a live Kubernetes cluster or cloud account. Cloud resource state, permissions, API actions, traffic, DNS propagation and certificate issuance were not runtime-verified.
