# Why Your Ansible Handler Did Not Run—and How Handler Timing Really Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Automation, Handlers, Playbooks, Troubleshooting

Description: Diagnose skipped Ansible handlers by understanding change notifications, execution boundaries, failures, names, and flush timing.

---

Ansible handlers are deferred tasks. A normal task notifies a handler only when it reports `changed`, and Ansible schedules that handler for a later boundary. This avoids restarting a service after every configuration fragment and coalesces repeated notifications into one action.

That optimization also explains most “handler did not run” incidents. The handler was never notified, its notification name did not resolve, a failure suppressed it for that host, or it was waiting for a boundary that had not yet been reached.

## Start with the Core Contract

```yaml
- name: Install the application configuration
  ansible.builtin.template:
    src: app.conf.j2
    dest: /etc/myapp/app.conf
    owner: root
    group: root
    mode: "0644"
  notify: Restart myapp

handlers:
  - name: Restart myapp
    ansible.builtin.service:
      name: myapp
      state: restarted
```

The notification occurs only if `template` reports a change. If the rendered file already matches the destination, the task is `ok` and the handler correctly remains idle.

Run with enough verbosity to see the task result:

```bash
ansible-playbook -i inventory site.yml -vv
```

Do not force `changed_when: true` merely to make the handler fire. That creates needless disruption on every run. If you need an unconditional action, make it a normal task or call the underlying module directly.

## Notifications Are Deferred and Deduplicated

Several tasks can notify the same handler:

```yaml
- name: Install main configuration
  ansible.builtin.template:
    src: app.conf.j2
    dest: /etc/myapp/app.conf
    mode: "0644"
  notify: Restart myapp

- name: Install logging configuration
  ansible.builtin.template:
    src: logging.conf.j2
    dest: /etc/myapp/logging.conf
    mode: "0644"
  notify: Restart myapp
```

If both change, `Restart myapp` still runs once for that host at the next handler boundary. Handlers execute in the order they are defined, not the order in which tasks notify them.

Ansible automatically inserts handler execution after these sections:

1. `pre_tasks`
2. the combined `roles` and `tasks` section
3. `post_tasks`

This means a handler notified in `pre_tasks` can run before roles begin, while a handler notified in the main task body normally waits until that body completes.

## Flush When Later Tasks Need the New State

Sometimes a later task depends on a restart:

```yaml
- name: Install listener configuration
  ansible.builtin.template:
    src: listener.conf.j2
    dest: /etc/myapp/listener.conf
    mode: "0644"
  notify: Restart myapp

- name: Apply pending handlers before verification
  ansible.builtin.meta: flush_handlers

- name: Verify the new listener
  ansible.builtin.uri:
    url: http://127.0.0.1:8080/health
    status_code: 200
```

`flush_handlers` runs all handlers notified so far. It is not a direct call to one named handler. Use it at a real synchronization point rather than after every template, or you lose deduplication and may restart a service repeatedly.

## A Later Failure Can Suppress the Handler

By default, if a task fails on a host after a handler was notified, the notified handler does not run on that host:

```yaml
- name: Update configuration
  ansible.builtin.template:
    src: app.conf.j2
    dest: /etc/myapp/app.conf
    mode: "0644"
  notify: Restart myapp

- name: Run a migration
  ansible.builtin.command:
    cmd: /opt/myapp/bin/migrate
```

If the migration fails, the configuration may be updated while the restart remains pending. Ansible supports forced handlers:

```yaml
- name: Deploy the application
  hosts: app
  force_handlers: true
  tasks:
    # deployment tasks
```

Equivalent controls include `--force-handlers` and the `force_handlers` configuration option. Forced handlers still cannot overcome every condition. For example, an unreachable host cannot execute a handler.

Choose this behavior deliberately. A forced restart may make a safe configuration active after an unrelated failure, but it can also activate a configuration that depended on a migration that did not complete.

For block-based recovery, flush pending handlers in `rescue` when that is part of the recovery design:

```yaml
- name: Update with controlled recovery
  block:
    - name: Render configuration
      ansible.builtin.template:
        src: app.conf.j2
        dest: /etc/myapp/app.conf
        mode: "0644"
      notify: Restart myapp

    - name: Validate the deployment
      ansible.builtin.command:
        cmd: /opt/myapp/bin/validate
      changed_when: false

  rescue:
    - name: Run handlers needed to restore consistency
      ansible.builtin.meta: flush_handlers
```

## Match Names Exactly or Use Listen Topics

`notify` usually references a handler's `name`. A typo or shadowed name can lead to confusing behavior. Handler names share one global scope within a play, including handlers loaded from roles. If multiple handlers use the same name, the last inserted definition can shadow an earlier one.

Use unique names, often prefixed by the role:

```yaml
handlers:
  - name: myapp | Restart service
    ansible.builtin.service:
      name: myapp
      state: restarted
```

For several handlers that should react to one event, use a topic:

```yaml
- name: Update proxy configuration
  ansible.builtin.template:
    src: proxy.conf.j2
    dest: /etc/proxy/proxy.conf
    mode: "0644"
  notify: Proxy configuration changed

handlers:
  - name: Validate proxy configuration
    ansible.builtin.command:
      cmd: /usr/sbin/proxy --check-config
    changed_when: false
    listen: Proxy configuration changed

  - name: Reload proxy
    ansible.builtin.service:
      name: proxy
      state: reloaded
    listen: Proxy configuration changed
```

The topic is not itself a handler name requirement. Every handler listening on it is notified, and definition order determines execution.

## Loops Notify Once for the Task

When a looping task changes any item, it notifies all listed handlers:

```yaml
- name: Install virtual host configurations
  ansible.builtin.template:
    src: vhost.conf.j2
    dest: "/etc/proxy/conf.d/{{ item.name }}.conf"
    mode: "0644"
  loop: "{{ proxy_vhosts }}"
  notify: Reload proxy
```

Handlers are not selected per changed item. If one item changes, the handler is queued. Keep the handler safe for the aggregate result.

## Includes and Imports Affect Availability

Handlers from roles and included files enter the play's handler scope according to Ansible's insertion rules. Static imports are processed when the play is parsed, while dynamic includes are processed at runtime. A handler inside a dynamic include is not available before that include has executed.

For predictable behavior:

- define public role handlers in `roles/<role>/handlers/main.yml`
- give every handler a unique name
- notify a stable `listen` topic when several roles participate in one event
- avoid hiding essential handlers behind a conditional include that may not execute

Also remember that notifying a dynamic include as a handler does not run every task inside it in the same way as notifying individual imported handlers. Consult the handler documentation when mixing includes, imports, and notifications.

## Check Custom Change Conditions

Many apparent handler problems are actually incorrect task status:

```yaml
- name: Import application settings
  ansible.builtin.command:
    cmd: /opt/myapp/bin/config import /etc/myapp/settings.yml
  register: config_import
  changed_when: "'updated' in config_import.stdout"
  notify: Restart myapp
```

If the tool writes “Updated” with different case, prints to stderr, or changes output in a new release, the task may report `ok` after a real mutation. Prefer a state-aware module, structured output, or an explicit before-and-after query.

Conversely, a command that always reports changed will restart the service on every run unless `changed_when` reflects reality.

## A Focused Troubleshooting Sequence

When a handler is missing, check in this order:

1. Did the notifying task run on this host?
2. Did it report `changed`, not `ok`, `skipped`, `failed`, or `unreachable`?
3. Does `notify` exactly match a handler name or `listen` topic?
4. Was the handler loaded before the notification?
5. Has the relevant automatic boundary been reached?
6. Did a later task fail on the same host?
7. Would `force_handlers` or a deliberate `flush_handlers` match the desired recovery semantics?
8. Is another handler using the same name?

Handlers are reliable once treated as a queued, per-host consequence of a reported change. Most fixes belong in change detection, naming, or synchronization design, not in forcing every task to appear changed.

## Official Documentation

- [Handlers: running operations on change](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html)
- [Error handling and forced handlers](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html)
- [Blocks and flushing handlers during rescue](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_blocks.html)
- [ansible.builtin.meta module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/meta_module.html)

