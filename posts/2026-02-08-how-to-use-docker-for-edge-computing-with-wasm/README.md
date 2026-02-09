# How to Use Docker for Edge Computing with Wasm

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, WebAssembly, Wasm, Edge Computing, IoT, Containers, Cloud Native

Description: A practical guide to deploying Docker containers with WebAssembly runtimes at the edge for low-latency applications.

---

Edge computing pushes processing closer to where data originates, cutting latency and reducing bandwidth costs. Traditional Docker containers work at the edge, but they carry overhead that matters on constrained devices. WebAssembly (Wasm) changes this equation. Wasm binaries are small, start instantly, and run in a secure sandbox. Docker now supports Wasm workloads natively, making it possible to deploy edge applications the same way you deploy cloud services.

This post covers how to combine Docker and Wasm for edge computing scenarios, with real configurations and deployment patterns you can use today.

## Why Wasm at the Edge?

Edge devices range from powerful servers in cell towers to tiny ARM boards in factory floors. Containers work well on the larger end, but struggle on constrained hardware. Wasm addresses this with:

- Binary sizes measured in kilobytes, not megabytes
- Cold start times under 10 milliseconds
- No OS dependency beyond the runtime
- Strong security through capability-based sandboxing
- True portability across architectures (x86, ARM, RISC-V)

When Docker wraps Wasm, you get the familiar image distribution, orchestration, and networking stack without the traditional container overhead.

## Setting Up Docker for Edge Wasm Workloads

First, ensure your edge device runs a Docker version with Wasm support. Docker Desktop 4.15+ and Docker Engine with containerd 1.7+ both qualify.

```bash
# Check Docker version and containerd status on the edge device
docker version
docker info | grep -i containerd
```

Enable the containerd image store and Wasm shims:

```json
// /etc/docker/daemon.json - Enable Wasm runtime on edge device
{
  "features": {
    "containerd-snapshotter": true
  },
  "default-runtime": "runc",
  "runtimes": {
    "io.containerd.wasmedge.v1": {
      "path": "/usr/bin/containerd-shim-wasmedge-v1"
    },
    "io.containerd.wasmtime.v1": {
      "path": "/usr/bin/containerd-shim-wasmtime-v1"
    }
  }
}
```

Restart Docker after the configuration change:

```bash
# Apply the new runtime configuration
sudo systemctl restart docker
```

## Building a Wasm Application for Edge Deployment

Let's build a sensor data processor. This is a common edge use case where a device reads sensor values, performs local filtering, and forwards meaningful events upstream.

```rust
// src/main.rs - Edge sensor data processor in Rust, compiled to Wasm
use std::io::{self, BufRead};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct SensorReading {
    device_id: String,
    temperature: f64,
    humidity: f64,
    timestamp: u64,
}

#[derive(Serialize)]
struct Alert {
    device_id: String,
    alert_type: String,
    value: f64,
    timestamp: u64,
}

fn main() {
    let stdin = io::stdin();
    for line in stdin.lock().lines() {
        let line = line.expect("Failed to read line");
        if let Ok(reading) = serde_json::from_str::<SensorReading>(&line) {
            // Filter: only forward readings that exceed thresholds
            if reading.temperature > 85.0 {
                let alert = Alert {
                    device_id: reading.device_id,
                    alert_type: "high_temperature".to_string(),
                    value: reading.temperature,
                    timestamp: reading.timestamp,
                };
                println!("{}", serde_json::to_string(&alert).unwrap());
            }
            if reading.humidity > 95.0 {
                let alert = Alert {
                    device_id: reading.device_id,
                    alert_type: "high_humidity".to_string(),
                    value: reading.humidity,
                    timestamp: reading.timestamp,
                };
                println!("{}", serde_json::to_string(&alert).unwrap());
            }
        }
    }
}
```

Compile this to WebAssembly:

```bash
# Add the wasm32-wasi target and build the edge processor
rustup target add wasm32-wasi
cargo build --target wasm32-wasi --release
```

## Creating a Minimal Docker Image

For edge deployment, every byte counts. The Wasm binary itself is the entire application:

```dockerfile
# Dockerfile - Ultra-minimal edge Wasm container
FROM scratch
COPY target/wasm32-wasi/release/sensor-processor.wasm /sensor-processor.wasm
ENTRYPOINT ["/sensor-processor.wasm"]
```

Build targeting the Wasm platform:

```bash
# Build a Wasm Docker image for edge deployment
docker buildx build \
  --platform wasi/wasm \
  -t edge-sensor-processor:latest \
  --load .
```

Check the image size compared to a traditional container:

```bash
# Compare image sizes to see the Wasm advantage
docker images | grep -E "sensor-processor|python|node"
# REPOSITORY              TAG      SIZE
# edge-sensor-processor   latest   2.1MB
# python                  3.11     1.01GB
# node                    20       1.1GB
```

## Deploying to Edge Devices

Edge deployments often use a pull-based model with a local registry. Set up a lightweight registry on your edge gateway:

```bash
# Run a local registry on the edge gateway for nearby devices
docker run -d \
  --name edge-registry \
  --restart always \
  -p 5000:5000 \
  -v /data/registry:/var/lib/registry \
  registry:2
```

Push your Wasm image to the local registry:

```bash
# Tag and push to the edge-local registry
docker tag edge-sensor-processor:latest localhost:5000/sensor-processor:latest
docker push localhost:5000/sensor-processor:latest
```

On each edge device, pull and run the image:

```bash
# Pull from the edge-local registry and run with the Wasm runtime
docker pull localhost:5000/sensor-processor:latest

docker run -d \
  --name sensor-processor \
  --runtime=io.containerd.wasmtime.v1 \
  --platform wasi/wasm \
  --restart always \
  localhost:5000/sensor-processor:latest
```

## Edge Architecture with Docker Compose

A typical edge node runs several services. Here is a Compose file for an edge gateway:

```yaml
# docker-compose.yml - Edge gateway with Wasm and traditional containers
services:
  # Wasm-based sensor data processor (lightweight, fast startup)
  sensor-processor:
    image: edge-sensor-processor:latest
    runtime: io.containerd.wasmtime.v1
    platform: wasi/wasm
    restart: always

  # MQTT broker for sensor communication
  mqtt-broker:
    image: eclipse-mosquitto:2
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - ./mosquitto.conf:/mosquitto/config/mosquitto.conf
      - mqtt-data:/mosquitto/data
    restart: always

  # Local time-series database for buffering
  timescaledb:
    image: timescale/timescaledb:latest-pg15
    environment:
      POSTGRES_PASSWORD: edgepass
      POSTGRES_DB: sensordata
    volumes:
      - ts-data:/var/lib/postgresql/data
    restart: always

  # Lightweight reverse proxy
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
    restart: always

volumes:
  mqtt-data:
  ts-data:
```

## Network Considerations at the Edge

Edge networks are often unreliable. Configure Docker networking to handle disconnections gracefully:

```bash
# Create an isolated bridge network for edge services
docker network create \
  --driver bridge \
  --subnet 172.20.0.0/24 \
  --opt com.docker.network.bridge.name=edge-br0 \
  edge-network
```

For multi-site edge deployments, consider overlay networks with Docker Swarm:

```bash
# Initialize Swarm on the edge gateway
docker swarm init --advertise-addr 192.168.1.100

# On each edge node, join the swarm
docker swarm join --token <worker-token> 192.168.1.100:2377
```

## Resource Constraints on Edge Devices

Edge devices have limited resources. Set strict limits on your containers:

```bash
# Run with tight resource limits appropriate for edge hardware
docker run -d \
  --name sensor-processor \
  --runtime=io.containerd.wasmtime.v1 \
  --platform wasi/wasm \
  --memory=32m \
  --cpus=0.5 \
  --restart always \
  edge-sensor-processor:latest
```

Wasm containers naturally use less memory than traditional containers, but setting explicit limits prevents runaway processes from destabilizing the edge node.

## Offline Operation and Store-and-Forward

Edge devices frequently lose connectivity. Build your applications to buffer data locally:

```bash
# Create a persistent volume for local data buffering
docker volume create edge-buffer

# Mount the buffer volume in your processor container
docker run -d \
  --name sensor-processor \
  --runtime=io.containerd.wasmtime.v1 \
  --platform wasi/wasm \
  -v edge-buffer:/data \
  --restart always \
  edge-sensor-processor:latest
```

## Monitoring Edge Wasm Containers

Even lightweight Wasm containers need monitoring. Use Docker's built-in stats for basic metrics:

```bash
# Monitor resource usage across all edge containers
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
```

For production edge deployments, forward metrics to a central platform using a lightweight agent:

```yaml
# docker-compose.monitoring.yml - Edge monitoring sidecar
services:
  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
    restart: always
```

## Updating Edge Deployments

Rolling updates at the edge require careful handling. Use Docker's update mechanisms:

```bash
# Pull the updated image
docker pull localhost:5000/sensor-processor:v2

# Stop, remove, and recreate with the new version
docker stop sensor-processor
docker rm sensor-processor
docker run -d \
  --name sensor-processor \
  --runtime=io.containerd.wasmtime.v1 \
  --platform wasi/wasm \
  --restart always \
  localhost:5000/sensor-processor:v2
```

Because Wasm containers start in milliseconds, the downtime window during updates is negligible. This is a significant advantage over traditional containers at the edge, where a 5-second restart can mean lost sensor data.

## Conclusion

Docker and Wasm together make edge computing more practical. You get the distribution and management benefits of Docker with the lightweight execution model of WebAssembly. The tooling is still maturing, but the core workflow already works well for production edge deployments. Start with a simple data processing use case, deploy it to a test edge device, and expand from there as you get comfortable with the Wasm runtime behavior.
