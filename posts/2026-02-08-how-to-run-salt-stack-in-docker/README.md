# How to Run Salt Stack in Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, SaltStack, Salt, Configuration Management, DevOps, Automation, Infrastructure

Description: A hands-on guide to running SaltStack master and minion nodes inside Docker containers for configuration management.

---

SaltStack (or simply Salt) is a powerful configuration management and remote execution tool. Running it in Docker containers gives you a portable, disposable environment for testing Salt states, formulas, and orchestrations before deploying them to production servers. You can spin up a master with multiple minions in seconds and tear everything down when you are done.

This guide shows you how to set up a complete Salt environment in Docker, write and test states, and use it for both learning and CI testing.

## Understanding Salt Architecture

Salt uses a master-minion architecture. The Salt master holds your configuration states and orchestration logic. Minions connect to the master, receive instructions, and report back. Communication happens over ZeroMQ on ports 4505 and 4506 by default.

In Docker, we run the master as one container and spin up minion containers that connect to it over a shared network. This mirrors a real Salt deployment but fits on a single laptop.

## Setting Up the Salt Master Container

Start with a Dockerfile for the Salt master.

```dockerfile
# Dockerfile.master - Salt master container
FROM ubuntu:22.04

# Install Salt master packages
RUN apt-get update && \
    apt-get install -y curl gnupg2 && \
    curl -fsSL https://repo.saltproject.io/salt/py3/ubuntu/22.04/amd64/SALT-PROJECT-GPG-PUBKEY-2023.gpg | \
      gpg --dearmor -o /usr/share/keyrings/salt-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/salt-archive-keyring.gpg] https://repo.saltproject.io/salt/py3/ubuntu/22.04/amd64/latest jammy main" \
      > /etc/apt/sources.list.d/salt.list && \
    apt-get update && \
    apt-get install -y salt-master salt-minion && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Create directory for Salt states
RUN mkdir -p /srv/salt /srv/pillar

# Expose Salt master ports
EXPOSE 4505 4506

# Start the Salt master in the foreground
CMD ["salt-master", "-l", "info"]
```

## Setting Up the Salt Minion Container

The minion container is simpler. It just needs the Salt minion package and the address of the master.

```dockerfile
# Dockerfile.minion - Salt minion container
FROM ubuntu:22.04

# Install Salt minion
RUN apt-get update && \
    apt-get install -y curl gnupg2 && \
    curl -fsSL https://repo.saltproject.io/salt/py3/ubuntu/22.04/amd64/SALT-PROJECT-GPG-PUBKEY-2023.gpg | \
      gpg --dearmor -o /usr/share/keyrings/salt-archive-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/salt-archive-keyring.gpg] https://repo.saltproject.io/salt/py3/ubuntu/22.04/amd64/latest jammy main" \
      > /etc/apt/sources.list.d/salt.list && \
    apt-get update && \
    apt-get install -y salt-minion && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Start the Salt minion in the foreground
CMD ["salt-minion", "-l", "info"]
```

## Docker Compose for the Full Stack

Docker Compose ties everything together. The master and minions share a network, and the minions are configured to find the master by hostname.

```yaml
# docker-compose.yml - SaltStack master with multiple minions
version: "3.8"

services:
  salt-master:
    build:
      context: .
      dockerfile: Dockerfile.master
    container_name: salt-master
    hostname: salt-master
    ports:
      - "4505:4505"
      - "4506:4506"
    volumes:
      # Mount your Salt states and pillars
      - ./salt/states:/srv/salt
      - ./salt/pillar:/srv/pillar
      - ./salt/master.d:/etc/salt/master.d
    networks:
      - saltnet

  minion-web:
    build:
      context: .
      dockerfile: Dockerfile.minion
    container_name: minion-web
    hostname: minion-web
    environment:
      - SALT_MASTER=salt-master
    volumes:
      - ./salt/minion.d:/etc/salt/minion.d
    depends_on:
      - salt-master
    networks:
      - saltnet

  minion-db:
    build:
      context: .
      dockerfile: Dockerfile.minion
    container_name: minion-db
    hostname: minion-db
    environment:
      - SALT_MASTER=salt-master
    volumes:
      - ./salt/minion.d:/etc/salt/minion.d
    depends_on:
      - salt-master
    networks:
      - saltnet

networks:
  saltnet:
    driver: bridge
```

Create the minion configuration that points to the master.

```yaml
# salt/minion.d/master.conf - Minion configuration
master: salt-master
```

Create the master configuration to auto-accept minion keys for the development environment.

```yaml
# salt/master.d/dev.conf - Master configuration for development
auto_accept: True
file_roots:
  base:
    - /srv/salt
pillar_roots:
  base:
    - /srv/pillar
```

## Starting the Salt Environment

Build and start the containers.

```bash
# Create the directory structure for Salt files
mkdir -p salt/states salt/pillar salt/master.d salt/minion.d

# Build and start the Salt stack
docker compose up -d --build

# Wait a few seconds for minions to connect, then check connectivity
sleep 10
docker exec salt-master salt '*' test.ping
```

You should see both minions respond with `True`.

## Writing and Testing Salt States

Salt states define the desired configuration of your systems. Create a simple state that installs and configures Nginx.

```yaml
# salt/states/nginx/init.sls - Install and configure Nginx
nginx_package:
  pkg.installed:
    - name: nginx

nginx_service:
  service.running:
    - name: nginx
    - enable: True
    - require:
      - pkg: nginx_package

nginx_config:
  file.managed:
    - name: /etc/nginx/sites-available/default
    - source: salt://nginx/files/default.conf
    - template: jinja
    - require:
      - pkg: nginx_package
    - watch_in:
      - service: nginx_service
```

Create the Nginx config template.

```nginx
# salt/states/nginx/files/default.conf - Nginx site configuration
server {
    listen 80 default_server;
    server_name {{ grains['id'] }};

    location / {
        root /var/www/html;
        index index.html;
    }
}
```

Apply the state to the web minion.

```bash
# Apply the nginx state to minion-web
docker exec salt-master salt 'minion-web' state.apply nginx

# Verify Nginx is running on the minion
docker exec minion-web systemctl status nginx
```

## Using Salt Pillar for Configuration Data

Pillars store sensitive or environment-specific data. Create a pillar that defines different settings per minion.

```yaml
# salt/pillar/top.sls - Pillar top file maps data to minions
base:
  'minion-web':
    - web
  'minion-db':
    - database
```

```yaml
# salt/pillar/web.sls - Web server pillar data
app_port: 8080
app_workers: 4
app_name: mywebapp
```

```yaml
# salt/pillar/database.sls - Database pillar data
db_port: 5432
db_name: appdb
db_max_connections: 100
```

Refresh and verify pillar data.

```bash
# Refresh pillar data on all minions
docker exec salt-master salt '*' saltutil.refresh_pillar

# View pillar data for the web minion
docker exec salt-master salt 'minion-web' pillar.items
```

## Scaling Minions for Testing

Need to test a state against many minions? Docker Compose makes scaling straightforward.

```bash
# Scale minions to 5 instances
docker compose up -d --scale minion-web=5

# After a few seconds, list all connected minions
docker exec salt-master salt-key -L
```

## Running Salt in Masterless Mode

For simpler use cases, you can run Salt without a master. The minion applies states from its local filesystem.

```yaml
# docker-compose-masterless.yml - Masterless Salt setup
version: "3.8"

services:
  salt-local:
    build:
      context: .
      dockerfile: Dockerfile.minion
    container_name: salt-local
    volumes:
      - ./salt/states:/srv/salt
      - ./salt/pillar:/srv/pillar
    entrypoint: >
      salt-call --local
      state.apply
      -l info
```

```bash
# Run a masterless Salt apply
docker compose -f docker-compose-masterless.yml up
```

## CI/CD Testing with Salt in Docker

Use the Docker-based Salt environment to test your states in CI pipelines.

```yaml
# .github/workflows/test-salt.yml - Test Salt states in CI
name: Test Salt States

on:
  pull_request:
    paths:
      - "salt/**"

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Start Salt environment
        run: docker compose up -d --build

      - name: Wait for minions to connect
        run: |
          sleep 15
          docker exec salt-master salt '*' test.ping

      - name: Run Salt states
        run: |
          docker exec salt-master salt '*' state.apply test=True

      - name: Cleanup
        if: always()
        run: docker compose down -v
```

## Troubleshooting Common Issues

If minions cannot connect to the master, check that the master is fully started before minions try to connect. Add a health check to the master service and use `depends_on` with a condition.

Key acceptance problems usually mean auto-accept is not configured. Check that `master.d/dev.conf` is properly mounted and the master loaded it.

```bash
# Check the master's loaded configuration
docker exec salt-master salt-call --local config.get auto_accept

# Manually list and accept keys if needed
docker exec salt-master salt-key -L
docker exec salt-master salt-key -A -y
```

## Wrapping Up

Running SaltStack in Docker gives you a fast, reproducible environment for developing and testing infrastructure configurations. You can spin up a master with any number of minions, test your states, and tear it all down in seconds. This approach works equally well for learning Salt, developing new formulas, and running automated tests in CI. The combination of Salt's powerful configuration management and Docker's disposable containers is a natural fit for modern infrastructure workflows.
