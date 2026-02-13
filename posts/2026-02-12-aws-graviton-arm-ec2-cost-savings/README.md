# How to Use AWS Graviton (ARM) EC2 Instances for Cost Savings

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Graviton, ARM, Cost Optimization

Description: A practical guide to migrating workloads to AWS Graviton ARM-based instances for up to 40% better price-performance compared to x86 equivalents.

---

AWS Graviton processors are ARM-based chips designed by AWS that deliver significantly better price-performance than their x86 counterparts. We're talking 20-40% cost savings with equal or better performance for most workloads. If you're running x86 instances and haven't evaluated Graviton, you're likely overpaying.

The Graviton3 processor (used in C7g, M7g, R7g instances) offers up to 25% better compute performance than Graviton2, along with improvements in memory bandwidth, cryptography, and floating-point operations. Let's walk through adopting Graviton for your workloads.

## Graviton Instance Families

AWS offers Graviton versions across all major instance families. The naming convention is simple - an "g" in the instance type name means Graviton.

| x86 Instance | Graviton Equivalent | Savings |
|-------------|-------------------|---------|
| t3.medium | t4g.medium | ~20% |
| m5.large | m7g.large | ~20% |
| c5.xlarge | c7g.xlarge | ~20% |
| r5.2xlarge | r7g.2xlarge | ~20% |
| m5.xlarge | m7g.xlarge | ~20% |

The per-hour pricing is about 20% lower, but the performance improvements often push the effective savings to 30-40% when you account for doing more work per dollar.

Compare pricing directly:

```bash
# Compare x86 vs Graviton pricing
echo "=== x86 (m5.large) ==="
aws pricing get-products \
  --service-code AmazonEC2 \
  --filters \
    "Type=TERM_MATCH,Field=instanceType,Value=m5.large" \
    "Type=TERM_MATCH,Field=operatingSystem,Value=Linux" \
    "Type=TERM_MATCH,Field=location,Value=US East (N. Virginia)" \
    "Type=TERM_MATCH,Field=tenancy,Value=Shared" \
    "Type=TERM_MATCH,Field=preInstalledSw,Value=NA" \
  --region us-east-1 \
  --query 'PriceList[0]' | python3 -c "import sys,json; print(json.loads(json.loads(sys.stdin.read()))['terms'])" 2>/dev/null

echo "=== Graviton (m7g.large) ==="
# Similar query for m7g.large
```

Or simply check the EC2 pricing page - the differences are consistently around 20%.

## Checking Application Compatibility

The biggest question when moving to Graviton is: will my software work on ARM? The answer for most modern software stacks is yes.

Software that works on Graviton out of the box:
- **Languages**: Python, Java, Node.js, Go, Ruby, PHP, .NET 6+
- **Databases**: PostgreSQL, MySQL, MongoDB, Redis, Elasticsearch
- **Containers**: Docker, Kubernetes, ECS
- **Web servers**: Nginx, Apache
- **Runtime platforms**: JVM (Java 11+), Node.js, Python 3.x

Software that might have issues:
- Applications with x86-specific assembly code
- Older versions of some commercial software
- Some proprietary binary-only packages that only ship x86 builds
- Very old compiler toolchains

Check if your Docker images have ARM support:

```bash
# Check if a Docker image has ARM/aarch64 manifests
docker manifest inspect nginx:latest | grep -i arm

# Or check with crane tool
crane manifest nginx:latest | python3 -c "
import sys, json
data = json.load(sys.stdin)
for m in data.get('manifests', []):
    arch = m.get('platform', {}).get('architecture', 'unknown')
    os = m.get('platform', {}).get('os', 'unknown')
    print(f'{os}/{arch}')
"
```

Most popular Docker Hub images now include ARM64 variants.

## Launching Your First Graviton Instance

Let's try it out. The process is identical to launching any EC2 instance - just choose a Graviton instance type and an ARM64 AMI.

Launch a Graviton instance:

```bash
# Find the latest Amazon Linux 2023 ARM64 AMI
AMI_ID=$(aws ec2 describe-images \
  --owners amazon \
  --filters \
    "Name=name,Values=al2023-ami-*-arm64" \
    "Name=state,Values=available" \
  --query 'Images | sort_by(@, &CreationDate) | [-1].ImageId' \
  --output text)

echo "ARM64 AMI: $AMI_ID"

# Launch a Graviton instance
aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t4g.medium \
  --key-name my-key \
  --security-group-ids sg-0abc123 \
  --subnet-id subnet-0abc123 \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=graviton-test}]'
```

SSH in and verify you're on ARM:

```bash
# Check the architecture
uname -m
# Output: aarch64

# Check CPU info
lscpu | grep -E "Architecture|Model name"
# Architecture: aarch64
# Model name: Neoverse-N1 (Graviton2) or similar
```

## Benchmarking Before Migration

Don't just switch and hope for the best. Run your actual workload on both architectures and compare.

Simple performance comparison script:

```bash
#!/bin/bash
# benchmark.sh - Run on both x86 and Graviton instances

echo "=== CPU Benchmark (sysbench) ==="
sudo yum install -y sysbench
sysbench cpu --threads=2 --time=30 run

echo "=== Memory Benchmark ==="
sysbench memory --threads=2 --time=30 run

echo "=== File I/O Benchmark ==="
sysbench fileio --file-total-size=2G prepare
sysbench fileio --file-total-size=2G --file-test-mode=rndrw --time=30 run
sysbench fileio --file-total-size=2G cleanup

echo "=== Application Benchmark ==="
# Run your actual application's benchmark suite here
# npm test, pytest, your custom load test, etc.
```

For web applications, use a load testing tool from a separate machine:

```bash
# Install hey (HTTP load testing tool)
# Run against both x86 and Graviton instances
hey -n 10000 -c 50 http://x86-instance-ip:3000/api/endpoint
hey -n 10000 -c 50 http://graviton-instance-ip:3000/api/endpoint
```

## Migrating Docker Workloads

Docker makes Graviton migration particularly smooth. If your images are multi-arch, you just switch the instance type and everything works.

Building multi-arch Docker images:

```bash
# Enable buildx for multi-platform builds
docker buildx create --name multiarch --use

# Build for both architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t myapp:latest \
  --push .
```

Your Dockerfile doesn't need to change in most cases. The base images (like `node:20-alpine`, `python:3.12-slim`, `golang:1.22`) already provide ARM64 variants.

If you have architecture-specific dependencies, use build arguments:

```dockerfile
FROM --platform=$TARGETPLATFORM node:20-alpine

# This works automatically on both architectures
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "server.js"]
```

## Migrating with Terraform

Switching instance types in Terraform is straightforward.

Update your Terraform configuration:

```hcl
# Before - x86
resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux_x86.id
  instance_type = "m5.large"
  # ...
}

# After - Graviton
data "aws_ami" "amazon_linux_arm" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-arm64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "app" {
  ami           = data.aws_ami.amazon_linux_arm.id
  instance_type = "m7g.large"  # Graviton equivalent
  # ... rest of config stays the same
}
```

For a blue-green migration, run both side by side:

```hcl
resource "aws_instance" "app_graviton" {
  ami           = data.aws_ami.amazon_linux_arm.id
  instance_type = "m7g.large"

  tags = {
    Name        = "app-server-graviton"
    MigrationPhase = "testing"
  }
}
```

For more on Terraform with EC2, see our guide on [creating EC2 instances with Terraform](https://oneuptime.com/blog/post/2026-02-12-create-ec2-instance-terraform/view).

## Java on Graviton

Java workloads see significant improvements on Graviton, especially with Corretto (Amazon's JDK distribution).

Install and configure Java on Graviton:

```bash
# Install Amazon Corretto 17 (optimized for Graviton)
sudo yum install -y java-17-amazon-corretto-headless

# Verify
java -version
# openjdk version "17.x.x" ... aarch64
```

Corretto includes Graviton-specific optimizations for the JIT compiler, garbage collection, and cryptographic operations. Java 17+ is recommended for the best Graviton performance.

JVM tuning tips for Graviton:

```bash
# Graviton has larger cache lines (64 bytes vs 64 bytes, but different prefetch)
# Use Large Pages for better TLB performance
java -XX:+UseLargePages \
  -XX:+UseTransparentHugePages \
  -XX:+UseG1GC \
  -Xms4g -Xmx4g \
  -jar myapp.jar
```

## Python on Graviton

Python works out of the box on Graviton. For compute-heavy workloads using NumPy, SciPy, or similar packages, the ARM-optimized BLAS libraries can provide a performance boost.

```bash
# Install Python with optimized math libraries
sudo yum install -y python3 python3-pip

# Install NumPy (will use ARM-optimized BLAS automatically)
pip3 install numpy scipy pandas
```

## Handling the Transition Period

For a safe migration, keep both x86 and Graviton instances running behind a load balancer during the transition.

```bash
# Create a mixed-architecture target group
# Both x86 and Graviton instances can serve traffic simultaneously
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/my-app/abc123 \
  --targets Id=i-x86instance Id=i-gravitoninstance
```

Monitor both instances for performance differences, error rates, and latency. Once you're confident the Graviton instances perform well, drain the x86 instances from the load balancer.

## Cost Savings Calculator

Here's a quick way to estimate your savings:

| Current Setup | Graviton Equivalent | Monthly Savings |
|--------------|-------------------|----------------|
| 10x m5.large ($699/mo) | 10x m7g.large ($559/mo) | $140 |
| 5x c5.2xlarge ($1,224/mo) | 5x c7g.2xlarge ($979/mo) | $245 |
| 20x t3.medium ($608/mo) | 20x t4g.medium ($486/mo) | $122 |

For a fleet of 35 instances, that's over $500/month in savings - just from changing instance types. Add Savings Plans or Reserved Instances on top, and the savings compound.

## When Not to Use Graviton

Be cautious with these scenarios:
- Software that only ships x86 binaries (some commercial databases, monitoring agents)
- Workloads with x86-specific SIMD optimizations (rare, but exists in some HPC scenarios)
- Windows workloads (Graviton supports Linux and some macOS, not Windows)
- If your build pipeline can't produce ARM64 artifacts

For monitoring your Graviton fleet's performance against your x86 baseline, set up proper observability from day one. Check our guide on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/2026-02-13-aws-cloudwatch-infrastructure-monitoring/view).

## Wrapping Up

Graviton instances offer a straightforward 20-40% improvement in price-performance. The migration path for most workloads is simply: verify your software runs on ARM, switch to a Graviton instance type with an ARM64 AMI, and benchmark. Docker and modern language runtimes make this transition nearly seamless. The savings are real, they're immediate, and they compound as your fleet grows. There's very little reason not to evaluate Graviton for your next instance launch.
