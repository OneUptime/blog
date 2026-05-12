# Validation Summary: Split-Horizon DNS with Flux CD

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Flux CD (Kustomization API `kustomize.toolkit.fluxcd.io/v1`, HelmRelease API `helm.toolkit.fluxcd.io/v2`)
- CoreDNS (Corefile, `hosts` plugin, `kubernetes`, `forward`, `cache`, `prometheus` plugins)
- ExternalDNS (Service annotations, Cloudflare provider, `sync` policy, TXT owner records)
- Kubernetes (Services of type `LoadBalancer`, ConfigMap, annotations)
- AWS in-tree cloud provider (internal NLB/ELB annotation)
- Split-horizon (split-brain) DNS pattern

## Sources Consulted
- ExternalDNS annotations reference: [https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/](https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/)
- ExternalDNS FAQ on resource exclusion: [https://github.com/kubernetes-sigs/external-dns/blob/master/docs/faq.md](https://github.com/kubernetes-sigs/external-dns/blob/master/docs/faq.md)
- CoreDNS `hosts` plugin: [https://coredns.io/plugins/hosts/](https://coredns.io/plugins/hosts/)
- CoreDNS `kubernetes` plugin: [https://coredns.io/plugins/kubernetes/](https://coredns.io/plugins/kubernetes/)
- Flux Helm Controller v2 API: [https://fluxcd.io/flux/components/helm/api/v2/](https://fluxcd.io/flux/components/helm/api/v2/)
- Flux Kustomize Controller API: [https://fluxcd.io/flux/components/kustomize/api/v1/](https://fluxcd.io/flux/components/kustomize/api/v1/)
- AWS Load Balancer Controller service annotations: [https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.7/guide/service/annotations/](https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.7/guide/service/annotations/)

## Issues Found

1. **Invalid ExternalDNS annotation `external-dns.alpha.kubernetes.io/exclude: "true"`**
   - **What was wrong:** ExternalDNS has no built-in `exclude` annotation. Setting `external-dns.alpha.kubernetes.io/exclude: "true"` has no effect; ExternalDNS would still consider the resource. The documented way to make a source ignore a Kubernetes resource is to set `external-dns.alpha.kubernetes.io/controller` to any value other than `dns-controller`.
   - **Fix applied:** Replaced the annotation with `external-dns.alpha.kubernetes.io/controller: "none"` on the internal service and updated the inline comment to describe the actual mechanism.
   - **Source:** [ExternalDNS annotations docs](https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/) — "If the `external-dns.alpha.kubernetes.io/controller` annotation exists and has a value other than `dns-controller`, the source ignores the resource."

## Review Notes
- `helm.toolkit.fluxcd.io/v2` and `kustomize.toolkit.fluxcd.io/v1` are the current stable Flux APIs and are used correctly.
- The CoreDNS Corefile is syntactically valid. The `hosts` plugin accepts both a file path and inline entries; the inline entries inside the braces are treated as additional content for the hosts file. The duplicated entries between the inline block and the `internal-hosts` ConfigMap key are redundant but not incorrect — readers should note that mounting the `internal-hosts` key into the CoreDNS pod requires updating the CoreDNS Deployment's volume to project that ConfigMap key into `/etc/coredns/`; the default CoreDNS Deployment only projects the `Corefile` key. This is implicit in the post and worth highlighting for readers reproducing the setup, but the YAML itself is not wrong.
- `service.beta.kubernetes.io/aws-load-balancer-internal: "true"` is the legacy in-tree AWS cloud-provider annotation. It still works (and is still emitted by AWS for backward compatibility), but users on the AWS Load Balancer Controller v2.2+ should prefer `service.beta.kubernetes.io/aws-load-balancer-scheme: "internal"`. The post is targeting the legacy controller, so the annotation as written is valid.
- The ExternalDNS Helm chart `version: "1.14.x"` is a real release line but is now several minor versions behind the current `1.21.x`. The constraint is syntactically valid for Flux's HelmRelease and will pin to the 1.14 line; readers may want to bump to a current minor version, but this is not an error.
- ExternalDNS also exposes `external-dns.alpha.kubernetes.io/internal-hostname`, which is purpose-built for emitting "internal" A records based on a service's ClusterIP. Depending on the DNS provider, this can simplify split-horizon setups versus maintaining a CoreDNS hosts file. The post's CoreDNS-based approach is still valid and provider-agnostic, so this is informational only.
- The Mermaid diagram, verification commands, and best-practices section are accurate.
