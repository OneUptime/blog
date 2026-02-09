# How to Monitor RAN (Radio Access Network) Cell Site Performance with OpenTelemetry Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, RAN, Cell Site, 5G NR, Telecommunications

Description: Monitor Radio Access Network cell site performance metrics like throughput, handovers, and PRB utilization with OpenTelemetry.

The Radio Access Network is where the mobile experience begins. Cell site performance directly impacts what subscribers feel: dropped calls, slow downloads, and coverage gaps all trace back to RAN issues. In this post, we will cover how to collect and export RAN performance metrics using OpenTelemetry, giving you real-time visibility into cell site health.

## RAN Metrics That Matter

Cell sites generate a massive amount of performance data. Here are the key performance indicators (KPIs) you should prioritize:

- **PRB (Physical Resource Block) utilization**: How much of the radio spectrum is in use
- **Throughput per cell**: Aggregate downlink and uplink throughput
- **Connected UEs**: Number of devices attached to each cell
- **Handover success rate**: Percentage of inter-cell handovers that complete without dropping
- **RRC connection setup success rate**: How often devices can successfully connect
- **CQI (Channel Quality Indicator)**: Average channel quality reported by UEs
- **RSRP/RSRQ**: Reference signal strength and quality

## Building a RAN Metrics Collector

Most RAN vendors expose performance counters through a northbound interface, often as PM (Performance Management) XML files or via a REST API. Here is a collector that reads PM counters and converts them to OpenTelemetry metrics.

```python
# ran_metrics_collector.py
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
import xml.etree.ElementTree as ET
import time

# Set up OTel metrics
exporter = OTLPMetricExporter(endpoint="oneuptime-collector:4317")
reader = PeriodicExportingMetricReader(exporter, export_interval_millis=15000)
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("ran.cell_site")

# Define cell site metrics
prb_utilization_dl = meter.create_gauge(
    "ran.cell.prb_utilization.downlink",
    description="Downlink PRB utilization percentage",
    unit="%",
)

prb_utilization_ul = meter.create_gauge(
    "ran.cell.prb_utilization.uplink",
    description="Uplink PRB utilization percentage",
    unit="%",
)

cell_throughput_dl = meter.create_gauge(
    "ran.cell.throughput.downlink",
    description="Cell downlink throughput",
    unit="bit/s",
)

cell_throughput_ul = meter.create_gauge(
    "ran.cell.throughput.uplink",
    description="Cell uplink throughput",
    unit="bit/s",
)

connected_ues = meter.create_gauge(
    "ran.cell.connected_ues",
    description="Number of UEs connected to this cell",
    unit="{ue}",
)

handover_success_rate = meter.create_gauge(
    "ran.cell.handover.success_rate",
    description="Inter-cell handover success rate",
    unit="%",
)

rrc_setup_success_rate = meter.create_gauge(
    "ran.cell.rrc.setup_success_rate",
    description="RRC connection setup success rate",
    unit="%",
)

avg_cqi = meter.create_gauge(
    "ran.cell.cqi.average",
    description="Average CQI reported by connected UEs",
    unit="{cqi}",
)


def parse_pm_xml(xml_path: str) -> list:
    """Parse a 3GPP PM XML file and extract counters per cell."""
    tree = ET.parse(xml_path)
    root = tree.getroot()
    cells = []

    # Navigate the 3GPP XML structure
    for measured_entity in root.findall(".//{http://www.3gpp.org/ftp/specs}measValue"):
        cell_id = measured_entity.get("measObjLdn")

        counters = {}
        for result in measured_entity.findall("{http://www.3gpp.org/ftp/specs}r"):
            counter_index = int(result.get("p"))
            counter_value = float(result.text)
            counters[counter_index] = counter_value

        cells.append({
            "cell_id": cell_id,
            "counters": counters,
        })

    return cells


def collect_and_export(pm_data: list, site_id: str, gnb_id: str):
    """Map PM counters to OpenTelemetry metrics."""
    for cell in pm_data:
        cell_id = cell["cell_id"]
        counters = cell["counters"]

        # Common attributes for all metrics from this cell
        attrs = {
            "ran.site_id": site_id,
            "ran.gnb_id": gnb_id,
            "ran.cell_id": cell_id,
            "ran.technology": "5G-NR",
        }

        # Map PM counter indices to OTel metrics
        # These index mappings depend on your vendor's PM definition file
        if 1001 in counters and 1002 in counters:
            total_prb = counters[1002]
            used_prb = counters[1001]
            if total_prb > 0:
                util = (used_prb / total_prb) * 100
                prb_utilization_dl.set(util, attrs)

        if 2001 in counters:
            cell_throughput_dl.set(counters[2001], attrs)

        if 2002 in counters:
            cell_throughput_ul.set(counters[2002], attrs)

        if 3001 in counters:
            connected_ues.set(int(counters[3001]), attrs)

        # Handover success rate calculation
        if 4001 in counters and 4002 in counters:
            attempts = counters[4001]
            successes = counters[4002]
            if attempts > 0:
                rate = (successes / attempts) * 100
                handover_success_rate.set(rate, attrs)

        if 5001 in counters:
            avg_cqi.set(counters[5001], attrs)
```

## OpenTelemetry Collector with Spatial Enrichment

Cell sites have physical locations. Enriching metrics with geographic coordinates enables map-based dashboards.

```yaml
# otel-collector-ran.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s
    send_batch_size: 2048

  # Enrich cell metrics with geographic data from a lookup table
  # This uses the resource processor with a file-based lookup
  resource:
    attributes:
      - key: deployment.environment
        value: "production"
        action: upsert

  # Transform processor to compute derived metrics
  transform:
    metric_statements:
      - context: datapoint
        statements:
          # Flag cells with high PRB utilization for capacity planning
          - set(attributes["ran.cell.congested"], "true")
            where metric.name == "ran.cell.prb_utilization.downlink" and Double() > 80.0

exporters:
  otlp:
    endpoint: "oneuptime-collector:4317"
    tls:
      insecure: false

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [batch, resource, transform]
      exporters: [otlp]
```

## Alerting on Cell Site Degradation

Configure alerts for these common RAN issues:

- **PRB utilization above 80%**: The cell is approaching capacity and users will experience slower speeds.
- **Handover success rate below 95%**: Dropped calls during mobility are likely occurring.
- **RRC setup success rate below 98%**: Devices are having trouble connecting to the cell.
- **Average CQI below 7**: Signal quality is degraded, possibly due to interference or antenna issues.
- **Connected UEs spike**: A sudden increase might indicate a neighboring cell went down and traffic shifted.

## Correlating RAN Metrics with Core Network Traces

The most valuable analysis happens when you correlate RAN metrics with core network traces. If you see increased latency in your SMF PDU session establishment traces, check whether the affected cells have high PRB utilization at the same time. If handover failures spike on a specific cell, look at whether the X2/Xn interface between gNodeBs is experiencing packet loss using your transport layer metrics.

OpenTelemetry makes this cross-layer correlation possible because all the data flows through the same pipeline with consistent attributes and timestamps. You can build unified dashboards that show RAN health alongside core network performance, giving your NOC team the complete picture they need.
