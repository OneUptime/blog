# Validation Summary: How to Use Network Policies to Secure ArgoCD Components

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes NetworkPolicy
- Kubernetes CNI network policy enforcement
- Redis
- Dex / OIDC
- kubectl
- Argo CD CLI

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Argo CD install manifests, including component labels, ports, and bundled NetworkPolicy objects: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Argo CD ingress documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- Argo CD high availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD FAQ on default Redis authentication: https://argo-cd.readthedocs.io/en/latest/faq/
- Azure AKS network policy documentation: https://learn.microsoft.com/en-us/azure/aks/use-network-policies
- Azure AKS network policy best practices: https://learn.microsoft.com/en-us/azure/aks/network-policy-best-practices

## Issues Found
- The post claimed the examples were production-ready for every ArgoCD component. Current Argo CD installs include additional components such as ApplicationSet and notifications controllers, so I changed the wording to describe the examples as a production starting point for core components.
- The post stated that ArgoCD Redis has no authentication by default. Argo CD's current FAQ says default installations enable Redis authentication, so I updated the text to call out older or custom deployments instead.
- The CNI support check implied that successfully applying a NetworkPolicy proves enforcement support. Kubernetes accepts NetworkPolicy resources through the API, but enforcement depends on the network plugin, so I clarified that traffic behavior must also be tested.
- The supported CNI examples listed Azure CNI as if Azure CNI alone were the policy engine. Microsoft documents Cilium, Azure NPM, and Calico as AKS network policy engines, with Azure CNI powered by Cilium as the recommended option, so I corrected that bullet.
- The ArgoCD server ingress policy allowed the ingress controller to port 8083 as gRPC. In Argo CD's manifests, 8083 is exposed by the metrics service; HTTP/HTTPS and gRPC ingress normally target the server's 8080 pod port through the Service. I removed the 8083 ingress allowance.
- The Redis NetworkPolicy did not allow the repo server, but the current Argo CD manifests allow repo-server access to Redis and the repo-server deployment is configured with Redis. I added `argocd-repo-server` as an allowed Redis client and added that path to the architecture diagram.
- The broad Kubernetes API egress rules used `0.0.0.0/0`. This can be necessary as a portable placeholder, but it is not a least-privilege production rule. I added comments instructing readers to replace it with API server CIDRs or IPs when possible.
- The troubleshooting section said `kubectl describe networkpolicy` checks CNI support. That command shows how Kubernetes interpreted policy selectors and rules, not whether the CNI enforces them, so I corrected the comment.

## Review Notes
- The YAML NetworkPolicy snippets were parsed successfully after edits.
- The DNS egress examples allow port 53 broadly by namespace rather than selecting kube-dns/CoreDNS specifically. This is functional as a generic example but could be tightened in a future revision.
- The policies focus on core Argo CD components and do not include optional/current install components such as ApplicationSet, notifications, or metrics-specific ingress for every service.
