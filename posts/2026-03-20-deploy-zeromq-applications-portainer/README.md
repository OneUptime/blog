# How to Deploy ZeroMQ-Based Applications via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ZeroMQ, Messaging, Portainer, Docker, Pub-Sub, Push-Pull, Performance

Description: Deploy ZeroMQ-based messaging applications via Portainer, implementing publisher-subscriber and push-pull patterns for high-performance distributed messaging without a broker.

---

ZeroMQ (0MQ) is a high-performance asynchronous messaging library that operates without a central broker. Applications communicate directly socket-to-socket, making it ideal for low-latency, high-throughput workloads. Portainer manages the containers running ZeroMQ-based services.

## ZeroMQ Patterns

ZeroMQ supports several messaging patterns:

- **PUB/SUB** - publisher broadcasts to multiple subscribers
- **PUSH/PULL** - fan-out task distribution (pipeline)
- **REQ/REP** - request-reply (synchronous)
- **DEALER/ROUTER** - async request-reply

## Deploy a Pub/Sub Application Stack

```yaml
# zeromq-pubsub-stack.yml

version: "3.8"
services:
  # Publisher service - produces data
  publisher:
    image: myapp/zmq-publisher:1.0
    environment:
      - ZMQ_PUB_PORT=5555
      - PUBLISH_INTERVAL_MS=100
      - TOPIC=sensor-data
    ports:
      - "5555:5555"
    restart: unless-stopped
    networks:
      - zmq-net

  # Subscriber service - consumes data
  subscriber-1:
    image: myapp/zmq-subscriber:1.0
    environment:
      - ZMQ_PUB_ADDRESS=tcp://publisher:5555
      - TOPIC_FILTER=sensor-data
      - WORKER_ID=worker-1
    restart: unless-stopped
    networks:
      - zmq-net

  subscriber-2:
    image: myapp/zmq-subscriber:1.0
    environment:
      - ZMQ_PUB_ADDRESS=tcp://publisher:5555
      - TOPIC_FILTER=sensor-data
      - WORKER_ID=worker-2
    restart: unless-stopped
    networks:
      - zmq-net

networks:
  zmq-net:
    driver: bridge
```

## Publisher Code Example

```python
# publisher.py - runs inside the publisher container
import zmq
import time
import json
import os

context = zmq.Context()
socket = context.socket(zmq.PUB)

port = os.environ.get("ZMQ_PUB_PORT", "5555")
topic = os.environ.get("TOPIC", "data")
socket.bind(f"tcp://*:{port}")

print(f"Publisher bound to tcp://*:{port}")

while True:
    # Publish a message with a topic prefix
    message = json.dumps({"timestamp": time.time(), "value": 42.0})
    socket.send_string(f"{topic} {message}")
    time.sleep(float(os.environ.get("PUBLISH_INTERVAL_MS", "100")) / 1000)
```

## Push/Pull Worker Pool

For task distribution in a Docker Swarm environment managed by Portainer, use PUSH/PULL to distribute work across workers:

```yaml
# zeromq-worker-pool-stack.yml
version: "3.8"
services:
  # Task distributor - pushes work to workers
  task-ventilator:
    image: myapp/zmq-ventilator:1.0
    environment:
      - ZMQ_PUSH_PORT=5556
      - ZMQ_RESULT_PORT=5557
    ports:
      - "5556:5556"
      - "5557:5557"
    networks:
      - zmq-workers

  # Worker pool - scale these for throughput
  worker:
    image: myapp/zmq-worker:1.0
    environment:
      - ZMQ_VENTILATOR=tcp://task-ventilator:5556
      - ZMQ_RESULT_SINK=tcp://task-ventilator:5557
    deploy:
      mode: replicated
      replicas: 4    # 4 parallel workers
      restart_policy:
        condition: any
    networks:
      - zmq-workers

networks:
  zmq-workers:
    driver: bridge
```

## Worker Code Example

```python
# worker.py - processes tasks from the ventilator
import zmq
import time
import os

context = zmq.Context()

# Connect to task ventilator
receiver = context.socket(zmq.PULL)
receiver.connect(os.environ["ZMQ_VENTILATOR"])

# Connect to result sink
sender = context.socket(zmq.PUSH)
sender.connect(os.environ["ZMQ_RESULT_SINK"])

print(f"Worker {os.environ.get('HOSTNAME')} started")

while True:
    task = receiver.recv_json()
    # Process the task
    result = task["value"] ** 2   # Example: squaring numbers
    sender.send_json({"result": result, "worker": os.environ.get("HOSTNAME")})
```

## Port Considerations

ZeroMQ applications use configurable TCP ports. If you publish ZeroMQ ports to the host, use different host port ranges to avoid conflicts. Containers on separate Docker networks can reuse the same internal ports:

- Stack A: ports 5555-5560
- Stack B: ports 5565-5570

## Summary

ZeroMQ applications deployed via Portainer use direct socket communication between containers on the same Docker network. Unlike AMQP-based brokers, ZeroMQ requires no central message broker, making it extremely low-latency. In Docker Swarm, scale the worker pool using Portainer's service scaling features to handle varying workloads.
