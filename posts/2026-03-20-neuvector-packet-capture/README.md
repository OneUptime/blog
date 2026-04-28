# How to Configure NeuVector Packet Capture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Packet Capture, Network Forensics, Container Security, Kubernetes

Description: Use NeuVector's packet capture feature to capture and analyze network traffic from containers for forensic investigation and policy development.

## Introduction

NeuVector's packet capture feature allows you to record network packets from specific containers for forensic analysis, policy development, and incident investigation. Unlike traditional network capture tools, NeuVector captures traffic at the container network interface level, providing per-container visibility without requiring access to the underlying node. Captures are stored as PCAP files that can be analyzed with Wireshark or other tools.

## Use Cases

- Forensic analysis after a security incident
- Validating network rules before enabling Protect mode
- Debugging unexpected network behavior
- Building accurate network policy from real traffic
- Verifying DPI and WAF rule effectiveness

## Prerequisites

- NeuVector with Enforcer running on all nodes
- Target containers running
- NeuVector Manager access
- Wireshark or `tcpdump` for analyzing PCAP files

## Step 1: Start a Packet Capture via UI

1. Navigate to **Assets** > **Containers**
2. Click the container you want to capture
3. Click **Packet Capture** tab
4. Configure capture settings:
   - **File Number**: Maximum number of rotation files (max 50)
   - **Duration**: How long to capture (seconds)
   - **Filter**: Optional BPF filter expression
5. Click **Start** to begin capture

## Step 2: Start Packet Capture via API

```bash
# Start a packet capture on a specific workload

WORKLOAD_ID="abc123def456"

curl -sk -X POST \
  "https://neuvector-manager:8443/v1/sniffer?f_workload=${WORKLOAD_ID}" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "sniffer": {
      "file_number": 5,
      "duration": 60,
      "filter": ""
    }
  }'

# Response returns the sniffer ID:
# {"result": {"id": "<sniffer_id>"}}
```

## Step 3: Check Capture Status

```bash
# Use the sniffer ID returned from the start request
SNIFFER_ID="<sniffer_id_from_start_response>"

# Check if capture is running
curl -sk \
  "https://neuvector-manager:8443/v1/sniffer/${SNIFFER_ID}" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.sniffer | {
    id: .id,
    status: .status,
    size: .size,
    start_time: .start_time,
    stop_time: .stop_time
  }'

# Or list all sniffers for a workload
curl -sk \
  "https://neuvector-manager:8443/v1/sniffer?f_workload=${WORKLOAD_ID}" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.sniffers'
```

## Step 4: Stop and Download the Capture

```bash
# Stop an in-progress capture
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/sniffer/stop/${SNIFFER_ID}" \
  -H "X-Auth-Token: ${TOKEN}"

# Download the PCAP file
curl -sk \
  "https://neuvector-manager:8443/v1/sniffer/${SNIFFER_ID}/pcap" \
  -H "X-Auth-Token: ${TOKEN}" \
  -o capture-${SNIFFER_ID}.pcap

echo "Capture saved: capture-${SNIFFER_ID}.pcap"

# Optionally delete the sniffer record after downloading
curl -sk -X DELETE \
  "https://neuvector-manager:8443/v1/sniffer/${SNIFFER_ID}" \
  -H "X-Auth-Token: ${TOKEN}"
```

## Step 5: Analyze the PCAP File

Analyze the captured traffic:

```bash
# Basic analysis with tcpdump
tcpdump -r capture-${SNIFFER_ID}.pcap -nn -c 100

# Show HTTP requests
tcpdump -r capture-${SNIFFER_ID}.pcap -nn -A 'tcp port 80 or tcp port 8080' | grep -E "GET|POST|HTTP"

# Show DNS queries
tcpdump -r capture-${SNIFFER_ID}.pcap -nn 'udp port 53'

# Show external connections
tcpdump -r capture-${SNIFFER_ID}.pcap -nn 'not net 10.0.0.0/8 and not net 172.16.0.0/12 and not net 192.168.0.0/16'

# Extract unique destination IPs
tcpdump -r capture-${SNIFFER_ID}.pcap -nn 'tcp' | \
  awk '{print $5}' | cut -d. -f1-4 | sort -u

# Analyze with tshark (Wireshark CLI)
tshark -r capture-${SNIFFER_ID}.pcap -T json | jq '.[] | .layers | {
  src: .ip.ip_src,
  dst: .ip.ip_dst,
  protocol: .frame.frame_protocols
}'
```

## Step 6: Automate Capture on Security Events

Set up automated capture when suspicious activity is detected:

```bash
#!/bin/bash
# auto-capture-on-incident.sh
# Called by a monitoring script when a security event is detected

WORKLOAD_ID="$1"
REASON="$2"
CAPTURE_DURATION=120  # 2 minutes

echo "Starting packet capture for workload ${WORKLOAD_ID} due to: ${REASON}"

# Start capture and capture the returned sniffer ID
SNIFFER_ID=$(curl -sk -X POST \
  "https://neuvector-manager:8443/v1/sniffer?f_workload=${WORKLOAD_ID}" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d "{
    \"sniffer\": {
      \"file_number\": 5,
      \"duration\": ${CAPTURE_DURATION},
      \"filter\": \"\"
    }
  }" | jq -r '.result.id')

echo "Capture started with sniffer ID: ${SNIFFER_ID}. Will run for ${CAPTURE_DURATION} seconds."
echo "Download capture after ${CAPTURE_DURATION} seconds using:"
echo "GET /v1/sniffer/${SNIFFER_ID}/pcap"
```

## Step 7: Capture Network Traffic for Policy Development

Use captures to build accurate network rules:

```bash
# Capture traffic during a known workflow
# Start capture and capture the returned sniffer ID
SNIFFER_ID=$(curl -sk -X POST \
  "https://neuvector-manager:8443/v1/sniffer?f_workload=${WORKLOAD_ID}" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{"sniffer": {"file_number": 10, "duration": 300}}' | jq -r '.result.id')

# Exercise the application workflow (run your normal application operations)

# Download the capture
curl -sk \
  "https://neuvector-manager:8443/v1/sniffer/${SNIFFER_ID}/pcap" \
  -H "X-Auth-Token: ${TOKEN}" \
  -o workflow-capture.pcap

# Extract unique connections from the capture
tshark -r workflow-capture.pcap -T fields \
  -e ip.dst \
  -e tcp.dstport \
  -e udp.dstport \
  '(tcp or udp) and not ip.dst == 127.0.0.1' | \
  sort -u | \
  awk 'NF > 0' > observed-connections.txt

echo "Observed connections saved to observed-connections.txt"
cat observed-connections.txt
```

## Step 8: Integrate with Incident Response

Create a complete incident response capture workflow:

```bash
#!/bin/bash
# incident-capture.sh
# Comprehensive capture for incident response

WORKLOAD_ID="$1"
INCIDENT_ID="INC-$(date +%Y%m%d%H%M%S)"
CAPTURE_DIR="/forensics/${INCIDENT_ID}"
mkdir -p "${CAPTURE_DIR}"

echo "=== Incident Capture: ${INCIDENT_ID} ==="

# Capture packets
echo "Starting packet capture..."
SNIFFER_ID=$(curl -sk -X POST \
  "https://neuvector-manager:8443/v1/sniffer?f_workload=${WORKLOAD_ID}" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{"sniffer": {"file_number": 10, "duration": 300}}' | jq -r '.result.id')

# Collect security events (incidents, threats and violations)
echo "Collecting security events..."
curl -sk \
  "https://neuvector-manager:8443/v1/log/security?start=0&limit=100" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq --arg id "${WORKLOAD_ID}" \
  '[(.threats // [])[], (.incidents // [])[], (.violations // [])[] | select(.workload_id == $id)]' \
  > "${CAPTURE_DIR}/security-events.json"

# Collect vulnerability report
echo "Collecting vulnerability report..."
curl -sk \
  "https://neuvector-manager:8443/v1/scan/workload/${WORKLOAD_ID}" \
  -H "X-Auth-Token: ${TOKEN}" \
  > "${CAPTURE_DIR}/vulnerability-report.json"

echo "Waiting for capture to complete..."
sleep 305

# Download PCAP
echo "Downloading packet capture..."
curl -sk \
  "https://neuvector-manager:8443/v1/sniffer/${SNIFFER_ID}/pcap" \
  -H "X-Auth-Token: ${TOKEN}" \
  -o "${CAPTURE_DIR}/network-capture.pcap"

echo "Incident capture complete: ${CAPTURE_DIR}"
```

## Conclusion

NeuVector's packet capture feature bridges the gap between security alerting and forensic investigation. By capturing network traffic at the container level, you preserve evidence for incident investigation without requiring node-level access or disrupting other workloads. Combined with the quarantine feature, packet capture enables a complete incident response workflow: detect, quarantine, capture evidence, investigate, remediate.
