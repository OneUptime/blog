# How to Configure UFW Application Profiles on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, UFW, Firewall, Security, Configuration

Description: Use and create UFW application profiles on Ubuntu to manage firewall rules for services by name rather than port numbers, simplifying multi-port service configuration.

---

UFW application profiles are named rule sets that map service names to the ports they use. Instead of remembering that Nginx needs ports 80 and 443, you can run `sudo ufw allow 'Nginx Full'` and both ports are opened with a single command.

Application profiles are particularly useful for services that use multiple ports, or when you want to document what each firewall rule is for rather than just listing port numbers.

## Viewing Available Profiles

UFW profiles are stored as text files in `/etc/ufw/applications.d/`. Many packages install their own profiles automatically:

```bash
# List all available application profiles
sudo ufw app list
```

Output on a typical Ubuntu server with common packages installed:

```text
Available applications:
  Apache
  Apache Full
  Apache Secure
  Nginx HTTP
  Nginx HTTPS
  Nginx Full
  OpenSSH
  Postfix
  Postfix SMTPS
  Postfix Submission
```

## Viewing Profile Details

Before using a profile, it's worth checking what ports it includes:

```bash
# View details of a specific profile
sudo ufw app info 'Nginx Full'
```

Output:

```text
Profile: Nginx Full
Title: Web Server (Nginx, HTTP + HTTPS)
Description: Small, but very powerful and efficient web server

Ports:
  80,443/tcp
```

```bash
# View the Apache Full profile
sudo ufw app info 'Apache Full'
```

```text
Profile: Apache Full
Title: Web Server (HTTP,HTTPS)
Description: Apache v2 is the next generation of the omnipresent Apache web
server.

Ports:
  80,443/tcp
```

## Using Application Profiles

```bash
# Allow a service using its profile name
sudo ufw allow 'Nginx Full'

# Allow only HTTPS for Nginx
sudo ufw allow 'Nginx HTTPS'

# Allow SSH using the OpenSSH profile
sudo ufw allow OpenSSH

# Deny a profile
sudo ufw deny 'Apache Full'

# Delete a profile-based rule
sudo ufw delete allow 'Nginx Full'
```

Check the result:

```bash
sudo ufw status verbose
```

```text
To                         Action      From
--                         ------      ----
Nginx Full                 ALLOW IN    Anywhere
OpenSSH                    ALLOW IN    Anywhere
```

This is significantly more readable than `80,443/tcp ALLOW IN Anywhere`.

## Profile Files Location and Format

Application profiles are stored as INI-format files in `/etc/ufw/applications.d/`:

```bash
# List profile files
ls /etc/ufw/applications.d/

# View the Nginx profile
cat /etc/ufw/applications.d/nginx
```

```ini
[Nginx HTTP]
title=Web Server (Nginx, HTTP)
description=Small, but very powerful and efficient web server
ports=80/tcp

[Nginx HTTPS]
title=Web Server (Nginx, HTTPS)
description=Small, but very powerful and efficient web server
ports=443/tcp

[Nginx Full]
title=Web Server (Nginx, HTTP + HTTPS)
description=Small, but very powerful and efficient web server
ports=80,443/tcp
```

## Creating Custom Application Profiles

Custom profiles let you give meaningful names to your application's firewall requirements. This is especially useful for applications with multiple ports or complex requirements.

### Single-Service Profile

Create a profile for a custom web application running on port 8080:

```bash
sudo nano /etc/ufw/applications.d/myapp
```

```ini
[MyApp]
title=My Custom Application
description=Internal web application on port 8080
ports=8080/tcp

[MyApp Full]
title=My Custom Application (HTTP + HTTPS)
description=Internal web application on HTTP and HTTPS
ports=8080,8443/tcp
```

```bash
# Verify the profile is recognized
sudo ufw app list
sudo ufw app info MyApp
sudo ufw app info 'MyApp Full'

# Allow the application
sudo ufw allow MyApp
```

### Multi-Service Profile

A profile for a game server that uses multiple ports and protocols:

```bash
sudo nano /etc/ufw/applications.d/gameserver
```

```ini
[GameServer]
title=Game Server
description=Multiplayer game server - TCP for management, UDP for game traffic
ports=27015/tcp|27015/udp|27016/udp

[GameServer RCON]
title=Game Server Remote Console
description=Remote console access for game server administration
ports=27015/tcp
```

The pipe character `|` separates different port/protocol combinations.

```bash
sudo ufw app info GameServer
```

```text
Profile: GameServer
Title: Game Server
Description: Multiplayer game server - TCP for management, UDP for game traffic

Ports:
  27015/tcp|27015/udp|27016/udp
```

### Monitoring Stack Profile

A profile for a Prometheus/Grafana monitoring stack:

```bash
sudo nano /etc/ufw/applications.d/monitoring
```

```ini
[Prometheus]
title=Prometheus Monitoring
description=Prometheus time-series database and query interface
ports=9090/tcp

[Grafana]
title=Grafana Dashboard
description=Grafana metrics visualization platform
ports=3000/tcp

[NodeExporter]
title=Prometheus Node Exporter
description=System metrics exporter for Prometheus
ports=9100/tcp

[AlertManager]
title=Prometheus AlertManager
description=Alerting component for Prometheus
ports=9093/tcp

[MonitoringFull]
title=Full Monitoring Stack
description=All ports for Prometheus, Grafana, and associated services
ports=9090,9093,9100,3000/tcp
```

```bash
# Allow the full monitoring stack from a specific subnet
sudo ufw allow from 10.100.0.0/24 to any app MonitoringFull

# Or allow individual components separately
sudo ufw allow from 10.100.0.20 to any app Prometheus
sudo ufw allow from 10.100.0.0/24 to any app Grafana
```

## Updating Existing Profiles

When an application's port changes or new ports are added:

```bash
# Edit the profile file
sudo nano /etc/ufw/applications.d/myapp

# After editing, update UFW's knowledge of the profile
sudo ufw app update MyApp

# Verify the update
sudo ufw app info MyApp
```

If a rule using the profile was already active, update it:

```bash
# The update command refreshes existing rules using this profile
sudo ufw app update MyApp
```

## Profiles for Well-Known Services

Some packages create their profiles automatically. Here are examples of manually creating profiles for services that don't include them:

```bash
sudo nano /etc/ufw/applications.d/database-services
```

```ini
[PostgreSQL]
title=PostgreSQL Database
description=PostgreSQL object-relational database system
ports=5432/tcp

[MySQL]
title=MySQL Database
description=MySQL relational database management system
ports=3306/tcp

[MongoDB]
title=MongoDB
description=MongoDB document database
ports=27017/tcp

[Redis]
title=Redis
description=Redis in-memory data structure store
ports=6379/tcp

[Memcached]
title=Memcached
description=High-performance, distributed memory object caching system
ports=11211/tcp|11211/udp
```

```bash
sudo nano /etc/ufw/applications.d/message-brokers
```

```ini
[RabbitMQ]
title=RabbitMQ Message Broker
description=RabbitMQ AMQP messaging broker
ports=5672/tcp

[RabbitMQManagement]
title=RabbitMQ Management Console
description=RabbitMQ web management interface
ports=15672/tcp

[Kafka]
title=Apache Kafka
description=Distributed event streaming platform
ports=9092/tcp

[KafkaZookeeper]
title=Kafka Zookeeper
description=Zookeeper coordination service for Kafka
ports=2181,2888,3888/tcp
```

## Using Profiles with Source Restrictions

Application profiles work with all the standard UFW rule options:

```bash
# Allow profile only from a specific IP
sudo ufw allow from 192.168.1.50 to any app PostgreSQL

# Allow profile from a subnet
sudo ufw allow from 10.0.0.0/8 to any app 'MonitoringFull'

# Allow on a specific interface
sudo ufw allow in on eth1 app Redis

# Limit a profile (rate limiting)
sudo ufw limit OpenSSH
```

## Organizing Profiles for Large Deployments

For servers running many services, organize profiles logically:

```bash
# Check all active profile-based rules
sudo ufw status | grep -v "^[0-9]\|Anywhere"

# Document your profiles
ls -la /etc/ufw/applications.d/
```

For infrastructure managed with configuration management (Ansible, Chef, Puppet), store your custom profile files in your config management repository and deploy them alongside the application configuration. This keeps firewall rules versioned alongside the application code.

```yaml
# Example Ansible task to deploy a custom UFW profile
- name: Deploy custom UFW application profile
  copy:
    src: files/ufw-profiles/myapp
    dest: /etc/ufw/applications.d/myapp
    owner: root
    group: root
    mode: '0644'
  notify: update ufw app profiles
```

Application profiles make UFW configurations self-documenting. When someone looks at the firewall rules and sees `ALLOW MyApp` instead of `ALLOW 8080,8443/tcp`, the purpose is immediately clear. For teams managing multiple servers, profiles also ensure consistency - if a service's ports change, updating the profile and reloading is simpler than hunting through port-based rules across multiple servers.
