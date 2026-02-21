# How to Use Ansible to Configure Tomcat for Java Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Tomcat, Java, Deployment, DevOps

Description: Configure Apache Tomcat for Java web applications using Ansible with JVM tuning, WAR deployment, and security hardening.

---

Apache Tomcat is the most popular servlet container for running Java web applications. It handles WAR file deployment, JSP compilation, and provides the Servlet/JSP API implementation that Java web apps depend on. Configuring Tomcat for production involves JVM tuning, connector optimization, security hardening, and proper log management. Ansible makes it possible to standardize these configurations across all your Tomcat instances.

This guide covers installing and configuring Tomcat with Ansible, including JVM settings, WAR deployment, SSL configuration, and manager app setup.

## Prerequisites

- Ansible 2.9+ on your control node
- Ubuntu 22.04 target servers
- Java JDK 17 (or your required version)
- WAR file from your build pipeline

## Project Structure

```
tomcat-setup/
  inventory/
    hosts.yml
  group_vars/
    all.yml
  roles/
    tomcat/
      tasks/
        main.yml
        install.yml
        configure.yml
        deploy.yml
      templates/
        server.xml.j2
        tomcat.service.j2
        setenv.sh.j2
        tomcat-users.xml.j2
        context.xml.j2
      handlers/
        main.yml
  playbook.yml
```

## Variables

```yaml
# group_vars/all.yml
tomcat_version: "10.1.18"
tomcat_major_version: "10"
tomcat_user: tomcat
tomcat_group: tomcat
tomcat_install_dir: /opt/tomcat
tomcat_home: "/opt/tomcat/apache-tomcat-{{ tomcat_version }}"
java_version: "17"

# JVM configuration
jvm_xms: "512m"
jvm_xmx: "1024m"
jvm_metaspace: "256m"
jvm_gc: "-XX:+UseG1GC -XX:MaxGCPauseMillis=200"

# Connector settings
tomcat_http_port: 8080
tomcat_https_port: 8443
tomcat_shutdown_port: 8005
tomcat_ajp_port: 8009
tomcat_max_threads: 200
tomcat_min_spare_threads: 25
tomcat_connection_timeout: 20000

# Application deployment
war_file_source: "../build/myapp.war"
app_context_path: "/"

# Manager app credentials
tomcat_admin_user: admin
```

## Installation Tasks

```yaml
# roles/tomcat/tasks/install.yml
---
- name: Install OpenJDK
  apt:
    name: "openjdk-{{ java_version }}-jdk-headless"
    state: present
    update_cache: yes

- name: Create Tomcat group
  group:
    name: "{{ tomcat_group }}"
    state: present

- name: Create Tomcat user
  user:
    name: "{{ tomcat_user }}"
    group: "{{ tomcat_group }}"
    home: "{{ tomcat_install_dir }}"
    shell: /bin/false
    system: yes
    create_home: no

- name: Create Tomcat installation directory
  file:
    path: "{{ tomcat_install_dir }}"
    state: directory
    owner: "{{ tomcat_user }}"
    group: "{{ tomcat_group }}"
    mode: '0755'

- name: Download Apache Tomcat
  get_url:
    url: "https://dlcdn.apache.org/tomcat/tomcat-{{ tomcat_major_version }}/v{{ tomcat_version }}/bin/apache-tomcat-{{ tomcat_version }}.tar.gz"
    dest: "/tmp/apache-tomcat-{{ tomcat_version }}.tar.gz"
    mode: '0644'

- name: Extract Tomcat archive
  unarchive:
    src: "/tmp/apache-tomcat-{{ tomcat_version }}.tar.gz"
    dest: "{{ tomcat_install_dir }}"
    remote_src: yes
    creates: "{{ tomcat_home }}/bin/startup.sh"
    owner: "{{ tomcat_user }}"
    group: "{{ tomcat_group }}"

- name: Create symlink to current Tomcat version
  file:
    src: "{{ tomcat_home }}"
    dest: "{{ tomcat_install_dir }}/current"
    state: link
    owner: "{{ tomcat_user }}"
    group: "{{ tomcat_group }}"

- name: Set ownership on Tomcat directories
  file:
    path: "{{ tomcat_home }}"
    state: directory
    owner: "{{ tomcat_user }}"
    group: "{{ tomcat_group }}"
    recurse: yes

- name: Make Tomcat scripts executable
  file:
    path: "{{ tomcat_home }}/bin"
    state: directory
    mode: '0755'
    recurse: yes
```

## Configuration Tasks

```yaml
# roles/tomcat/tasks/configure.yml
---
- name: Deploy JVM and environment settings
  template:
    src: setenv.sh.j2
    dest: "{{ tomcat_home }}/bin/setenv.sh"
    owner: "{{ tomcat_user }}"
    group: "{{ tomcat_group }}"
    mode: '0755'
  notify: restart tomcat

- name: Deploy Tomcat server.xml configuration
  template:
    src: server.xml.j2
    dest: "{{ tomcat_home }}/conf/server.xml"
    owner: "{{ tomcat_user }}"
    group: "{{ tomcat_group }}"
    mode: '0600'
  notify: restart tomcat

- name: Deploy Tomcat users configuration
  template:
    src: tomcat-users.xml.j2
    dest: "{{ tomcat_home }}/conf/tomcat-users.xml"
    owner: "{{ tomcat_user }}"
    group: "{{ tomcat_group }}"
    mode: '0600'
  notify: restart tomcat

- name: Deploy context configuration for manager app
  template:
    src: context.xml.j2
    dest: "{{ tomcat_home }}/webapps/manager/META-INF/context.xml"
    owner: "{{ tomcat_user }}"
    group: "{{ tomcat_group }}"
    mode: '0644'
  notify: restart tomcat

- name: Deploy systemd service file for Tomcat
  template:
    src: tomcat.service.j2
    dest: /etc/systemd/system/tomcat.service
    mode: '0644'
  notify:
    - reload systemd
    - restart tomcat

- name: Enable and start Tomcat service
  systemd:
    name: tomcat
    enabled: yes
    state: started

- name: Remove default Tomcat webapps (security hardening)
  file:
    path: "{{ tomcat_home }}/webapps/{{ item }}"
    state: absent
  loop:
    - ROOT
    - docs
    - examples
  when: remove_default_apps | default(true)
```

## Deployment Tasks

```yaml
# roles/tomcat/tasks/deploy.yml
---
- name: Check if WAR file exists locally
  local_action:
    module: stat
    path: "{{ war_file_source }}"
  register: war_check
  become: no

- name: Deploy WAR file to Tomcat
  copy:
    src: "{{ war_file_source }}"
    dest: "{{ tomcat_home }}/webapps/{{ app_context_path | replace('/', 'ROOT') if app_context_path == '/' else app_context_path | replace('/', '') }}.war"
    owner: "{{ tomcat_user }}"
    group: "{{ tomcat_group }}"
    mode: '0644'
  when: war_check.stat.exists
  notify: restart tomcat

- name: Wait for Tomcat to finish deploying the WAR
  wait_for:
    port: "{{ tomcat_http_port }}"
    delay: 10
    timeout: 120

- name: Verify application is deployed
  uri:
    url: "http://localhost:{{ tomcat_http_port }}{{ app_context_path }}"
    status_code: [200, 302]
  retries: 5
  delay: 10
```

## Main Tasks Entry

```yaml
# roles/tomcat/tasks/main.yml
---
- include_tasks: install.yml
- include_tasks: configure.yml
- include_tasks: deploy.yml
```

## JVM Environment Script

```bash
#!/bin/bash
# roles/tomcat/templates/setenv.sh.j2
# JVM configuration for Tomcat - managed by Ansible

# Heap memory settings
CATALINA_OPTS="$CATALINA_OPTS -Xms{{ jvm_xms }} -Xmx{{ jvm_xmx }}"

# Metaspace settings
CATALINA_OPTS="$CATALINA_OPTS -XX:MaxMetaspaceSize={{ jvm_metaspace }}"

# Garbage collection
CATALINA_OPTS="$CATALINA_OPTS {{ jvm_gc }}"

# Enable JMX monitoring
CATALINA_OPTS="$CATALINA_OPTS -Dcom.sun.management.jmxremote"
CATALINA_OPTS="$CATALINA_OPTS -Dcom.sun.management.jmxremote.port=9090"
CATALINA_OPTS="$CATALINA_OPTS -Dcom.sun.management.jmxremote.ssl=false"
CATALINA_OPTS="$CATALINA_OPTS -Dcom.sun.management.jmxremote.authenticate=false"

# Headless mode for server environments
CATALINA_OPTS="$CATALINA_OPTS -Djava.awt.headless=true"

# Set timezone
CATALINA_OPTS="$CATALINA_OPTS -Duser.timezone=UTC"

# GC logging (useful for production debugging)
CATALINA_OPTS="$CATALINA_OPTS -Xlog:gc*:file={{ tomcat_home }}/logs/gc.log:time,uptime:filecount=5,filesize=10m"

export CATALINA_OPTS
```

## Server Configuration

```xml
<!-- roles/tomcat/templates/server.xml.j2 -->
<?xml version="1.0" encoding="UTF-8"?>
<Server port="{{ tomcat_shutdown_port }}" shutdown="SHUTDOWN">
  <Listener className="org.apache.catalina.startup.VersionLoggerListener" />
  <Listener className="org.apache.catalina.core.AprLifecycleListener" SSLEngine="on" />
  <Listener className="org.apache.catalina.core.JreMemoryLeakPreventionListener" />
  <Listener className="org.apache.catalina.mbeans.GlobalResourcesLifecycleListener" />
  <Listener className="org.apache.catalina.core.ThreadLocalLeakPreventionListener" />

  <Service name="Catalina">
    <!-- HTTP Connector -->
    <Connector port="{{ tomcat_http_port }}"
               protocol="HTTP/1.1"
               connectionTimeout="{{ tomcat_connection_timeout }}"
               maxThreads="{{ tomcat_max_threads }}"
               minSpareThreads="{{ tomcat_min_spare_threads }}"
               acceptCount="100"
               enableLookups="false"
               compression="on"
               compressionMinSize="2048"
               compressibleMimeType="text/html,text/xml,text/plain,text/css,text/javascript,application/javascript,application/json"
               server="Apache"
               redirectPort="{{ tomcat_https_port }}" />

    <Engine name="Catalina" defaultHost="localhost">
      <Host name="localhost" appBase="webapps"
            unpackWARs="true" autoDeploy="true">
        <Valve className="org.apache.catalina.valves.AccessLogValve"
               directory="logs"
               prefix="access_log"
               suffix=".log"
               pattern="%h %l %u %t &quot;%r&quot; %s %b %D" />
      </Host>
    </Engine>
  </Service>
</Server>
```

## Systemd Service

```ini
# roles/tomcat/templates/tomcat.service.j2
[Unit]
Description=Apache Tomcat Web Application Container
After=network.target

[Service]
Type=forking
User={{ tomcat_user }}
Group={{ tomcat_group }}

Environment="JAVA_HOME=/usr/lib/jvm/java-{{ java_version }}-openjdk-amd64"
Environment="CATALINA_HOME={{ tomcat_home }}"
Environment="CATALINA_BASE={{ tomcat_home }}"
Environment="CATALINA_PID={{ tomcat_home }}/temp/tomcat.pid"

ExecStart={{ tomcat_home }}/bin/startup.sh
ExecStop={{ tomcat_home }}/bin/shutdown.sh
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Handlers

```yaml
# roles/tomcat/handlers/main.yml
---
- name: reload systemd
  systemd:
    daemon_reload: yes

- name: restart tomcat
  systemd:
    name: tomcat
    state: restarted
```

## Running the Playbook

```bash
# Install and configure Tomcat
ansible-playbook -i inventory/hosts.yml playbook.yml

# Deploy a new WAR file
ansible-playbook -i inventory/hosts.yml playbook.yml --tags deploy
```

## Wrapping Up

This Ansible playbook provides a production-ready Tomcat installation with JVM tuning, security hardening, and automated WAR deployment. The template-driven configuration lets you easily adjust memory settings, thread pools, and connector options per environment. By removing default webapps and restricting the manager application, you reduce the attack surface. The systemd integration ensures Tomcat starts on boot and restarts on failure. This is a solid foundation for running Java web applications in production.
