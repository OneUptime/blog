# Validation Summary: How to Set Up Path-Based Routing with Kubernetes Ingress

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Ingress
- ingress-nginx Controller
- Helm
- kubectl
- cert-manager
- TLS termination
- Kubernetes Services and Deployments

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress NGINX retirement announcement: https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/
- ingress-nginx installation guide: https://kubernetes.github.io/ingress-nginx/deploy/
- ingress-nginx rewrite examples: https://kubernetes.github.io/ingress-nginx/examples/rewrite/
- ingress-nginx path matching documentation: https://kubernetes.github.io/ingress-nginx/user-guide/ingress-path-matching/
- ingress-nginx controller behavior documentation: https://kubernetes.github.io/ingress-nginx/how-it-works/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/
- Helm install command documentation: https://helm.sh/docs/helm/helm_install/
- kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The post recommended installing the community-maintained `kubernetes/ingress-nginx` controller without noting its March 2026 retirement. Added a narrow note that the commands remain useful for learning or existing clusters, but new production deployments should use a maintained Ingress controller or Gateway API implementation.
- The `ImplementationSpecific` explanation said ingress-nginx allows regex patterns without mentioning that `nginx.ingress.kubernetes.io/use-regex` must be enabled. Updated the explanation to include the annotation requirement.
- The multiple-Ingress-resource section implied all Ingress controllers merge rules across resources for the same host. Updated the statement to identify this as ingress-nginx behavior.
- The path priority section listed Exact matches before longest path matches and said equal paths use definition order. Kubernetes documentation gives precedence first to the longest matching path, then Exact over Prefix when equally matched; ingress-nginx uses oldest rule wins for duplicate host/path definitions across resources. Updated the list accordingly.
- The testing command only read `.status.loadBalancer.ingress[0].ip`, which fails on cloud load balancers that expose a hostname instead of an IP. Updated the command and variable name to support either an IP or hostname.

## Review Notes
- The examples use the current `networking.k8s.io/v1` Ingress API and include required `pathType` fields.
- The rewrite example matches the ingress-nginx documented capture-group pattern using `/$2`.
- The cert-manager `cert-manager.io/cluster-issuer` annotation and Ingress TLS fields are valid, assuming a matching `ClusterIssuer` exists.
