# How to Use Ansible to Deploy Applications with Git

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Git, Deployment, CI/CD, DevOps

Description: Deploy applications using Git with Ansible including branch management, deploy keys, rollback support, and release versioning.

---

Git-based deployment is one of the most straightforward ways to get code onto servers. Instead of building packages or containers, you pull the latest code directly from your repository. Ansible's built-in `git` module makes this clean and reliable. You get automatic tracking of what version is deployed, easy rollback to previous commits, and the ability to deploy specific branches or tags.

This guide covers using Ansible to deploy applications via Git, including deploy key management, release-based deployment strategies, and rollback capabilities.

## Simple Git Pull vs Release-Based Deployment

There are two main approaches to Git-based deployment:

1. **Simple Pull**: Update code in place. Fast and simple but no rollback capability.
2. **Release-Based**: Clone into timestamped directories and use symlinks. Supports instant rollback.

We will cover both approaches.

## Project Structure

```
git-deploy/
  inventory/
    hosts.yml
  group_vars/
    all.yml
  roles/
    git_deploy/
      tasks/
        main.yml
        simple.yml
        release.yml
      templates/
        post-deploy.sh.j2
      handlers/
        main.yml
  deploy.yml
  rollback.yml
```

## Variables

```yaml
# group_vars/all.yml
app_name: myapp
app_user: deploy
app_group: deploy
app_repo: git@github.com:yourorg/myapp.git
app_branch: main
app_dir: /opt/myapp
deploy_strategy: release  # simple or release
keep_releases: 5
post_deploy_commands:
  - "npm ci --production"
  - "npm run build"
deploy_key_path: /home/deploy/.ssh/deploy_key
```

## Deploy Key Management

Before deploying from a private repository, you need a deploy key. This task sets up SSH key-based access to your Git repository.

```yaml
# Task to configure a deploy key for Git access
- name: Create .ssh directory for deploy user
  file:
    path: "/home/{{ app_user }}/.ssh"
    state: directory
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0700'

- name: Deploy SSH private key for Git access
  copy:
    content: "{{ vault_deploy_key }}"
    dest: "{{ deploy_key_path }}"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0600'

- name: Configure SSH to use deploy key for GitHub
  copy:
    content: |
      Host github.com
        IdentityFile {{ deploy_key_path }}
        StrictHostKeyChecking no
        UserKnownHostsFile /dev/null
    dest: "/home/{{ app_user }}/.ssh/config"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0600'
```

## Simple Deployment Strategy

The simple approach pulls code directly into the application directory.

```yaml
# roles/git_deploy/tasks/simple.yml
---
- name: Create application directory
  file:
    path: "{{ app_dir }}"
    state: directory
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0755'

- name: Clone or update application from Git
  git:
    repo: "{{ app_repo }}"
    dest: "{{ app_dir }}"
    version: "{{ app_branch }}"
    force: yes
    accept_hostkey: yes
    key_file: "{{ deploy_key_path }}"
  become_user: "{{ app_user }}"
  register: git_result

- name: Display deployed version
  debug:
    msg: "Deployed commit: {{ git_result.after }}"
  when: git_result.changed

- name: Run post-deploy commands
  command: "{{ item }}"
  args:
    chdir: "{{ app_dir }}"
  become_user: "{{ app_user }}"
  loop: "{{ post_deploy_commands }}"
  when: git_result.changed
  notify: restart application
```

## Release-Based Deployment Strategy

This approach creates a new directory for each deployment and uses a symlink to point to the current release.

```yaml
# roles/git_deploy/tasks/release.yml
---
- name: Create shared directories
  file:
    path: "{{ item }}"
    state: directory
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0755'
  loop:
    - "{{ app_dir }}"
    - "{{ app_dir }}/releases"
    - "{{ app_dir }}/shared"
    - "{{ app_dir }}/shared/logs"
    - "{{ app_dir }}/shared/config"

- name: Generate release timestamp
  set_fact:
    release_timestamp: "{{ ansible_date_time.epoch }}"
    release_dir: "{{ app_dir }}/releases/{{ ansible_date_time.epoch }}"

- name: Clone application into new release directory
  git:
    repo: "{{ app_repo }}"
    dest: "{{ release_dir }}"
    version: "{{ app_branch }}"
    depth: 1
    accept_hostkey: yes
    key_file: "{{ deploy_key_path }}"
  become_user: "{{ app_user }}"
  register: git_result

- name: Save the deployed commit hash
  copy:
    content: "{{ git_result.after }}"
    dest: "{{ release_dir }}/REVISION"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0644'

- name: Link shared directories into the release
  file:
    src: "{{ app_dir }}/shared/{{ item }}"
    dest: "{{ release_dir }}/{{ item }}"
    state: link
    force: yes
  loop:
    - logs
    - config
  become_user: "{{ app_user }}"

- name: Run post-deploy commands in the release directory
  command: "{{ item }}"
  args:
    chdir: "{{ release_dir }}"
  become_user: "{{ app_user }}"
  loop: "{{ post_deploy_commands }}"

- name: Update the current symlink to the new release
  file:
    src: "{{ release_dir }}"
    dest: "{{ app_dir }}/current"
    state: link
    force: yes
  notify: restart application

- name: Find old releases to clean up
  find:
    paths: "{{ app_dir }}/releases"
    file_type: directory
  register: all_releases

- name: Remove old releases beyond retention limit
  file:
    path: "{{ item.path }}"
    state: absent
  loop: "{{ (all_releases.files | sort(attribute='mtime') | list)[:-keep_releases] }}"
  when: all_releases.files | length > keep_releases
```

## Main Tasks

```yaml
# roles/git_deploy/tasks/main.yml
---
- name: Include simple deployment strategy
  include_tasks: simple.yml
  when: deploy_strategy == "simple"

- name: Include release-based deployment strategy
  include_tasks: release.yml
  when: deploy_strategy == "release"
```

## Rollback Playbook

This separate playbook lets you quickly roll back to a previous release.

```yaml
# rollback.yml
---
- name: Rollback to Previous Release
  hosts: all
  become: yes
  tasks:
    - name: Find all releases
      find:
        paths: "{{ app_dir }}/releases"
        file_type: directory
      register: all_releases

    - name: Sort releases by modification time
      set_fact:
        sorted_releases: "{{ all_releases.files | sort(attribute='mtime') | map(attribute='path') | list }}"

    - name: Identify current release
      stat:
        path: "{{ app_dir }}/current"
      register: current_link

    - name: Identify previous release
      set_fact:
        previous_release: "{{ sorted_releases[-2] }}"
      when: sorted_releases | length >= 2

    - name: Fail if no previous release exists
      fail:
        msg: "No previous release found to roll back to"
      when: sorted_releases | length < 2

    - name: Read previous release commit
      slurp:
        src: "{{ previous_release }}/REVISION"
      register: previous_commit

    - name: Display rollback information
      debug:
        msg: "Rolling back to release {{ previous_release }} (commit: {{ previous_commit.content | b64decode | trim }})"

    - name: Update symlink to previous release
      file:
        src: "{{ previous_release }}"
        dest: "{{ app_dir }}/current"
        state: link
        force: yes
      notify: restart application

    - name: Remove the failed release
      file:
        path: "{{ sorted_releases[-1] }}"
        state: absent
      when: remove_failed_release | default(false)
```

## Deploying Specific Tags or Commits

You can deploy a specific Git tag or commit hash by overriding the branch variable:

```bash
# Deploy a specific tag
ansible-playbook -i inventory/hosts.yml deploy.yml -e "app_branch=v2.1.0"

# Deploy a specific commit
ansible-playbook -i inventory/hosts.yml deploy.yml -e "app_branch=abc123f"
```

## Deployment with Submodules

If your project uses Git submodules:

```yaml
# Clone with submodule support
- name: Clone application with submodules
  git:
    repo: "{{ app_repo }}"
    dest: "{{ release_dir }}"
    version: "{{ app_branch }}"
    recursive: yes  # Initialize and update submodules
    accept_hostkey: yes
    key_file: "{{ deploy_key_path }}"
  become_user: "{{ app_user }}"
```

## Handlers

```yaml
# roles/git_deploy/handlers/main.yml
---
- name: restart application
  systemd:
    name: "{{ app_name }}"
    state: restarted
```

## Running the Deployment

```bash
# Deploy using the release strategy
ansible-playbook -i inventory/hosts.yml deploy.yml

# Deploy using the simple strategy
ansible-playbook -i inventory/hosts.yml deploy.yml -e "deploy_strategy=simple"

# Rollback to the previous release
ansible-playbook -i inventory/hosts.yml rollback.yml
```

## Wrapping Up

Git-based deployment with Ansible is simple, reliable, and gives you good visibility into what is running on each server. The release-based strategy adds rollback capability with minimal overhead, since switching releases is just a symlink swap. Combined with deploy keys for secure repository access and post-deploy hooks for build steps, this approach works well for most applications. Whether you deploy from CI/CD pipelines or manually, the Ansible playbook ensures consistency across all your servers.
