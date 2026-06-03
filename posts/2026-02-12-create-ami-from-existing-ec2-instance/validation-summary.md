# Validation Summary: How to Create an AMI from an Existing EC2 Instance

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EC2
- Amazon Machine Images (AMIs)
- Amazon EBS snapshots
- AWS CLI
- AWS Backup
- cloud-init
- systemd machine-id

## Sources Consulted
- Amazon EC2 User Guide: Create an Amazon EBS-backed AMI - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/creating-an-ami-ebs.html
- AWS CLI Command Reference: ec2 create-image - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-image.html
- Amazon EC2 User Guide: Deregister an Amazon EC2 AMI - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/deregister-ami.html
- AWS Prescriptive Guidance: Amazon EC2 backup and recovery with snapshots and AMIs - https://docs.aws.amazon.com/prescriptive-guidance/latest/backup-recovery/ec2-backup.html
- Amazon EBS pricing - https://aws.amazon.com/ebs/pricing/
- cloud-init documentation: CLI commands / clean - https://docs.cloud-init.io/en/latest/reference/cli.html
- systemd documentation: machine-id - https://www.freedesktop.org/software/systemd/man/devel/machine-id.html

## Issues Found
- The console tagging recommendation said "Tag image and snapshots" copies instance tags. AWS documentation describes this option as applying the same tags to the AMI and snapshots, so the wording was corrected.
- The `aws ec2 create-image` example tagged only the AMI, not the created snapshots. AWS CLI documentation requires a separate `ResourceType=snapshot` tag specification for snapshot tags, so the example was updated to tag both resources.
- The machine-id cleanup commands removed `/etc/machine-id` and immediately regenerated it with `systemd-machine-id-setup`, which would bake a new machine ID into the AMI. The snippet now uses `cloud-init clean --logs --machine-id` when available, with a systemd fallback that leaves the ID uninitialized for the next boot.
- The cost example implied charges are based on provisioned root volume size. EBS snapshot charges are based on snapshot data stored, so the wording was changed to "20 GB of snapshot data."
- The deregistration workflow was outdated because Amazon EC2 now supports `--delete-associated-snapshots` during `deregister-image`. The post now shows that option and clarifies that snapshots are not deleted by default unless that option is used.

## Review Notes
The remaining CLI examples and AMI lifecycle explanations match current AWS documentation. The automated cleanup script still manually deletes snapshots after deregistering, which remains valid, although newer EC2 CLI behavior can simplify that flow with `--delete-associated-snapshots`.
