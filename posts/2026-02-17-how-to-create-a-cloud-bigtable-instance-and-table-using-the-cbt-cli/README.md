# How to Create a Cloud Bigtable Instance and Table Using the cbt CLI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Bigtable, cbt CLI, NoSQL, Database

Description: A step-by-step guide to creating and managing Cloud Bigtable instances, tables, and column families using the cbt command-line tool.

---

Cloud Bigtable is Google's fully managed, petabyte-scale NoSQL database. It is the same technology that powers Google Search, Gmail, and Maps. If you need to store and query massive amounts of data with consistent low latency, Bigtable is the tool for the job.

The `cbt` CLI is a lightweight command-line tool specifically designed for Bigtable. While you can also use `gcloud`, the Cloud Console, or client libraries, `cbt` is the fastest way to create tables, manage column families, and interact with data during development. Let me walk through setting everything up from scratch.

## Installing the cbt CLI

The `cbt` tool comes with the Google Cloud SDK as a separate component. Install it like this:

```bash
# Install the cbt CLI component
gcloud components install cbt

# Verify the installation
cbt version
```

If you are using a package manager installation of gcloud instead of the official installer, you might need to install `cbt` separately:

```bash
# Alternative: install via go get (requires Go)
go install cloud.google.com/go/bigtable/cmd/cbt@latest
```

## Configuring cbt

Before using `cbt`, you need to configure it with your project and instance. Create a `.cbtrc` file in your home directory.

```bash
# Create the cbt configuration file
# This tells cbt which project and instance to use by default
cat > ~/.cbtrc << 'EOF'
project = your-project-id
instance = your-instance-id
EOF
```

You can also pass these as flags on every command, but the config file is much more convenient:

```bash
# Without .cbtrc, you would have to specify project and instance every time
cbt -project=your-project-id -instance=your-instance-id ls
```

## Creating a Bigtable Instance

First, you need to create a Bigtable instance. This is done through `gcloud` rather than `cbt`, since `cbt` works with instances that already exist.

```bash
# Create a development instance (single node, lower cost)
# Development instances are great for testing but do not provide SLA guarantees
gcloud bigtable instances create my-dev-instance \
  --display-name="My Dev Instance" \
  --cluster-config=id=my-dev-cluster,zone=us-central1-b,nodes=1 \
  --instance-type=DEVELOPMENT \
  --project=your-project-id
```

For production workloads, create a production instance with at least 3 nodes:

```bash
# Create a production instance with 3 nodes
# Production instances provide an SLA and auto-replication within the cluster
gcloud bigtable instances create my-prod-instance \
  --display-name="My Production Instance" \
  --cluster-config=id=my-prod-cluster,zone=us-central1-b,nodes=3 \
  --instance-type=PRODUCTION \
  --project=your-project-id
```

Update your `.cbtrc` with the instance you just created:

```bash
# Update cbt config to point to the new instance
cat > ~/.cbtrc << 'EOF'
project = your-project-id
instance = my-dev-instance
EOF
```

## Creating a Table

Now let us create a table using `cbt`. Bigtable tables consist of a table name and one or more column families.

```bash
# Create a table called 'user-events'
cbt createtable user-events

# Verify the table was created
cbt ls
```

The `ls` command lists all tables in the instance. At this point, the table exists but has no column families.

## Adding Column Families

In Bigtable, data is organized into column families. A column family groups related columns together, and you can apply different settings (like garbage collection policies) to each family.

```bash
# Add column families to the user-events table
# 'event' family will store event data
cbt createfamily user-events event

# 'metadata' family will store metadata about the event
cbt createfamily user-events metadata

# 'metrics' family will store numeric metrics
cbt createfamily user-events metrics

# List column families for the table
cbt ls user-events
```

Choosing column families is an important design decision. Group columns that are frequently accessed together into the same family. Bigtable reads data at the column family level, so having the right groupings improves read performance.

## Writing Data

You can write data with `cbt set`. Each cell in Bigtable is identified by the row key, column family, column qualifier, and timestamp.

```bash
# Write data to the user-events table
# Format: cbt set TABLE ROW_KEY FAMILY:QUALIFIER=VALUE

# Write an event for user 12345
cbt set user-events "user#12345#2026-02-17T10:30:00" \
  event:type=page_view \
  event:page=/dashboard \
  event:browser=Chrome \
  metadata:ip=192.168.1.1 \
  metadata:country=US \
  metrics:load_time_ms=250

# Write another event
cbt set user-events "user#12345#2026-02-17T10:31:00" \
  event:type=click \
  event:element=signup-button \
  metadata:ip=192.168.1.1 \
  metrics:response_time_ms=120

# Write an event for a different user
cbt set user-events "user#67890#2026-02-17T10:30:00" \
  event:type=page_view \
  event:page=/home \
  metadata:country=UK
```

## Reading Data

Read data back using `cbt read` and `cbt lookup`.

```bash
# Read a single row by exact row key
cbt lookup user-events "user#12345#2026-02-17T10:30:00"

# Read all rows in the table (be careful with large tables!)
cbt read user-events

# Read rows with a prefix - gets all events for user 12345
cbt read user-events prefix=user#12345

# Read a specific range of rows
cbt read user-events start=user#12345#2026-02-17T10:00:00 end=user#12345#2026-02-17T11:00:00

# Limit the number of rows returned
cbt read user-events prefix=user#12345 count=10

# Read only specific column families
cbt read user-events prefix=user#12345 families=event
```

## Setting Garbage Collection Policies

Garbage collection (GC) policies control how old data is cleaned up. This is crucial for managing storage costs and keeping your table size under control.

```bash
# Keep only the most recent version of each cell
cbt setgcpolicy user-events event maxversions=1

# Keep data for 30 days, regardless of how many versions
cbt setgcpolicy user-events metadata maxage=720h  # 720 hours = 30 days

# Combine policies: keep up to 3 versions OR data from the last 7 days
cbt setgcpolicy user-events metrics maxversions=3 or maxage=168h

# Check the current GC policy for a family
cbt ls user-events
```

## Deleting Data

You can delete specific rows, cells, or entire tables.

```bash
# Delete a specific row
cbt deleterow user-events "user#12345#2026-02-17T10:30:00"

# Delete all rows (truncate the table)
cbt deleteallrows user-events

# Delete the entire table
cbt deletetable user-events

# Delete a column family from a table
cbt deletefamily user-events metrics
```

## Creating a Table for a Real-World Use Case

Let me put this all together with a practical example: creating a table for storing time-series IoT sensor data.

```bash
# Create a table for IoT sensor readings
cbt createtable sensor-readings

# Add column families for different data types
cbt createfamily sensor-readings data        # Raw sensor readings
cbt createfamily sensor-readings stats       # Computed statistics
cbt createfamily sensor-readings alerts      # Alert flags

# Set GC policies - keep raw data for 90 days, stats forever
cbt setgcpolicy sensor-readings data maxage=2160h    # 90 days
cbt setgcpolicy sensor-readings alerts maxage=8760h  # 1 year
cbt setgcpolicy sensor-readings stats maxversions=1  # Only latest value

# Insert some sample data
# Row key format: sensor_id#reverse_timestamp (for efficient recent-first reads)
cbt set sensor-readings "sensor-001#9999999999999" \
  data:temperature=23.5 \
  data:humidity=65.2 \
  data:pressure=1013.25 \
  stats:daily_avg_temp=22.8 \
  alerts:high_temp=false

# Verify the data
cbt read sensor-readings prefix=sensor-001 count=5
```

## Useful cbt Commands Reference

Here is a quick reference of the most commonly used `cbt` commands:

```bash
# Instance and table management
cbt ls                              # List all tables
cbt ls TABLE                        # List column families for a table
cbt createtable TABLE               # Create a table
cbt deletetable TABLE               # Delete a table

# Column family management
cbt createfamily TABLE FAMILY       # Create a column family
cbt deletefamily TABLE FAMILY       # Delete a column family
cbt setgcpolicy TABLE FAMILY POLICY # Set garbage collection policy

# Data operations
cbt set TABLE ROW FAMILY:COL=VAL    # Write a cell
cbt lookup TABLE ROW                # Read a single row
cbt read TABLE                      # Read rows (with optional filters)
cbt deleterow TABLE ROW             # Delete a row
cbt deleteallrows TABLE             # Delete all rows (truncate)
cbt count TABLE                     # Count rows in a table
```

## Wrapping Up

The `cbt` CLI is the quickest way to get started with Cloud Bigtable. It lets you create instances, tables, and column families, then immediately start reading and writing data. For development and debugging, it is indispensable. For production applications, you will want to use client libraries (Java, Python, Go, Node.js) for better performance and more features, but `cbt` remains your best friend for quick inspections, data verification, and ad-hoc queries against your Bigtable instance.
