# How to Use ansible-navigator to View Documentation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, ansible-navigator, Documentation, DevOps

Description: Access Ansible module documentation, collection docs, and plugin references directly through ansible-navigator without leaving your terminal.

---

One of the underappreciated features of ansible-navigator is its built-in documentation browser. Instead of switching to a web browser to look up module parameters, you can view documentation right in your terminal. Better yet, the documentation comes from the actual Execution Environment you are using, so it always matches the versions of modules and collections available to your playbooks.

## Why Use ansible-navigator for Documentation

When you run `ansible-doc` on your local machine, it shows documentation for whatever version of Ansible and collections happen to be installed locally. If your playbooks run inside an Execution Environment with different versions, the documentation might not match.

ansible-navigator solves this by running `ansible-doc` inside the EE container. The documentation you see is guaranteed to match what is available when your playbook runs.

## Viewing Module Documentation

The basic command to view module documentation:

```bash
# View documentation for a specific module
ansible-navigator doc ansible.builtin.copy

# View documentation for a community module
ansible-navigator doc community.general.json_query

# View documentation for a collection module
ansible-navigator doc ansible.posix.mount
```

This opens the documentation in the interactive TUI, where you can scroll through parameters, examples, and return values.

## Using stdout Mode for Quick Lookups

If you just want the documentation printed to your terminal without the TUI:

```bash
# Print documentation to stdout
ansible-navigator doc ansible.builtin.copy --mode stdout

# Same for other modules
ansible-navigator doc ansible.builtin.template --mode stdout
ansible-navigator doc ansible.builtin.service --mode stdout
```

This works exactly like `ansible-doc` but runs inside your EE.

## Viewing Documentation from a Specific EE

Specify the EE image to see documentation for the versions in that image:

```bash
# View docs from your production EE
ansible-navigator doc amazon.aws.ec2_instance \
  --execution-environment-image quay.io/myorg/ee-aws:2.1.0

# View docs from a different EE
ansible-navigator doc community.docker.docker_container \
  --execution-environment-image quay.io/myorg/ee-docker:1.0.0
```

## Browsing All Available Modules

You can list all modules available in an EE:

```bash
# List all modules (interactive mode)
ansible-navigator doc --list

# List all modules in stdout mode
ansible-navigator doc --list --mode stdout

# List modules from a specific collection
ansible-navigator doc --list --mode stdout 2>/dev/null | grep "ansible.builtin"

# List modules from community.general
ansible-navigator doc --list --mode stdout 2>/dev/null | grep "community.general"
```

In the interactive TUI, the module list is browsable. You can scroll through and select any module to view its full documentation.

## Viewing Plugin Documentation

ansible-navigator can show documentation for all plugin types, not just modules:

```bash
# View filter plugin documentation
ansible-navigator doc --type filter ansible.builtin.combine --mode stdout

# View lookup plugin documentation
ansible-navigator doc --type lookup ansible.builtin.file --mode stdout

# View callback plugin documentation
ansible-navigator doc --type callback ansible.builtin.default --mode stdout

# View connection plugin documentation
ansible-navigator doc --type connection ansible.builtin.ssh --mode stdout

# View inventory plugin documentation
ansible-navigator doc --type inventory ansible.builtin.yaml --mode stdout

# View strategy plugin documentation
ansible-navigator doc --type strategy ansible.builtin.linear --mode stdout
```

## Viewing Return Values

Module return values are included in the documentation. This is crucial when you need to register output and use it in subsequent tasks.

```bash
# View return values for the command module
ansible-navigator doc ansible.builtin.command --mode stdout
```

The output includes a "Return Values" section that tells you exactly what fields are available when you register the result:

```yaml
---
# Example showing how return values documentation helps
- name: Run a command
  ansible.builtin.command: whoami
  register: result

# The doc tells you 'result' has these fields:
# result.stdout - The command's standard output
# result.stderr - The command's standard error
# result.rc     - The command's return code
# result.cmd    - The actual command executed

- name: Use the documented return values
  ansible.builtin.debug:
    msg: "Command '{{ result.cmd }}' returned '{{ result.stdout }}' with rc={{ result.rc }}"
```

## Viewing Examples

Every well-documented module includes usage examples. These are particularly useful when you are using a module for the first time.

```bash
# View the file module documentation with examples
ansible-navigator doc ansible.builtin.file --mode stdout
```

The examples section shows real playbook snippets:

```yaml
# Examples from ansible.builtin.file documentation
- name: Create a directory
  ansible.builtin.file:
    path: /etc/some_directory
    state: directory
    mode: '0755'

- name: Create a symbolic link
  ansible.builtin.file:
    src: /file/to/link/to
    dest: /path/to/symlink
    owner: foo
    group: foo
    state: link

- name: Touch a file
  ansible.builtin.file:
    path: /etc/foo.conf
    state: touch
    mode: u+rw,g-wx,o-rwx
```

## Using the Interactive Documentation Browser

The interactive TUI for documentation has some nice navigation features:

```bash
# Open the documentation browser
ansible-navigator doc --list
```

Once in the TUI:

```
# Type a number to select a module from the list
# Use arrow keys or j/k to scroll
# Press / to search
# Press :back or Esc to go back
# Press :quit to exit
```

You can also jump directly to a module:

```bash
# Open the interactive doc viewer for a specific module
ansible-navigator doc ansible.builtin.uri
```

In the interactive view, you get color-coded output with clear sections for synopsis, parameters, notes, examples, and return values.

## Creating a Documentation Lookup Script

For frequent lookups, create a helper script:

```bash
#!/bin/bash
# adoc - Quick module documentation lookup
# Usage: adoc copy (looks up ansible.builtin.copy)
# Usage: adoc community.general.json_query

MODULE="$1"

# If no dots, assume ansible.builtin
if [[ "$MODULE" != *.* ]]; then
  MODULE="ansible.builtin.$MODULE"
fi

ansible-navigator doc "$MODULE" --mode stdout
```

Save it and make it executable:

```bash
chmod +x adoc

# Quick lookups
./adoc copy
./adoc template
./adoc community.general.json_query
```

## Comparing Documentation Across EE Versions

When upgrading EEs, compare module documentation to find breaking changes:

```bash
# Get docs from old EE
ansible-navigator doc amazon.aws.ec2_instance \
  --execution-environment-image quay.io/myorg/ee-aws:1.0.0 \
  --mode stdout > /tmp/ec2-old.txt

# Get docs from new EE
ansible-navigator doc amazon.aws.ec2_instance \
  --execution-environment-image quay.io/myorg/ee-aws:2.0.0 \
  --mode stdout > /tmp/ec2-new.txt

# Compare the documentation
diff /tmp/ec2-old.txt /tmp/ec2-new.txt
```

## Viewing Collection Documentation

Beyond individual modules, you can get information about entire collections:

```bash
# List all modules in a collection
ansible-navigator doc --list --mode stdout 2>/dev/null | grep "amazon.aws"

# Check collection version
ansible-navigator exec -- ansible-galaxy collection list amazon.aws --mode stdout
```

## Viewing Documentation Without EEs

If you want to use the documentation browser without Execution Environments (using your local Ansible installation):

```bash
# Disable EE and use local docs
ansible-navigator doc ansible.builtin.copy \
  --execution-environment false \
  --mode stdout
```

## Integrating Documentation into Development Workflow

Here is a practical workflow using documentation during playbook development:

```bash
# Step 1: Look up the module you need
ansible-navigator doc --list --mode stdout | grep -i "firewall"
# Found: ansible.posix.firewalld

# Step 2: Read the full documentation
ansible-navigator doc ansible.posix.firewalld --mode stdout

# Step 3: Copy an example from the docs into your playbook
# Step 4: Modify the example for your use case
# Step 5: Run the playbook
ansible-navigator run playbook.yml --mode stdout
```

Create a playbook based on what you learned from the docs:

```yaml
---
# firewall-config.yml - Built from ansible.posix.firewalld docs
- name: Configure firewall rules
  hosts: webservers
  become: true
  tasks:
    # Parameters learned from: ansible-navigator doc ansible.posix.firewalld
    - name: Allow HTTP traffic
      ansible.posix.firewalld:
        service: http
        permanent: true
        state: enabled
        immediate: true

    - name: Allow custom port
      ansible.posix.firewalld:
        port: 8080/tcp
        permanent: true
        state: enabled
        immediate: true

    - name: Allow traffic from trusted subnet
      ansible.posix.firewalld:
        source: 10.0.0.0/8
        zone: trusted
        permanent: true
        state: enabled
        immediate: true
```

## Viewing Playbook Keywords

ansible-navigator can also show you the available playbook keywords:

```bash
# List all playbook keywords
ansible-navigator doc --type keyword --list --mode stdout

# View a specific keyword
ansible-navigator doc --type keyword become --mode stdout
```

This is useful when you cannot remember the exact syntax for play-level or task-level directives.

## Wrapping Up

The documentation browser in ansible-navigator is one of those features that seems minor until you start using it regularly. It keeps you in the terminal instead of switching to a browser, it shows documentation from the actual EE your playbooks will use, and the interactive TUI makes it easy to explore unfamiliar collections. Make it a habit to check the docs before using a module for the first time, and especially before upgrading collection versions. The return values section alone will save you countless debugging sessions.
