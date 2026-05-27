# Validation Summary: How to Set Up Automatic DNS Records for GKE Ingress Resources

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Google Cloud DNS
- Kubernetes Ingress
- Kubernetes Gateway API and HTTPRoute
- ExternalDNS
- Helm
- Google Cloud CLI
- Workload Identity Federation for GKE

## Sources Consulted
- ExternalDNS GKE tutorial: https://kubernetes-sigs.github.io/external-dns/v0.13.5/tutorials/gke/
- ExternalDNS Helm chart documentation: https://kubernetes-sigs.github.io/external-dns/latest/charts/external-dns/
- ExternalDNS flags documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/flags/
- ExternalDNS Gateway sources documentation: https://kubernetes-sigs.github.io/external-dns/latest/docs/sources/gateway/
- GKE Workload Identity Federation documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- GKE Ingress documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/ingress
- GKE external Ingress configuration documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/load-balance-ingress
- GKE Gateway API deployment documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/deploying-gateways
- Google Cloud CLI Cloud DNS managed zone reference: https://cloud.google.com/sdk/gcloud/reference/dns/managed-zones/create
- Google Cloud CLI Cloud DNS record set reference: https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/list

## Issues Found
- The ExternalDNS Helm values used the older `provider: google` style and a `google.project` value that is not part of the current chart schema. Changed the example to use `provider.name: google` and `extraArgs.google-project: my-project`, which renders the supported `--google-project` ExternalDNS flag.
- The post implied DNS deletion happens unconditionally when an Ingress is deleted. Clarified that deletion depends on using the `sync` policy.
- The prerequisite and IAM explanation used the older "Workload Identity" name. Updated the wording to "Workload Identity Federation for GKE" and clarified that Standard clusters also need node pools configured for it.
- The sample Deployment used the older `gcr.io/google-samples/hello-app:1.0` image path. Updated it to the current Google sample image in Artifact Registry.
- The HTTPRoute example used `gateway.networking.k8s.io/v1beta1`. Updated it to the current `gateway.networking.k8s.io/v1` API version used in GKE Gateway API examples.

## Review Notes
The tutorial is technically relevant and the remaining commands and Kubernetes manifests are consistent with the cited documentation. In future revisions, the author could add optional guidance for reserving a static global IP for production GKE Ingress resources, but the current ephemeral IP flow is valid for the tutorial.
