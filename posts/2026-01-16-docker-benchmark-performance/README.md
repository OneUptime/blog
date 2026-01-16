# How to Benchmark Docker Container Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Performance, Benchmarking, Testing, Monitoring

Description: Learn how to benchmark Docker container performance including CPU, memory, storage, and network throughput using various tools and methodologies.

---

Benchmarking Docker containers helps identify performance bottlenecks, compare configurations, and ensure applications meet performance requirements. This guide covers comprehensive benchmarking methodologies for containerized workloads.

## Benchmarking Overview

```
Container Performance Metrics
┌─────────────────────────────────────────────────────────────┐
│  CPU Performance                                             │
│  - Processing speed, context switches                       │
├─────────────────────────────────────────────────────────────┤
│  Memory Performance                                          │
│  - Allocation speed, access latency                         │
├─────────────────────────────────────────────────────────────┤
│  Storage Performance                                         │
│  - IOPS, throughput, latency                                │
├─────────────────────────────────────────────────────────────┤
│  Network Performance                                         │
│  - Bandwidth, latency, packets/sec                          │
├─────────────────────────────────────────────────────────────┤
│  Container Overhead                                          │
│  - Startup time, resource consumption                       │
└─────────────────────────────────────────────────────────────┘
```

## CPU Benchmarking

### Using sysbench

```bash
# Run CPU benchmark
docker run --rm severalnines/sysbench sysbench cpu --threads=4 run

# Compare with/without CPU limits
docker run --rm severalnines/sysbench sysbench cpu --threads=4 run
docker run --rm --cpus=2 severalnines/sysbench sysbench cpu --threads=4 run
```

### Using stress-ng

```bash
# CPU stress test
docker run --rm polinux/stress-ng stress-ng --cpu 4 --timeout 60s --metrics

# Measure specific operations
docker run --rm polinux/stress-ng stress-ng --cpu 4 --cpu-method matrixprod --metrics-brief --timeout 30s
```

### CPU Benchmark Script

```bash
#!/bin/bash
# cpu-benchmark.sh

echo "=== CPU Benchmark ==="

# No limits
echo "Without limits:"
docker run --rm severalnines/sysbench sysbench cpu --threads=$(nproc) --time=30 run 2>&1 | grep "events per second"

# With limits
for cpus in 1 2 4; do
    echo "With --cpus=$cpus:"
    docker run --rm --cpus=$cpus severalnines/sysbench sysbench cpu --threads=$(nproc) --time=30 run 2>&1 | grep "events per second"
done
```

## Memory Benchmarking

### Using sysbench Memory

```bash
# Memory read/write benchmark
docker run --rm severalnines/sysbench sysbench memory --threads=4 run

# Test with memory limits
docker run --rm --memory=1g severalnines/sysbench sysbench memory --threads=4 run
```

### Using stress-ng

```bash
# Memory stress test
docker run --rm polinux/stress-ng stress-ng --vm 2 --vm-bytes 512M --timeout 60s --metrics

# Test memory allocation speed
docker run --rm polinux/stress-ng stress-ng --malloc 4 --timeout 30s --metrics-brief
```

### Memory Benchmark Script

```bash
#!/bin/bash
# memory-benchmark.sh

echo "=== Memory Benchmark ==="

# Sequential access
echo "Sequential memory access:"
docker run --rm severalnines/sysbench sysbench memory \
    --memory-block-size=1K \
    --memory-total-size=10G \
    --memory-access-mode=seq \
    run 2>&1 | grep -E "transferred|total time"

# Random access
echo "Random memory access:"
docker run --rm severalnines/sysbench sysbench memory \
    --memory-block-size=1K \
    --memory-total-size=10G \
    --memory-access-mode=rnd \
    run 2>&1 | grep -E "transferred|total time"
```

## Storage Benchmarking

### Using fio

```bash
# Random read benchmark
docker run --rm -v testdata:/data ljishen/fio \
    --name=randread \
    --ioengine=libaio \
    --rw=randread \
    --bs=4k \
    --numjobs=4 \
    --size=1G \
    --runtime=60 \
    --directory=/data

# Random write benchmark
docker run --rm -v testdata:/data ljishen/fio \
    --name=randwrite \
    --ioengine=libaio \
    --rw=randwrite \
    --bs=4k \
    --numjobs=4 \
    --size=1G \
    --runtime=60 \
    --directory=/data
```

### Compare Storage Drivers

```bash
#!/bin/bash
# storage-benchmark.sh

echo "=== Storage Benchmark ==="

# Test different storage configurations
for storage in "volume" "bind" "tmpfs"; do
    echo "Testing: $storage"

    case $storage in
        volume)
            docker run --rm -v benchdata:/data alpine \
                dd if=/dev/zero of=/data/test bs=1M count=1000 conv=fsync
            ;;
        bind)
            docker run --rm -v $(pwd)/testdata:/data alpine \
                dd if=/dev/zero of=/data/test bs=1M count=1000 conv=fsync
            ;;
        tmpfs)
            docker run --rm --tmpfs /data:size=2G alpine \
                dd if=/dev/zero of=/data/test bs=1M count=1000
            ;;
    esac
done

docker volume rm benchdata 2>/dev/null
rm -rf testdata
```

### Comprehensive fio Test

```yaml
# fio-config.fio
[global]
ioengine=libaio
direct=1
time_based
runtime=60
size=1G
directory=/data

[seq-read]
rw=read
bs=1M
numjobs=1

[seq-write]
rw=write
bs=1M
numjobs=1

[rand-read]
rw=randread
bs=4k
numjobs=4

[rand-write]
rw=randwrite
bs=4k
numjobs=4
```

```bash
docker run --rm -v testdata:/data -v $(pwd)/fio-config.fio:/fio-config.fio \
    ljishen/fio /fio-config.fio
```

## Network Benchmarking

### Using iperf3

```bash
# Start server
docker run -d --name iperf-server --network bench-net networkstatic/iperf3 -s

# Run client benchmark
docker run --rm --network bench-net networkstatic/iperf3 -c iperf-server

# Test UDP
docker run --rm --network bench-net networkstatic/iperf3 -c iperf-server -u -b 1G

# Clean up
docker rm -f iperf-server
```

### Compare Network Modes

```bash
#!/bin/bash
# network-benchmark.sh

echo "=== Network Benchmark ==="

# Create test network
docker network create bench-net

# Start server
docker run -d --name iperf-server --network bench-net networkstatic/iperf3 -s
sleep 2

# Bridge network
echo "Bridge network:"
docker run --rm --network bench-net networkstatic/iperf3 -c iperf-server -t 10 | grep -E "sender|receiver"

# Host network
docker rm -f iperf-server
docker run -d --name iperf-server --network host networkstatic/iperf3 -s
sleep 2

echo "Host network:"
docker run --rm --network host networkstatic/iperf3 -c localhost -t 10 | grep -E "sender|receiver"

# Clean up
docker rm -f iperf-server
docker network rm bench-net
```

### Network Latency Test

```bash
# Using qperf for latency
docker run -d --name qperf-server --network bench-net arjanschaaf/qperf

docker run --rm --network bench-net arjanschaaf/qperf \
    qperf-server tcp_bw tcp_lat
```

## Container Startup Benchmark

### Measure Startup Time

```bash
#!/bin/bash
# startup-benchmark.sh

echo "=== Container Startup Benchmark ==="

images=("alpine" "ubuntu" "node:20-alpine" "python:3.11-alpine")

for image in "${images[@]}"; do
    echo "Image: $image"

    # Pull first
    docker pull -q $image

    # Measure startup time
    total=0
    for i in {1..10}; do
        start=$(date +%s%N)
        docker run --rm $image echo "hello" > /dev/null
        end=$(date +%s%N)
        duration=$((($end - $start) / 1000000))
        total=$(($total + $duration))
    done

    avg=$(($total / 10))
    echo "Average startup time: ${avg}ms"
    echo ""
done
```

### Cold vs Warm Start

```bash
#!/bin/bash
# cold-warm-benchmark.sh

IMAGE="node:20-alpine"

# Cold start (clear caches)
echo 3 | sudo tee /proc/sys/vm/drop_caches > /dev/null
docker rmi $IMAGE 2>/dev/null

echo "Cold start (pulling image):"
time docker run --rm $IMAGE echo "hello"

# Warm start
echo "Warm start (image cached):"
time docker run --rm $IMAGE echo "hello"
```

## Application Benchmarking

### Web Server Benchmark

```bash
# Start nginx
docker run -d --name nginx-bench -p 8080:80 nginx

# Benchmark with wrk
docker run --rm --network host williamyeh/wrk \
    -t4 -c100 -d30s http://localhost:8080/

# Or with ab (Apache Bench)
docker run --rm --network host jordi/ab \
    -n 10000 -c 100 http://localhost:8080/

docker rm -f nginx-bench
```

### Database Benchmark

```yaml
# docker-compose.bench.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: bench
      POSTGRES_DB: bench
    volumes:
      - pgdata:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          memory: 2G

  pgbench:
    image: postgres:15
    depends_on:
      - postgres
    environment:
      PGPASSWORD: bench
    command: >
      sh -c "
        sleep 5 &&
        pgbench -h postgres -U postgres -i -s 50 bench &&
        pgbench -h postgres -U postgres -c 10 -j 2 -T 60 bench
      "

volumes:
  pgdata:
```

```bash
docker-compose -f docker-compose.bench.yml up
```

### Redis Benchmark

```bash
# Start Redis
docker run -d --name redis-bench redis

# Run benchmark
docker exec redis-bench redis-benchmark -q -n 100000

docker rm -f redis-bench
```

## Comprehensive Benchmark Suite

```yaml
# docker-compose.benchmark.yml
version: '3.8'

services:
  cpu-bench:
    image: severalnines/sysbench
    command: sysbench cpu --threads=4 --time=60 run

  memory-bench:
    image: severalnines/sysbench
    command: sysbench memory --threads=4 --time=60 run

  io-bench:
    image: ljishen/fio
    volumes:
      - testdata:/data
    command: >
      fio --name=test --ioengine=libaio --rw=randrw --bs=4k
      --numjobs=4 --size=1G --runtime=60 --directory=/data

  network-server:
    image: networkstatic/iperf3
    command: -s

  network-client:
    image: networkstatic/iperf3
    depends_on:
      - network-server
    command: -c network-server -t 60

volumes:
  testdata:
```

## Monitoring During Benchmarks

### docker stats

```bash
# Monitor in real-time
docker stats --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
```

### cAdvisor

```yaml
services:
  cadvisor:
    image: gcr.io/cadvisor/cadvisor:latest
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro
      - /sys:/sys:ro
      - /var/lib/docker/:/var/lib/docker:ro
```

## Results Comparison Script

```bash
#!/bin/bash
# full-benchmark.sh

OUTPUT_DIR="./benchmark-results"
mkdir -p $OUTPUT_DIR

echo "Starting Docker Benchmark Suite..."
echo "Results will be saved to $OUTPUT_DIR"

# CPU
echo "Running CPU benchmark..."
docker run --rm severalnines/sysbench sysbench cpu --threads=4 --time=30 run > $OUTPUT_DIR/cpu.txt

# Memory
echo "Running Memory benchmark..."
docker run --rm severalnines/sysbench sysbench memory --threads=4 --time=30 run > $OUTPUT_DIR/memory.txt

# Storage
echo "Running Storage benchmark..."
docker run --rm -v benchdata:/data ljishen/fio \
    --name=test --ioengine=libaio --rw=randrw --bs=4k \
    --numjobs=4 --size=1G --runtime=30 --directory=/data > $OUTPUT_DIR/storage.txt

# Network
echo "Running Network benchmark..."
docker network create bench-net 2>/dev/null
docker run -d --name iperf-server --network bench-net networkstatic/iperf3 -s
sleep 2
docker run --rm --network bench-net networkstatic/iperf3 -c iperf-server -t 30 > $OUTPUT_DIR/network.txt
docker rm -f iperf-server
docker network rm bench-net

# Cleanup
docker volume rm benchdata 2>/dev/null

echo "Benchmarks complete. Results:"
echo "=== CPU ===" && grep "events per second" $OUTPUT_DIR/cpu.txt
echo "=== Memory ===" && grep "transferred" $OUTPUT_DIR/memory.txt
echo "=== Storage ===" && grep -E "read:|write:" $OUTPUT_DIR/storage.txt | head -4
echo "=== Network ===" && grep -E "sender|receiver" $OUTPUT_DIR/network.txt
```

## Summary

| Metric | Tool | Key Measurement |
|--------|------|-----------------|
| CPU | sysbench, stress-ng | Events/second |
| Memory | sysbench, stress-ng | MB/s transferred |
| Storage | fio | IOPS, bandwidth |
| Network | iperf3 | Gbits/sec, latency |
| Startup | time | Milliseconds |
| Web | wrk, ab | Requests/second |

Regular benchmarking helps identify performance regressions and optimize configurations. Run benchmarks before and after changes to measure impact. For tuning based on benchmark results, see our post on [Docker Daemon Tuning](https://oneuptime.com/blog/post/2026-01-16-docker-daemon-tuning/view).

