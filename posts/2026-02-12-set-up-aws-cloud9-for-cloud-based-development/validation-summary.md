# Validation Summary: How to Set Up AWS Cloud9 for Cloud-Based Development

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- AWS Cloud9
- Amazon EC2
- AWS CLI
- AWS Systems Manager Session Manager
- Amazon EBS
- IAM roles and instance profiles
- AWS SAM CLI
- AWS Lambda
- AWS CodeCommit
- AWS CloudFormation
- Node.js, Python, Docker, AWS CDK, Terraform

## Sources Consulted
- AWS Cloud9 User Guide: Creating an EC2 Environment: https://docs.aws.amazon.com/cloud9/latest/user-guide/create-environment-main.html
- AWS Cloud9 User Guide: Creating an SSH Environment: https://docs.aws.amazon.com/cloud9/latest/user-guide/create-environment-ssh.html
- AWS CLI Command Reference: cloud9 and create-environment-ec2: https://docs.aws.amazon.com/cli/latest/reference/cloud9/create-environment-ec2.html
- AWS CLI Command Reference: create-environment-membership: https://docs.aws.amazon.com/cli/latest/reference/cloud9/create-environment-membership.html
- AWS Cloud9 User Guide: Accessing no-ingress EC2 instances with AWS Systems Manager: https://docs.aws.amazon.com/cloud9/latest/user-guide/ec2-ssm.html
- AWS Cloud9 User Guide: Calling AWS services from an environment: https://docs.aws.amazon.com/cloud9/latest/user-guide/credentials.html
- AWS Cloud9 User Guide: Resize an Amazon EBS volume that an environment uses: https://docs.aws.amazon.com/cloud9/latest/user-guide/move-environment-resize.html
- AWS CloudFormation Template Reference: AWS::Cloud9::EnvironmentEC2: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloud9-environmentec2.html
- AWS Cloud9 pricing: https://aws.amazon.com/cloud9/pricing/
- AWS Cloud9 User Guide: Working with AWS SAM using the AWS Toolkit: https://docs.aws.amazon.com/cloud9/latest/user-guide/serverless-apps-toolkit.html

## Issues Found
- AWS Cloud9 availability was incomplete. AWS Cloud9 is no longer available to new customers, while existing customers can continue to use it. Added this caveat to the introduction.
- The SSH environment section used `aws cloud9 create-environment-ec2`, which creates an EC2 environment, not an SSH environment. AWS documentation says SSH environments cannot be created with the CLI. Replaced the CLI example with console-oriented SSH key setup commands.
- The `CONNECT_SSM` explanation omitted the first-time AWS CLI requirement for `AWSCloud9SSMAccessRole` and `AWSCloud9SSMInstanceProfile`. Added that caveat.
- The EBS resize commands assumed IMDSv1 and `/dev/xvda1`. Updated the snippet to use IMDSv2, pass the detected region to AWS CLI calls, handle Nitro/NVMe root devices, and grow the mounted XFS filesystem with `xfs_growfs -d /`.
- The AWS managed temporary credentials description overstated that credentials automatically inherit the creator's permissions. Reworded it to match AWS guidance: managed temporary credentials are set up for EC2 environments and managed on the user's behalf, with instance profiles or stored credentials as alternatives.
- Placeholder IDs in CLI examples used invalid formats (`subnet-abc123` and `env-abc123`). Replaced them with values that match AWS CLI documented patterns.
- The debug configuration snippet was fenced as JSON but included a JavaScript-style comment. Moved the comment outside the JSON block so the example is valid JSON.

## Review Notes
AWS Cloud9 remains technically usable for existing AWS customers, but because it is closed to new customers, future posts should consider recommending actively available alternatives for new setups.
