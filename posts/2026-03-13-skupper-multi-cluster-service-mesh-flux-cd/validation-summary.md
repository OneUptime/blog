# Validation Summary: How to Deploy Skupper for Multi-Cluster Service Mesh with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Skupper (Red Hat Service Interconnect) - multi-cluster service interconnect
- Flux CD (HelmRelease, HelmRepository, Kustomization)
- Kubernetes
- SOPS (secret encryption for GitOps)
- Submariner (referenced for comparison)
- AMQP (underlying Skupper transport)

## Sources Consulted
- [Skupper installation docs](https://skupper.io/docs/install/index.html)
- [Skupper CLI commands](https://skupper.io/commands/)
- [skupper token create reference](https://skupper.io/docs/kubernetes-reference/skupper_token_create.html)
- [Skupper Helm chart on ArtifactHub](https://artifacthub.io/packages/helm/skupper/skupper)
- [Skupper service exposure (YAML)](https://skupper.io/docs/kube-yaml/service-exposure.html)
- [Skupper Listener resource](https://skupper.io/resources/listener.html)
- [Skupper Connector resource](https://skupper.io/resources/connector.html)
- [Flux source-controller HelmRepository API](https://fluxcd.io/flux/components/source/helmrepositories/)
- [Flux helm-controller HelmRelease API](https://fluxcd.io/flux/components/helm/helmreleases/)
- [Red Hat Service Interconnect 1.9 docs (annotation-based exposure)](https://docs.redhat.com/en/documentation/red_hat_service_interconnect/1.9/html/using_service_interconnect/skupper-declarative)

## Issues Found
- **HelmRepository URL was fabricated.** The post specified `url: https://skupper.io/releases/latest`, which returns HTTP 404 and is not a valid Helm chart repository. Skupper's official Helm distribution is an OCI registry at `oci://quay.io/skupper/helm/skupper`. Changed the HelmRepository to `type: oci` with `url: oci://quay.io/skupper/helm`.
- **Chart name and version did not match the real chart.** The post referenced chart `skupper-site-controller` at version `1.7.x`. The published OCI chart is named `skupper` and is in the 2.x release line (e.g. 2.1.x, 2.2.x). Updated the HelmRelease to chart `skupper` and version `2.x`.

## Review Notes
- The post blends Skupper v1 patterns (ConfigMap-based site config, `skupper.io/proxy` / `skupper.io/port` annotations on Services, `skupper token create`, `skupper status`, `skupper link status`, `skupper network status`) with the current OCI Helm distribution. Skupper v2 (the current default since 2024) replaces annotation-based service exposure with the `Listener` and `Connector` CRDs (`skupper.io/v2alpha1`) and uses a `Site` CR instead of the ConfigMap. The annotation-based workflow is still documented for v1 / Red Hat Service Interconnect 1.x, so the content remains valid for users on that line, but readers running Skupper v2 will need to translate to the CRD API.
- The Skupper connection-token Secret structure (`labels.skupper.io/type: connection-token`, data keys `ca.crt`, `tls.crt`, `tls.key`, `inter-router-host`, `inter-router-port`) matches the v1 token format. Real tokens also include additional metadata annotations (e.g. `skupper.io/generated-by`, `skupper.io/url`); these were correctly omitted from the snippet for brevity.
- The Flux API versions used (`source.toolkit.fluxcd.io/v1`, `helm.toolkit.fluxcd.io/v2`, `kustomize.toolkit.fluxcd.io/v1`) are all the GA APIs and are correct.
- The Skupper vs Submariner comparison table is conceptually accurate: Skupper operates at L7 over AMQP and is NAT/CIDR-overlap tolerant; Submariner operates at L3 with IPsec/VXLAN and requires non-overlapping pod/service CIDRs and IP reachability between gateway nodes.
- The `skupper token create` CLI flags (`--kubeconfig`, `--namespace`) are valid and current.
