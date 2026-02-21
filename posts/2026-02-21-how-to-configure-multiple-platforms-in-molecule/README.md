# How to Configure Multiple Platforms in Molecule

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Molecule, Multi-Platform Testing, DevOps

Description: Configure Molecule to test Ansible roles across multiple operating systems and platform configurations in a single scenario for broad compatibility.

---

One of Molecule's most practical features is the ability to test your Ansible role across multiple platforms simultaneously. A role that works on Ubuntu might fail on Rocky Linux because of different package names, service names, or file paths. By configuring multiple platforms in a single Molecule scenario, you catch these cross-platform issues before they become production incidents.

## Why Multi-Platform Testing Matters

Consider a role that installs and configures Apache. On Debian-based systems the package is called `apache2`, the service is `apache2`, and the config lives in `/etc/apache2/`. On RHEL-based systems it is `httpd`, the service is `httpd`, and the config is in `/etc/httpd/`. If your role only handles one family, it will fail on the other. Multi-platform testing forces you to handle these differences.

## Basic Multi-Platform Configuration

Add multiple entries to the `platforms` list in your `molecule.yml`.

```yaml
# molecule/default/molecule.yml - test on Ubuntu and Rocky Linux
driver:
  name: docker

platforms:
  - name: ubuntu2204
    image: "geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: ""
    tmpfs:
      - /run
      - /tmp

  - name: rocky9
    image: "geerlingguy/docker-rockylinux9-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: ""
    tmpfs:
      - /run
      - /tmp

provisioner:
  name: ansible

verifier:
  name: ansible
```

When you run `molecule converge`, the role is applied to both instances. When you run `molecule verify`, tests run against both.

## Comprehensive Platform Coverage

For roles that need to support many distributions, here is a broader platform list.

```yaml
# molecule/default/molecule.yml - wide platform coverage
driver:
  name: docker

platforms:
  # Ubuntu LTS versions
  - name: ubuntu2204
    image: "geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: ""
    tmpfs:
      - /run
      - /tmp

  - name: ubuntu2004
    image: "geerlingguy/docker-ubuntu2004-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: ""
    tmpfs:
      - /run
      - /tmp

  # Debian
  - name: debian12
    image: "geerlingguy/docker-debian12-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: ""
    tmpfs:
      - /run
      - /tmp

  # RHEL-compatible
  - name: rocky9
    image: "geerlingguy/docker-rockylinux9-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: ""
    tmpfs:
      - /run
      - /tmp

  - name: alma9
    image: "geerlingguy/docker-almalinux9-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: ""
    tmpfs:
      - /run
      - /tmp

  # Fedora
  - name: fedora39
    image: "geerlingguy/docker-fedora39-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: ""
    tmpfs:
      - /run
      - /tmp

provisioner:
  name: ansible
  inventory:
    host_vars:
      ubuntu2204:
        ansible_python_interpreter: /usr/bin/python3
      ubuntu2004:
        ansible_python_interpreter: /usr/bin/python3
      debian12:
        ansible_python_interpreter: /usr/bin/python3

verifier:
  name: ansible
```

## Using Groups in Multi-Platform Scenarios

Assign platforms to Ansible groups for targeted task execution.

```yaml
# molecule/default/molecule.yml - platforms with group assignments
platforms:
  - name: ubuntu2204
    image: "geerlingguy/docker-ubuntu2204-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: ""
    tmpfs:
      - /run
      - /tmp
    groups:
      - debian_family
      - webservers

  - name: rocky9
    image: "geerlingguy/docker-rockylinux9-ansible:latest"
    pre_build_image: true
    privileged: true
    volumes:
      - /sys/fs/cgroup:/sys/fs/cgroup:rw
    cgroupns_mode: host
    command: ""
    tmpfs:
      - /run
      - /tmp
    groups:
      - rhel_family
      - webservers

provisioner:
  name: ansible
  inventory:
    group_vars:
      debian_family:
        apache_package: apache2
        apache_service: apache2
        apache_config_dir: /etc/apache2
      rhel_family:
        apache_package: httpd
        apache_service: httpd
        apache_config_dir: /etc/httpd
```

## Platform-Specific Variables

Set variables per platform using host_vars in the provisioner config.

```yaml
# molecule/default/molecule.yml - per-platform variables
provisioner:
  name: ansible
  inventory:
    host_vars:
      ubuntu2204:
        ansible_python_interpreter: /usr/bin/python3
        custom_repo_url: "http://apt.example.com/ubuntu"
        firewall_tool: ufw
      rocky9:
        ansible_python_interpreter: /usr/bin/python3
        custom_repo_url: "http://yum.example.com/rhel9"
        firewall_tool: firewalld
      debian12:
        ansible_python_interpreter: /usr/bin/python3
        custom_repo_url: "http://apt.example.com/debian"
        firewall_tool: ufw
```

## Writing Platform-Aware Converge Playbooks

Your converge playbook should apply the role to all platforms.

```yaml
# molecule/default/converge.yml - applies to all platforms
- name: Converge
  hosts: all
  become: true
  vars:
    webserver_port: 8080
    webserver_enable_ssl: false
  roles:
    - role: my_webserver
```

The role itself should handle platform differences using `ansible_os_family` or `ansible_distribution`.

```yaml
# tasks/main.yml - platform-aware task file
- name: Include OS-specific variables
  ansible.builtin.include_vars: "{{ item }}"
  with_first_found:
    - "{{ ansible_distribution }}-{{ ansible_distribution_major_version }}.yml"
    - "{{ ansible_distribution }}.yml"
    - "{{ ansible_os_family }}.yml"
    - "default.yml"

- name: Install web server package
  ansible.builtin.package:
    name: "{{ webserver_package }}"
    state: present

- name: Start web server service
  ansible.builtin.service:
    name: "{{ webserver_service }}"
    state: started
    enabled: true
```

With OS-specific variable files:

```yaml
# vars/Debian.yml
webserver_package: apache2
webserver_service: apache2
webserver_config_dir: /etc/apache2

# vars/RedHat.yml
webserver_package: httpd
webserver_service: httpd
webserver_config_dir: /etc/httpd
```

## Writing Platform-Aware Verify Tests

Your verify playbook needs to handle platform differences too.

```yaml
# molecule/default/verify.yml - platform-aware verification
- name: Verify
  hosts: all
  become: true
  gather_facts: true
  tasks:
    - name: Set expected values based on OS family
      ansible.builtin.set_fact:
        expected_package: "{{ 'apache2' if ansible_os_family == 'Debian' else 'httpd' }}"
        expected_service: "{{ 'apache2' if ansible_os_family == 'Debian' else 'httpd' }}"
        expected_config: "{{ '/etc/apache2' if ansible_os_family == 'Debian' else '/etc/httpd' }}"

    - name: Verify web server package is installed
      ansible.builtin.package:
        name: "{{ expected_package }}"
        state: present
      check_mode: true
      register: pkg_check
      failed_when: pkg_check.changed

    - name: Verify web server service is running
      ansible.builtin.service:
        name: "{{ expected_service }}"
        state: started
        enabled: true
      check_mode: true
      register: svc_check
      failed_when: svc_check.changed

    - name: Verify config directory exists
      ansible.builtin.stat:
        path: "{{ expected_config }}"
      register: config_dir
      failed_when: not config_dir.stat.exists

    - name: Verify web server is listening on configured port
      ansible.builtin.wait_for:
        port: 8080
        timeout: 5
```

For Testinfra, handle platform differences with conditionals.

```python
# molecule/default/test_default.py - platform-aware Testinfra tests
import pytest

def test_webserver_installed(host):
    """Check that the web server package is installed."""
    os_family = host.system_info.distribution
    if os_family in ("ubuntu", "debian"):
        pkg = host.package("apache2")
    else:
        pkg = host.package("httpd")
    assert pkg.is_installed


def test_webserver_running(host):
    """Check that the web server service is running."""
    os_family = host.system_info.distribution
    if os_family in ("ubuntu", "debian"):
        svc = host.service("apache2")
    else:
        svc = host.service("httpd")
    assert svc.is_running
    assert svc.is_enabled


def test_webserver_listening(host):
    """Check that the web server is listening on port 8080."""
    socket = host.socket("tcp://0.0.0.0:8080")
    assert socket.is_listening
```

## Reducing Duplication with YAML Anchors

If your platforms share most configuration, use YAML anchors to reduce duplication.

```yaml
# molecule/default/molecule.yml - YAML anchors for shared config
driver:
  name: docker

x-common-platform: &common-platform
  pre_build_image: true
  privileged: true
  volumes:
    - /sys/fs/cgroup:/sys/fs/cgroup:rw
  cgroupns_mode: host
  command: ""
  tmpfs:
    - /run
    - /tmp

platforms:
  - name: ubuntu2204
    image: "geerlingguy/docker-ubuntu2204-ansible:latest"
    <<: *common-platform

  - name: ubuntu2004
    image: "geerlingguy/docker-ubuntu2004-ansible:latest"
    <<: *common-platform

  - name: debian12
    image: "geerlingguy/docker-debian12-ansible:latest"
    <<: *common-platform

  - name: rocky9
    image: "geerlingguy/docker-rockylinux9-ansible:latest"
    <<: *common-platform

  - name: alma9
    image: "geerlingguy/docker-almalinux9-ansible:latest"
    <<: *common-platform
```

## Running Against Specific Platforms

During development, you might want to converge against just one platform.

```bash
# Converge only on Ubuntu
molecule converge -- --limit ubuntu2204

# Verify only on Rocky Linux
molecule verify -- --limit rocky9

# Or use the converge command with a specific host
molecule converge -- -l "ubuntu2204,debian12"
```

## Performance Considerations

Running multiple platforms takes more resources and time. Here are ways to manage this.

```yaml
# molecule/default/molecule.yml - performance settings
provisioner:
  name: ansible
  config_options:
    defaults:
      forks: 10          # run tasks in parallel across platforms
      gathering: smart    # cache facts
      fact_caching: jsonfile
      fact_caching_connection: /tmp/molecule-facts
    ssh_connection:
      pipelining: true
```

For CI, consider splitting platforms across parallel jobs.

```yaml
# .github/workflows/test.yml - parallel platform testing
jobs:
  test:
    strategy:
      matrix:
        distro: [ubuntu2204, rocky9, debian12]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install molecule molecule-plugins[docker]
      - run: molecule converge -- --limit ${{ matrix.distro }}
      - run: molecule verify -- --limit ${{ matrix.distro }}
```

## Practical Tips

1. **Start with two platforms.** Test on one Debian-based and one RHEL-based system. This catches most cross-platform issues.

2. **Use OS family variables.** Structure your role around `ansible_os_family` rather than hard-coding for specific distributions. This makes adding new platforms easier.

3. **Test the oldest supported version.** If your role supports Ubuntu 20.04 through 24.04, make sure 20.04 is in your platform list. The newest version usually works; it is the older ones that have surprises.

4. **Name platforms clearly.** Use names like `ubuntu2204` and `rocky9` instead of `instance1` and `instance2`. The name appears in test output and makes failures easier to identify.

5. **Document supported platforms.** List which platforms your role supports in the role's README and make sure they all appear in your Molecule configuration.

Multi-platform testing is the single most effective way to make Ansible roles reliable across different environments. The upfront investment in configuration pays for itself every time you avoid a "works on Ubuntu but not CentOS" bug in production.
