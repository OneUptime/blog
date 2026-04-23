# Validation Summary: How to Use Pulumi with Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Pulumi CLI
- Pulumi Rancher2 provider
- Rancher
- Kubernetes
- TypeScript
- GitHub Actions

## Sources Consulted
- Pulumi Rancher2 provider overview and configuration: https://www.pulumi.com/registry/packages/rancher2/
- Pulumi Rancher2 installation and configuration: https://www.pulumi.com/registry/packages/rancher2/installation-configuration/
- Pulumi Rancher2 `ClusterV2` docs: https://www.pulumi.com/registry/packages/rancher2/api-docs/clusterv2/
- Pulumi Rancher2 `Project` docs: https://www.pulumi.com/registry/packages/rancher2/api-docs/project/
- Pulumi Rancher2 `AppV2` docs: https://www.pulumi.com/registry/packages/rancher2/api-docs/appv2/
- Pulumi configuration docs: https://www.pulumi.com/docs/iac/concepts/config/
- Pulumi install docs: https://www.pulumi.com/docs/get-started/download-install/
- Pulumi CLI docs for `pulumi new`: https://www.pulumi.com/docs/iac/cli/commands/pulumi_new/
- Pulumi CLI docs for `pulumi stack select`: https://www.pulumi.com/docs/cli/commands/pulumi_stack_select/
- Pulumi CLI docs for `pulumi login`: https://www.pulumi.com/docs/reference/cli/pulumi_login/
- Pulumi stacks docs: https://www.pulumi.com/docs/iac/concepts/stacks/
- Pulumi GitHub Action README: https://github.com/pulumi/actions
- Rancher official charts index: https://github.com/rancher/charts
- Node.js release schedule: https://nodejs.org/en/about/releases/

## Issues Found
- The prerequisite listed `npm install -g pulumi` for the Pulumi CLI. I changed this to Pulumi’s documented install method because the official Node SDK docs point readers to the Pulumi installer for the CLI.
- The prerequisite listed `Node.js 18+`, but Node.js 18 is end-of-life. I updated this to `Node.js 20+` to match currently supported LTS releases.
- The setup section hard-coded a specific RKE2 version in later snippets. I changed the guide to configure `kubernetesVersion` via Pulumi config so the example does not lock readers to a stale release string.
- The cluster example used `pulumi.Config()` for `environment`, while later commands used Pulumi stacks such as `production` and `staging`. I switched the example to `pulumi.getStack()` so the code matches the CLI workflow shown later in the post.
- The cluster example used `awsCredential.name` for `cloudCredentialSecretName`. Pulumi’s `ClusterV2` examples use the cloud credential `id`, so I corrected both machine pools to use `awsCredential.id`.
- The cluster example named the cluster `production-${environment}`, which would produce incorrect names such as `production-staging`. I corrected the name to `cluster-${environment}`.
- The projects snippet was missing the `@pulumi/pulumi` import and referenced `cluster` without importing it. I added the missing imports so the example is syntactically valid.
- Step 3 claimed to cover RBAC, but the snippet only created Rancher projects and quotas. I corrected the heading and file comment to match the actual code.
- The Helm example tried to install `cert-manager` from `repoName: "rancher-charts"`, but Rancher’s official charts index does not publish that chart there. I replaced it with Rancher charts that do exist in the official catalog.
- The Helm example used `rancher-monitoring` chart version `103.0.0`, but Pulumi’s current `AppV2` docs and Rancher’s chart index show `9.4.200` for that chart in the documented example. I updated the version accordingly.
- The multi-environment `AppV2` snippet omitted required chart fields such as `repoName`, `chartName`, `name`, `namespace`, and `chartVersion`. I added them so the example reflects a working `AppV2` definition.
- The stack-management commands selected `production` and `staging` without creating them first. I changed those commands to `pulumi stack select --create ...`, which matches the current CLI behavior.
- The GitHub Actions example used `pulumi/actions@v4`. I updated it to `@v6`, which is the current major version documented by the official action README.

## Review Notes
- The Rancher chart versions shown in the post are version-specific and can change with Rancher releases. Using a configured `kubernetesVersion` is safer than hard-coding a single RKE2 release string in the code.
- The post still assumes Rancher API connectivity and credentials are already available to Pulumi at deployment time, which is valid, but readers need to ensure stack config or environment variables are present in CI.
