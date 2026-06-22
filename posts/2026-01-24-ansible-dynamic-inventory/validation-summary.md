# Validation Summary: How to Configure Ansible Dynamic Inventory

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ansible dynamic inventory
- Ansible inventory plugins and scripts
- Amazon AWS EC2 inventory (`amazon.aws.aws_ec2`)
- Azure Resource Manager inventory (`azure.azcollection.azure_rm`)
- Google Cloud Compute inventory (`google.cloud.gcp_compute`)
- Kubernetes collection modules and connection plugin
- Python custom inventory scripts
- YAML and Ansible configuration

## Sources Consulted
- Ansible inventory plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/inventory.html
- `amazon.aws.aws_ec2` inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- `azure.azcollection.azure_rm` inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/azure/azcollection/azure_rm_inventory.html
- `google.cloud.gcp_compute` inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/google/cloud/gcp_compute_inventory.html
- `kubernetes.core.k8s` removed inventory plugin notice: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_inventory.html
- `kubernetes.core.k8s_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_info_module.html
- `kubernetes.core.kubectl` connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/kubectl_connection.html
- `ansible.builtin.add_host` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/add_host_module.html
- `ansible-inventory` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html
- Dynamic inventory script development documentation: https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_inventory.html

## Issues Found
- AWS examples used `tags.*` as host variables. Current `amazon.aws.aws_ec2` examples use `ec2_tags`, while `tags` is deprecated for removal after 2026-12-01. Updated keyed groups, conditional groups, and composed variables to use `ec2_tags`.
- AWS examples inferred SSH user from `image_id`, which is an AMI ID and does not reliably indicate the operating system. Updated the examples to read an `AnsibleUser` tag with an `ec2-user` fallback.
- AWS advanced example included `sts_endpoint`, which is not a documented `amazon.aws.aws_ec2` inventory option. Removed the unsupported option.
- Azure prerequisites listed a small subset of Azure SDK packages. Official `azure.azcollection` guidance says to install the collection's Python requirements file. Updated the command accordingly.
- Azure `auth_source: auto` comment said MSI was part of the automatic order. The documented automatic order is module parameters, environment, credential file, then Azure CLI. Updated the comment.
- Azure `conditional_groups` comment described filtering, but the snippet groups hosts. Updated the comment.
- GCP prerequisites listed `google-api-python-client`, but the documented inventory plugin requirements are `google-auth` and `requests`. Updated the install command.
- GCP keyed group used `machine_type().split(...)`, which is not a documented inventory host variable or helper. Updated it to split the documented `machineType` field.
- GCP `compose` used Jinja delimiters inside an inventory expression. Updated it to a raw expression.
- Kubernetes section used the removed `kubernetes.core.k8s` inventory plugin. Replaced it with the documented current approach: query pods using `kubernetes.core.k8s_info` and add them to in-memory inventory with `ansible.builtin.add_host`, using the `kubernetes.core.kubectl` connection plugin.

## Review Notes
The Markdown YAML and Python fenced code blocks parse locally. Live cloud inventory commands were not executed because they require provider credentials and Ansible is not installed in this local environment.
