# Validation Summary: How to Set Up EC2 Mac Instances for macOS Development

## Status
validated

## Post Type
Technical tutorial / setup guide

## Technologies Covered
- Amazon EC2 Mac instances
- EC2 Dedicated Hosts
- AWS CLI
- AWS Systems Manager Parameter Store public AMI parameters
- macOS SSH, Screen Sharing, ARD, and VNC
- Xcode, xcodebuild, and Xcode Command Line Tools
- Homebrew and XcodesOrg xcodes
- GitHub Actions self-hosted runners
- Amazon EBS gp3 volumes
- Amazon CloudWatch agent

## Sources Consulted
- AWS EC2 Mac instances documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-mac-instances.html
- AWS EC2 Mac SSH and GUI connection documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-to-mac-instance.html
- AWS Systems Manager public macOS AMI parameters documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-public-parameters-ami.html
- AWS CLI run-instances command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI create-image command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-image.html
- AWS EBS attach volume documentation: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-attaching-volume.html
- AWS EC2 device names documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/device_naming.html
- AWS CloudWatch agent installation documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/install-CloudWatch-Agent-on-EC2-Instance.html
- Apple Xcode Command Line Tools documentation: https://developer.apple.com/documentation/xcode/installing-the-command-line-tools/
- XcodesOrg xcodes README: https://github.com/XcodesOrg/xcodes
- GitHub Actions self-hosted runner service documentation: https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/configure-the-application
- GitHub Actions runner releases: https://github.com/actions/runner/releases

## Issues Found
- The opening description and instance-type section described all EC2 Mac hardware as Mac minis and said there were "two options" while listing four. Updated the wording to physical Apple Mac hardware and added currently documented M1 Ultra, M4, and M4 Pro EC2 Mac instance types.
- The Dedicated Host allocation comment said M2 while the command used `mac2.metal`, which is M1. Updated the comment to M1 Apple Silicon.
- The launch command used an invalid placeholder AMI ID containing non-hex text. Replaced it with the documented SSM public parameter lookup for the latest macOS Sonoma ARM64 AMI in the current Region.
- The VNC setup used older ARDAgent/dscl commands. Replaced them with AWS's documented `passwd`, `launchctl enable`, and `launchctl load` Screen Sharing commands.
- The Xcode Command Line Tools comment implied they were sufficient for CLI builds involving Xcode. Apple documents that tools such as `xcodebuild` ship with full Xcode, so the comment now limits CLT examples to tools like `clang` and `git`.
- The active Xcode path omitted `Contents/Developer` and used an app bundle name that may not match xcodes' installed version naming. Updated the install command and `xcode-select` path to `15.4.0` and `/Contents/Developer`.
- The GitHub Actions runner download referenced v2.319.0, which is outdated. Updated the example to v2.334.0, the current latest release found during review.
- The AMI section said production AMIs should "let the instance stop." AWS documents that `create-image` normally shuts down and reboots the instance, so the wording now says to omit `--no-reboot` and let EC2 reboot it.
- The cost section gave a fixed `mac2.metal` hourly/monthly price. AWS pricing is Region- and instance-type-dependent, so the post now directs readers to EC2 Dedicated Hosts pricing or AWS Pricing Calculator.
- The monitoring section said "disk" default metrics; clarified this as disk I/O.
- The pending-state troubleshooting note used an unsupported 10-15 minute host-readiness estimate. Updated it to AWS's documented 6-20 minute Mac instance readiness range and noted influencing factors.

## Review Notes
The post is version-specific around macOS Sonoma and Xcode 15.4.0. Those examples are technically valid, but future updates should consider macOS Sequoia/Tahoe-era AMI parameters and newer Xcode versions when the tutorial is refreshed.
