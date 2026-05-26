# Validation Summary: How to Fix ansible-lint Deprecated Module Warnings

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- ansible-lint
- Ansible collections
- community.docker
- amazon.aws and community.aws
- azure.azcollection
- google.cloud

## Sources Consulted
- Ansible Lint deprecated-module rule: https://docs.ansible.com/projects/lint/rules/deprecated-module/
- Ansible Lint usage and CLI formats: https://docs.ansible.com/projects/lint/usage/
- Ansible Lint configuration: https://docs.ansible.com/projects/lint/configuring/
- ansible.builtin.include module documentation: https://docs.ansible.com/ansible/8/collections/ansible/builtin/include_module.html
- Ansible reusable playbooks documentation: https://docs.ansible.com/ansible/2.9/user_guide/playbooks_reuse.html
- ansible.builtin.include_role module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- Ansible 2.8 include_role archive documentation: https://docs.ansible.com/projects/ansible/2.8-archive/modules/include_role_module.html
- Ansible collections installation guide: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- community.docker.docker_login documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_login_module.html
- amazon.aws.ec2_instance documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- amazon.aws.s3_bucket documentation: https://docs.ansible.com/ansible/latest/collections/amazon/aws/s3_bucket_module.html
- amazon.aws.route53 documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/route53_module.html
- azure.azcollection.azure_rm_resourcegroup documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_resourcegroup_module.html
- google.cloud.gcp_compute_instance documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_instance_module.html

## Issues Found
- The deprecation flow implied ansible-lint catches all modules moved out of ansible-core as deprecated modules. Updated the wording to distinguish deprecated module findings from syntax failures caused by missing collections.
- The post said bare `include` was deprecated in Ansible 2.7. Official docs show it was deprecated earlier and removed from ansible-core in 2.16, so the version-specific wording was corrected.
- The `import_tasks` guidance said not to use it with conditionals. Static imports can use conditionals, but those conditionals are inherited by imported tasks, so the guidance was corrected.
- The old `include_role` static example placed `static: yes` inside the module arguments. In archived Ansible docs this was a task-level directive, so the example was corrected.
- The `google.cloud.gcp_compute_instance` replacement example omitted required authentication inputs and a boot disk/source image. Added the missing fields so the example matches the current module documentation.

## Review Notes
Local Ansible and ansible-lint binaries were not installed in the review environment, so CLI verification was performed against official documentation rather than local `--help` output. The AWS, Docker, Azure, collection installation, ansible-lint output-format, suppression, and check-mode examples were consistent with the official documentation consulted.
