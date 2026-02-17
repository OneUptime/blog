# How to Run a Dataflow Pipeline with Custom Worker Machine Types

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataflow, Worker Configuration, Machine Types, Performance Tuning

Description: Learn how to configure custom worker machine types in Dataflow to optimize pipeline performance and cost for your specific workload patterns.

---

Dataflow's default worker configuration works for many pipelines, but when you are processing large datasets or running compute-intensive transforms, the default machine type might not be the best fit. Choosing the right worker machine type can mean the difference between a pipeline that runs in 10 minutes and one that takes an hour, or between spending $5 and $50 on a job.

In this post, I will cover how to configure worker machine types in Dataflow, how to choose the right type for your workload, and how to tune other worker settings like disk size, number of workers, and network configuration.

## Default Worker Configuration

When you launch a Dataflow job without specifying worker configuration, Dataflow uses default settings. For batch jobs, the default machine type is typically n1-standard-1 (1 vCPU, 3.75 GB RAM) with autoscaling enabled. For streaming jobs, the default is n1-standard-4 (4 vCPUs, 15 GB RAM).

These defaults are conservative. For any non-trivial pipeline, you will want to customize the worker configuration.

## Specifying Machine Types

You can set the worker machine type using pipeline options. This applies to both Python and Java pipelines.

In Python:

```python
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions

# Configure workers with a specific machine type
options = PipelineOptions([
    '--runner=DataflowRunner',
    '--project=my-project',
    '--region=us-central1',
    '--temp_location=gs://my-bucket/temp/',
    # Worker machine configuration
    '--machine_type=n2-standard-8',     # 8 vCPUs, 32 GB RAM
    '--num_workers=5',                   # Initial worker count
    '--max_num_workers=50',              # Maximum for autoscaling
    '--disk_size_gb=100',                # Boot disk size per worker
    '--worker_disk_type=compute.googleapis.com/projects//zones//diskTypes/pd-ssd',
])

with beam.Pipeline(options=options) as pipeline:
    # Your pipeline code here
    pass
```

In Java, pass the same options as command-line arguments:

```bash
# Launch a Java pipeline with custom worker configuration
java -cp pipeline.jar com.mycompany.MyPipeline \
  --runner=DataflowRunner \
  --project=my-project \
  --region=us-central1 \
  --workerMachineType=n2-standard-8 \
  --numWorkers=5 \
  --maxNumWorkers=50 \
  --diskSizeGb=100 \
  --tempLocation=gs://my-bucket/temp/
```

## Choosing the Right Machine Type

The right machine type depends on what your pipeline does. Here is a breakdown of common workload patterns and which machine families work best.

For I/O-heavy pipelines that spend most of their time reading from or writing to external sources like BigQuery, GCS, or Pub/Sub, the bottleneck is usually network and I/O, not CPU. Use general-purpose machines with moderate specs.

```python
# I/O-heavy pipeline: general purpose machines are fine
options = PipelineOptions([
    '--machine_type=n2-standard-4',  # 4 vCPUs, 16 GB RAM
    '--max_num_workers=20',
    # More workers with smaller machines handle I/O parallelism well
])
```

For CPU-intensive pipelines that do heavy parsing, transformation, encryption, or compression, use compute-optimized machines.

```python
# CPU-intensive pipeline: use compute-optimized machines
options = PipelineOptions([
    '--machine_type=c2-standard-8',  # 8 vCPUs optimized for compute
    '--max_num_workers=10',
])
```

For memory-intensive pipelines that perform large joins, group-by operations on high-cardinality keys, or cache large lookup datasets, use high-memory machines.

```python
# Memory-intensive pipeline: use high-memory machines
options = PipelineOptions([
    '--machine_type=n2-highmem-8',  # 8 vCPUs, 64 GB RAM
    '--max_num_workers=10',
])
```

## Available Machine Type Families on GCP

Here is a quick reference of the machine families you can use with Dataflow.

N1 series is the previous generation general purpose. It is cheaper per hour but less efficient than N2. Use it for cost-sensitive workloads where performance is not critical.

N2 series is the current generation general purpose. It offers a good balance of price and performance and is the best default choice.

C2 series is compute-optimized with the highest per-core performance. It costs more per hour but finishes CPU-bound work faster, often resulting in lower total cost.

N2D series uses AMD processors and is slightly cheaper than N2 with comparable performance. Good for cost optimization when workloads are not latency-sensitive.

E2 series is the most cost-effective option. These machines use a shared-core model for smaller sizes and are good for development and testing pipelines.

## Configuring Disk Settings

The worker disk type and size affect shuffle performance and the ability to handle large intermediate datasets.

```python
# Configure disk for large shuffle operations
options = PipelineOptions([
    '--machine_type=n2-standard-8',
    # Use SSD for better shuffle performance
    '--worker_disk_type=compute.googleapis.com/projects//zones//diskTypes/pd-ssd',
    # Increase disk size for pipelines with large intermediate data
    '--disk_size_gb=500',
])
```

For pipelines that produce large intermediate datasets during shuffles or joins, increasing the disk size prevents out-of-disk errors. SSD disks provide faster read and write speeds for shuffle operations, which can significantly speed up pipelines with many GroupByKey or CoGroupByKey transforms.

However, for most pipelines, Dataflow Shuffle service eliminates the need for local disk shuffle. Enable it to offload shuffle to a managed service.

```python
# Use Dataflow Shuffle service instead of local disk
options = PipelineOptions([
    '--machine_type=n2-standard-4',
    '--experiments=shuffle_mode=service',  # Use managed shuffle
    '--disk_size_gb=30',  # Can use smaller disks with managed shuffle
])
```

## Network Configuration

You can specify which VPC network and subnetwork the workers should use. This is important for security and for accessing private resources.

```python
# Configure workers to use a specific VPC subnetwork
options = PipelineOptions([
    '--machine_type=n2-standard-4',
    # Use a specific subnetwork
    '--subnetwork=regions/us-central1/subnetworks/dataflow-subnet',
    # Disable public IPs for workers (requires Cloud NAT for internet access)
    '--no_use_public_ips',
    # Use internal IPs only
    '--use_public_ips=false',
])
```

Disabling public IPs is a security best practice. Workers can still access GCP services through Private Google Access, and you can set up Cloud NAT if they need internet access for other purposes.

## Using Custom Container Images

For advanced customization, you can specify a custom Docker container image for workers.

```python
# Use a custom container image with pre-installed dependencies
options = PipelineOptions([
    '--machine_type=n2-standard-4',
    '--sdk_container_image=us-docker.pkg.dev/my-project/dataflow/custom-worker:latest',
    '--experiments=use_runner_v2',  # Required for custom containers
])
```

Building a custom container lets you pre-install system-level dependencies, custom libraries, and tools that workers need.

```dockerfile
# Dockerfile for custom Dataflow worker
FROM apache/beam_python3.10_sdk:2.53.0

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libxml2-dev \
    libxslt1-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt /tmp/
RUN pip install --no-cache-dir -r /tmp/requirements.txt
```

```bash
# Build and push the custom container
docker build -t us-docker.pkg.dev/my-project/dataflow/custom-worker:latest .
docker push us-docker.pkg.dev/my-project/dataflow/custom-worker:latest
```

## Autoscaling Configuration

Dataflow autoscaling adjusts the number of workers based on the pipeline's throughput and backlog.

```python
# Fine-tune autoscaling behavior
options = PipelineOptions([
    '--machine_type=n2-standard-4',
    '--num_workers=2',           # Start with 2 workers
    '--max_num_workers=50',      # Scale up to 50 workers
    '--autoscaling_algorithm=THROUGHPUT_BASED',
])
```

For batch pipelines, Dataflow scales up quickly when there is a large backlog and scales down as the work completes. For streaming pipelines, autoscaling responds to changes in incoming data rate.

If you want to disable autoscaling and use a fixed number of workers:

```python
# Disable autoscaling - use exactly 10 workers
options = PipelineOptions([
    '--machine_type=n2-standard-4',
    '--num_workers=10',
    '--autoscaling_algorithm=NONE',
])
```

## Cost Optimization Tips

To minimize costs, keep these strategies in mind. Use preemptible VMs for batch pipelines. Preemptible workers cost about 80% less but can be terminated at any time. Dataflow handles the termination gracefully by redistributing work.

```python
# Use preemptible VMs for batch cost savings
options = PipelineOptions([
    '--machine_type=n2-standard-4',
    '--max_num_workers=20',
    # Use preemptible VMs (batch only)
    '--use_preemptible_workers',
    # Keep some non-preemptible workers for stability
    '--num_workers=2',
])
```

Right-size your machines by monitoring CPU and memory utilization during pipeline runs. If workers are consistently below 50% CPU utilization, move to a smaller machine type. If they are consistently above 90%, move to a larger one.

## Wrapping Up

Configuring worker machine types is one of the most impactful optimizations you can make for Dataflow pipelines. The right machine type, disk configuration, and autoscaling settings can reduce both execution time and cost significantly. Start with general-purpose N2 machines, monitor utilization during runs, and then adjust based on whether your pipeline is CPU-bound, memory-bound, or I/O-bound. The Dataflow Shuffle service is worth enabling for any pipeline with significant shuffle operations, as it reduces your dependence on local disk and improves performance.
