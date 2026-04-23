# Validation Summary: How to Install Rancher Turtles

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher
- Rancher Turtles
- Cluster API (CAPI)
- Helm
- kubectl
- cert-manager
- CAPIProvider
- Cluster API Provider AWS (CAPA)

## Sources Consulted
- Rancher Cluster API overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/cluster-api/overview
- Rancher Turtles Rancher Setup: https://turtles.docs.rancher.com/turtles/stable/en/tutorials/rancher.html
- Rancher Turtles CAPIProvider reference: https://turtles.docs.rancher.com/turtles/stable/en/reference/capiprovider.html
- Rancher Turtles features: https://turtles.docs.rancher.com/turtles/stable/en/overview/features.html
- Rancher v2.14 guide for native CAPI infrastructure providers: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/capi-infrastructure-providers
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- Cluster API `clusterctl init` command reference: https://main.cluster-api.sigs.k8s.io/clusterctl/commands/init.html
- Rancher Turtles published chart index: https://rancher.github.io/turtles/index.yaml
- Rancher Turtles `0.26.0` chart release package: https://github.com/rancher/turtles/releases/download/v0.26.0/rancher-turtles-0.26.0.tgz

## Issues Found
- The original post claimed `Rancher v2.9+` as the prerequisite. I updated this to version-compatible guidance because current Rancher Turtles chart releases are tied to specific Rancher release lines; chart `0.26.0` is published for Rancher `v2.14.x`.
- The original install, verification, upgrade, and uninstall commands used the outdated `rancher-turtles-system` namespace. I corrected these to `cattle-turtles-system`, and updated core CAPI checks to `cattle-capi-system`, matching the current chart defaults and documentation.
- The original custom `turtles-values.yaml` example used an outdated values schema and deprecated provider nesting. I replaced it with the current chart structure using `namespace`, `image`, `features`, and `cluster-api-operator.cluster-api.core`.
- The original verification section checked `rke2-bootstrap-system` and `rke2-control-plane-system` as part of the default installation. I removed those checks and replaced them with the current Rancher Turtles and core CAPI controller checks.
- The original Rancher UI section implied that a CAPI menu/dashboard automatically appears after the manual Helm install. I changed this to a safe verification path in Rancher UI based on the installed app state.
- The original infrastructure provider step used raw provider manifests and `clusterctl init --infrastructure aws`. I replaced it with the current Rancher Turtles `CAPIProvider` workflow for declarative provider installation.
- The original cert-manager step used older CRD flag syntax. I updated it to the current documented Helm syntax with an explicit chart version and `crds.enabled=true`.
- The original uninstall step only targeted `cluster.x-k8s.io` CRDs. I expanded it to include Rancher Turtles CRDs as well.

## Review Notes
- Rancher and Rancher Turtles documentation is version-sensitive. Current Rancher Turtles docs also note that newer Rancher releases may already ship Rancher Turtles as a system chart, so the post now explicitly frames itself as the manual Helm installation path.
- The cert-manager docs currently recommend OCI charts as the source of truth, although the Jetstack Helm repository flow used in the article remains supported.
- The guide now pins Rancher Turtles `0.26.0` because it is the current stable chart line relevant to the post date. Future chart releases may change compatible Rancher versions, namespaces, or supported values.
