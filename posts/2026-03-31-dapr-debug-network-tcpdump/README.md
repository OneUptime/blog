# How to Debug Dapr Network Issues with tcpdump

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Networking, tcpdump, Debugging, Troubleshooting

Description: Learn how to use tcpdump and Wireshark to capture and analyze network traffic between Dapr sidecars and applications to diagnose connectivity and protocol issues.

---

## When to Use tcpdump for Dapr Debugging

tcpdump captures raw network packets, making it useful when higher-level debugging tools do not reveal enough detail. Use it for:
- Verifying that Dapr sidecar and app are actually communicating
- Diagnosing TLS handshake failures
- Identifying unexpected connection resets
- Confirming that pub/sub messages are being sent and received
- Checking what ports and protocols are in use

## Capturing Traffic Between App and Sidecar

In Dapr, the app listens on a port (e.g., 3000) and the sidecar listens on an HTTP port (e.g., 3500). Capture traffic on the loopback interface to see both directions:

```bash
# Capture all traffic on localhost ports 3000 and 3500
tcpdump -i lo -nn -s 0 'port 3000 or port 3500' -w dapr-capture.pcap
```

While this captures, send a request through the sidecar:

```bash
curl http://localhost:3500/v1.0/invoke/order-service/method/orders
```

Stop capture with Ctrl+C and analyze:

```bash
tcpdump -r dapr-capture.pcap -nn -A | grep -A 5 'HTTP'
```

## Capturing in Kubernetes with kubectl exec

In Kubernetes, exec into the pod's network namespace and run tcpdump:

```bash
# Install tcpdump in the app container (daprd uses a distroless image with no shell)
kubectl exec -it order-service-7b4c8d9f6-xk2pq -c app -n default -- sh -c \
  "apt-get install -y tcpdump && tcpdump -nn -s 0 -w /tmp/dapr-capture.pcap port 3500 &"

# Generate some traffic
kubectl exec -it order-service-7b4c8d9f6-xk2pq -c app -n default -- \
  wget -qO- http://localhost:3500/v1.0/healthz

# Copy the capture file (all containers share the network namespace)
kubectl cp default/order-service-7b4c8d9f6-xk2pq:/tmp/dapr-capture.pcap ./dapr-capture.pcap -c app
```

Open the file in Wireshark for analysis:

```bash
wireshark dapr-capture.pcap
```

## Using ephemeral debug containers

Kubernetes ephemeral containers let you add a debug container to a running pod without modifying it:

```bash
kubectl debug -it order-service-7b4c8d9f6-xk2pq \
  --image=nicolaka/netshoot \
  --target=daprd \
  -- tcpdump -nn -s 0 port 3500
```

The `nicolaka/netshoot` image includes tcpdump, curl, nslookup, and other network debugging tools.

## Analyzing Common Dapr Network Issues

**Connection refused on port 3000 (sidecar cannot reach app):**

```bash
tcpdump -r dapr-capture.pcap 'dst port 3000' | grep "Flags \[R"
```

The sidecar expects the app on `--app-port`. Verify the app is actually listening:

```bash
kubectl exec -it order-service-pod -- netstat -tlnp | grep 3000
```

**Retransmissions (slow or unstable connections):**

```bash
tshark -r dapr-capture.pcap -Y "tcp.analysis.retransmission"
```

High retransmission rates indicate network congestion or resource limits. Check pod resource requests and limits.

**Unexpected RST packets (connections being reset):**

```bash
tcpdump -r dapr-capture.pcap | grep "Flags \[R\]"
```

RST packets often indicate the receiving end closed the connection unexpectedly, which may point to a crash or out-of-memory condition.

## Filtering Dapr gRPC Traffic

Dapr uses gRPC for internal communication. Capture gRPC traffic (default port 50001):

```bash
tcpdump -i any -nn -s 0 'port 50001' -w dapr-grpc.pcap
```

Use Wireshark's gRPC dissector to decode the protocol buffers:
1. Open the `.pcap` file in Wireshark
2. Right-click a packet, select Decode As
3. Choose gRPC as the protocol

## Summary

tcpdump is the last-resort debugging tool for Dapr network issues when logs and metrics do not reveal the root cause. Capturing traffic between the app and sidecar on the loopback interface shows exactly what bytes are being exchanged, and copying captures to Wireshark reveals protocol-level details like TLS errors, connection resets, and retransmissions. Ephemeral debug containers make this approach viable on Kubernetes without modifying pod specs.
