# How to Use Molecule Prepare for Test Prerequisites

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Molecule, Testing, Prepare, DevOps

Description: Learn how to use Molecule's prepare step to set up test prerequisites like databases, config files, and mock services before role testing.

---

When testing Ansible roles with Molecule, your role usually does not operate in a vacuum. It might expect a database to be running, a user to exist, or a specific package to be installed. The prepare step in Molecule is specifically designed to handle these prerequisites. It runs after the instance is created but before the converge step applies your role. Think of it as the "set the stage" step for your tests.

## Where Prepare Fits in the Sequence

```mermaid
graph LR
    A[create] --> B[prepare]
    B --> C[converge]
    C --> D[idempotence]
    D --> E[verify]
    style B fill:#ff9,stroke:#333
```

Prepare runs exactly once, right after the test instance is created. Unlike converge, it does not run again during the idempotence check. This is an important distinction: prepare sets up the environment that your role expects to find, and your role should not need to modify those prerequisites.

## Basic Prepare Playbook

Create a `prepare.yml` in your Molecule scenario directory.

```yaml
# molecule/default/prepare.yml
---
- name: Prepare
  hosts: all
  become: true
  tasks:
    - name: Update apt cache
      ansible.builtin.apt:
        update_cache: true
        cache_valid_time: 3600
      when: ansible_os_family == 'Debian'

    - name: Install prerequisite packages
      ansible.builtin.package:
        name:
          - curl
          - gnupg2
          - ca-certificates
        state: present
```

Molecule automatically picks up `prepare.yml` from the scenario directory. You can also specify a custom path.

```yaml
# molecule/default/molecule.yml
provisioner:
  name: ansible
  playbooks:
    prepare: custom_prepare.yml
```

## Use Case 1: Database Prerequisites

Your role deploys an application that connects to PostgreSQL. The database server is managed by a different role, but your role needs it to be running.

```yaml
# molecule/default/prepare.yml - Set up PostgreSQL before testing app role
---
- name: Prepare - Install PostgreSQL
  hosts: all
  become: true
  tasks:
    - name: Install PostgreSQL
      ansible.builtin.apt:
        name:
          - postgresql
          - postgresql-client
          - python3-psycopg2
        state: present
        update_cache: true

    - name: Start PostgreSQL service
      ansible.builtin.service:
        name: postgresql
        state: started
        enabled: true

    - name: Create application database
      become_user: postgres
      community.postgresql.postgresql_db:
        name: myapp_db
        state: present

    - name: Create application database user
      become_user: postgres
      community.postgresql.postgresql_user:
        name: myapp_user
        password: "testpassword123"
        db: myapp_db
        priv: ALL
        state: present
```

Now your converge.yml can test the application role knowing that PostgreSQL is ready.

```yaml
# molecule/default/converge.yml
---
- name: Converge
  hosts: all
  become: true
  roles:
    - role: myapp
      vars:
        myapp_db_host: localhost
        myapp_db_name: myapp_db
        myapp_db_user: myapp_user
        myapp_db_password: testpassword123
```

## Use Case 2: Creating Test Users and Groups

Roles that manage application deployments often expect certain users to exist. Set them up in prepare.

```yaml
# molecule/default/prepare.yml - Create users and groups
---
- name: Prepare - Users and Groups
  hosts: all
  become: true
  tasks:
    - name: Create application group
      ansible.builtin.group:
        name: myapp
        gid: 1500
        state: present

    - name: Create application user
      ansible.builtin.user:
        name: myapp
        uid: 1500
        group: myapp
        home: /opt/myapp
        shell: /bin/bash
        create_home: true
        state: present

    - name: Create required directories
      ansible.builtin.file:
        path: "{{ item }}"
        state: directory
        owner: myapp
        group: myapp
        mode: '0755'
      loop:
        - /opt/myapp
        - /var/log/myapp
        - /etc/myapp
```

## Use Case 3: Mock External Services

When your role needs to talk to an external API or service, mock it in prepare rather than hitting the real thing.

```yaml
# molecule/default/prepare.yml - Set up mock services
---
- name: Prepare - Mock Services
  hosts: all
  become: true
  tasks:
    - name: Install Python HTTP server for mocking
      ansible.builtin.pip:
        name: flask
        state: present

    - name: Create mock API script
      ansible.builtin.copy:
        dest: /opt/mock-api.py
        mode: '0755'
        content: |
          from flask import Flask, jsonify
          app = Flask(__name__)

          @app.route('/api/v1/config')
          def config():
              return jsonify({
                  'database_url': 'postgresql://localhost/myapp',
                  'cache_ttl': 300,
                  'debug': False
              })

          @app.route('/api/v1/health')
          def health():
              return jsonify({'status': 'healthy'})

          if __name__ == '__main__':
              app.run(host='0.0.0.0', port=8080)

    - name: Create systemd unit for mock API
      ansible.builtin.copy:
        dest: /etc/systemd/system/mock-api.service
        mode: '0644'
        content: |
          [Unit]
          Description=Mock API Server
          After=network.target

          [Service]
          ExecStart=/usr/bin/python3 /opt/mock-api.py
          Restart=always

          [Install]
          WantedBy=multi-user.target

    - name: Start mock API
      ansible.builtin.systemd:
        name: mock-api
        state: started
        enabled: true
        daemon_reload: true

    - name: Wait for mock API to be ready
      ansible.builtin.uri:
        url: http://localhost:8080/api/v1/health
      register: health_check
      until: health_check.status == 200
      retries: 10
      delay: 2
```

## Use Case 4: SSL Certificate Prerequisites

Roles that configure HTTPS often need certificates to already exist.

```yaml
# molecule/default/prepare.yml - Generate test SSL certificates
---
- name: Prepare - SSL Certificates
  hosts: all
  become: true
  tasks:
    - name: Create SSL directory
      ansible.builtin.file:
        path: /etc/ssl/myapp
        state: directory
        mode: '0750'

    - name: Generate private key
      community.crypto.openssl_privatekey:
        path: /etc/ssl/myapp/server.key
        size: 2048

    - name: Generate CSR
      community.crypto.openssl_csr:
        path: /etc/ssl/myapp/server.csr
        privatekey_path: /etc/ssl/myapp/server.key
        common_name: test.example.com
        subject_alt_name:
          - "DNS:test.example.com"
          - "DNS:localhost"

    - name: Generate self-signed certificate
      community.crypto.x509_certificate:
        path: /etc/ssl/myapp/server.crt
        privatekey_path: /etc/ssl/myapp/server.key
        csr_path: /etc/ssl/myapp/server.csr
        provider: selfsigned
        selfsigned_not_after: "+365d"
```

## Using Roles in Prepare

Instead of inline tasks, you can use existing roles to set up prerequisites. This is useful when the prerequisite is complex enough to have its own role.

```yaml
# molecule/default/prepare.yml - Use roles for prerequisites
---
- name: Prepare - Using Roles
  hosts: all
  become: true
  roles:
    - role: geerlingguy.java
      vars:
        java_packages:
          - openjdk-17-jdk-headless
    - role: geerlingguy.docker
```

Make sure to declare these role dependencies in your molecule requirements.

```yaml
# molecule/default/requirements.yml
---
roles:
  - name: geerlingguy.java
    version: "6.1.0"
  - name: geerlingguy.docker
    version: "7.1.0"
```

And configure Molecule to install them.

```yaml
# molecule/default/molecule.yml
dependency:
  name: galaxy
  options:
    role-file: molecule/default/requirements.yml
    requirements-file: molecule/default/requirements.yml
```

## Prepare with Multi-Host Scenarios

When testing multi-host scenarios, prepare can set up different prerequisites on different hosts.

```yaml
# molecule/default/molecule.yml
platforms:
  - name: db-server
    image: geerlingguy/docker-ubuntu2204-ansible:latest
    groups:
      - databases
  - name: app-server
    image: geerlingguy/docker-ubuntu2204-ansible:latest
    groups:
      - applications
```

```yaml
# molecule/default/prepare.yml - Host-specific preparation
---
- name: Prepare database servers
  hosts: databases
  become: true
  tasks:
    - name: Install PostgreSQL
      ansible.builtin.apt:
        name: postgresql
        state: present
        update_cache: true

    - name: Start PostgreSQL
      ansible.builtin.service:
        name: postgresql
        state: started

- name: Prepare application servers
  hosts: applications
  become: true
  tasks:
    - name: Install Java runtime
      ansible.builtin.apt:
        name: openjdk-17-jre-headless
        state: present
        update_cache: true

    - name: Create application directories
      ansible.builtin.file:
        path: /opt/myapp
        state: directory
        mode: '0755'
```

## Prepare vs Converge: What Goes Where

A question that comes up often is: what should go in prepare versus converge? The rule of thumb is:

| Prepare | Converge |
|---------|----------|
| Dependencies your role does not manage | Your actual role |
| System packages your role assumes exist | Application packages your role installs |
| Test users and groups | User configuration your role manages |
| Mock services | Real service configuration |
| Prerequisite roles | The role under test |

If your role is responsible for installing something, it goes in converge. If your role expects something to already be there, it goes in prepare.

## Debugging Prepare Failures

When prepare fails, the test instance is still running (it was created in the previous step). You can log in and inspect the state.

```bash
# If prepare fails, log into the instance
molecule login

# Check what was installed so far
dpkg -l | grep postgres

# Try running the failed task manually
sudo apt-get install postgresql

# Exit and re-run prepare
exit
molecule prepare
```

You can also run prepare with verbose output.

```bash
molecule prepare -- -vvv
```

The prepare step is foundational to writing good Molecule tests. It separates your role's concerns from its prerequisites, making tests more realistic and easier to maintain. Invest time in writing thorough prepare playbooks, and your Molecule tests will be much more useful at catching real bugs.
