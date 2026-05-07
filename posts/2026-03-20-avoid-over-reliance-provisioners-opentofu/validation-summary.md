# Validation Summary: How to Avoid Over-Reliance on Provisioners in OpenTofu

## Status
validated

## Post Type
Guide / best-practices article

## Technologies Covered
- OpenTofu provisioners (`remote-exec`, `local-exec`, `file`)
- HCL
- AWS provider for OpenTofu/Terraform
- Amazon EC2 (`aws_instance`, `user_data`)
- Amazon Machine Images (AMIs) and Packer-based image baking
- Amazon ECS task definitions
- AWS Systems Manager State Manager (`aws_ssm_association`)
- Amazon CloudWatch Agent

## Sources Consulted
- OpenTofu provisioners syntax: https://opentofu.org/docs/language/resources/provisioners/syntax/
- OpenTofu `remote-exec` provisioner: https://opentofu.org/docs/language/resources/provisioners/remote-exec/
- OpenTofu `local-exec` provisioner: https://opentofu.org/docs/language/resources/provisioners/local-exec/
- OpenTofu `file` provisioner: https://opentofu.org/docs/language/resources/provisioners/file/
- AWS provider `aws_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_ecs_task_definition` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- AWS provider `aws_ssm_association` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_association
- AWS Systems Manager document schemas and `AWS-ConfigureAWSPackage` parameters: https://docs.aws.amazon.com/systems-manager/latest/userguide/documents-schemas-features.html
- AWS Systems Manager State Manager behavior: https://docs.aws.amazon.com/systems-manager/latest/userguide/state-manager-about.html
- Amazon CloudWatch agent installation with Systems Manager: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/installing-cloudwatch-agent-ssm.html

## Issues Found
- The introduction described all listed provisioners as running scripts on resources after creation. This was inaccurate because `local-exec` runs on the machine executing OpenTofu, `file` copies files rather than running scripts, and provisioners can also run during destroy. I updated the introduction to reflect the documented behavior.
- The `remote-exec` example omitted the required `connection` block, so the snippet was not valid as written. I added a minimal SSH connection example and clarified that the "only runs once" limitation applies to creation-time provisioners.
- The EC2 bootstrap example used `user_data = base64encode(...)`, which is not the correct AWS provider pattern for plain text user data, and it declared `user_data` twice in the same resource, which is invalid HCL. I changed the example to use plain `user_data` and converted the templated variant into a commented alternative.
- The AWS Systems Manager section said to use Run Command, but the code sample used `aws_ssm_association`, which creates a State Manager association. The sample also used `packageName`, while the Amazon-owned `AWS-ConfigureAWSPackage` document defines the package parameter as `name`. I updated the section title and prose to State Manager, and corrected the parameters to `action`, `name`, and `version`.

## Review Notes
- The core thesis of the post is consistent with official OpenTofu guidance: provisioners are documented as a last resort, and OpenTofu explicitly recommends alternatives such as boot-time user data and custom machine images where possible.
- `user_data`-based bootstrapping assumes an image that supports cloud-init or an equivalent user-data mechanism. OpenTofu's documentation notes that many official Linux images include cloud-init, but not every image does.
- Systems Manager associations only work on SSM-managed instances with the necessary agent and IAM prerequisites. The post's example is valid, but it assumes that prerequisite setup already exists.
- Destroy-time provisioners remain a valid rare use case, but OpenTofu documents caveats: they do not run when `create_before_destroy = true`, and they also do not run for tainted resources.
