# How to Use the Ansible yaml Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, YAML, Output Formatting

Description: Configure the Ansible yaml callback plugin to display playbook results in readable YAML format instead of default Python dictionary output.

---

The `yaml` callback plugin formats Ansible task results as YAML instead of the default Python dictionary format. If you have ever stared at a wall of curly braces and quotes trying to find a specific value in Ansible output, the YAML callback is for you. It produces the same information but in a format that is much easier for humans to read.

## Enabling the YAML Callback

Add it to your `ansible.cfg`:

```ini
# ansible.cfg - Switch to YAML output formatting
[defaults]
stdout_callback = yaml
```

Or for a single run:

```bash
# Use YAML callback for this run
ANSIBLE_STDOUT_CALLBACK=yaml ansible-playbook site.yml
```

## The Readability Difference

This is the biggest selling point. Here is a task result with the default callback:

```
TASK [Get service status] ****************************************************
ok: [web-01] => {"changed": false, "status": {"ActiveState": "active", "Description": "The NGINX HTTP and reverse proxy server", "ExecMainPID": 1234, "LoadState": "loaded", "SubState": "running", "UnitFileState": "enabled"}}
```

The same result with the YAML callback:

```
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

The YAML callback is most valuable when debugging tasks that return rich data. Consider gathering facts:

```bash
# View facts in YAML format - much more readable
ANSIBLE_STDOUT_CALLBACK=yaml ansible web-01 -m setup -a "filter=ansible_memory_mb" -v
```

Default output:

```
web-01 | SUCCESS => {"ansible_facts": {"ansible_memory_mb": {"nocache": {"free": 1542, "used": 506}, "real": {"free": 234, "total": 2048, "used": 1814}, "swap": {"cached": 0, "free": 2048, "total": 2048, "used": 0}}}, "changed": false}
```

YAML output:

```
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

The YAML callback pairs well with debug tasks that display complex variables:

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

With the YAML callback, the debug output is neatly indented:

```
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

The YAML callback handles diff mode nicely. When you run with `--diff`, file changes are displayed cleanly:

```bash
# Show diffs in YAML output format
ANSIBLE_STDOUT_CALLBACK=yaml ansible-playbook site.yml --diff --check
```

Output:

```
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

When working with URI or API modules, responses often contain deeply nested JSON. The YAML callback makes these manageable:

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

Without the YAML callback, that output would be an unreadable wall of text. With it, you get properly indented structure showing each node's conditions.

## Making YAML the Default

Many teams adopt the YAML callback as their standard. Here is a project-level `ansible.cfg` that sets it up with complementary options:

```ini
# ansible.cfg - YAML callback with optimal settings
[defaults]
stdout_callback = yaml
# Also display results in YAML format at all verbosity levels
callback_result_format = yaml
# Hide skipped tasks to reduce noise
display_skipped_hosts = False
# Show task timing
callback_whitelist = timer, profile_tasks

[callback_yaml]
# These are specific to the yaml callback
```

## YAML Callback vs Setting callback_result_format

There is a subtle difference between using the YAML stdout callback and setting `callback_result_format = yaml` with the default callback.

The `yaml` stdout callback replaces the entire output format. Task headers, play headers, and results are all formatted differently.

Setting `callback_result_format = yaml` on the default callback only changes how task results are displayed while keeping the standard task/play headers.

```ini
# Option 1: Full YAML callback (changes everything)
[defaults]
stdout_callback = yaml

# Option 2: Default callback with YAML-formatted results (changes just results)
[defaults]
stdout_callback = default
callback_result_format = yaml
```

For most people, option 2 is the better choice because you keep the familiar task headers and play recap while getting YAML-formatted results.

## Performance Considerations

The YAML callback has a minimal performance overhead. Converting result dictionaries to YAML adds microseconds per task, which is negligible compared to actual task execution time. The output is slightly larger in terms of bytes because of the whitespace, but this is only relevant if you are piping output to a file on a disk-constrained system.

## When Not to Use YAML

The YAML callback is for human consumption. If you need machine-parseable output, use the `json` callback instead. Parsing YAML output from a callback is fragile because the output includes ANSI color codes and non-YAML text like task headers.

For CI/CD pipelines where both humans and machines need the output, a practical approach is to use the YAML callback for stdout (so developers can read the logs) and the `json` callback as a secondary output written to a file using a notification callback or a wrapper script.

The YAML callback is one of those small quality-of-life improvements that makes working with Ansible noticeably more pleasant. Try it for a week and you will not want to go back to reading Python dictionaries.
