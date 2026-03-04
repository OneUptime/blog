# How to Document Ansible Plugins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Plugins, Documentation, Best Practices

Description: Learn how to write proper documentation for Ansible plugins that integrates with ansible-doc and Galaxy documentation systems.

---

Good documentation is what separates a useful plugin from a frustrating one. Ansible has a built-in documentation system that reads structured docstrings from your plugin source code and presents them through `ansible-doc`. When you follow the correct format, your plugins get the same professional documentation treatment as built-in Ansible plugins.

This guide covers the documentation format for every plugin type, how to write effective examples, and how to validate your docs before publishing.

## The Three Documentation Blocks

Every Ansible plugin should include three documentation blocks defined as module-level string variables:

1. `DOCUMENTATION` - Describes the plugin, its options, and how it works
2. `EXAMPLES` - Shows how to use the plugin in playbooks
3. `RETURN` - Describes what the plugin returns

Here is a complete example for a lookup plugin:

```python
# plugins/lookup/vault_secret.py
DOCUMENTATION = """
    name: vault_secret
    author: Your Name (@yourgithub)
    version_added: "1.0.0"
    short_description: Retrieve secrets from HashiCorp Vault
    description:
        - This lookup plugin retrieves secrets from a HashiCorp Vault server.
        - It supports KV v1 and KV v2 secret engines.
        - Authentication is done via token or AppRole.
    requirements:
        - hvac Python library (pip install hvac)
    options:
      _terms:
        description: The secret path(s) to retrieve from Vault.
        required: true
        type: list
        elements: str
      vault_url:
        description:
          - The URL of the Vault server.
          - Can also be set via the C(VAULT_ADDR) environment variable.
        type: str
        required: true
        env:
          - name: VAULT_ADDR
        ini:
          - section: vault_lookup
            key: url
      vault_token:
        description:
          - Authentication token for Vault.
          - Can also be set via the C(VAULT_TOKEN) environment variable.
        type: str
        env:
          - name: VAULT_TOKEN
        ini:
          - section: vault_lookup
            key: token
      mount_point:
        description: The mount point of the KV secret engine.
        type: str
        default: secret
      kv_version:
        description: KV secret engine version (1 or 2).
        type: int
        default: 2
        choices: [1, 2]
    notes:
      - When using KV v2, the plugin automatically handles the /data/ path prefix.
      - For production use, prefer AppRole auth over static tokens.
    seealso:
      - name: HashiCorp Vault Documentation
        link: https://developer.hashicorp.com/vault/docs
        description: Official Vault documentation
"""

EXAMPLES = """
# Retrieve a single secret
- name: Get database password
  ansible.builtin.debug:
    msg: "{{ lookup('myorg.myutils.vault_secret', 'databases/postgres', vault_url='https://vault.example.com:8200') }}"

# Retrieve multiple secrets
- name: Get application secrets
  ansible.builtin.set_fact:
    db_password: "{{ lookup('myorg.myutils.vault_secret', 'app/db', vault_url=vault_addr) }}"
    api_key: "{{ lookup('myorg.myutils.vault_secret', 'app/api', vault_url=vault_addr) }}"

# Use with environment variables (VAULT_ADDR and VAULT_TOKEN set)
- name: Get secret using env vars
  ansible.builtin.debug:
    msg: "{{ lookup('myorg.myutils.vault_secret', 'myapp/config') }}"

# Specify KV v1 engine
- name: Get legacy secret
  ansible.builtin.debug:
    msg: "{{ lookup('myorg.myutils.vault_secret', 'legacy/creds', kv_version=1) }}"
"""

RETURN = """
  _raw:
    description:
      - A dictionary containing the secret data at the specified path.
    type: dict
    sample:
      username: admin
      password: s3cr3t
"""
```

## Documentation Format Details

The `DOCUMENTATION` block uses YAML format. Here are the key fields:

**name** - The plugin name. Must match the filename without the `.py` extension.

**author** - Your name and GitHub handle. Can be a list for multiple authors.

**version_added** - The collection version where this plugin was introduced.

**short_description** - A one-line summary. Shown in `ansible-doc -l` listings.

**description** - A list of paragraphs explaining what the plugin does.

**options** - Each configurable option with its type, default, description, and source (env vars, ini settings, vars).

**notes** - Additional information that does not fit in the description.

**seealso** - Links to related documentation.

## Documenting Options

Options are the most important part to get right. Each option should specify:

```yaml
options:
  my_option:
    description:
      - First paragraph of the description.
      - Second paragraph with more detail.
    type: str           # str, int, bool, list, dict, float, path, raw
    required: false     # Defaults to false
    default: some_value # Default value
    choices:            # Restrict to specific values
      - option_a
      - option_b
    aliases:            # Alternative names for the option
      - my_opt
    env:                # Environment variable sources
      - name: MY_PLUGIN_OPTION
    ini:                # ansible.cfg settings
      - section: my_plugin
        key: my_option
    vars:               # Ansible variable sources
      - name: my_plugin_my_option
    version_added: "1.1.0"  # If added after initial release
```

## Plugin-Specific Documentation

Different plugin types have slightly different documentation structures.

For filter plugins, document each filter function:

```python
# plugins/filter/string_utils.py
DOCUMENTATION = """
    name: string_utils
    short_description: String manipulation filters
    version_added: "1.0.0"
    description:
        - A collection of string manipulation filters.
    author: Your Name
"""

# Per-filter documentation using FilterModule docstrings
class FilterModule:
    """String utility filters for Ansible."""

    def filters(self):
        return {
            'snake_case': self.snake_case,
            'title_slug': self.title_slug,
        }

    @staticmethod
    def snake_case(value):
        """Convert a string to snake_case.

        Args:
            value: Input string in any case format.

        Returns:
            String converted to snake_case.

        Example:
            {{ "myVariableName" | myorg.myutils.snake_case }}
            # Returns: my_variable_name
        """
        import re
        s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', value)
        return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()
```

For callback plugins, include the callback type:

```python
DOCUMENTATION = """
    name: my_callback
    type: notification    # notification, stdout, or aggregate
    short_description: Send notifications on play events
    description:
        - This callback sends notifications when plays complete.
    requirements:
        - requests Python library
    options:
      webhook_url:
        description: URL to send notifications to
        type: str
        required: true
        env:
          - name: ANSIBLE_NOTIFICATION_WEBHOOK
"""
```

## Inline Documentation Markup

Ansible supports special markup in documentation strings:

```yaml
description:
  - Use C(code_text) for inline code references.
  - Use I(italic_text) for emphasis.
  - Use B(bold_text) for strong emphasis.
  - Use U(https://example.com) for URLs.
  - Use L(link text, https://example.com) for named links.
  - Use M(module.name) for module references.
  - Use R(reference text, anchor) for internal references.
  - Use O(option_name) for option references.
  - Use RV(return_value) for return value references.
```

## Validating Documentation

Use `ansible-doc` to check your documentation renders correctly:

```bash
# View the full documentation
ansible-doc -t lookup myorg.myutils.vault_secret

# List plugins in a collection
ansible-doc -l -t lookup myorg.myutils

# Check snippet/usage
ansible-doc -s -t lookup myorg.myutils.vault_secret
```

For automated validation, use `ansible-test`:

```bash
cd collections/ansible_collections/myorg/myutils

# Validate all documentation
ansible-test sanity --test validate-modules

# Check documentation specifically
ansible-test sanity --test ansible-doc
```

## Common Documentation Mistakes

Here are things that will cause validation errors or confusing docs:

1. **Missing required fields**: `name`, `short_description`, and `description` are required.
2. **Wrong option type**: Using `type: string` instead of `type: str`.
3. **YAML formatting errors**: Bad indentation in the DOCUMENTATION string.
4. **Mismatched option names**: The option name in docs not matching what the code uses.
5. **Missing version_added**: Required for collections published to Galaxy.

## Generating HTML Documentation

For collections published to Galaxy or hosted privately, you can generate HTML docs:

```bash
# Install the docs build tool
pip install antsibull-docs

# Generate documentation
antsibull-docs collection --use-current --dest-dir ./docs myorg.myutils
```

This produces HTML files similar to the official Ansible documentation site.

## Summary

Documenting Ansible plugins is about following a structured YAML format that integrates with `ansible-doc` and Galaxy. Include `DOCUMENTATION`, `EXAMPLES`, and `RETURN` blocks in every plugin. Use the proper type annotations for options, provide realistic examples, and validate with `ansible-test sanity`. Well-documented plugins get adopted; poorly documented ones get abandoned.
