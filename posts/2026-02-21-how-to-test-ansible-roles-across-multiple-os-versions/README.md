# How to Test Ansible Roles Across Multiple OS Versions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Molecule, Cross-Platform Testing, CI/CD, DevOps

Description: Build a testing strategy for Ansible roles that covers multiple OS versions using Molecule scenarios, CI matrix builds, and platform-aware role design.

---

Supporting multiple operating system versions is a reality for most Ansible roles. Your production fleet probably has a mix of Ubuntu 20.04 and 22.04, or CentOS 7 and Rocky 9, or some combination of Debian, RHEL, and maybe even Amazon Linux. Each version has different package versions, Python interpreters, systemd behaviors, and default configurations. Testing across all of them is the only way to ship reliable roles.

## The Challenge

Different OS versions introduce several categories of differences that can break your role:

- **Package names change.** Python 2 vs Python 3, MariaDB vs MySQL, etc.
- **Service management changes.** SysV init vs systemd, different unit file locations.
- **Default configurations differ.** File paths, default users, SELinux policies.
- **Python interpreter paths change.** `/usr/bin/python` vs `/usr/bin/python3` vs `/usr/bin/python3.11`.
- **Dependency versions vary.** OpenSSL 1.1 vs 3.0, glibc versions, kernel features.

## Designing Roles for Cross-OS Compatibility

Before testing, your role needs to be structured for multi-OS support. The standard pattern uses OS-specific variable files.

```
roles/my_webserver/
  defaults/main.yml
  vars/
    Debian.yml
    RedHat.yml
    Ubuntu-20.yml
    Ubuntu-22.yml
    Rocky-9.yml
    default.yml
  tasks/
    main.yml
    install.yml
    configure.yml
  handlers/main.yml
  templates/
  molecule/
    default/
```

The task that loads OS-specific variables:

```yaml
# tasks/main.yml - load OS-specific variables with fallback chain
- name: Load OS-specific variables
  ansible.builtin.include_vars: "{{ item }}"
  with_first_found:
    - files:
        - "{{ ansible_distribution }}-{{ ansible_distribution_major_version }}.yml"
        - "{{ ansible_distribution }}.yml"
        - "{{ ansible_os_family }}.yml"
        - "default.yml"
      paths:
        - vars

- name: Install packages
  ansible.builtin.include_tasks: install.yml

- name: Configure application
  ansible.builtin.include_tasks: configure.yml
```

The variable files define platform-specific values:

```yaml
# vars/Ubuntu-22.yml - Ubuntu 22.04 specific
python_package: python3
pip_package: python3-pip
webserver_package: apache2
webserver_service: apache2
php_package: php8.1-fpm
config_dir: /etc/apache2
```

```yaml
# vars/Rocky-9.yml - Rocky Linux 9 specific
python_package: python3
pip_package: python3-pip
webserver_package: httpd
webserver_service: httpd
php_package: php-fpm
config_dir: /etc/httpd
```

```yaml
# vars/Ubuntu-20.yml - Ubuntu 20.04 specific
python_package: python3
pip_package: python3-pip
webserver_package: apache2
webserver_service: apache2
php_package: php7.4-fpm
config_dir: /etc/apache2
```

## Molecule Configuration for Multiple OS Versions

Configure Molecule to test across all supported versions.

```yaml
# molecule/default/molecule.yml - test matrix across OS versions
driver:
  name: docker

platforms:
  # Ubuntu versions
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
    groups:
      - ubuntu

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
      - ubuntu

  # Debian versions
  - name: debian11
    image: "geerlingguy/docker-debian11-ansible:latest"
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
      - debian

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
    groups:
      - debian

  # RHEL-compatible versions
  - name: rocky8
    image: "geerlingguy/docker-rockylinux8-ansible:latest"
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
      - rhel

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
      - rhel

  # Amazon Linux
  - name: amazonlinux2023
    image: "geerlingguy/docker-amazonlinux2023-ansible:latest"
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
      - rhel

provisioner:
  name: ansible
  inventory:
    host_vars:
      ubuntu2004:
        ansible_python_interpreter: /usr/bin/python3
      ubuntu2204:
        ansible_python_interpreter: /usr/bin/python3
      debian11:
        ansible_python_interpreter: /usr/bin/python3
      debian12:
        ansible_python_interpreter: /usr/bin/python3

verifier:
  name: ansible
```

## CI Matrix Builds

Testing all platforms in a single CI job is slow. Use matrix builds to run them in parallel.

### GitHub Actions Matrix

```yaml
# .github/workflows/molecule.yml - parallel OS testing
name: Molecule Test
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  molecule:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        distro:
          - ubuntu2004
          - ubuntu2204
          - debian11
          - debian12
          - rocky8
          - rocky9
          - amazonlinux2023
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: |
          pip install ansible-core molecule molecule-plugins[docker] ansible-lint

      - name: Run Molecule on ${{ matrix.distro }}
        run: molecule test -- --limit ${{ matrix.distro }}
        env:
          PY_COLORS: '1'
          ANSIBLE_FORCE_COLOR: '1'
```

### GitLab CI Matrix

```yaml
# .gitlab-ci.yml - parallel OS testing
molecule-test:
  parallel:
    matrix:
      - DISTRO: [ubuntu2004, ubuntu2204, debian11, debian12, rocky8, rocky9]
  image: python:3.11
  services:
    - docker:dind
  variables:
    DOCKER_HOST: tcp://docker:2375
  script:
    - pip install ansible-core molecule molecule-plugins[docker]
    - molecule test -- --limit $DISTRO
```

## Writing OS-Version-Aware Verify Tests

Your verification needs to account for differences between OS versions.

```yaml
# molecule/default/verify.yml - OS-version-aware verification
- name: Verify
  hosts: all
  become: true
  gather_facts: true
  tasks:
    - name: Determine expected package names
      ansible.builtin.set_fact:
        expected_webserver_pkg: >-
          {{ 'apache2' if ansible_os_family == 'Debian' else 'httpd' }}
        expected_webserver_svc: >-
          {{ 'apache2' if ansible_os_family == 'Debian' else 'httpd' }}
        expected_php_pkg: >-
          {% if ansible_distribution == 'Ubuntu' and ansible_distribution_major_version == '22' %}
          php8.1-fpm
          {% elif ansible_distribution == 'Ubuntu' and ansible_distribution_major_version == '20' %}
          php7.4-fpm
          {% elif ansible_os_family == 'RedHat' %}
          php-fpm
          {% else %}
          php-fpm
          {% endif %}

    - name: Verify web server is installed
      ansible.builtin.package:
        name: "{{ expected_webserver_pkg }}"
        state: present
      check_mode: true
      register: pkg_check
      failed_when: pkg_check.changed

    - name: Verify web server is running
      ansible.builtin.service:
        name: "{{ expected_webserver_svc }}"
        state: started
        enabled: true
      check_mode: true
      register: svc_check
      failed_when: svc_check.changed

    - name: Verify web server responds
      ansible.builtin.uri:
        url: "http://localhost:80"
        status_code: [200, 403]
      register: http_check

    - name: Verify Python 3 is available
      ansible.builtin.command:
        cmd: python3 --version
      changed_when: false
      register: python_version

    - name: Display Python version for debugging
      ansible.builtin.debug:
        msg: "Python version on {{ ansible_distribution }} {{ ansible_distribution_version }}: {{ python_version.stdout }}"
```

## Handling EOL Operating Systems

When an OS version reaches end of life, you need a plan for removing it from your test matrix.

```yaml
# molecule/default/molecule.yml - with EOL notices
platforms:
  # Active support
  - name: ubuntu2204
    image: "geerlingguy/docker-ubuntu2204-ansible:latest"
    # ...

  # Maintenance mode (will be removed 2025-04)
  - name: ubuntu2004
    image: "geerlingguy/docker-ubuntu2004-ansible:latest"
    # ...

  # DO NOT ADD: CentOS 7 (EOL June 2024)
  # DO NOT ADD: Debian 10 (EOL June 2024)
```

Maintain a supported platforms document:

```yaml
# meta/main.yml - declare supported platforms
galaxy_info:
  platforms:
    - name: Ubuntu
      versions:
        - focal   # 20.04 (until April 2025)
        - jammy   # 22.04 (until April 2027)
    - name: Debian
      versions:
        - bullseye  # 11 (until June 2026)
        - bookworm  # 12 (until June 2028)
    - name: EL
      versions:
        - "8"  # until May 2029
        - "9"  # until May 2032
```

## Dealing with Platform-Specific Quirks

Some issues only appear on specific OS versions. Document and test for them.

```yaml
# tasks/install.yml - handle known platform quirks
- name: Install EPEL repository on RHEL 8
  ansible.builtin.dnf:
    name: epel-release
    state: present
  when:
    - ansible_os_family == "RedHat"
    - ansible_distribution_major_version == "8"

- name: Work around Python 3.6 limitation on CentOS 8
  ansible.builtin.pip:
    name: "cryptography<38.0"
    state: present
  when:
    - ansible_distribution_major_version == "8"
    - ansible_python_version is version('3.7', '<')

- name: Handle AppArmor on Ubuntu
  ansible.builtin.service:
    name: apparmor
    state: started
  when:
    - ansible_distribution == "Ubuntu"
  ignore_errors: true  # not present in containers
```

## Local Development Workflow

During local development, test against a subset and rely on CI for the full matrix.

```bash
# Quick local test: just two platforms
molecule converge -- --limit "ubuntu2204,rocky9"
molecule verify -- --limit "ubuntu2204,rocky9"

# When ready, push to CI for full matrix testing
git push origin feature-branch
```

## Practical Tips

1. **Test the common case first.** Start with the OS your production environment actually uses. Then add older and newer versions.

2. **Use `ansible_os_family` over `ansible_distribution`.** Testing for `Debian` covers both Ubuntu and Debian. Testing for `RedHat` covers RHEL, Rocky, Alma, and CentOS.

3. **Pin Docker image tags.** Using `:latest` means your tests can break when an image is updated. Consider pinning to specific tags for reproducibility.

4. **Run the full matrix in CI, not locally.** Seven platforms take seven times the resources. Test one or two locally and let CI handle the rest.

5. **Drop OS versions before they drop you.** When an OS version approaches end of life, add a deprecation notice and remove it from your matrix on a set date.

6. **Test the upgrade path.** If users might upgrade their OS while your role is installed, consider testing that scenario too.

Cross-OS testing is the most effective way to build Ansible roles that work everywhere. It takes effort to set up, but it catches the kind of bugs that are nearly impossible to find any other way.
