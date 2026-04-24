# How to Use Portainer in Telecommunications Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Telecommunications, NFV, 5G, Network Function

Description: Deploy and manage Network Function Virtualization (NFV) and telecom-grade containerized workloads using Portainer for multi-site telecommunications infrastructure.

## Introduction

Telecommunications providers are virtualizing network functions through NFV (Network Function Virtualization) and containerizing network services as CNFs (Containerized Network Functions). From VoIP gateways to 5G core components, containers are transforming telecom infrastructure. Portainer provides a unified management plane for containerized telecom workloads across central data centers and distributed edge Points of Presence (PoPs).

## Telecom Container Use Cases

- VoIP gateways and SBC (Session Border Controllers)
- DNS resolvers and routing services
- Network monitoring and OSS/BSS systems
- 5G core network functions (AMF, SMF, UPF)
- Billing and mediation systems
- Network analytics and traffic monitoring

## Step 1: High-Performance Docker Configuration for Telecom

```bash
# Telecom workloads require specific kernel parameters

cat >> /etc/sysctl.conf << 'EOF'
# Network performance tuning for telecom
net.core.rmem_max = 134217728
net.core.wmem_max = 134217728
net.ipv4.tcp_rmem = 4096 65536 134217728
net.ipv4.tcp_wmem = 4096 65536 134217728
net.core.netdev_max_backlog = 300000
net.ipv4.udp_rmem_min = 65536
net.ipv4.udp_wmem_min = 65536
EOF

sysctl -p

# Docker daemon optimized for high-throughput networking
cat > /etc/docker/daemon.json << 'EOF'
{
  "userland-proxy": false,
  "live-restore": true,
  "icc": false,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "5"
  },
  "mtu": 1500
}
EOF

systemctl restart docker
```

## Step 2: Deploy VoIP Infrastructure

```yaml
# voip-stack/docker-compose.yml
version: '3.8'
services:
  kamailio:
    image: telecom/kamailio:5.7
    restart: always
    ports:
      - "5060:5060/udp"
      - "5060:5060/tcp"
    environment:
      - DOMAIN=sip.telecom.com
      - DB_URL=mysql://kamailio:password@db/kamailio
      - RTP_ENGINE_HOST=rtpengine
    volumes:
      - ./kamailio.cfg:/etc/kamailio/kamailio.cfg:ro
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 2g

  rtpengine:
    image: telecom/rtpengine:mr11.5
    restart: always
    cap_add:
      - NET_ADMIN   # Required for traffic control
    environment:
      - INTERFACE=eth0
      - PORT_RANGE=30000-40000
    ports:
      - "2223:2223/udp"
      - "30000-40000:30000-40000/udp"
    command: --interface=eth0 --listen-ng=0.0.0.0:2223 --port-min=30000 --port-max=40000

  asterisk:
    image: telecom/asterisk:20-alpine
    restart: always
    ports:
      - "5160:5060/udp"
      - "5160:5060/tcp"
      - "10000-10100:10000-10100/udp"   # RTP range
    volumes:
      - ./asterisk/:/etc/asterisk/:ro
      - asterisk-spool:/var/spool/asterisk
    environment:
      - ASTERISK_REALM=telecom.com

  db:
    image: mysql:8.0
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: kamailio
      MYSQL_USER: kamailio
      MYSQL_PASSWORD: password
    volumes:
      - voip-db:/var/lib/mysql

volumes:
  asterisk-spool:
  voip-db:
```

## Step 3: DNS Infrastructure Across PoPs

```yaml
# dns-stack/docker-compose.yml
version: '3.8'
services:
  pdns-authoritative:
    image: powerdns/pdns-auth-48:latest
    restart: always
    ports:
      - "53:53/udp"
      - "53:53/tcp"
    command:
      - --launch=gmysql
      - --gmysql-host=dns-db
      - --gmysql-user=pdns
      - --gmysql-password=pdnspass
      - --gmysql-dbname=pdns
    deploy:
      replicas: 2
      placement:
        preferences:
          - spread: node.labels.datacenter  # Spread across labeled swarm nodes

  pdns-recursor:
    image: powerdns/pdns-recursor-49:latest
    restart: always
    ports:
      - "5353:53/udp"   # Resolver port
      - "5353:53/tcp"
    volumes:
      - ./recursor.conf:/etc/powerdns/recursor.conf:ro
    deploy:
      replicas: 3

  dns-db:
    image: mysql:8.0
    restart: always
    volumes:
      - dns-data:/var/lib/mysql
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: pdns
      MYSQL_USER: pdns
      MYSQL_PASSWORD: pdnspass

volumes:
  dns-data:
```

## Step 4: Network Monitoring Stack

```yaml
# network-monitoring/docker-compose.yml
version: '3.8'
services:
  pmacct:
    image: telecom/pmacct:1.7.9
    restart: always
    ports:
      - "2055:2055/udp"
      - "4739:4739/udp"
      - "6343:6343/udp"
    volumes:
      - ./pmacctd.conf:/etc/pmacct/pmacctd.conf:ro
    cap_add:
      - NET_ADMIN

  kafka:
    image: confluentinc/cp-kafka:7.4.0
    restart: always
    environment:
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_LISTENERS: PLAINTEXT://0.0.0.0:9092
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
    depends_on:
      - zookeeper

  zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    restart: always
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  influxdb:
    image: influxdb:1.8
    restart: always
    volumes:
      - influxdb-data:/var/lib/influxdb

  flow-analyzer:
    image: telecom/flow-analyzer:v2.3
    restart: always
    environment:
      - KAFKA_BROKERS=kafka:9092
      - INFLUX_URL=http://influxdb:8086
      - ALERT_THRESHOLD_GBPS=10.0
    depends_on:
      - kafka
      - influxdb

volumes:
  influxdb-data:
```

## Step 5: Multi-PoP Deployment with Portainer Edge

```bash
# Register each PoP Swarm cluster as an Edge environment in Portainer
# In Portainer: Environments > Add environment > Docker Swarm > Edge Agent Standard

# On the manager node of each PoP cluster, deploy the stack file
# generated by Portainer for that environment.
docker stack deploy -c portainer-edge-agent.yml portainer_edge_agent

# Deploy telecom services to all PoPs simultaneously
# In Portainer: Edge Stacks > Add stack > Select the Edge Group that contains all PoPs
```

## Step 6: SLA Monitoring and Alerting

```bash
#!/bin/bash
# telecom-sla-monitor.sh
PORTAINER_URL="https://portainer.telecom.com:9443"
API_KEY="noc-api-key"
PAGERDUTY_KEY="pd-integration-key"
ENDPOINTS=(1 2 3 4)   # Replace with your PoP endpoint IDs

# Check critical telecom services in each PoP Swarm environment
SERVICES=(
  "voip-stack_kamailio"
  "voip-stack_rtpengine"
  "dns-stack_pdns-authoritative"
  "dns-stack_pdns-recursor"
)

for endpoint in "${ENDPOINTS[@]}"; do
  SERVICE_DATA=$(curl -s \
    -H "X-API-Key: $API_KEY" \
    "$PORTAINER_URL/api/endpoints/$endpoint/docker/services?status=true")

  for service in "${SERVICES[@]}"; do
    REPLICAS=$(echo "$SERVICE_DATA" | python3 -c '
import json, sys

service_name = sys.argv[1]

try:
    services = json.load(sys.stdin)
    for service in services:
        if service["Spec"]["Name"] == service_name:
            desired = service["Spec"]["Mode"]["Replicated"]["Replicas"]
            running = service.get("ServiceStatus", {}).get("RunningTasks", 0)
            print(f"{running}/{desired}")
            break
    else:
        print("0/0")
except Exception:
    print("0/0")
' "$service")

    RUNNING=$(echo "$REPLICAS" | cut -d'/' -f1)
    DESIRED=$(echo "$REPLICAS" | cut -d'/' -f2)

    if [ "$RUNNING" != "$DESIRED" ]; then
      # Trigger PagerDuty alert
      curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{
          \"routing_key\": \"$PAGERDUTY_KEY\",
          \"event_action\": \"trigger\",
          \"payload\": {
            \"summary\": \"Telecom Service Degraded: endpoint $endpoint $service ($REPLICAS)\",
            \"severity\": \"critical\",
            \"source\": \"portainer-monitor\"
          }
        }" \
        "https://events.pagerduty.com/v2/enqueue"
      echo "ALERT: endpoint $endpoint $service is degraded ($REPLICAS)"
    else
      echo "OK: endpoint $endpoint $service ($REPLICAS)"
    fi
  done
done
```

## Conclusion

Telecommunications containerized workloads require careful network configuration including SIP and RTP port planning, kernel parameter tuning for high-throughput traffic, and multi-site deployment capabilities. Portainer's Edge Stack feature enables simultaneous deployment of VoIP, DNS, and monitoring services across distributed Swarm environments at each Point of Presence from a single control plane. Combined with SLA monitoring scripts and PagerDuty alerting, Portainer provides the operational visibility that NOC teams need to maintain carrier-grade service levels.
