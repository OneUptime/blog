# How to Use Ansible to Manage npm Packages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, npm, Node.js, JavaScript, DevOps

Description: Learn how to install, update, and manage npm packages globally and per-project using the Ansible community.general.npm module with practical examples.

---

If you are deploying Node.js applications with Ansible, managing npm packages is going to be part of your workflow. Whether you need to install global CLI tools, run `npm install` for a project, or ensure specific package versions are pinned, Ansible has you covered with the `community.general.npm` module.

This post covers the practical patterns I use for npm package management in Ansible, from simple global installs to full application deployment pipelines.

## Prerequisites: Ensuring Node.js Is Installed

Before managing npm packages, you need Node.js and npm on the target system. Here is a reliable way to install a specific version using the NodeSource repository.

```yaml
# Install Node.js 20.x from NodeSource on Ubuntu
- name: Download NodeSource setup script
  ansible.builtin.get_url:
    url: https://deb.nodesource.com/setup_20.x
    dest: /tmp/nodesource_setup.sh
    mode: '0755'

- name: Run NodeSource setup script
  ansible.builtin.command:
    cmd: bash /tmp/nodesource_setup.sh
  changed_when: true

- name: Install Node.js
  ansible.builtin.apt:
    name: nodejs
    state: present
    update_cache: true
```

## Installing Global npm Packages

Global packages are CLI tools that should be available system-wide. The `community.general.npm` module makes this straightforward.

```yaml
# Install commonly used global npm packages
- name: Install PM2 process manager globally
  community.general.npm:
    name: pm2
    global: true
    state: present

- name: Install TypeScript compiler globally
  community.general.npm:
    name: typescript
    global: true
    state: present

- name: Install Yarn package manager globally
  community.general.npm:
    name: yarn
    global: true
    state: present
```

### Installing a Specific Version

Pin a specific version when you need reproducible deployments.

```yaml
# Install a specific version of a global package
- name: Install PM2 version 5.3.0 globally
  community.general.npm:
    name: pm2
    version: "5.3.0"
    global: true
    state: present
```

### Installing Multiple Global Packages

Use a loop for installing several global packages at once.

```yaml
# Install multiple global npm tools from a variable list
- name: Install global npm packages
  community.general.npm:
    name: "{{ item.name }}"
    version: "{{ item.version | default(omit) }}"
    global: true
    state: present
  loop:
    - { name: "pm2", version: "5.3.0" }
    - { name: "typescript" }
    - { name: "eslint" }
    - { name: "nodemon" }
    - { name: "npm-check-updates" }
```

## Installing Project Dependencies

The most common npm operation in a deployment context is running `npm install` (or `npm ci`) for a project. The `community.general.npm` module supports this through the `path` parameter.

```yaml
# Install project dependencies from package.json
- name: Install npm dependencies for the application
  community.general.npm:
    path: /opt/myapp
    state: present
```

This runs `npm install` in the `/opt/myapp` directory, installing all dependencies listed in `package.json`.

### Production-Only Dependencies

For production deployments, you typically want to skip devDependencies.

```yaml
# Install only production dependencies (skip devDependencies)
- name: Install production npm dependencies
  community.general.npm:
    path: /opt/myapp
    production: true
    state: present
```

### Clean Install with npm ci

For CI/CD pipelines and production deployments, `npm ci` is preferred over `npm install` because it performs a clean install based on `package-lock.json` and is faster and more deterministic.

```yaml
# Run npm ci for a deterministic, clean install
- name: Clean install npm dependencies
  community.general.npm:
    path: /opt/myapp
    ci: true
    state: present
```

## A Complete Node.js Application Deployment

Here is a realistic playbook that deploys a Node.js application, including dependency management.

```yaml
---
# playbook: deploy-node-app.yml
# Deploy a Node.js application with full npm dependency management
- hosts: app_servers
  become: true

  vars:
    app_name: myapi
    app_dir: /opt/{{ app_name }}
    app_user: nodeapp
    node_env: production

  tasks:
    - name: Create application user
      ansible.builtin.user:
        name: "{{ app_user }}"
        system: true
        shell: /bin/bash
        home: "{{ app_dir }}"

    - name: Create application directory
      ansible.builtin.file:
        path: "{{ app_dir }}"
        state: directory
        owner: "{{ app_user }}"
        group: "{{ app_user }}"
        mode: '0755'

    - name: Deploy application code
      ansible.builtin.git:
        repo: https://github.com/company/myapi.git
        dest: "{{ app_dir }}"
        version: "{{ app_version | default('main') }}"
      become_user: "{{ app_user }}"
      notify: restart app

    - name: Install production dependencies
      community.general.npm:
        path: "{{ app_dir }}"
        production: true
        ci: true
        state: present
      become_user: "{{ app_user }}"
      environment:
        NODE_ENV: "{{ node_env }}"
      notify: restart app

    - name: Install PM2 globally
      community.general.npm:
        name: pm2
        global: true
        state: present

    - name: Start application with PM2
      ansible.builtin.command:
        cmd: pm2 start ecosystem.config.js --env production
        chdir: "{{ app_dir }}"
      become_user: "{{ app_user }}"
      changed_when: true

    - name: Save PM2 process list
      ansible.builtin.command:
        cmd: pm2 save
      become_user: "{{ app_user }}"
      changed_when: true

    - name: Set up PM2 startup script
      ansible.builtin.command:
        cmd: "pm2 startup systemd -u {{ app_user }} --hp {{ app_dir }}"
      changed_when: true

  handlers:
    - name: restart app
      ansible.builtin.command:
        cmd: pm2 restart all
        chdir: "{{ app_dir }}"
      become_user: "{{ app_user }}"
```

## Managing npm Registry Configuration

In enterprise environments, you often use a private npm registry. Here is how to configure it.

```yaml
# Configure npm to use a private registry
- name: Set npm registry to Artifactory
  ansible.builtin.command:
    cmd: npm config set registry https://artifactory.company.com/api/npm/npm-remote/
  become_user: "{{ app_user }}"
  changed_when: true

# Or configure it per-project with an .npmrc file
- name: Create project .npmrc with registry configuration
  ansible.builtin.copy:
    dest: "{{ app_dir }}/.npmrc"
    content: |
      registry=https://artifactory.company.com/api/npm/npm-remote/
      //artifactory.company.com/api/npm/npm-remote/:_authToken=${NPM_TOKEN}
      strict-ssl=true
    owner: "{{ app_user }}"
    group: "{{ app_user }}"
    mode: '0600'
```

## Removing npm Packages

Removing packages works just like installing, but with `state: absent`.

```yaml
# Remove a global npm package
- name: Remove deprecated global package
  community.general.npm:
    name: grunt-cli
    global: true
    state: absent
```

## Updating npm Packages

To update a package to the latest version, use `state: latest`.

```yaml
# Update a global package to the latest version
- name: Update PM2 to latest version
  community.general.npm:
    name: pm2
    global: true
    state: latest
```

## Handling npm Cache

npm's cache can sometimes cause issues. You can clear it as part of your deployment.

```yaml
# Clear npm cache (useful when troubleshooting installation issues)
- name: Clear npm cache
  ansible.builtin.command:
    cmd: npm cache clean --force
  become_user: "{{ app_user }}"
  changed_when: true
```

## Setting npm Configuration Options

You can configure npm settings that affect how packages are installed.

```yaml
# Configure npm settings for the deployment
- name: Set npm configuration options
  ansible.builtin.command:
    cmd: "npm config set {{ item.key }} {{ item.value }}"
  loop:
    - { key: "audit", value: "false" }
    - { key: "fund", value: "false" }
    - { key: "loglevel", value: "warn" }
    - { key: "progress", value: "false" }
  changed_when: true
```

Disabling audit and fund messages speeds up installations and removes noise from your deployment logs.

## Wrapping Up

Managing npm packages with Ansible gives you repeatable, version-controlled deployments for your Node.js infrastructure. The key patterns to remember are: use `ci: true` and `production: true` for production deployments, pin versions for global tools, and consider private registry configuration in enterprise environments. Combined with PM2 for process management and proper systemd integration, you get a solid foundation for running Node.js applications in production.
