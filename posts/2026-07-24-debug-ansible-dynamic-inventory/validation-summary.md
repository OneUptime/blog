# Validation Summary: Debugging Ansible Dynamic Inventory When Hosts or Groups Are Missing

## Status
validated

## Post Type
Technical debugging guide

## Technologies Covered
- Ansible and `ansible-core`
- Ansible dynamic inventory and inventory plugins
- `amazon.aws.aws_ec2` inventory plugin
- `ansible.builtin.auto` and `ansible.builtin.constructed` inventory plugins
- AWS CLI, EC2, STS, boto3, and botocore
- YAML and Jinja expressions
- Inventory caching, host patterns, and group construction

## Sources Consulted
- [Ansible: Inventory plugins](https://docs.ansible.com/projects/ansible/latest/plugins/inventory.html)
- [Ansible: Working with dynamic inventory](https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_dynamic_inventory.html)
- [Ansible: How to build your inventory](https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html)
- [Ansible: `ansible-inventory` command reference](https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html)
- [Ansible: `amazon.aws.aws_ec2` inventory plugin](https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html)
- [Ansible: AWS EC2 dynamic inventory guide](https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/docsite/aws_ec2_guide.html)
- [Ansible: `ansible.builtin.constructed` inventory plugin](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/constructed_inventory.html)
- [Ansible: Patterns—targeting hosts and groups](https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_patterns.html)
- [Ansible: Configuration settings](https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html)
- [Ansible: Developing dynamic inventory and inventory cache behavior](https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_inventory.html)
- [AWS CLI: `ec2 describe-instances`](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html)
- [AWS CLI: `sts get-caller-identity`](https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html)
- [AWS CLI: Pagination options](https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-pagination.html)

## Issues Found
1. The AWS CLI example used `--max-results 5`, but the current `aws ec2 describe-instances` command exposes the paginator option as `--max-items`. Changed the command to `--max-items 5`.
2. The AWS inventory examples used the deprecated `tags` host variable. Current `amazon.aws` documentation deprecates `tags` in favor of `ec2_tags`, which was added in collection version 11.2.0. Updated both `keyed_groups` examples and added the necessary installed-version caveat.
3. The hostname-collision explanation implied that the plugin might select a fallback hostname or that its duplicate option could resolve collisions between resources. Clarified that the AWS plugin selects the first available hostname candidate per instance by default, that equal names still collide, and that `allow_duplicated_hosts` controls whether one instance contributes multiple matching names.
4. The provider-authentication check did not account for inventory sources that explicitly select an AWS profile or assume a role. Added a note that the CLI test must use equivalent credentials or it may report a different principal.
5. The inventory merge explanation said later sources overwrite earlier variables without accounting for inventory variable precedence. Clarified that load order resolves conflicts at the same precedence, while host variables remain more specific than group variables.
6. The cache section did not mention that `--flush-cache` also clears cached facts for inventory hosts. Added that side effect and noted the impact when inventory and fact caching share a backend.
7. The plugin-documentation checklist described the displayed collection version as a “required collection version.” Reworded it to distinguish the collection version documented on the page from runtime requirements.

## Review Notes
- The post was checked against the current `amazon.aws` documentation for collection version 11.4.0. The corrected `ec2_tags` examples require `amazon.aws` 11.2.0 or later; readers using older collections should follow their installed-version documentation.
- The documented AWS EC2 inventory filename suffix, boto3 and botocore control-node requirements, filters, hostname syntax, strict modes, constructed grouping behavior, source ordering, inventory refresh behavior, and play-pattern examples are current and correct.
- All links in the post's Official Documentation section resolve to the intended current Ansible documentation pages.
