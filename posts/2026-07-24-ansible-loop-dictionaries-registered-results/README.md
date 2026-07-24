# Looping Over Dictionaries and Registered Results in Ansible

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ansible, Playbooks, Loops, Variables, Jinja2, Automation

Description: Write readable Ansible loops over dictionaries, nested data, and registered results without losing track of each item.

---

Ansible loops are simple when the input is a list of strings. They become confusing when an item is a dictionary, a task registers one result per iteration, and the next task loops over those results. Then expressions such as `item.value`, `item.item`, and `result.results` begin to pile up.

The way out is to name data at every boundary:

- Transform dictionaries into explicit items.
- Give complex loop variables meaningful names.
- Remember that a looped task registers a list under `results`.
- Normalize registered output before another task consumes it.

## Start with the Result Shape

A normal registered task returns one result dictionary:

```yaml
- name: Read the API version
  ansible.builtin.command:
    argv:
      - /usr/local/bin/contoso-api
      - version
  register: api_version_result
  changed_when: false
```

Useful fields can include:

```yaml
api_version_result:
  rc: 0
  stdout: "2.8.1"
  stderr: ""
  changed: false
  failed: false
```

A task with `loop` returns an overall result whose `results` key is a list:

```yaml
- name: Check service versions
  ansible.builtin.command:
    argv:
      - /usr/local/bin/service-version
      - "{{ item }}"
  loop:
    - api
    - worker
  register: service_version_results
  changed_when: false
```

Conceptually:

```yaml
service_version_results:
  changed: false
  failed: false
  results:
    - item: api
      rc: 0
      stdout: "2.8.1"
    - item: worker
      rc: 0
      stdout: "1.9.0"
```

The exact keys depend on the module and outcome. A skipped item has skip information; a command result has `rc`, `stdout`, and `stderr`; another module has its own return values.

Inspect a nonsecret result while developing:

```yaml
- name: Inspect the loop result
  ansible.builtin.debug:
    var: service_version_results
```

Remove noisy debug output after the result contract is understood.

## Loop Over a List of Dictionaries

Use a list of dictionaries when order matters or each entry is naturally one object:

```yaml
application_users:
  - name: api
    uid: 2101
    groups:
      - app
      - observability
  - name: worker
    uid: 2102
    groups:
      - app
```

Give the item a useful name:

```yaml
- name: Create application users
  ansible.builtin.user:
    name: "{{ application_user.name }}"
    uid: "{{ application_user.uid }}"
    groups: "{{ application_user.groups }}"
    append: true
    state: present
  loop: "{{ application_users }}"
  loop_control:
    loop_var: application_user
    label: "{{ application_user.name }}"
```

`loop_var` replaces the generic `item` inside the task. `label` keeps console output focused on the user name instead of printing the entire dictionary.

`label` is not a secrecy control. The full object still exists in memory and can appear in verbose logs or failures. Use `no_log: true` when an item contains a secret, and redesign data so secrets are not mixed into ordinary loop objects when possible.

## Convert a Dictionary with dict2items

A dictionary is useful when each key is a unique object name:

```yaml
applications:
  api:
    port: 8443
    enabled: true
  worker:
    port: 9090
    enabled: false
```

Convert it to a list:

```yaml
- name: Show enabled application ports
  ansible.builtin.debug:
    msg: "{{ application.key }} listens on {{ application.value.port }}"
  loop: "{{ applications | dict2items }}"
  loop_control:
    loop_var: application
    label: "{{ application.key }}"
  when: application.value.enabled | bool
```

Each transformed entry is:

```yaml
key: api
value:
  port: 8443
  enabled: true
```

That is why the access path is `application.key` and `application.value.port`.

Rename the generated fields when they deserve domain names:

```yaml
- name: Render application configurations
  ansible.builtin.template:
    src: application.yml.j2
    dest: "/etc/contoso/{{ application.name }}.yml"
    owner: root
    group: root
    mode: "0644"
  loop: >-
    {{
      applications
      | dict2items(key_name='name', value_name='settings')
    }}
  loop_control:
    loop_var: application
    label: "{{ application.name }}"
  when: application.settings.enabled | bool
```

Now the template receives `application.name` and `application.settings`, which is much clearer than nested generic `item` expressions.

Dictionary iteration order follows the data supplied, but relying on incidental order makes intent unclear. When task order matters, model the input as an ordered list or sort it explicitly:

```yaml
loop: "{{ applications | dict2items | sort(attribute='key') }}"
```

## Register a Loop with a Named loop_var

Probe each application:

```yaml
- name: Check application status
  ansible.builtin.command:
    argv:
      - /usr/local/bin/application-status
      - "{{ application.name }}"
  loop: >-
    {{
      applications
      | dict2items(key_name='name', value_name='settings')
    }}
  loop_control:
    loop_var: application
    label: "{{ application.name }}"
  register: application_probe_results
  changed_when: false
  failed_when: false
```

Because the loop variable is named `application`, each entry under `application_probe_results.results` preserves an `application` field instead of an `item` field. A later task can say:

```yaml
- name: Report unavailable applications
  ansible.builtin.debug:
    msg: >-
      {{ probe.application.name }} is unavailable:
      rc={{ probe.rc }}, stderr={{ probe.stderr | default('') }}
  loop: "{{ application_probe_results.results }}"
  loop_control:
    loop_var: probe
    label: "{{ probe.application.name }}"
  when: probe.rc | default(1) != 0
```

This avoids the notorious `item.item` shape. The outer loop variable is `probe`, and the original inner loop object is `probe.application`.

The example uses `failed_when: false` only to collect every status for a reporting workflow. For a task that must enforce health, define the accepted return codes instead of suppressing all failures:

```yaml
failed_when: application_probe_results.rc not in [0, 3]
```

Use the register variable name from the current task in `failed_when`, even inside the loop. After the loop finishes, that variable contains the overall `results` list.

## Handle Skipped and Failed Entries Safely

Do not assume every registered entry has `rc` or `stdout`. A skipped iteration might look different.

Guard attributes:

```yaml
- name: Report successful probes
  ansible.builtin.debug:
    msg: >-
      {{ probe.application.name }} returned
      {{ probe.stdout | default('no output') }}
  loop: "{{ application_probe_results.results }}"
  loop_control:
    loop_var: probe
    label: "{{ probe.application.name }}"
  when:
    - probe.rc is defined
    - probe.rc == 0
```

`default` prevents an undefined-value error, but it should not conceal a required field. If every non-skipped result must contain `rc`, assert that contract.

The top-level `changed`, `failed`, and `skipped` summarize the loop:

- `changed` is true when at least one iteration changed.
- `failed` is true when at least one iteration failed.
- `skipped` is true only when all iterations were skipped.

Inspect individual entries to identify which item caused the aggregate state.

## Normalize Results Before Reusing Them

If several later tasks need only successful application names, derive that list once:

```yaml
- name: Build the list of healthy applications
  ansible.builtin.set_fact:
    healthy_applications: >-
      {{
        application_probe_results.results
        | selectattr('rc', 'defined')
        | selectattr('rc', 'equalto', 0)
        | map(attribute='application.name')
        | list
      }}
```

Later tasks consume a simple list:

```yaml
- name: Announce healthy applications
  ansible.builtin.debug:
    msg: "{{ application_name }} passed its status check"
  loop: "{{ healthy_applications }}"
  loop_control:
    loop_var: application_name
```

This is easier to review than repeating a long filter chain and nested result path in every task.

Use `set_fact` thoughtfully. It creates a high-precedence host variable for the current run. If the normalized data is needed only once, place the expression directly in that task or use a task-local variable.

## A Common stat Pattern Without item.item

Check several paths:

```yaml
- name: Inspect required paths
  ansible.builtin.stat:
    path: "{{ required_path }}"
  loop:
    - /etc/contoso/api.yml
    - /etc/contoso/worker.yml
  loop_control:
    loop_var: required_path
    label: "{{ required_path }}"
  register: required_path_results
```

Fail for a missing path:

```yaml
- name: Require every path
  ansible.builtin.assert:
    that:
      - path_result.stat.exists
      - path_result.stat.isreg
    fail_msg: "{{ path_result.required_path }} is missing or not a file"
  loop: "{{ required_path_results.results }}"
  loop_control:
    loop_var: path_result
    label: "{{ path_result.required_path }}"
```

The original value is `path_result.required_path` because that was the first task's `loop_var`. With default `item`, it would be `path_result.item`, which is valid but less descriptive.

## Retry Each Item with until

`until`, `retries`, and `delay` apply to each loop item. Probe endpoints:

```yaml
service_endpoints:
  - name: api
    url: https://api.example.com/healthz
  - name: worker
    url: https://worker.example.com/healthz
```

```yaml
- name: Wait for each service endpoint
  ansible.builtin.uri:
    url: "{{ endpoint.url }}"
    method: GET
    status_code: 200
    return_content: false
  loop: "{{ service_endpoints }}"
  loop_control:
    loop_var: endpoint
    label: "{{ endpoint.name }}"
  register: endpoint_probe
  until: endpoint_probe.status == 200
  retries: 5
  delay: 5
```

During an iteration, `endpoint_probe` is the current attempt's result, so `until` can inspect its status. After the task, `endpoint_probe.results` contains the final result for each endpoint, including retry information such as the number of attempts where supported.

Retries are appropriate for an eventually ready service. They do not fix a permanent authentication error, invalid URL, or missing route. Keep a bounded timeout and useful failure message.

## Use query When a Lookup Must Return a List

`loop` expects a list. The `query` function always returns a list, while `lookup` returns a comma-separated string by default unless configured with `wantlist=True`.

Loop over inventory hosts:

```yaml
- name: Show application hosts
  ansible.builtin.debug:
    msg: "{{ application_host }}"
  loop: "{{ query('inventory_hostnames', 'api:&production') }}"
  loop_control:
    loop_var: application_host
```

For a direct variable that is already a list, use it directly. Do not wrap every list in a lookup.

## Avoid Variable Collisions in Nested Loops

An outer and inner loop both using `item` overwrite one another. Ansible detects this conflict and warns.

When including a task file:

```yaml
- name: Configure each application
  ansible.builtin.include_tasks: configure-application.yml
  loop: "{{ applications | dict2items }}"
  loop_control:
    loop_var: outer_application
    label: "{{ outer_application.key }}"
```

Inside `configure-application.yml`:

```yaml
- name: Configure each listener
  ansible.builtin.template:
    src: listener.yml.j2
    dest: >-
      /etc/contoso/{{ outer_application.key }}-{{ listener.name }}.yml
    mode: "0644"
  loop: "{{ outer_application.value.listeners }}"
  loop_control:
    loop_var: listener
    label: "{{ listener.name }}"
```

Blocks themselves do not accept `loop`. Put the block in an included task file and loop over `ansible.builtin.include_tasks`.

For Cartesian products, use the `product` filter when it makes the relationship clear:

```yaml
- name: Display application and region pairs
  ansible.builtin.debug:
    msg: "{{ pair.0 }} in {{ pair.1 }}"
  loop: "{{ application_names | product(regions) | list }}"
  loop_control:
    loop_var: pair
```

Large products grow quickly. Validate list sizes before creating thousands of iterations.

## Add Index and Progress Information

Use `index_var` when the position is needed:

```yaml
- name: Render ordered upstreams
  ansible.builtin.template:
    src: upstream.yml.j2
    dest: "/etc/contoso/upstream-{{ upstream_index }}.yml"
    mode: "0644"
  loop: "{{ upstreams }}"
  loop_control:
    loop_var: upstream
    index_var: upstream_index
    label: "{{ upstream.name }}"
```

The index starts at zero. Extended loop information can expose fields such as first, last, index, previous, and next items:

```yaml
loop_control:
  extended: true
```

Enable it only when the task needs that context. Extended metadata can increase controller memory and serialized output, especially when every result references the complete input list. Current Ansible versions provide `extended_allitems` control when the full list is unnecessary.

## Migrate with_X Carefully

Ansible recommends `loop` for most new playbooks, but older `with_<lookup>` forms remain valid.

One behavior differs: `with_items` performs a single level of implicit flattening, while `loop` does not. A direct migration might require:

```yaml
loop: "{{ nested_items | flatten(levels=1) }}"
```

Do not mechanically replace syntax without inspecting the resulting data shape. Use `dict2items`, `subelements`, `product`, `zip`, or `flatten` according to the original lookup's semantics.

## Keep Loops Idempotent

A loop does not make an arbitrary command idempotent. This:

```yaml
- name: Append application names
  ansible.builtin.shell: "echo {{ application | quote }} >> /etc/apps"
  loop: "{{ application_names }}"
  loop_control:
    loop_var: application
```

adds duplicates on every run.

Describe the complete file:

```yaml
- name: Render the application list
  ansible.builtin.template:
    src: apps.j2
    dest: /etc/apps
    owner: root
    group: root
    mode: "0644"
```

and in `apps.j2`:

```jinja2
{% for application in application_names %}
{{ application }}
{% endfor %}
```

The loop belongs in a template where it produces one desired artifact.

## A Readability Checklist

- Use a list of dictionaries for ordered objects.
- Use `dict2items` for keyed mappings.
- Rename `key` and `value` when domain names are clearer.
- Set `loop_var` for every complex or nested loop.
- Use `label` to reduce noise, not to hide secrets.
- Remember that registered loop output lives under `results`.
- Guard module-specific fields on skipped entries.
- Normalize complex results before repeated reuse.
- Use `query` when a lookup must return a list.
- Give nested loops different variable names.
- Use bounded `until` retries for transient readiness.
- Prefer modules and complete desired state over repeated shell commands.

The important shift is to stop treating `item` as a universal anonymous container. Name the current domain object, name the result, and make the transition between them explicit.

## Official Documentation

- [Loops](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_loops.html)
- [Using variables and registered results](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html)
- [Filters for transforming data](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_filters.html)
- [Return values](https://docs.ansible.com/projects/ansible/latest/reference_appendices/common_return_values.html)
- [Conditionals with registered variables](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html)
