# How to Deploy IPv6 Services with Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, IPv6, Service, Nginx, Apache, Deployment, Automation

Description: A guide to deploying IPv6-enabled services (nginx, Apache, SSH) on Linux servers using Ansible, ensuring services bind to IPv6 addresses.

Deploying an IPv6 service requires more than just enabling IPv6 on the network - the application must also be configured to listen on IPv6 addresses. This guide covers deploying and verifying nginx, Apache, and SSH for IPv6 with Ansible on Debian/Ubuntu systems.

## Deploy nginx with IPv6 Support

```yaml
# deploy-nginx-ipv6.yml - Install and configure nginx to listen on IPv6

---
- name: Deploy nginx with IPv6 support
  hosts: web_servers
  become: true

  vars:
    server_name: "example.com"
    ipv6_address: "::"  # Listen on all IPv6 addresses
    port: 80

  tasks:
    - name: Install nginx
      ansible.builtin.package:
        name: nginx
        state: present

    - name: Create nginx document root
      ansible.builtin.file:
        path: "/var/www/{{ server_name }}"
        state: directory
        mode: "0755"

    - name: Write a sample index page
      ansible.builtin.copy:
        dest: "/var/www/{{ server_name }}/index.html"
        content: "IPv6-enabled nginx is running.\n"
        mode: "0644"

    - name: Write nginx virtual host configuration
      ansible.builtin.template:
        src: nginx-ipv6.conf.j2
        dest: "/etc/nginx/sites-available/{{ server_name }}"
        mode: "0644"
      notify: Reload nginx

    - name: Enable the virtual host
      ansible.builtin.file:
        src: "/etc/nginx/sites-available/{{ server_name }}"
        dest: "/etc/nginx/sites-enabled/{{ server_name }}"
        state: link
      notify: Reload nginx

    - name: Ensure nginx is running and enabled
      ansible.builtin.systemd:
        name: nginx
        state: started
        enabled: true

  handlers:
    - name: Reload nginx
      ansible.builtin.systemd:
        name: nginx
        state: reloaded
```

nginx template with IPv6:

```nginx
# templates/nginx-ipv6.conf.j2 - nginx config with dual-stack listeners
server {
    # Listen on all IPv4 addresses
    listen 0.0.0.0:{{ port }};

    # Listen on all IPv6 addresses (brackets required in nginx)
    listen [{{ ipv6_address }}]:{{ port }};

    server_name {{ server_name }};

    location / {
        root /var/www/{{ server_name }};
        index index.html;
    }
}
```

## Deploy Apache with IPv6 Support

```yaml
# deploy-apache-ipv6.yml
---
- name: Configure Apache to listen on IPv6
  hosts: web_servers
  become: true

  tasks:
    - name: Install Apache
      ansible.builtin.package:
        name: apache2
        state: present

    - name: Remove the default port 80 listener
      ansible.builtin.lineinfile:
        path: /etc/apache2/ports.conf
        regexp: "^Listen 80$"
        state: absent
      notify: Restart Apache

    - name: Ensure Apache listens on an IPv6 wildcard socket for port 80
      ansible.builtin.lineinfile:
        path: /etc/apache2/ports.conf
        regexp: "^Listen \\[::\\]:80$"
        line: "Listen [::]:80"
        insertbefore: BOF
      notify: Restart Apache

    - name: Write Apache virtual host for IPv6
      ansible.builtin.copy:
        dest: /etc/apache2/sites-available/000-default.conf
        content: |
          # Serve requests on port 80 for any address Apache is listening on
          <VirtualHost *:80>
              ServerName example.com
              DocumentRoot /var/www/html
              ErrorLog ${APACHE_LOG_DIR}/error.log
              CustomLog ${APACHE_LOG_DIR}/access.log combined
          </VirtualHost>
        mode: "0644"
      notify: Restart Apache

    - name: Ensure Apache is running and enabled
      ansible.builtin.systemd:
        name: apache2
        state: started
        enabled: true

  handlers:
    - name: Restart Apache
      ansible.builtin.systemd:
        name: apache2
        state: restarted
```

## Configure SSH for IPv6 Access

```yaml
# configure-ssh-ipv6.yml - Configure SSH daemon for dual-stack access
---
- name: Configure SSH for dual-stack access
  hosts: all
  become: true

  tasks:
    - name: Remove explicit ListenAddress directives so SSH binds to all local addresses
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "^#?ListenAddress"
        state: absent
      notify: Restart SSH

    - name: Ensure AddressFamily is any (allow both IPv4 and IPv6)
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "^#?AddressFamily"
        line: "AddressFamily any"
      notify: Restart SSH

  handlers:
    - name: Restart SSH
      ansible.builtin.systemd:
        name: ssh
        state: restarted
```

## Verify Services Are Listening on IPv6

```yaml
# verify-ipv6-services.yml
---
- name: Verify services listen on IPv6
  hosts: web_servers
  become: true

  vars:
    server_name: "example.com"

  tasks:
    - name: Check whether nginx is listening on IPv6 port 80
      ansible.builtin.command:
        argv:
          - ss
          - -H
          - -6
          - -ltnp
          - "sport = :80"
      register: nginx_listen
      changed_when: false

    - name: Assert nginx is listening on IPv6
      ansible.builtin.assert:
        that:
          - "'nginx' in nginx_listen.stdout"
        fail_msg: "nginx is not listening on IPv6 port 80"

    - name: Test HTTP via IPv6
      ansible.builtin.uri:
        url: "http://[::1]/"
        headers:
          Host: "{{ server_name }}"
        status_code: 200
```

## Run

```bash
ansible-playbook deploy-nginx-ipv6.yml -i inventory.ini
ansible-playbook verify-ipv6-services.yml -i inventory.ini
```

Configuring services to listen on IPv6 via Ansible ensures consistent dual-stack deployments across your Debian/Ubuntu server fleet, with automated verification that each service is correctly bound to both address families.
