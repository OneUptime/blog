# Testing Ansible Roles with Check Mode, ansible-lint, and Molecule

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Testing, ansible-lint, Molecule, Continuous Integration

Description: Build a layered Ansible role test workflow using syntax checks, lint rules, check mode, real convergence, idempotence, and verification.

---

No single Ansible test catches every defect.

- Syntax checking catches invalid playbook structure and missing content.
- `ansible-lint` catches Ansible-specific maintainability and correctness patterns.
- Check mode predicts changes for modules that support it.
- Molecule creates a repeatable scenario, converges the role, tests idempotence, and verifies outcomes.

Use the layers together. Check mode is not a sandbox, lint is not execution, and a successful converge does not prove the second run is stable.

## Make the Role Testable by Contract

A role should provide safe defaults for optional values and validate required input:

```text
roles/myapp/
  defaults/main.yml
  handlers/main.yml
  meta/argument_specs.yml
  tasks/main.yml
  templates/
  molecule/default/
```

```yaml
# defaults/main.yml
myapp_port: 8080
myapp_log_level: info
myapp_extra_packages: []
```

```yaml
# meta/argument_specs.yml
---
argument_specs:
  main:
    short_description: Install and configure myapp
    options:
      myapp_port:
        type: int
        required: false
        default: 8080
      myapp_log_level:
        type: str
        choices:
          - debug
          - info
          - warning
          - error
```

Avoid role behavior that depends on undeclared variables from an unrelated play. `ansible-lint` creates temporary playbooks to syntax-check roles, so a role that cannot load without hidden inventory state will be difficult to lint and reuse.

## Pin the Toolchain

Create a dedicated virtual environment or execution environment:

```bash
python3 -m venv .venv
. .venv/bin/activate
python3 -m pip install --upgrade pip
python3 -m pip install ansible-dev-tools
```

The Molecule project recommends `ansible-dev-tools` as the streamlined installation path. It also supports installing Molecule and Ansible directly. Molecule supports only the latest two major Ansible versions, so pin and test a compatible matrix rather than assuming an old core release remains supported.

Record content dependencies:

```yaml
# collections/requirements.yml
---
collections:
  - name: ansible.posix
    version: ">=2.1.0,<3.0.0"
```

`ansible-lint` recognizes standard `requirements.yml` locations. Missing collections otherwise appear as the unskippable `syntax-check[unknown-module]` error.

## Run Fast Static Checks First

Make the role resolvable for the project layout above:

```ini
# ansible.cfg
[defaults]
roles_path = roles
```

Use a small role harness:

```yaml
# tests/test.yml
---
- name: Test myapp role
  hosts: all
  become: true
  roles:
    - role: myapp
```

Run syntax checking:

```bash
ansible-playbook \
  -i tests/inventory \
  tests/test.yml \
  --syntax-check
```

Then lint:

```bash
ansible-lint
```

`ansible-lint` runs Ansible's syntax check before its other rules. Syntax errors are unskippable because rule evaluation is unreliable when Ansible cannot load the content.

A minimal project configuration might be:

```yaml
# .ansible-lint
---
profile: production
exclude_paths:
  - .cache/
  - .venv/
```

Choose a profile supported by the pinned lint version and review every exclusion. Do not add broad `skip_list` entries merely to make CI green. Fix the task or document a tight `# noqa` exception with a reason.

## Use Check Mode as Prediction

```bash
ansible-playbook \
  -i tests/inventory \
  tests/test.yml \
  --check \
  --diff
```

Modules that support check mode report changes they would make without applying them. Modules without support may skip. Registered results from skipped commands may not contain the fields later conditionals expect.

Guard an unavoidable command:

```yaml
- name: Initialize a one-time application database
  ansible.builtin.command:
    cmd: /opt/myapp/bin/initialize
    creates: /var/lib/myapp/.initialized
  when: not ansible_check_mode
```

Or let `ansible.builtin.command` model the prediction with `creates` when the marker reliably represents completion:

```yaml
- name: Initialize the database
  ansible.builtin.command:
    cmd: /opt/myapp/bin/initialize
    creates: /var/lib/myapp/.initialized
```

Disable diff on secret-bearing templates even in tests:

```yaml
diff: false
no_log: true
```

Check mode can find accidental changes and undefined-variable paths, but a real disposable target is required to verify effects.

## Create a Molecule Scenario

Initialize a scenario from the installed Molecule version:

```bash
molecule init scenario
```

Current Molecule documentation promotes an Ansible-native approach. It uses normal Ansible inventory, playbooks, and collections, while Molecule orchestrates the action sequence. This differs from many older examples that rely on a third-party `driver` and `platforms` section.

A compact role scenario that targets pre-created disposable resources can use:

```yaml
# molecule/default/molecule.yml
---
ansible:
  executor:
    backend: ansible-playbook
    args:
      ansible_playbook:
        - --inventory=${MOLECULE_SCENARIO_DIRECTORY}/inventory/
  playbooks:
    converge: converge.yml
    verify: verify.yml

scenario:
  test_sequence:
    - syntax
    - converge
    - idempotence
    - verify
```

```yaml
# molecule/default/inventory/hosts.yml
---
all:
  children:
    test_resources:
      hosts:
        test-instance:
          ansible_host: 192.0.2.50
          ansible_user: molecule
```

Use disposable hosts only. For containers, VMs, or cloud instances, add tested `create.yml` and `destroy.yml` playbooks and include `create` and `destroy` in the sequence. The official Ansible-native examples show inventory-driven resource management.

## Converge the Role

```yaml
# molecule/default/converge.yml
---
- name: Converge myapp role
  hosts: test_resources
  become: true
  roles:
    - role: my_namespace.my_collection.myapp
      vars:
        myapp_port: 18080
```

If the role is not in a collection, use its resolvable role name and configure role paths through Ansible's configuration. In the Ansible-native schema shown here, put the corresponding setting under `ansible.cfg.defaults` in `molecule.yml`. Molecule's documentation notes that, as of Molecule 6, role and collection paths should use `ansible.cfg` settings rather than old Molecule-specific path options.

Run an iterative converge:

```bash
molecule converge
```

This leaves resources available for inspection. Run the complete lifecycle in CI:

```bash
molecule test
```

Use `molecule matrix` to see the ordered actions for the current configuration.

## Verify Behavior, Not Implementation

Verification should query observable state with a different mechanism where practical:

```yaml
# molecule/default/verify.yml
---
- name: Verify myapp behavior
  hosts: test_resources
  gather_facts: false
  tasks:
    - name: Read the rendered configuration
      ansible.builtin.slurp:
        src: /etc/myapp/app.conf
      register: rendered_config

    - name: Check configuration content
      ansible.builtin.assert:
        that:
          - "'port=18080' in (rendered_config.content | b64decode)"

    - name: Query the health endpoint
      ansible.builtin.uri:
        url: http://127.0.0.1:18080/health
        status_code: 200
```

Do not verify package installation by calling the same role task again. Verify the resulting service, file, API, permissions, or behavior.

Test failure contracts too:

```yaml
- name: Include role with invalid input
  block:
    - name: Run role with an invalid port
      ansible.builtin.include_role:
        name: my_namespace.my_collection.myapp
      vars:
        myapp_port: not-an-integer

    - name: Fail if invalid input was accepted
      ansible.builtin.fail:
        msg: Role unexpectedly accepted an invalid port.

  rescue:
    - name: Confirm the expected validation failure
      ansible.builtin.assert:
        that:
          - ansible_failed_result is defined
          - "'myapp_port' in (ansible_failed_result.msg | default(''))"
```

## Test Idempotence

Molecule's idempotence action runs converge again and checks Ansible's reported changes. If it fails, reproduce directly:

```bash
molecule converge
molecule converge
```

The second run should normally end with `changed=0`. Investigate:

- command and shell tasks without accurate `changed_when`
- templates with timestamps or random values
- package state `latest`
- handlers notified by false changes
- generated files whose ordering varies
- API modules that report changed on every call

Do not exclude a task from idempotence just because fixing it is inconvenient. Document operations that are genuinely non-idempotent and isolate them from the steady-state role.

## Build a CI Ladder

Run cheap checks before provisioning:

```bash
ansible-lint
ansible-playbook -i tests/inventory tests/test.yml --syntax-check
molecule test
```

Add a version matrix for the Ansible and Python versions your role supports. Test multiple operating-system images if package names, init systems, or file paths differ.

Always destroy disposable resources in CI, including after failure. Molecule sequences support cleanup and destroy actions, but your playbooks must make teardown safe and repeatable.

The strongest role pipeline answers four questions:

1. Can Ansible load it?
2. Does it follow maintainable Ansible patterns?
3. Does it converge a real disposable target?
4. Does another run remain stable and does verification observe the intended behavior?

## Official Documentation

- [Validating tasks with check and diff mode](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html)
- [ansible-lint usage](https://docs.ansible.com/projects/lint/usage/)
- [ansible-lint syntax-check rule](https://docs.ansible.com/projects/lint/rules/syntax-check/)
- [Molecule installation](https://docs.ansible.com/projects/molecule/installation/)
- [Molecule Ansible-native configuration](https://docs.ansible.com/projects/molecule/ansible-native/)
- [Molecule command-line reference](https://docs.ansible.com/projects/molecule/usage/)
