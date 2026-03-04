# How to Secure Jenkins with SSL and Role-Based Access on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Jenkins, SSL, Security, CI/CD, Linux

Description: Learn how to secure a Jenkins installation on RHEL by configuring SSL/TLS with a reverse proxy and enabling role-based access control for granular permissions.

---

Securing Jenkins is critical for any production CI/CD pipeline. This guide walks through configuring SSL termination via Nginx and setting up role-based access control (RBAC) on RHEL.

## Prerequisites

- Jenkins installed and running on RHEL
- Nginx installed
- A valid SSL certificate (or self-signed for testing)

## Configure Nginx as an SSL Reverse Proxy

First, install Nginx and open the firewall:

```bash
# Install nginx
sudo dnf install -y nginx

# Allow HTTPS traffic
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

Create the Nginx configuration for Jenkins:

```bash
# Create the Jenkins proxy config
sudo tee /etc/nginx/conf.d/jenkins.conf << 'CONF'
upstream jenkins {
    server 127.0.0.1:8080;
}

server {
    listen 443 ssl;
    server_name jenkins.example.com;

    ssl_certificate /etc/pki/tls/certs/jenkins.crt;
    ssl_certificate_key /etc/pki/tls/private/jenkins.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://jenkins;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
CONF

# Test and start nginx
sudo nginx -t
sudo systemctl enable --now nginx
```

Update Jenkins to listen only on localhost:

```bash
# Edit Jenkins config to bind to localhost only
sudo sed -i 's/^JENKINS_LISTEN_ADDRESS=.*/JENKINS_LISTEN_ADDRESS="127.0.0.1"/' /etc/sysconfig/jenkins
sudo systemctl restart jenkins
```

## Set Up Role-Based Access Control

Install the Role-Based Authorization Strategy plugin:

1. Navigate to Manage Jenkins > Plugins > Available plugins
2. Search for "Role-based Authorization Strategy" and install it
3. Go to Manage Jenkins > Security
4. Under Authorization, select "Role-Based Strategy"
5. Save the configuration

Now configure roles under Manage Jenkins > Manage and Assign Roles:

```text
Global Roles:
  admin    - Full permissions
  developer - Read, Build, Cancel
  viewer   - Read only

Project Roles (pattern-based):
  frontend-dev  - Pattern: frontend-.*  (Build, Read, Workspace)
  backend-dev   - Pattern: backend-.*   (Build, Read, Workspace)
```

Assign users to roles in the "Assign Roles" tab. This lets you restrict who can build, configure, or view specific projects based on naming patterns.

## SELinux Configuration

If SELinux is enforcing, allow Nginx to connect to Jenkins:

```bash
# Allow nginx to proxy to Jenkins port
sudo setsebool -P httpd_can_network_connect 1
```

With SSL termination and RBAC in place, your Jenkins instance is significantly more secure and ready for team use.
