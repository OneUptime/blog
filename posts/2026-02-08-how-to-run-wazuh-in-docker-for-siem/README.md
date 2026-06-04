# How to Run Wazuh in Docker for SIEM

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Wazuh, SIEM, Security Monitoring, Intrusion Detection, Containerization, Cybersecurity

Description: Set up Wazuh SIEM platform in Docker for host-based intrusion detection, log analysis, and security monitoring across your infrastructure.

---

Every organization needs visibility into what is happening across its infrastructure. Wazuh is a free, open-source security platform that combines SIEM capabilities with host-based intrusion detection, vulnerability scanning, and compliance monitoring. Docker makes deploying the full Wazuh stack straightforward, even though the platform has multiple interconnected components.

This guide walks through deploying Wazuh with Docker Compose, connecting agents, and building useful detection rules.

## What Wazuh Brings to the Table

Wazuh started as a fork of OSSEC and has evolved into a comprehensive security platform. It consists of three main components:

- **Wazuh Manager** - the central server that receives and analyzes data from agents
- **Wazuh Indexer** - an OpenSearch-based search engine that stores alerts and events
- **Wazuh Dashboard** - a web interface built on OpenSearch Dashboards for visualization

Agents run on monitored endpoints and send log data, file integrity information, and system inventory to the manager. The manager processes this data against rulesets and generates alerts that get stored in the indexer and displayed on the dashboard.

## Prerequisites

Wazuh is a resource-hungry platform. Make sure your Docker host meets these minimums:

- Docker Engine 20.10+
- Docker Compose v2
- 8 GB RAM minimum (16 GB recommended)
- 50 GB free disk space
- Linux host recommended (for sysctl tuning)

```bash
# Increase vm.max_map_count for the indexer (OpenSearch requirement)

sudo sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
```

## Deploying Wazuh with Docker

Wazuh provides an official Docker deployment repository. Clone it and configure it for your environment.

```bash
# Clone the Wazuh Docker repository
git clone https://github.com/wazuh/wazuh-docker.git -b v4.14.5
cd wazuh-docker/single-node
```

The single-node deployment runs all components on one host. For production environments with many agents, consider the multi-node setup, but single-node works well for teams monitoring up to a few hundred endpoints.

```bash
# Generate self-signed certificates for inter-component communication
docker compose -f generate-indexer-certs.yml run --rm generator

# Start the full Wazuh stack
docker compose up -d
```

This brings up three containers: the Wazuh manager, the Wazuh indexer, and the Wazuh dashboard.

```bash
# Verify all containers are running
docker compose ps
```

You should see output showing all three services in a running state. The dashboard takes a minute or two to fully initialize. Access it at `https://localhost:443` with the default credentials:

- Username: `admin`
- Password: `SecretPassword`

## Custom Docker Compose Configuration

If you prefer to build your own compose file instead of using the repository version, here is a complete configuration.

```yaml
# docker-compose.yml - Wazuh single-node deployment
services:
  wazuh.manager:
    image: wazuh/wazuh-manager:4.14.5
    hostname: wazuh.manager
    restart: always
    ulimits:
      memlock:
        soft: -1
        hard: -1
      nofile:
        soft: 655360
        hard: 655360
    ports:
      # Agent communication port
      - "1514:1514"
      # Agent enrollment port
      - "1515:1515"
      # Syslog collection port
      - "514:514/udp"
      # Wazuh API port
      - "55000:55000"
    environment:
      - INDEXER_URL=https://wazuh.indexer:9200
      - INDEXER_USERNAME=admin
      - INDEXER_PASSWORD=SecretPassword
      - FILEBEAT_SSL_VERIFICATION_MODE=full
      - SSL_CERTIFICATE_AUTHORITIES=/etc/ssl/root-ca.pem
      - SSL_CERTIFICATE=/etc/ssl/filebeat.pem
      - SSL_KEY=/etc/ssl/filebeat.key
      - API_USERNAME=wazuh-wui
      - API_PASSWORD=MyS3cr37P450r.*-
    volumes:
      - wazuh_api_configuration:/var/ossec/api/configuration
      - wazuh_etc:/var/ossec/etc
      - wazuh_logs:/var/ossec/logs
      - wazuh_queue:/var/ossec/queue
      - wazuh_var_multigroups:/var/ossec/var/multigroups
      - wazuh_integrations:/var/ossec/integrations
      - wazuh_active_response:/var/ossec/active-response/bin
      - wazuh_agentless:/var/ossec/agentless
      - wazuh_wodles:/var/ossec/wodles
      - filebeat_etc:/etc/filebeat
      - filebeat_var:/var/lib/filebeat
      - ./config/wazuh_indexer_ssl_certs/root-ca-manager.pem:/etc/ssl/root-ca.pem
      - ./config/wazuh_indexer_ssl_certs/wazuh.manager.pem:/etc/ssl/filebeat.pem
      - ./config/wazuh_indexer_ssl_certs/wazuh.manager-key.pem:/etc/ssl/filebeat.key
      - ./config/wazuh_cluster/wazuh_manager.conf:/wazuh-config-mount/etc/ossec.conf

  wazuh.indexer:
    image: wazuh/wazuh-indexer:4.14.5
    hostname: wazuh.indexer
    restart: always
    ports:
      - "9200:9200"
    environment:
      - "OPENSEARCH_JAVA_OPTS=-Xms1g -Xmx1g"
    ulimits:
      memlock:
        soft: -1
        hard: -1
      nofile:
        soft: 65536
        hard: 65536
    volumes:
      - wazuh-indexer-data:/var/lib/wazuh-indexer
      - ./config/wazuh_indexer_ssl_certs/root-ca.pem:/usr/share/wazuh-indexer/config/certs/root-ca.pem
      - ./config/wazuh_indexer_ssl_certs/wazuh.indexer-key.pem:/usr/share/wazuh-indexer/config/certs/wazuh.indexer.key
      - ./config/wazuh_indexer_ssl_certs/wazuh.indexer.pem:/usr/share/wazuh-indexer/config/certs/wazuh.indexer.pem
      - ./config/wazuh_indexer_ssl_certs/admin.pem:/usr/share/wazuh-indexer/config/certs/admin.pem
      - ./config/wazuh_indexer_ssl_certs/admin-key.pem:/usr/share/wazuh-indexer/config/certs/admin-key.pem
      - ./config/wazuh_indexer/wazuh.indexer.yml:/usr/share/wazuh-indexer/config/opensearch.yml
      - ./config/wazuh_indexer/internal_users.yml:/usr/share/wazuh-indexer/config/opensearch-security/internal_users.yml

  wazuh.dashboard:
    image: wazuh/wazuh-dashboard:4.14.5
    hostname: wazuh.dashboard
    restart: always
    ports:
      # Dashboard web interface
      - "443:5601"
    environment:
      - INDEXER_USERNAME=admin
      - INDEXER_PASSWORD=SecretPassword
      - WAZUH_API_URL=https://wazuh.manager
      - DASHBOARD_USERNAME=kibanaserver
      - DASHBOARD_PASSWORD=kibanaserver
      - API_USERNAME=wazuh-wui
      - API_PASSWORD=MyS3cr37P450r.*-
    volumes:
      - ./config/wazuh_indexer_ssl_certs/wazuh.dashboard.pem:/usr/share/wazuh-dashboard/certs/wazuh-dashboard.pem
      - ./config/wazuh_indexer_ssl_certs/wazuh.dashboard-key.pem:/usr/share/wazuh-dashboard/certs/wazuh-dashboard-key.pem
      - ./config/wazuh_indexer_ssl_certs/root-ca.pem:/usr/share/wazuh-dashboard/certs/root-ca.pem
      - ./config/wazuh_dashboard/opensearch_dashboards.yml:/usr/share/wazuh-dashboard/config/opensearch_dashboards.yml
      - ./config/wazuh_dashboard/wazuh.yml:/usr/share/wazuh-dashboard/data/wazuh/config/wazuh.yml
      - wazuh-dashboard-config:/usr/share/wazuh-dashboard/data/wazuh/config
      - wazuh-dashboard-custom:/usr/share/wazuh-dashboard/plugins/wazuh/public/assets/custom
    depends_on:
      - wazuh.indexer
    links:
      - wazuh.indexer:wazuh.indexer
      - wazuh.manager:wazuh.manager

volumes:
  wazuh_api_configuration:
  wazuh_etc:
  wazuh_logs:
  wazuh_queue:
  wazuh_var_multigroups:
  wazuh_integrations:
  wazuh_active_response:
  wazuh_agentless:
  wazuh_wodles:
  filebeat_etc:
  filebeat_var:
  wazuh-indexer-data:
  wazuh-dashboard-config:
  wazuh-dashboard-custom:
```

## Connecting Agents

Agents are what make Wazuh useful. They run on your servers, workstations, and cloud instances, collecting security data and sending it to the manager.

```bash
# Install the Wazuh agent on a Ubuntu/Debian endpoint
apt-get install gnupg apt-transport-https
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | \
  gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import
chmod 644 /usr/share/keyrings/wazuh.gpg
echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | \
  tee /etc/apt/sources.list.d/wazuh.list

apt-get update
WAZUH_MANAGER="your-docker-host-ip" apt-get install wazuh-agent

# Start the agent
systemctl daemon-reload
systemctl enable wazuh-agent
systemctl start wazuh-agent
```

For containerized environments, you can run the agent as a Docker container too.

```bash
# Run the Wazuh agent as a Docker container
docker run -d --name wazuh-agent \
  -e WAZUH_MANAGER_SERVER="your-docker-host-ip" \
  -v ./config/wazuh-agent-conf:/wazuh-config-mount/etc/ossec.conf \
  wazuh/wazuh-agent:4.14.5
```

## Creating Custom Detection Rules

Wazuh comes with thousands of built-in rules, but custom rules let you detect threats specific to your environment.

```xml
<!-- Custom rule file: /var/ossec/etc/rules/local_rules.xml -->
<!-- Detect multiple failed SSH logins from the same source -->
<group name="custom_ssh,">
  <rule id="100001" level="10" frequency="5" timeframe="120">
    <if_matched_sid>5710</if_matched_sid>
    <same_srcip />
    <description>Brute force attack: 5+ failed SSH logins in 2 minutes from same IP</description>
    <mitre>
      <id>T1110</id>
    </mitre>
  </rule>
</group>

<!-- Detect new Docker containers being created -->
<group name="custom_docker,">
  <rule id="100010" level="5">
    <if_sid>87900</if_sid>
    <field name="docker.Action">create</field>
    <description>New Docker container created: $(docker.Actor.Attributes.name)</description>
  </rule>

  <!-- Alert when containers start -->
  <rule id="100011" level="12">
    <if_sid>87900</if_sid>
    <field name="docker.Action">start</field>
    <description>ALERT: Docker container started - $(docker.Actor.Attributes.name)</description>
  </rule>
</group>
```

Apply custom rules by copying them into the manager container.

```bash
# Copy custom rules to the manager
docker compose cp local_rules.xml wazuh.manager:/var/ossec/etc/rules/local_rules.xml

# Restart the manager to load new rules
docker compose exec wazuh.manager /var/ossec/bin/wazuh-control restart
```

## Configuring Active Response

Wazuh can automatically respond to threats. For example, you can block an IP address after too many failed login attempts.

```xml
<!-- Add to ossec.conf inside the manager container -->
<active-response>
  <disabled>no</disabled>
  <command>firewall-drop</command>
  <location>local</location>
  <rules_id>100001</rules_id>
  <timeout>3600</timeout>
</active-response>
```

## Monitoring Docker Containers

Configure the Wazuh agent on the Docker host to monitor Docker events from that host.

```xml
<!-- Add Docker listener configuration to ossec.conf -->
<wodle name="docker-listener">
  <interval>10m</interval>
  <attempts>5</attempts>
  <run_on_start>yes</run_on_start>
  <disabled>no</disabled>
</wodle>
```

## Backup and Maintenance

```bash
# Register a snapshot repository after mounting /snapshots in the indexer
# and setting path.repo: /snapshots in the indexer's opensearch.yml
docker compose exec wazuh.indexer curl -k -u admin:SecretPassword \
  -X PUT "https://localhost:9200/_snapshot/backup" \
  -H "Content-Type: application/json" \
  -d '{"type": "fs", "settings": {"location": "/snapshots"}}'

# Check cluster health
docker compose exec wazuh.indexer curl -k -u admin:SecretPassword \
  "https://localhost:9200/_cluster/health?pretty"

# View manager logs for troubleshooting
docker compose logs wazuh.manager --tail 100
```

## Conclusion

Wazuh in Docker provides a complete SIEM and host intrusion detection system without the complexity of managing individual service installations. The containerized deployment bundles the manager, indexer, and dashboard into a cohesive stack that you can bring up in minutes. Connect agents to your endpoints, write custom rules for your threat model, and let Wazuh correlate security events across your entire infrastructure.
