# Validation Summary: How to Integrate MetalLB with External-DNS for Automatic DNS Records

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Services and Ingress
- MetalLB
- ExternalDNS
- Helm
- Cloudflare DNS
- AWS Route 53
- Google Cloud DNS

## Sources Consulted
- ExternalDNS Helm chart documentation: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/
- ExternalDNS Cloudflare tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/cloudflare/
- ExternalDNS Service source documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/sources/service/
- ExternalDNS Ingress source documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/sources/ingress/
- ExternalDNS annotations documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- ExternalDNS AWS tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/aws/
- ExternalDNS project documentation for Google provider flags: https://kubernetes-sigs.github.io/external-dns/
- MetalLB concepts documentation: https://metallb.io/concepts/
- MetalLB usage documentation: https://metallb.io/usage/index.html

## Issues Found
- The Google Cloud DNS Helm example used `--set google.project=my-gcp-project`. The current official ExternalDNS Helm chart does not expose `google.project` as a rendered chart value; provider-specific CLI flags that are not chart values should be passed with `extraArgs`. Changed it to `--set extraArgs.google-project=my-gcp-project` so Helm renders `--google-project=my-gcp-project`.

## Review Notes
- The Service examples correctly use `type: LoadBalancer` and `external-dns.alpha.kubernetes.io/hostname`; ExternalDNS uses the Service load balancer status as the DNS target when no explicit target annotation is set.
- The Ingress example correctly relies on `spec.rules[].host`; ExternalDNS uses the Ingress `status.loadBalancer.ingress` values as targets.
- The Cloudflare TTL example uses `300`, which is valid for Cloudflare's documented minimum TTL requirements.
- The review was performed against official documentation. Local `helm` and `kubectl` binaries were not installed in the workspace, so command rendering and Kubernetes schema validation were checked from official chart/source documentation rather than local CLI output.
