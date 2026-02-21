# How to Add APT Keys with the Ansible apt_key Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, apt, GPG Keys, Ubuntu, Security

Description: How to manage APT repository signing keys with the Ansible apt_key module and the modern signed-by alternative approach.

---

Before you can install packages from a third-party APT repository, you need to add the repository's GPG signing key. Without it, apt will refuse to trust packages from that source. The Ansible `apt_key` module has been the traditional way to handle this, but the approach is changing. This post covers both the `apt_key` module and the modern `signed-by` method that is replacing it.

## Understanding APT Keys

When you add a repository and run `apt-get update`, apt downloads package metadata from that repository. The metadata is signed with the repository maintainer's GPG key. If apt does not have the corresponding public key in its trusted keyring, it flags the repository as untrusted and refuses to install packages from it.

The traditional approach stores all trusted keys in a global keyring at `/etc/apt/trusted.gpg` or as individual files in `/etc/apt/trusted.gpg.d/`. The newer approach associates each key with a specific repository using the `signed-by` option.

## Using the apt_key Module

The `apt_key` module adds GPG keys to the system-wide trusted keyring. Here is the most common usage, fetching a key from a URL:

```yaml
# Add a GPG key from a URL
- name: Add Docker GPG key
  ansible.builtin.apt_key:
    url: https://download.docker.com/linux/ubuntu/gpg
    state: present
```

You can also add a key by its ID from a keyserver:

```yaml
# Add a key from a keyserver by ID
- name: Add PostgreSQL GPG key from keyserver
  ansible.builtin.apt_key:
    keyserver: keyserver.ubuntu.com
    id: ACCC4CF8
    state: present
```

Or add a key from data stored in a variable or file:

```yaml
# Add a key from inline data
- name: Add custom repository key
  ansible.builtin.apt_key:
    data: |
      -----BEGIN PGP PUBLIC KEY BLOCK-----
      mQINBF...
      ...
      -----END PGP PUBLIC KEY BLOCK-----
    state: present
```

## The Deprecation Warning

If you have used `apt_key` recently, you have probably seen this warning:

```
Warning: apt-key is deprecated. Manage keyring files in trusted.gpg.d instead.
```

The problem with the global keyring is that any key in `/etc/apt/trusted.gpg` or `trusted.gpg.d/` is trusted for ALL repositories on the system. This means a compromised third-party repository key could theoretically be used to sign malicious packages that appear to come from the official Ubuntu repositories.

The fix is the `signed-by` approach, where each repository's key is stored in a separate file and linked to only that specific repository.

## The Modern signed-by Approach

Here is the recommended way to handle GPG keys going forward. Instead of `apt_key`, you download the key to a file and reference it in the repository definition.

Step 1: Download and convert the GPG key:

```yaml
# Download the GPG key and convert it to the binary format apt expects
- name: Download Grafana GPG key
  ansible.builtin.get_url:
    url: https://apt.grafana.com/gpg.key
    dest: /tmp/grafana.gpg.key
    mode: '0644'

- name: Convert Grafana GPG key to dearmored format
  ansible.builtin.command:
    cmd: gpg --dearmor -o /usr/share/keyrings/grafana.gpg /tmp/grafana.gpg.key
    creates: /usr/share/keyrings/grafana.gpg

- name: Set permissions on keyring file
  ansible.builtin.file:
    path: /usr/share/keyrings/grafana.gpg
    mode: '0644'
```

Step 2: Reference the key in the repository definition:

```yaml
# Add the repository with the signed-by option pointing to the keyring file
- name: Add Grafana repository
  ansible.builtin.apt_repository:
    repo: "deb [signed-by=/usr/share/keyrings/grafana.gpg] https://apt.grafana.com stable main"
    state: present
    filename: grafana
    update_cache: yes
```

The key in `/usr/share/keyrings/grafana.gpg` is now only trusted for packages from `apt.grafana.com`. It cannot be used to sign packages from any other repository.

## A Cleaner Approach with the shell Module

Some GPG keys are already in binary (dearmored) format. In that case, you can skip the dearmor step:

```yaml
# Download a binary GPG key directly
- name: Download Kubernetes GPG key (already dearmored)
  ansible.builtin.get_url:
    url: https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key
    dest: /tmp/kubernetes.key

# Convert to dearmored format if needed, or copy if already binary
- name: Install Kubernetes GPG key
  ansible.builtin.shell:
    cmd: |
      if file /tmp/kubernetes.key | grep -q 'PGP public key'; then
        cp /tmp/kubernetes.key /usr/share/keyrings/kubernetes-apt-keyring.gpg
      else
        gpg --dearmor -o /usr/share/keyrings/kubernetes-apt-keyring.gpg /tmp/kubernetes.key
      fi
    creates: /usr/share/keyrings/kubernetes-apt-keyring.gpg
```

## Removing Keys

To remove a key using `apt_key`, you need the key ID:

```yaml
# Remove a key by its ID
- name: Remove old repository key
  ansible.builtin.apt_key:
    id: "9DC858229FC7DD38854AE2D88D81803C0EBFCD88"
    state: absent
```

With the `signed-by` approach, just delete the keyring file:

```yaml
# Remove a keyring file
- name: Remove old Grafana keyring
  ansible.builtin.file:
    path: /usr/share/keyrings/grafana.gpg
    state: absent
```

## Migrating from apt_key to signed-by

If you have existing infrastructure using `apt_key`, here is a migration playbook:

```yaml
# Migrate Docker from apt_key to signed-by approach
- name: Migrate Docker GPG key to signed-by
  hosts: all
  become: yes
  tasks:
    # Step 1: Export the existing key to a file
    - name: Export Docker key from global keyring
      ansible.builtin.shell:
        cmd: apt-key export 0EBFCD88 | gpg --dearmor -o /usr/share/keyrings/docker.gpg
        creates: /usr/share/keyrings/docker.gpg

    # Step 2: Update the repository to use signed-by
    - name: Remove old Docker repository entry
      ansible.builtin.apt_repository:
        repo: "deb [arch=amd64] https://download.docker.com/linux/ubuntu {{ ansible_distribution_release }} stable"
        state: absent

    - name: Add Docker repository with signed-by
      ansible.builtin.apt_repository:
        repo: "deb [arch=amd64 signed-by=/usr/share/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu {{ ansible_distribution_release }} stable"
        state: present
        filename: docker-ce
        update_cache: yes

    # Step 3: Remove the key from the global keyring
    - name: Remove Docker key from global keyring
      ansible.builtin.apt_key:
        id: "9DC858229FC7DD38854AE2D88D81803C0EBFCD88"
        state: absent
```

## A Reusable Task for Key Management

Here is a reusable include that handles key download and installation:

```yaml
# tasks/install_apt_key.yml
# Parameters: key_url, key_name
- name: "Download GPG key for {{ key_name }}"
  ansible.builtin.get_url:
    url: "{{ key_url }}"
    dest: "/tmp/{{ key_name }}.key"
    mode: '0644'
  register: key_download

- name: "Install GPG key for {{ key_name }}"
  ansible.builtin.shell:
    cmd: "gpg --yes --dearmor -o /usr/share/keyrings/{{ key_name }}.gpg /tmp/{{ key_name }}.key"
  when: key_download.changed

- name: "Set permissions on {{ key_name }} keyring"
  ansible.builtin.file:
    path: "/usr/share/keyrings/{{ key_name }}.gpg"
    mode: '0644'
    owner: root
    group: root
```

Use it like this:

```yaml
# Add multiple repository keys using the reusable task
- name: Install Grafana GPG key
  ansible.builtin.include_tasks: tasks/install_apt_key.yml
  vars:
    key_url: https://apt.grafana.com/gpg.key
    key_name: grafana

- name: Install HashiCorp GPG key
  ansible.builtin.include_tasks: tasks/install_apt_key.yml
  vars:
    key_url: https://apt.releases.hashicorp.com/gpg
    key_name: hashicorp
```

## Key Management Decision Flow

```mermaid
graph TD
    A[Need to add repository key] --> B{New or existing setup?}
    B -->|New setup| C[Use signed-by approach]
    B -->|Existing with apt_key| D{Time to migrate?}
    D -->|Yes| E[Export key, update repo, remove from global]
    D -->|No| F[Keep using apt_key for now]
    C --> G[Download key to /usr/share/keyrings/]
    G --> H[Dearmor if ASCII-armored]
    H --> I[Reference in repo with signed-by=]
```

## Tips and Common Pitfalls

1. **Always dearmor ASCII-armored keys.** Apt expects binary format in keyring files. If you put an ASCII-armored key in `/usr/share/keyrings/`, apt will silently fail to verify signatures.

2. **Use `creates` for idempotency.** The `gpg --dearmor` command will fail if the output file already exists. The `creates` parameter prevents the task from running when the file is already there.

3. **Check key expiration.** GPG keys expire. If a repository suddenly stops working after an update, the signing key may have expired and you need to download a fresh one.

4. **Name your keyring files descriptively.** Using names like `grafana.gpg` or `docker-ce.gpg` makes it easy to audit which keys are on the system and which repositories they belong to.

5. **Clean up `/tmp` after key download.** The downloaded key in `/tmp` is no longer needed after installation. Add a cleanup task or let the system's tmp cleaner handle it.

The shift from `apt_key` to `signed-by` is a genuine security improvement. If you are writing new playbooks, always use the `signed-by` approach. For existing infrastructure, plan a migration when you have the bandwidth to test it properly.
