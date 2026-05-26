# Validation Summary: How to Use Ansible connection: local vs delegate_to: localhost

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible playbooks
- Ansible local connection plugin
- Ansible task delegation
- amazon.aws collection modules
- community.docker collection modules

## Sources Consulted
- Ansible documentation: Controlling where tasks run: delegation and local actions - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_delegation.html
- Ansible documentation: Implicit localhost - https://docs.ansible.com/projects/ansible/latest/inventory/implicit_localhost.html
- Ansible documentation: ansible.builtin.local connection plugin - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/local_connection.html
- Ansible documentation: Playbook keywords - https://docs.ansible.com/ansible/latest/reference_appendices/playbooks_keywords.html
- Ansible documentation: ansible.builtin.apt module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible documentation: ansible.builtin.systemd_service module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible documentation: amazon.aws.route53 module - https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/route53_module.html
- Ansible documentation: amazon.aws.ec2_instance module - https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_instance_module.html
- Ansible documentation: amazon.aws.ec2_vpc_net module - https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_net_module.html
- Ansible documentation: amazon.aws.ec2_vpc_subnet module - https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/ec2_vpc_subnet_module.html
- Ansible documentation: community.docker.docker_image module - https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_module.html

## Issues Found
- The post said the variable context stays with the original remote host for `delegate_to: localhost`. Current Ansible documentation is more nuanced: `inventory_hostname` remains the original host, but delegated task connection variables such as `ansible_host` are evaluated for the delegated host. Updated the explanation and diagram.
- Two delegated Route 53 examples used `{{ ansible_host }}` as the remote host address. Under delegation, that can resolve to the delegated localhost connection address. Changed both examples to `{{ hostvars[inventory_hostname].ansible_host | default(inventory_hostname) }}`.
- The per-task `ansible_connection: local` example said it is equivalent to `delegate_to: localhost`. It runs locally, but it does not delegate to the localhost inventory entry and does not trigger implicit localhost behavior. Updated the comment to avoid that incorrect equivalence.

## Review Notes
The AWS and Docker module examples use current fully qualified collection names and valid parameters. The examples are illustrative and still require normal prerequisites such as installed collections, AWS credentials, boto3/botocore, Docker access, and valid inventory variables.
