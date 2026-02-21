# How to Use YAML Folded Strings in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, YAML, Strings, Formatting, DevOps

Description: Learn when and how to use YAML folded strings in Ansible playbooks for readable long lines, conditions, and string values.

---

Folded strings (indicated by `>`) are one of YAML's most useful features for Ansible playbooks. They let you write long strings across multiple lines in your YAML file while collapsing them into a single line at runtime. This makes playbooks more readable without changing the behavior of your automation.

## How Folded Strings Work

The `>` indicator replaces single newlines with spaces. Consecutive non-empty lines become one line. Empty lines create paragraph breaks.

```yaml
# This folded string
example: >
  This is line one
  and line two
  and line three

# Becomes this at runtime:
# "This is line one and line two and line three\n"
```

The trailing newline is included by default. Use `>-` to strip it.

## Folded Strings for Long Commands

```yaml
# Without folded string - hard to read
- name: Run long command
  ansible.builtin.command: aws s3 sync /local/path s3://my-bucket/prefix --delete --exclude "*.tmp" --include "*.dat" --region us-east-1

# With folded string - much more readable
- name: Run long command
  ansible.builtin.command: >-
    aws s3 sync /local/path s3://my-bucket/prefix
    --delete
    --exclude "*.tmp"
    --include "*.dat"
    --region us-east-1
```

Both produce the same single-line command at runtime.

## Folded Strings for When Conditions

```yaml
# Long condition on one line - hard to read
- name: Apply config
  ansible.builtin.template:
    src: app.conf.j2
    dest: /etc/app/app.conf
  when: deploy_environment == 'production' and app_version is version('2.0', '>=') and feature_flag_enabled

# With folded string - readable
- name: Apply config
  ansible.builtin.template:
    src: app.conf.j2
    dest: /etc/app/app.conf
  when: >-
    deploy_environment == 'production'
    and app_version is version('2.0', '>=')
    and feature_flag_enabled
```

## Folded Strings for Messages

```yaml
# Use folded strings for long debug messages
- name: Display deployment summary
  ansible.builtin.debug:
    msg: >-
      Deployment of {{ app_name }} version {{ app_version }}
      to {{ deploy_environment }} completed successfully.
      The application is running on port {{ app_port }}
      with {{ app_replicas }} replicas.
```

## Paragraphs with Folded Strings

Empty lines within a folded string create paragraph breaks:

```yaml
# Folded string with paragraphs
description: >
  This is the first paragraph about the deployment
  process and what it configures on the server.

  This is the second paragraph that covers the
  verification steps and health checks.

  This is the third paragraph about rollback
  procedures in case of failure.
```

Result:
```
This is the first paragraph about the deployment process and what it configures on the server.
This is the second paragraph that covers the verification steps and health checks.
This is the third paragraph about rollback procedures in case of failure.
```

## Chomping Modifiers

```yaml
# Default folding (clip) - one trailing newline
clip: >
  content here

# Strip (-) - no trailing newline
strip: >-
  content here

# Keep (+) - all trailing newlines preserved
keep: >+
  content here


```

For `when` conditions and command arguments, always use `>-` (fold and strip) to avoid a trailing newline that could cause issues.

## Folded vs Literal: When to Use Each

```yaml
# Use FOLDED (>) for:
# - Long single-line commands
# - Conditions split across lines
# - Long descriptions and messages
long_command: >-
  docker run --rm
  -v /data:/data
  -e KEY=value
  myimage:latest

# Use LITERAL (|) for:
# - Scripts where newlines matter
# - Configuration file content
# - Any text where line breaks are significant
script_content: |
  #!/bin/bash
  echo "line 1"
  echo "line 2"
```

## Common Pitfalls

```yaml
# Pitfall 1: Forgetting >- causes trailing newline in commands
# This adds a newline at the end which some tools do not like
bad_cmd: >
  some command --flag

# Good: use >- to strip the trailing newline
good_cmd: >-
  some command --flag

# Pitfall 2: Extra indentation is preserved
example: >
  normal line
    this line has extra leading spaces preserved
  back to normal
```

## Practical Template with Folded Strings

```yaml
# Complete playbook using folded strings effectively
- name: Deploy and verify application
  hosts: appservers
  tasks:
    - name: Pull latest container image
      ansible.builtin.command: >-
        docker pull
        {{ registry }}/{{ app_name }}:{{ app_version }}

    - name: Start application container
      ansible.builtin.command: >-
        docker run -d
        --name {{ app_name }}
        --restart unless-stopped
        -p {{ app_port }}:8080
        -e DATABASE_URL={{ db_url }}
        -e LOG_LEVEL={{ log_level }}
        {{ registry }}/{{ app_name }}:{{ app_version }}

    - name: Verify deployment
      ansible.builtin.debug:
        msg: >-
          Successfully deployed {{ app_name }}
          version {{ app_version }}
          on {{ inventory_hostname }}
```

## Conclusion

Folded strings are the right choice when you need readability in your YAML without changing the runtime value. Use `>-` for commands and conditions where trailing newlines cause problems. Use `>` for descriptions and messages where trailing newlines are harmless. The key rule is simple: if your string should be one line at runtime but is hard to read as one line in YAML, use a folded string.
