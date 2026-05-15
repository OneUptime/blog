# Validation Summary: How to Deploy RHEL on AWS EC2 with Cloud-Init Customization

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- AWS EC2
- AWS CLI
- Amazon Machine Images
- cloud-init
- Apache HTTP Server
- firewalld
- YAML cloud-config

## Sources Consulted
- AWS CLI Command Reference: `describe-images` - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-images.html
- AWS CLI Command Reference: `run-instances` - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- Amazon EC2 User Guide: Find an AMI that meets the requirements for your EC2 instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/finding-an-ami.html
- Red Hat Customer Portal: Red Hat Enterprise Linux Images (AMI) Available on Amazon Web Services (AWS) - https://access.redhat.com/solutions/15356
- cloud-init module reference - https://docs.cloud-init.io/en/latest/reference/modules.html
- cloud-init CLI reference - https://docs.cloud-init.io/en/24.1/reference/cli.html
- cloud-init: How to re-run cloud-init - https://docs.cloud-init.io/en/latest/howto/rerun_cloud_init.html

## Issues Found
- The `final_message` example used `$UPTIME`, but current cloud-init documentation lists the final message template variable as lowercase `$uptime`. Changed it to `$uptime` so the example expands correctly.
- The debugging section manually ran `cloud-init init` and module stages after `cloud-init clean`. Current cloud-init documentation recommends `cloud-init clean --logs --reboot` for a full rerun and warns that manually running all stages outside the init system may not behave the same as boot. Replaced the manual stage commands with the recommended rerun command.

## Review Notes
- The AWS CLI `describe-images` and `run-instances` options used in the post are current and match official syntax.
- Red Hat documents owner account `309956199498` for public RHEL AMIs in standard AWS Regions and recommends filtering RHEL images with `RHEL-9*`; the post's narrower image-name filter is plausible for RHEL 9 x86_64 GP3 hourly images but may need adjustment if Red Hat changes naming patterns.
