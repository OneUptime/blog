# Fixing “/usr/bin/python Not Found” on New Ansible Targets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Python, Automation, Troubleshooting, Linux

Description: Bootstrap Python on minimal Ansible targets, configure interpreter discovery correctly, and separate controller from managed-node requirements.

---

Ansible is agentless, but most modules sent to a POSIX managed node execute with Python. Minimal cloud images, containers, network appliances, and freshly installed servers may not have a compatible interpreter at the path Ansible selects.

The fix depends on which condition you actually have:

- Python exists at a different path.
- No Python exists yet.
- Inventory pins an obsolete `/usr/bin/python` path.
- Python exists but is outside the version range supported by your `ansible-core` release.
- The target is a device that should use a non-Python connection and platform collection.

Treat controller Python and managed-node Python as separate dependencies. The Python that runs `ansible-playbook` does not get copied to targets.

## Read the Failure Closely

Run one host with verbose output:

```bash
ansible new-host \
  -i inventories/bootstrap \
  -m ansible.builtin.ping \
  -vvvv
```

`ansible.builtin.ping` is not ICMP. It connects using the configured transport, transfers or pipelines a small Python module, and expects `pong`. A failure such as this points to the target interpreter:

```text
/bin/sh: /usr/bin/python: not found
```

An `UNREACHABLE` authentication or timeout error is a connection problem instead. Test a command that does not require target Python:

```bash
ansible new-host \
  -i inventories/bootstrap \
  -m ansible.builtin.raw \
  -a 'id; command -v python3 || true' \
  -vvvv
```

The `raw` action runs through the configured remote shell and bypasses the normal module subsystem. If it succeeds, SSH is usable.

## Remove Stale Interpreter Pinning

Modern `ansible-core` performs interpreter discovery unless configured otherwise. The default discovery mode is `auto`; `auto_silent` performs the same search without fallback warnings. A hard-coded variable disables that discovery:

```yaml
all:
  vars:
    ansible_python_interpreter: /usr/bin/python
```

That path commonly came from older playbooks. If every target no longer has it, either remove the variable and let discovery run or update it to a tested interpreter:

```yaml
debian_hosts:
  vars:
    ansible_python_interpreter: /usr/bin/python3
```

You can set discovery globally:

```ini
[defaults]
interpreter_python = auto
```

Use an explicit path when reproducibility matters, especially if installing another Python later could change which fallback interpreter is selected. Do not create a `/usr/bin/python` symlink merely to satisfy an old inventory value. Point Ansible to the intended executable.

Check all inventory sources before concluding a setting is gone:

```bash
ansible-inventory -i inventories/production --host new-host
ansible-config dump --only-changed
```

## Bootstrap a Host That Has No Python

Disable automatic fact gathering because `setup`, which gathers facts, normally requires Python:

```yaml
---
- name: Bootstrap Python on Debian-family hosts
  hosts: bootstrap_debian
  gather_facts: false
  become: true

  tasks:
    - name: Install Python 3 if absent
      ansible.builtin.raw: >-
        if test -x /usr/bin/python3; then
          echo PYTHON_PRESENT;
        else
          apt-get update -y &&
          apt-get install -y python3 &&
          echo PYTHON_INSTALLED;
        fi
      register: python_bootstrap
      changed_when: "'PYTHON_INSTALLED' in python_bootstrap.stdout"

    - name: Verify the interpreter
      ansible.builtin.raw: /usr/bin/python3 --version
      changed_when: false
```

For a Red Hat-family image, use its package manager:

```yaml
---
- name: Bootstrap Python on DNF-based hosts
  hosts: bootstrap_rpm
  gather_facts: false
  become: true

  tasks:
    - name: Install Python 3 if absent
      ansible.builtin.raw: >-
        if test -x /usr/bin/python3; then
          echo PYTHON_PRESENT;
        else
          dnf install -y python3 &&
          echo PYTHON_INSTALLED;
        fi
      register: python_bootstrap
      changed_when: "'PYTHON_INSTALLED' in python_bootstrap.stdout"
```

Raw commands do not provide normal module idempotency or check-mode support. The `test ... || install ...` guard is what makes the transition repeatable. Package output differs between distributions and releases, so keep bootstrap logic small and test the reported change status on your images.

Do not put Debian and RPM commands in one guessed shell expression unless you have a well-tested image matrix. Inventory groups make the bootstrap contract explicit.

## Use a Two-Play Bootstrap

After installing Python, start a normal play that gathers facts:

```yaml
---
- name: Install target prerequisites
  hosts: new_linux
  gather_facts: false
  become: true
  tasks:
    - name: Ensure Python 3 is available
      ansible.builtin.raw: >-
        if test -x /usr/bin/python3; then
          echo PYTHON_PRESENT;
        else
          apt-get update -y &&
          apt-get install -y python3 &&
          echo PYTHON_INSTALLED;
        fi
      register: python_bootstrap
      changed_when: "'PYTHON_INSTALLED' in python_bootstrap.stdout"

- name: Configure bootstrapped hosts
  hosts: new_linux
  gather_facts: true
  vars:
    ansible_python_interpreter: /usr/bin/python3
  roles:
    - baseline
```

The second play now uses the regular package, file, user, and service modules. Keeping raw operations in a dedicated bootstrap play prevents them from spreading through the rest of the codebase.

If you do not know the distribution because facts are unavailable, use provisioning metadata or inventory groups. Trying to infer an operating system from arbitrary files in a long raw script is possible, but it becomes another package manager implementation to maintain.

## Bootstrap Privilege Escalation Too

Minimal targets sometimes lack `sudo`, or the connection account cannot elevate. `become: true` cannot install Python if the become method itself is unavailable.

Choose one supported initial-access model:

- provision the image with Python, sudo, and the automation account
- connect as root only for the bootstrap play
- use cloud-init or image-building automation to install prerequisites
- provide a working sudo policy before Ansible configuration begins

Then switch to a dedicated unprivileged connection account and task-scoped `become`.

Remember that `remote_user` controls SSH login and `become_user` controls the identity after connection. Changing `become_user` does not select a different SSH account.

## Verify Version Compatibility

Each `ansible-core` release supports a documented range of Python versions on the controller and on target nodes. Those ranges change over time. A Python executable being present is not enough if it is too old or too new for the core version in your execution environment.

Check the controller:

```bash
ansible --version
python3 --version
```

Check the managed node without a Python-dependent module:

```bash
ansible new-host \
  -i inventories/production \
  -m ansible.builtin.raw \
  -a '/usr/bin/python3 --version'
```

Compare both results with the release and maintenance matrix for the installed Ansible release. Pinning an execution environment and a base image makes this compatibility test reproducible.

## Handle Virtual Environments Deliberately

Ansible can use a virtual-environment interpreter on the managed node:

```yaml
app_hosts:
  vars:
    ansible_python_interpreter: /opt/ansible-runtime/bin/python
```

That environment must already contain a compatible Python and any Python libraries required by the modules you use. The controller's virtual environment and collections remain separate.

Do not point `ansible_python_interpreter` at `/usr/bin/env python3`. The setting expects an interpreter path or a supported discovery mode, not a shell command with arguments.

## Know the Exceptions

Windows targets use PowerShell-based modules and Windows connection plugins, not the POSIX Python module path. Many network devices have no general-purpose Python runtime and are managed using collection-specific modules that execute logic on the controller through connections such as `network_cli`, `netconf`, or `httpapi`.

Do not install Python on an appliance merely because a Linux-oriented play targeted it accidentally. Put devices in the right inventory groups, set the correct connection plugin and network OS, and use the platform collection.

## Build the Requirement into Provisioning

Raw bootstrap is a useful recovery path, but mature environments should make target prerequisites part of the image contract:

- install a supported Python version in the base image
- create the automation account and authorized key
- configure the intended privilege-escalation policy
- pin `ansible_python_interpreter` when deterministic selection is required
- test the image with `ansible.builtin.ping` before promotion

That reduces first-run complexity and prevents an Ansible upgrade from discovering that old images carry an unsupported interpreter.

## Official Documentation

- [Interpreter discovery](https://docs.ansible.com/projects/ansible/latest/reference_appendices/interpreter_discovery.html)
- [ansible.builtin.raw module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/raw_module.html)
- [Connection methods and details](https://docs.ansible.com/projects/ansible/latest/inventory_guide/connection_details.html)
- [Ansible releases and Python support](https://docs.ansible.com/projects/ansible/latest/reference_appendices/release_and_maintenance.html)
- [Ansible and Python 3](https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_python_3.html)
