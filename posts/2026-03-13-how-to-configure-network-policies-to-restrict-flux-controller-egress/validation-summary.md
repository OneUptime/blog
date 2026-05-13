# Validation Summary: How to Configure Network Policies to Restrict Flux Controller Egress

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux v2
- Kubernetes NetworkPolicy
- Kubernetes CNI network policy enforcement
- Kubernetes API server access
- Kubernetes DNS / CoreDNS
- kubectl

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux latest installation manifest: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux CLI documentation for `flux get sources git`: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI documentation for `flux get kustomizations`: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI documentation for `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/

## Issues Found
- The prerequisite stated "Kubernetes 1.24 or later", which is outdated for current Flux releases. I changed it to require a Kubernetes version supported by the installed Flux release.
- The CNI verification step claimed that successful NetworkPolicy object creation proves CNI enforcement support. Kubernetes accepts NetworkPolicy resources even when the network plugin does not enforce them, so I clarified that this only proves API availability and that enforcement must be confirmed separately.
- The controller egress table omitted Flux internal service traffic. The kustomize-controller and helm-controller fetch artifacts from source-controller, and Flux controllers configured with `--events-addr` send events to notification-controller, so I added those internal dependencies.
- The policy set did not allow internal controller-to-controller egress inside `flux-system`. I added an `allow-flux-system-internal` NetworkPolicy for the Flux service ports used by source-controller and notification-controller.
- The combined `flux-egress-policies.yaml` example omitted the `allow-kube-api` policy from Step 3. I updated the combined example to populate `KUBE_API_IP` and include the API-server allow policy.
- The source-controller section said the policy allowed "HTTPS egress only" while the example also allowed SSH on TCP port 22. I changed the wording to "HTTPS and SSH".
- The broad external egress examples excluded RFC1918 private ranges but still allowed link-local addresses such as the common cloud metadata range. I added `169.254.0.0/16` to the excluded CIDRs and updated the explanation.

## Review Notes
The NetworkPolicy shapes use the current `networking.k8s.io/v1` API and the Flux controller pod labels in the current Flux install manifest still include `app: <controller-name>`, so the controller selectors are valid for standard Flux installs. The `kubectl` and `flux` binaries were not installed in the review environment; CLI verification was performed against official documentation, and YAML syntax was checked by parsing the embedded YAML snippets with `js-yaml`.
