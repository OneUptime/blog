# How to Use Portainer for Logistics and Supply Chain

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Logistics, Supply Chain, Edge, Warehouse

Description: Deploy and manage containerized logistics applications including warehouse management, fleet tracking, and supply chain visibility using Portainer Edge agents at distribution centers.

## Introduction

Logistics and supply chain organizations operate complex distributed infrastructure: warehouse management systems, fleet tracking services, customs documentation, and last-mile delivery platforms. These systems run at hundreds of facilities-warehouses, distribution centers, cross-docking facilities, and ports. Portainer's Edge agent architecture enables centralized management of containerized logistics applications deployed across this distributed network.

## Logistics Container Use Cases

- Warehouse Management System (WMS) applications
- RFID/barcode scanning services
- Last-mile delivery routing and optimization
- Customs and compliance documentation
- Cold chain temperature monitoring
- Freight management platforms

## Step 1: Set Up Portainer for Multi-Site Logistics

```bash
# Central Portainer deployment

docker run -d \
  --name portainer \
  --restart=always \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ee:lts

# Create Edge Groups by facility type in Portainer UI:
# - Distribution Centers (large, high-throughput)
# - Regional Warehouses (medium capacity)
# - Cross-Dock Facilities (transit operations)
# - Last-Mile Depots (delivery vehicles)
```

## Step 2: Register Distribution Centers as Edge Environments

```bash
#!/bin/bash
# provision-facility.sh
FACILITY_ID=$1
FACILITY_TYPE=$2   # dc, warehouse, crossdock, depot
PORTAINER_EDGE_KEY=$3

# Install Docker on facility server
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
sudo systemctl enable --now docker

# Start Edge agent
sudo docker run -d \
  --name portainer-agent \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /:/host \
  -v portainer_agent_data:/data \
  -e EDGE=1 \
  -e EDGE_ID="${FACILITY_TYPE}-${FACILITY_ID}" \
  -e EDGE_KEY="$PORTAINER_EDGE_KEY" \
  portainer/agent:lts

echo "Facility $FACILITY_ID ($FACILITY_TYPE) registered"
```

## Step 3: Warehouse Management System Stack

```yaml
# wms-stack/docker-compose.yml
version: '3.8'
services:
  wms-api:
    image: logistics/wms-api:v5.2.1
    restart: always
    ports:
      - "8080:8080"
    environment:
      - FACILITY_ID=${FACILITY_ID}
      - CENTRAL_API_URL=https://central-wms.logistics.com
      - DB_URL=postgresql://wms:${DB_PASSWORD}@db/wms
      - SYNC_INTERVAL=300
      - OFFLINE_MODE=true   # Operates during WAN outages
    depends_on:
      - db
    volumes:
      - wms-data:/app/data

  wms-ui:
    image: logistics/wms-frontend:v5.2.1
    restart: always
    ports:
      - "80:80"
    environment:
      - API_URL=http://wms-api:8080

  rfid-service:
    image: logistics/rfid-processor:v2.4
    restart: always
    environment:
      - RFID_READERS=reader-01.facility.local,reader-02.facility.local
      - WMS_API_URL=http://wms-api:8080
      - SCAN_INTERVAL_MS=500
    privileged: true  # Required for RFID hardware access

  db:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_DB: wms
      POSTGRES_USER: wms
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - wms-db:/var/lib/postgresql/data

  sync-agent:
    image: logistics/sync-agent:v3.0
    restart: always
    environment:
      - CENTRAL_URL=https://central-wms.logistics.com
      - FACILITY_ID=${FACILITY_ID}
      - SYNC_INTERVAL=60
      - BUFFER_TRANSACTIONS=10000

volumes:
  wms-data:
  wms-db:
```

## Step 4: Cold Chain Monitoring

```yaml
# cold-chain/docker-compose.yml
version: '3.8'
services:
  temperature-collector:
    image: logistics/temp-collector:v1.8
    restart: always
    environment:
      - SENSOR_PROTOCOL=modbus
      - SENSOR_IDS=zone-a,zone-b,zone-c,zone-d
      - INFLUX_URL=http://influxdb:8086
      - INFLUX_ORG=${INFLUX_ORG}
      - INFLUX_BUCKET=${INFLUX_BUCKET}
      - INFLUX_TOKEN=${INFLUX_TOKEN}
      - ALERT_TEMP_HIGH=5    # Alert above 5°C for cold storage
      - ALERT_TEMP_LOW=-25   # Alert below -25°C for frozen
      - ALERT_WEBHOOK=https://ops.logistics.com/alerts
    devices:
      - /dev/ttyUSB0:/dev/ttyUSB0   # Temperature sensor bus

  influxdb:
    image: influxdb:2.7-alpine
    restart: always
    environment:
      DOCKER_INFLUXDB_INIT_MODE: setup
      DOCKER_INFLUXDB_INIT_USERNAME: ${INFLUXDB_USERNAME}
      DOCKER_INFLUXDB_INIT_PASSWORD: ${INFLUXDB_PASSWORD}
      DOCKER_INFLUXDB_INIT_ADMIN_TOKEN: ${INFLUX_TOKEN}
      DOCKER_INFLUXDB_INIT_ORG: ${INFLUX_ORG}
      DOCKER_INFLUXDB_INIT_BUCKET: ${INFLUX_BUCKET}
    volumes:
      - temp-data:/var/lib/influxdb2

  grafana:
    image: grafana/grafana:10.1.0
    restart: always
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    volumes:
      - grafana-data:/var/lib/grafana

  alert-forwarder:
    image: logistics/alert-forwarder:v1.2
    restart: always
    environment:
      - INFLUX_URL=http://influxdb:8086
      - INFLUX_ORG=${INFLUX_ORG}
      - INFLUX_BUCKET=${INFLUX_BUCKET}
      - INFLUX_TOKEN=${INFLUX_TOKEN}
      - PAGERDUTY_KEY=${PAGERDUTY_KEY}
      - CHECK_INTERVAL=60
      - FACILITY_ID=${FACILITY_ID}

volumes:
  temp-data:
  grafana-data:
```

## Step 5: Last-Mile Delivery Route Optimization

```yaml
# delivery-ops/docker-compose.yml
version: '3.8'
services:
  route-optimizer:
    image: logistics/route-optimizer:v4.1
    restart: always
    ports:
      - "8081:8080"
    environment:
      - MAPS_API_KEY=${MAPS_API_KEY}
      - VEHICLE_COUNT=${VEHICLE_COUNT}
      - MAX_STOPS_PER_ROUTE=30
      - TIME_WINDOWS=enabled
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2g

  driver-api:
    image: logistics/driver-mobile-api:v3.5
    restart: always
    ports:
      - "8082:8080"
    environment:
      - CENTRAL_DISPATCH_URL=https://dispatch.logistics.com
      - PUSH_NOTIFICATIONS=enabled
      - SYNC_INTERVAL=30

  tracking-relay:
    image: logistics/tracking-relay:v2.1
    restart: always
    environment:
      - CENTRAL_TRACKER_URL=https://tracking.logistics.com
      - GPS_UPDATE_INTERVAL=30
      - GEOFENCE_ALERTS=enabled
```

## Step 6: Deploy Updates Across All Facilities

```bash
#!/bin/bash
# update-all-facilities.sh
PORTAINER_URL="https://portainer.logistics.com:9443"
API_KEY="ops-api-key"
NEW_VERSION=$1

echo "=== Deploying WMS $NEW_VERSION to All Facilities ==="

# Get all edge environments
ENVIRONMENTS=$(curl -s \
  -H "X-API-Key: $API_KEY" \
  "$PORTAINER_URL/api/endpoints?types=4" | \
  python3 -c "import sys,json; envs=json.load(sys.stdin); [print(e['Id'],e['Name']) for e in envs]")

ONLINE=$(printf '%s\n' "$ENVIRONMENTS" | sed '/^$/d' | wc -l)
echo "Facilities online: $ONLINE"

# Update the Edge Stack with new image version
STACK_FILE_CONTENT=$(sed "s/wms-api:v[0-9.]*/wms-api:$NEW_VERSION/g" wms-stack/docker-compose.yml | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')

curl -s -X PUT \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"StackFileContent\": $STACK_FILE_CONTENT,
    \"EdgeGroups\": [1, 2, 3],
    \"DeploymentType\": 0,
    \"UpdateVersion\": true
  }" \
  "$PORTAINER_URL/api/edge_stacks/1"

echo "Update initiated for $NEW_VERSION"
```

## Step 7: Supply Chain Event Streaming

```yaml
# event-streaming/docker-compose.yml
version: '3.8'
services:
  kafka:
    image: confluentinc/cp-kafka:7.4.0
    restart: always
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  shipment-events:
    image: logistics/shipment-processor:v2.8
    restart: always
    environment:
      - KAFKA_BROKERS=kafka:9092
      - TOPICS=shipment-created,shipment-updated,delivery-confirmed
      - CENTRAL_API_URL=https://visibility.logistics.com

  zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    restart: always
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
```

## Conclusion

Logistics and supply chain container deployments span hundreds of facilities, each requiring reliable operation even during WAN connectivity loss. Portainer's Edge Stack feature enables simultaneous deployment of warehouse management and tracking applications across all facilities from a central control point. The combination of offline-capable application design, cold chain monitoring with alerting, and centralized update management through Portainer reduces the operational burden of managing distributed logistics infrastructure while maintaining the visibility needed to ensure smooth supply chain operations.
