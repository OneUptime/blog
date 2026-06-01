# How to Perform Azure Migrate at Scale Using CSV Import

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Migrate, CSV Import, Datacenter Migration, Large Scale Migration, Cloud Migration, Assessment, Azure

Description: Learn how to use CSV import in Azure Migrate to assess and plan migrations for large datacenter inventories with thousands of servers.

---

When you are migrating a datacenter with a few dozen VMs, the Azure Migrate appliance discovery approach works perfectly. But when your inventory is in the thousands - multiple datacenters, different hypervisors, physical servers, and network segments - the appliance-based approach can be slow and may not cover everything. Azure Migrate supports CSV import for exactly this scenario. You export your inventory data from your existing CMDB, asset management system, or manual spreadsheets, format it as a CSV, and import it directly into Azure Migrate for assessment. This guide explains how to do it right.

## When to Use CSV Import

CSV import is the right choice when:

- You have thousands of servers across multiple locations and deploying appliances everywhere is not practical
- Your servers are physical machines or running on hypervisors that Azure Migrate appliances do not support
- You already have accurate inventory data in a CMDB (like ServiceNow, BMC Helix, or Device42)
- You want to do preliminary assessments before committing to a full discovery deployment
- You need to assess servers that are behind firewalls where the appliance cannot reach

The limitation of CSV import is that you do not get real-time performance data. You provide estimated performance metrics in the CSV, or you rely on Azure Migrate's default sizing. For accurate right-sizing, you eventually want appliance-based discovery data, but CSV import gets you started fast. Servers imported using a CSV file can be assessed, but they cannot be migrated directly from those imported records.

## Prerequisites

- An Azure Migrate project
- Your server inventory data (from CMDB, spreadsheets, or other sources)
- Permissions to create assessments in the Azure Migrate project

## Step 1: Prepare Your CSV File

Azure Migrate expects a specific CSV format. Here are the required and optional columns:

```csv
*Server name,IP addresses,*Cores,*Memory (In MB),*OS name,OS version,OS architecture,Server type,Hypervisor,CPU utilization percentage,Memory utilization percentage,Network adapters,Network In throughput,Network Out throughput,Boot type,Number of disks,Storage in use (In GB),Disk 1 size (In GB),Disk 1 read throughput (MB per second),Disk 1 write throughput (MB per second),Disk 1 read ops (operations per second),Disk 1 write ops (operations per second)
```

Here is an example with real-looking data:

```csv
*Server name,IP addresses,*Cores,*Memory (In MB),*OS name,OS version,OS architecture,Server type,Hypervisor,CPU utilization percentage,Memory utilization percentage,Network adapters,Network In throughput,Network Out throughput,Boot type,Number of disks,Storage in use (In GB),Disk 1 size (In GB),Disk 1 read throughput (MB per second),Disk 1 write throughput (MB per second),Disk 1 read ops (operations per second),Disk 1 write ops (operations per second)
web-server-01,10.0.1.10,4,8192,Windows Server 2019,2019,64-bit,Virtual,VMware,45,60,1,100,50,BIOS,1,80,100,50,25,500,200
web-server-02,10.0.1.11,4,8192,Windows Server 2019,2019,64-bit,Virtual,VMware,42,58,1,100,50,BIOS,1,80,100,50,25,500,200
app-server-01,10.0.2.10,8,16384,Windows Server 2019,2019,64-bit,Virtual,VMware,65,72,1,150,75,UEFI,1,160,200,100,75,1000,500
app-server-02,10.0.2.11,8,16384,Windows Server 2019,2019,64-bit,Virtual,VMware,60,68,1,150,75,UEFI,1,160,200,100,75,1000,500
db-server-01,10.0.3.10,16,65536,Red Hat Enterprise Linux 8,8.5,64-bit,Physical,,55,80,2,200,150,UEFI,1,400,500,200,150,5000,2000
db-server-02,10.0.3.11,16,65536,Red Hat Enterprise Linux 8,8.5,64-bit,Physical,,50,75,2,200,150,UEFI,1,400,500,200,150,5000,2000
batch-server-01,10.0.4.10,32,131072,Windows Server 2022,2022,64-bit,Virtual,Hyper-V,80,85,2,400,300,UEFI,1,800,1000,400,300,8000,4000
file-server-01,10.0.5.10,4,16384,Windows Server 2019,2019,64-bit,Virtual,Hyper-V,15,40,1,30,20,BIOS,1,1500,2000,30,20,200,100
```

### Generating the CSV from Existing Systems

If your inventory is in ServiceNow or a similar CMDB, you can export it and transform it with a script. Here is a Python script that converts a common CMDB export into Azure Migrate format:

```python
# convert_cmdb_to_azure_migrate.py

# Transforms a CMDB server inventory export into Azure Migrate CSV format
import csv
import sys

def convert_cmdb_export(input_file, output_file):
    """Convert CMDB export to Azure Migrate CSV format."""

    # Define the output header that Azure Migrate expects
    output_header = [
        "*Server name", "IP addresses", "*Cores", "*Memory (In MB)",
        "*OS name", "OS version", "OS architecture", "Server type", "Hypervisor",
        "CPU utilization percentage", "Memory utilization percentage",
        "Network adapters", "Network In throughput", "Network Out throughput",
        "Boot type", "Number of disks", "Storage in use (In GB)",
        "Disk 1 size (In GB)", "Disk 1 read throughput (MB per second)",
        "Disk 1 write throughput (MB per second)",
        "Disk 1 read ops (operations per second)",
        "Disk 1 write ops (operations per second)"
    ]

    with open(input_file, 'r') as infile, open(output_file, 'w', newline='') as outfile:
        reader = csv.DictReader(infile)
        writer = csv.DictWriter(outfile, fieldnames=output_header)
        writer.writeheader()

        for row in reader:
            # Map CMDB fields to Azure Migrate fields
            # Adjust field names based on your specific CMDB export
            output_row = {
                "*Server name": row.get("hostname", ""),
                "IP addresses": row.get("ip_address", ""),
                "*Cores": row.get("cpu_cores", "4"),
                "*Memory (In MB)": int(float(row.get("ram_gb", "8")) * 1024),
                "*OS name": row.get("operating_system", ""),
                "OS version": row.get("os_version", ""),
                "OS architecture": "64-bit",
                "Server type": row.get("server_type", "Virtual"),
                "Hypervisor": row.get("hypervisor", "VMware"),
                "CPU utilization percentage": row.get("avg_cpu_pct", "50"),
                "Memory utilization percentage": row.get("avg_mem_pct", "60"),
                "Network adapters": row.get("network_adapters", "1"),
                "Network In throughput": row.get("network_in_mbps", "50"),
                "Network Out throughput": row.get("network_out_mbps", "25"),
                "Boot type": row.get("boot_type", "BIOS"),
                "Number of disks": row.get("disk_count", "1"),
                "Storage in use (In GB)": row.get("storage_in_use_gb", ""),
                "Disk 1 size (In GB)": row.get("disk_size_gb", "100"),
                "Disk 1 read throughput (MB per second)": row.get("disk_read_mbps", "50"),
                "Disk 1 write throughput (MB per second)": row.get("disk_write_mbps", "25"),
                "Disk 1 read ops (operations per second)": row.get("disk_read_iops", "500"),
                "Disk 1 write ops (operations per second)": row.get("disk_write_iops", "200"),
            }
            writer.writerow(output_row)

    print(f"Converted {input_file} to {output_file}")

if __name__ == "__main__":
    convert_cmdb_export(sys.argv[1], sys.argv[2])
```

### Handling Multiple Disks and Network Adapters

Azure Migrate CSV supports details for up to 20 disks. Just add additional disk columns:

```csv
*Server name,...,Disk 1 size (In GB),Disk 1 read ops (operations per second),Disk 1 write ops (operations per second),...,Disk 2 size (In GB),Disk 2 read ops (operations per second),Disk 2 write ops (operations per second),...,Network adapters,Network In throughput,Network Out throughput
```

For servers with many disks, this can make the CSV quite wide. I have seen database servers with 10+ disks, which means 50+ columns just for disk data.

## Step 2: Validate the CSV

Before importing, validate your CSV to catch common errors:

```python
# validate_csv.py - Validate an Azure Migrate CSV before import
import csv
import sys

def validate(filename):
    """Check the CSV for common issues that would cause import failures."""
    errors = []
    warnings = []
    row_count = 0

    with open(filename, 'r') as f:
        reader = csv.DictReader(f)

        for i, row in enumerate(reader, start=2):
            row_count += 1
            # Check required fields
            if not row.get("*Server name"):
                errors.append(f"Row {i}: Missing server name")

            if not row.get("*Cores"):
                errors.append(f"Row {i}: Missing CPU cores")

            if not row.get("*Memory (In MB)"):
                errors.append(f"Row {i}: Missing memory")

            if not row.get("*OS name"):
                errors.append(f"Row {i}: Missing OS name")

            # Validate numeric fields
            try:
                cores = int(row.get("*Cores", 0))
                if cores < 1 or cores > 256:
                    warnings.append(f"Row {i}: Unusual core count ({cores})")
            except ValueError:
                errors.append(f"Row {i}: Invalid core count: {row.get('*Cores')}")

            try:
                memory = int(row.get("*Memory (In MB)", 0))
                if memory < 512:
                    warnings.append(f"Row {i}: Very low memory ({memory} MB)")
            except ValueError:
                errors.append(f"Row {i}: Invalid memory value")

    # Print results
    print(f"Validated {row_count} rows")
    if errors:
        print(f"\nERRORS ({len(errors)}):")
        for e in errors:
            print(f"  - {e}")
    if warnings:
        print(f"\nWARNINGS ({len(warnings)}):")
        for w in warnings:
            print(f"  - {w}")

    return len(errors) == 0

if __name__ == "__main__":
    valid = validate(sys.argv[1])
    sys.exit(0 if valid else 1)
```

## Step 3: Import the CSV into Azure Migrate

In the Azure portal:

1. Go to your Azure Migrate project
2. Navigate to **Servers, databases and web apps** > **Assessment tools**
3. Click **Discover** > **Import using CSV**
4. Upload your CSV file
5. Review the import summary and confirm

The import processes the CSV and creates server records in Azure Migrate. For large files (thousands of rows), the import can take 10 to 30 minutes.

After import, verify the servers appear correctly:

1. Open the Azure Migrate dashboard
2. On **Azure Migrate: Discovery and assessment**, select the discovered server count
3. Select the **Import based** tab

## Step 4: Create Assessments

With the servers imported, create assessments to get sizing recommendations and cost estimates:

1. Go to the **Infrastructure** tab
2. Select the imported servers you want to assess
3. Select **Create assessment**
4. Enter a friendly assessment name and review the selected servers
5. Set the target region, pricing options, saving options, and sizing criteria
6. Review the settings and select **Create Assessment**

Use "As-is on-premises" sizing when your CSV does not include detailed performance data. This sizes the Azure VMs to match the on-premises configuration. If you included performance metrics in the CSV, use "Performance-based" for potentially smaller (and cheaper) Azure VMs.

## Step 5: Analyze Assessment Results

The assessment generates several useful reports:

- **Azure readiness**: Which servers can move to Azure and which have issues
- **VM sizing**: Recommended Azure VM SKUs for each server
- **Cost estimate**: Monthly Azure compute and storage costs
- **Assessment scope**: The servers included in the assessment

Export the assessment for offline analysis:

1. Open the assessment in **Decide and plan** > **Assessments** > **Workloads**
2. Select **Export assessment** to download the Excel report

## Handling Thousands of Servers

When working with large inventories, here are some practical tips:

**Break the CSV into logical groups.** Instead of one giant CSV with 5,000 servers, split it by application, business unit, or datacenter. This makes assessments more manageable and lets you migrate in waves.

**Use consistent naming.** Server names in the CSV should match your actual hostnames. This makes it easier to correlate assessment results with your inventory.

**Estimate performance conservatively.** If you do not have actual performance data, estimate high rather than low. It is better to over-size initially and scale down than to under-size and have performance problems.

**Automate the CSV generation.** If your CMDB is the source of truth, build an automated pipeline that exports the data, transforms it, and imports it into Azure Migrate. This way you can re-run assessments as your inventory changes.

**Review the "not ready" servers first.** These are the ones that need attention before migration - unsupported operating systems, oversized disks, or incompatible configurations. Addressing blockers early prevents delays during the actual migration.

## Summary

CSV import in Azure Migrate lets you assess large datacenter inventories without deploying appliances to every location. You export your server data from your CMDB, format it into the Azure Migrate CSV template, import it, and run assessments. This approach scales to thousands of servers and gives you cost estimates, sizing recommendations, and readiness reports that inform your migration planning. For the most accurate results, combine CSV import for initial planning with appliance-based discovery for detailed performance data as you get closer to migration.
