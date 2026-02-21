# How to Use Ansible to Install Packages from Source

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Linux, Compilation, Source Installation, DevOps

Description: A practical guide to automating source code compilation and installation with Ansible, covering dependency management, configure/make workflows, and checkinstall integration.

---

Sometimes the version of a package in your distribution's repositories is too old, or the package simply does not exist as a pre-built binary. In these cases, compiling from source is the answer. Doing this manually is tedious enough on one server. Across a fleet of machines, it becomes a serious time sink. Ansible can automate the entire build-from-source workflow: downloading the source, installing build dependencies, configuring, compiling, and installing.

Let me walk through the patterns that make source installations reliable and repeatable with Ansible.

## The General Pattern

Most source installations follow the classic `./configure && make && make install` pattern. Here is how that translates to Ansible.

```yaml
# Generic pattern for building software from source
- name: Install build dependencies
  ansible.builtin.apt:
    name:
      - build-essential
      - curl
    state: present

- name: Download source tarball
  ansible.builtin.get_url:
    url: "https://example.com/software-1.0.tar.gz"
    dest: /tmp/software-1.0.tar.gz
    checksum: "sha256:abc123..."

- name: Extract source tarball
  ansible.builtin.unarchive:
    src: /tmp/software-1.0.tar.gz
    dest: /usr/local/src/
    remote_src: true

- name: Configure the build
  ansible.builtin.command:
    cmd: ./configure --prefix=/usr/local
    chdir: /usr/local/src/software-1.0
    creates: /usr/local/src/software-1.0/Makefile

- name: Compile the source
  ansible.builtin.command:
    cmd: "make -j{{ ansible_processor_vcpus }}"
    chdir: /usr/local/src/software-1.0
    creates: /usr/local/src/software-1.0/src/software

- name: Install the compiled binary
  ansible.builtin.command:
    cmd: make install
    chdir: /usr/local/src/software-1.0
    creates: /usr/local/bin/software
```

The `creates` parameter is the key to idempotency here. It tells Ansible to skip the task if the specified file already exists, so re-running the playbook does not trigger unnecessary recompilation.

## Real Example: Building Redis from Source

Let me show a complete, working example of building Redis from source. This is useful when you need a newer version than what your distribution provides.

```yaml
---
# playbook: install-redis-from-source.yml
# Build and install Redis from source for the latest version
- hosts: redis_servers
  become: true

  vars:
    redis_version: "7.2.4"
    redis_download_url: "https://download.redis.io/releases/redis-{{ redis_version }}.tar.gz"
    redis_install_dir: "/usr/local"
    redis_src_dir: "/usr/local/src/redis-{{ redis_version }}"

  tasks:
    - name: Install build dependencies
      ansible.builtin.apt:
        name:
          - build-essential
          - tcl
          - pkg-config
          - libsystemd-dev
        state: present
        update_cache: true

    - name: Create redis user
      ansible.builtin.user:
        name: redis
        system: true
        shell: /usr/sbin/nologin
        home: /var/lib/redis
        create_home: false

    - name: Download Redis source
      ansible.builtin.get_url:
        url: "{{ redis_download_url }}"
        dest: "/tmp/redis-{{ redis_version }}.tar.gz"
        mode: '0644'

    - name: Extract Redis source
      ansible.builtin.unarchive:
        src: "/tmp/redis-{{ redis_version }}.tar.gz"
        dest: /usr/local/src/
        remote_src: true
        creates: "{{ redis_src_dir }}/Makefile"

    - name: Compile Redis
      ansible.builtin.command:
        cmd: "make -j{{ ansible_processor_vcpus }} BUILD_TLS=yes USE_SYSTEMD=yes"
        chdir: "{{ redis_src_dir }}"
        creates: "{{ redis_src_dir }}/src/redis-server"

    - name: Run Redis tests
      ansible.builtin.command:
        cmd: make test
        chdir: "{{ redis_src_dir }}"
      changed_when: false
      when: redis_run_tests | default(false)

    - name: Install Redis
      ansible.builtin.command:
        cmd: make install PREFIX={{ redis_install_dir }}
        chdir: "{{ redis_src_dir }}"
        creates: "{{ redis_install_dir }}/bin/redis-server"

    - name: Create Redis configuration directory
      ansible.builtin.file:
        path: /etc/redis
        state: directory
        mode: '0755'

    - name: Create Redis data directory
      ansible.builtin.file:
        path: /var/lib/redis
        state: directory
        owner: redis
        group: redis
        mode: '0750'

    - name: Copy Redis configuration
      ansible.builtin.copy:
        src: "{{ redis_src_dir }}/redis.conf"
        dest: /etc/redis/redis.conf
        remote_src: true
        mode: '0644'
        force: false

    - name: Create systemd service file
      ansible.builtin.copy:
        dest: /etc/systemd/system/redis.service
        content: |
          [Unit]
          Description=Redis In-Memory Data Store
          After=network.target

          [Service]
          Type=notify
          User=redis
          Group=redis
          ExecStart={{ redis_install_dir }}/bin/redis-server /etc/redis/redis.conf
          ExecStop={{ redis_install_dir }}/bin/redis-cli shutdown
          Restart=always
          RestartSec=3
          LimitNOFILE=65535

          [Install]
          WantedBy=multi-user.target
        mode: '0644'
      notify: reload systemd

    - name: Enable and start Redis
      ansible.builtin.systemd:
        name: redis
        state: started
        enabled: true
        daemon_reload: true

  handlers:
    - name: reload systemd
      ansible.builtin.systemd:
        daemon_reload: true
```

## Building from a Git Repository

Some projects are best built from their Git repository, especially when you need a specific commit or branch.

```yaml
# Build nginx with custom modules from Git source
- name: Install nginx build dependencies
  ansible.builtin.apt:
    name:
      - build-essential
      - libpcre3-dev
      - zlib1g-dev
      - libssl-dev
      - libgd-dev
      - git
    state: present

- name: Clone nginx source
  ansible.builtin.git:
    repo: https://github.com/nginx/nginx.git
    dest: /usr/local/src/nginx
    version: "release-1.25.3"

- name: Clone headers-more module
  ansible.builtin.git:
    repo: https://github.com/openresty/headers-more-nginx-module.git
    dest: /usr/local/src/headers-more-nginx-module
    version: "v0.37"

- name: Configure nginx with custom modules
  ansible.builtin.command:
    cmd: >
      auto/configure
      --prefix=/etc/nginx
      --sbin-path=/usr/sbin/nginx
      --with-http_ssl_module
      --with-http_v2_module
      --with-http_gzip_static_module
      --add-module=/usr/local/src/headers-more-nginx-module
    chdir: /usr/local/src/nginx
    creates: /usr/local/src/nginx/objs/Makefile

- name: Compile nginx
  ansible.builtin.command:
    cmd: "make -j{{ ansible_processor_vcpus }}"
    chdir: /usr/local/src/nginx
    creates: /usr/local/src/nginx/objs/nginx

- name: Install nginx
  ansible.builtin.command:
    cmd: make install
    chdir: /usr/local/src/nginx
    creates: /usr/sbin/nginx
```

## Using checkinstall for Clean Uninstallation

One problem with `make install` is that it scatters files across the filesystem with no clean way to uninstall. The `checkinstall` tool solves this by creating a `.deb` or `.rpm` package from the `make install` step.

```yaml
# Use checkinstall to create a .deb package from source build
- name: Install checkinstall
  ansible.builtin.apt:
    name: checkinstall
    state: present

- name: Build and package with checkinstall
  ansible.builtin.command:
    cmd: >
      checkinstall
      --default
      --pkgname=redis-custom
      --pkgversion={{ redis_version }}
      --pakdir=/tmp
      --requires="libc6"
      --maintainer="ops@company.com"
      make install PREFIX=/usr/local
    chdir: "{{ redis_src_dir }}"
    creates: /usr/local/bin/redis-server
```

Now you can uninstall with `dpkg -r redis-custom` and the package manager knows about the installed files.

## Handling Version Upgrades

When you need to upgrade a source-built package, the pattern involves removing the old version and building the new one.

```yaml
# Upgrade a source-built application
- name: Check current version
  ansible.builtin.command:
    cmd: /usr/local/bin/redis-server --version
  register: current_version
  changed_when: false
  failed_when: false

- name: Build new version if needed
  block:
    - name: Stop the service
      ansible.builtin.systemd:
        name: redis
        state: stopped

    - name: Download new source
      ansible.builtin.get_url:
        url: "{{ redis_download_url }}"
        dest: "/tmp/redis-{{ redis_version }}.tar.gz"

    - name: Extract and build
      ansible.builtin.unarchive:
        src: "/tmp/redis-{{ redis_version }}.tar.gz"
        dest: /usr/local/src/
        remote_src: true

    - name: Compile
      ansible.builtin.command:
        cmd: "make -j{{ ansible_processor_vcpus }}"
        chdir: "{{ redis_src_dir }}"

    - name: Install
      ansible.builtin.command:
        cmd: make install PREFIX=/usr/local
        chdir: "{{ redis_src_dir }}"

    - name: Start the service
      ansible.builtin.systemd:
        name: redis
        state: started
  when: "redis_version not in (current_version.stdout | default(''))"
```

## CMake-Based Projects

Not all projects use autotools. Many modern projects use CMake instead.

```yaml
# Build a CMake-based project
- name: Install CMake and dependencies
  ansible.builtin.apt:
    name:
      - cmake
      - build-essential
      - ninja-build
    state: present

- name: Create build directory
  ansible.builtin.file:
    path: /usr/local/src/myproject/build
    state: directory
    mode: '0755'

- name: Run CMake configuration
  ansible.builtin.command:
    cmd: cmake -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/usr/local ..
    chdir: /usr/local/src/myproject/build
    creates: /usr/local/src/myproject/build/build.ninja

- name: Build with Ninja
  ansible.builtin.command:
    cmd: ninja
    chdir: /usr/local/src/myproject/build
    creates: /usr/local/src/myproject/build/myproject

- name: Install
  ansible.builtin.command:
    cmd: ninja install
    chdir: /usr/local/src/myproject/build
    creates: /usr/local/bin/myproject
```

## Wrapping Up

Building from source with Ansible requires more effort than using pre-built packages, but sometimes there is no alternative. The key to making it work well is idempotency through the `creates` parameter, proper dependency management, and a clear upgrade path. Consider using `checkinstall` to create proper packages from your source builds, as it makes uninstallation and tracking much cleaner. And always keep the source directory around so you can reference it for future upgrades or troubleshooting.
