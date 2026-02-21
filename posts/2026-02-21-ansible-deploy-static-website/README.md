# How to Use Ansible to Deploy a Static Website

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Static Website, Nginx, Deployment, DevOps

Description: Deploy static websites with Ansible including Nginx configuration, build steps, cache headers, and multi-environment support.

---

Static websites are fast, secure, and simple. Whether you build with Hugo, Jekyll, Next.js static export, or plain HTML, deploying them involves copying files to a web server and configuring proper caching. While you could use S3 or Netlify, sometimes you need to deploy to your own servers for compliance, performance, or cost reasons. Ansible makes this straightforward and repeatable.

This guide covers deploying static sites with Ansible, including build steps, Nginx configuration, cache optimization, and multi-environment support.

## What We Will Cover

- Building static sites locally before deployment
- Syncing built files to remote servers
- Configuring Nginx for optimal static file serving
- Setting proper cache headers
- Supporting multiple environments (staging, production)

## Project Structure

```
static-deploy/
  inventory/
    staging.yml
    production.yml
  group_vars/
    staging.yml
    production.yml
  roles/
    static_site/
      tasks/
        main.yml
      templates/
        nginx.conf.j2
      handlers/
        main.yml
  deploy.yml
```

## Inventory Files

```yaml
# inventory/production.yml
all:
  hosts:
    web1:
      ansible_host: 10.0.1.10
    web2:
      ansible_host: 10.0.1.11
  vars:
    ansible_user: deploy
    env_name: production
```

```yaml
# inventory/staging.yml
all:
  hosts:
    staging1:
      ansible_host: 10.0.2.10
  vars:
    ansible_user: deploy
    env_name: staging
```

## Variables Per Environment

```yaml
# group_vars/production.yml
site_domain: www.example.com
site_dir: /var/www/example.com
build_dir: ../site/dist
enable_gzip: true
cache_max_age: "30d"
enable_security_headers: true
```

```yaml
# group_vars/staging.yml
site_domain: staging.example.com
site_dir: /var/www/staging.example.com
build_dir: ../site/dist
enable_gzip: true
cache_max_age: "1h"
enable_security_headers: false
```

## Build Step

Before deploying, we build the static site locally. This pre-task runs on the control machine.

```yaml
# deploy.yml
---
- name: Build static site locally
  hosts: localhost
  connection: local
  gather_facts: no
  tasks:
    - name: Install npm dependencies
      command: npm ci
      args:
        chdir: ../site
      changed_when: false

    - name: Build the static site
      command: npm run build
      args:
        chdir: ../site
      changed_when: false

    - name: Verify build output exists
      stat:
        path: "{{ build_dir }}/index.html"
      register: build_check

    - name: Fail if build output is missing
      fail:
        msg: "Build directory does not contain index.html. Check your build script."
      when: not build_check.stat.exists

- name: Deploy static site to servers
  hosts: all
  become: yes
  serial: 1
  roles:
    - static_site
```

## Role Tasks

```yaml
# roles/static_site/tasks/main.yml
---
- name: Install Nginx
  apt:
    name: nginx
    state: present
    update_cache: yes

- name: Create site directory
  file:
    path: "{{ site_dir }}"
    state: directory
    owner: www-data
    group: www-data
    mode: '0755'

- name: Synchronize static files to the server
  synchronize:
    src: "{{ build_dir }}/"
    dest: "{{ site_dir }}/"
    delete: yes
    recursive: yes
    rsync_opts:
      - "--exclude=.git"
      - "--exclude=.DS_Store"
      - "--checksum"
  notify: reload nginx

- name: Set ownership on deployed files
  file:
    path: "{{ site_dir }}"
    state: directory
    owner: www-data
    group: www-data
    recurse: yes

- name: Deploy Nginx site configuration
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/sites-available/{{ site_domain }}
    mode: '0644'
  notify: reload nginx

- name: Enable the site in Nginx
  file:
    src: /etc/nginx/sites-available/{{ site_domain }}
    dest: /etc/nginx/sites-enabled/{{ site_domain }}
    state: link
  notify: reload nginx

- name: Remove default Nginx site
  file:
    path: /etc/nginx/sites-enabled/default
    state: absent
  notify: reload nginx

- name: Verify site is accessible
  uri:
    url: "http://localhost"
    status_code: 200
  retries: 3
  delay: 2
```

## Nginx Configuration

The Nginx template is optimized for static file serving with proper caching and compression.

```nginx
# roles/static_site/templates/nginx.conf.j2
server {
    listen 80;
    server_name {{ site_domain }};
    root {{ site_dir }};
    index index.html;

{% if enable_gzip %}
    # Enable gzip compression for text-based assets
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 256;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/json
        application/xml
        application/rss+xml
        image/svg+xml;
{% endif %}

{% if enable_security_headers %}
    # Security headers for production
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';" always;
{% endif %}

    # HTML files should not be cached aggressively
    location ~* \.html$ {
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }

    # CSS, JS, and font files with hashed filenames can be cached long-term
    location ~* \.(css|js|woff|woff2|ttf|eot)$ {
        expires {{ cache_max_age }};
        add_header Cache-Control "public, immutable";
    }

    # Image files
    location ~* \.(png|jpg|jpeg|gif|ico|svg|webp|avif)$ {
        expires {{ cache_max_age }};
        add_header Cache-Control "public";
    }

    # SPA fallback: serve index.html for all routes that do not match a file
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Block access to hidden files
    location ~ /\. {
        deny all;
        return 404;
    }

    # Custom 404 page
    error_page 404 /404.html;
    location = /404.html {
        internal;
    }
}
```

## Handlers

```yaml
# roles/static_site/handlers/main.yml
---
- name: reload nginx
  systemd:
    name: nginx
    state: reloaded
```

## Running the Deployment

Deploy to staging first, then production:

```bash
# Deploy to staging environment
ansible-playbook -i inventory/staging.yml deploy.yml

# Deploy to production after verifying staging
ansible-playbook -i inventory/production.yml deploy.yml
```

## Adding Cache Busting

If your build tool does not generate hashed filenames, you can add cache busting with a deploy timestamp:

```yaml
# Add a version file that helps with cache debugging
- name: Create version file with deployment metadata
  copy:
    content: |
      {
        "version": "{{ lookup('pipe', 'git -C ../site rev-parse --short HEAD') }}",
        "deployed_at": "{{ ansible_date_time.iso8601 }}",
        "environment": "{{ env_name }}"
      }
    dest: "{{ site_dir }}/version.json"
    owner: www-data
    group: www-data
    mode: '0644'
```

## Deploying from a CI Pipeline

In a CI/CD pipeline, the build step happens in the pipeline and Ansible only handles the deployment:

```yaml
# ci-deploy.yml - Used when build artifacts already exist
---
- name: Deploy pre-built static site
  hosts: all
  become: yes
  serial: 1
  vars:
    build_dir: "{{ lookup('env', 'BUILD_ARTIFACT_PATH') }}"
  roles:
    - static_site
```

```bash
# In your CI pipeline
export BUILD_ARTIFACT_PATH=/tmp/build-output
ansible-playbook -i inventory/production.yml ci-deploy.yml
```

## Atomic Deployments

For zero-downtime deployments, use a symlink swap strategy:

```yaml
# Deploy to a timestamped directory, then swap the symlink
- name: Create release directory
  file:
    path: "/var/www/releases/{{ ansible_date_time.epoch }}"
    state: directory
    owner: www-data
    group: www-data

- name: Copy files to release directory
  synchronize:
    src: "{{ build_dir }}/"
    dest: "/var/www/releases/{{ ansible_date_time.epoch }}/"
    delete: yes

- name: Update current symlink to new release
  file:
    src: "/var/www/releases/{{ ansible_date_time.epoch }}"
    dest: "{{ site_dir }}"
    state: link
    force: yes
  notify: reload nginx

- name: Clean up old releases, keep last 5
  shell: |
    ls -dt /var/www/releases/*/ | tail -n +6 | xargs rm -rf
  changed_when: false
```

## Wrapping Up

Deploying static websites with Ansible might seem like overkill, but it pays off when you manage multiple environments, need consistent server configuration, or deploy across several servers. The `synchronize` module uses rsync under the hood, so only changed files are transferred. Combined with proper Nginx caching headers, your static site will be fast and efficient. This setup works with any static site generator or even hand-written HTML.
