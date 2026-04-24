# How to Use Portainer in Energy Sector SCADA Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Energy, SCADA, OT, Industrial

Description: Deploy containerized applications alongside SCADA and OT systems in energy sector environments using Portainer with air-gapped support and industrial security hardening.

## Introduction

The energy sector is undergoing digital transformation, with containerized applications increasingly deployed alongside traditional SCADA systems at substations, wind farms, and generation facilities. Unlike typical IT environments, energy OT (Operational Technology) systems have unique requirements: extreme reliability, air-gapped networks, long-running hardware, and compliance with NERC CIP cybersecurity standards. Portainer's Edge agent and air-gapped capabilities make it suitable for these demanding environments.

## Energy Sector Container Use Cases

- Data historian applications collecting sensor data
- SCADA HMI (Human-Machine Interface) modernization
- Edge analytics for predictive maintenance
- Integration middleware between OT and IT networks
- Digital twin simulation environments
- Reporting and visualization dashboards

## Step 1: Air-Gapped Portainer Deployment

Energy OT networks are typically air-gapped or have strict internet restrictions:

```bash
# On internet-connected build system

# Pull the base images used in this example
mkdir -p images

IMAGES=(
  "portainer/portainer-ee:2.19.0"
  "portainer/agent:2.19.0"
  "prom/prometheus:v2.45.0"
  "grafana/grafana:10.1.0"
  "influxdb:2.7-alpine"
  "telegraf:1.27-alpine"
)

for image in "${IMAGES[@]}"; do
  echo "Pulling: $image"
  docker pull "$image"
  filename=$(echo "$image" | tr '/: ' '---')
  docker save "$image" | gzip > "images/$filename.tar.gz"
done

# Transfer images to OT network via approved media
# On OT system:
for tarfile in images/*.tar.gz; do
  docker load < "$tarfile"
  echo "Loaded: $tarfile"
done
```

## Step 2: NERC CIP-Aligned Configuration

NERC CIP (North American Electric Reliability Corporation Critical Infrastructure Protection) requires strict access controls, logging, and documented operational processes. These Docker daemon settings help support a hardened baseline:

```bash
# Docker daemon.json with NERC CIP hardening
cat > /etc/docker/daemon.json << 'EOF'
{
  "icc": false,
  "no-new-privileges": true,
  "userns-remap": "default",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "10"
  },
  "live-restore": true,
  "userland-proxy": false,
  "registry-mirrors": ["https://registry.internal.energy-co.com"]
}
EOF

sudo systemctl restart docker
```

## Step 3: Deploy Data Historian Stack

```yaml
# historian-stack/docker-compose.yml
# Set INFLUX_TOKEN in Portainer or a local .env file before deployment
services:
  influxdb:
    image: influxdb:2.7-alpine
    restart: always
    ports:
      - "8086:8086"
    environment:
      DOCKER_INFLUXDB_INIT_MODE: setup
      DOCKER_INFLUXDB_INIT_USERNAME: historian
      DOCKER_INFLUXDB_INIT_PASSWORD_FILE: /run/secrets/influx_password
      DOCKER_INFLUXDB_INIT_ADMIN_TOKEN: ${INFLUX_TOKEN}
      DOCKER_INFLUXDB_INIT_ORG: energy-co
      DOCKER_INFLUXDB_INIT_BUCKET: scada-data
      DOCKER_INFLUXDB_INIT_RETENTION: 8760h  # 1 year retention
    secrets:
      - influx_password
    volumes:
      - historian-data:/var/lib/influxdb2
      - historian-config:/etc/influxdb2
    networks:
      - ot-network

  telegraf:
    image: telegraf:1.27-alpine
    restart: always
    environment:
      INFLUX_TOKEN: ${INFLUX_TOKEN}
    volumes:
      - ./telegraf.conf:/etc/telegraf/telegraf.conf:ro
    networks:
      - ot-network
      - scada-dmz  # Can reach SCADA data through DMZ

  grafana:
    image: grafana/grafana:10.1.0
    restart: always
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD__FILE: /run/secrets/grafana_password
      GF_USERS_ALLOW_SIGN_UP: "false"
      GF_ANALYTICS_REPORTING_ENABLED: "false"
      GF_ANALYTICS_CHECK_FOR_UPDATES: "false"  # No internet
    secrets:
      - grafana_password
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - ot-network

secrets:
  influx_password:
    file: ./secrets/influx_password.txt
  grafana_password:
    file: ./secrets/grafana_password.txt

networks:
  ot-network:
    name: ot-network
    driver: bridge
    internal: true
  scada-dmz:
    driver: bridge
    name: scada-dmz

volumes:
  historian-data:
  historian-config:
  grafana-data:
```

## Step 4: Telegraf Configuration for SCADA Data Collection

```toml
# telegraf.conf - Collect data from SCADA systems
[agent]
  interval = "10s"
  flush_interval = "10s"

# OPC-UA data collection from SCADA
[[inputs.opcua]]
  endpoint = "opc.tcp://scada-server.ot.local:4840"
  connect_timeout = "10s"
  request_timeout = "5s"
  
  [[inputs.opcua.nodes]]
    name = "turbine_speed"
    namespace = "2"
    identifier_type = "s"
    identifier = "Turbine1.Speed"
    default_tags = {unit="rpm", turbine="T1"}

  [[inputs.opcua.nodes]]
    name = "power_output"
    namespace = "2"
    identifier_type = "s"
    identifier = "Turbine1.PowerOutput"
    default_tags = {unit="kW", turbine="T1"}

# Output to InfluxDB
[[outputs.influxdb_v2]]
  urls = ["http://influxdb:8086"]
  token = "${INFLUX_TOKEN}"
  organization = "energy-co"
  bucket = "scada-data"
```

## Step 5: Predictive Maintenance Application

```yaml
# predictive-maintenance/docker-compose.yml
services:
  ml-inference:
    image: energy-co/predictive-maintenance:v1.4.2
    restart: always
    environment:
      - MODEL_PATH=/models/bearing-failure-model.pkl
      - INFLUX_URL=http://influxdb:8086
      - ALERT_THRESHOLD=0.85
      - MAINTENANCE_WEBHOOK=http://cmms.ot.local/api/work-orders
    volumes:
      - ./models:/models:ro
      - ml-logs:/var/log/ml
    networks:
      - ot-network
    deploy:
      resources:
        limits:
          memory: 2g

  anomaly-detector:
    image: energy-co/anomaly-detector:v2.1
    restart: always
    environment:
      - SCADA_FEED=influxdb:8086
      - SENSITIVITY=medium
    networks:
      - ot-network

networks:
  ot-network:
    external: true
    name: ot-network

volumes:
  ml-logs:
```

## Step 6: OT/IT Network Segmentation

```bash
# Create isolated networks for different security zones
# Purdue Model network zones in containers

# Zone 4 (IT Network) - Business systems
docker network create --driver bridge \
  --subnet 10.4.0.0/16 \
  --opt com.docker.network.bridge.enable_icc=false \
  zone4-business

# Zone 3 (Supervisory) - Historian, SCADA servers
docker network create --driver bridge \
  --subnet 10.3.0.0/16 \
  --internal \
  zone3-supervisory

# DMZ between zones
docker network create --driver bridge \
  --subnet 10.35.0.0/16 \
  dmz-network
```

## Step 7: High-Availability for Critical Stateless Applications

```bash
# For critical stateless OT applications, use Docker Swarm for HA
docker swarm init --advertise-addr <PRIMARY-NODE-IP>
docker network create --driver overlay --attachable zone3-supervisory-ha

# Deploy anomaly detection as a replicated service
docker service create \
  --name anomaly-detector \
  --replicas 2 \
  --constraint 'node.labels.zone==supervisory' \
  --restart-condition on-failure \
  --restart-delay 5s \
  --restart-max-attempts 3 \
  --network zone3-supervisory-ha \
  energy-co/anomaly-detector:v2.1
```

For stateful historians, keep InfluxDB OSS on a single node with resilient storage or use a clustered InfluxDB offering; simply setting `--replicas 2` does not create a shared high-availability historian.

## Conclusion

Energy sector OT environments require air-gapped deployment capability, NERC CIP-aligned access controls, network segmentation aligned with the Purdue Model, and extremely high reliability. Portainer's air-gapped installation, Edge agent architecture, and team-based access control provide the management platform needed for these environments. Combined with industrial data collection tools like Telegraf and OPC-UA clients, containerized applications can run safely alongside legacy SCADA systems, enabling the data historian and analytics capabilities that drive modern energy operations.
