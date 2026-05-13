# Validation Summary: How to Deploy Traefik with Let's Encrypt via Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Traefik Proxy
- Traefik Helm chart
- Let's Encrypt ACME
- Kubernetes Ingress
- HelmRelease
- PersistentVolumeClaim
- Prometheus ServiceMonitor

## Sources Consulted
- Traefik Helm chart repository and default values: https://github.com/traefik/traefik-helm-chart
- Traefik Helm chart v28.3.0 values: https://raw.githubusercontent.com/traefik/traefik-helm-chart/v28.3.0/traefik/values.yaml
- Traefik Helm chart v28.3.0 examples: https://raw.githubusercontent.com/traefik/traefik-helm-chart/v28.3.0/EXAMPLES.md
- Traefik Kubernetes Ingress documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/ingress/
- Traefik ACME certificate resolver documentation: https://doc.traefik.io/traefik/reference/install-configuration/tls/certificate-resolvers/acme/
- Traefik Kubernetes installation documentation: https://doc.traefik.io/traefik/master/setup/kubernetes/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The introduction claimed the guide configured both HTTP-01 and DNS-01 challenges and high availability, but the manifests only configured HTTP-01 and a single Traefik replica. Updated the text to describe HTTP-01 with persistent certificate storage.
- The examples used resources in the `traefik` namespace without creating that namespace. Added a namespace manifest to the setup snippet.
- The Helm values used `certificatesResolvers`, which is Traefik static configuration syntax, but the Traefik Helm chart v28 values key is `certResolvers`. Updated the HelmRelease values to use the chart-supported key and shape.
- The Helm values set entrypoint container ports to `80` and `443`. Updated them to the chart defaults `8000` and `8443` while keeping the Service `exposedPort` values at `80` and `443`.
- The Helm values used `replicaCount`, which is not the Traefik chart v28 value for Deployment replicas. Updated it to `deployment.replicas`.
- The ACME storage setup did not ensure `/data/acme.json` had the required restrictive file permissions. Added an init container and pod security context matching the chart's documented Let's Encrypt examples.
- The Flux Kustomization health check referenced the generated Deployment instead of the HelmRelease being applied by the Kustomization. Updated it to health-check the HelmRelease.
- The Ingress example implied Traefik would manage a Kubernetes TLS Secret for Let's Encrypt certificates. Traefik's documentation states Let's Encrypt certificates are not managed in Kubernetes Secrets, so the `spec.tls.secretName` section was removed and the TLS router annotation was added.
- The dashboard port-forward command targeted the Traefik Service on port 9000, but the chart does not expose that port on the public Service by default. Updated the command to port-forward the Deployment.
- The high availability best practice suggested Redis or shared filesystem storage for Traefik Proxy ACME. Traefik's current documentation recommends Traefik Enterprise or cert-manager for Let's Encrypt HA in Kubernetes, so the guidance was corrected.

## Review Notes
- The Prometheus ServiceMonitor example assumes the Prometheus Operator CRDs are installed and available before rendering the chart.
- The `storageClassName: standard` PVC value is cluster-specific and may need to be changed for providers that use a different default StorageClass.
- Local CLI verification with `helm`, `kubectl`, and `flux` could not be performed because those binaries are not installed in the review environment. YAML snippets were parsed successfully with PyYAML.
