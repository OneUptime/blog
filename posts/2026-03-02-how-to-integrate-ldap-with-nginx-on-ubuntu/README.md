# How to Integrate LDAP with Nginx on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LDAP, Nginx, Authentication, Web Server

Description: Configure Nginx on Ubuntu to authenticate users against an LDAP directory using the nginx-auth-ldap module or an authentication proxy for centralized access control.

---

Nginx does not have native LDAP authentication support in its open-source version. The two common approaches for LDAP-based authentication with Nginx are: using the community `nginx-auth-ldap` module (which requires compiling Nginx from source or using a third-party build), or using an authentication proxy such as `ldap-auth-daemon` or Vouch/oauth2-proxy that sits in front of Nginx and validates credentials. This guide covers both approaches.

## Prerequisites

- Ubuntu 22.04 or newer
- A running OpenLDAP or 389 Directory Server instance
- Root or sudo access

## Approach 1: Using nginx-ldap-auth-daemon

The `nginx-ldap-auth-daemon` is a small Python daemon included in the official Nginx Docker examples. It validates credentials forwarded from Nginx using `auth_request`.

### Install Dependencies

```bash
# Install Python and required packages
sudo apt install -y python3 python3-pip python3-ldap

# Install the daemon
sudo pip3 install python-ldap
```

### Set Up nginx-ldap-auth-daemon

Download the reference implementation from the Nginx GitHub repository:

```bash
# Download the nginx-ldap-auth daemon
sudo curl -o /usr/local/bin/nginx-ldap-auth-daemon.py \
  https://raw.githubusercontent.com/nginxinc/nginx-ldap-auth/main/nginx-ldap-auth-daemon.py

sudo chmod +x /usr/local/bin/nginx-ldap-auth-daemon.py
```

Create a configuration file:

```bash
sudo tee /etc/nginx-ldap-auth.conf > /dev/null <<'EOF'
# LDAP server URL
url ldap://127.0.0.1:389/dc=example,dc=com?uid?sub?(objectClass=inetOrgPerson)

# Bind credentials for searching the directory
binddn cn=readonly,dc=example,dc=com
binddn_passwd ReadOnlyPassword123

# The attribute to use as the username
attribute uid

# Cache successful authentications for 60 seconds
cache_time 60
EOF
```

Create a systemd service:

```bash
sudo tee /etc/systemd/system/nginx-ldap-auth.service > /dev/null <<'EOF'
[Unit]
Description=Nginx LDAP Auth Daemon
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/nginx-ldap-auth-daemon.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now nginx-ldap-auth
```

### Configure Nginx with auth_request

```bash
sudo nano /etc/nginx/sites-available/ldap-protected
```

```nginx
# Internal authentication endpoint
server {
    listen 8888;           # ldap-auth daemon listens here
    internal;              # not accessible from outside

    location / {
        proxy_pass http://127.0.0.1:8888;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        proxy_set_header X-Original-URI $request_uri;
    }
}

# The actual site with LDAP protection
server {
    listen 80;
    server_name myapp.example.com;

    # Point auth_request to the internal auth server
    auth_request /auth;

    # Handle auth errors with a login redirect
    error_page 401 = @error401;

    location @error401 {
        return 302 /login?return_to=$request_uri;
    }

    location /auth {
        internal;
        proxy_pass http://127.0.0.1:8888;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        proxy_set_header X-Original-URI $request_uri;
    }

    location / {
        root /var/www/html;
        index index.html;
    }
}
```

## Approach 2: HTTP Basic Auth Backed by LDAP

A simpler method that works with stock Nginx: use the `ngx_http_auth_basic_module` (already included) combined with a PAM module that delegates to LDAP.

### Install Required Packages

```bash
# Install PAM LDAP support
sudo apt install -y libpam-ldapd libnss-ldapd nscd

# Configure nslcd (the LDAP PAM daemon)
sudo dpkg-reconfigure nslcd
```

During configuration, provide:
- LDAP server URI: `ldap://127.0.0.1/`
- Search base: `dc=example,dc=com`

### Configure PAM for Nginx

Create a PAM service file for Nginx authentication:

```bash
sudo tee /etc/pam.d/nginx-auth > /dev/null <<'EOF'
auth    required   pam_ldap.so
account required   pam_ldap.so
EOF
```

Install the Nginx PAM auth helper:

```bash
sudo apt install -y nginx-extras

# The nginx extras package includes ngx_http_auth_pam_module
# Verify it is loaded
nginx -V 2>&1 | grep pam
```

### Configure Nginx to Use PAM

```bash
sudo nano /etc/nginx/sites-available/pam-auth
```

```nginx
server {
    listen 80;
    server_name secure.example.com;

    location / {
        # Use PAM authentication (which is backed by LDAP via nslcd)
        auth_pam "Restricted Area";
        auth_pam_service_name "nginx-auth";

        root /var/www/html;
        index index.html;
    }

    # Exclude specific paths from authentication
    location /public/ {
        auth_pam off;
        root /var/www/html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/pam-auth /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Approach 3: Using Vouch-Proxy (OAuth2/OIDC with LDAP backend)

For a modern solution, Vouch-Proxy integrates with identity providers that authenticate against LDAP (like Keycloak with LDAP federation). This approach gives you SSO across multiple applications.

### Install Vouch-Proxy

```bash
# Download the latest Vouch-Proxy binary
VOUCH_VERSION=0.40.0
wget https://github.com/vouch/vouch-proxy/releases/download/v${VOUCH_VERSION}/vouch-proxy-linux-amd64.gz
gunzip vouch-proxy-linux-amd64.gz
sudo mv vouch-proxy-linux-amd64 /usr/local/bin/vouch-proxy
sudo chmod +x /usr/local/bin/vouch-proxy

# Create config directory
sudo mkdir -p /etc/vouch

# Create configuration file
sudo tee /etc/vouch/config.yml > /dev/null <<'EOF'
vouch:
  logLevel: info
  port: 9090
  domains:
    - example.com
  jwt:
    secret: "changeme-use-a-real-secret-here"
    maxAge: 240  # minutes

oauth:
  provider: oidc
  client_id: vouch-client
  client_secret: your-client-secret
  auth_url: https://keycloak.example.com/auth/realms/myrealm/protocol/openid-connect/auth
  token_url: https://keycloak.example.com/auth/realms/myrealm/protocol/openid-connect/token
  user_info_url: https://keycloak.example.com/auth/realms/myrealm/protocol/openid-connect/userinfo
  scopes:
    - openid
    - email
    - profile
  callback_url: https://vouch.example.com/auth
EOF
```

### Configure Nginx to Use Vouch

```nginx
# vouch-protected site
server {
    listen 443 ssl;
    server_name app.example.com;

    # Validate the Vouch auth cookie
    auth_request /vouch-validate;
    error_page 401 = @error401;

    location @error401 {
        return 302 https://vouch.example.com/login?url=$scheme://$http_host$request_uri&vouch-failcount=$auth_resp_x_vouch_failcount&X-Vouch-Token=$auth_resp_x_vouch_jwt&error=$auth_resp_err;
    }

    location = /vouch-validate {
        internal;
        proxy_pass http://127.0.0.1:9090/validate;
        proxy_pass_request_body off;
        proxy_set_header Content-Length "";
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
    }
}
```

## Testing Authentication

```bash
# Test basic LDAP auth endpoint
curl -u "jsmith:password" http://myapp.example.com/

# Test with wrong credentials - should return 401
curl -u "jsmith:wrongpassword" -i http://myapp.example.com/

# Check Nginx error log for auth failures
sudo tail -f /var/log/nginx/error.log | grep auth
```

## Common Issues

### 401 Returned for Valid Credentials

```bash
# Test the LDAP bind manually
ldapsearch -x -H ldap://127.0.0.1 \
  -D "uid=jsmith,ou=People,dc=example,dc=com" \
  -W -b "dc=example,dc=com" "(uid=jsmith)"

# Check nslcd is running (for PAM approach)
sudo systemctl status nslcd

# Test PAM authentication directly
pamtester nginx-auth jsmith authenticate
```

### Nginx Returns 500 During Auth

```bash
# Check if the auth daemon is running
sudo systemctl status nginx-ldap-auth

# Look for connection refused errors
sudo journalctl -u nginx-ldap-auth -n 50

# Verify the proxy_pass address in nginx config matches the daemon port
grep proxy_pass /etc/nginx/sites-enabled/ldap-protected
```

Integrating LDAP with Nginx requires a bit more plumbing than Apache (which has `mod_authnz_ldap`), but the auth_request pattern is powerful once set up. It can authenticate users against any backend, not just LDAP.
