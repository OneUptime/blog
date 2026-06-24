# How to Use the Ansible yaml Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, YAML, Output Formatting

Description: Configure the Ansible yaml callback plugin to display playbook results in readable YAML format instead of default Python dictionary output.

---

Modern Ansible formats task results as YAML by setting `callback_result_format = yaml` on the default stdout callback. Older Ansible installations also had a `community.general.yaml` stdout callback, but that callback is deprecated and removed from current `community.general` releases. If you have ever stared at a wall of curly braces and quotes trying to find a specific value in Ansible output, YAML-formatted results are for you. They produce the same information but in a format that is much easier for humans to read.

## Enabling the YAML Callback

Add it to your `ansible.cfg`:

```ini
# ansible.cfg - Switch to YAML output formatting

[defaults]
stdout_callback = default
callback_result_format = yaml
```

Or for a single run:

```bash
# Use YAML-formatted callback results for this run
ANSIBLE_CALLBACK_RESULT_FORMAT=yaml ansible-playbook site.yml
```

On older installations that still include the deprecated `community.general.yaml` callback, you may see examples that use `stdout_callback = community.general.yaml` or `ANSIBLE_STDOUT_CALLBACK=community.general.yaml`. For ansible-core 2.13 and newer, use `callback_result_format = yaml` instead.

## The Readability Difference

This is the biggest selling point. Here is a task result with the default callback:

```text
TASK [Get service status] ****************************************************
ok: [web-01] => {"changed": false, "status": {"ActiveState": "active", "Description": "The NGINX HTTP and reverse proxy server", "ExecMainPID": 1234, "LoadState": "loaded", "SubState": "running", "UnitFileState": "enabled"}}
```

The same result with YAML-formatted callback results:

```text
TASK [Get service status] ****************************************************
ok: [web-01] =>
  changed: false
  status:
    ActiveState: active
    Description: The NGINX HTTP and reverse proxy server
    ExecMainPID: 1234
    LoadState: loaded
    SubState: running
    UnitFileState: enabled
```

The YAML format uses indentation and newlines to show structure, which makes nested data far easier to scan. This matters most when tasks return complex results, like `setup` facts or API responses.

## When YAML Shines

YAML-formatted callback results are most valuable when debugging tasks that return rich data. Consider gathering facts:

```bash
# View facts in YAML format - much more readable
ANSIBLE_LOAD_CALLBACK_PLUGINS=1 ANSIBLE_STDOUT_CALLBACK=default ANSIBLE_CALLBACK_RESULT_FORMAT=yaml ansible web-01 -m setup -a "filter=ansible_memory_mb" -v
```

Default output:

```text
web-01 | SUCCESS => {"ansible_facts": {"ansible_memory_mb": {"nocache": {"free": 1542, "used": 506}, "real": {"free": 234, "total": 2048, "used": 1814}, "swap": {"cached": 0, "free": 2048, "total": 2048, "used": 0}}}, "changed": false}
```

YAML output:

```text
web-01 | SUCCESS =>
  ansible_facts:
    ansible_memory_mb:
      nocache:
        free: 1542
        used: 506
      real:
        free: 234
        total: 2048
        used: 1814
      swap:
        cached: 0
        free: 2048
        total: 2048
        used: 0
  changed: false
```

## Using YAML with Debug Tasks

YAML-formatted callback results pair well with debug tasks that display complex variables:

```yaml
# debug-example.yml - Display complex data structures
---
- name: Show server configuration
  hosts: webservers
  gather_facts: true

  tasks:
    # Display mounted filesystems
    - name: Show mount points
      debug:
        var: ansible_mounts

    # Display network interfaces
    - name: Show network config
      debug:
        msg:
          hostname: "{{ ansible_hostname }}"
          ip_addresses: "{{ ansible_all_ipv4_addresses }}"
          default_gateway: "{{ ansible_default_ipv4.gateway }}"
          dns_servers: "{{ ansible_dns.nameservers }}"
```

With YAML-formatted callback results, the debug output is neatly indented:

```text
TASK [Show network config] ***************************************************
ok: [web-01] =>
  msg:
    hostname: web-01
    ip_addresses:
      - 10.0.1.10
      - 172.17.0.1
    default_gateway: 10.0.1.1
    dns_servers:
      - 10.0.0.2
      - 8.8.8.8
```

## YAML Callback with Diff Mode

YAML-formatted callback results handle diff mode nicely. When you run with `--diff`, file changes are displayed cleanly:

```bash
# Show diffs with YAML-formatted callback results
ANSIBLE_CALLBACK_RESULT_FORMAT=yaml ansible-playbook site.yml --diff --check
```

Output:

```text
TASK [Update nginx config] ***************************************************
--- before: /etc/nginx/nginx.conf
+++ after: /home/user/.ansible/tmp/nginx.conf
@@ -5,7 +5,7 @@
 http {
     sendfile on;
     tcp_nopush on;
-    keepalive_timeout 65;
+    keepalive_timeout 120;

changed: [web-01] =>
  changed: true
  diff:
    - after: |
        ...new content...
      after_header: /home/user/.ansible/tmp/nginx.conf
      before: |
        ...old content...
      before_header: /etc/nginx/nginx.conf
```

## YAML Callback for API Responses

When working with URI or API modules, responses often contain deeply nested JSON. YAML-formatted callback results make these manageable:

```yaml
# api-check.yml - Query an API and display results
---
- name: Check API health
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Query Kubernetes API
      uri:
        url: "https://k8s-api.example.com/api/v1/nodes"
        headers:
          Authorization: "Bearer {{ k8s_token }}"
        return_content: true
      register: k8s_nodes

    - name: Show node status
      debug:
        msg: "{{ k8s_nodes.json.items | map(attribute='status.conditions') | list }}"
```

Without YAML-formatted callback results, that output would be an unreadable wall of text. With them, you get properly indented structure showing each node's conditions.

## Making YAML the Default

Many teams adopt YAML-formatted callback results as their standard. Here is a project-level `ansible.cfg` that sets them up with complementary options:

```ini
# ansible.cfg - YAML-formatted callback results with complementary settings
[defaults]
stdout_callback = default
# Display results in YAML format
callback_result_format = yaml
# Hide skipped tasks to reduce noise
display_skipped_hosts = False
# Show task timing
callbacks_enabled = timer, profile_tasks
```

## YAML Callback vs Setting callback_result_format

There is a subtle difference between using the older `community.general.yaml` stdout callback and setting `callback_result_format = yaml` with the default callback.

The deprecated `community.general.yaml` stdout callback replaces the stdout callback. It was removed in current `community.general` releases because the default callback can now print results in YAML format.

Setting `callback_result_format = yaml` on the default callback changes how task results are displayed while keeping the standard task/play headers.

```ini
# Option 1: Legacy YAML callback, only for older community.general releases
[defaults]
stdout_callback = community.general.yaml

# Option 2: Current default callback with YAML-formatted results
[defaults]
stdout_callback = default
callback_result_format = yaml
```

For most people, option 2 is the better choice because it is the current supported approach and keeps the familiar task headers and play recap while getting YAML-formatted results.

## Performance Considerations

YAML-formatted callback results have a small performance overhead. Converting result dictionaries to YAML is normally negligible compared to actual task execution time. The output is slightly larger in terms of bytes because of the whitespace, but this is only relevant if you are piping output to a file on a disk-constrained system.

## When Not to Use YAML

YAML-formatted callback output is for human consumption. If you need machine-parseable output, use the `ansible.posix.json` callback instead. Parsing YAML output from a callback is fragile because the output includes ANSI color codes and non-YAML text like task headers.

For CI/CD pipelines where both humans and machines need the output, a practical approach is to use YAML-formatted results for stdout (so developers can read the logs) and write structured JSON to a file using a notification callback or a wrapper script.

YAML-formatted callback results are one of those small quality-of-life improvements that make working with Ansible noticeably more pleasant. Try them for a week and you will not want to go back to reading JSON-style dictionaries.
