# Validation Summary: How to Use Pulumi with Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Pulumi CLI
- Pulumi TypeScript/Node.js
- Pulumi Rancher2 provider
- Pulumi Kubernetes provider
- Rancher
- Kubernetes
- Helm

## Sources Consulted
- Pulumi installation docs: https://www.pulumi.com/docs/install
- Pulumi TypeScript and Node.js docs: https://www.pulumi.com/docs/iac/languages-sdks/javascript/
- Pulumi `pulumi preview` CLI docs: https://www.pulumi.com/docs/iac/cli/commands/pulumi_preview/
- Pulumi `pulumi stack output` CLI docs: https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack_output/
- Pulumi Rancher2 provider overview: https://www.pulumi.com/registry/packages/rancher2/
- Pulumi Rancher2 provider resource docs: https://www.pulumi.com/registry/packages/rancher2/api-docs/provider/
- Pulumi Rancher2 `getCluster` docs: https://www.pulumi.com/registry/packages/rancher2/api-docs/getcluster/
- Pulumi Rancher2 `Project` docs: https://www.pulumi.com/registry/packages/rancher2/api-docs/project/
- Pulumi Rancher2 `Namespace` docs: https://www.pulumi.com/registry/packages/rancher2/api-docs/namespace/
- Pulumi Kubernetes installation and configuration docs: https://www.pulumi.com/registry/packages/kubernetes/installation-configuration/
- Pulumi Kubernetes provider docs: https://www.pulumi.com/registry/packages/kubernetes/api-docs/provider/
- Pulumi Kubernetes Helm Release docs: https://www.pulumi.com/registry/packages/kubernetes/api-docs/helm/v3/release/
- Rancher API keys docs: https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Node.js end-of-life schedule: https://nodejs.org/en/eol

## Issues Found
- The prerequisite `Node.js 18+` was outdated. Node.js 18 reached end-of-life in 2025, so the post was updated to recommend currently supported releases (`Node.js 20 or 22`).
- The prerequisite `Rancher API token` did not match the actual provider configuration shown later in the post, which uses `accessKey` and `secretKey`. The post was updated to say `Rancher API key (access key and secret key)` and the deployment step wording was aligned with that.
- The Helm example referenced `k8sProvider` without defining it. A Kubernetes provider using the Rancher cluster's `kubeConfig` was added so the example is complete and runnable as written.
- The inline comment claiming loops were `not possible in HCL` was inaccurate because HCL supports iteration constructs such as `for_each`. The inaccurate comparison was removed.

## Review Notes
- The Pulumi commands shown (`pulumi new typescript`, `pulumi preview`, `pulumi up`, and `pulumi stack output`) are valid as of 2026-04-24.
- The Rancher2 provider configuration is valid with `apiUrl`, `accessKey`, `secretKey`, and `insecure`. The provider also supports `tokenKey`, but the post consistently uses the access-key/secret-key form after correction.
- The Helm chart example is valid, but it installs the latest chart version because no `version` is pinned. That is acceptable for a tutorial, though pinning versions would make the example more reproducible in the future.
