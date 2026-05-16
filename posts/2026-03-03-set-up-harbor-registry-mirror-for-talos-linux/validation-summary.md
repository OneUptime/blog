# Validation Summary: How to Set Up Harbor Registry Mirror for Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux machine configuration
- Harbor registry proxy cache
- Harbor Helm chart
- Harbor REST API
- Kubernetes and kubectl
- Helm
- Container registry mirrors

## Sources Consulted
- Harbor proxy cache documentation: https://goharbor.io/docs/main/administration/configure-proxy-cache/
- Harbor Helm chart values and configuration: https://github.com/goharbor/harbor-helm
- Harbor API v2.0 Swagger specification: https://raw.githubusercontent.com/goharbor/harbor/main/api/v2.0/swagger.yaml
- Harbor garbage collection documentation: https://goharbor.io/docs/main/administration/garbage-collection/
- Harbor system robot account documentation: https://goharbor.io/docs/2.14.0/administration/robot-accounts/
- Talos Linux pull-through image cache documentation: https://docs.siderolabs.com/talos/v1.11/configure-your-talos-cluster/images-container-runtime/pull-through-cache
- Talos Linux configuration patching documentation: https://www.talos.dev/latest/talos-guides/configuration/patching/

## Issues Found
- The Talos mirror configuration pointed at Harbor proxy cache paths without `overridePath: true`. Talos documentation states that Harbor proxy cache paths require `overridePath: true` so containerd does not append `/v2` to the endpoint path. Added `overridePath: true` to the Docker Hub and GHCR mirror examples.
- The Talos mirror examples mixed Harbor proxy cache endpoints with normal upstream endpoints under the same mirror. With `overridePath: true`, those normal upstream endpoints would not be handled correctly. Removed the direct upstream fallback endpoints from the Harbor mirror examples.
- The Talos authentication example used `talos-puller` as the username even though Harbor robot accounts authenticate as the configured robot prefix plus account name, such as `robot$talos-puller`. Updated the example username.
- The Harbor API examples assumed the created registry IDs would be `1` and `2`. Harbor's API returns created resource locations, and those IDs are not guaranteed in an existing Harbor instance. Updated the examples to capture the registry ID from the `Location` response header and use it when creating proxy cache projects.
- The Helm values example described the `proxy` block as proxy cache configuration. In the Harbor Helm chart, that block configures outbound proxy settings for Harbor components. Updated the comment to avoid conflating outbound proxy settings with Harbor proxy cache projects.
- The running Talos patch commands used `talosctl patch machineconfig`. Current Talos documentation shows patching live machine config with `talosctl patch mc --patch @patch.yaml`. Updated the commands.

## Review Notes
The post is technically relevant and suitable as a tutorial. The examples still use placeholder credentials and hostnames, which is appropriate for a guide but should be replaced with real secrets, TLS certificates, and Harbor endpoint details in production.
