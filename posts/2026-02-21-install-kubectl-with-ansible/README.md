# How to Install kubectl with Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, kubectl, Installation, DevOps

Description: Automate kubectl installation and configuration across your infrastructure using Ansible playbooks for consistent Kubernetes access.

---

kubectl is the command-line tool for interacting with Kubernetes clusters. Every developer, operator, and CI/CD system that needs to talk to Kubernetes requires kubectl. Installing it manually on every machine is tedious, and keeping versions consistent across your team is harder. Ansible solves both problems by automating the installation and ensuring everyone has the same version.

## Why Automate kubectl Installation?

At first glance, installing kubectl seems simple enough to do by hand. But consider these scenarios:

- You have 20 developers who need kubectl on their workstations
- Your CI/CD runners need kubectl to deploy to Kubernetes
- You need to upgrade kubectl across all machines when you upgrade your cluster
- Some machines run Ubuntu, others run CentOS, and a few run macOS

Ansible handles all of these cases from a single playbook.

## Installing from the Official Binary

The most portable method downloads the official binary directly from Google:

```yaml
# install_kubectl_binary.yml - Install kubectl from official binary release
---
- name: Install kubectl from Official Binary
  hosts: all
  become: true
  vars:
    kubectl_version: "1.29.2"
    kubectl_install_dir: /usr/local/bin

  tasks:
    - name: Determine architecture
      ansible.builtin.set_fact:
        kubectl_arch: "{{ 'arm64' if ansible_architecture == 'aarch64' else 'amd64' }}"
        kubectl_os: "{{ 'darwin' if ansible_system == 'Darwin' else 'linux' }}"

    - name: Check if kubectl is already installed at correct version
      ansible.builtin.command:
        cmd: "{{ kubectl_install_dir }}/kubectl version --client --output=json"
      register: kubectl_check
      changed_when: false
      failed_when: false

    - name: Parse installed version
      ansible.builtin.set_fact:
        installed_version: "{{ (kubectl_check.stdout | from_json).clientVersion.gitVersion | default('') }}"
      when: kubectl_check.rc == 0

    - name: Download kubectl binary
      ansible.builtin.get_url:
        url: "https://dl.k8s.io/release/v{{ kubectl_version }}/bin/{{ kubectl_os }}/{{ kubectl_arch }}/kubectl"
        dest: "{{ kubectl_install_dir }}/kubectl"
        mode: '0755'
        force: true
      when: >
        kubectl_check.rc != 0 or
        installed_version | default('') != 'v' + kubectl_version

    - name: Verify kubectl installation
      ansible.builtin.command:
        cmd: kubectl version --client --short
      register: verify_result
      changed_when: false

    - name: Display installed version
      ansible.builtin.debug:
        msg: "{{ verify_result.stdout }}"
```

## Installing via Package Manager

For Linux systems, using the official package repository is often preferred because it integrates with the system's package management:

```yaml
# install_kubectl_package.yml - Install kubectl via package manager
---
- name: Install kubectl via Package Manager
  hosts: linux_hosts
  become: true
  vars:
    kubectl_version: "1.29.2"

  tasks:
    # --- Debian/Ubuntu ---
    - name: Install prerequisites for apt repository (Debian)
      ansible.builtin.apt:
        name:
          - apt-transport-https
          - ca-certificates
          - curl
          - gnupg
        state: present
      when: ansible_os_family == "Debian"

    - name: Add Kubernetes apt signing key
      ansible.builtin.apt_key:
        url: "https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key"
        keyring: /etc/apt/keyrings/kubernetes-apt-keyring.gpg
        state: present
      when: ansible_os_family == "Debian"

    - name: Add Kubernetes apt repository
      ansible.builtin.apt_repository:
        repo: "deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /"
        state: present
        filename: kubernetes
      when: ansible_os_family == "Debian"

    - name: Install kubectl (Debian)
      ansible.builtin.apt:
        name: "kubectl={{ kubectl_version }}-*"
        state: present
        update_cache: true
      when: ansible_os_family == "Debian"

    # --- RHEL/CentOS/Fedora ---
    - name: Add Kubernetes yum repository
      ansible.builtin.yum_repository:
        name: kubernetes
        description: Kubernetes Repository
        baseurl: "https://pkgs.k8s.io/core:/stable:/v1.29/rpm/"
        gpgcheck: true
        gpgkey: "https://pkgs.k8s.io/core:/stable:/v1.29/rpm/repodata/repomd.xml.key"
        enabled: true
      when: ansible_os_family == "RedHat"

    - name: Install kubectl (RedHat)
      ansible.builtin.dnf:
        name: "kubectl-{{ kubectl_version }}"
        state: present
      when: ansible_os_family == "RedHat"
```

## Installing on macOS

For macOS workstations, you can use Homebrew or the direct binary:

```yaml
# install_kubectl_macos.yml - Install kubectl on macOS
---
- name: Install kubectl on macOS
  hosts: macos_workstations
  become: false

  tasks:
    - name: Install kubectl via Homebrew
      community.general.homebrew:
        name: kubectl
        state: present

    - name: Verify installation
      ansible.builtin.command:
        cmd: kubectl version --client --short
      register: kubectl_version
      changed_when: false

    - name: Show version
      ansible.builtin.debug:
        msg: "{{ kubectl_version.stdout }}"
```

## Setting Up kubeconfig

Installing kubectl is only half the job. You also need to configure it to connect to your clusters:

```yaml
# configure_kubectl.yml - Set up kubeconfig for kubectl
---
- name: Configure kubectl Access
  hosts: all
  become: false
  vars:
    kube_config_dir: "{{ ansible_user_dir }}/.kube"
    clusters:
      - name: production
        server: "https://k8s-prod.example.com:6443"
        ca_cert: files/certs/prod-ca.crt
      - name: staging
        server: "https://k8s-staging.example.com:6443"
        ca_cert: files/certs/staging-ca.crt

  tasks:
    - name: Create .kube directory
      ansible.builtin.file:
        path: "{{ kube_config_dir }}"
        state: directory
        mode: '0700'

    - name: Deploy kubeconfig file
      ansible.builtin.template:
        src: templates/kubeconfig.yml.j2
        dest: "{{ kube_config_dir }}/config"
        mode: '0600'

    - name: Verify cluster connectivity
      ansible.builtin.command:
        cmd: "kubectl --context {{ item.name }} cluster-info"
      register: cluster_check
      loop: "{{ clusters }}"
      changed_when: false
      ignore_errors: true

    - name: Report cluster status
      ansible.builtin.debug:
        msg: "{{ item.item.name }}: {{ 'Connected' if item.rc == 0 else 'Failed to connect' }}"
      loop: "{{ cluster_check.results }}"
      loop_control:
        label: "{{ item.item.name }}"
```

The kubeconfig template:

```yaml
# templates/kubeconfig.yml.j2 - kubeconfig template
apiVersion: v1
kind: Config
preferences: {}
current-context: {{ clusters[0].name }}
clusters:
{% for cluster in clusters %}
  - name: {{ cluster.name }}
    cluster:
      server: {{ cluster.server }}
      certificate-authority: {{ kube_config_dir }}/{{ cluster.name }}-ca.crt
{% endfor %}
contexts:
{% for cluster in clusters %}
  - name: {{ cluster.name }}
    context:
      cluster: {{ cluster.name }}
      user: {{ cluster.name }}-user
{% endfor %}
users:
{% for cluster in clusters %}
  - name: {{ cluster.name }}-user
    user:
      token: {{ lookup('file', 'tokens/' + cluster.name + '-token') }}
{% endfor %}
```

## Setting Up Shell Completion

kubectl shell completion makes a huge productivity difference:

```yaml
# kubectl_completion.yml - Set up shell completion for kubectl
---
- name: Set Up kubectl Shell Completion
  hosts: all
  become: false

  tasks:
    - name: Detect user's shell
      ansible.builtin.set_fact:
        user_shell: "{{ ansible_user_shell | basename }}"

    - name: Generate bash completion script
      ansible.builtin.command:
        cmd: kubectl completion bash
      register: bash_completion
      changed_when: false
      when: user_shell == "bash"

    - name: Install bash completion
      ansible.builtin.copy:
        content: "{{ bash_completion.stdout }}"
        dest: "{{ ansible_user_dir }}/.kubectl_completion"
        mode: '0644'
      when: user_shell == "bash"

    - name: Add bash completion to .bashrc
      ansible.builtin.lineinfile:
        path: "{{ ansible_user_dir }}/.bashrc"
        line: "source {{ ansible_user_dir }}/.kubectl_completion"
        create: true
        mode: '0644'
      when: user_shell == "bash"

    - name: Generate zsh completion script
      ansible.builtin.command:
        cmd: kubectl completion zsh
      register: zsh_completion
      changed_when: false
      when: user_shell == "zsh"

    - name: Install zsh completion
      ansible.builtin.copy:
        content: "{{ zsh_completion.stdout }}"
        dest: "{{ ansible_user_dir }}/.kubectl_completion"
        mode: '0644'
      when: user_shell == "zsh"

    - name: Add zsh completion to .zshrc
      ansible.builtin.lineinfile:
        path: "{{ ansible_user_dir }}/.zshrc"
        line: "source {{ ansible_user_dir }}/.kubectl_completion"
        create: true
        mode: '0644'
      when: user_shell == "zsh"
```

## Installing kubectl Plugins

kubectl supports plugins via krew, the kubectl plugin manager:

```yaml
# install_krew.yml - Install krew and useful kubectl plugins
---
- name: Install kubectl Plugins via Krew
  hosts: all
  become: false
  vars:
    krew_plugins:
      - ctx       # Switch between contexts easily
      - ns        # Switch between namespaces easily
      - neat      # Clean up YAML output
      - tree      # Show resource hierarchy
      - images    # List container images in a cluster

  tasks:
    - name: Check if krew is installed
      ansible.builtin.command:
        cmd: kubectl krew version
      register: krew_check
      changed_when: false
      failed_when: false

    - name: Download krew installer
      ansible.builtin.get_url:
        url: "https://github.com/kubernetes-sigs/krew/releases/latest/download/krew-{{ kubectl_os }}_{{ kubectl_arch }}.tar.gz"
        dest: /tmp/krew.tar.gz
        mode: '0644'
      when: krew_check.rc != 0

    - name: Extract krew
      ansible.builtin.unarchive:
        src: /tmp/krew.tar.gz
        dest: /tmp/
        remote_src: true
      when: krew_check.rc != 0

    - name: Install krew
      ansible.builtin.command:
        cmd: "/tmp/krew-{{ kubectl_os }}_{{ kubectl_arch }} install krew"
      when: krew_check.rc != 0
      changed_when: true

    - name: Add krew to PATH in shell config
      ansible.builtin.lineinfile:
        path: "{{ ansible_user_dir }}/.{{ user_shell }}rc"
        line: 'export PATH="${KREW_ROOT:-$HOME/.krew}/bin:$PATH"'
        create: true
        mode: '0644'

    - name: Install kubectl plugins
      ansible.builtin.command:
        cmd: "kubectl krew install {{ item }}"
      loop: "{{ krew_plugins }}"
      register: plugin_install
      changed_when: "'Installed plugin' in plugin_install.stdout"
      failed_when: false
```

## Upgrading kubectl

When you upgrade your Kubernetes cluster, kubectl should be upgraded to match:

```yaml
# upgrade_kubectl.yml - Upgrade kubectl to match cluster version
---
- name: Upgrade kubectl
  hosts: all
  become: true
  vars:
    target_version: "1.30.0"

  tasks:
    - name: Check current kubectl version
      ansible.builtin.command:
        cmd: kubectl version --client --output=json
      register: current_version
      changed_when: false
      failed_when: false

    - name: Display current version
      ansible.builtin.debug:
        msg: "Current: {{ (current_version.stdout | from_json).clientVersion.gitVersion | default('not installed') }}"
      when: current_version.rc == 0

    - name: Download new kubectl version
      ansible.builtin.get_url:
        url: "https://dl.k8s.io/release/v{{ target_version }}/bin/{{ kubectl_os }}/{{ kubectl_arch }}/kubectl"
        dest: /usr/local/bin/kubectl
        mode: '0755'
        force: true

    - name: Verify upgrade
      ansible.builtin.command:
        cmd: kubectl version --client --short
      register: new_version
      changed_when: false

    - name: Display new version
      ansible.builtin.debug:
        msg: "Upgraded to: {{ new_version.stdout }}"
```

## Version Compatibility

kubectl follows a compatibility policy: it supports one minor version above and below the cluster version. Here is a task that checks compatibility:

```yaml
    - name: Get cluster version
      ansible.builtin.command:
        cmd: kubectl version --output=json
      register: version_info
      changed_when: false

    - name: Check version compatibility
      ansible.builtin.set_fact:
        client_minor: "{{ (version_info.stdout | from_json).clientVersion.minor | int }}"
        server_minor: "{{ (version_info.stdout | from_json).serverVersion.minor | regex_replace('[^0-9]', '') | int }}"

    - name: Warn if versions are incompatible
      ansible.builtin.debug:
        msg: "WARNING: kubectl version skew is {{ (client_minor | int - server_minor | int) | abs }}. Should be <= 1."
      when: (client_minor | int - server_minor | int) | abs > 1
```

## Summary

Automating kubectl installation with Ansible ensures every machine in your organization has a consistent, known version of kubectl configured correctly. The direct binary download method works across all platforms, while package manager installation integrates better with system updates on Linux. Beyond just installing the binary, consider automating kubeconfig distribution, shell completion setup, and plugin installation. When you upgrade your Kubernetes cluster, a single Ansible playbook run can bring all kubectl installations in line with the new cluster version.
