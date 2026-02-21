# How to Use Ansible to Manage Ruby Gems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ruby, Gems, DevOps, Configuration Management

Description: A practical guide to installing, managing, and automating Ruby gem packages across your infrastructure using the Ansible gem module.

---

Ruby gems are the standard packaging format for Ruby libraries and applications. Whether you are deploying a Rails application, installing a Ruby-based tool like Sass or Bundler, or managing a legacy Ruby infrastructure, Ansible provides the `gem` module to handle gem installations in an automated and idempotent way.

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

The `ansible.builtin.gem` module provides a clean interface for managing Ruby gems.

### Basic Installation

```yaml
# Install a Ruby gem
- name: Install Bundler
  ansible.builtin.gem:
    name: bundler
    state: present

- name: Install a specific version of Bundler
  ansible.builtin.gem:
    name: bundler
    version: "2.4.19"
    state: present
```

### Installing Multiple Gems

Use a loop to install several gems.

```yaml
# Install multiple Ruby gems from a list
- name: Install common Ruby tools
  ansible.builtin.gem:
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

By default, gems are installed to the system gem directory (requires root). You can install gems for a specific user instead.

```yaml
# Install a gem for a specific user (no root required)
- name: Install bundler for the deploy user
  ansible.builtin.gem:
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
  ansible.builtin.gem:
    name: bundler
    executable: "/home/deploy/.rbenv/shims/gem"
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

The `deployment_mode` flag is equivalent to `bundle install --deployment`, which installs gems into the `vendor/bundle` directory and ensures the Gemfile.lock is respected exactly.

## A Complete Rails Application Deployment

Here is a realistic playbook for deploying a Ruby on Rails application.

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
    ruby_version: "3.2.2"
    rails_env: production

  tasks:
    - name: Ensure deploy user exists
      ansible.builtin.user:
        name: "{{ deploy_user }}"
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

    - name: Deploy application code
      ansible.builtin.git:
        repo: "https://github.com/company/{{ app_name }}.git"
        dest: "{{ app_dir }}"
        version: "{{ app_version | default('main') }}"
      become_user: "{{ deploy_user }}"
      register: code_deployed

    - name: Install Bundler
      ansible.builtin.gem:
        name: bundler
        version: "2.4.19"
        executable: "/home/{{ deploy_user }}/.rbenv/shims/gem"
        state: present
      become_user: "{{ deploy_user }}"

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
  ansible.builtin.gem:
    name: sass
    state: absent
```

## Installing Pre-Release Gems

For testing purposes, you might need pre-release versions.

```yaml
# Install a pre-release version of a gem
- name: Install pre-release version
  ansible.builtin.gem:
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
    cmd: gem sources --add https://gems.company.com/
  changed_when: true

# Install from the private source
- name: Install private gem
  ansible.builtin.gem:
    name: company-utils
    source: https://gems.company.com/
    state: present
```

## Managing Gem Documentation

By default, gem installations generate documentation, which is slow and unnecessary on servers. You can disable this globally.

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

Managing Ruby gems with Ansible is about picking the right tool for the job. For global CLI tools, the `gem` module works perfectly. For application dependencies, pair the `bundler` module with a proper deployment workflow. Always consider which Ruby version you are targeting, whether gems should be system-level or user-level, and how to handle native extension compilation dependencies. With these patterns in place, your Ruby deployments will be repeatable, consistent, and fully automated.
