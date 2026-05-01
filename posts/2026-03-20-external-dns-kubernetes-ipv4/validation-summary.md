# Validation Summary: How to Configure External DNS with Kubernetes for IPv4 Services

## Status
validated

## Post Type
Guide

## Technologies Covered
- ExternalDNS
- Kubernetes Services
- Kubernetes Ingress
- Kubernetes RBAC
- Cloudflare DNS
- AWS Route53
- DNS A and TXT records
- `kubectl`
- `dig`

## Sources Consulted
- ExternalDNS flags: https://kubernetes-sigs.github.io/external-dns/latest/docs/flags/
- ExternalDNS Cloudflare tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/cloudflare/
- ExternalDNS AWS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- ExternalDNS Service source: https://kubernetes-sigs.github.io/external-dns/latest/docs/sources/service/
- ExternalDNS Ingress source: https://kubernetes-sigs.github.io/external-dns/latest/docs/sources/ingress/
- ExternalDNS TXT registry: https://kubernetes-sigs.github.io/external-dns/latest/docs/registry/txt/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- `kubectl create secret generic` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic
- `kubectl create namespace` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_namespace

## Issues Found
- The post created provider secrets in the `external-dns` namespace before that namespace existed. I added `kubectl create namespace external-dns` before the secret creation step so the commands work in order.
- The Deployment manifest referenced `serviceAccountName: external-dns` but did not define the ServiceAccount or the RBAC resources ExternalDNS needs to watch Services and Ingresses. I added `ServiceAccount`, `ClusterRole`, and `ClusterRoleBinding` resources based on the current official manifest pattern.
- The manifest used `registry.k8s.io/external-dns/external-dns:v0.14.0`, which is behind the current official docs example. I updated it to `v0.21.0` to align with the current documentation.
- The comment for `--policy=upsert-only` was inaccurate. `upsert-only` prevents deletions entirely; it is not conditional on record ownership. I corrected the comment to match actual flag behavior.
- The opening explanation and inline comments were too specific about always creating A records pointing directly to IPv4 addresses. ExternalDNS derives targets from Service and Ingress status, and provider behavior can result in A, ALIAS, or CNAME-style records depending on the target. I narrowed the wording so it is accurate while still preserving the IPv4 focus.
- The expected log line and TXT verification example were written as exact outputs even though ExternalDNS output and TXT metadata format can vary by provider/version/configuration. I changed them to behavior-based expectations that remain technically correct.
- The Ingress section implied hostname processing alone was sufficient. I clarified that the Ingress controller must first publish an address for ExternalDNS to derive targets from the Ingress status.

## Review Notes
- The walkthrough is still primarily a Cloudflare deployment example. The AWS Route53 snippet is only a credential-storage example; a full Route53 deployment requires AWS-specific provider configuration and authentication, as covered in the official AWS tutorial.
- ExternalDNS uses the TXT registry by default, so the post’s TXT ownership verification remains valid without adding an explicit `--registry=txt` flag.
