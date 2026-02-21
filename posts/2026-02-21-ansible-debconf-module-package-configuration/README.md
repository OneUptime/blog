# How to Use Ansible debconf Module for Package Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Debian, Package Configuration, debconf, Ubuntu

Description: Learn how to use the Ansible debconf module to pre-seed package configuration answers and automate interactive package installations on Debian and Ubuntu systems.

---

If you have ever installed a package on Debian or Ubuntu that pops up a configuration dialog during installation, you know the pain of automating that process. Packages like `postfix`, `mysql-server`, `phpmyadmin`, and `iptables-persistent` all ask questions during installation that expect interactive answers. This breaks automation.

The Debian `debconf` system is the mechanism behind these interactive dialogs. It stores configuration answers in a database, and packages query this database during installation. The Ansible `debconf` module lets you pre-seed these answers before the package is installed, so the installation runs completely unattended.

## How debconf Works

When a Debian package needs configuration input, it uses `debconf` to ask questions. Each question has:

- A **name** (like `postfix/main_mailer_type`)
- A **type** (select, string, boolean, password, multiselect, note)
- A **value** (the answer)

You can see what questions a package asks by running `debconf-show <package>` or `debconf-get-selections | grep <package>` on a system where it is already installed.

## Basic Usage

The Ansible `debconf` module sets answers in the debconf database before package installation. Here is a simple example with `iptables-persistent`.

```yaml
# Pre-seed iptables-persistent to save current rules during installation
- name: Pre-configure iptables-persistent
  ansible.builtin.debconf:
    name: iptables-persistent
    question: iptables-persistent/autosave_v4
    value: "true"
    vtype: boolean

- name: Pre-configure iptables-persistent for IPv6
  ansible.builtin.debconf:
    name: iptables-persistent
    question: iptables-persistent/autosave_v6
    value: "true"
    vtype: boolean

- name: Install iptables-persistent (non-interactive)
  ansible.builtin.apt:
    name: iptables-persistent
    state: present
  environment:
    DEBIAN_FRONTEND: noninteractive
```

The critical detail here is setting `DEBIAN_FRONTEND=noninteractive` in the environment. Without this, some packages might still try to show dialogs even though debconf has the answers.

## Configuring Postfix

Postfix is one of the most common packages that requires debconf configuration. Here is how to automate a full Postfix installation.

```yaml
# Pre-seed Postfix configuration for an Internet-facing mail server
- name: Set Postfix mail type
  ansible.builtin.debconf:
    name: postfix
    question: postfix/main_mailer_type
    value: "Internet Site"
    vtype: select

- name: Set Postfix mailname
  ansible.builtin.debconf:
    name: postfix
    question: postfix/mailname
    value: "{{ ansible_fqdn }}"
    vtype: string

- name: Set Postfix destinations
  ansible.builtin.debconf:
    name: postfix
    question: postfix/destinations
    value: "{{ ansible_fqdn }}, localhost.localdomain, localhost"
    vtype: string

- name: Set Postfix relay host
  ansible.builtin.debconf:
    name: postfix
    question: postfix/relayhost
    value: ""
    vtype: string

- name: Install Postfix non-interactively
  ansible.builtin.apt:
    name: postfix
    state: present
  environment:
    DEBIAN_FRONTEND: noninteractive
```

## Configuring MySQL/MariaDB Root Password

Setting the root password for MySQL before installation prevents the interactive prompt.

```yaml
# Pre-seed MySQL root password before installation
- name: Set MySQL root password (initial)
  ansible.builtin.debconf:
    name: mysql-server
    question: mysql-server/root_password
    value: "{{ mysql_root_password }}"
    vtype: password

- name: Confirm MySQL root password
  ansible.builtin.debconf:
    name: mysql-server
    question: mysql-server/root_password_again
    value: "{{ mysql_root_password }}"
    vtype: password

- name: Install MySQL server
  ansible.builtin.apt:
    name: mysql-server
    state: present
  environment:
    DEBIAN_FRONTEND: noninteractive
```

Note: For MariaDB 10.4+, the root password is handled differently (via `mysql_secure_installation` or socket authentication), so the debconf approach may not apply.

## Discovering debconf Questions

To find out what questions a package asks, you have several options.

### On a System Where the Package Is Already Installed

```yaml
# Gather debconf information for a package
- name: Get debconf settings for postfix
  ansible.builtin.command:
    cmd: debconf-show postfix
  register: postfix_debconf
  changed_when: false

- name: Display debconf settings
  ansible.builtin.debug:
    var: postfix_debconf.stdout_lines
```

### Before Installing the Package

```yaml
# Download the package and check its debconf templates
- name: Download the package without installing
  ansible.builtin.command:
    cmd: apt-get download phpmyadmin
    chdir: /tmp
  changed_when: false

- name: Extract debconf templates from the package
  ansible.builtin.command:
    cmd: dpkg-deb --ctrl-tarfile /tmp/phpmyadmin_*.deb
  register: ctrl_tar
  changed_when: false
```

In practice, the easiest way is to install the package on a test system first, run `debconf-show <package>`, and note the questions and values.

## Configuring phpMyAdmin

phpMyAdmin has several configuration questions during installation.

```yaml
# Pre-seed phpMyAdmin configuration
- name: Configure phpMyAdmin web server
  ansible.builtin.debconf:
    name: phpmyadmin
    question: phpmyadmin/reconfigure-webserver
    value: "apache2"
    vtype: multiselect

- name: Configure phpMyAdmin database
  ansible.builtin.debconf:
    name: phpmyadmin
    question: phpmyadmin/dbconfig-install
    value: "true"
    vtype: boolean

- name: Set phpMyAdmin database admin password
  ansible.builtin.debconf:
    name: phpmyadmin
    question: phpmyadmin/mysql/admin-pass
    value: "{{ mysql_root_password }}"
    vtype: password

- name: Set phpMyAdmin application password
  ansible.builtin.debconf:
    name: phpmyadmin
    question: phpmyadmin/mysql/app-pass
    value: "{{ phpmyadmin_password }}"
    vtype: password

- name: Confirm phpMyAdmin application password
  ansible.builtin.debconf:
    name: phpmyadmin
    question: phpmyadmin/app-password-confirm
    value: "{{ phpmyadmin_password }}"
    vtype: password

- name: Install phpMyAdmin
  ansible.builtin.apt:
    name: phpmyadmin
    state: present
  environment:
    DEBIAN_FRONTEND: noninteractive
```

## Configuring Keyboard and Locale

System-level configurations like keyboard layout and locale also use debconf.

```yaml
# Configure keyboard layout via debconf
- name: Set keyboard model
  ansible.builtin.debconf:
    name: keyboard-configuration
    question: keyboard-configuration/modelcode
    value: "pc105"
    vtype: string

- name: Set keyboard layout
  ansible.builtin.debconf:
    name: keyboard-configuration
    question: keyboard-configuration/layoutcode
    value: "us"
    vtype: string

# Configure locale
- name: Set default locale
  ansible.builtin.debconf:
    name: locales
    question: locales/default_environment_locale
    value: "en_US.UTF-8"
    vtype: select

- name: Set locales to generate
  ansible.builtin.debconf:
    name: locales
    question: locales/locales_to_be_generated
    value: "en_US.UTF-8 UTF-8"
    vtype: multiselect
```

## Using debconf in a Reusable Role

Here is a pattern for a reusable role that accepts debconf settings as variables.

```yaml
# roles/package_installer/defaults/main.yml
package_name: ""
package_debconf: []
package_state: present
```

```yaml
# roles/package_installer/tasks/main.yml
# Generic role for installing packages with debconf pre-seeding
- name: Pre-seed debconf answers
  ansible.builtin.debconf:
    name: "{{ package_name }}"
    question: "{{ item.question }}"
    value: "{{ item.value }}"
    vtype: "{{ item.vtype }}"
  loop: "{{ package_debconf }}"
  when: package_debconf | length > 0
  no_log: "{{ item.vtype == 'password' }}"

- name: Install the package non-interactively
  ansible.builtin.apt:
    name: "{{ package_name }}"
    state: "{{ package_state }}"
  environment:
    DEBIAN_FRONTEND: noninteractive
```

Usage of this role:

```yaml
# Use the generic package_installer role for Postfix
- hosts: mail_servers
  become: true
  roles:
    - role: package_installer
      vars:
        package_name: postfix
        package_debconf:
          - question: postfix/main_mailer_type
            value: "Internet Site"
            vtype: select
          - question: postfix/mailname
            value: "mail.company.com"
            vtype: string
```

## Security: Handling Passwords

When pre-seeding passwords, use `no_log: true` to prevent them from appearing in Ansible output.

```yaml
# Pre-seed a password securely (hidden from logs)
- name: Set database password via debconf
  ansible.builtin.debconf:
    name: mysql-server
    question: mysql-server/root_password
    value: "{{ vault_mysql_root_password }}"
    vtype: password
  no_log: true
```

Store the actual password in an Ansible Vault-encrypted file.

## Wrapping Up

The `debconf` module solves a specific but important problem: automating package installations that require interactive configuration. The workflow is always the same: discover the questions the package asks, pre-seed the answers with the `debconf` module, then install the package with `DEBIAN_FRONTEND=noninteractive`. This pattern works for any Debian/Ubuntu package that uses debconf, and it keeps your installations fully automated and repeatable. Always remember to use `no_log` for password fields and to test your debconf settings on a clean system to make sure they are complete.
