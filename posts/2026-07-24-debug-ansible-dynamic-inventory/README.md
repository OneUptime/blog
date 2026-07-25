# Debugging Ansible Dynamic Inventory When Hosts or Groups Are Missing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ansible, Dynamic Inventory, Inventory, Debugging, Automation, Cloud

Description: Trace missing Ansible hosts from plugin discovery through credentials, filters, composed groups, caching, and final play patterns.

---

A dynamic inventory can return no error and still omit the host a play needs. The cloud API may have filtered it out, the inventory plugin may not have loaded, a Jinja expression may have been skipped, or the host may exist under a different inventory name and group.

Debugging gets faster when you follow the inventory pipeline in order:

```text
source file
  -> inventory plugin
  -> provider authentication and API response
  -> filters
  -> host names and variables
  -> composed groups
  -> merged inventory sources
  -> play pattern and limit
```

Do not start by changing the playbook. First inspect the inventory exactly as Ansible sees it.

## Confirm the Command Is Using the Expected Project

Record versions and active configuration:

```bash
ansible-inventory --version
ansible --version
ansible-config dump --only-changed
ansible-galaxy collection list
```

The output exposes several common differences between a laptop and CI:

- A different `ansible-core` version.
- Another `ansible.cfg`.
- A missing collection or different collection version.
- Different collection search paths.
- An `ANSIBLE_INVENTORY` or `ANSIBLE_CONFIG` environment override.

Ansible loads only the first configuration file it finds. `ansible --version` prints the chosen path. Run diagnostics from the same directory and execution environment as the failing job.

Then pass the inventory source explicitly:

```bash
INVENTORY="inventories/production/prod.aws_ec2.yml"

ansible-inventory \
  -i "$INVENTORY" \
  --graph
```

If this explicit command works while the playbook does not, the default inventory or working directory is wrong.

## Verify That the Plugin Is Installed

Inventory plugins outside `ansible-core` arrive in collections. For an AWS EC2 source:

```bash
ansible-galaxy collection list amazon.aws
ansible-doc -t inventory amazon.aws.aws_ec2
```

The plugin documentation lists:

- The collection version being documented.
- Control-node Python libraries.
- Valid source filename suffix.
- Authentication sources.
- Filters, hostname options, grouping, and caching settings.

For example, `amazon.aws.aws_ec2` is not included in `ansible-core`. Its current documentation requires `boto3` and `botocore` on the control node and requires a YAML filename ending in `aws_ec2.yml` or `aws_ec2.yaml`.

Install the declared collection and Python dependencies through the project's lock or execution environment. An ad hoc install on one operator's laptop does not fix CI.

List all available inventory plugins when the FQCN is uncertain:

```bash
ansible-doc -t inventory -l
```

## Check the Source File Contract

A plugin configuration is YAML, but it is not a static YAML inventory. It normally has a root `plugin` key.

An AWS example:

```yaml
---
plugin: amazon.aws.aws_ec2
regions:
  - eu-west-1

filters:
  instance-state-name: running

hostnames:
  - tag:Name
  - private-ip-address

compose:
  ansible_host: private_ip_address

keyed_groups:
  - prefix: env
    key: ec2_tags.Environment
  - prefix: role
    key: ec2_tags.Role

strict: false
strict_permissions: true
```

The `ec2_tags` host variable is available in `amazon.aws` 11.2.0 and later. The older `tags` host variable is deprecated in current releases, so consult the documentation for the collection version installed in the execution environment.

Check four things before looking at the provider:

1. The file is readable by the job user.
2. Its suffix satisfies that specific plugin's documentation.
3. The `plugin` value is the correct FQCN.
4. YAML indentation and value types are valid.

The built-in `auto` inventory plugin detects installed plugins from a YAML file's root `plugin` key. If `ansible.cfg` overrides the enabled inventory plugin list and removes `auto`, discovery can fail.

Inspect relevant configuration:

```bash
ansible-config dump --only-changed \
  | grep -E 'INVENTORY|CACHE|COLLECTION'
```

If `[inventory] enable_plugins` is customized, either restore the normal `auto` behavior or include the required plugin according to the inventory-plugin documentation. Do not copy an old enabled-plugin list forward without reviewing it after upgrades.

## Read the First Parser Warning

Run with verbosity:

```bash
ansible-inventory \
  -i "$INVENTORY" \
  --graph \
  -vvvv
```

Ansible can try several enabled plugins against one source. The important message is usually the first specific explanation of why the intended plugin declined or failed to parse it:

- Filename did not pass `verify_file`.
- Plugin could not be found.
- Required Python library is missing.
- Configuration option is invalid for the installed collection version.
- Provider credentials are unavailable.
- API access was denied.

Capture verbose output in a protected job log and redact credentials, tokens, account IDs, and sensitive resource metadata before sharing it.

Warnings such as “Unable to parse” followed by an empty implicit localhost inventory mean no usable source was loaded. Continuing to the play only produces the less useful “no hosts matched.”

## Test Provider Authentication Outside Ansible

Inventory plugins use the credentials and SDK configuration visible to the control-node process. A successful browser login or shell session for another user is irrelevant.

For AWS, confirm the same environment can identify itself:

```bash
aws sts get-caller-identity
aws ec2 describe-instances \
  --region eu-west-1 \
  --max-items 5
```

If the inventory source sets `profile` or `assume_role_arn`, make the CLI test use the equivalent profile or assumed-role credentials. Otherwise, the test may identify a different principal from the inventory plugin.

For another provider, use its official SDK or CLI to perform the same read operation as the inventory plugin.

Check:

- The principal or assumed role.
- Subscription, account, project, and region.
- Token expiry.
- Read permissions for every resource type the plugin queries.
- Network access to identity and provider API endpoints.
- Proxy and CA configuration.

Keep provider secrets out of the inventory file. Use the provider SDK's supported workload identity, environment, profile, or managed identity flow.

Some plugins can ignore permission failures. In the AWS example, `strict_permissions: false` can skip `403 Forbidden` responses. That can be useful in a deliberately partial account, but it can also turn a missing permission into missing hosts. Keep strict permission handling enabled during diagnosis.

## Remove Filters Until the Host Appears

Cloud-side filters are a frequent reason for a clean but incomplete inventory. In the example:

```yaml
filters:
  instance-state-name: running
```

Stopped instances are intentionally absent.

Temporarily reduce the configuration to:

```yaml
---
plugin: amazon.aws.aws_ec2
regions:
  - eu-west-1
strict_permissions: true
```

Inspect the result:

```bash
ansible-inventory \
  -i "$INVENTORY" \
  --list \
  --yaml
```

Add one filter at a time. Compare exact provider values, including:

- Region.
- Resource state.
- Tag key capitalization.
- Tag value spelling.
- Virtual network, project, or resource-group scope.
- Include and exclude filters.

A tag named `environment` is not necessarily the same as `Environment`. Query the provider API for the missing resource instead of relying on its portal display name.

## Find the Host Before Looking for Its Group

Dynamic inventory chooses an `inventory_hostname`. It might be a provider ID, private DNS name, tag value, or IP address. The address Ansible connects to can be a separate `ansible_host`.

Dump all host names:

```bash
ansible-inventory \
  -i "$INVENTORY" \
  --list \
  --yaml
```

Once a likely name appears, inspect its final variables:

```bash
ansible-inventory \
  -i "$INVENTORY" \
  --host api-prod-01 \
  --yaml
```

If two resources resolve to the same preferred hostname, they collide instead of becoming two distinct inventory hosts. The AWS plugin does not fall back to the next hostname candidate merely because a name is already in use. Its `allow_duplicated_hosts` option controls whether each instance contributes all matching names from `hostnames` or only the first; it does not make names unique across instances. Use a stable unique provider property for `inventory_hostname`, then set a readable variable for display.

Do not assume `ansible_host` is the key used in `host_vars/`. Host-variable filenames match `inventory_hostname`.

## Debug Composed Variables and Groups

`compose`, `groups`, and `keyed_groups` run Jinja expressions against variables returned by the plugin.

In this example:

```yaml
keyed_groups:
  - prefix: env
    key: ec2_tags.Environment
```

a provider value such as `Production-West` is transformed into a valid Ansible group name according to the plugin and core sanitization rules. The result may be closer to:

```text
env_Production_West
```

It is not necessarily the literal tag value expected by the playbook. Use:

```bash
ansible-inventory \
  -i "$INVENTORY" \
  --graph \
  --vars
```

Do not guess the generated group name.

Many plugins default `strict: false`. A failed composition expression can then be skipped because a variable is missing. During diagnosis, set:

```yaml
strict: true
```

and rerun the inventory command. An explicit undefined-variable error is more useful than a silently missing group. Return to the desired production setting only after the expression safely handles absent data.

Use defaults in expressions where absence is valid. For example, design an environment group only after confirming whether an untagged resource should be excluded or placed in an `unknown` group.

## Check Inventory Source Order

An inventory directory can contain static, dynamic, and constructed sources. Ansible loads sources in the supplied order, or lexicographically when reading a directory.

For example:

```text
inventories/production/
├── 01-cloud.aws_ec2.yml
├── 02-static.yml
└── 03-constructed.yml
```

The `ansible.builtin.constructed` plugin can use only variables already available from earlier inventory sources or a fact cache. If it loads before the cloud plugin, its expressions cannot see the cloud hosts.

Prefix files when ordering is meaningful. Then test the directory as a whole:

```bash
ansible-inventory \
  -i inventories/production \
  --graph \
  --vars
```

When the same variable is supplied at the same inventory precedence by multiple sources, later inventory definitions can overwrite earlier ones. More specific inventory variables, such as host variables, still take precedence over group variables. Debug the single dynamic source first, then add the other sources until the conflict appears.

## Eliminate Stale Cache Results

Inventory plugins can cache provider results. A newly created or retagged host can be absent until the cache expires.

Inspect plugin-specific options such as:

```yaml
cache: false
```

Disable caching temporarily and rerun. You can also ask the CLI to bypass cached inventory data while rebuilding the inventory:

```bash
ansible-inventory \
  -i "$INVENTORY" \
  --flush-cache \
  --graph
```

The `--flush-cache` flag also clears cached facts for inventory hosts. If inventory and facts share a cache backend, account for both effects. The exact cache backend may also need its documented cleanup procedure. Do not delete a shared cache blindly, because other automation might use it.

If disabling cache fixes the inventory, restore caching with an expiry that matches resource churn and ensure provisioning workflows invalidate or refresh it when necessary.

## Verify the Play Pattern and Limit Last

Once the host and group appear in `ansible-inventory`, confirm play selection:

```bash
ansible-playbook \
  -i "$INVENTORY" \
  playbooks/site.yml \
  --list-hosts
```

Then test any limit:

```bash
ansible-playbook \
  -i "$INVENTORY" \
  playbooks/site.yml \
  --limit 'env_Production_West:&role_api' \
  --list-hosts
```

The play's `hosts:` pattern is evaluated first, and `--limit` narrows that result. A host present in inventory can still be excluded by either expression.

Use `--list-hosts` before changing a pattern. Adding `all` to silence “no hosts matched” can accidentally broaden a production run.

## A Repeatable Debugging Sequence

1. Record Ansible, collection, and Python dependency versions.
2. Confirm the active `ansible.cfg`.
3. Pass one inventory source explicitly.
4. Read the plugin's installed-version documentation.
5. Check filename suffix and root `plugin` key.
6. Run `ansible-inventory -vvvv` and read the first specific warning.
7. Verify provider identity and read permission from the same process environment.
8. Remove all filters, then add them one at a time.
9. Find the host's actual `inventory_hostname`.
10. Inspect composed variables and generated group names.
11. Set strict expression handling during diagnosis.
12. Disable or flush caches.
13. Add inventory sources back in load order.
14. Confirm play and limit selection with `--list-hosts`.

This sequence separates discovery from grouping and selection. Once each stage is visible, a missing host becomes a specific configuration or data problem instead of a mysterious playbook failure.

## Official Documentation

- [Working with dynamic inventory](https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_dynamic_inventory.html)
- [Inventory plugins](https://docs.ansible.com/projects/ansible/latest/plugins/inventory.html)
- [ansible-inventory command reference](https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html)
- [Index of inventory plugins](https://docs.ansible.com/projects/ansible/latest/collections/index_inventory.html)
- [amazon.aws.aws_ec2 inventory plugin](https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/aws_ec2_inventory.html)
- [ansible.builtin.constructed inventory plugin](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/constructed_inventory.html)
