# How to Store and Query IoT Time-Series Data in Google Cloud Bigtable for High-Throughput Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Bigtable, IoT, Time Series, NoSQL

Description: Store and query massive volumes of IoT time-series data using Google Cloud Bigtable with optimized row key design and read patterns.

---

When your IoT fleet generates millions of data points per second, BigQuery might not be the right fit for real-time reads and writes. That is where Cloud Bigtable comes in. Bigtable is a wide-column NoSQL database that can handle extremely high write throughput with consistent single-digit millisecond latencies - exactly what time-series IoT workloads demand.

In this post, I will cover how to design your Bigtable schema for IoT time-series data, write data efficiently, and query it using different access patterns.

## Why Bigtable for IoT Time Series

Bigtable excels at workloads with these characteristics:

- High write throughput (millions of writes per second)
- Low-latency reads by row key
- Large datasets that grow continuously
- Sequential scan patterns (reading a range of time)

Compared to BigQuery, Bigtable gives you millisecond reads instead of seconds, but you trade away the SQL query engine. Bigtable is best when you know your access patterns up front and can design your row keys around them.

## Prerequisites

- GCP project with Bigtable API enabled
- `cbt` CLI tool installed (comes with `google-cloud-sdk`)
- Python 3.8+ with `google-cloud-bigtable` package

```bash
# Install the Bigtable client library
pip install google-cloud-bigtable

# Install the cbt CLI tool
gcloud components install cbt
```

## Step 1: Create a Bigtable Instance and Table

```bash
# Create a Bigtable instance with SSD storage for production workloads
# HDD storage is cheaper but slower - fine for batch analytics
gcloud bigtable instances create iot-timeseries \
  --display-name="IoT Time Series" \
  --cluster-config=id=iot-cluster-1,zone=us-central1-a,nodes=3,storage-type=SSD

# Configure the cbt CLI to use this instance
echo 'project = your-project-id' > ~/.cbtrc
echo 'instance = iot-timeseries' >> ~/.cbtrc

# Create the table with a column family
# The gc-rule sets garbage collection to keep data for 90 days
cbt createtable sensor-data families="d:maxage=90d"
```

The table has a single column family `d` (for "data"). Using short column family and qualifier names reduces storage overhead since they are stored with every cell.

## Step 2: Design the Row Key

Row key design is the most important decision in Bigtable. A bad row key leads to hotspotting where all writes go to the same node. Here is a well-designed row key for IoT time series:

```
<device_id_hash>#<device_id>#<reverse_timestamp>
```

Breaking this down:

- `device_id_hash`: First 4 characters of the MD5 hash of the device_id. This distributes writes across nodes evenly.
- `device_id`: The actual device identifier for readability.
- `reverse_timestamp`: `Long.MAX_VALUE - timestamp` so newer data sorts first.

```python
import hashlib
import struct
import time

def build_row_key(device_id, timestamp_ms):
    """Builds a Bigtable row key that distributes writes evenly
    and sorts recent data first within each device."""

    # Hash prefix prevents hotspotting by distributing across tablets
    hash_prefix = hashlib.md5(device_id.encode()).hexdigest()[:4]

    # Reverse timestamp puts newest data first in scan order
    reverse_ts = 9999999999999 - timestamp_ms

    return f"{hash_prefix}#{device_id}#{reverse_ts}"
```

Why does this matter? Without the hash prefix, devices with similar IDs (like "sensor-001", "sensor-002") would all land on the same Bigtable node. The hash prefix spreads them out.

## Step 3: Write Data to Bigtable

Here is how to write sensor data efficiently using the Python client:

```python
from google.cloud import bigtable
from google.cloud.bigtable import row as bt_row
import json
import time
import hashlib

# Initialize the Bigtable client
client = bigtable.Client(project="your-project-id", admin=True)
instance = client.instance("iot-timeseries")
table = instance.table("sensor-data")

def write_sensor_reading(device_id, timestamp_ms, readings):
    """Writes a single sensor reading to Bigtable.

    Args:
        device_id: Unique device identifier
        timestamp_ms: Reading timestamp in milliseconds
        readings: Dict of sensor values, e.g. {"temperature": 22.5, "humidity": 45}
    """
    row_key = build_row_key(device_id, timestamp_ms)
    row = table.direct_row(row_key)

    # Store each sensor reading as a separate column qualifier
    # This allows reading individual sensor types without fetching everything
    for sensor_type, value in readings.items():
        row.set_cell(
            "d",  # Column family
            sensor_type.encode(),  # Column qualifier
            str(value).encode(),  # Cell value
            timestamp=timestamp_ms * 1000,  # Bigtable uses microseconds
        )

    # Store metadata that might be useful for queries
    row.set_cell("d", b"device_id", device_id.encode(), timestamp=timestamp_ms * 1000)

    row.commit()

# Example usage
write_sensor_reading(
    device_id="sensor-042",
    timestamp_ms=int(time.time() * 1000),
    readings={"temperature": 23.5, "humidity": 48.2, "pressure": 1013.25}
)
```

## Step 4: Batch Writes for High Throughput

For high-throughput ingestion, use `MutateRows` to batch multiple writes together:

```python
from google.cloud.bigtable.row import DirectRow

def write_batch(table, readings_batch):
    """Writes a batch of sensor readings to Bigtable in a single RPC call.
    This is much more efficient than individual writes for high-throughput
    ingestion from Dataflow or a message consumer."""

    rows = []
    for reading in readings_batch:
        row_key = build_row_key(reading["device_id"], reading["timestamp_ms"])
        row = table.direct_row(row_key)

        for sensor_type, value in reading["values"].items():
            row.set_cell(
                "d",
                sensor_type.encode(),
                str(value).encode(),
                timestamp=reading["timestamp_ms"] * 1000,
            )

        rows.append(row)

    # MutateRows sends all mutations in a single RPC
    # Bigtable processes them atomically per row
    responses = table.mutate_rows(rows)

    # Check for any failed mutations
    for i, response in enumerate(responses):
        if response.code != 0:
            print(f"Failed to write row {i}: {response.message}")

# Process batches of up to 100,000 mutations per call
batch = [
    {"device_id": f"sensor-{i:03d}", "timestamp_ms": int(time.time() * 1000),
     "values": {"temperature": 22.0 + i * 0.1}}
    for i in range(1000)
]
write_batch(table, batch)
```

## Step 5: Query Patterns

Here are the common read patterns for IoT time-series data.

**Get latest readings for a specific device:**

```python
def get_latest_readings(device_id, count=10):
    """Reads the most recent N readings for a device.
    Since we use reverse timestamps, scanning from the device prefix
    gives us newest data first."""

    hash_prefix = hashlib.md5(device_id.encode()).hexdigest()[:4]
    prefix = f"{hash_prefix}#{device_id}#"

    # Read rows with this prefix, limited to the requested count
    rows = table.read_rows(
        row_set=bt_row.RowSet(row_ranges=[
            bt_row.RowRange(start_key=prefix.encode())
        ]),
        limit=count,
    )

    results = []
    for row in rows:
        cells = row.cells["d"]
        reading = {}
        for qualifier, cell_list in cells.items():
            reading[qualifier.decode()] = cell_list[0].value.decode()
        results.append(reading)

    return results
```

**Get readings for a device within a time range:**

```python
def get_readings_in_range(device_id, start_ms, end_ms):
    """Reads all data points for a device between two timestamps.
    We reverse the timestamps to match our row key format."""

    hash_prefix = hashlib.md5(device_id.encode()).hexdigest()[:4]

    # Reverse the timestamps - start becomes end and vice versa
    range_start = f"{hash_prefix}#{device_id}#{9999999999999 - end_ms}"
    range_end = f"{hash_prefix}#{device_id}#{9999999999999 - start_ms}"

    rows = table.read_rows(
        row_set=bt_row.RowSet(row_ranges=[
            bt_row.RowRange(
                start_key=range_start.encode(),
                end_key=range_end.encode(),
            )
        ]),
    )

    results = []
    for row in rows:
        cells = row.cells["d"]
        reading = {}
        for qualifier, cell_list in cells.items():
            reading[qualifier.decode()] = cell_list[0].value.decode()
        results.append(reading)

    return results
```

## Performance Tuning Tips

- **Node count**: Each Bigtable node handles about 10,000 reads/writes per second with SSD storage. Size accordingly.
- **Row size**: Keep rows under 100 MB. For IoT data, this is rarely an issue since each reading is small.
- **Column qualifiers**: Use short names. "t" instead of "temperature" saves storage at scale.
- **Garbage collection**: Set it based on your retention needs. The `maxage=90d` policy we set earlier automatically deletes old data.
- **Pre-splitting**: For a brand new table, pre-split based on your hash prefix to distribute load from the start.

## Wrapping Up

Bigtable is a great fit for IoT time-series workloads that need sustained high write throughput and low-latency reads by device and time range. The key to making it work well is getting the row key design right, which I have found is worth spending extra time on before writing any application code. Once the row key distributes writes evenly and supports your read patterns, Bigtable pretty much takes care of the rest.
