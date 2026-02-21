# How to Use Ansible to Set Up a CI/CD Pipeline Server (Jenkins)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jenkins, CI/CD, DevOps, Automation

Description: Learn how to automate the complete setup of a Jenkins CI/CD pipeline server using Ansible playbooks with plugins, security, and pipelines.

---

Setting up Jenkins manually is one of those tasks that starts simple and quickly turns into a multi-hour ordeal. You install Java, add the Jenkins repo, install Jenkins, wait for it to start, grab the initial admin password, click through the setup wizard, install plugins one by one, configure credentials, and then realize you need to do it all again on a staging server. Ansible takes all that pain away by letting you codify the entire process into a repeatable playbook.

In this guide, I will walk you through setting up a production-ready Jenkins server using Ansible. We will cover everything from the base installation to configuring plugins, creating pipeline jobs, and securing the instance.

## Prerequisites

You need a control machine with Ansible 2.12+ installed and a target Ubuntu 22.04 server with SSH access. The target server should have at least 2 GB of RAM and 2 CPU cores for a reasonable Jenkins experience.

## Project Structure

Here is how I organize the Ansible project for Jenkins:

```
jenkins-setup/
  inventory/
    hosts.ini
  roles/
    jenkins/
      tasks/
        main.yml
        plugins.yml
        security.yml
      templates/
        jenkins.yaml.j2
        seed-job.xml.j2
      handlers/
        main.yml
      defaults/
        main.yml
  playbook.yml
```

## The Inventory File

Define your Jenkins server in the inventory:

```ini
# inventory/hosts.ini - Target Jenkins servers
[jenkins]
jenkins-server ansible_host=192.168.1.50 ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/id_rsa
```

## Role Defaults

Set sensible defaults for your Jenkins configuration:

```yaml
# roles/jenkins/defaults/main.yml - Default variables for Jenkins role
jenkins_version: "2.426.3"
jenkins_port: 8080
jenkins_home: /var/lib/jenkins
jenkins_admin_user: admin
jenkins_admin_password: "{{ vault_jenkins_admin_password }}"
jenkins_java_opts: "-Djava.awt.headless=true -Xmx1024m"

# Plugins to install automatically
jenkins_plugins:
  - git
  - pipeline-stage-view
  - docker-workflow
  - blueocean
  - credentials-binding
  - ssh-agent
  - ansible
  - slack
  - pipeline-utility-steps
  - job-dsl
```

## Main Tasks

The main task file handles Java and Jenkins installation:

```yaml
# roles/jenkins/tasks/main.yml - Install Java and Jenkins
---
- name: Install required system packages
  apt:
    name:
      - apt-transport-https
      - ca-certificates
      - curl
      - gnupg
      - fontconfig
      - openjdk-17-jre
    state: present
    update_cache: yes

- name: Add Jenkins GPG key
  apt_key:
    url: https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key
    state: present

- name: Add Jenkins repository
  apt_repository:
    repo: "deb https://pkg.jenkins.io/debian-stable binary/"
    state: present
    filename: jenkins

- name: Install Jenkins
  apt:
    name: jenkins
    state: present
    update_cache: yes

- name: Configure Jenkins default options
  template:
    src: jenkins.yaml.j2
    dest: /etc/default/jenkins
    owner: root
    group: root
    mode: '0644'
  notify: restart jenkins

- name: Ensure Jenkins is started and enabled
  systemd:
    name: jenkins
    state: started
    enabled: yes

- name: Wait for Jenkins to fully start up
  uri:
    url: "http://localhost:{{ jenkins_port }}/login"
    status_code: 200
  register: jenkins_status
  until: jenkins_status.status == 200
  retries: 30
  delay: 10

- name: Read initial admin password
  slurp:
    src: "{{ jenkins_home }}/secrets/initialAdminPassword"
  register: jenkins_initial_password
  ignore_errors: yes

- name: Include plugin installation tasks
  include_tasks: plugins.yml

- name: Include security configuration tasks
  include_tasks: security.yml
```

## Plugin Installation

Install plugins using the Jenkins CLI:

```yaml
# roles/jenkins/tasks/plugins.yml - Install Jenkins plugins via CLI
---
- name: Download Jenkins CLI jar
  get_url:
    url: "http://localhost:{{ jenkins_port }}/jnlpJars/jenkins-cli.jar"
    dest: /tmp/jenkins-cli.jar
    mode: '0644'

- name: Install Jenkins plugins
  command: >
    java -jar /tmp/jenkins-cli.jar
    -s http://localhost:{{ jenkins_port }}/
    -auth {{ jenkins_admin_user }}:{{ jenkins_initial_password.content | b64decode | trim }}
    install-plugin {{ item }}
  loop: "{{ jenkins_plugins }}"
  register: plugin_result
  changed_when: "'already installed' not in plugin_result.stdout"
  failed_when: plugin_result.rc != 0 and 'already installed' not in plugin_result.stdout

- name: Restart Jenkins after plugin installation
  systemd:
    name: jenkins
    state: restarted

- name: Wait for Jenkins restart to complete
  uri:
    url: "http://localhost:{{ jenkins_port }}/login"
    status_code: 200
  register: jenkins_restart
  until: jenkins_restart.status == 200
  retries: 30
  delay: 10
```

## Security Configuration

Lock down Jenkins with proper security settings:

```yaml
# roles/jenkins/tasks/security.yml - Configure Jenkins security
---
- name: Create Jenkins admin user via Groovy script
  uri:
    url: "http://localhost:{{ jenkins_port }}/scriptText"
    method: POST
    body_format: form-urlencoded
    body:
      script: |
        import jenkins.model.*
        import hudson.security.*

        def instance = Jenkins.getInstance()
        def hudsonRealm = new HudsonPrivateSecurityRealm(false)
        hudsonRealm.createAccount('{{ jenkins_admin_user }}', '{{ jenkins_admin_password }}')
        instance.setSecurityRealm(hudsonRealm)

        def strategy = new FullControlOnceLoggedInAuthorizationStrategy()
        strategy.setAllowAnonymousRead(false)
        instance.setAuthorizationStrategy(strategy)
        instance.save()
    user: "{{ jenkins_admin_user }}"
    password: "{{ jenkins_initial_password.content | b64decode | trim }}"
    force_basic_auth: yes
    status_code: 200

- name: Disable Jenkins setup wizard
  lineinfile:
    path: "{{ jenkins_home }}/jenkins.install.InstallUtil.lastExecVersion"
    line: "{{ jenkins_version }}"
    create: yes
    owner: jenkins
    group: jenkins
```

## Seed Job Template

Create a pipeline seed job that bootstraps other jobs:

```xml
<!-- roles/jenkins/templates/seed-job.xml.j2 - Job DSL seed job configuration -->
<?xml version='1.1' encoding='UTF-8'?>
<project>
  <description>Seed job that creates all pipeline jobs from DSL</description>
  <builders>
    <javaposse.jobdsl.plugin.ExecuteDslScripts>
      <targets>jobs/*.groovy</targets>
      <removedJobAction>DELETE</removedJobAction>
      <removedViewAction>DELETE</removedViewAction>
      <lookupStrategy>JENKINS_ROOT</lookupStrategy>
    </javaposse.jobdsl.plugin.ExecuteDslScripts>
  </builders>
</project>
```

## Handlers

Define handlers for restarting Jenkins:

```yaml
# roles/jenkins/handlers/main.yml - Handler definitions
---
- name: restart jenkins
  systemd:
    name: jenkins
    state: restarted
```

## The Main Playbook

Tie everything together:

```yaml
# playbook.yml - Main playbook to set up Jenkins
---
- hosts: jenkins
  become: yes
  roles:
    - jenkins
```

## Running the Playbook

Execute the playbook with your vault password:

```bash
# Run the full Jenkins setup playbook
ansible-playbook -i inventory/hosts.ini playbook.yml --ask-vault-pass
```

## Adding a Reverse Proxy with Nginx

For production use, you will want Nginx in front of Jenkins:

```yaml
# Additional tasks to add Nginx reverse proxy for Jenkins
- name: Install Nginx
  apt:
    name: nginx
    state: present

- name: Configure Nginx for Jenkins
  copy:
    content: |
      upstream jenkins {
        keepalive 32;
        server 127.0.0.1:{{ jenkins_port }};
      }
      server {
        listen 80;
        server_name {{ jenkins_hostname }};
        return 301 https://$host$request_uri;
      }
      server {
        listen 443 ssl;
        server_name {{ jenkins_hostname }};
        ssl_certificate /etc/letsencrypt/live/{{ jenkins_hostname }}/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/{{ jenkins_hostname }}/privkey.pem;
        location / {
          proxy_pass http://jenkins;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
          proxy_set_header X-Forwarded-Proto $scheme;
        }
      }
    dest: /etc/nginx/sites-available/jenkins
  notify: restart nginx
```

## Verifying the Installation

After the playbook completes, you can verify Jenkins is working:

```yaml
# Verification tasks to confirm Jenkins is operational
- name: Verify Jenkins is responding
  uri:
    url: "http://localhost:{{ jenkins_port }}/api/json"
    user: "{{ jenkins_admin_user }}"
    password: "{{ jenkins_admin_password }}"
    force_basic_auth: yes
    return_content: yes
  register: jenkins_info

- name: Display Jenkins version
  debug:
    msg: "Jenkins {{ jenkins_info.json.hudson_version }} is running with {{ jenkins_info.json.numExecutors }} executors"
```

## Summary

With this Ansible setup, you can deploy a fully configured Jenkins server in minutes instead of hours. The playbook handles Java installation, Jenkins setup, plugin management, security configuration, and even reverse proxy setup. Every time you need a new Jenkins instance, whether for production, staging, or testing, you just run the playbook and get an identical environment. Store the playbook in version control, and you have a complete audit trail of your CI/CD infrastructure configuration.
