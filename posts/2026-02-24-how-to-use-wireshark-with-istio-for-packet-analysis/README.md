# How to Use Wireshark with Istio for Packet Analysis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Wireshark, Packet Analysis, Network Debugging, TLS

Description: How to capture and analyze network packets from Istio service mesh traffic using Wireshark for deep protocol-level debugging.

---

When you need to go beyond access logs and metrics, Wireshark gives you the deepest possible view into what is happening on the network. It lets you inspect individual packets, decode protocols, follow TCP streams, and visualize timing issues. For Istio specifically, Wireshark is invaluable for debugging TLS handshake failures, protocol mismatches, and subtle network problems.

## Capturing Packets from Istio Pods

Wireshark runs on your local machine, but the traffic is inside Kubernetes pods. You need to capture packets in the pod and transfer them to your local machine for analysis.

### Method 1: Capture and Download

Start a capture inside the pod, save to a file, then download it:

```bash
# Start an ephemeral debug container with tcpdump
kubectl debug -it my-service-pod -n my-namespace \
  --image=nicolaka/netshoot \
  --target=istio-proxy \
  -- tcpdump -i any -n -w /tmp/capture.pcap -c 5000 port 8080

# After the capture completes, copy the file
kubectl cp my-namespace/my-service-pod:/tmp/capture.pcap ./capture.pcap
```

Open the file in Wireshark:

```bash
wireshark capture.pcap
```

### Method 2: Live Remote Capture with kubectl and Wireshark

For real-time analysis, pipe the capture directly to Wireshark:

```bash
kubectl debug -it my-service-pod -n my-namespace \
  --image=nicolaka/netshoot \
  --target=istio-proxy \
  -- tcpdump -i any -n -w - port 8080 | wireshark -k -i -
```

The `-w -` flag sends pcap data to stdout, and Wireshark reads it from stdin with `-i -`. The `-k` flag starts the capture immediately.

### Method 3: Using ksniff

ksniff is a kubectl plugin that simplifies packet capture:

```bash
# Install ksniff
kubectl krew install sniff

# Capture from a specific pod
kubectl sniff my-service-pod -n my-namespace -c istio-proxy -f "port 8080" -o capture.pcap
```

ksniff automatically handles the tcpdump setup and file transfer.

## Analyzing Istio Traffic in Wireshark

### Understanding the Traffic Flow

In an Istio pod, you will see several types of traffic:

1. **Localhost traffic (lo interface)** - Application to/from sidecar proxy
2. **Network traffic (eth0 interface)** - Encrypted mTLS traffic between pods
3. **Control plane traffic** - Proxy to Istiod communication (port 15012)
4. **Metrics and health traffic** - Ports 15090, 15021

Use Wireshark display filters to focus on what matters:

```text
# Only show HTTP traffic
http

# Only show TLS handshakes
tls.handshake

# Only show traffic to/from a specific IP
ip.addr == 10.0.0.5

# Only show traffic on specific port
tcp.port == 8080

# Show TCP resets
tcp.flags.reset == 1

# Show retransmissions
tcp.analysis.retransmission
```

### Inspecting HTTP Traffic (Unencrypted Side)

Traffic between the application container and the sidecar proxy is unencrypted (it goes over localhost). Capture on the loopback interface to see plaintext HTTP:

```bash
# Capture localhost traffic
kubectl debug -it my-service-pod -n my-namespace \
  --image=nicolaka/netshoot \
  --target=istio-proxy \
  -- tcpdump -i lo -n -w /tmp/local-capture.pcap port 8080
```

In Wireshark, you can:

1. Right-click a packet and select "Follow > TCP Stream" to see the full HTTP conversation
2. Use "Statistics > HTTP > Requests" to see all HTTP requests
3. Check "Expert Info" (Analyze > Expert Information) for protocol-level warnings

### Analyzing mTLS Handshakes

Traffic between pods is encrypted with mTLS. Capture on the eth0 interface:

```bash
kubectl debug -it my-service-pod -n my-namespace \
  --image=nicolaka/netshoot \
  --target=istio-proxy \
  -- tcpdump -i eth0 -n -w /tmp/mtls-capture.pcap
```

In Wireshark, filter for TLS:

```text
tls.handshake.type == 1  # ClientHello
tls.handshake.type == 2  # ServerHello
tls.handshake.type == 11 # Certificate
tls.handshake.type == 21 # Alert
```

For mTLS, you should see both a client certificate and a server certificate in the handshake. If the handshake fails, look for TLS Alert messages which contain the failure reason.

### Decoding TLS with Keys

If you need to see the encrypted content (for debugging, not in production), you can export the TLS keys. Envoy can be configured to log TLS keys:

Setting the `ENVOY_SSLKEYLOGFILE` environment variable:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/userVolume: '[{"name":"keylog","emptyDir":{}}]'
        sidecar.istio.io/userVolumeMount: '[{"name":"keylog","mountPath":"/var/log/envoy"}]'
    spec:
      containers:
      - name: my-app
        env:
        - name: ENVOY_SSLKEYLOGFILE
          value: /var/log/envoy/keys.log
```

Then in Wireshark: Edit > Preferences > Protocols > TLS > (Pre)-Master-Secret log filename, and point it to the key log file.

**Warning**: Never do this in production. The key log file contains everything needed to decrypt the traffic.

## Common Wireshark Analysis Tasks

### Finding TCP Connection Problems

Use the Wireshark "Expert Info" panel (Analyze > Expert Information) to quickly find:

- TCP retransmissions (network congestion or packet loss)
- TCP RST packets (connection resets)
- TCP window full (sender overwhelmed)
- TCP zero window (receiver overwhelmed)

Filter for problems:

```text
tcp.analysis.flags
```

### Measuring Connection Setup Time

Filter for SYN packets to see how long TCP handshakes take:

```text
tcp.flags.syn == 1 && tcp.flags.ack == 0
```

Compare the timestamp of the SYN with the SYN-ACK to get the connection setup time. For mTLS connections, also measure the time from the first TLS ClientHello to the TLS Finished message.

### Identifying Slow Responses

Use Wireshark's "Statistics > Flow Graph" to visualize the timing of requests and responses. This shows you exactly where delays occur in the packet exchange.

Or use the filter:

```text
http.time > 1
```

This shows HTTP responses that took longer than 1 second.

### Checking for Connection Reuse

Look at TCP stream indices to see if connections are being reused:

```text
# In Wireshark, check the tcp.stream value
# If many requests share the same stream index, connections are being reused
# If each request has a different stream index, new connections are created per request
```

Go to Statistics > Conversations > TCP to see all TCP connections, their duration, and how many bytes were exchanged.

## Wireshark Profiles for Istio

Create a custom Wireshark profile for Istio analysis:

1. Edit > Configuration Profiles > New
2. Name it "Istio"
3. Add custom columns:
   - Source Port
   - Destination Port
   - TLS Content Type
   - HTTP Request Method
   - HTTP Response Code
4. Set display filters for common Istio analysis

Custom coloring rules:

```text
# Red for TCP resets
tcp.flags.reset == 1

# Yellow for retransmissions
tcp.analysis.retransmission

# Green for HTTP 200s
http.response.code == 200

# Orange for HTTP 5xx
http.response.code >= 500
```

## Tips for Large Captures

Istio generates a lot of traffic. To keep captures manageable:

```bash
# Limit capture size
tcpdump -i any -n -c 10000 -w /tmp/capture.pcap

# Capture only headers (first 200 bytes per packet)
tcpdump -i any -n -s 200 -w /tmp/capture.pcap

# Time-limited capture (60 seconds)
timeout 60 tcpdump -i any -n -w /tmp/capture.pcap
```

In Wireshark, use "File > Export Specified Packets" to save only the packets matching your display filter. This lets you share smaller, focused capture files with your team.

Wireshark is the ultimate debugging tool for network issues in Istio. It takes more effort than reading access logs, but when you need packet-level insight into TLS handshakes, TCP behavior, or protocol issues, nothing else comes close.
