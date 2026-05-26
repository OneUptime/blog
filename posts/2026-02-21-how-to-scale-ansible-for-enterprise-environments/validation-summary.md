# Validation Summary: How to Scale Ansible for Enterprise Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ansible
- AWX
- Red Hat Ansible Automation Platform
- AWX Operator
- Ansible Builder
- Ansible execution environments
- Ansible dynamic inventory
- Ansible callback plugins
- Ansible cache plugins
- SSH connection tuning
- Kubernetes
- Prometheus

## Sources Consulted
- AWX GitHub repository: https://github.com/ansible/awx
- AWX Operator network and TLS configuration: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/network-and-tls-configuration.html
- AWX Operator database configuration: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/database-configuration.html
- AWX Operator persisting projects directory: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/advanced-configuration/persisting-projects-directory.html
- AWX Operator web/task pod scaling: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/advanced-configuration/scaling-the-web-and-task-pods-independently.html
- AWX Operator extra settings: https://docs.ansible.com/projects/awx-operator/en/latest/user-guide/advanced-configuration/extra-settings.html
- AWX execution environments: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/execution_environments.html
- AWX inventories and smart inventory deprecation note: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/inventories.html
- AWX job templates: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/job_templates.html
- AWX workflows: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/workflows.html
- Ansible Builder execution environment definition: https://docs.ansible.com/projects/builder/en/stable/definition.html
- Ansible Builder CLI usage: https://docs.ansible.com/projects/builder/en/latest/usage/
- Ansible cache plugins: https://docs.ansible.com/projects/ansible/latest/plugins/cache.html
- community.general.redis cache plugin: https://docs.ansible.com/projects/ansible/latest/collections/community/general/redis_cache.html
- Ansible callback plugins: https://docs.ansible.com/ansible/latest/plugins/callback.html
- ansible.builtin.default callback: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/default_callback.html
- ansible.posix timer/profile callback docs: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/index.html
- amazon.aws.aws_ec2 inventory plugin: https://docs.ansible.com/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- Ansible playbook strategies and serial execution: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_strategies.html
- ansible.builtin.setup module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html

## Issues Found
- AWX was described as the open-source upstream of all of Red Hat Ansible Automation Platform. Updated this to say AWX is one of the upstream projects and clarified that supported enterprise deployments should use Red Hat Ansible Automation Platform.
- The AWX Operator example used the deprecated `hostname` ingress field. Replaced it with `ingress_hosts` and a `hostname` entry.
- The execution environment examples used `quay.io/ansible/ansible-runner:latest` as the base image. Updated them to use the AWX execution environment image, which better matches AWX execution environment documentation.
- The collection version pins were outdated. Updated the example versions for `community.general`, `amazon.aws`, `community.mysql`, and `ansible.posix` to current documented versions.
- The Ansible configuration used `stdout_callback = yaml`, which is no longer the current recommended YAML output pattern. Updated it to `stdout_callback = default` with `result_format = yaml`.
- The callback plugin names were short names for collection-provided callbacks. Updated them to `ansible.posix.timer`, `ansible.posix.profile_tasks`, and `ansible.posix.profile_roles`.
- The Redis cache plugin was referenced by short name. Updated it to the fully qualified `community.general.redis` cache plugin.
- The inventory diagram used Smart Inventories, which AWX documentation marks as deprecated. Updated the diagram labels to Constructed Inventories.

## Review Notes
The examples are technically plausible but infrastructure-dependent; they were reviewed against official documentation rather than executed against a live AWX/AAP, Kubernetes, Redis, AWS, or container registry environment.
