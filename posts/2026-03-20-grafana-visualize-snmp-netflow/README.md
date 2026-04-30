# How to Use Grafana to Visualize SNMP and NetFlow Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, SNMP, NetFlow, Visualization, InfluxDB, Dashboard

Description: Learn how to build Grafana dashboards to visualize SNMP-polled metrics and NetFlow traffic data using InfluxDB as the time series database.

## Architecture

```mermaid
graph LR
    Devices["Network Devices\n(SNMP + NetFlow)"]
    Collector["Telegraf / nfdump\n(Collection & Normalization)"]
    InfluxDB["InfluxDB\n(Time Series Storage)"]
    Grafana["Grafana\n(Dashboards)"]

    Devices -- SNMP Poll --> Collector
    Devices -- NetFlow UDP --> Collector
    Collector --> InfluxDB
    Grafana --> InfluxDB
```

## Step 1: Install InfluxDB and Grafana

```bash
# Install InfluxDB 2.x from the InfluxData APT repository
sudo apt-get update
sudo apt-get install -y curl gpg apt-transport-https wget gnupg
sudo mkdir -p /etc/apt/keyrings
curl --silent --location -O https://repos.influxdata.com/influxdata-archive.key
gpg --show-keys --with-fingerprint --with-colons ./influxdata-archive.key 2>&1 \
  | grep -q '^fpr:\+24C975CBA61A024EE1B631787C3D57159FC2F927:$' \
  && cat influxdata-archive.key \
  | gpg --dearmor \
  | sudo tee /etc/apt/keyrings/influxdata-archive.gpg > /dev/null \
  && echo 'deb [signed-by=/etc/apt/keyrings/influxdata-archive.gpg] https://repos.influxdata.com/debian stable main' \
  | sudo tee /etc/apt/sources.list.d/influxdata.list
sudo apt-get update
sudo apt-get install -y influxdb2
sudo systemctl enable influxdb && sudo systemctl start influxdb

# Install Grafana from the Grafana APT repository
sudo wget -O /etc/apt/keyrings/grafana.asc https://apt.grafana.com/gpg-full.key
sudo chmod 644 /etc/apt/keyrings/grafana.asc
echo "deb [signed-by=/etc/apt/keyrings/grafana.asc] https://apt.grafana.com stable main" \
  | sudo tee -a /etc/apt/sources.list.d/grafana.list
sudo apt-get update
sudo apt-get install -y grafana
sudo systemctl daemon-reload
sudo systemctl enable grafana-server
sudo systemctl start grafana-server
```

Then open `http://localhost:8086` and complete the one-time InfluxDB setup, creating the `myorg` organization and the `network` bucket. After setup, create a second bucket named `netflow`, and copy an operator or all-access token for the Telegraf and Grafana steps below.

## Step 2: Configure Telegraf for SNMP Polling

Telegraf is the data collection agent that polls SNMP and sends to InfluxDB:

```bash
sudo apt-get install -y telegraf
```

Create Telegraf SNMP configuration:

```toml
# /etc/telegraf/telegraf.d/snmp.conf

[[inputs.snmp]]
  agents = ["192.168.1.1:161", "192.168.1.2:161"]
  version = 2
  community = "public"
  agent_host_tag = "source"
  interval = "60s"

  # Hostname/sysName
  [[inputs.snmp.field]]
    name = "hostname"
    oid = "RFC1213-MIB::sysName.0"
    is_tag = true

  # CPU utilization on Cisco devices
  [[inputs.snmp.field]]
    name = "cpu_5min"
    # Replace `.1` with the correct cpmCPUTotalIndex for your device if needed
    oid = "CISCO-PROCESS-MIB::cpmCPUTotal5minRev.1"

  # Interface table - polled for each interface
  [[inputs.snmp.table]]
    name = "interface"
    inherit_tags = ["hostname"]

    [[inputs.snmp.table.field]]
      name = "name"
      oid = "IF-MIB::ifDescr"
      is_tag = true

    [[inputs.snmp.table.field]]
      name = "in_bytes"
      oid = "IF-MIB::ifHCInOctets"

    [[inputs.snmp.table.field]]
      name = "out_bytes"
      oid = "IF-MIB::ifHCOutOctets"

    [[inputs.snmp.table.field]]
      name = "oper_status"
      oid = "IF-MIB::ifOperStatus"

# Output to InfluxDB
[[outputs.influxdb_v2]]
  urls = ["http://localhost:8086"]
  token = "your-influxdb-token"
  organization = "myorg"
  bucket = "network"
  namedrop = ["netflow"]
```

```bash
sudo systemctl restart telegraf
```

## Step 3: Configure Telegraf for NetFlow

Add a NetFlow input to Telegraf:

```toml
# /etc/telegraf/telegraf.d/netflow.conf

[[inputs.netflow]]
  service_address = "udp://:2055"
  # Or for IPFIX on the standard port:
  # service_address = "udp://:4739"

[[processors.converter]]
  namepass = ["netflow"]
  # Convert source IP to a tag so Grafana can group top talkers by source.
  [processors.converter.fields]
    tag = ["src"]

[[outputs.influxdb_v2]]
  urls = ["http://localhost:8086"]
  token = "your-influxdb-token"
  organization = "myorg"
  bucket = "netflow"
  namepass = ["netflow"]
```

```bash
sudo systemctl restart telegraf
```

## Step 4: Add InfluxDB Data Source in Grafana

1. Open Grafana at `http://server-ip:3000` (admin/admin)
2. Go to **Connections > Data sources > Add new data source**
3. Select **InfluxDB**
4. Configure:
   - Query language: **Flux**
   - URL: `http://localhost:8086`
   - Organization: `myorg`
   - Token: Your InfluxDB token
   - Default bucket: `network`

## Step 5: Create Interface Bandwidth Dashboard

In Grafana, create a new dashboard with a Time series panel. Use this Flux query:

```flux
// Interface bandwidth in Mbps (calculate delta for counter)
from(bucket: "network")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r["_measurement"] == "interface")
  |> filter(fn: (r) => r["_field"] == "in_bytes" or r["_field"] == "out_bytes")
  |> filter(fn: (r) => r["name"] == "GigabitEthernet0/0")
  |> derivative(unit: 1s, nonNegative: true)
  |> map(fn: (r) => ({ r with _value: r._value * 8.0 / 1000000.0 }))
  |> yield(name: "bandwidth_mbps")
```

## Step 6: Create a Top Talkers Panel from NetFlow

```flux
// Top 10 source IPs by bytes in last hour
from(bucket: "netflow")
  |> range(start: -1h)
  |> filter(fn: (r) => r["_measurement"] == "netflow")
  |> filter(fn: (r) => r["_field"] == "in_bytes" or r["_field"] == "in_total_bytes")
  |> group(columns: ["src"])
  |> sum()
  |> sort(columns: ["_value"], desc: true)
  |> limit(n: 10)
```

## Conclusion

Grafana combined with Telegraf and InfluxDB provides a powerful, open-source network monitoring stack. Use Telegraf's SNMP input to poll interface counters and create bandwidth graphs, and its NetFlow input to capture flow data for top talker analysis. Pre-built Grafana dashboards for network monitoring are available on grafana.com/grafana/dashboards for common use cases.
