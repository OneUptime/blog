# How to Monitor IPv6 IoT Device Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IoT, Monitoring, Prometheus, SNMP, Networking

Description: Monitor IPv6 connectivity for IoT device fleets using Prometheus, custom metrics, and CoAP-based health checks to detect device outages and network issues.

## Introduction

Monitoring IPv6 IoT device connectivity requires different approaches than traditional server monitoring: devices may have intermittent connectivity, sleep to save power, and communicate over constrained networks. This guide covers practical monitoring strategies from simple ping-based checks to production-grade observability.

## Step 1: Basic IPv6 Ping Monitoring

```bash
#!/bin/bash
# ping_iot_devices.sh

# Monitor a list of IPv6 IoT device addresses

DEVICES_FILE="/etc/iot/device-addresses.txt"
LOG_FILE="/var/log/iot-connectivity.log"
ALERT_THRESHOLD=3  # Alert after 3 consecutive failures

while IFS= read -r device; do
    [[ "$device" =~ ^# ]] && continue  # Skip comments

    name=$(echo "$device" | awk '{print $1}')
    addr=$(echo "$device" | awk '{print $2}')

    if ping6 -c 2 -W 5 "$addr" > /dev/null 2>&1; then
        status="UP"
    else
        status="DOWN"
        echo "$(date): ALERT - $name ($addr) is DOWN" | tee -a "$LOG_FILE"
    fi

    echo "$(date): $name ($addr) - $status" >> "$LOG_FILE"
done < "$DEVICES_FILE"
```

## Step 2: Prometheus Exporter for IoT Devices

```python
#!/usr/bin/env python3
# iot_exporter.py
# Prometheus exporter for IPv6 IoT device connectivity

import subprocess
import time
from prometheus_client import start_http_server, Gauge, Counter
import yaml

# Metrics
device_up = Gauge(
    'iot_device_up',
    'Whether the IoT device is reachable via IPv6',
    ['device_name', 'ipv6_address', 'location']
)

device_ping_latency = Gauge(
    'iot_device_ping_latency_ms',
    'Round-trip ping latency to IoT device in milliseconds',
    ['device_name', 'ipv6_address']
)

def ping_device(addr: str, timeout: int = 5) -> tuple:
    """Ping a device and return (success, latency_ms)."""
    try:
        result = subprocess.run(
            ['ping6', '-c', '1', '-W', str(timeout), addr],
            capture_output=True, text=True, timeout=timeout + 2
        )
        if result.returncode == 0:
            # Parse latency from ping output
            for line in result.stdout.split('\n'):
                if 'time=' in line:
                    latency = float(line.split('time=')[1].split()[0])
                    return True, latency
            return True, 0.0
        return False, 0.0
    except Exception:
        return False, 0.0

def monitor_devices(config_file: str):
    """Load device list and monitor continuously."""
    with open(config_file) as f:
        config = yaml.safe_load(f)

    devices = config.get('devices', [])

    while True:
        for dev in devices:
            name = dev['name']
            addr = dev['ipv6_address']
            location = dev.get('location', 'unknown')

            up, latency = ping_device(addr)

            device_up.labels(
                device_name=name,
                ipv6_address=addr,
                location=location
            ).set(1 if up else 0)

            if up:
                device_ping_latency.labels(
                    device_name=name,
                    ipv6_address=addr
                ).set(latency)

        time.sleep(60)  # Check every minute

if __name__ == '__main__':
    start_http_server(9100)
    monitor_devices('/etc/iot/devices.yaml')
```

Device configuration file:
```yaml
# /etc/iot/devices.yaml
devices:
  - name: temperature-sensor-1
    ipv6_address: "2001:db8:1::1"
    location: "building-a-floor-2"
  - name: door-sensor-lobby
    ipv6_address: "2001:db8:1::a1"
    location: "building-a-lobby"
```

## Step 3: CoAP Health Check Monitoring

For devices running CoAP servers, check application-level health:

```python
#!/usr/bin/env python3
# coap_health_check.py
# Check CoAP endpoint health on IPv6 IoT devices

import asyncio
import aiocoap
import time

async def check_coap_device(addr: str, resource: str = "/.well-known/core") -> dict:
    """Check if a CoAP endpoint is responding."""
    protocol = await aiocoap.Context.create_client_context()
    uri = f"coap://[{addr}]{resource}"

    start_time = time.time()
    try:
        request = aiocoap.Message(code=aiocoap.GET, uri=uri)
        response = await asyncio.wait_for(
            protocol.request(request).response,
            timeout=10.0
        )
        latency = (time.time() - start_time) * 1000
        return {
            "status": "UP",
            "code": str(response.code),
            "latency_ms": latency,
            "payload": response.payload.decode()[:100]
        }
    except asyncio.TimeoutError:
        return {"status": "TIMEOUT", "latency_ms": 10000}
    except Exception as e:
        return {"status": "ERROR", "error": str(e)}

async def main():
    devices = [
        ("2001:db8:1::1", "/sensor/temperature"),
        ("2001:db8:1::2", "/sensor/humidity"),
    ]

    for addr, resource in devices:
        result = await check_coap_device(addr, resource)
        print(f"Device {addr}{resource}: {result}")

asyncio.run(main())
```

## Step 4: Prometheus Alert Rules

```yaml
# /etc/prometheus/rules/iot.yml
groups:
  - name: iot_connectivity
    rules:
      - alert: IoTDeviceDown
        expr: iot_device_up == 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "IoT device unreachable"
          description: "Device {{ $labels.device_name }} ({{ $labels.ipv6_address }}) at {{ $labels.location }} has been unreachable for 5 minutes"

      - alert: IoTDeviceHighLatency
        expr: iot_device_ping_latency_ms > 500
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "IoT device high latency"
          description: "Device {{ $labels.device_name }} ping latency is {{ $value }}ms"
```

## Step 5: Border Router Mesh Statistics

Monitor the health of the mesh network from the border router:

```bash
# Check number of IPv6 neighbors in the mesh
ip -6 neigh show dev lowpan0 | grep -c "REACHABLE\|STALE\|DELAY\|PROBE"

# Check mesh routing table size
ip -6 route show dev lowpan0 | wc -l

# Monitor neighbor state changes
ip -6 monitor neigh dev lowpan0
```

## Conclusion

Monitoring IPv6 IoT connectivity requires adapting traditional monitoring tools to handle the unique characteristics of constrained devices: intermittent connectivity, long sleep cycles, and constrained protocols. A tiered approach combining ping-based availability checks, CoAP application-level health probes, and Prometheus metrics provides comprehensive observability. Set alert thresholds that account for expected device sleep periods to avoid false positive alerts from sleepy end devices.
