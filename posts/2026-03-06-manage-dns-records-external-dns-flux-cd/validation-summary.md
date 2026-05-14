# Validation Summary: How to Manage DNS Records with External-DNS and Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- External-DNS
- Flux CD
- Kubernetes Services and Ingresses
- HelmRelease and HelmRepository resources
- Kustomize Controller Kustomization resources
- DNSEndpoint CRDs
- AWS Route53
- Cloudflare DNS
- Prometheus ServiceMonitor
- SOPS secret decryption

## Sources Consulted
- External-DNS Helm chart documentation: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/
- External-DNS Helm repository index: https://kubernetes-sigs.github.io/external-dns/index.yaml
- External-DNS chart package 1.21.1 contents: https://github.com/kubernetes-sigs/external-dns/releases/download/external-dns-helm-chart-1.21.1/external-dns-1.21.1.tgz
- External-DNS CRD source documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/sources/crd/
- External-DNS DNSEndpoint tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/crd/
- External-DNS annotations documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/annotations/annotations/
- External-DNS Cloudflare tutorial: https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/cloudflare/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Cloudflare proxied DNS records documentation: https://developers.cloudflare.com/dns/proxy-status/

## Issues Found
- The HelmRelease examples pinned the External-DNS chart to `1.14.x`, which is outdated for a 2026 validation. Updated all examples to `1.21.x`, matching the current official Helm repository index at review time.
- The Route53 Helm values used `metrics.serviceMonitor.enabled`, but the official External-DNS chart exposes ServiceMonitor configuration at `serviceMonitor.enabled`. Updated the values block so the Prometheus Operator ServiceMonitor is actually rendered.
- The DNSEndpoint examples include MX and TXT records, but External-DNS manages A, AAAA, and CNAME by default unless additional record types are enabled. Added `managedRecordTypes` for A, AAAA, CNAME, MX, and TXT to the HelmRelease examples that enable the `crd` source.
- The Cloudflare example comment claimed `--cloudflare-dns-records-per-page=5000` limits proxying to A and CNAME records. The flag controls API pagination. Updated the comment to describe the actual behavior.
- The Ingress annotation example described `external-dns.alpha.kubernetes.io/target` as setting the record type. The annotation overrides DNS record targets. Updated the comment accordingly.

## Review Notes
- The local environment did not have `helm`, `flux`, or `kubectl` installed, so CLI validation was performed against official documentation, the published Helm repository index, and the packaged External-DNS chart archive.
- The External-DNS 1.21.1 chart package includes the `dnsendpoints.externaldns.k8s.io` CRD, so the DNSEndpoint examples are valid when installed through the chart.
