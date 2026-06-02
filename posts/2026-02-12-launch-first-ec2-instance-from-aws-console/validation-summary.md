# Validation Summary: How to Launch Your First EC2 Instance from the AWS Console

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EC2
- AWS Management Console
- Amazon Machine Images (AMIs)
- EC2 instance types
- EC2 key pairs
- Security groups
- Amazon EBS gp3 volumes
- EC2 Instance Connect
- SSH
- EC2 Instance Metadata Service (IMDSv2)
- AWS Free Tier

## Sources Consulted
- AWS EC2 User Guide: Launch an EC2 instance using the launch instance wizard in the console - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-launch-instance-wizard.html
- AWS EC2 User Guide: Reference for Amazon EC2 instance configuration parameters - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-launch-parameters.html
- AWS EC2 User Guide: Track your Free Tier usage for Amazon EC2 - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html
- AWS EC2 User Guide: Amazon EC2 key pairs and Amazon EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html
- AWS EC2 User Guide: Tutorial 2, launch a test EC2 instance and connect to it - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/tutorial-launch-a-test-ec2-instance.html
- AWS EC2 User Guide: Connect to a Linux instance using EC2 Instance Connect - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-connect-methods.html
- AWS EC2 User Guide: Install EC2 Instance Connect on your EC2 instances - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-connect-set-up.html
- AWS EC2 User Guide: Security group rules for different use cases - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules-reference.html
- AWS EC2 User Guide: Change the security groups for your Amazon EC2 instance - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/changing-security-group.html
- AWS EC2 User Guide: Use the Instance Metadata Service to access instance metadata - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
- AWS EC2 User Guide: Keep an Amazon EBS root volume after an Amazon EC2 instance terminates - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configure-root-volume-delete-on-termination.html
- Amazon Linux 2023 User Guide: gp3 as default Amazon EBS volume type - https://docs.aws.amazon.com/linux/al2023/ug/continuing-al2-filesystem.html

## Issues Found
- The post said an AWS account using the Free Tier was sufficient without noting the newer sign-up credit model. Updated the prerequisite to mention AWS Free Tier or sign-up credits.
- The post said t2.micro and t3.micro are both free tier eligible. AWS now distinguishes Free Tier eligibility by account creation date: accounts created before July 15, 2025 use the older 12-month Free Tier model, while newer accounts use a credit-based model with a different set of instance types marked free tier eligible. Updated the instance type guidance to tell readers to choose the label shown in their account and clarify the older t2.micro/t3.micro case.
- The post described the default root volume as an 8 GB gp3 volume. That is accurate for common Amazon Linux 2023 launches, but root volume defaults are AMI-dependent and Windows AMIs are larger. Updated the storage section to make the AMI dependency explicit.
- The EC2 Instance Connect section implied browser access always works with no prerequisites. Updated it to specify supported Linux AMIs and note IAM and network prerequisites.
- The instance metadata command used IMDSv1. Updated it to obtain an IMDSv2 token and pass it in the metadata request, matching AWS's current recommended examples.
- The cleanup section described Free Tier charges only in terms of the first 750 instance hours and said termination removes everything. Updated it to reflect account-specific Free Tier or credit status, possible charges for attached resources, and the default delete-on-termination behavior for root EBS volumes.

## Review Notes
The SSH examples, key permission command, default usernames for Amazon Linux and Ubuntu, security group port guidance, and internal OneUptime links were verified as technically sound. The internal links returned HTTP 200 responses.
