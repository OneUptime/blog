# How to Use Bulk Instance API to Create Hundreds of Compute Engine VMs Simultaneously

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Compute Engine, Bulk API, Scaling, Automation

Description: Learn how to use the Compute Engine Bulk Instance API to create hundreds or thousands of VMs in a single API call, including configuration, naming patterns, and error handling.

---

Creating VMs one at a time works when you need a handful. But when you need to spin up 200 workers for a batch processing job or 500 nodes for a rendering farm, doing it sequentially is painfully slow. Each gcloud create command takes seconds to complete, and at scale, that adds up to minutes or hours of provisioning time.

The Bulk Instance API solves this by letting you create large numbers of identical VMs in a single API call. Google handles the parallel provisioning internally, and it is significantly faster than looping through individual create requests.

## What the Bulk Instance API Does

The Bulk Instance API (also called `bulkInsert`) accepts a count of instances and a template, then creates them all at once. It handles name generation, zone selection, and retries internally. You tell it how many VMs you want, and it does the work.

Key features:
- Create up to 1,000 instances per request
- Automatic name generation with configurable patterns
- Automatic zone selection within a region (or you can specify zones)
- Best-effort mode that creates as many as possible even if some fail

## Basic Bulk Instance Creation

The simplest way to use bulk insert is through gcloud. This creates 100 instances at once:

```bash
# Create 100 instances in bulk across us-central1
gcloud compute instances bulk create \
  --name-pattern="worker-####" \
  --count=100 \
  --region=us-central1 \
  --machine-type=e2-standard-4 \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=50GB \
  --boot-disk-type=pd-standard \
  --labels=job=batch-processing,batch-id=2026-02-17
```

The `--name-pattern` flag with `####` generates sequential names: `worker-0001`, `worker-0002`, ..., `worker-0100`. The number of `#` characters determines the padding width.

## Specifying Zones

By default, bulk create spreads instances across all available zones in the region. You can restrict it to specific zones:

```bash
# Create instances in specific zones only
gcloud compute instances bulk create \
  --name-pattern="render-node-####" \
  --count=200 \
  --zone=us-central1-a \
  --machine-type=n1-standard-8 \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=100GB
```

Or specify multiple zones for a regional bulk insert with controlled distribution:

```bash
# Create instances spread across specific zones in the region
gcloud compute instances bulk create \
  --name-pattern="processor-####" \
  --count=300 \
  --region=us-central1 \
  --machine-type=e2-standard-4 \
  --image-family=debian-12 \
  --image-project=debian-cloud
```

## Using the REST API Directly

For more control, you can call the Bulk Instance API directly. This is useful when integrating with existing automation systems:

```bash
# Bulk create using the REST API via gcloud's raw HTTP capability
# First, create the request body
cat > bulk-request.json << 'EOF'
{
  "count": 50,
  "namePattern": "batch-worker-####",
  "instanceProperties": {
    "machineType": "e2-standard-4",
    "disks": [
      {
        "boot": true,
        "autoDelete": true,
        "initializeParams": {
          "sourceImage": "projects/debian-cloud/global/images/family/debian-12",
          "diskSizeGb": "50",
          "diskType": "pd-standard"
        }
      }
    ],
    "networkInterfaces": [
      {
        "network": "global/networks/default",
        "accessConfigs": [
          {
            "type": "ONE_TO_ONE_NAT",
            "name": "External NAT"
          }
        ]
      }
    ],
    "metadata": {
      "items": [
        {
          "key": "startup-script",
          "value": "#!/bin/bash\napt-get update && apt-get install -y python3-pip"
        },
        {
          "key": "batch-id",
          "value": "job-2026-02-17-001"
        }
      ]
    },
    "labels": {
      "role": "batch-worker",
      "managed-by": "bulk-api"
    },
    "serviceAccounts": [
      {
        "email": "default",
        "scopes": [
          "https://www.googleapis.com/auth/cloud-platform"
        ]
      }
    ]
  }
}
EOF

# Send the bulk insert request to a specific zone
curl -X POST \
  "https://compute.googleapis.com/compute/v1/projects/MY_PROJECT/zones/us-central1-a/instances/bulkInsert" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d @bulk-request.json
```

For regional bulk insert (instances spread across zones):

```bash
# Send the bulk insert request at the regional level
curl -X POST \
  "https://compute.googleapis.com/compute/v1/projects/MY_PROJECT/regions/us-central1/instances/bulkInsert" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d @bulk-request.json
```

## Using Python Client Library

For applications that need programmatic bulk creation:

```python
from google.cloud import compute_v1

def bulk_create_instances(project_id, region, count, name_pattern):
    """Create multiple VMs in bulk using the Compute Engine API."""
    client = compute_v1.RegionInstancesClient()

    # Define instance properties for the bulk creation
    instance_props = compute_v1.InstanceProperties()
    instance_props.machine_type = "e2-standard-4"

    # Configure the boot disk
    disk = compute_v1.AttachedDisk()
    disk.auto_delete = True
    disk.boot = True
    init_params = compute_v1.AttachedDiskInitializeParams()
    init_params.source_image = "projects/debian-cloud/global/images/family/debian-12"
    init_params.disk_size_gb = 50
    disk.initialize_params = init_params
    instance_props.disks = [disk]

    # Configure the network interface
    nic = compute_v1.NetworkInterface()
    nic.network = f"projects/{project_id}/global/networks/default"
    access_config = compute_v1.AccessConfig()
    access_config.name = "External NAT"
    access_config.type_ = "ONE_TO_ONE_NAT"
    nic.access_configs = [access_config]
    instance_props.network_interfaces = [nic]

    # Build the bulk insert request
    request = compute_v1.BulkInsertRegionInstanceRequest()
    request.project = project_id
    request.region = region

    bulk_body = compute_v1.BulkInsertInstanceResource()
    bulk_body.count = count
    bulk_body.name_pattern = name_pattern
    bulk_body.instance_properties = instance_props

    request.bulk_insert_instance_resource_resource = bulk_body

    # Execute the bulk creation
    operation = client.bulk_insert(request=request)
    print(f"Bulk insert operation started: {operation.name}")

    return operation

# Create 100 instances
bulk_create_instances(
    project_id="my-project",
    region="us-central1",
    count=100,
    name_pattern="worker-####"
)
```

## Monitoring Bulk Creation Progress

Bulk insert operations are asynchronous. You can track their progress:

```bash
# List recent operations to find the bulk insert operation
gcloud compute operations list \
  --filter="operationType=bulkInsert" \
  --regions=us-central1 \
  --format="table(name, status, progress, insertTime)"
```

```bash
# Check the status of a specific bulk insert operation
gcloud compute operations describe OPERATION_ID \
  --region=us-central1
```

## Handling Partial Failures

Not every instance in a bulk create will necessarily succeed. Capacity constraints, quota limits, or other issues can cause some to fail while others succeed. The API provides details on what worked and what did not:

```bash
# After the operation completes, check which instances were created
gcloud compute instances list \
  --filter="name~^worker-" \
  --format="table(name, zone, status)" \
  --sort-by=name
```

To handle partial failures gracefully, you can check the count and retry:

```bash
#!/bin/bash
# Script to bulk create instances with retry logic for partial failures

DESIRED_COUNT=100
NAME_PATTERN="worker"
REGION="us-central1"

# Attempt bulk creation
gcloud compute instances bulk create \
  --name-pattern="${NAME_PATTERN}-####" \
  --count=${DESIRED_COUNT} \
  --region=${REGION} \
  --machine-type=e2-standard-4 \
  --image-family=debian-12 \
  --image-project=debian-cloud

# Count how many were actually created
ACTUAL_COUNT=$(gcloud compute instances list \
  --filter="name~^${NAME_PATTERN}-" \
  --format="value(name)" | wc -l)

echo "Created ${ACTUAL_COUNT} of ${DESIRED_COUNT} instances"

if [ "${ACTUAL_COUNT}" -lt "${DESIRED_COUNT}" ]; then
  REMAINING=$((DESIRED_COUNT - ACTUAL_COUNT))
  echo "Retrying creation of ${REMAINING} remaining instances..."

  # Retry with a different name pattern to avoid conflicts
  gcloud compute instances bulk create \
    --name-pattern="${NAME_PATTERN}-retry-####" \
    --count=${REMAINING} \
    --region=${REGION} \
    --machine-type=e2-standard-4 \
    --image-family=debian-12 \
    --image-project=debian-cloud
fi
```

## Cleaning Up Bulk-Created Instances

When the job is done, clean up all the instances:

```bash
# Delete all instances matching the naming pattern
gcloud compute instances list \
  --filter="name~^worker-" \
  --format="value(name, zone)" | while read -r name zone; do
    gcloud compute instances delete "${name}" --zone="${zone}" --quiet &
done

# Wait for all background delete operations to complete
wait
echo "All instances deleted"
```

Or use a label-based approach, which is cleaner:

```bash
# Delete all instances with a specific label
gcloud compute instances list \
  --filter="labels.batch-id=2026-02-17" \
  --format="value(name, zone)" | while read -r name zone; do
    gcloud compute instances delete "${name}" --zone="${zone}" --quiet &
done
wait
```

## Quota Considerations

Before creating hundreds of VMs, check your quotas:

```bash
# Check relevant quotas for the region
gcloud compute regions describe us-central1 \
  --format="table(quotas[].metric, quotas[].limit, quotas[].usage)" \
  --flatten="quotas[]" \
  --filter="quotas.metric:CPUS OR quotas.metric:INSTANCES OR quotas.metric:SSD_TOTAL_GB"
```

If your quotas are too low, request increases through the Cloud Console before running the bulk insert. There is nothing more frustrating than a bulk create failing at instance 47 of 500 because you hit a quota limit.

The Bulk Instance API is the right tool whenever you need more than a dozen or so identical instances. It is faster, simpler, and more reliable than scripting individual create calls.
