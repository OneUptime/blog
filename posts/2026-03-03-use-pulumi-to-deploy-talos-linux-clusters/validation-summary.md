# Validation Summary: How to Use Pulumi to Deploy Talos Linux Clusters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Talos Linux
- talosctl
- Pulumi
- Pulumi Command provider
- Pulumi AWS provider
- AWS EC2, VPC, security groups, and Network Load Balancer
- Kubernetes
- TypeScript

## Sources Consulted
- Talos v1.6 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.6/reference/cli
- Talos v1.6 AWS installation guide: https://docs.siderolabs.com/talos/v1.6/platform-specific-installations/cloud-platforms/aws
- Talos v1.6.0 release cloud image metadata: https://github.com/siderolabs/talos/releases/download/v1.6.0/cloud-images.json
- Pulumi Command provider `local.Command` documentation: https://www.pulumi.com/registry/packages/command/api-docs/local/command/
- Pulumi `dependsOn` resource option documentation: https://www.pulumi.com/docs/iac/concepts/resources/options/dependson/
- Pulumi AWS `aws.ec2.SecurityGroup` documentation: https://www.pulumi.com/registry/packages/aws/api-docs/ec2/securitygroup/
- Pulumi AWS `aws.ec2.Instance` documentation: https://www.pulumi.com/registry/packages/aws/api-docs/ec2/instance/
- Pulumi AWS `aws.lb.TargetGroup` documentation: https://www.pulumi.com/registry/packages/aws/api-docs/lb/targetgroup/
- Pulumi TypeScript/Node.js documentation: https://www.pulumi.com/docs/iac/languages-sdks/javascript/
- Pulumiverse Talos provider registry page: https://www.pulumi.com/registry/packages/talos/installation-configuration/

## Issues Found
- The Talos security group only opened TCP 50000. Talos AWS guidance exposes the Talos API ports as TCP 50000-50001, so the rule was changed to allow the full range.
- The Talos AMI lookup used a hard-coded owner ID and AMI name pattern that is not the method documented by Talos. It was replaced with a lookup against the official `cloud-images.json` release metadata for the configured Talos version and current AWS region.
- The `talosctl gen secrets` example used `-o`, but Talos v1.6 documents `--output-file` for that command. The flag was corrected.
- The `talosctl gen config` example used unsupported `--from` and `--output-dir` flags. These were corrected to `--with-secrets` and `--output`, matching the Talos v1.6 CLI reference.
- The Pulumi `dependsOn` example for bootstrapping used string resource names instead of resource objects. The apply-config command resources are now stored and passed directly to `dependsOn`.
- The bootstrap and kubeconfig commands did not pass explicit Talos API endpoints. Added `--endpoints` alongside `--nodes` for authenticated Talos operations.
- The kubeconfig command used `-f` in a confusing way. Talos v1.6 defines `-f` as force, not a file flag, so the example now uses `--force /tmp/talos-kubeconfig` with the output path as the positional argument.
- The post said Pulumi did not have a native Talos provider. Because the Pulumi Registry now lists a Pulumiverse Talos provider, the wording was narrowed to say this example uses the command provider.
- The reusable component example initialized `controlplaneIps` and `workerIps` as empty arrays, while the later test expected control plane IPs to match the requested count. The placeholder arrays now reflect the requested counts so the example and test are consistent.

## Review Notes
The example still uses Talos `v1.6.0`, which is old relative to current Talos releases. The version-specific CLI fixes were validated against Talos v1.6 documentation, and future updates should consider raising the default Talos version and rechecking command defaults such as Kubernetes and installer versions.
