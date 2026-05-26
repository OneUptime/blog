# Validation Summary: How to Use Ansible AWS Dynamic Inventory with Tags

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible inventory plugins
- `amazon.aws.aws_ec2` dynamic inventory
- AWS EC2
- AWS tag-based filtering
- YAML inventory configuration

## Sources Consulted
- Ansible `amazon.aws.aws_ec2` inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html
- Ansible Amazon AWS collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/index.html
- Ansible AWS dynamic inventory plugin guide: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/docsite/aws_ec2_guide.html
- Ansible inventory plugins documentation: https://docs.ansible.com/projects/ansible-core/devel/plugins/inventory.html
- Ansible `ansible-inventory` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html
- Ansible host pattern documentation: https://docs.ansible.com/projects/ansible-core/devel/inventory_guide/intro_patterns.html
- AWS EC2 `describe-instances` filter documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html

## Issues Found
- The prerequisites said "Ansible 2.9+ with the `amazon.aws` collection". Current `amazon.aws` releases have stricter supported `ansible-core` requirements, and the `aws_ec2` inventory plugin also requires `boto3` and `botocore`. Updated the prerequisite to reference the supported `ansible-core` version for the installed collection and added the Python dependency requirement.
- The advanced filtering example used `inventory/production_ec2.yml`, which does not match the documented `aws_ec2.{yml|yaml}` inventory filename requirement. Renamed the example to `inventory/production.aws_ec2.yml`.
- The `exclude_filters` comment said it excluded instance types, but the example filters by the `Ephemeral=true` tag. Updated the comment to match the actual filter.
- The `ansible.cfg` example overrode `enable_plugins` with only `amazon.aws.aws_ec2`, `host_list`, and `auto`, which would omit the `yaml` inventory plugin needed by the static YAML inventory example. Updated it to retain Ansible's default inventory plugin list and append `amazon.aws.aws_ec2`.

## Review Notes
The remaining examples are technically consistent with current Ansible documentation. The examples assume the control node can reach the selected private IP addresses and that the AWS credentials have the required EC2 describe permissions.
