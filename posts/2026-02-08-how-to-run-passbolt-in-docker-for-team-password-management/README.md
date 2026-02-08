# How to Run Passbolt in Docker for Team Password Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, passbolt, password-manager, team-security, self-hosted, gpg

Description: Deploy Passbolt in Docker for secure team password sharing with GPG encryption, RBAC, and audit logging capabilities.

---

Passbolt is an open-source password manager built specifically for teams and organizations. Unlike personal password managers, Passbolt focuses on sharing credentials securely between team members using GPG encryption. Each user has their own GPG key pair, and passwords are encrypted individually for each recipient. Running Passbolt in Docker simplifies deployment and keeps the complex stack of services manageable.

## Why Passbolt for Teams?

Most password managers treat sharing as an afterthought. Passbolt was designed from the ground up for collaborative use. Every password is encrypted with the recipient's GPG public key, so even the server administrator cannot read the stored credentials. The browser extension handles encryption and decryption client-side, meaning plaintext passwords never travel over the network. Role-based access control lets you define who can view, edit, or share specific credentials.

## Prerequisites

- A Linux server with Docker and Docker Compose installed
- At least 2 GB of RAM
- A domain name with DNS pointing to your server
- An SMTP server or email provider for sending invitations
- SSL certificates (Let's Encrypt works perfectly)

## Project Setup

```bash
# Create the Passbolt project directory
mkdir -p ~/passbolt/{gpg,jwt}
cd ~/passbolt
```

## Generating GPG Server Keys

Passbolt requires a GPG key pair for server-side operations. Generate one before starting the containers:

```bash
# Generate a GPG key pair for the Passbolt server
docker run --rm -v ~/passbolt/gpg:/gpg \
  passbolt/passbolt:latest \
  gpg --batch --gen-key <<EOF
Key-Type: RSA
Key-Length: 3072
Subkey-Type: RSA
Subkey-Length: 3072
Name-Real: Passbolt Server
Name-Email: passbolt@your-domain.com
Expire-Date: 0
%no-protection
EOF
```

Alternatively, you can let the container generate keys automatically on first run by setting the appropriate environment variables.

## Docker Compose Configuration

Passbolt needs a MySQL or MariaDB database. Here is the complete stack:

```yaml
# docker-compose.yml - Passbolt Team Password Manager
version: "3.8"

services:
  db:
    image: mariadb:11
    container_name: passbolt-db
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: root_password_change_me
      MYSQL_DATABASE: passbolt
      MYSQL_USER: passbolt
      MYSQL_PASSWORD: db_password_change_me
    volumes:
      # Persist database files
      - ./db:/var/lib/mysql
    networks:
      - passbolt-net

  passbolt:
    image: passbolt/passbolt:latest-ce
    container_name: passbolt
    restart: unless-stopped
    depends_on:
      - db
    ports:
      - "443:443"
      - "80:80"
    environment:
      # Application configuration
      APP_FULL_BASE_URL: "https://pass.your-domain.com"

      # Database connection
      DATASOURCES_DEFAULT_HOST: db
      DATASOURCES_DEFAULT_PORT: 3306
      DATASOURCES_DEFAULT_DATABASE: passbolt
      DATASOURCES_DEFAULT_USERNAME: passbolt
      DATASOURCES_DEFAULT_PASSWORD: db_password_change_me

      # Email (SMTP) configuration for user invitations
      EMAIL_DEFAULT_FROM_NAME: "Passbolt"
      EMAIL_DEFAULT_FROM: "passbolt@your-domain.com"
      EMAIL_TRANSPORT_DEFAULT_HOST: "smtp.gmail.com"
      EMAIL_TRANSPORT_DEFAULT_PORT: 587
      EMAIL_TRANSPORT_DEFAULT_TLS: "true"
      EMAIL_TRANSPORT_DEFAULT_USERNAME: "your-email@gmail.com"
      EMAIL_TRANSPORT_DEFAULT_PASSWORD: "your-app-password"

      # GPG server key configuration
      PASSBOLT_GPG_SERVER_KEY_FINGERPRINT: "YOUR_KEY_FINGERPRINT"

      # Enable HTTPS
      PASSBOLT_SSL_FORCE: "true"
    volumes:
      # GPG keys
      - ./gpg:/etc/passbolt/gpg
      # JWT authentication keys
      - ./jwt:/etc/passbolt/jwt
      # SSL certificates
      - ./certs:/etc/ssl/certs/passbolt
    networks:
      - passbolt-net

networks:
  passbolt-net:
    driver: bridge
```

## Starting the Stack

```bash
# Start the database first and let it initialize
docker compose up -d db
sleep 10

# Then start Passbolt
docker compose up -d passbolt
```

Watch the logs to monitor the setup process:

```bash
# Monitor Passbolt initialization
docker compose logs -f passbolt
```

The first startup takes several minutes as Passbolt runs database migrations and generates encryption keys.

## Creating the Admin User

After the containers are running, create the first admin user from the command line:

```bash
# Create the first admin user
docker exec -it passbolt su -m -c \
  "/usr/share/php/passbolt/bin/cake passbolt register_user \
  -u admin@your-domain.com \
  -f Admin \
  -l User \
  -r admin" -s /bin/sh www-data
```

This command outputs a URL. Open it in your browser to complete the registration. You will need to install the Passbolt browser extension first.

## Installing the Browser Extension

Passbolt requires a browser extension for client-side encryption. Install it from:

- Chrome: Search "Passbolt" in the Chrome Web Store
- Firefox: Search "Passbolt" in Firefox Add-ons

During setup, the extension generates your personal GPG key pair. The private key stays in your browser and never reaches the server. Set a strong passphrase for your key.

## Team Onboarding Workflow

Adding team members follows this process:

1. An admin invites a user via email from the Passbolt web interface
2. The user receives an email with a setup link
3. They install the browser extension
4. The extension generates their GPG key pair
5. They set a passphrase and complete registration

Each new team member gets their own GPG key pair. When you share a password with someone, Passbolt encrypts it with their public key so only they can decrypt it.

## Organizing Passwords

Passbolt uses folders and tags to organize credentials:

- **Folders** - Create a hierarchical structure like "Production Servers," "Development," "Third-Party Services"
- **Tags** - Add labels like "critical," "shared," or "temporary" for filtering
- **Groups** - Create groups like "Engineering," "DevOps," "Marketing" and share folders with entire groups

```bash
# You can also manage resources via the Passbolt CLI
docker exec -it passbolt su -m -c \
  "/usr/share/php/passbolt/bin/cake passbolt healthcheck" -s /bin/sh www-data
```

## Audit Logging

Passbolt tracks every action on shared credentials. The audit log records who accessed, modified, or shared each password and when. This is critical for compliance and incident response. View audit logs through the web interface or query them via the API.

## API Access

Passbolt has a REST API for automation. You can integrate it with your CI/CD pipelines to retrieve secrets programmatically:

```bash
# Example: retrieve a resource using the Passbolt API
# First, you need to authenticate with your GPG key
curl -X GET "https://pass.your-domain.com/resources.json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

For more advanced automation, use the official Passbolt CLI tool or community SDKs.

## Health Check

Run the built-in health check to verify your installation:

```bash
# Run the Passbolt health check
docker exec -it passbolt su -m -c \
  "/usr/share/php/passbolt/bin/cake passbolt healthcheck" -s /bin/sh www-data
```

This checks the database connection, GPG configuration, email settings, SSL status, and filesystem permissions. Fix any issues flagged as errors before using the system in production.

## Backup Strategy

Back up three things: the database, GPG keys, and JWT keys:

```bash
# Dump the database
docker exec passbolt-db mysqldump -u passbolt -pdb_password_change_me passbolt > ~/passbolt-backup/db_$(date +%Y%m%d).sql

# Back up GPG and JWT keys
cp -r ~/passbolt/gpg ~/passbolt-backup/gpg_$(date +%Y%m%d)
cp -r ~/passbolt/jwt ~/passbolt-backup/jwt_$(date +%Y%m%d)
```

Without the GPG server key, encrypted data cannot be recovered. Treat key backups with the same care as the database.

## Updating Passbolt

```bash
# Pull the latest image and recreate the container
docker compose pull passbolt
docker compose up -d passbolt
```

Passbolt runs database migrations automatically during startup. Always review the release notes and back up before updating.

## Monitoring with OneUptime

Monitor your Passbolt instance with OneUptime by setting up HTTPS checks against the login page. Since Passbolt manages your team's most sensitive credentials, any downtime is critical. Configure immediate alerts so you can respond quickly to outages.

## Wrapping Up

Passbolt in Docker provides enterprise-grade password management with true end-to-end encryption. The GPG-based architecture means even a compromised server cannot expose plaintext passwords. With audit logging, role-based access control, and a browser extension for seamless daily use, Passbolt is a solid choice for teams that take credential security seriously.
