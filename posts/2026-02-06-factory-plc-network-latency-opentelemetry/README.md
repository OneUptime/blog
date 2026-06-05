# How to Monitor Factory Floor PLC Network Latency with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, PLC, Factory Automation, Network Latency, Industrial Networks

Description: Monitor PLC network communication latency on the factory floor using OpenTelemetry metrics to detect network degradation before it impacts production.

PLCs are the workhorses of factory automation. They control motors, valves, conveyors, and robotic arms based on inputs from sensors and commands from higher-level systems. Communication latency between PLCs, between PLCs and HMIs, or between PLCs and SCADA servers directly affects production quality and throughput.

A 50ms delay that would be invisible in a web application can cause a reject on a high-speed packaging line. Monitoring PLC network latency with OpenTelemetry gives you the data to catch network degradation before it shows up as production defects.

## Common PLC Communication Protocols

Before instrumenting, understand what you are monitoring:

- **Ethernet/IP**: Common with Allen-Bradley/Rockwell PLCs
- **Profinet**: Siemens ecosystem
- **Modbus TCP**: Simple, widely supported
- **EtherCAT**: High-speed motion control, usually monitored through controller or vendor diagnostics

Each has different latency characteristics and failure modes. The approach here works for request/response protocols you can poll at the application layer. For deterministic fieldbus traffic such as EtherCAT cyclic process data, use protocol-specific diagnostics from the controller or vendor tooling instead.

## Building the Latency Monitor

The monitor sits on a dedicated machine on the factory network, regularly polling PLCs and measuring response times:

```python
import time
import struct
import socket
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Configure metrics export

reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://otel-collector:4317"),
    export_interval_millis=5000  # Export every 5 seconds for near-real-time visibility
)
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)
meter = metrics.get_meter("plc-network-monitor")

# Define the metrics we need
plc_latency = meter.create_histogram(
    "plc.network.latency_ms",
    description="Round-trip latency to PLC in milliseconds",
    unit="ms"
)
plc_timeout_count = meter.create_counter(
    "plc.network.timeouts",
    description="Number of PLC communication timeouts"
)
plc_error_count = meter.create_counter(
    "plc.network.errors",
    description="Number of PLC communication errors"
)
plc_reachable = meter.create_gauge(
    "plc.network.reachable",
    description="Whether the PLC is currently reachable (1=yes, 0=no)"
)
```

## Modbus TCP Latency Measurement

Here is a concrete implementation for Modbus TCP, a widely supported protocol for basic PLC monitoring:

```python
def recv_exact(sock, byte_count):
    """Read exactly byte_count bytes from a TCP socket, unless the connection closes."""
    chunks = []
    remaining = byte_count
    while remaining > 0:
        chunk = sock.recv(remaining)
        if not chunk:
            break
        chunks.append(chunk)
        remaining -= len(chunk)
    return b"".join(chunks)

def measure_modbus_latency(plc_host, plc_port=502, register_address=0, unit_id=1):
    """
    Send a Modbus TCP read holding registers request and measure round-trip time.
    This reads a single register, which is the lightest possible operation.
    """
    attrs = {
        "plc.host": plc_host,
        "plc.protocol": "modbus_tcp",
        "plc.unit_id": str(unit_id),
        "plc.network_segment": get_network_segment(plc_host)
    }

    # Build a Modbus TCP read holding registers request
    # Transaction ID (2 bytes) + Protocol ID (2 bytes) + Length (2 bytes) + Unit ID (1 byte)
    # + Function code 0x03 (1 byte) + Start address (2 bytes) + Quantity (2 bytes)
    transaction_id = int(time.time() * 1000) % 65536
    request = struct.pack(
        '>HHHBBHH',
        transaction_id,  # Transaction ID
        0,               # Protocol ID (Modbus)
        6,               # Length of remaining bytes
        unit_id,         # Unit ID
        0x03,            # Function code: Read Holding Registers
        register_address,# Starting address
        1                # Number of registers to read
    )

    try:
        # Measure the full round-trip: connect + send + receive
        start = time.monotonic()
        with socket.create_connection((plc_host, plc_port), timeout=2.0) as sock:
            sock.settimeout(2.0)  # 2 second timeout - generous for industrial networks
            sock.sendall(request)

            # Modbus TCP responses start with a 7-byte MBAP header.
            header = recv_exact(sock, 7)
            if len(header) == 7:
                response_length = struct.unpack(">H", header[4:6])[0]
                response = header + recv_exact(sock, response_length - 1)
            else:
                response = header
        end = time.monotonic()

        latency_ms = (end - start) * 1000
        plc_latency.record(latency_ms, attrs)
        segment_latency.record(latency_ms, {
            "plc.network_segment": attrs["plc.network_segment"],
            "plc.protocol": attrs["plc.protocol"]
        })
        plc_reachable.set(1, attrs)

        # Validate the response
        if len(response) < 9:
            plc_error_count.add(1, {**attrs, "error_type": "short_response"})
            return None

        response_transaction_id, protocol_id, length, response_unit_id = struct.unpack(">HHHB", response[:7])
        function_code = response[7]

        if response_transaction_id != transaction_id or protocol_id != 0 or response_unit_id != unit_id:
            plc_error_count.add(1, {**attrs, "error_type": "invalid_header"})
            return None

        if function_code == (0x03 | 0x80):
            exception_code = response[8]
            plc_error_count.add(1, {**attrs, "error_type": f"modbus_exception_{exception_code}"})
            return None

        if function_code != 0x03 or len(response) < 11:
            plc_error_count.add(1, {**attrs, "error_type": "invalid_response"})
            return None

        return latency_ms

    except socket.timeout:
        plc_timeout_count.add(1, attrs)
        plc_reachable.set(0, attrs)
        return None

    except ConnectionRefusedError:
        plc_error_count.add(1, {**attrs, "error_type": "connection_refused"})
        plc_reachable.set(0, attrs)
        return None

    except Exception as e:
        plc_error_count.add(1, {**attrs, "error_type": type(e).__name__})
        plc_reachable.set(0, attrs)
        return None
```

## Running the Monitor Loop

Poll all PLCs on a regular interval:

```python
import threading

# PLC inventory - in production, load this from a configuration database
PLC_INVENTORY = [
    {"host": "10.0.1.10", "name": "Line1-MainPLC", "segment": "line1"},
    {"host": "10.0.1.11", "name": "Line1-RobotPLC", "segment": "line1"},
    {"host": "10.0.2.10", "name": "Line2-MainPLC", "segment": "line2"},
    {"host": "10.0.2.11", "name": "Line2-PackagingPLC", "segment": "line2"},
    {"host": "10.0.3.10", "name": "Warehouse-ConveyorPLC", "segment": "warehouse"},
]

def monitor_plc(plc_config, interval_seconds=5):
    """
    Continuously monitor a single PLC's network latency.
    Each PLC gets its own thread for independent monitoring.
    """
    while True:
        latency = measure_modbus_latency(plc_config["host"])
        if latency is not None:
            # Log unusually high latency for immediate attention
            if latency > 50:
                print(f"WARNING: High latency to {plc_config['name']}: {latency:.1f}ms")
        else:
            print(f"ALERT: Cannot reach {plc_config['name']} at {plc_config['host']}")
        time.sleep(interval_seconds)

def start_monitoring():
    """Launch monitoring threads for all PLCs."""
    for plc in PLC_INVENTORY:
        thread = threading.Thread(
            target=monitor_plc,
            args=(plc,),
            daemon=True
        )
        thread.start()
        print(f"Monitoring started for {plc['name']}")
```

## Network Segment Analysis

Group latency metrics by network segment to detect switch or cable issues:

```python
segment_latency = meter.create_histogram(
    "plc.network.segment_latency_ms",
    description="Latency measurements grouped by network segment",
    unit="ms"
)

def get_network_segment(plc_host):
    """Map a PLC IP to its network segment based on subnet."""
    octets = plc_host.split(".")
    subnet = f"{octets[0]}.{octets[1]}.{octets[2]}.0/24"
    segment_map = {
        "10.0.1.0/24": "line1",
        "10.0.2.0/24": "line2",
        "10.0.3.0/24": "warehouse"
    }
    return segment_map.get(subnet, "unknown")
```

## Alert Thresholds

For factory floor PLC networks, these thresholds are reasonable starting points:

- **Warning at 20ms**: Normal PLC communication on a well-configured industrial Ethernet network should be under 10ms. Hitting 20ms means something has changed.
- **Critical at 50ms**: At this point, time-sensitive control loops may be affected.
- **Timeout alert (any)**: Even a single timeout to a PLC warrants investigation. These devices should always be reachable on a dedicated industrial network.
- **Segment-wide latency increase**: If all PLCs on a segment slow down simultaneously, the issue is likely a switch, cable, or broadcast storm.

## Conclusion

PLC network latency is one of those things that factory automation engineers traditionally monitor with dedicated tools like Wireshark captures or vendor-specific diagnostic software. By bringing this data into OpenTelemetry, you unify it with the rest of your observability stack. You can correlate PLC latency spikes with application-level issues, production quality metrics, and infrastructure events to get a complete picture of what is happening on your factory floor.
