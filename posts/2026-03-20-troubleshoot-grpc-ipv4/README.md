# How to Troubleshoot gRPC IPv4 Connection Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, IPv4, Troubleshooting, Networking, Python, Go

Description: Learn how to diagnose and fix gRPC IPv4 connection failures using status codes, logging, grpcurl, and network-level diagnostics.

## gRPC Status Codes for Connection Issues

| Status Code | Meaning | Common Cause |
|-------------|---------|--------------|
| `UNAVAILABLE` (14) | Server unreachable | Wrong IP/port, server down, firewall |
| `DEADLINE_EXCEEDED` (4) | Call timed out | Slow server, network latency |
| `UNIMPLEMENTED` (12) | Method not found | Wrong proto, wrong server |
| `INTERNAL` (13) | Internal error | Protocol/parsing error, explicit server error |
| `UNAUTHENTICATED` (16) | Invalid auth credentials | Missing or invalid call credentials |

## Test with grpcurl

```bash
# Install grpcurl

go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest

# List services (server must have reflection enabled)
grpcurl -plaintext 192.168.1.10:50051 list

# Call a specific method (uses reflection unless you pass -proto or -protoset)
grpcurl -plaintext -d '{"name":"world"}' \
    192.168.1.10:50051 helloworld.Greeter/SayHello

# With TLS
grpcurl -cacert ca.crt -cert client.crt -key client.key \
    -d '{"name":"world"}' 192.168.1.10:50051 helloworld.Greeter/SayHello
```

## Enable gRPC Verbose Logging

```bash
# Python/C-core - set environment variables before running
# GRPC_VERBOSITY is deprecated; use only for local debugging
GRPC_VERBOSITY=DEBUG GRPC_TRACE=client_channel,connectivity_state,handshaker python client.py

# Go
export GRPC_GO_LOG_VERBOSITY_LEVEL=99
export GRPC_GO_LOG_SEVERITY_LEVEL=info
```

## Python: Catch and Inspect RPC Errors

```python
import grpc
import hello_pb2
import hello_pb2_grpc

with grpc.insecure_channel("192.168.1.10:50051") as channel:
    stub = hello_pb2_grpc.GreeterStub(channel)
    try:
        resp = stub.SayHello(
            hello_pb2.HelloRequest(name="world"), timeout=5.0
        )
        print(resp.message)
    except grpc.RpcError as e:
        print(f"Code:    {e.code()}")
        print(f"Details: {e.details()}")
        print(f"Trailing metadata: {dict(e.trailing_metadata() or [])}")

        if e.code() == grpc.StatusCode.UNAVAILABLE:
            print("→ Check: is server running? correct IP? firewall? TLS settings?")
        elif e.code() == grpc.StatusCode.DEADLINE_EXCEEDED:
            print("→ Increase timeout or investigate server latency")
        elif e.code() == grpc.StatusCode.UNAUTHENTICATED:
            print("→ Check auth metadata and call credentials")
```

## Network-Level Checks

```bash
# Is the port open?
timeout 3 bash -c 'echo > /dev/tcp/192.168.1.10/50051' && echo "open" || echo "closed"

# Packet capture to see TCP handshake
tcpdump -i eth0 'host 192.168.1.10 and port 50051' -w /tmp/grpc.pcap

# Check for TLS issues
openssl s_client -connect 192.168.1.10:50051 -alpn h2 \
    -CAfile ca.crt -verify_ip 192.168.1.10 -verify_return_error

# Check that the gRPC server is actually bound to the expected address
ss -tlnp | grep 50051
```

## Common Fixes

```bash
# 1. Server bound to 127.0.0.1 instead of 0.0.0.0
#    Fix: change bind address to 0.0.0.0:50051

# 2. Firewall blocking port
iptables -I INPUT -p tcp --dport 50051 -j ACCEPT

# 3. Pod not ready - check readiness probe
kubectl describe pod grpc-server-xxx | grep -A5 "Conditions"

# 4. Wrong proto version - regenerate stubs
python -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. hello.proto
```

## Conclusion

Start with `grpcurl` to verify the server is reachable and responding. Enable targeted gRPC tracing (`GRPC_TRACE=client_channel,connectivity_state,handshaker`) with debug logging to see connection handshakes and status codes. Check network-level connectivity with `tcpdump` and `ss` before assuming it's a gRPC configuration issue. Common `UNAVAILABLE` errors are caused by the server binding to `127.0.0.1` instead of `0.0.0.0`, a firewall rule, or the server crashing on startup.
