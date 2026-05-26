# Validation Summary: How to Use Ansible to Deploy to ECS (Elastic Container Service)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- AWS ECS
- AWS Fargate
- AWS CloudWatch Logs
- AWS Secrets Manager
- AWS IAM roles
- Amazon ECR
- Ansible amazon.aws, community.aws, and community.general collections

## Sources Consulted
- Ansible community.aws.ecs_taskdefinition module documentation: https://docs.ansible.com/projects/ansible/devel/collections/community/aws/ecs_taskdefinition_module.html
- Ansible community.aws.ecs_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/ecs_service_module.html
- Ansible community.aws.ecs_service_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/aws/ecs_service_info_module.html
- Ansible amazon.aws.cloudwatchlogs_log_group module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/cloudwatchlogs_log_group_module.html
- Ansible import_role module documentation: https://docs.ansible.com/ansible/2.10/collections/ansible/builtin/import_role_module.html
- Ansible Playbook Keywords reference: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/timezone_module.html
- Amazon ECS Fargate task definition differences: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html
- AWS CLI ecs update-service documentation: https://docs.aws.amazon.com/cli/latest/reference/ecs/update-service.html

## Issues Found
- The task definition used `{{ secrets_manager_arn }}/api-key`, but no `secrets_manager_arn` variable was defined in the variables example. I changed the task definition to use `{{ api_key_secret_arn }}` and added a full Secrets Manager secret ARN variable so the snippet is self-contained and matches the `valueFrom` shape accepted by ECS container secrets.
- The full deployment playbook used `tasks_from` entries directly under the `roles:` section. Current Ansible role keywords do not include `tasks_from` for play-level role entries; `tasks_from` is supported by `ansible.builtin.import_role` and `ansible.builtin.include_role`. I changed the playbook to use `ansible.builtin.import_role` tasks for the logging, task definition, and service role task files.
- The infrastructure provisioning example used `ansible.builtin.timezone`, which is not present in the current `ansible.builtin` collection documentation. I changed it to `community.general.timezone`.
- Because the post includes examples using `community.general` modules (`timezone` and `ufw`), I added `community.general` to the `ansible-galaxy collection install` command.

## Review Notes
The ECS and CloudWatch module parameters otherwise align with current Ansible collection documentation. The service examples use a task definition family name, which ECS accepts and resolves to the latest ACTIVE revision when no revision is specified. The generic "Common Use Cases" examples are technically valid Ansible patterns but are not specific to ECS deployments and could be tightened in a future editorial pass.
