# How to Debug mTLS Communication with tcpdump

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, tcpdump, Debugging, Kubernetes

Description: Use tcpdump and other network tools to debug mTLS communication issues between services in an Istio service mesh at the packet level.

---

When mTLS is not working correctly in Istio, the error messages can be vague. You might see "connection reset," "upstream connect error," or just timeouts. These errors tell you something is wrong but not exactly what. To really understand what is happening at the network level, you need to look at the actual packets on the wire.

tcpdump is the go-to tool for this. It lets you capture and inspect network traffic at the packet level, which means you can see whether TLS handshakes are happening, whether they are succeeding, and what certificates are being exchanged.

## Getting tcpdump into Your Pods

Most application containers do not include tcpdump. You have a few options:

### Option 1: Use the istio-proxy Container

The Istio sidecar container often has some debugging tools. You can run tcpdump from a debug container:

```bash
kubectl debug -it deploy/my-app --image=nicolaka/netshoot --target=istio-proxy -- tcpdump -i any -n port 8080 -w /tmp/capture.pcap
```

### Option 2: Use an Ephemeral Debug Container

Kubernetes ephemeral containers let you attach a debug container to a running pod:

```bash
kubectl debug -it my-pod --image=nicolaka/netshoot -- bash
```

Once inside the debug container, run tcpdump:

```bash
tcpdump -i any -n port 8080 -c 50
```

### Option 3: Use nsenter from the Node

If you have node access, you can enter the pod's network namespace:

```bash
# Find the pod's container ID
CONTAINER_ID=$(kubectl get pod my-pod -o jsonpath='{.status.containerStatuses[0].containerID}' | cut -d/ -f3)

# Find the PID
PID=$(docker inspect --format '{{.State.Pid}}' $CONTAINER_ID)

# Enter the network namespace and run tcpdump
nsenter -t $PID -n tcpdump -i any -n port 8080 -c 50
```

## What to Look For

### Verify mTLS is Active

When mTLS is working, you should see TLS handshake packets between services. Run tcpdump and filter for TLS:

```bash
tcpdump -i any -n 'tcp port 8080' -c 20
```

With mTLS active, you will see the TCP three-way handshake followed by TLS handshake packets. The initial bytes after the TCP connection show the TLS ClientHello:

```
IP 10.244.1.5.45678 > 10.244.2.3.8080: Flags [S], seq 123456
IP 10.244.2.3.8080 > 10.244.1.5.45678: Flags [S.], seq 789012, ack 123457
IP 10.244.1.5.45678 > 10.244.2.3.8080: Flags [.], ack 789013
IP 10.244.1.5.45678 > 10.244.2.3.8080: Flags [P.], seq 1:518  # TLS ClientHello
```

If the traffic is plaintext (mTLS not active), you will see readable HTTP content in the capture:

```bash
tcpdump -i any -n -A 'tcp port 8080' -c 10
```

With plaintext, you will see HTTP headers like `GET /api/v1/...` in the output. With TLS, the payload is encrypted and shows as binary gibberish.

### Capture and Analyze a TLS Handshake

For deeper analysis, capture to a file and analyze with tshark or Wireshark:

```bash
tcpdump -i any -n 'tcp port 8080' -w /tmp/mtls-debug.pcap -c 100
```

Copy the capture file to your local machine:

```bash
kubectl cp my-pod:/tmp/mtls-debug.pcap ./mtls-debug.pcap -c debug
```

Analyze with tshark:

```bash
tshark -r mtls-debug.pcap -Y "tls.handshake" -V
```

This shows the full TLS handshake details, including:
- Client Hello: cipher suites offered, TLS version, SNI
- Server Hello: selected cipher suite, TLS version
- Certificate: the server certificate
- Client Certificate: the client certificate (this is the "mutual" part of mTLS)

### Diagnose Handshake Failures

If the TLS handshake fails, you will see a TCP RST (reset) or a TLS alert after the handshake begins:

```bash
tcpdump -i any -n 'tcp port 8080 and (tcp[tcpflags] & (tcp-rst) != 0)' -c 5
```

This filters for RST packets, which indicate connection resets. A reset right after the TLS ClientHello usually means:
- The server does not have a valid certificate
- The client certificate is not trusted by the server
- There is a TLS version mismatch

## Debugging Specific mTLS Scenarios

### Scenario: Service A Cannot Reach Service B After Strict mTLS

First, check if the connection even reaches Service B. Capture on Service B's pod:

```bash
kubectl debug -it service-b-pod --image=nicolaka/netshoot -- tcpdump -i any -n 'tcp port 8080' -c 20
```

If you see SYN packets arriving but no established connection, the TLS handshake is failing.

Then check from Service A's side:

```bash
kubectl debug -it service-a-pod --image=nicolaka/netshoot -- tcpdump -i any -n 'dst port 8080' -c 20
```

Look at the sequence: SYN, SYN-ACK, ACK (TCP handshake succeeds), then TLS handshake data, then what? If you see a RST after the ClientHello, the server rejected the TLS connection.

### Scenario: Plaintext Traffic Getting Through When It Should Not

Capture traffic and look for HTTP in plaintext:

```bash
tcpdump -i any -n -A 'tcp port 8080' -c 20 2>/dev/null | grep -i "HTTP\|GET\|POST\|Host:"
```

If you see readable HTTP headers, traffic is flowing in plaintext. This means either the calling sidecar is not using mTLS for this destination or the request is bypassing the sidecar entirely.

### Scenario: Double TLS

If a service does its own TLS and the sidecar also adds mTLS, you get double encryption. Capture between the sidecar and the application container (localhost traffic):

```bash
tcpdump -i lo -n 'tcp port 8080' -A -c 20
```

If the localhost traffic between the sidecar and the application is encrypted (you see binary data instead of plaintext HTTP), the application is doing its own TLS. The sidecar then wraps this in another layer of mTLS for the network hop. This is wasteful and can cause issues.

## Using istioctl for Non-Packet Analysis

Before reaching for tcpdump, check what istioctl can tell you:

```bash
# Check mTLS status between two pods
istioctl x describe pod service-a-pod

# Check if the proxy config is correct
istioctl proxy-config clusters deploy/service-a --fqdn service-b.default.svc.cluster.local

# Check what TLS settings the proxy is using
istioctl proxy-config endpoints deploy/service-a --cluster "outbound|8080||service-b.default.svc.cluster.local"
```

These commands show you the Envoy configuration without needing to capture packets. Often this is enough to identify the problem.

## Using openssl to Test TLS

You can test the TLS connection directly using openssl from inside a pod:

```bash
kubectl exec -it deploy/sleep -- openssl s_client -connect service-b.default:8080 -CAfile /etc/certs/root-cert.pem
```

This shows the full TLS handshake including the certificate chain, cipher suite, and any errors.

## Performance Considerations

Running tcpdump on a production pod adds CPU overhead and can affect latency. Keep these things in mind:

- Use `-c` to limit the number of packets captured
- Use specific port filters to avoid capturing unrelated traffic
- Capture to a file (`-w`) and analyze offline rather than printing to stdout
- Remove the debug container when done

```bash
# Limit capture to 30 seconds
timeout 30 tcpdump -i any -n 'tcp port 8080' -w /tmp/capture.pcap
```

## Quick Reference

| Symptom | tcpdump Check | Likely Cause |
|---------|---------------|--------------|
| Connection refused | No SYN-ACK | Service not listening, network policy blocking |
| Connection reset | RST after SYN-ACK | TLS handshake failed |
| Timeout | SYN sent, no response | Pod not reachable, firewall |
| Plaintext visible | HTTP headers in capture | mTLS not active |
| Binary payload | Encrypted data after handshake | mTLS working correctly |

tcpdump is a powerful debugging tool for mTLS issues. When higher-level tools like istioctl do not give you enough information, dropping down to the packet level reveals exactly what is happening on the wire.
