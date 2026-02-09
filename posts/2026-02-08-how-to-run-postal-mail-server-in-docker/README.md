# How to Run Postal Mail Server in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Postal, Mail Server, Email, SMTP, Self-Hosted, Containers, DevOps, Transactional Email

Description: Deploy Postal, an open-source mail delivery platform, in Docker for handling transactional and outbound email with tracking, webhooks, and multiple organization support.

---

Postal is an open-source mail delivery platform designed for sending outbound and transactional email. If you have ever relied on services like SendGrid, Mailgun, or Amazon SES for sending emails from your applications, Postal gives you the same capabilities on your own infrastructure. It provides HTTP APIs, SMTP relay, click and open tracking, bounce handling, webhooks, and support for multiple organizations and mail servers.

Running Postal in Docker is the recommended deployment method. The platform consists of several components including a web interface, worker processes, an SMTP server, and supporting services like MySQL, RabbitMQ, and Redis. This guide walks through the complete setup.

## Prerequisites

You need:

- Docker Engine 20.10+
- Docker Compose v2
- A server with a public IP address (for sending email)
- A domain name with DNS control
- At least 2GB of RAM

```bash
# Verify Docker
docker --version
docker compose version
```

## DNS Configuration

Before setting up Postal, configure your DNS records. Proper DNS is critical for email deliverability.

| Record Type | Name | Value | Purpose |
|-------------|------|-------|---------|
| A | postal.yourdomain.com | YOUR_SERVER_IP | Web interface |
| MX | postal.yourdomain.com | postal.yourdomain.com | Incoming mail |
| TXT | postal.yourdomain.com | v=spf1 ip4:YOUR_SERVER_IP ~all | SPF authentication |
| TXT | postal._domainkey.yourdomain.com | (DKIM key from Postal) | DKIM signing |
| A | rp.postal.yourdomain.com | YOUR_SERVER_IP | Return path domain |

## Project Setup

Create a directory structure for the Postal installation.

```bash
# Create the project directory
mkdir postal-docker && cd postal-docker

# Create directories for configuration and data
mkdir -p config
```

## Docker Compose Configuration

Postal requires MySQL, RabbitMQ, and a dedicated signing key. Here is the full Docker Compose file.

```yaml
# docker-compose.yml - Postal mail delivery platform
version: "3.8"

services:
  # Postal web interface and API
  postal-web:
    image: ghcr.io/postalserver/postal:latest
    container_name: postal-web
    command: postal web-server
    ports:
      - "5000:5000"
    volumes:
      - ./config/postal.yml:/config/postal.yml
      - postal-assets:/opt/postal/public/assets
    depends_on:
      mysql:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    networks:
      - postal-network
    restart: unless-stopped

  # Postal SMTP server for sending and receiving email
  postal-smtp:
    image: ghcr.io/postalserver/postal:latest
    container_name: postal-smtp
    command: postal smtp-server
    ports:
      - "25:25"
      - "587:587"
    volumes:
      - ./config/postal.yml:/config/postal.yml
    depends_on:
      - postal-web
    networks:
      - postal-network
    restart: unless-stopped

  # Postal worker processes for background jobs
  postal-worker:
    image: ghcr.io/postalserver/postal:latest
    container_name: postal-worker
    command: postal worker
    volumes:
      - ./config/postal.yml:/config/postal.yml
    depends_on:
      - postal-web
    networks:
      - postal-network
    restart: unless-stopped

  # MySQL database for Postal data
  mysql:
    image: mysql:8.0
    container_name: postal-mysql
    environment:
      MYSQL_ROOT_PASSWORD: postal_root_pass
      MYSQL_DATABASE: postal
      MYSQL_USER: postal
      MYSQL_PASSWORD: postal_db_pass
    volumes:
      - mysql-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 10
    networks:
      - postal-network
    restart: unless-stopped

  # RabbitMQ message broker for job queuing
  rabbitmq:
    image: rabbitmq:3.12-management-alpine
    container_name: postal-rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: postal
      RABBITMQ_DEFAULT_PASS: postal_rabbit_pass
      RABBITMQ_DEFAULT_VHOST: postal
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    ports:
      - "15672:15672"
    healthcheck:
      test: ["CMD-SHELL", "rabbitmq-diagnostics -q ping"]
      interval: 10s
      timeout: 5s
      retries: 10
    networks:
      - postal-network
    restart: unless-stopped

volumes:
  mysql-data:
  rabbitmq-data:
  postal-assets:

networks:
  postal-network:
    driver: bridge
```

## Postal Configuration

Create the Postal configuration file with your settings.

```yaml
# config/postal.yml - Postal server configuration
postal:
  web_hostname: postal.yourdomain.com
  web_protocol: https
  smtp_hostname: postal.yourdomain.com
  use_ip_pools: false
  default_maximum_delivery_attempts: 18
  default_maximum_hold_expiry_days: 7
  default_suppression_list_automatic_removal_days: 30

web_server:
  bind_address: 0.0.0.0
  port: 5000

main_db:
  host: mysql
  port: 3306
  username: postal
  password: postal_db_pass
  database: postal

message_db:
  host: mysql
  port: 3306
  username: root
  password: postal_root_pass
  prefix: postal

logging:
  stdout: true

rabbitmq:
  host: rabbitmq
  port: 5672
  username: postal
  password: postal_rabbit_pass
  vhost: postal

smtp_server:
  port: 25
  tls_enabled: false
  # For TLS, set the certificate paths
  # tls_certificate_path: /config/certs/cert.pem
  # tls_private_key_path: /config/certs/key.pem

dns:
  # Custom DNS records Postal tells users to set up
  mx_records:
    - mx.postal.yourdomain.com
  smtp_server_hostname: postal.yourdomain.com
  spf_include: spf.postal.yourdomain.com
  return_path_domain: rp.postal.yourdomain.com
  route_domain: routes.postal.yourdomain.com
  track_domain: track.postal.yourdomain.com
  helo_hostname: postal.yourdomain.com
  dkim_identifier: postal
  domain_verify_prefix: postal-verification
```

## Generating the Signing Key

Postal needs a signing key for various security operations.

```bash
# Generate a signing key
openssl genrsa -out config/signing.key 2048

# The key needs to be accessible to the Postal containers
# Add this volume mount to all postal services:
# - ./config/signing.key:/config/signing.key
```

Update the Postal services in docker-compose.yml to mount the signing key.

```yaml
# Add to volumes for postal-web, postal-smtp, and postal-worker
volumes:
  - ./config/postal.yml:/config/postal.yml
  - ./config/signing.key:/config/signing.key
```

## Starting the Stack

```bash
# Start the database and message broker first
docker compose up -d mysql rabbitmq

# Wait for them to become healthy
docker compose ps

# Initialize the Postal database
docker compose run --rm postal-web postal initialize

# Create the initial admin user
docker compose run --rm postal-web postal make-user

# Start all remaining services
docker compose up -d
```

The `postal make-user` command prompts you for an email and password to create the first admin account.

## Accessing the Web Interface

Open `http://postal.yourdomain.com:5000` (or your configured hostname) in your browser. Log in with the admin credentials you created during initialization.

## Setting Up a Mail Server in Postal

After logging in, create an organization and mail server.

1. Click "Create Organization"
2. Enter an organization name
3. Click "Build a mail server"
4. Configure the server name and mode (live or development)
5. Set up the sending domain with the DNS records Postal provides

## Sending Email via the API

Postal provides a REST API for sending email.

```bash
# Send an email through the Postal API
curl -X POST https://postal.yourdomain.com:5000/api/v1/send/message \
  -H "Content-Type: application/json" \
  -H "X-Server-API-Key: YOUR_API_KEY" \
  -d '{
    "to": ["recipient@example.com"],
    "from": "sender@yourdomain.com",
    "subject": "Test from Postal",
    "plain_body": "This is a test email sent from Postal running in Docker.",
    "html_body": "<h1>Hello from Postal</h1><p>This email was sent through our Docker-based mail server.</p>"
  }'
```

## Sending Email via SMTP

Configure your application to use Postal as an SMTP relay.

```
SMTP Host: postal.yourdomain.com
SMTP Port: 25 (or 587)
Username: (from Postal credentials)
Password: (from Postal credentials)
```

Example in Python.

```python
# Send email through Postal SMTP relay
import smtplib
from email.mime.text import MIMEText

msg = MIMEText("Hello from Postal in Docker!")
msg["Subject"] = "Test Email"
msg["From"] = "sender@yourdomain.com"
msg["To"] = "recipient@example.com"

# Connect to the Postal SMTP server
with smtplib.SMTP("postal.yourdomain.com", 25) as server:
    server.login("your_smtp_username", "your_smtp_password")
    server.send_message(msg)
    print("Email sent successfully")
```

## Webhook Configuration

Postal can send webhooks for delivery events like bounces, opens, and clicks.

```bash
# Configure a webhook endpoint in the Postal web interface
# Navigate to your mail server > Webhooks > Add Endpoint
# Postal will POST JSON payloads for events like:
# - MessageBounced
# - MessageDeliveryFailed
# - MessageLinkClicked
# - MessageLoaded (opened)
```

## Monitoring and Logs

```bash
# Check Postal service logs
docker compose logs -f postal-web
docker compose logs -f postal-smtp
docker compose logs -f postal-worker

# Monitor RabbitMQ queue depths
# Open http://localhost:15672 with postal/postal_rabbit_pass

# Check MySQL database size
docker compose exec mysql mysql -u postal -ppostal_db_pass -e "SELECT table_schema, ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb FROM information_schema.tables WHERE table_schema LIKE 'postal%' GROUP BY table_schema;"
```

## Backup and Restore

```bash
# Back up the MySQL database
docker compose exec mysql mysqldump -u root -ppostal_root_pass --all-databases > postal-backup-$(date +%Y%m%d).sql

# Back up the configuration
cp -r config postal-config-backup

# Restore from backup
cat postal-backup-20260201.sql | docker compose exec -T mysql mysql -u root -ppostal_root_pass
```

## Stopping and Cleaning Up

```bash
# Stop all services
docker compose down

# Remove everything including data
docker compose down -v
```

## Summary

Postal gives you a full-featured mail delivery platform that you own and control. Running it in Docker simplifies the deployment of its multi-service architecture, which includes a web interface, SMTP server, background workers, MySQL, and RabbitMQ. With proper DNS configuration, you get SPF, DKIM, and DMARC support for good deliverability. The HTTP API and SMTP relay make it easy to integrate with any application. Postal is a solid self-hosted alternative to commercial transactional email services.
