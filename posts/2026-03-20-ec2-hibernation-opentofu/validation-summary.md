# Validation Summary: How to Configure EC2 Hibernation with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS EC2
- AWS CLI
- Amazon EBS
- EC2 Launch Templates

## Sources Consulted
- AWS EC2 User Guide, Prerequisites for EC2 instance hibernation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/hibernating-prerequisites.html
- AWS EC2 User Guide, Enable hibernation for an Amazon EC2 instance: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/enabling-hibernation.html
- AWS EC2 User Guide, Hibernate an Amazon EC2 instance: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/hibernating-instances.html
- AWS EC2 User Guide, How Amazon EC2 instance hibernation works: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-hibernate-overview.html
- AWS EC2 User Guide, Start a hibernated Amazon EC2 instance: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/hibernating-resuming.html
- AWS CLI Command Reference, `stop-instances`: https://docs.aws.amazon.com/cli/latest/reference/ec2/stop-instances.html
- HashiCorp AWS provider docs source for `aws_instance`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- HashiCorp AWS provider docs source for `aws_launch_template`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/launch_template.html.markdown

## Issues Found
- The prerequisites omitted two hard AWS requirements: hibernation must be enabled at launch, and the AMI must support hibernation. I added both because AWS does not allow enabling hibernation on an existing instance.
- The instance support wording implied that whole categories such as general purpose or compute optimized broadly support hibernation. I changed this to require verification of the exact instance type because AWS support is defined per supported family/type and varies by what you choose.
- The launch template section described hibernation in the context of Auto Scaling groups. I corrected the note because AWS documents that manually hibernating an instance in an Auto Scaling group can cause Auto Scaling to mark it unhealthy and replace it.
- The CLI verification example checked `StateReason.Message` as if it were the canonical hibernation state check. I changed it to query `StateReason.Code`, which AWS documents as `Client.UserInitiatedHibernate` when hibernation was initiated.
- The root volume sizing snippet presented `RAM + 10 GiB` as a minimum requirement. I reframed it as an example sizing target because AWS only specifies that the root volume must be large enough for RAM contents plus expected OS and application usage.
- The conclusion incorrectly said instances cannot be hibernated if they have been running for more than 60 days. I corrected this to AWS's actual limitation: AWS does not support keeping an instance hibernated for more than 60 days.
- The conclusion also overstated resume timing as "within seconds rather than minutes." I softened that claim because AWS documentation only guarantees resumed memory state, not a universal seconds-level resume time.

## Review Notes
- The examples assume `data.aws_ami.amazon_linux.id` resolves to an HVM AMI that supports hibernation and that `/dev/xvda` matches the AMI root device name. The post now documents those assumptions in comments.
- The volume sizing example remains heuristic by design. Real root volume sizing still depends on OS footprint and application usage in addition to RAM size.
