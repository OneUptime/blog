# How to Debug Ansible Roles with Verbose Output

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Debugging, Roles, Troubleshooting

Description: Learn how to use verbose output, debug tasks, and other techniques to troubleshoot and debug Ansible roles effectively.

---

When an Ansible role does not work as expected, the default output often does not tell you enough. You see a task failed, but not why. Variables are not what you expected, but you cannot see their actual values. Templates render incorrectly, but you have no visibility into the template context. This post covers every debugging technique available for Ansible roles, from simple verbosity flags to advanced callback plugins.

## Verbosity Levels

The most basic debugging tool is the `-v` flag. Ansible supports four levels of verbosity:

```bash
# Level 1: Show task results
ansible-playbook site.yml -v

# Level 2: Show task input parameters
ansible-playbook site.yml -vv

# Level 3: Show connection details and task execution info
ansible-playbook site.yml -vvv

# Level 4: Show everything including connection plugin internals
ansible-playbook site.yml -vvvv
```

Each level adds more information:

**-v** shows the result of each task. For command/shell tasks, this includes stdout and stderr. For template tasks, it shows the destination path and whether the file changed.

**-vv** shows the input parameters for each task. This is where you see what variables were resolved to. If a variable is not what you expected, this level reveals it.

**-vvv** adds connection-level details. You see the SSH commands being run, the temporary files being created, and the Python interpreter being used on the remote host. Useful for connection problems and privilege escalation issues.

**-vvvv** is the nuclear option. It shows the raw data being sent over the connection, including the module arguments and the module code itself. Rarely needed, but invaluable for module-level bugs.

## Using the debug Module

The `debug` module is your primary tool for inspecting variables and expressions at runtime. Add it directly to your role's tasks:

```yaml
# Add this to your role's tasks for troubleshooting
- name: Debug - show all role variables
  ansible.builtin.debug:
    msg: |
      app_name: {{ app_name }}
      app_port: {{ app_port }}
      app_user: {{ app_user }}
      app_version: {{ app_version | default('not set') }}

- name: Debug - show variable type and content
  ansible.builtin.debug:
    var: nginx_vhosts

- name: Debug - show a computed expression
  ansible.builtin.debug:
    msg: "Computed workers: {{ ansible_processor_vcpus * 2 }}"
```

The `var` parameter is useful for dumping complex data structures like lists and dictionaries:

```yaml
# Dump the entire contents of a variable
- name: Debug - inspect gathered facts
  ansible.builtin.debug:
    var: ansible_default_ipv4

# Show the result of a registered variable
- name: Run a command
  ansible.builtin.command: cat /etc/os-release
  register: os_release_output
  changed_when: false

- name: Debug - show command output
  ansible.builtin.debug:
    var: os_release_output
```

## Conditional Debug Output

You do not want debug tasks running in production. Use a variable to control them:

```yaml
# roles/myapp/defaults/main.yml
myapp_debug: false
```

```yaml
# roles/myapp/tasks/main.yml
- name: Debug - show configuration before applying
  ansible.builtin.debug:
    msg: |
      Configuration summary:
      - Port: {{ myapp_port }}
      - Workers: {{ myapp_workers }}
      - Database: {{ myapp_db_host }}:{{ myapp_db_port }}/{{ myapp_db_name }}
      - Log level: {{ myapp_log_level }}
  when: myapp_debug

- name: Deploy application configuration
  ansible.builtin.template:
    src: app.conf.j2
    dest: /etc/myapp/app.conf
  notify: restart myapp
```

Enable debugging only when you need it:

```bash
# Normal run - no debug output
ansible-playbook deploy.yml

# Debug run - show extra info
ansible-playbook deploy.yml -e "myapp_debug=true"
```

## Debugging Template Rendering

When a template produces unexpected output, you need to see what the template engine is doing. There are several approaches:

**Approach 1: Render the template to a debug file first**

```yaml
- name: Debug - render template to temp file for inspection
  ansible.builtin.template:
    src: myapp.conf.j2
    dest: /tmp/myapp.conf.debug
  when: myapp_debug

- name: Debug - show rendered template
  ansible.builtin.command: cat /tmp/myapp.conf.debug
  register: rendered_template
  when: myapp_debug
  changed_when: false

- name: Debug - display rendered template
  ansible.builtin.debug:
    var: rendered_template.stdout_lines
  when: myapp_debug
```

**Approach 2: Use the template module's output in check mode**

```bash
# Check mode shows what would change without making changes
ansible-playbook deploy.yml --check --diff -v
```

The `--diff` flag shows the difference between the current file and the rendered template. Combined with `-v`, this gives you full visibility into template output.

**Approach 3: Debug Jinja2 expressions locally**

```bash
# Test Jinja2 expressions without running a full playbook
ansible localhost -m debug -a "msg={{ '{{ 4 * 2 }}' }}"

# Test with inventory variables
ansible webserver01 -m debug -a "var=ansible_default_ipv4.address"
```

## Using the assert Module for Validation

Add assertions to your role to catch configuration errors early:

```yaml
# roles/myapp/tasks/validate.yml
# Validate inputs before doing anything
- name: Validate required variables are set
  ansible.builtin.assert:
    that:
      - app_name is defined
      - app_name | length > 0
      - app_port | int > 0
      - app_port | int < 65536
      - app_user is defined
    fail_msg: "Required variable missing or invalid. Check app_name, app_port, and app_user."
    success_msg: "All required variables are properly set."

- name: Validate database connectivity parameters
  ansible.builtin.assert:
    that:
      - app_db_host is defined
      - app_db_port | int > 0
      - app_db_name is defined
    fail_msg: "Database configuration is incomplete."
  when: app_db_host is defined
```

Put validation at the beginning of your role's tasks:

```yaml
# roles/myapp/tasks/main.yml
- name: Validate configuration
  ansible.builtin.include_tasks: validate.yml

- name: Install application
  ansible.builtin.include_tasks: install.yml
# ... rest of the role
```

## Step-by-Step Execution

Run a playbook one task at a time using `--step`:

```bash
# Ansible will ask before each task whether to run it
ansible-playbook deploy.yml --step
```

Or start from a specific task using `--start-at-task`:

```bash
# Skip to a specific task
ansible-playbook deploy.yml --start-at-task="Deploy application configuration"
```

## Using Tags for Selective Debugging

Tag your debug tasks so you can run only them:

```yaml
# roles/myapp/tasks/main.yml
- name: Debug - show all resolved variables
  ansible.builtin.debug:
    msg: |
      Resolved configuration:
      {{ hostvars[inventory_hostname] | to_nice_yaml }}
  tags: [debug, never]
```

The `never` tag ensures debug tasks do not run unless explicitly requested:

```bash
# Only run tasks tagged with 'debug'
ansible-playbook deploy.yml --tags debug
```

## Checking Role Variable Precedence

When variables are not what you expect, precedence is usually the culprit. Dump the variable from multiple sources:

```yaml
- name: Debug - show variable sources
  ansible.builtin.debug:
    msg: |
      From defaults: {{ role_defaults.myvar | default('not in defaults') }}
      From vars: {{ role_vars.myvar | default('not in vars') }}
      Effective value: {{ myvar }}
      Variable type: {{ myvar | type_debug }}
```

## Using the ANSIBLE_KEEP_REMOTE_FILES Setting

For deep debugging of module execution on remote hosts:

```bash
# Keep the temporary files Ansible creates on remote hosts
ANSIBLE_KEEP_REMOTE_FILES=1 ansible-playbook deploy.yml -vvv
```

After the playbook runs, you can SSH into the remote host and inspect the module code and arguments in the `~/.ansible/tmp/` directory. This is useful when you suspect a module is not receiving the right input.

## Callback Plugins for Better Output

Ansible supports different output formats via callback plugins:

```bash
# Use the yaml callback for more readable output
ANSIBLE_STDOUT_CALLBACK=yaml ansible-playbook deploy.yml -v

# Use the debug callback for detailed failure info
ANSIBLE_STDOUT_CALLBACK=debug ansible-playbook deploy.yml

# Profile task timing to find slow tasks
ANSIBLE_CALLBACKS_ENABLED=timer,profile_tasks ansible-playbook deploy.yml
```

Set these in `ansible.cfg` for permanent use:

```ini
# ansible.cfg
[defaults]
stdout_callback = yaml
callbacks_enabled = timer, profile_tasks

[callback_profile_tasks]
task_output_limit = 20
sort_order = descending
```

## The Debugging Workflow

When a role is not working:

1. Run with `-v` to see task results
2. If variables look wrong, run with `-vv` to see resolved parameters
3. Add `debug` tasks to inspect specific variables
4. If a template is wrong, use `--check --diff` to see the rendered output
5. If a module behaves unexpectedly, run with `-vvv` to see raw module input
6. If all else fails, use `ANSIBLE_KEEP_REMOTE_FILES=1` and inspect on the target

Remove all debug tasks before merging to your main branch. Or better yet, keep them gated behind a debug variable that defaults to false, so they are always available when needed but never clutter the normal output.
