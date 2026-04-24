# How to Use Portainer in Manufacturing OT Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Manufacturing, OT, Industrial IoT, IIoT

Description: Deploy containerized applications on manufacturing shop floors alongside PLCs, CNC machines, and industrial robots using Portainer Edge agents for centralized OT management.

## Introduction

Modern manufacturing is embracing containerized applications for quality control, production monitoring, machine learning-based defect detection, and MES (Manufacturing Execution Systems) integration. However, manufacturing OT environments have unique constraints: ruggedized hardware, long equipment lifecycles, strict safety requirements, and network isolation. Portainer's Edge agent provides centralized management of containers deployed directly on the shop floor.

## Manufacturing Container Use Cases

- Quality inspection systems using computer vision
- Real-time production monitoring and OEE calculation
- Predictive maintenance using vibration/temperature sensors
- Digital twin applications for production simulation
- MES integration middleware
- Barcode/RFID tracking systems

## Step 1: Prepare Edge Hardware for Manufacturing

```bash
# Most manufacturing edge hardware runs on ARM or x86

# Example: Industrial PC at CNC machine

# Install Docker on Ubuntu 22.04 (ruggedized x86 PC)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Configure Docker for reliability (manufacturing uptime is critical)
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "live-restore": true,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "20m",
    "max-file": "5"
  },
  "icc": false
}
EOF

# Ensure Docker starts on boot and apply the new daemon settings
sudo systemctl enable docker
sudo systemctl restart docker
```

## Step 2: Deploy Portainer Edge Agent at Machine Level

```bash
# On the shop floor edge PC
MACHINE_ID="cnc-machine-042"
PORTAINER_EDGE_ID="replace-with-portainer-generated-edge-id"
PORTAINER_EDGE_KEY="replace-with-portainer-generated-edge-key"

# Portainer generates the agent command, EDGE_ID, and EDGE_KEY for each environment.
# If Portainer uses a self-signed certificate, add: -e EDGE_INSECURE_POLL=1
# Match the Portainer agent tag to the Portainer Server version.
docker run -d \
  --name portainer_edge_agent \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /:/host \
  -v portainer_agent_data:/data \
  -e EDGE=1 \
  -e EDGE_ID="${PORTAINER_EDGE_ID}" \
  -e EDGE_KEY="${PORTAINER_EDGE_KEY}" \
  portainer/agent:lts

echo "Edge agent registered for ${MACHINE_ID}"
```

## Step 3: Quality Inspection System

```yaml
# quality-inspection/docker-compose.yml
services:
  vision-engine:
    image: mfg/quality-inspector:v2.4.1
    restart: always
    gpus: all  # GPU acceleration for inference
    environment:
      - MODEL_VERSION=defect-classifier-v8
      - CAMERA_SOURCE=/dev/video0
      - DEFECT_THRESHOLD=0.92
      - MES_ENDPOINT=http://mes-server.plant.local/api/quality
      - LINE_ID=${LINE_ID}
      - MACHINE_ID=${MACHINE_ID}
    devices:
      - /dev/video0:/dev/video0   # Industrial camera
    volumes:
      - ./models:/models:ro
      - quality-logs:/var/log/quality
      - rejected-parts:/data/rejected  # Save images of defective parts
    networks:
      - plant-network

  oee-monitor:
    image: mfg/oee-calculator:v1.6
    restart: always
    environment:
      - PLC_IP=192.168.1.100
      - PLC_RACK=0
      - PLC_SLOT=1
      - SHIFT_START_HOUR=6
      - TARGET_PARTS_PER_HOUR=120
    networks:
      - plant-network

  data-bridge:
    image: mfg/mes-bridge:v3.1
    restart: always
    environment:
      - MES_URL=http://mes-server.plant.local
      - BUFFER_SIZE=1000
      - RETRY_INTERVAL=30
    volumes:
      - bridge-buffer:/var/buffer
    networks:
      - plant-network

volumes:
  quality-logs:
  rejected-parts:
  bridge-buffer:

networks:
  plant-network:
    driver: bridge
```

## Step 4: PLC Integration via Modbus

```yaml
# plc-integration/docker-compose.yml
services:
  modbus-collector:
    image: mfg/modbus-collector:v2.1.0
    restart: always
    environment:
      - MODBUS_HOST=192.168.1.10
      - MODBUS_PORT=502
      - COLLECTION_INTERVAL=1000  # 1 second
    volumes:
      - ./config/modbus-collector.yaml:/res/configuration.yaml:ro
    networks:
      - plant-network

  influxdb:
    image: influxdb:2.7-alpine
    restart: always
    volumes:
      - metrics-data:/var/lib/influxdb2
    networks:
      - plant-network

  telegraf:
    image: telegraf:1.27-alpine
    restart: always
    volumes:
      - ./telegraf-plc.conf:/etc/telegraf/telegraf.conf:ro
    networks:
      - plant-network

volumes:
  metrics-data:

networks:
  plant-network:
    driver: bridge
```

## Step 5: Update Management for Production Lines

```bash
#!/bin/bash
# production-update.sh
# Updates an Edge Stack only when the full production line is idle

PORTAINER_URL="https://portainer.manufacturing.com:9443"
API_KEY="ops-api-key"
EDGE_GROUP_ID=5  # Assembly Line B group
STACK_NAME="quality-inspection"
STACK_FILE="quality-inspection/docker-compose.yml"

# Check if production is running before updating
check_production_status() {
  local machine_id="$1"
  local status

  # Query OEE monitor for running status
  status=$(curl -sf "http://$machine_id.plant.local/api/status" 2>/dev/null | \
    python3 -c "import sys,json; print(str(json.load(sys.stdin).get('running', True)).lower())" 2>/dev/null)

  echo "${status:-unknown}"
}

# Edge Stacks deploy to Edge Groups, so wait until every machine in the line is idle
MACHINES_TO_UPDATE=()
LINE_IS_IDLE=true

while read -r machine_id; do
  if [ "$(check_production_status "$machine_id")" = "false" ]; then
    MACHINES_TO_UPDATE+=("$machine_id")
    echo "Machine is idle: $machine_id"
  else
    LINE_IS_IDLE=false
    echo "Skipping update because machine is active or unreachable: $machine_id"
  fi
done < machine-list.txt

# Deploy the Edge Stack update only when the full line is idle
if [ "$LINE_IS_IDLE" = true ] && [ ${#MACHINES_TO_UPDATE[@]} -gt 0 ]; then
  STACK_ID=$(curl -sf \
    -H "X-API-Key: $API_KEY" \
    "$PORTAINER_URL/api/edge_stacks" | \
    STACK_NAME="$STACK_NAME" python3 -c "import json, os, sys; stack_name=os.environ['STACK_NAME']; data=json.load(sys.stdin); print(next((stack['Id'] for stack in data if stack.get('Name') == stack_name), ''))" 2>/dev/null)

  PAYLOAD_FILE=$(mktemp)
  trap 'rm -f "$PAYLOAD_FILE"' EXIT

  if [ -n "$STACK_ID" ]; then
    python3 - "$STACK_FILE" "$EDGE_GROUP_ID" > "$PAYLOAD_FILE" <<'PY'
import json, sys

stack_file, edge_group_id = sys.argv[1], int(sys.argv[2])

with open(stack_file, encoding="utf-8") as f:
    stack_content = f.read()

print(json.dumps({
    "StackFileContent": stack_content,
    "DeploymentType": 0,
    "EdgeGroups": [edge_group_id],
    "UpdateVersion": True
}))
PY

    curl -sf -X PUT \
      -H "X-API-Key: $API_KEY" \
      -H "Content-Type: application/json" \
      --data-binary "@$PAYLOAD_FILE" \
      "$PORTAINER_URL/api/edge_stacks/$STACK_ID"

    echo "Updated Edge Stack '$STACK_NAME' for Edge group $EDGE_GROUP_ID"
  else
    python3 - "$STACK_FILE" "$EDGE_GROUP_ID" "$STACK_NAME" > "$PAYLOAD_FILE" <<'PY'
import json, sys

stack_file, edge_group_id, stack_name = sys.argv[1], int(sys.argv[2]), sys.argv[3]

with open(stack_file, encoding="utf-8") as f:
    stack_content = f.read()

print(json.dumps({
    "Name": stack_name,
    "StackFileContent": stack_content,
    "DeploymentType": 0,
    "EdgeGroups": [edge_group_id]
}))
PY

    curl -sf -X POST \
      -H "X-API-Key: $API_KEY" \
      -H "Content-Type: application/json" \
      --data-binary "@$PAYLOAD_FILE" \
      "$PORTAINER_URL/api/edge_stacks/create/string"

    echo "Created Edge Stack '$STACK_NAME' for Edge group $EDGE_GROUP_ID"
  fi
else
  echo "No update deployed because the Edge group is not fully idle."
fi
```

## Step 6: Alarm and Safety Integration

```yaml
# safety-monitor/docker-compose.yml
services:
  safety-monitor:
    image: mfg/safety-monitor:v1.2
    # Use the container restart policy on standalone Docker
    restart: always
    environment:
      - SAFETY_PLC_IP=192.168.1.200
      - EMERGENCY_STOP_REGISTER=40001
      - ALARM_WEBHOOK=http://alarm-server.plant.local/api/alarm
    networks:
      - plant-network

networks:
  plant-network:
    driver: bridge
```

## Step 7: OT/IT Data Integration

```bash
# Historian for OT-IT data bridge
# Runs in DMZ between OT and IT networks

cat > data-bridge/docker-compose.yml << 'EOF'
services:
  historian-bridge:
    image: mfg/historian-bridge:v4.0
    restart: always
    environment:
      - OT_INFLUX_URL=http://ot-influxdb.plant.local:8086
      - IT_INFLUX_URL=http://it-influxdb.corp.local:8086
      - REPLICATION_INTERVAL=60
      - FILTERED_METRICS=oee,defect_rate,parts_count,downtime
    networks:
      - ot-dmz
      - it-dmz

networks:
  ot-dmz:
    external: true
  it-dmz:
    external: true
EOF
```

## Conclusion

Manufacturing OT environments benefit from containerization for quality inspection, production monitoring, and predictive maintenance applications. Portainer's Edge agent enables centralized management of containers deployed at individual machine level across an entire factory floor. The production-aware update scripts ensure Edge Stack updates are only pushed when the target line is idle, preserving production continuity. Combined with robust restart policies and local data buffering, containerized manufacturing applications can meet the reliability standards demanded by industrial production environments.
