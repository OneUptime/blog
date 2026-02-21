# How to Use Lookup Plugins vs Filters in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Lookup Plugins, Filters, Jinja2

Description: Understand the differences between Ansible lookup plugins and filters, when to use each, and how they work together in playbooks.

---

One of the most common sources of confusion for Ansible users is understanding the difference between lookup plugins and filters. Both are used inside Jinja2 expressions. Both transform data. But they serve fundamentally different purposes, and picking the wrong one can lead to unexpected behavior or overly complicated playbooks.

Let me break this down with real examples so you know exactly when to reach for a lookup and when to reach for a filter.

## What Lookup Plugins Do

Lookup plugins fetch data from external sources. They run on the Ansible controller (not on remote hosts), and they pull information into your playbook from files, environment variables, databases, credential stores, APIs, and more.

The key characteristic of a lookup plugin is that it generates or retrieves data that did not previously exist in your playbook context.

```yaml
# Examples of lookup plugins fetching external data
- hosts: localhost
  gather_facts: false
  tasks:
    # Read the contents of a file from the controller
    - name: Load SSH public key
      debug:
        msg: "{{ lookup('file', '/home/deploy/.ssh/id_rsa.pub') }}"

    # Read an environment variable from the controller
    - name: Get the home directory
      debug:
        msg: "{{ lookup('env', 'HOME') }}"

    # Generate a random password
    - name: Create a database password
      debug:
        msg: "{{ lookup('password', '/dev/null length=20 chars=ascii_letters,digits') }}"

    # Query HashiCorp Vault
    - name: Fetch a secret
      debug:
        msg: "{{ lookup('hashi_vault', 'secret=secret/data/myapp token=s.xyz url=http://vault:8200') }}"
```

## What Filters Do

Filters transform data that already exists. They take an input value, apply a transformation, and return a modified value. Filters run inside the Jinja2 template engine and do not reach out to external systems.

Think of filters as pure functions: same input always produces the same output, with no side effects.

```yaml
# Examples of filters transforming existing data
- hosts: localhost
  gather_facts: false
  vars:
    servers:
      - name: web1
        role: frontend
        status: active
      - name: web2
        role: frontend
        status: inactive
      - name: db1
        role: backend
        status: active
    raw_config: "  some_value = 42  "

  tasks:
    # Filter a list to get only active servers
    - name: Get active servers
      debug:
        msg: "{{ servers | selectattr('status', 'equalto', 'active') | list }}"

    # Extract just the names from the server list
    - name: Get server names
      debug:
        msg: "{{ servers | map(attribute='name') | list }}"

    # Transform a string
    - name: Clean up config value
      debug:
        msg: "{{ raw_config | trim | upper }}"

    # Convert data formats
    - name: Render as JSON
      debug:
        msg: "{{ servers | to_json }}"
```

## The Core Difference

Here is the simplest way to think about it:

- **Lookups** answer the question "Where do I get this data?"
- **Filters** answer the question "How do I reshape this data?"

A lookup brings data into the playbook. A filter changes data that is already in the playbook.

```mermaid
flowchart LR
    A[External Sources] -->|Lookup Plugins| B[Raw Data in Playbook]
    B -->|Filters| C[Transformed Data]
    A2[Files, APIs, Vaults] --> A
    C --> D[Used in Tasks]
```

## Execution Context Matters

Lookups run on the controller machine. This is a critical distinction. If you use `lookup('file', '/etc/hostname')`, it reads `/etc/hostname` from the machine running Ansible, not from the target host.

Filters run wherever Jinja2 templating happens. Since Ansible templates variables before sending them to remote hosts, filters effectively run on the controller too, but they do not have any awareness of the controller's filesystem or environment. They only operate on the data you pass them.

```yaml
# This reads the file from the CONTROLLER, not the remote host
- name: Read controller file
  debug:
    msg: "{{ lookup('file', '/etc/hostname') }}"

# To read from a remote host, use the slurp module instead
- name: Read remote file
  slurp:
    src: /etc/hostname
  register: remote_hostname

- name: Decode the remote file content using a filter
  debug:
    msg: "{{ remote_hostname.content | b64decode }}"
```

## Combining Lookups and Filters

The real power comes from chaining lookups and filters together. Fetch data with a lookup, then reshape it with filters.

```yaml
# Fetch a CSV file and transform it into usable data
- hosts: localhost
  gather_facts: false
  tasks:
    - name: Load and parse server inventory from CSV
      set_fact:
        raw_csv: "{{ lookup('file', 'servers.csv') }}"

    - name: Parse CSV into a list of dictionaries
      set_fact:
        server_list: >-
          {{ raw_csv.split('\n')[1:] |
             reject('equalto', '') |
             map('regex_replace', '^(.+),(.+),(.+)$', '{"name": "\1", "ip": "\2", "role": "\3"}') |
             map('from_json') |
             list }}

    - name: Show only backend servers
      debug:
        msg: "{{ server_list | selectattr('role', 'equalto', 'backend') | list }}"
```

## When to Choose a Lookup

Use a lookup when you need to:

- Read file contents from the controller
- Access environment variables
- Generate passwords or random data
- Query external services (Vault, Consul, AWS SSM)
- Read from credential stores
- Iterate over fileglob patterns

```yaml
# Reading all YAML files from a directory using fileglob lookup
- hosts: localhost
  gather_facts: false
  tasks:
    - name: Load all config files
      set_fact:
        all_configs: "{{ all_configs | default([]) + [lookup('file', item) | from_yaml] }}"
      loop: "{{ lookup('fileglob', 'configs/*.yml', wantlist=True) }}"
```

## When to Choose a Filter

Use a filter when you need to:

- Transform strings (upper, lower, trim, regex_replace)
- Filter lists (select, reject, selectattr, rejectattr)
- Convert data formats (to_json, to_yaml, from_json, from_yaml)
- Perform math operations
- Set default values
- Hash or encrypt data
- Manipulate paths or URLs

```yaml
# Using filters for data transformation
- hosts: localhost
  gather_facts: false
  vars:
    users:
      - {name: "alice", groups: ["admin", "dev"]}
      - {name: "bob", groups: ["dev"]}
      - {name: "charlie", groups: ["admin", "ops"]}

  tasks:
    # Get all unique groups across all users
    - name: Collect all groups
      debug:
        msg: "{{ users | map(attribute='groups') | flatten | unique | sort }}"

    # Find users in the admin group
    - name: Admin users
      debug:
        msg: "{{ users | selectattr('groups', 'contains', 'admin') | map(attribute='name') | list }}"

    # Create a comma-separated list of usernames
    - name: User list
      debug:
        msg: "{{ users | map(attribute='name') | join(', ') }}"
```

## Overlap Areas and Common Pitfalls

Some operations feel like they could be either a lookup or a filter. The `pipe` lookup runs a shell command and returns its output. You might think this is a filter, but it needs to interact with the controller's shell, so it has to be a lookup.

On the other hand, `to_json` is always a filter because it takes existing data and reformats it without reaching out to any external source.

A common mistake is using `lookup('env', 'MY_VAR')` when you actually want to read an environment variable on the remote host. The lookup reads from the controller's environment. To read a remote environment variable, use the `shell` module or `ansible_env` facts.

```yaml
# WRONG: reads from controller environment
- name: This reads the controller's PATH
  debug:
    msg: "{{ lookup('env', 'PATH') }}"

# RIGHT: reads from remote host environment via facts
- name: This reads the remote host's PATH
  debug:
    msg: "{{ ansible_env.PATH }}"
```

## Performance Considerations

Lookup plugins can be slow if they query external services. Each call to a lookup triggers actual I/O. If you are using a lookup inside a loop with hundreds of iterations, you might be making hundreds of API calls or file reads.

Filters are fast because they operate on in-memory data. Once you have loaded your data into a variable, filtering it is essentially free in terms of performance.

If you find yourself calling the same lookup repeatedly, load the data once into a variable with `set_fact`, and then use filters to extract what you need.

## Summary

Lookup plugins and filters are complementary tools. Lookups bring external data into your playbooks, while filters reshape and transform that data. Use lookups when you need to reach outside your playbook's variable space, and use filters when you need to manipulate data that is already available. When you combine both effectively, your playbooks become concise, readable, and powerful.
