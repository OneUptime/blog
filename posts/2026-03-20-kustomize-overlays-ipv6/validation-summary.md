# Validation Summary: How to Configure Kustomize Overlays for IPv6 Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kustomize
- Kubernetes Services
- Kubernetes dual-stack networking
- IPv6
- GitOps
- Amazon EKS / AWS LoadBalancer Service annotations

## Sources Consulted
- Kubernetes: Declarative Management of Kubernetes Objects Using Kustomize - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes: IPv4/IPv6 dual-stack - https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes: `kubectl kustomize` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kustomize upstream API definition (`Kustomization` type) - https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/api/types/kustomization.go
- Kustomize upstream label type definition - https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/api/types/labels.go
- Kustomize upstream replacement type definition - https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/api/types/replacement.go
- Amazon EKS: Route TCP and UDP traffic with Network Load Balancers - https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html
- RFC 3849: IPv6 Address Prefix Reserved for Documentation - https://www.rfc-editor.org/info/rfc3849

## Issues Found
- The overlays used deprecated Kustomize fields: `bases`, `commonLabels`, and `vars`. I updated them to `resources`, `labels`, and `replacements` based on the current upstream Kustomize API definitions.
- Several sample IPv6 literals were invalid because they used non-hexadecimal segments such as `staging`, `prod`, and `redis`. I replaced them with valid documentation addresses from `2001:db8::/32` per RFC 3849.
- The base Service example claimed that omitting `ipFamilyPolicy` defaults the Service to IPv4. Kubernetes documents that it defaults to `SingleStack` using the cluster's primary Service CIDR family, which may be IPv4 or IPv6. I corrected that explanation.
- The verification examples assumed exact `clusterIPs` values such as `fd00::1` and `10.96.1.1`. Service cluster IPs are assigned by the cluster, so I changed the commands and expectations to verify address families and the presence of assigned IPs instead of hard-coding exact values.
- The production LoadBalancer example included an AWS annotation without context. I kept the annotation but marked it as AWS-specific so the example does not imply that it is generic Kubernetes behavior.

## Review Notes
- Local execution was not possible in this workspace because `kubectl` and `kustomize` were not installed, so command and schema verification was documentation-based.
- The production LoadBalancer example is only valid when the cloud provider supports dual-stack load balancers; Kubernetes documents that this is provider-dependent.
