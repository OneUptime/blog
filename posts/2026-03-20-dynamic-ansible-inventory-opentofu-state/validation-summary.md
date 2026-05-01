# Validation Summary: How to Use Dynamic Ansible Inventory from OpenTofu State

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- OpenTofu state JSON
- Ansible dynamic inventory
- Python
- Amazon S3
- Boto3

## Sources Consulted
- OpenTofu `output` command: https://opentofu.org/docs/cli/commands/output/
- OpenTofu `show` command: https://opentofu.org/docs/v1.10/cli/commands/show/
- OpenTofu JSON output format: https://opentofu.org/docs/internals/json-format/
- OpenTofu state documentation: https://opentofu.org/docs/v1.9/language/state/
- OpenTofu `state pull` command: https://opentofu.org/docs/v1.11/cli/commands/state/pull/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- Ansible developing dynamic inventory: https://docs.ansible.com/projects/ansible-core/2.17/dev_guide/developing_inventory.html
- Ansible `ansible.builtin.script` inventory plugin: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/script_inventory.html
- Ansible inventory plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/inventory.html
- Ansible cache plugins documentation: https://docs.ansible.com/projects/ansible/latest/plugins/cache.html
- Boto3 S3 `get_object` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/get_object.html

## Issues Found
- The introduction described the script as reflecting the "live state". OpenTofu documents `tofu show -json` as exposing the latest state snapshot, not the live provider state, so I corrected that wording.
- The inventory script only read `values.root_module.resources`. OpenTofu's documented JSON state format also stores resources under recursive `child_modules`, so instances created inside modules could be missed. I added a recursive resource walker.
- The inventory structure did not explicitly include `all.hosts` or an `ungrouped` group. Per Ansible's dynamic inventory guidance, hosts outside the `web` and `database` groups could be omitted from targetable inventory. I added `all.hosts` and `ungrouped.hosts`.
- The `ansible.cfg` example implied Ansible's inventory cache settings would cache this script. The current `ansible.builtin.script` docs state that the script inventory plugin does not cache results and that external scripts are responsible for their own caching. I removed the incorrect cache settings and corrected the explanation.
- The S3 example parsed the raw state object directly as if it matched the `tofu show -json` structure. OpenTofu documents the raw state format as subject to change and recommends `tofu show -json` / `tofu output -json` for external tooling. I changed the example to download the state object and convert it with `tofu show -json` before building inventory.
- The conclusion repeated the incorrect `cache_timeout` guidance and implied the script tracked live infrastructure changes directly. I updated it to reflect the latest OpenTofu state snapshot and script-side caching requirement.

## Review Notes
- The examples assume `aws_instance` resources and tag-driven grouping (`Role=web` / `Role=database`). That is valid for the sample, but readers with other providers or naming schemes would need to adapt the grouping logic.
- `tofu`, `ansible-inventory`, and `ansible-config` were not installed in the review environment, so command validation was documentation-based rather than local CLI-output-based.
