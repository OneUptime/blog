# Validation Summary: How to Manage Cluster Addons Consistently with Flux CD

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Flux CD Kustomizations and HelmReleases
- Kubernetes custom resources and CRDs
- Helm chart configuration
- cert-manager
- ingress-nginx
- kube-prometheus-stack
- Fluent Bit
- Kyverno
- kubectl and Flux CLI

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux CLI `flux get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- cert-manager v1.14 Helm installation documentation: https://cert-manager.io/v1.14-docs/installation/helm/
- cert-manager v1.14.7 Helm chart values: https://raw.githubusercontent.com/cert-manager/cert-manager/v1.14.7/deploy/charts/cert-manager/values.yaml
- ingress-nginx 4.9.1 Helm chart values: https://raw.githubusercontent.com/kubernetes/ingress-nginx/helm-chart-4.9.1/charts/ingress-nginx/values.yaml
- kube-prometheus-stack 56.21.4 Helm chart values: https://raw.githubusercontent.com/prometheus-community/helm-charts/kube-prometheus-stack-56.21.4/charts/kube-prometheus-stack/values.yaml
- Fluent Bit 0.43.0 Helm chart values: https://raw.githubusercontent.com/fluent/helm-charts/fluent-bit-0.43.0/charts/fluent-bit/values.yaml
- Kyverno installation documentation: https://kyverno.io/docs/installation/installation/
- Kyverno v1.11.4 Helm chart values: https://raw.githubusercontent.com/kyverno/kyverno/v1.11.4/charts/kyverno/values.yaml
- Kubernetes kubectl reference and quick reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The addon architecture and base kustomization referenced addons such as `external-secrets`, `external-dns`, and `metrics-server` that were not defined elsewhere in the guide. Removed those undeclared addons from the diagram and base kustomization/tree so the sample repository is internally consistent.
- The cert-manager `ClusterIssuer` was shown in the cert-manager addon path, which would apply a `cert-manager.io/v1` custom resource before the cert-manager HelmRelease had installed the CRDs. Moved it into a separate `cert-manager-issuers` path and added a Flux Kustomization that depends on the cert-manager Kustomization.
- The cert-manager HelmRelease used Flux `install.crds` and `upgrade.crds` with a comment saying CRDs were installed before the chart. cert-manager v1.14 manages CRDs through the chart's `installCRDs: true` value, so the Flux CRD policy block was removed from that example and the troubleshooting note was clarified.
- The Kyverno Helm values used top-level `replicaCount` and `resources`, which are not the chart 3.x values for configuring controller replicas and resources. Replaced them with `admissionController`, `backgroundController`, `cleanupController`, and `reportsController` settings.
- The Kyverno `ClusterPolicy` resources were in the same path as the Kyverno HelmRelease, which could apply policies before Kyverno CRDs existed. Moved them into a separate `policy-engine-policies` path and added a dependent Flux Kustomization.
- The addon version check parsed `flux get helmreleases` table columns with `awk`, which does not reliably return chart versions. Replaced it with a `kubectl get helmreleases.helm.toolkit.fluxcd.io` custom-columns command that reads the chart and version from the HelmRelease spec.
- The health check used `grep False` against human-readable output. Replaced it with Flux's `--status-selector ready=false` filter.

## Review Notes
The local environment did not have `helm`, `flux`, or `kubectl` installed, so CLI behavior was verified against official documentation rather than local `--help` output. The chart examples pin older chart lines such as cert-manager `1.14.x`, ingress-nginx `4.9.x`, kube-prometheus-stack `56.x`, Fluent Bit `0.43.x`, and Kyverno `3.1.x`; those values were reviewed against the matching chart versions, not upgraded to newer releases.
