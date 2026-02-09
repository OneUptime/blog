# How to Run LibreNMS in Docker for Network Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, LibreNMS, Network Monitoring, SNMP, Infrastructure, Observability, Alerting

Description: Deploy LibreNMS in Docker for automatic network device discovery, SNMP monitoring, alerting, and performance graphing.

---

LibreNMS is a fully featured network monitoring system that automatically discovers devices on your network and starts collecting performance data. It tracks bandwidth usage, CPU and memory utilization, interface errors, environmental sensors, and hundreds of other metrics through SNMP. Unlike some monitoring tools that require extensive manual configuration, LibreNMS discovers device capabilities automatically and applies the right monitoring templates.

Running LibreNMS in Docker gives you a clean, reproducible installation that avoids the dependency headaches common with the traditional PHP-based setup. This guide covers the complete deployment, from initial Docker Compose setup to adding devices and configuring alerts.

## What LibreNMS Monitors

LibreNMS supports over 1,500 device types out of the box. It monitors routers, switches, firewalls, wireless controllers, servers, storage arrays, UPS systems, printers, and environmental sensors. If a device speaks SNMP, LibreNMS can probably monitor it.

## Prerequisites

You will need:

- Docker and Docker Compose installed
- Network access to the devices you want to monitor
- SNMP configured on your network devices (SNMPv2c or SNMPv3)
- At least 2 GB of RAM and 2 CPU cores for a small deployment

## Docker Compose Setup

LibreNMS requires a web server, PHP, MariaDB, Redis, and several background workers. The official Docker image bundles these into a manageable Compose setup.

```yaml
# docker-compose.yml - Complete LibreNMS monitoring stack
# Includes the web UI, database, cache, and background workers
version: "3.8"

services:
  # MariaDB database for storing device data and configuration
  db:
    image: mariadb:10.11
    container_name: librenms-db
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: librenms
      MYSQL_USER: librenms
      MYSQL_PASSWORD: librenms_db_password
    command:
      - "mysqld"
      - "--innodb-file-per-table=1"
      - "--lower-case-table-names=0"
      - "--character-set-server=utf8mb4"
      - "--collation-server=utf8mb4_unicode_ci"
    volumes:
      - db-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mariadb-admin", "ping", "-h", "localhost", "-u", "root", "-prootpassword"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - librenms-net

  # Redis for caching and session storage
  redis:
    image: redis:7-alpine
    container_name: librenms-redis
    restart: unless-stopped
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
    networks:
      - librenms-net

  # LibreNMS web interface and API
  librenms:
    image: librenms/librenms:latest
    container_name: librenms
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - DB_HOST=db
      - DB_NAME=librenms
      - DB_USER=librenms
      - DB_PASSWORD=librenms_db_password
      - DB_TIMEOUT=60
      - REDIS_HOST=redis
      - BASE_URL=http://librenms.example.com
      - TZ=UTC
      - PUID=1000
      - PGID=1000
      - CACHE_DRIVER=redis
      - SESSION_DRIVER=redis
    volumes:
      - librenms-data:/data
      - librenms-rrd:/opt/librenms/rrd
      - librenms-logs:/opt/librenms/logs
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - librenms-net

  # Dispatcher service - runs SNMP polling and discovery
  dispatcher:
    image: librenms/librenms:latest
    container_name: librenms-dispatcher
    restart: unless-stopped
    environment:
      - DB_HOST=db
      - DB_NAME=librenms
      - DB_USER=librenms
      - DB_PASSWORD=librenms_db_password
      - REDIS_HOST=redis
      - TZ=UTC
      - PUID=1000
      - PGID=1000
      - SIDECAR_DISPATCHER=1
      - DISPATCHER_NODE_ID=dispatcher1
    volumes:
      - librenms-data:/data
      - librenms-rrd:/opt/librenms/rrd
      - librenms-logs:/opt/librenms/logs
    depends_on:
      - librenms
    networks:
      - librenms-net

  # SNMP Trap daemon - receives SNMP traps from network devices
  snmptrapd:
    image: librenms/librenms:latest
    container_name: librenms-snmptrapd
    restart: unless-stopped
    ports:
      - "162:162/udp"
    environment:
      - DB_HOST=db
      - DB_NAME=librenms
      - DB_USER=librenms
      - DB_PASSWORD=librenms_db_password
      - REDIS_HOST=redis
      - TZ=UTC
      - PUID=1000
      - PGID=1000
      - SIDECAR_SNMPTRAPD=1
    volumes:
      - librenms-data:/data
    depends_on:
      - librenms
    networks:
      - librenms-net

volumes:
  db-data:
  redis-data:
  librenms-data:
  librenms-rrd:
  librenms-logs:

networks:
  librenms-net:
    driver: bridge
```

## Starting LibreNMS

```bash
# Launch the complete stack
docker compose up -d

# Wait for the initial database migration (check the logs)
docker compose logs -f librenms

# Verify all services are running
docker compose ps
```

The web interface will be available at http://your-server:8000 after the initial setup completes. The first-run wizard guides you through creating an admin account.

## Adding Devices

Add network devices through the web interface or the command line.

```bash
# Add a device via the command line inside the container
# Syntax: addhost.php <hostname> <community> <snmpver>
docker exec librenms php /opt/librenms/addhost.php 192.168.1.1 public v2c

# Add a device using SNMPv3 with authentication and privacy
docker exec librenms php /opt/librenms/addhost.php 192.168.1.1 \
  ap v3 \
  authuser \
  authpassword \
  sha \
  privpassword \
  aes

# Force a poll of a specific device
docker exec librenms php /opt/librenms/poller.php -h 192.168.1.1

# Run device discovery manually
docker exec librenms php /opt/librenms/discovery.php -h 192.168.1.1
```

## Automatic Discovery

LibreNMS can discover devices automatically using several methods.

```bash
# Configure automatic discovery by editing the LibreNMS configuration
# Add these settings through the web interface under Settings > Discovery
# or create a config file

docker exec librenms sh -c 'cat >> /opt/librenms/config.php << EOF

// Enable automatic discovery of devices found through SNMP
\$config["autodiscovery"]["xdp"] = true;            // CDP/LLDP discovery
\$config["autodiscovery"]["ospf"] = true;            // OSPF neighbor discovery
\$config["autodiscovery"]["bgp"] = true;             // BGP peer discovery
\$config["autodiscovery"]["snmpscan"] = true;        // SNMP scan of subnets

// Define subnets to scan for new devices
\$config["nets"][] = "192.168.1.0/24";
\$config["nets"][] = "10.0.0.0/24";

// SNMP communities to try during discovery
\$config["snmp"]["community"][] = "public";
\$config["snmp"]["community"][] = "private";
EOF'
```

## Configuring Alerts

LibreNMS includes a flexible alerting system with rules and transport methods.

```bash
# Configure alert transports via the API
# First, create a Slack transport
curl -X POST "http://localhost:8000/api/v0/alert/transports" \
  -H "X-Auth-Token: YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Slack Alerts",
    "transport_type": "slack",
    "transport_config": {
        "slack-url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
    },
    "is_default": true
  }'

# List existing alert rules
curl -s "http://localhost:8000/api/v0/rules" \
  -H "X-Auth-Token: YOUR_API_TOKEN" | python3 -m json.tool
```

Common alert rules to configure through the web interface include:

- Device down (no SNMP response)
- Interface down on critical links
- High CPU or memory utilization
- Interface errors exceeding a threshold
- BGP session state changes
- Storage utilization over 90%

## Custom SNMP MIBs

Add vendor-specific MIBs to monitor proprietary device metrics.

```bash
# Copy MIB files into the LibreNMS container
docker cp ./custom-mibs/ librenms:/opt/librenms/mibs/

# Verify the MIBs are accessible
docker exec librenms snmptranslate -IR sysDescr.0

# After adding MIBs, rediscover devices to pick up new OIDs
docker exec librenms php /opt/librenms/discovery.php -h all
```

## Backup and Restore

Protect your monitoring data with regular backups.

```bash
# Back up the MariaDB database
docker exec librenms-db mysqldump -u librenms -plibrenms_db_password librenms | gzip > librenms-db-$(date +%Y%m%d).sql.gz

# Back up the RRD files (historical graph data)
docker run --rm -v librenms-rrd:/source:ro -v $(pwd):/backup alpine \
  tar czf /backup/librenms-rrd-$(date +%Y%m%d).tar.gz -C /source .

# Restore the database
gunzip < librenms-db-20260208.sql.gz | docker exec -i librenms-db mysql -u librenms -plibrenms_db_password librenms
```

## Monitoring Performance

Keep an eye on LibreNMS's own performance to make sure polling keeps up with your device count.

```bash
# Check polling performance
docker exec librenms php /opt/librenms/poller.php -h all -r -f -d

# View the polling log for timing information
docker exec librenms cat /opt/librenms/logs/librenms.log | tail -50

# Check the dispatcher worker status
docker logs librenms-dispatcher --tail 20
```

## Production Recommendations

For production LibreNMS deployments, tune MariaDB with appropriate buffer pool sizes - allocate about 70% of available RAM to `innodb_buffer_pool_size`. Use fast storage (SSD or NVMe) for the RRD volume since it handles constant writes. Scale the number of dispatcher workers based on your device count - one worker handles roughly 200 devices comfortably. Set up daily database and RRD backups with offsite storage. Enable HTTPS by placing a reverse proxy (Nginx or Traefik) in front of the web container. Monitor LibreNMS itself with tools like OneUptime to ensure your monitoring system stays healthy.

LibreNMS in Docker provides a powerful, autodiscovering network monitoring platform that works with thousands of device types. The containerized deployment removes the complexity of managing PHP, database, and web server configurations, letting you focus on what matters - keeping your network running.
