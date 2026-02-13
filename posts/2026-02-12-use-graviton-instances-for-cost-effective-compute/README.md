# How to Use Graviton Instances for Cost-Effective Compute

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Graviton, ARM64, EC2, Cost Optimization

Description: Save 20-40% on compute costs by switching to AWS Graviton ARM-based instances for EC2, RDS, ElastiCache, Lambda, and ECS workloads.

---

AWS Graviton processors are ARM-based chips designed by Amazon. The pitch is simple: same or better performance at a 20% lower price. Graviton3 (the latest generation) delivers up to 25% better performance than Graviton2, which was already competitive with Intel and AMD offerings.

The savings are real and well-documented. A c6g.xlarge (Graviton2) costs $0.136/hour vs $0.17/hour for a c5.xlarge (Intel) - that's a 20% savings for comparable performance. Graviton3 instances (c7g family) push the price-performance gap even wider.

The question isn't whether Graviton saves money. It's whether your workloads are compatible with ARM64. Let's figure that out.

## Compatibility Check

Most modern software runs on ARM64 without issues. Here's what works and what doesn't:

**Works out of the box:**
- Linux-based workloads (Amazon Linux 2/2023, Ubuntu, Debian)
- Python, Node.js, Ruby, Go, Rust, Java applications
- Docker containers (with ARM64 images)
- Most open-source databases and tools
- Kubernetes (EKS supports Graviton)

**May need work:**
- Applications with x86-specific assembly code
- Binary dependencies compiled only for x86
- Some proprietary software without ARM builds
- Windows workloads (Graviton doesn't support Windows)

Check your existing instances and their software stack:

```bash
# List all EC2 instances and their architectures
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query "Reservations[].Instances[].{
    ID: InstanceId,
    Type: InstanceType,
    Platform: PlatformDetails,
    Architecture: Architecture
  }" \
  --output table
```

## Graviton Instance Families

Here's how Graviton families map to their x86 equivalents:

| Workload | x86 Family | Graviton2 | Graviton3 | Savings |
|---|---|---|---|---|
| General purpose | m5, m6i | m6g | m7g | ~20% |
| Compute optimized | c5, c6i | c6g | c7g | ~20% |
| Memory optimized | r5, r6i | r6g | r7g | ~20% |
| Burstable | t3 | t4g | - | ~20% |
| Storage optimized | i3 | im4gn, is4gen | - | ~15% |

## Migrating EC2 Instances

The migration process depends on how your instances are configured.

**For instances launched from standard AMIs:**

```bash
# Find Graviton-compatible AMI for your current OS
aws ec2 describe-images \
  --owners amazon \
  --filters \
    "Name=name,Values=al2023-ami-2023*-arm64" \
    "Name=architecture,Values=arm64" \
    "Name=state,Values=available" \
  --query "Images | sort_by(@, &CreationDate) | [-1].{ImageId: ImageId, Name: Name}" \
  --output table

# Launch a test instance with the ARM64 AMI
aws ec2 run-instances \
  --image-id ami-arm64-image-id \
  --instance-type t4g.medium \
  --key-name my-key \
  --subnet-id subnet-0a1b2c3d \
  --security-group-ids sg-0a1b2c3d4e5f67890 \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=graviton-test}]'
```

**For instances using custom AMIs**, you'll need to create an ARM64 version of your AMI. The easiest way is using EC2 Image Builder:

```bash
# Create an Image Builder recipe for ARM64
aws imagebuilder create-image-recipe \
  --name "my-app-arm64" \
  --version "1.0.0" \
  --parent-image "arn:aws:imagebuilder:us-east-1:aws:image/amazon-linux-2023-arm64/x.x.x" \
  --components '[
    {
      "componentArn": "arn:aws:imagebuilder:us-east-1:123456789012:component/my-app-setup/1.0.0/1"
    }
  ]'
```

## Migrating Docker/ECS Workloads

For containerized workloads, you need multi-architecture Docker images. Build for both amd64 and arm64:

```bash
# Build multi-arch image using Docker Buildx
docker buildx create --name multiarch --use

# Build and push for both architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --tag 123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest \
  --push .
```

Your Dockerfile might need minor adjustments for ARM compatibility:

```dockerfile
# Use multi-arch base images
FROM --platform=$TARGETPLATFORM python:3.12-slim

# Install dependencies normally - pip handles architecture automatically
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app
WORKDIR /app

CMD ["python", "main.py"]
```

Then update your ECS task definition to use Graviton:

```bash
# Register a task definition that targets ARM64
aws ecs register-task-definition \
  --family my-app \
  --requires-compatibilities FARGATE \
  --network-mode awsvpc \
  --cpu 1024 \
  --memory 2048 \
  --runtime-platform '{
    "cpuArchitecture": "ARM64",
    "operatingSystemFamily": "LINUX"
  }' \
  --container-definitions '[
    {
      "name": "app",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest",
      "essential": true,
      "portMappings": [{"containerPort": 8080, "protocol": "tcp"}]
    }
  ]'
```

## Migrating Lambda Functions

Lambda makes the switch trivially easy. Just change the architecture:

```bash
# Update a Lambda function to use ARM64 (Graviton2)
aws lambda update-function-configuration \
  --function-name my-function \
  --architectures arm64
```

ARM64 Lambda functions are 20% cheaper and often faster. For Python and Node.js functions, this is usually a one-line change with zero code modifications.

For compiled languages like Go or Rust, make sure you cross-compile for ARM:

```bash
# Cross-compile Go for ARM64 Linux
GOOS=linux GOARCH=arm64 go build -o bootstrap main.go

# Package and update the function
zip function.zip bootstrap
aws lambda update-function-code \
  --function-name my-function \
  --zip-file fileb://function.zip
```

## Migrating RDS Instances

RDS supports Graviton instance types (db.r6g, db.r7g, db.m6g, db.t4g). The migration is seamless since the database engine handles the architecture difference:

```bash
# Modify RDS instance to use Graviton
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --db-instance-class db.r6g.xlarge \
  --apply-immediately
```

This triggers a brief downtime during the modification. For production databases, schedule it during a maintenance window:

```bash
# Schedule for next maintenance window instead
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --db-instance-class db.r6g.xlarge \
  --no-apply-immediately
```

## Migrating ElastiCache

Same story - change the node type:

```bash
# Modify ElastiCache to use Graviton
aws elasticache modify-replication-group \
  --replication-group-id my-cache \
  --cache-node-type cache.r6g.large \
  --apply-immediately
```

## Benchmarking Before Full Migration

Always benchmark before committing to a full migration. Here's a simple load test approach:

```python
import requests
import time
import statistics
from concurrent.futures import ThreadPoolExecutor

def benchmark_endpoint(url, num_requests=1000, concurrency=10):
    """Benchmark an endpoint to compare x86 vs ARM64 performance"""
    latencies = []

    def make_request():
        start = time.time()
        response = requests.get(url)
        elapsed = (time.time() - start) * 1000  # ms
        return elapsed, response.status_code

    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(make_request) for _ in range(num_requests)]
        for future in futures:
            elapsed, status = future.result()
            if status == 200:
                latencies.append(elapsed)

    print(f"Results for {url}")
    print(f"  Requests: {len(latencies)}")
    print(f"  Mean latency: {statistics.mean(latencies):.1f}ms")
    print(f"  P50 latency:  {statistics.median(latencies):.1f}ms")
    print(f"  P95 latency:  {sorted(latencies)[int(len(latencies)*0.95)]:.1f}ms")
    print(f"  P99 latency:  {sorted(latencies)[int(len(latencies)*0.99)]:.1f}ms")

# Compare x86 and ARM64 deployments
print("=== x86 (m5.xlarge) ===")
benchmark_endpoint("http://x86-alb.example.com/api/health")

print("\n=== ARM64 (m6g.xlarge) ===")
benchmark_endpoint("http://arm64-alb.example.com/api/health")
```

## Calculating Your Savings

Here's a script to estimate savings from migrating your current fleet:

```python
import boto3

def estimate_graviton_savings():
    """Estimate savings from migrating current instances to Graviton"""
    ec2 = boto3.client('ec2')

    # Mapping from x86 to Graviton equivalents
    migration_map = {
        'm5.large': 'm6g.large', 'm5.xlarge': 'm6g.xlarge',
        'm5.2xlarge': 'm6g.2xlarge', 'c5.large': 'c6g.large',
        'c5.xlarge': 'c6g.xlarge', 'c5.2xlarge': 'c6g.2xlarge',
        'r5.large': 'r6g.large', 'r5.xlarge': 'r6g.xlarge',
        't3.micro': 't4g.micro', 't3.small': 't4g.small',
        't3.medium': 't4g.medium', 't3.large': 't4g.large',
    }

    instances = ec2.describe_instances(
        Filters=[{'Name': 'instance-state-name', 'Values': ['running']}]
    )

    migrateable = 0
    total = 0

    for res in instances['Reservations']:
        for inst in res['Instances']:
            total += 1
            itype = inst['InstanceType']
            if itype in migration_map:
                migrateable += 1
                print(f"  {inst['InstanceId']}: {itype} -> {migration_map[itype]}")

    print(f"\nTotal running instances: {total}")
    print(f"Migrateable to Graviton: {migrateable}")
    print(f"Estimated savings: ~20% on {migrateable} instances")

estimate_graviton_savings()
```

## Key Takeaways

Graviton migration is one of the safest cost optimizations available. The 20% price reduction comes with equal or better performance, and most software runs on ARM64 without modification. Start with Lambda (zero-effort switch), then move to containerized workloads, then EC2 and RDS. Benchmark as you go, but don't overthink it - the compatibility rate for modern applications is very high. For broader cost savings, combine Graviton with [reserved instances](https://oneuptime.com/blog/post/2026-02-12-reduce-rds-costs-with-reserved-instances/view) and [Spot pricing](https://oneuptime.com/blog/post/2026-02-12-use-spot-instances-with-ecs-fargate/view) for even deeper discounts.
