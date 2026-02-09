# How to Run Wazuh in Docker for SIEM

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, wazuh, SIEM, security monitoring, intrusion detection, containerization, cybersecurity

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
git clone https://github.com/wazuh/wazuh-docker.git -b v4.7.0
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
version: "3.8"

services:
  wazuh-indexer:
    image: wazuh/wazuh-indexer:4.7.0
    container_name: wazuh-indexer
    environment:
      # OpenSearch configuration
      - "OPENSEARCH_JAVA_OPTS=-Xms1g -Xmx1g"
      - "bootstrap.memory_lock=true"
      - "discovery.type=single-node"
    ulimits:
      memlock:
        soft: -1
        hard: -1
    volumes:
      - indexer_data:/var/lib/wazuh-indexer
      - ./certs/indexer.pem:/usr/share/wazuh-indexer/certs/indexer.pem
      - ./certs/indexer-key.pem:/usr/share/wazuh-indexer/certs/indexer-key.pem
      - ./certs/root-ca.pem:/usr/share/wazuh-indexer/certs/root-ca.pem
    networks:
      - wazuh-net
    restart: unless-stopped

  wazuh-manager:
    image: wazuh/wazuh-manager:4.7.0
    container_name: wazuh-manager
    ports:
      # Agent registration port
      - "1514:1514"
      # Agent communication port
      - "1515:1515"
      # Wazuh API port
      - "55000:55000"
    environment:
      - INDEXER_URL=https://wazuh-indexer:9200
      - INDEXER_USERNAME=admin
      - INDEXER_PASSWORD=SecretPassword
    volumes:
      # Persist manager configuration and data
      - manager_etc:/var/ossec/etc
      - manager_logs:/var/ossec/logs
      - manager_queue:/var/ossec/queue
      - manager_api:/var/ossec/api/configuration
    networks:
      - wazuh-net
    restart: unless-stopped

  wazuh-dashboard:
    image: wazuh/wazuh-dashboard:4.7.0
    container_name: wazuh-dashboard
    depends_on:
      - wazuh-indexer
      - wazuh-manager
    ports:
      # Dashboard web interface
      - "443:5601"
    environment:
      - INDEXER_USERNAME=admin
      - INDEXER_PASSWORD=SecretPassword
      - WAZUH_API_URL=https://wazuh-manager
      - API_USERNAME=wazuh-wui
      - API_PASSWORD=MyS3cr3tP4ssw0rd
    networks:
      - wazuh-net
    restart: unless-stopped

volumes:
  indexer_data:
  manager_etc:
  manager_logs:
  manager_queue:
  manager_api:

networks:
  wazuh-net:
    driver: bridge
```

## Connecting Agents

Agents are what make Wazuh useful. They run on your servers, workstations, and cloud instances, collecting security data and sending it to the manager.

```bash
# Install the Wazuh agent on a Ubuntu/Debian endpoint
curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH | gpg --dearmor -o /usr/share/keyrings/wazuh.gpg
echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" | \
  tee /etc/apt/sources.list.d/wazuh.list

apt-get update
WAZUH_MANAGER="your-docker-host-ip" apt-get install wazuh-agent

# Start the agent
systemctl enable wazuh-agent
systemctl start wazuh-agent
```

For containerized environments, you can run the agent as a Docker container too.

```bash
# Run the Wazuh agent as a Docker container
docker run -d --name wazuh-agent \
  --network host \
  -e WAZUH_MANAGER="your-docker-host-ip" \
  -e WAZUH_AGENT_NAME="docker-host-01" \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /var/log:/var/log:ro \
  -v /etc:/etc:ro \
  wazuh/wazuh-agent:4.7.0
```

## Creating Custom Detection Rules

Wazuh comes with thousands of built-in rules, but custom rules let you detect threats specific to your environment.

```xml
<!-- Custom rule file: /var/ossec/etc/rules/local_rules.xml -->
<!-- Detect multiple failed SSH logins from the same source -->
<group name="custom_ssh,">
  <rule id="100001" level="10" frequency="5" timeframe="120">
    <if_matched_sid>5710</if_matched_sid>
    <same_source_ip />
    <description>Brute force attack: 5+ failed SSH logins in 2 minutes from same IP</description>
    <mitre>
      <id>T1110</id>
    </mitre>
  </rule>
</group>

<!-- Detect new Docker containers being created -->
<group name="custom_docker,">
  <rule id="100010" level="5">
    <decoded_as>json</decoded_as>
    <field name="docker.action">create</field>
    <description>New Docker container created: $(docker.name)</description>
  </rule>

  <!-- Alert on privileged containers -->
  <rule id="100011" level="12">
    <if_sid>100010</if_sid>
    <field name="docker.attributes.privileged">true</field>
    <description>ALERT: Privileged Docker container created - $(docker.name)</description>
  </rule>
</group>
```

Apply custom rules by copying them into the manager container.

```bash
# Copy custom rules to the manager
docker cp local_rules.xml wazuh-manager:/var/ossec/etc/rules/local_rules.xml

# Restart the manager to load new rules
docker exec wazuh-manager /var/ossec/bin/wazuh-control restart
```

## Configuring Active Response

Wazuh can automatically respond to threats. For example, you can block an IP address after too many failed login attempts.

```xml
<!-- Add to ossec.conf inside the manager container -->
<active-response>
  <command>firewall-drop</command>
  <location>local</location>
  <rules_id>100001</rules_id>
  <timeout>3600</timeout>
</active-response>
```

## Monitoring Docker Containers

Configure the Wazuh manager to monitor Docker events from the host.

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
# Back up the Wazuh indexer data
docker exec wazuh-indexer curl -k -u admin:SecretPassword \
  -X PUT "https://localhost:9200/_snapshot/backup" \
  -H "Content-Type: application/json" \
  -d '{"type": "fs", "settings": {"location": "/snapshots"}}'

# Check cluster health
docker exec wazuh-indexer curl -k -u admin:SecretPassword \
  "https://localhost:9200/_cluster/health?pretty"

# View manager logs for troubleshooting
docker logs wazuh-manager --tail 100
```

## Conclusion

Wazuh in Docker provides a complete SIEM and host intrusion detection system without the complexity of managing individual service installations. The containerized deployment bundles the manager, indexer, and dashboard into a cohesive stack that you can bring up in minutes. Connect agents to your endpoints, write custom rules for your threat model, and let Wazuh correlate security events across your entire infrastructure.
