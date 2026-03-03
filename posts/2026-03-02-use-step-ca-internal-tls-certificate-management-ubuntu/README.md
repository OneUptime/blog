# How to Use step-ca for Internal TLS Certificate Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSL/TLS, PKI, DevOps

Description: Learn how to set up and use step-ca as a private Certificate Authority on Ubuntu for automated internal TLS certificate management with ACME protocol support.

---

Running a private CA for internal services typically involves OpenSSL commands, manual certificate signing, and distributing certs by hand. step-ca (from Smallstep) replaces this with an automated, API-driven certificate authority that speaks ACME - the same protocol Let's Encrypt uses. Internal services can request certificates automatically, and certificates can be short-lived with automatic renewal.

## Installing step-ca and step CLI

Both tools are needed: `step` is the CLI client, `step-ca` is the certificate authority server.

```bash
# Install step CLI (the client tool)
# Download the latest release
wget -qO /tmp/step.tar.gz \
    "https://dl.smallstep.com/cli/docs-ca-install/latest/step_linux_amd64.tar.gz"
tar -xzf /tmp/step.tar.gz -C /tmp
sudo install /tmp/step_linux_*/bin/step /usr/local/bin/step

# Verify installation
step version

# Install step-ca (the CA server)
wget -qO /tmp/step-ca.tar.gz \
    "https://dl.smallstep.com/certificates/docs-ca-install/latest/step-ca_linux_amd64.tar.gz"
tar -xzf /tmp/step-ca.tar.gz -C /tmp
sudo install /tmp/step-ca_linux_*/bin/step-ca /usr/local/bin/step-ca

step-ca version
```

Alternatively, use the official packages:

```bash
# Add Smallstep's package repository
wget -qO- https://packages.smallstep.com/stable/deb/smallstep.gpg | \
    sudo tee /etc/apt/trusted.gpg.d/smallstep.gpg > /dev/null
echo "deb https://packages.smallstep.com/stable/deb/ any main" | \
    sudo tee /etc/apt/sources.list.d/smallstep.list

sudo apt update
sudo apt install step-cli step-certificates
```

## Initializing the Certificate Authority

```bash
# Create a dedicated user for running step-ca
sudo useradd --system --home /etc/step-ca --shell /bin/false step

# Create the CA directory
sudo mkdir -p /etc/step-ca
sudo chown step:step /etc/step-ca

# Initialize the CA as the step user
# This creates the CA root key, intermediate key, and config
sudo -u step step ca init \
    --name "Internal CA" \
    --dns "ca.internal.example.com" \
    --address ":9000" \
    --provisioner admin@example.com \
    --deployment-type standalone \
    --home /etc/step-ca

# You'll be prompted to:
# 1. Confirm the CA configuration
# 2. Set a password for the root CA key
# 3. Set a password for the intermediate key (can be different)
```

After initialization, the CA structure is:

```text
/etc/step-ca/
├── certs/
│   ├── root_ca.crt          # Root CA certificate (share this with clients)
│   └── intermediate_ca.crt  # Intermediate CA certificate
├── config/
│   └── ca.json              # Main CA configuration
├── db/                      # Certificate database
├── secrets/
│   └── root_ca_key          # Encrypted root CA private key
└── templates/               # Certificate templates
```

## Creating a systemd Service

```bash
# Store the intermediate key password so the CA can start automatically
# In production, use a secrets manager instead of a plaintext file
echo "YourIntermediateKeyPassword" | \
    sudo tee /etc/step-ca/password.txt > /dev/null
sudo chmod 400 /etc/step-ca/password.txt
sudo chown step:step /etc/step-ca/password.txt

# Create the systemd service file
sudo tee /etc/systemd/system/step-ca.service << 'EOF'
[Unit]
Description=step-ca Certificate Authority
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=step
Group=step
Environment=STEPPATH=/etc/step-ca
ExecStart=/usr/local/bin/step-ca \
    /etc/step-ca/config/ca.json \
    --password-file=/etc/step-ca/password.txt
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable step-ca
sudo systemctl start step-ca
sudo systemctl status step-ca
```

## Distributing the Root Certificate

Clients need to trust the CA's root certificate before requesting certificates:

```bash
# View the root CA certificate fingerprint
step certificate fingerprint /etc/step-ca/certs/root_ca.crt

# Bootstrap a client to trust this CA
# On each client machine, run:
step ca bootstrap \
    --ca-url https://ca.internal.example.com:9000 \
    --fingerprint <root-ca-fingerprint>

# This creates ~/.step/ config and adds the root CA to the local trust store
```

On Ubuntu client machines, install the root CA to the system trust store:

```bash
# Copy the root CA to the system trust location
sudo cp /etc/step-ca/certs/root_ca.crt /usr/local/share/ca-certificates/internal-ca.crt
sudo update-ca-certificates
```

## Adding Provisioners

Provisioners control how certificates are issued. The default is a JWK (JSON Web Key) provisioner requiring admin authentication. For ACME (automated), add an ACME provisioner:

```bash
# Add an ACME provisioner
step ca provisioner add acme --type ACME

# This allows any ACME client (Certbot, acme.sh, etc.) to request certificates
# from your internal CA
```

View existing provisioners:

```bash
step ca provisioner list
```

## Requesting Certificates Manually

```bash
# Request a certificate for a service
# You'll be prompted for the provisioner password
step ca certificate "service.internal.example.com" \
    service.crt service.key \
    --ca-url https://ca.internal.example.com:9000 \
    --root /etc/step-ca/certs/root_ca.crt \
    --san "service.internal.example.com" \
    --san "10.0.0.50"  # Optional: add IP SAN

# Request with a specific validity period (max 24h by default)
step ca certificate "db.internal.example.com" db.crt db.key \
    --not-after 720h  # 30 days

# Inspect the resulting certificate
step certificate inspect service.crt
```

## Automating Certificate Renewal with step CLI

```bash
# Set up automatic renewal for a certificate
# step ca renew runs in daemon mode and renews at ~2/3 of the validity period
sudo step ca renew \
    --daemon \
    --ca-url https://ca.internal.example.com:9000 \
    --root /etc/step-ca/certs/root_ca.crt \
    --exec "systemctl reload nginx" \
    service.crt service.key

# Create a systemd service for renewal
sudo tee /etc/systemd/system/cert-renewer-nginx.service << 'EOF'
[Unit]
Description=Certificate Renewer for nginx
After=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/step ca renew \
    --daemon \
    --exec "systemctl reload nginx" \
    /etc/nginx/certs/service.crt \
    /etc/nginx/certs/service.key
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable cert-renewer-nginx
sudo systemctl start cert-renewer-nginx
```

## Using ACME Protocol with Certbot Against Internal CA

With the ACME provisioner added, use Certbot to request certificates from your internal CA:

```bash
# Install Certbot
sudo apt install certbot

# Request a certificate from internal CA using ACME
sudo certbot certonly \
    --standalone \
    --server https://ca.internal.example.com:9000/acme/acme/directory \
    --no-verify-ssl \
    -d service.internal.example.com

# If your internal CA certificate is in the system trust store:
sudo certbot certonly \
    --standalone \
    --server https://ca.internal.example.com:9000/acme/acme/directory \
    -d service.internal.example.com
```

## Using acme.sh with Internal step-ca

`acme.sh` is a lightweight ACME client that works well with custom CA URLs:

```bash
# Install acme.sh
curl https://get.acme.sh | sh

# Register and get a certificate
acme.sh --register-account \
    --server https://ca.internal.example.com:9000/acme/acme/directory

acme.sh --issue \
    --standalone \
    -d service.internal.example.com \
    --server https://ca.internal.example.com:9000/acme/acme/directory
```

## Viewing the CA's Issued Certificates

```bash
# List certificates issued by the CA
step ca certificate list \
    --ca-url https://ca.internal.example.com:9000 \
    --root /etc/step-ca/certs/root_ca.crt

# Revoke a certificate if compromised
step ca revoke --ca-url https://ca.internal.example.com:9000 \
    --cert service.crt --key service.key

# Or revoke by serial number
step ca revoke --ca-url https://ca.internal.example.com:9000 \
    --serial <serial-number>
```

## Configuring Certificate Templates

Customize what goes into issued certificates using templates:

```bash
# Create a template for web server certificates
sudo tee /etc/step-ca/templates/webserver.tpl << 'EOF'
{
    "subject": {{ toJson .Subject }},
    "sans": {{ toJson .SANs }},
    "keyUsage": ["digitalSignature"],
    "extKeyUsage": ["serverAuth"],
    "basicConstraints": {
        "isCA": false
    }
}
EOF
```

Reference the template when requesting certificates:

```bash
step ca certificate "service.example.com" service.crt service.key \
    --template /etc/step-ca/templates/webserver.tpl
```

## Summary

step-ca provides a modern, API-driven private Certificate Authority with ACME support. Initialize it with `step ca init`, create a systemd service for persistent operation, distribute the root CA to client trust stores, and add an ACME provisioner for automated certificate requests. Services can request and automatically renew certificates using Certbot, acme.sh, or the `step` CLI directly. Short certificate lifetimes (24 hours to 30 days) with automated renewal are the recommended pattern - they eliminate the manual work of certificate management while maintaining security through frequent key rotation.
