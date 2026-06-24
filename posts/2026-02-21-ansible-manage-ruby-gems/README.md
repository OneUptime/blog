# How to Use Ansible to Manage Ruby Gems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ruby, Gem, DevOps, Configuration Management

Description: A practical guide to installing, managing, and automating Ruby gem packages across your infrastructure using the Ansible gem module.

---

Ruby gems are the standard packaging format for Ruby libraries and applications. Whether you are deploying a Rails application, installing a Ruby-based tool like Sass or Bundler, or managing a legacy Ruby infrastructure, Ansible provides the `community.general.gem` module to handle gem installations in an automated and idempotent way.

In this post, I will cover the common patterns for managing Ruby gems with Ansible, from basic installations to full application deployment workflows.

## Prerequisites: Installing Ruby

Before managing gems, you need Ruby installed on the target system. There are several approaches depending on your needs.

### System Ruby

The simplest approach is using the system package manager.

```yaml
# Install Ruby from system packages

- name: Install Ruby and development headers
  ansible.builtin.package:
    name:
      - ruby
      - ruby-dev
      - build-essential
    state: present
  when: ansible_os_family == "Debian"

- name: Install Ruby on RHEL
  ansible.builtin.dnf:
    name:
      - ruby
      - ruby-devel
      - gcc
      - make
    state: present
  when: ansible_os_family == "RedHat"
```

### Using rbenv for Version Management

For production applications that need a specific Ruby version, rbenv is a popular choice.

```yaml
# Install rbenv and ruby-build for the deploy user
- name: Install rbenv dependencies
  ansible.builtin.apt:
    name:
      - git
      - curl
      - libssl-dev
      - libreadline-dev
      - zlib1g-dev
      - autoconf
      - bison
      - build-essential
      - libyaml-dev
      - libffi-dev
    state: present

- name: Clone rbenv repository
  ansible.builtin.git:
    repo: https://github.com/rbenv/rbenv.git
    dest: "/home/{{ deploy_user }}/.rbenv"
  become_user: "{{ deploy_user }}"

- name: Clone ruby-build plugin
  ansible.builtin.git:
    repo: https://github.com/rbenv/ruby-build.git
    dest: "/home/{{ deploy_user }}/.rbenv/plugins/ruby-build"
  become_user: "{{ deploy_user }}"

- name: Add rbenv to PATH
  ansible.builtin.lineinfile:
    path: "/home/{{ deploy_user }}/.bashrc"
    line: 'export PATH="$HOME/.rbenv/bin:$HOME/.rbenv/shims:$PATH"'
    state: present
  become_user: "{{ deploy_user }}"
```

## Installing Gems with the gem Module

The `community.general.gem` module provides a clean interface for managing Ruby gems.

### Basic Installation

```yaml
# Install a Ruby gem
- name: Install Bundler
  community.general.gem:
    name: bundler
    state: present

- name: Install a specific version of Bundler
  community.general.gem:
    name: bundler
    version: "2.4.19"
    state: present
```

### Installing Multiple Gems

Use a loop to install several gems.

```yaml
# Install multiple Ruby gems from a list
- name: Install common Ruby tools
  community.general.gem:
    name: "{{ item.name }}"
    version: "{{ item.version | default(omit) }}"
    state: present
  loop:
    - { name: "bundler", version: "2.4.19" }
    - { name: "rake" }
    - { name: "thor" }
    - { name: "pry" }
```

### User-Level vs System-Level Installation

By default, the Ansible module installs gems in the user's local gem cache. Set `user_install: false` when you want a system-wide installation instead.

```yaml
# Install a gem for a specific user (no root required)
- name: Install bundler for the deploy user
  community.general.gem:
    name: bundler
    state: present
    user_install: true
  become_user: deploy
  environment:
    GEM_HOME: "/home/deploy/.gem/ruby/3.1.0"
    PATH: "/home/deploy/.gem/ruby/3.1.0/bin:{{ ansible_env.PATH }}"
```

### Using a Specific Ruby Executable

If you have multiple Ruby versions installed (via rbenv, rvm, or system packages), you can specify which Ruby to use for the gem installation.

```yaml
# Install a gem using a specific Ruby version from rbenv
- name: Install bundler using rbenv Ruby
  community.general.gem:
    name: bundler
    executable: "/home/deploy/.rbenv/shims/gem"
    user_install: false
    state: present
  become_user: deploy
```

## Installing Gems from a Gemfile with Bundler

In most Ruby projects, dependencies are managed through a Gemfile and installed using Bundler. The `bundler` module from the community collection handles this.

```yaml
# Install project dependencies using Bundler
- name: Install application gems with Bundler
  community.general.bundler:
    state: present
    chdir: /opt/myapp
    deployment_mode: true
    exclude_groups:
      - development
      - test
  become_user: deploy
  environment:
    BUNDLE_PATH: "/opt/myapp/vendor/bundle"
```

The `deployment_mode` flag enables Bundler's deployment mode, which requires an up-to-date Gemfile.lock and installs gems into `vendor/bundle`.

## A Complete Rails Application Deployment

Here is a realistic playbook for deploying a Ruby on Rails application, assuming rbenv and the target Ruby version have already been installed for the deploy user.

```yaml
---
# playbook: deploy-rails-app.yml
# Deploy a Rails application with gem management
- hosts: app_servers
  become: true

  vars:
    app_name: myapp
    app_dir: /opt/{{ app_name }}
    deploy_user: deploy
    rails_env: production

  tasks:
    - name: Ensure deploy group exists
      ansible.builtin.group:
        name: "{{ deploy_user }}"
        system: true

    - name: Ensure deploy user exists
      ansible.builtin.user:
        name: "{{ deploy_user }}"
        group: "{{ deploy_user }}"
        system: true
        shell: /bin/bash
        home: "/home/{{ deploy_user }}"

    - name: Install system dependencies for gem compilation
      ansible.builtin.apt:
        name:
          - build-essential
          - libpq-dev
          - libxml2-dev
          - libxslt1-dev
          - nodejs
          - imagemagick
        state: present

    - name: Ensure application directory exists
      ansible.builtin.file:
        path: "{{ app_dir }}"
        state: directory
        owner: "{{ deploy_user }}"
        group: "{{ deploy_user }}"
        mode: '0755'

    - name: Deploy application code
      ansible.builtin.git:
        repo: "https://github.com/company/{{ app_name }}.git"
        dest: "{{ app_dir }}"
        version: "{{ app_version | default('main') }}"
      become_user: "{{ deploy_user }}"
      register: code_deployed

    - name: Install Bundler
      community.general.gem:
        name: bundler
        version: "2.4.19"
        executable: "/home/{{ deploy_user }}/.rbenv/shims/gem"
        user_install: false
        state: present
      become_user: "{{ deploy_user }}"

    - name: Refresh rbenv shims
      ansible.builtin.command:
        cmd: "/home/{{ deploy_user }}/.rbenv/bin/rbenv rehash"
      become_user: "{{ deploy_user }}"
      changed_when: false

    - name: Install application gems
      community.general.bundler:
        state: present
        chdir: "{{ app_dir }}"
        deployment_mode: true
        exclude_groups:
          - development
          - test
      become_user: "{{ deploy_user }}"
      environment:
        PATH: "/home/{{ deploy_user }}/.rbenv/shims:/home/{{ deploy_user }}/.rbenv/bin:{{ ansible_env.PATH }}"
        RAILS_ENV: "{{ rails_env }}"
      when: code_deployed.changed

    - name: Run database migrations
      ansible.builtin.command:
        cmd: bundle exec rake db:migrate
        chdir: "{{ app_dir }}"
      become_user: "{{ deploy_user }}"
      environment:
        PATH: "/home/{{ deploy_user }}/.rbenv/shims:{{ ansible_env.PATH }}"
        RAILS_ENV: "{{ rails_env }}"
      when: code_deployed.changed

    - name: Precompile assets
      ansible.builtin.command:
        cmd: bundle exec rake assets:precompile
        chdir: "{{ app_dir }}"
      become_user: "{{ deploy_user }}"
      environment:
        PATH: "/home/{{ deploy_user }}/.rbenv/shims:{{ ansible_env.PATH }}"
        RAILS_ENV: "{{ rails_env }}"
      when: code_deployed.changed

    - name: Restart application server
      ansible.builtin.systemd:
        name: "{{ app_name }}"
        state: restarted
      when: code_deployed.changed
```

## Removing Gems

Remove a gem by setting `state: absent`.

```yaml
# Remove an unused gem
- name: Remove deprecated gem
  community.general.gem:
    name: sass
    state: absent
```

## Installing Pre-Release Gems

For testing purposes, you might need pre-release versions.

```yaml
# Install a pre-release version of a gem
- name: Install pre-release version
  community.general.gem:
    name: rails
    version: "7.1.0.rc1"
    pre_release: true
    state: present
```

## Configuring Gem Sources

If you use a private gem server (like Gemfury or a self-hosted Geminabox), you can configure the source.

```yaml
# Configure a private gem source
- name: Add private gem source
  ansible.builtin.command:
    cmd: gem sources --prepend https://gems.company.com/
  register: private_source
  changed_when: "'added to sources' in private_source.stdout or 'moved to front of sources' in private_source.stdout"

# Install from the private source
- name: Install private gem
  community.general.gem:
    name: company-utils
    source: https://gems.company.com/
    state: present
```

## Managing Gem Documentation

The Ansible module skips documentation by default. For gems installed directly with the `gem` command, you can disable documentation globally.

```yaml
# Disable gem documentation generation on servers
- name: Create gemrc to skip documentation
  ansible.builtin.copy:
    dest: /etc/gemrc
    content: |
      gem: --no-document
    mode: '0644'
```

## Wrapping Up

Managing Ruby gems with Ansible is about picking the right tool for the job. For global CLI tools, the `community.general.gem` module works well when you set `user_install: false`. For application dependencies, pair the `bundler` module with a proper deployment workflow. Always consider which Ruby version you are targeting, whether gems should be system-level or user-level, and how to handle native extension compilation dependencies. With these patterns in place, your Ruby deployments will be repeatable, consistent, and fully automated.
