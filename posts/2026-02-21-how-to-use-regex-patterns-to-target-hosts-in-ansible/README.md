# How to Use Regex Patterns to Target Hosts in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Inventory, Regex, Patterns, DevOps

Description: Learn how to use regular expression patterns in Ansible to target hosts with complex naming patterns, character classes, and alternation for precise infrastructure selection.

---

Wildcards in Ansible cover simple cases like "all hosts starting with web." But when you need more precise matching, like targeting hosts with a specific number range in their name, matching multiple prefixes, or selecting hosts based on complex naming patterns, you need regular expressions. Ansible supports full Python regex syntax for host targeting.

## Basic Regex Syntax

Prefix your pattern with a tilde `~` to tell Ansible it is a regex:

```bash
# Match hosts whose names start with "web"
ansible '~^web' -i inventory.ini -m ping

# Match hosts whose names end with ".example.com"
ansible '~\.example\.com$' -i inventory.ini -m ping

# Match hosts with "prod" anywhere in the name
ansible '~prod' -i inventory.ini -m ping
```

Given this inventory:

```ini
# inventory.ini
[all_servers]
web-prod-01.example.com
web-prod-02.example.com
web-prod-03.example.com
web-staging-01.example.com
web-staging-02.example.com
db-prod-primary.example.com
db-prod-replica-01.example.com
db-prod-replica-02.example.com
db-staging-01.example.com
cache-prod-01.example.com
cache-prod-02.example.com
cache-staging-01.example.com
monitor-01.internal.local
monitor-02.internal.local
```

## Character Classes

Use character classes to match specific characters:

```bash
# Match hosts with a digit in the name
ansible '~[0-9]' -i inventory.ini -m ping

# Match hosts with numbers 01 through 05
ansible '~-0[1-5]\.' -i inventory.ini -m ping

# Match hosts starting with web or db
ansible '~^(web|db)' -i inventory.ini -m ping

# Match hosts with exactly two digits before .example.com
ansible '~[0-9]{2}\.example\.com$' -i inventory.ini -m ping
```

## Alternation (OR)

The `|` operator in regex lets you match multiple patterns:

```bash
# Match web or cache servers (but not db)
ansible '~^(web|cache)' -i inventory.ini -m ping

# Match production or staging
ansible '~(prod|staging)' -i inventory.ini -m ping

# Match specific roles
ansible '~^(web|db|cache)-prod' -i inventory.ini -m ping
```

## Using Regex in Playbooks

The `hosts` field in a play accepts regex patterns with the `~` prefix:

```yaml
# deploy-web-and-cache.yml
# Target web and cache servers using regex
- hosts: "~^(web|cache)-prod"
  become: true
  tasks:
    - name: Deploy application update
      include_role:
        name: app-update

    - name: Restart services
      systemd:
        name: "{{ item }}"
        state: restarted
      loop: "{{ services_to_restart | default([]) }}"
```

```yaml
# rolling-update.yml
# Target only the first server of each role for canary deployment
- hosts: "~-01\\."
  become: true
  tasks:
    - name: Deploy canary version
      include_role:
        name: canary-deploy
```

Note the double backslash `\\` in the playbook YAML. The first backslash escapes the second for YAML, and the second escapes the dot for regex.

## Advanced Regex Examples

Here are patterns for common real-world scenarios:

```bash
# Match replicas (replica-01, replica-02, etc.)
ansible '~replica-[0-9]+' -i inventory.ini -m ping

# Match hosts in US East region (use1 or use-1 in the name)
ansible '~use?-?1' -i inventory.ini -m ping

# Match hosts NOT in production (negative lookahead)
# Note: This requires Python regex support
ansible '~^(?!.*prod)' -i inventory.ini -m ping

# Match hosts with 3-digit numbers
ansible '~[0-9]{3}' -i inventory.ini -m ping

# Match web servers 01 through 10
ansible '~^web.*-0[1-9]\.|^web.*-10\.' -i inventory.ini -m ping

# Match hosts in either .example.com or .internal.local domains
ansible '~\.(example\.com|internal\.local)$' -i inventory.ini -m ping
```

## Combining Regex with Other Patterns

Regex patterns work with Ansible's union, intersection, and exclusion operators:

```bash
# Regex match combined with group exclusion
# All prod servers (by regex) except the databases group
ansible '~prod:!databases' -i inventory.ini -m ping

# Regex combined with group intersection
# Hosts matching the regex AND in the webservers group
ansible '~-01\.:&webservers' -i inventory.ini -m ping

# Union of regex and group
ansible '~^web:databases' -i inventory.ini -m ping
```

## Regex with --limit

The `--limit` flag also supports regex:

```bash
# Playbook targets webservers, but limit to only prod hosts via regex
ansible-playbook -i inventory.ini deploy.yml --limit '~prod'

# Limit to hosts with specific number patterns
ansible-playbook -i inventory.ini deploy.yml --limit '~-0[1-3]\.'

# Limit to a specific domain
ansible-playbook -i inventory.ini site.yml --limit '~\.internal\.local$'
```

## Practical Scenario: Blue-Green Deployment

If your servers follow a blue-green naming convention:

```ini
# inventory.ini
[webservers]
web-blue-01.example.com
web-blue-02.example.com
web-blue-03.example.com
web-green-01.example.com
web-green-02.example.com
web-green-03.example.com
```

Use regex to target one color at a time:

```yaml
# deploy-blue.yml
# Deploy to the blue fleet
- hosts: "~web-blue"
  become: true
  serial: 1
  tasks:
    - name: Deploy new version to blue
      include_role:
        name: webapp
      vars:
        app_version: "{{ new_version }}"

    - name: Health check
      uri:
        url: "http://{{ inventory_hostname }}/health"
        status_code: 200
      retries: 5
      delay: 5
```

```bash
# Deploy to blue first
ansible-playbook -i inventory.ini deploy-blue.yml -e "new_version=2.5.0"

# After verification, deploy to green
ansible-playbook -i inventory.ini deploy-blue.yml --limit '~web-green' -e "new_version=2.5.0"
```

## Regex for Numbered Host Selection

One of the most useful regex applications is selecting hosts by their number:

```bash
# Only hosts numbered 01-05
ansible '~-0[1-5]\.' -i inventory.ini --list-hosts

# Only hosts numbered 06-10
ansible '~-0[6-9]\.|~-10\.' -i inventory.ini --list-hosts

# Only odd-numbered hosts (01, 03, 05, 07, 09)
ansible '~-0[13579]\.' -i inventory.ini --list-hosts

# Only even-numbered hosts (02, 04, 06, 08, 10)
ansible '~-0[2468]\.|~-10\.' -i inventory.ini --list-hosts
```

This is useful for canary deployments where you want to update half your fleet first.

## Regex Quick Reference for Ansible

| Pattern | Matches |
|---------|---------|
| `~^web` | Hostnames starting with "web" |
| `~prod$` | Hostnames ending with "prod" |
| `~(web\|db)` | Hostnames containing "web" or "db" |
| `~[0-9]+` | Hostnames with one or more digits |
| `~-0[1-3]\.` | Hostnames with -01. through -03. |
| `~^(?!.*staging)` | Hostnames NOT containing "staging" |
| `~\.example\.com$` | Hostnames ending in .example.com |
| `~^(web\|cache)-prod-0[1-5]` | Specific combination |

## Escaping in Different Contexts

Regex escaping varies depending on where you use the pattern:

```bash
# Command line: single quotes prevent shell interpretation
ansible '~^web-prod-0[1-3]\.' -i inventory.ini -m ping
```

```yaml
# YAML playbook: escape backslashes
- hosts: "~^web-prod-0[1-3]\\."
  tasks:
    - debug:
        msg: "Matched host: {{ inventory_hostname }}"
```

```yaml
# YAML playbook: or use single quotes to avoid escaping
- hosts: '~^web-prod-0[1-3]\.'
  tasks:
    - debug:
        msg: "Matched host: {{ inventory_hostname }}"
```

## Debugging Regex Patterns

Always preview which hosts match your regex before running:

```bash
# List hosts matching the regex
ansible '~^(web|cache)-prod' -i inventory.ini --list-hosts

# Test with a dry run
ansible-playbook -i inventory.ini site.yml --limit '~^web-prod-0[1-5]' --list-hosts
```

If your regex is not matching what you expect, test it in Python first:

```python
# Quick Python test for your regex
import re
hosts = [
    "web-prod-01.example.com",
    "web-prod-02.example.com",
    "db-prod-01.example.com",
    "web-staging-01.example.com",
]
pattern = r"^web-prod"
for h in hosts:
    if re.search(pattern, h):
        print(f"  MATCH: {h}")
    else:
        print(f"  SKIP:  {h}")
```

## When to Use Regex vs Wildcards

Use **wildcards** (`*`) when:
- You need simple prefix or suffix matching
- The pattern is straightforward
- You want maximum readability

Use **regex** (`~`) when:
- You need character classes (`[0-9]`, `[a-f]`)
- You need alternation (`web|db|cache`)
- You need precise number ranges
- You need negative matching (lookaheads)
- Wildcards cannot express what you need

Regex patterns give you the full power of Python's re module for targeting hosts. They are overkill for simple cases but indispensable when you need precise control over which hosts your automation touches.
