# How to Deploy Bookstack via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, BookStack, Wiki, Documentation, Docker, Self-Hosting, MySQL

Description: Learn how to deploy BookStack, the intuitive self-hosted documentation and wiki platform, via Portainer with a MySQL backend.

---

BookStack organizes content in a Books > Chapters > Pages hierarchy, making it intuitive for teams documenting infrastructure, processes, and knowledge bases. Portainer makes the two-container stack (BookStack + MySQL) easy to manage.

## Prerequisites

- Portainer running
- At least 512MB RAM
- A domain or IP for the `APP_URL` setting

## Compose Stack

```yaml
version: "3.8"

services:
  mysql:
    image: mysql:8.0
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: rootpass       # Change this
      MYSQL_DATABASE: bookstack
      MYSQL_USER: bookstack
      MYSQL_PASSWORD: bookstackpass       # Change this
    volumes:
      - mysql_data:/var/lib/mysql

  bookstack:
    image: linuxserver/bookstack:latest
    restart: unless-stopped
    depends_on:
      - mysql
    ports:
      - "6875:80"
    environment:
      PUID: 1000
      PGID: 1000
      APP_URL: http://bookstack.example.com:6875
      DB_HOST: mysql
      DB_PORT: 3306
      DB_USER: bookstack
      DB_PASS: bookstackpass              # Must match mysql service
      DB_DATABASE: bookstack
    volumes:
      - bookstack_data:/config

volumes:
  mysql_data:
  bookstack_data:
```

## Deploying

1. In Portainer go to **Stacks > Add Stack**.
2. Name it `bookstack`.
3. Update passwords and `APP_URL`.
4. Click **Deploy the stack**.

Open `http://<host>:6875` and log in with `admin@admin.com` / `password`. Change the admin email and password immediately.

## Organizing Content

BookStack uses a three-level hierarchy:

- **Books**: Top-level containers (e.g., "Infrastructure Runbooks")
- **Chapters**: Sections within a book (e.g., "Docker")
- **Pages**: Individual articles with the rich-text or Markdown editor

## LDAP Integration

For teams with existing LDAP/Active Directory, configure LDAP auth via environment variables:

```yaml
AUTH_METHOD: ldap
LDAP_SERVER: ldap://your-ldap-server
LDAP_BASE_DN: dc=example,dc=com
LDAP_ID_ATTRIBUTE: uid
LDAP_EMAIL_ATTRIBUTE: mail
```

## Monitoring

Use OneUptime to monitor `http://<host>:6875` for HTTP 200. BookStack downtime halts team knowledge sharing, so configure a prompt alert for any outage.
