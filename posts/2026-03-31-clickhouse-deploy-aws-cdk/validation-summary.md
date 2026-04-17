# Validation Summary: How to Deploy ClickHouse on AWS CDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CDK v2 (TypeScript)
- AWS EC2, Security Groups, EBS (GP3) Volumes
- `aws-cdk-lib/aws-ec2` constructs (`Vpc`, `Instance`, `Volume`, `SecurityGroup`, `UserData`, `MachineImage`)
- Ubuntu 22.04 (Jammy) AMI
- ClickHouse (server + client) installed from the official Debian repository
- CloudFormation (via CDK) and CDK CLI (`bootstrap`, `diff`, `deploy`)

## Sources Consulted
- AWS CDK v2 API reference for `aws-cdk-lib/aws-ec2`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2-readme.html
- `MachineImage` and `latestAmazonLinux2`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.MachineImage.html
- `Volume.grantAttachVolume`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.Volume.html
- AWS CDK CLI reference (`cdk init`, `cdk bootstrap`, `cdk diff`, `cdk deploy`): https://docs.aws.amazon.com/cdk/v2/guide/cli.html
- ClickHouse official install docs (Debian/Ubuntu): https://clickhouse.com/docs/install#install-from-deb-packages
- Debian `apt-key` deprecation note (Ubuntu 22.04): https://wiki.debian.org/DebianRepository/UseThirdParty
- Canonical Ubuntu AMI locator (jammy 22.04 amd64): https://cloud-images.ubuntu.com/locator/ec2/

## Issues Found
1. **Mismatched OS in multi-node cluster example.** The multi-node `Array.from(...)` snippet used `ec2.MachineImage.latestAmazonLinux2()` while reusing the same `userData` that runs `apt-get` commands. Amazon Linux 2 uses `yum`/`dnf`, so this would fail at boot. Changed to the same Ubuntu 22.04 lookup image used by the single-node example so the Debian-based userData works.
2. **Deprecated `apt-key add -`.** On Ubuntu 22.04 (Jammy), `apt-key` is deprecated and emits warnings/errors. Replaced with the modern pattern: `gpg --dearmor -o /usr/share/keyrings/clickhouse-keyring.gpg`, plus a `signed-by=` entry in the `sources.list.d/clickhouse.list` line. Also added `gnupg` to the initial `apt-get install` so `gpg` is available. The key URL itself (`.../rpm/lts/repodata/repomd.xml.key`) is correct per the ClickHouse docs and was left intact.

## Review Notes
- `npm install aws-cdk-lib constructs` in the Project Setup is technically redundant because `cdk init app --language typescript` already installs these, but it is harmless and is commonly shown for clarity. Left as-is.
- The post says CDK supports "TypeScript, Python, or Java"; CDK also supports JavaScript, C#, and Go. The claim is accurate, just non-exhaustive — not a correctness issue.
- `ec2.MachineImage.lookup` requires `env` (account + region) to be specified on the stack (or `CDK_DEFAULT_*` env vars) because lookups are context-dependent. Worth calling out for readers, though the code itself is correct.
- The ClickHouse `lts` channel is valid; official docs most prominently show `stable`, but both work.
- For production deployments, the EBS data volume created by the stack still needs an in-instance mount step (e.g., `mkfs`, `mount`, an `/etc/fstab` entry, and pointing ClickHouse `<path>` at it). The post shows attachment only; mounting/formatting is left to the reader. Not an error, but a notable gap for a real deployment.
