# Validation Summary: How to Install Rancher Using Pulumi

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher Manager
- Kubernetes
- K3s
- Pulumi
- TypeScript
- AWS EC2
- Helm
- cert-manager

## Sources Consulted
- Pulumi CLI `pulumi new` documentation: https://www.pulumi.com/docs/iac/cli/commands/pulumi_new/
- Pulumi TypeScript and Node.js documentation: https://www.pulumi.com/docs/iac/languages-sdks/javascript/
- Pulumi AWS `aws.ec2.Eip` registry documentation: https://www.pulumi.com/registry/packages/aws/api-docs/ec2/eip/
- Pulumi Command provider `command.remote.Command` documentation: https://www.pulumi.com/registry/packages/command/api-docs/remote/command/
- Rancher install/upgrade on Kubernetes documentation: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher Helm chart options documentation: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- K3s configuration options documentation: https://docs.k3s.io/installation/configuration
- K3s networking services documentation: https://docs.k3s.io/networking/networking-services
- Node.js release schedule: https://github.com/nodejs/Release

## Issues Found
- The prerequisites listed Node.js 20 or later as the supported LTS baseline. Node.js 20 reached end-of-life on April 30, 2026, and Pulumi supports currently supported Node.js Current, Active LTS, and Maintenance LTS versions. Changed the prerequisite to recommend an active LTS release such as Node.js 22 or 24.
- The Pulumi configuration example used `admin` as the Rancher bootstrap password. Rancher documentation recommends setting `bootstrapPassword` to something unique for the `admin` user. Changed the example value to `replace-with-a-unique-password`.

## Review Notes
The TypeScript example type-checks against current `@pulumi/pulumi`, `@pulumi/aws`, and `@pulumi/command` packages. The Pulumi CLI flags, Pulumi AWS EIP arguments, remote command connection arguments, K3s install flag, cert-manager `crds.enabled` value, Rancher Helm repository, and Rancher `hostname` and `bootstrapPassword` chart values match current official documentation. The single-node EC2/K3s layout is suitable for a tutorial or proof of concept; production Rancher deployments should consider high availability, stricter SSH ingress, and explicit version pinning for K3s, Helm charts, and Rancher.
