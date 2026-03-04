# How to Create Custom Firewalld Services and Zones on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Firewalld, Custom Services, Security, Linux

Description: Learn how to create custom firewalld services and zones on RHEL for applications that do not have predefined firewall definitions, with practical examples.

---

Firewalld ships with predefined services for common applications like SSH, HTTP, and MySQL. But most real-world environments run custom applications on non-standard ports. Instead of scattering `--add-port` commands everywhere, you can create custom service definitions that bundle related ports together and give them a meaningful name.

## Why Custom Services?

Consider an application that uses three ports: TCP 8443 for its web interface, TCP 8444 for its API, and TCP 8445 for WebSocket connections. Without a custom service, you end up doing:

```bash
firewall-cmd --add-port=8443/tcp --permanent
firewall-cmd --add-port=8444/tcp --permanent
firewall-cmd --add-port=8445/tcp --permanent
```

With a custom service named "myapp", you just do:

```bash
firewall-cmd --add-service=myapp --permanent
```

Cleaner, easier to audit, and harder to forget a port.

## Creating a Custom Service

### Method 1: Using firewall-cmd

```bash
# Create a new service definition
firewall-cmd --permanent --new-service=myapp

# Set a description
firewall-cmd --permanent --service=myapp --set-description="My Application - web, API, and WebSocket"

# Add ports
firewall-cmd --permanent --service=myapp --add-port=8443/tcp
firewall-cmd --permanent --service=myapp --add-port=8444/tcp
firewall-cmd --permanent --service=myapp --add-port=8445/tcp

# Reload to make it available
firewall-cmd --reload

# Now use it like any other service
firewall-cmd --zone=public --add-service=myapp --permanent
firewall-cmd --reload
```

### Method 2: Creating an XML File

Service definitions live in `/etc/firewalld/services/`. Create an XML file directly:

```bash
# Create the service XML file
cat > /etc/firewalld/services/myapp.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<service>
  <short>MyApp</short>
  <description>My Application - web interface, REST API, and WebSocket connections</description>
  <port protocol="tcp" port="8443"/>
  <port protocol="tcp" port="8444"/>
  <port protocol="tcp" port="8445"/>
</service>
EOF

# Reload firewalld to pick up the new service
firewall-cmd --reload

# Verify it shows up
firewall-cmd --get-services | tr ' ' '\n' | grep myapp
```

## Custom Service with Protocols and Modules

Services can include more than just ports:

```bash
# A custom service for a game server
cat > /etc/firewalld/services/gameserver.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<service>
  <short>GameServer</short>
  <description>Game server with TCP control and UDP data channels</description>
  <port protocol="tcp" port="27015"/>
  <port protocol="udp" port="27015-27020"/>
  <port protocol="udp" port="27025"/>
</service>
EOF

firewall-cmd --reload
```

## Managing Custom Services

```bash
# List all services including custom ones
firewall-cmd --get-services

# View details of your custom service
firewall-cmd --permanent --info-service=myapp

# Add more ports to an existing custom service
firewall-cmd --permanent --service=myapp --add-port=8446/tcp
firewall-cmd --reload

# Remove a port from a custom service
firewall-cmd --permanent --service=myapp --remove-port=8446/tcp
firewall-cmd --reload

# Delete a custom service entirely
firewall-cmd --permanent --delete-service=myapp
firewall-cmd --reload
```

## Creating Custom Zones

While the built-in zones cover most needs, you might want a custom zone for a specific network segment:

### Method 1: Using firewall-cmd

```bash
# Create a new zone
firewall-cmd --permanent --new-zone=appservers

# Set the default target (what happens to unmatched traffic)
firewall-cmd --permanent --zone=appservers --set-target=DROP

# Add services to the zone
firewall-cmd --permanent --zone=appservers --add-service=ssh
firewall-cmd --permanent --zone=appservers --add-service=myapp

# Reload
firewall-cmd --reload

# Assign an interface to the new zone
firewall-cmd --zone=appservers --change-interface=eth1 --permanent
firewall-cmd --reload
```

### Method 2: Creating an XML File

```bash
# Create the zone XML file
cat > /etc/firewalld/zones/appservers.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<zone target="DROP">
  <short>App Servers</short>
  <description>Zone for application server network - only allow specific services</description>
  <service name="ssh"/>
  <service name="myapp"/>
  <rule family="ipv4">
    <source address="10.0.1.0/24"/>
    <service name="http"/>
    <accept/>
  </rule>
</zone>
EOF

firewall-cmd --reload
```

## Zone Targets

When creating custom zones, the target defines what happens to traffic that does not match any rule:

```bash
# DROP: silently drop unmatched traffic (most secure)
firewall-cmd --permanent --zone=appservers --set-target=DROP

# REJECT: reject with ICMP error
firewall-cmd --permanent --zone=appservers --set-target=REJECT

# ACCEPT: allow all unmatched traffic (like the trusted zone)
firewall-cmd --permanent --zone=appservers --set-target=ACCEPT

# default: use the default behavior (reject)
firewall-cmd --permanent --zone=appservers --set-target=default
```

## Real-World Example: Microservices Setup

Create services for each component and a zone for the microservices network:

```bash
# Service for the API gateway
cat > /etc/firewalld/services/api-gateway.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<service>
  <short>API Gateway</short>
  <description>API Gateway - HTTPS and health check endpoints</description>
  <port protocol="tcp" port="443"/>
  <port protocol="tcp" port="8080"/>
</service>
EOF

# Service for the message broker
cat > /etc/firewalld/services/message-broker.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<service>
  <short>Message Broker</short>
  <description>Message broker AMQP and management interface</description>
  <port protocol="tcp" port="5672"/>
  <port protocol="tcp" port="15672"/>
</service>
EOF

# Service for the cache layer
cat > /etc/firewalld/services/cache-service.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<service>
  <short>Cache Service</short>
  <description>Redis cache service</description>
  <port protocol="tcp" port="6379"/>
</service>
EOF

# Reload to register all services
firewall-cmd --reload

# Create a zone for internal microservices communication
firewall-cmd --permanent --new-zone=microservices
firewall-cmd --permanent --zone=microservices --set-target=DROP
firewall-cmd --permanent --zone=microservices --add-service=api-gateway
firewall-cmd --permanent --zone=microservices --add-service=message-broker
firewall-cmd --permanent --zone=microservices --add-service=cache-service
firewall-cmd --permanent --zone=microservices --add-service=ssh
firewall-cmd --reload

# Assign the interface
firewall-cmd --zone=microservices --change-interface=eth1 --permanent
firewall-cmd --reload
```

## Where Custom Files Live

```bash
# Custom services
ls /etc/firewalld/services/

# Custom zones
ls /etc/firewalld/zones/

# Default/system services (read-only, do not edit these)
ls /usr/lib/firewalld/services/

# Default/system zones (read-only, do not edit these)
ls /usr/lib/firewalld/zones/
```

Files in `/etc/firewalld/` override files in `/usr/lib/firewalld/` with the same name.

## Summary

Custom services and zones keep your firewall configuration organized and self-documenting. Group related ports into named services, create zones with appropriate default targets, and assign interfaces or sources. The XML file approach gives you version-controllable configurations that you can deploy across multiple servers with configuration management tools. Use `firewall-cmd --info-service` and `--list-all-zones` to verify your setup.
