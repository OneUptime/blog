# Validation Summary: How to Set Up Registry Mirroring in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- K3s
- Kubernetes
- CNCF Distribution (Docker Registry)
- Harbor
- Helm
- containerd
- crictl

## Sources Consulted
- RKE2 private registry configuration: https://docs.rke2.io/install/private_registry
- RKE2 advanced/containerd configuration: https://docs.rke2.io/advanced
- RKE2 CLI tools and logging: https://docs.rke2.io/reference/cli_tools and https://docs.rke2.io/reference/logging
- K3s private registry configuration: https://docs.k3s.io/installation/private-registry
- K3s service restart behavior: https://docs.k3s.io/upgrades/killall
- CNCF Distribution pull-through cache: https://distribution.github.io/distribution/recipes/mirror/
- CNCF Distribution configuration reference: https://distribution.github.io/distribution/about/configuration/
- Harbor proxy cache documentation: https://goharbor.io/docs/2.11.0/administration/configure-proxy-cache/
- Harbor replication/registry endpoint documentation: https://goharbor.io/docs/2.9.0/administration/configuring-replication/create-replication-endpoints/
- Harbor robot accounts documentation: https://goharbor.io/docs/2.12.0/administration/robot-accounts/
- Harbor Helm chart defaults: https://github.com/goharbor/harbor-helm/blob/main/values.yaml
- Harbor v2 API schema: https://raw.githubusercontent.com/goharbor/harbor/main/api/v2.0/swagger.yaml

## Issues Found
- The RKE2 and K3s `registries.yaml` examples used outdated/incorrect keys. I changed `endpoints` to `endpoint` and corrected the TLS field naming to current Rancher/containerd conventions by removing the invalid example block entirely from the plain-HTTP mirror example.
- The post manually added upstream fallback endpoints for `docker.io`, `quay.io`, `gcr.io`, and `registry.k8s.io`. Current RKE2/K3s docs state the default endpoint is already tried last unless fallback is explicitly disabled, so I removed the manual fallback entries and corrected the conclusion text.
- The Docker Distribution example implied one pull-through cache instance could back multiple upstream registries. Official Distribution docs allow only one upstream per cache instance, so I limited the concrete example to Docker Hub and added a note that separate instances are required per upstream registry.
- The K3s example used a path-based mirror endpoint and only restarted `k3s`. I replaced it with a valid root endpoint example and added the correct `k3s-agent` restart command for agent nodes.
- The Harbor Helm install snippet omitted the official chart repo setup and namespace creation. I added `helm repo add`, `helm repo update`, and `--create-namespace`, and aligned the exposure example with the `externalURL`.
- The Harbor values snippet described the `proxy:` block as proxy-cache configuration. That block is actually for Harbor's outbound proxy settings, so I corrected the wording.
- The Harbor API example for creating a registry endpoint did not match the current Harbor API schema. I added the required nested `credential` object and kept the official `docker-hub` registry type and `https://hub.docker.com` endpoint.
- The Harbor project creation example used top-level `public: true`; current Harbor metadata models project visibility under `metadata`. I moved public visibility to `metadata.public` and kept `registry_id` as the proxy-cache project linkage.
- The Harbor mirror example used a path-based endpoint (`https://harbor.internal/dockerhub`) for RKE2. I changed it to a registry-root endpoint plus a rewrite so pulls map correctly into the Harbor proxy-cache project.
- The Harbor robot account username example used a nonstandard placeholder. I updated it to the documented default robot-account prefix format.
- The verification and cache-warming examples used ambiguous Docker Hub image names such as `nginx:latest`. I changed them to canonical `docker.io/library/...` references where needed so the mirror and Harbor proxy-cache paths are accurate.
- The verification and troubleshooting examples relied on less reliable journald grep patterns. I updated them to use RKE2's documented `crictl` configuration and containerd log locations.

## Review Notes
- The article does not pin exact Rancher, RKE2, K3s, Harbor, or Distribution versions. The corrected examples align with the official documentation available on 2026-04-23, but future version bumps should be rechecked.
- RKE2 and K3s default-endpoint fallback behavior is version-sensitive and can be disabled in newer releases, which matters for restricted and air-gapped environments.
