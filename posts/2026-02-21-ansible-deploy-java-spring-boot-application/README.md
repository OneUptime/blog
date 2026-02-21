# How to Use Ansible to Deploy a Java Spring Boot Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Java, Spring Boot, Deployment, DevOps

Description: Deploy Java Spring Boot applications with Ansible including JDK installation, systemd service setup, and Nginx reverse proxy.

---

Spring Boot is the dominant framework in the Java ecosystem for building production-ready applications. It produces self-contained JAR files that include an embedded web server, which simplifies deployment compared to traditional WAR deployments on application servers. Still, getting a Spring Boot app running reliably in production involves JDK installation, service management, reverse proxy configuration, and proper logging. Ansible automates all of these steps.

This guide covers building an Ansible playbook that takes a Spring Boot JAR file from your build pipeline and deploys it as a systemd service behind Nginx.

## Deployment Strategy

The approach here is straightforward: build the JAR in your CI pipeline, upload it to your servers with Ansible, and run it as a systemd service. This keeps the build and deploy steps separate, which is generally cleaner than building on the target servers.

## Project Structure

```
springboot-deploy/
  inventory/
    hosts.yml
  group_vars/
    all.yml
  roles/
    springboot/
      tasks/
        main.yml
      templates/
        application.yml.j2
        springboot.service.j2
        nginx.conf.j2
      handlers/
        main.yml
  deploy.yml
```

## Inventory and Variables

```yaml
# inventory/hosts.yml
all:
  hosts:
    app1:
      ansible_host: 10.0.1.20
    app2:
      ansible_host: 10.0.1.21
  vars:
    ansible_user: deploy
```

```yaml
# group_vars/all.yml - Application configuration
app_name: myspringapp
app_user: springapp
app_group: springapp
app_dir: /opt/myspringapp
java_version: "17"
jar_file: "myspringapp-1.0.0.jar"
jar_source: "../build/libs/{{ jar_file }}"
app_port: 8080
server_name: myspringapp.example.com
java_opts: "-Xms256m -Xmx512m -XX:+UseG1GC"
spring_profiles: production
db_url: "jdbc:postgresql://db.example.com:5432/myapp"
db_username: myapp
db_password: "{{ vault_db_password }}"
```

## Role Tasks

```yaml
# roles/springboot/tasks/main.yml
---
- name: Install OpenJDK {{ java_version }}
  apt:
    name: "openjdk-{{ java_version }}-jre-headless"
    state: present
    update_cache: yes

- name: Install Nginx
  apt:
    name: nginx
    state: present

- name: Create application group
  group:
    name: "{{ app_group }}"
    state: present

- name: Create application user
  user:
    name: "{{ app_user }}"
    group: "{{ app_group }}"
    home: "{{ app_dir }}"
    shell: /usr/sbin/nologin
    system: yes
    create_home: no

- name: Create application directories
  file:
    path: "{{ item }}"
    state: directory
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0755'
  loop:
    - "{{ app_dir }}"
    - "{{ app_dir }}/config"
    - "{{ app_dir }}/logs"
    - "{{ app_dir }}/lib"

- name: Copy the Spring Boot JAR to the server
  copy:
    src: "{{ jar_source }}"
    dest: "{{ app_dir }}/lib/{{ jar_file }}"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0644'
  notify: restart springboot

- name: Create symlink to the current JAR version
  file:
    src: "{{ app_dir }}/lib/{{ jar_file }}"
    dest: "{{ app_dir }}/lib/app.jar"
    state: link
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
  notify: restart springboot

- name: Deploy application configuration
  template:
    src: application.yml.j2
    dest: "{{ app_dir }}/config/application-production.yml"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0600'
  notify: restart springboot

- name: Deploy systemd service file
  template:
    src: springboot.service.j2
    dest: /etc/systemd/system/{{ app_name }}.service
    mode: '0644'
  notify:
    - reload systemd
    - restart springboot

- name: Enable and start the Spring Boot service
  systemd:
    name: "{{ app_name }}"
    enabled: yes
    state: started

- name: Wait for the application to become available
  wait_for:
    port: "{{ app_port }}"
    delay: 10
    timeout: 60

- name: Deploy Nginx configuration
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/sites-available/{{ app_name }}
    mode: '0644'
  notify: reload nginx

- name: Enable Nginx site
  file:
    src: /etc/nginx/sites-available/{{ app_name }}
    dest: /etc/nginx/sites-enabled/{{ app_name }}
    state: link
  notify: reload nginx

- name: Remove default Nginx site
  file:
    path: /etc/nginx/sites-enabled/default
    state: absent
  notify: reload nginx
```

## Templates

The Spring Boot application configuration template:

```yaml
# roles/springboot/templates/application.yml.j2
server:
  port: {{ app_port }}

spring:
  datasource:
    url: {{ db_url }}
    username: {{ db_username }}
    password: {{ db_password }}
  jpa:
    hibernate:
      ddl-auto: validate

logging:
  file:
    path: {{ app_dir }}/logs
  level:
    root: INFO
    org.springframework: WARN

management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics
  endpoint:
    health:
      show-details: always
```

The systemd service file manages the Java process:

```ini
# roles/springboot/templates/springboot.service.j2
[Unit]
Description={{ app_name }} Spring Boot Application
After=network.target

[Service]
Type=simple
User={{ app_user }}
Group={{ app_group }}
WorkingDirectory={{ app_dir }}

# JVM options and Spring profile configuration
ExecStart=/usr/bin/java \
    {{ java_opts }} \
    -Dspring.profiles.active={{ spring_profiles }} \
    -Dspring.config.additional-location={{ app_dir }}/config/ \
    -jar {{ app_dir }}/lib/app.jar

# Restart on failure with backoff
Restart=on-failure
RestartSec=10
SuccessExitStatus=143

# Logging
StandardOutput=append:{{ app_dir }}/logs/stdout.log
StandardError=append:{{ app_dir }}/logs/stderr.log

# Security hardening
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true

[Install]
WantedBy=multi-user.target
```

The Nginx reverse proxy configuration:

```nginx
# roles/springboot/templates/nginx.conf.j2
upstream {{ app_name }}_backend {
    server 127.0.0.1:{{ app_port }};
}

server {
    listen 80;
    server_name {{ server_name }};

    # Forward requests to Spring Boot
    location / {
        proxy_pass http://{{ app_name }}_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_read_timeout 300s;
    }

    # Spring Boot Actuator health check endpoint
    location /actuator/health {
        proxy_pass http://{{ app_name }}_backend;
        access_log off;
    }
}
```

## Handlers

```yaml
# roles/springboot/handlers/main.yml
---
- name: reload systemd
  systemd:
    daemon_reload: yes

- name: restart springboot
  systemd:
    name: "{{ app_name }}"
    state: restarted

- name: reload nginx
  systemd:
    name: nginx
    state: reloaded
```

## Main Playbook

```yaml
# deploy.yml
---
- name: Deploy Spring Boot Application
  hosts: all
  become: yes
  serial: 1
  pre_tasks:
    - name: Verify JAR file exists locally
      local_action:
        module: stat
        path: "{{ jar_source }}"
      register: jar_stat
      become: no

    - name: Fail if JAR file is missing
      fail:
        msg: "JAR file not found at {{ jar_source }}. Build the project first."
      when: not jar_stat.stat.exists

  roles:
    - springboot

  post_tasks:
    - name: Verify application health endpoint
      uri:
        url: "http://localhost:{{ app_port }}/actuator/health"
        status_code: 200
      register: health_result
      retries: 5
      delay: 10
      until: health_result.status == 200
```

## Versioned Deployments

To keep previous versions and enable quick rollbacks, modify the JAR management:

```yaml
# Keep the last 5 versions of the JAR file
- name: Find old JAR files
  find:
    paths: "{{ app_dir }}/lib"
    patterns: "*.jar"
    excludes: "app.jar"
    age: "7d"
  register: old_jars

- name: Remove old JAR files beyond retention
  file:
    path: "{{ item.path }}"
    state: absent
  loop: "{{ old_jars.files | sort(attribute='mtime') | list }}"
  when: old_jars.files | length > 5
```

## Running the Deployment

Build your application first, then deploy:

```bash
# Build the Spring Boot application
cd /path/to/project
./gradlew bootJar

# Deploy to production servers
ansible-playbook -i inventory/hosts.yml deploy.yml --ask-vault-pass
```

## Graceful Shutdown

Spring Boot supports graceful shutdown, which lets in-flight requests complete before stopping. Add this to your application configuration:

```yaml
# Add to application.yml.j2 for graceful shutdown support
server:
  shutdown: graceful

spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
```

And configure the systemd service to use SIGTERM with a timeout:

```ini
# Add these lines to the [Service] section
TimeoutStopSec=35
KillSignal=SIGTERM
```

## Wrapping Up

This Ansible playbook gives you a solid foundation for deploying Spring Boot applications. The key elements are: JDK installation, a systemd service with security hardening, Nginx as a reverse proxy, Spring profile management, and health check verification. The serial deployment strategy ensures you always have running instances during updates. From here you can add SSL termination, centralized logging, or integrate with your CI/CD pipeline for fully automated deployments.
