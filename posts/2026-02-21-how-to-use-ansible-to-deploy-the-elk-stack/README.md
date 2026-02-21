# How to Use Ansible to Deploy the ELK Stack (Elasticsearch, Logstash, Kibana)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, ELK Stack, Elasticsearch, Logstash, Kibana, DevOps

Description: Automate the deployment of the complete ELK stack using Ansible for centralized log management and analysis across your infrastructure.

---

The ELK stack (Elasticsearch, Logstash, Kibana) is the most widely used open-source log management platform. Elasticsearch stores and indexes logs, Logstash processes and transforms them, and Kibana provides visualization and search. Deploying all three components manually, especially in a clustered setup, is complex and error-prone. Ansible automates the entire process, from system tuning to service configuration.

This post walks through deploying a production-ready ELK stack using Ansible roles for each component.

## Architecture

```mermaid
flowchart LR
    A[Application Servers] -->|Filebeat / Logstash| B[Logstash :5044]
    B -->|Processed logs| C[Elasticsearch :9200]
    C --> D[Kibana :5601]
    D --> E[Users / Dashboards]
```

## Project Structure

```
elk-stack/
  inventory/
    hosts.yml
  roles/
    elasticsearch/
      tasks/
        main.yml
      templates/
        elasticsearch.yml.j2
        jvm.options.j2
      defaults/
        main.yml
      handlers/
        main.yml
    logstash/
      tasks/
        main.yml
      templates/
        logstash.yml.j2
        pipeline.conf.j2
      defaults/
        main.yml
      handlers/
        main.yml
    kibana/
      tasks/
        main.yml
      templates/
        kibana.yml.j2
      defaults/
        main.yml
      handlers/
        main.yml
  playbook.yml
```

## Elasticsearch Role

### Default Variables

```yaml
# roles/elasticsearch/defaults/main.yml
elasticsearch_version: "8.11"
elasticsearch_cluster_name: "elk-cluster"
elasticsearch_node_name: "{{ ansible_hostname }}"
elasticsearch_network_host: "0.0.0.0"
elasticsearch_http_port: 9200
elasticsearch_transport_port: 9300

# JVM heap size (set to half of available RAM, max 32g)
elasticsearch_heap_size: "2g"

# Data and log paths
elasticsearch_data_dir: "/var/lib/elasticsearch"
elasticsearch_log_dir: "/var/log/elasticsearch"

# Cluster settings
elasticsearch_discovery_seed_hosts: []
elasticsearch_initial_master_nodes: []

# Security (disable for simple setups)
elasticsearch_security_enabled: false

# System tuning
elasticsearch_max_open_files: 65536
elasticsearch_max_map_count: 262144
```

### Tasks

```yaml
# roles/elasticsearch/tasks/main.yml
---
- name: Install required packages
  ansible.builtin.apt:
    name:
      - apt-transport-https
      - gnupg
    state: present
    update_cache: yes
  become: true

- name: Add Elasticsearch GPG key
  ansible.builtin.apt_key:
    url: https://artifacts.elastic.co/GPG-KEY-elasticsearch
    state: present
  become: true

- name: Add Elasticsearch repository
  ansible.builtin.apt_repository:
    repo: "deb https://artifacts.elastic.co/packages/{{ elasticsearch_version }}/apt stable main"
    state: present
    filename: elastic
  become: true

- name: Install Elasticsearch
  ansible.builtin.apt:
    name: elasticsearch
    state: present
    update_cache: yes
  become: true

- name: Configure system limits for Elasticsearch
  ansible.builtin.copy:
    dest: /etc/security/limits.d/elasticsearch.conf
    content: |
      elasticsearch soft nofile {{ elasticsearch_max_open_files }}
      elasticsearch hard nofile {{ elasticsearch_max_open_files }}
      elasticsearch soft memlock unlimited
      elasticsearch hard memlock unlimited
    mode: "0644"
  become: true

- name: Set vm.max_map_count for Elasticsearch
  ansible.posix.sysctl:
    name: vm.max_map_count
    value: "{{ elasticsearch_max_map_count }}"
    state: present
    reload: yes
  become: true

- name: Deploy Elasticsearch configuration
  ansible.builtin.template:
    src: elasticsearch.yml.j2
    dest: /etc/elasticsearch/elasticsearch.yml
    owner: root
    group: elasticsearch
    mode: "0660"
  become: true
  notify: Restart elasticsearch

- name: Deploy JVM options
  ansible.builtin.template:
    src: jvm.options.j2
    dest: /etc/elasticsearch/jvm.options.d/heap.options
    owner: root
    group: elasticsearch
    mode: "0660"
  become: true
  notify: Restart elasticsearch

- name: Enable and start Elasticsearch
  ansible.builtin.systemd:
    name: elasticsearch
    state: started
    enabled: true
    daemon_reload: true
  become: true

- name: Wait for Elasticsearch to be ready
  ansible.builtin.uri:
    url: "http://localhost:{{ elasticsearch_http_port }}/_cluster/health"
    status_code: 200
  register: es_health
  until: es_health.status == 200
  retries: 30
  delay: 5
```

### Elasticsearch Configuration Template

```yaml
# roles/elasticsearch/templates/elasticsearch.yml.j2
# Elasticsearch configuration - managed by Ansible
cluster.name: {{ elasticsearch_cluster_name }}
node.name: {{ elasticsearch_node_name }}

path.data: {{ elasticsearch_data_dir }}
path.logs: {{ elasticsearch_log_dir }}

network.host: {{ elasticsearch_network_host }}
http.port: {{ elasticsearch_http_port }}
transport.port: {{ elasticsearch_transport_port }}

{% if elasticsearch_discovery_seed_hosts | length > 0 %}
discovery.seed_hosts:
{% for host in elasticsearch_discovery_seed_hosts %}
  - "{{ host }}"
{% endfor %}
{% else %}
discovery.type: single-node
{% endif %}

{% if elasticsearch_initial_master_nodes | length > 0 %}
cluster.initial_master_nodes:
{% for node in elasticsearch_initial_master_nodes %}
  - "{{ node }}"
{% endfor %}
{% endif %}

xpack.security.enabled: {{ elasticsearch_security_enabled | lower }}
{% if not elasticsearch_security_enabled %}
xpack.security.http.ssl.enabled: false
xpack.security.transport.ssl.enabled: false
{% endif %}
```

### JVM Options Template

```
# roles/elasticsearch/templates/jvm.options.j2
# JVM heap size - managed by Ansible
-Xms{{ elasticsearch_heap_size }}
-Xmx{{ elasticsearch_heap_size }}
```

## Logstash Role

### Default Variables

```yaml
# roles/logstash/defaults/main.yml
logstash_version: "8.11"
logstash_heap_size: "1g"
logstash_beats_port: 5044
logstash_elasticsearch_host: "localhost:9200"

# Pipeline configuration
logstash_pipeline_workers: 2
logstash_pipeline_batch_size: 125
```

### Tasks

```yaml
# roles/logstash/tasks/main.yml
---
- name: Install Logstash
  ansible.builtin.apt:
    name: logstash
    state: present
    update_cache: yes
  become: true

- name: Deploy Logstash configuration
  ansible.builtin.template:
    src: logstash.yml.j2
    dest: /etc/logstash/logstash.yml
    owner: root
    group: logstash
    mode: "0640"
  become: true
  notify: Restart logstash

- name: Deploy Logstash pipeline configuration
  ansible.builtin.template:
    src: pipeline.conf.j2
    dest: /etc/logstash/conf.d/main.conf
    owner: root
    group: logstash
    mode: "0640"
  become: true
  notify: Restart logstash

- name: Enable and start Logstash
  ansible.builtin.systemd:
    name: logstash
    state: started
    enabled: true
    daemon_reload: true
  become: true
```

### Pipeline Configuration Template

```
# roles/logstash/templates/pipeline.conf.j2
# Logstash pipeline - managed by Ansible

input {
  beats {
    port => {{ logstash_beats_port }}
  }
}

filter {
  # Parse syslog messages
  if [fields][log_type] == "syslog" {
    grok {
      match => { "message" => "%{SYSLOGTIMESTAMP:syslog_timestamp} %{SYSLOGHOST:syslog_hostname} %{DATA:syslog_program}(?:\[%{POSINT:syslog_pid}\])?: %{GREEDYDATA:syslog_message}" }
    }
    date {
      match => [ "syslog_timestamp", "MMM  d HH:mm:ss", "MMM dd HH:mm:ss" ]
    }
  }

  # Parse JSON application logs
  if [fields][log_type] == "application" {
    json {
      source => "message"
      target => "app"
    }
  }

  # Add GeoIP data for IP addresses
  if [client_ip] {
    geoip {
      source => "client_ip"
    }
  }
}

output {
  elasticsearch {
    hosts => ["{{ logstash_elasticsearch_host }}"]
    index => "%{[@metadata][beat]}-%{+YYYY.MM.dd}"
  }
}
```

## Kibana Role

### Default Variables

```yaml
# roles/kibana/defaults/main.yml
kibana_version: "8.11"
kibana_server_host: "0.0.0.0"
kibana_server_port: 5601
kibana_elasticsearch_url: "http://localhost:9200"
kibana_server_name: "kibana"
```

### Tasks

```yaml
# roles/kibana/tasks/main.yml
---
- name: Install Kibana
  ansible.builtin.apt:
    name: kibana
    state: present
    update_cache: yes
  become: true

- name: Deploy Kibana configuration
  ansible.builtin.template:
    src: kibana.yml.j2
    dest: /etc/kibana/kibana.yml
    owner: root
    group: kibana
    mode: "0660"
  become: true
  notify: Restart kibana

- name: Enable and start Kibana
  ansible.builtin.systemd:
    name: kibana
    state: started
    enabled: true
    daemon_reload: true
  become: true

- name: Wait for Kibana to be ready
  ansible.builtin.uri:
    url: "http://localhost:{{ kibana_server_port }}/api/status"
    status_code: 200
  register: kibana_health
  until: kibana_health.status == 200
  retries: 30
  delay: 10
```

### Kibana Configuration Template

```yaml
# roles/kibana/templates/kibana.yml.j2
# Kibana configuration - managed by Ansible
server.port: {{ kibana_server_port }}
server.host: "{{ kibana_server_host }}"
server.name: "{{ kibana_server_name }}"
elasticsearch.hosts: ["{{ kibana_elasticsearch_url }}"]
```

## The Main Playbook

```yaml
# playbook.yml
---
- name: Deploy ELK Stack
  hosts: elk
  become: true
  vars:
    elasticsearch_heap_size: "4g"
    logstash_heap_size: "2g"
  roles:
    - elasticsearch
    - logstash
    - kibana
```

## Running the Deployment

```bash
# Deploy the full ELK stack
ansible-playbook -i inventory/hosts.yml playbook.yml

# Verify all components
curl http://elk-server:9200/_cluster/health?pretty
curl http://elk-server:5601/api/status
```

## Summary

Deploying the ELK stack with Ansible gives you a repeatable, version-controlled setup that handles system tuning, configuration, and service management for all three components. The role-based approach means you can deploy Elasticsearch, Logstash, and Kibana on the same server for development or on separate servers for production. With the pipeline configuration templated, you can adjust log parsing rules per environment without touching the core Ansible code.
