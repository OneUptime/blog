# Manage Photon OS Packages with Ansible When the Generic package Module Fails

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Photon OS, Ansible, Package Management

Description: Handle Photon package automation with explicit tdnf operations, Python bootstrap, RPM-based idempotence, and honest Ansible check-mode behavior.

---

Ansible's generic `package` module delegates to a package-manager-specific implementation. On Photon, setting a fact to `tdnf` does not create a compatible backend, and the `dnf` module's Python requirements are not satisfied merely because `tdnf` has similar command-line syntax. Diagnose the missing layer before replacing the task.

The [Ansible package documentation](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html) describes this delegation. The [dnf module reference](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dnf_module.html) lists its own requirements. A predictable fallback uses the Photon CLI explicitly and makes idempotence visible in the playbook.

## Check Python and package facts separately

From the controller, inspect one host using `raw`, which does not require Python on the target:

```bash
ansible photon01 -i inventory.ini -b \
  -m ansible.builtin.raw \
  -a 'cat /etc/os-release; command -v python3; command -v tdnf'
```

Use your normal SSH identity and privilege-escalation settings. On a minimal image without `sudo`, bootstrap through an already authorized administrative connection rather than assuming `become` can work before its dependencies exist.

If Python is missing, run this explicit bootstrap operation once:

```bash
ansible photon01 -i inventory.ini -b \
  -m ansible.builtin.raw \
  -a 'test -x /usr/bin/python3 || tdnf install -y python3'
```

This is a real installation operation, not a check-mode simulation. Ansible documents this use of [raw for bootstrapping](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/raw_module.html). Confirm that the installed Python version is supported by your controller's ansible-core release, and set `ansible_python_interpreter` explicitly if necessary.

After Python works, gather facts and inspect `ansible_facts.pkg_mgr`. Preserve the original error: inability to import a backend library differs from a repository TLS error inside an otherwise working transaction.

## Implement presence checks without parsing English output

For a small approved list of named RPMs, query installed state and install only missing packages:

```yaml
- name: Ensure Photon diagnostic packages are installed
  hosts: photon
  become: true
  gather_facts: false
  vars:
    photon_packages:
      - curl
      - tcpdump
  tasks:
    - name: Query each named RPM
      ansible.builtin.command:
        argv: [rpm, -q, "{{ item }}"]
      loop: "{{ photon_packages }}"
      register: photon_rpm_checks
      changed_when: false
      failed_when: >-
        photon_rpm_checks.rc not in [0, 1] or
        (photon_rpm_checks.stderr | default('') | trim | length > 0)
      check_mode: false

    - name: Show packages missing in check mode
      ansible.builtin.debug:
        msg: "Would install {{ item.item }}"
      loop: "{{ photon_rpm_checks.results }}"
      when:
        - ansible_check_mode
        - item.rc == 1

    - name: Install missing RPMs through tdnf
      ansible.builtin.command:
        argv: [tdnf, install, -y, "{{ item.item }}"]
      loop: "{{ photon_rpm_checks.results }}"
      when:
        - not ansible_check_mode
        - item.rc == 1
      changed_when: true
```

This example defines “present” as an installed package with that exact RPM name. It does not implement version constraints, virtual provides, package groups, or “latest.” Exit code 1 alone does not distinguish absence from an RPM-database error, so the query also fails conservatively on any stderr diagnostics, including warnings. Investigate these diagnostics rather than treating them as ordinary absence; preserve stderr in job logs.

The [command module reference](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html) documents `argv` and its limited built-in check-mode support. Here the read-only RPM query runs even in check mode, while the installation is explicitly excluded. The debug task reports intended installation, but it cannot prove dependency resolution will succeed.

## Keep repository and update policy explicit

Manage `.repo` files and approved keys before package installation. Photon documents the configuration format in [adding a repository](https://vmware.github.io/photon/docs-v5/administration-guide/managing-packages-with-tdnf/adding-a-new-repository/). Preserve TLS and package-signature checks, and align every source with the installed Photon release.

For larger package sets, batch missing names into one transaction after computing the list. That reduces repeated metadata work and lets the solver consider the requested set together. Keep package names controlled by reviewed configuration rather than interpolating untrusted shell text.

Treat operating-system updates as a separate maintenance workflow with an approved repository snapshot, canary hosts, and restart handling. An unconditional `tdnf update -y` on every configuration run hides a substantial lifecycle decision inside a routine convergence task.

## Verify idempotence and failures

Run the playbook against a disposable Photon VM twice. The first run should install missing packages; the second should perform queries without another install. Test check mode after bootstrap, a nonexistent package name, and an unavailable repository.

The automation should fail clearly on a real transaction error and leave enough output to diagnose it. Package presence, dependency success, and application health are separate acceptance checks; implement each where it belongs rather than inferring all three from a successful Ansible connection.
