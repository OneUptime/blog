# Validation Summary: How to Configure GCE Ingress Controller for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes Ingress
- Google Cloud Application Load Balancers
- Google Cloud CLI (`gcloud`)
- IPv4/IPv6 dual-stack networking
- Kubernetes `Service`, `BackendConfig`, and `NetworkPolicy` resources

## Sources Consulted
- GKE: Create a VPC-native cluster - https://cloud.google.com/kubernetes-engine/docs/how-to/alias-ips
- GKE: GKE Ingress for Application Load Balancers - https://cloud.google.com/kubernetes-engine/docs/concepts/ingress
- GKE: Configure Ingress for external Application Load Balancers - https://cloud.google.com/kubernetes-engine/docs/how-to/load-balance-ingress
- GKE: Configuring Ingress for internal Application Load Balancers - https://cloud.google.com/kubernetes-engine/docs/how-to/internal-load-balance-ingress
- GKE: Ingress configuration - https://cloud.google.com/kubernetes-engine/docs/how-to/ingress-configuration
- GKE: Understand Kubernetes Services - https://cloud.google.com/kubernetes-engine/docs/concepts/service
- Cloud Load Balancing: IPv6 for Application Load Balancers and proxy Network Load Balancers - https://cloud.google.com/load-balancing/docs/ipv6
- Cloud Load Balancing: Health checks overview - https://cloud.google.com/load-balancing/docs/health-check-concepts

## Issues Found
- The original title and description overstated what the built-in GKE Ingress flow documents for IPv6. I retitled and reframed the post around configuring GKE Ingress correctly on a dual-stack cluster instead of claiming direct IPv6 frontend configuration throughout.
- The cluster creation examples used inaccurate dual-stack setup commands, including `--cluster-ipv6-cidr`, which is not part of the documented GKE dual-stack cluster creation flow. I replaced them with the current documented `--stack-type=ipv4-ipv6`, `--ipv6-access-type`, and `--create-subnetwork` based commands.
- The Ingress manifest incorrectly used `spec.ingressClassName`. GKE's built-in Ingress controller still requires the `kubernetes.io/ingress.class` annotation, so I removed `ingressClassName`.
- The manifest comment said `kubernetes.io/ingress.allow-http: "false"` configured HTTP-to-HTTPS redirects. That annotation disables HTTP; Google documents `FrontendConfig.redirectToHttps` for redirects. I corrected the explanation.
- The static address section claimed separate IPv6 address reservation and AAAA setup as if it were directly attached through the same GKE Ingress annotation flow. I replaced this with the documented static global address flow that the built-in external GKE Ingress configuration exposes.
- The BackendConfig and verification sections treated the GKE Ingress backends and health checks as IPv6-specific. I corrected them to standard health-check behavior, added explicit NEG annotation for container-native load balancing, and removed the unsupported IPv6 health-check claims.
- The internal Ingress section incorrectly described an internal IPv6 frontend. I corrected it to the documented behavior: internal GKE Ingress creates a regional internal Application Load Balancer with an IPv4 frontend address.
- The NetworkPolicy example used an incorrect IPv6 source range (`2600:1901::/32`) for load balancer health checks. Google documents IPv4 source ranges `35.191.0.0/16` and `130.211.0.0/22` for classic Application Load Balancer backends, so I removed the invalid IPv6 rule.

## Review Notes
- External GKE Ingress creates a classic Application Load Balancer. Internal GKE Ingress creates a regional internal Application Load Balancer. Those load balancer types have different documented IPv6 frontend capabilities, which is why the corrected post now distinguishes them instead of treating them as equivalent.
- The local workspace did not have the `gcloud` CLI installed, so command validation was performed against the official Google Cloud CLI and product documentation rather than local `gcloud --help` output.
