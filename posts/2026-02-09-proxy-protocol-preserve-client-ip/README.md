# How to Set Up Proxy Protocol on Kubernetes Load Balancers to Preserve Client IP Through L4 Proxies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, Load Balancing

Description: Learn how to configure Proxy Protocol on Kubernetes load balancers to preserve original client IP addresses when traffic passes through Layer 4 proxies and load balancers.

---

When traffic flows through multiple layers of load balancers and proxies in Kubernetes, the original client IP address often gets lost. This creates problems for security policies, access logging, rate limiting, and geographic routing decisions. The PROXY protocol, developed by HAProxy, solves this by prepending connection metadata to TCP streams, allowing downstream services to identify the true client IP address.

This guide shows you how to implement PROXY protocol in Kubernetes environments, covering cloud provider load balancers, ingress controllers, and service configurations.

## Understanding the PROXY Protocol

The PROXY protocol is a simple text-based or binary protocol that prefixes TCP connections with information about the original client. When a proxy or load balancer accepts a connection, it adds a PROXY header before forwarding the data to the backend.

There are two versions:

**PROXY v1** uses a human-readable text format:
```
PROXY TCP4 192.168.1.100 10.0.0.5 54321 443\r\n
```

**PROXY v2** uses a binary format that is more efficient and supports additional metadata like TLS information.

The downstream application or proxy must understand and parse this header to extract the real client IP address.

## Why Client IP Preservation Matters

Several use cases depend on knowing the true client IP:

- **Security policies**: IP-based firewall rules and blocklists
- **Access control**: Geographic restrictions or allowlists
- **Rate limiting**: Per-client throttling
- **Audit logs**: Compliance requirements for tracking user activity
- **Analytics**: Understanding user geographic distribution

Without PROXY protocol or similar mechanisms, your application sees only the IP address of the last proxy in the chain, typically an internal cluster IP.

## Configuring PROXY Protocol with Cloud Load Balancers

Different cloud providers offer varying levels of PROXY protocol support. Let me show you how to enable it on major platforms.

### AWS Network Load Balancer

AWS Network Load Balancers support PROXY protocol v2. You can enable it using service annotations:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
  annotations:
    # Enable PROXY protocol v2 on AWS NLB
    service.beta.kubernetes.io/aws-load-balancer-proxy-protocol: "*"
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
  - port: 443
    targetPort: 8443
    protocol: TCP
```

The `*` value means PROXY protocol is enabled for all backend instances. You can also specify specific target groups if needed.

### Google Cloud Load Balancer

GCP load balancers require different configuration. For internal load balancers, you can enable PROXY protocol through a BackendService:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
  annotations:
    cloud.google.com/backend-config: '{"default": "proxy-protocol-config"}'
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
  - port: 443
    targetPort: 8443
---
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: proxy-protocol-config
spec:
  connectionDraining:
    drainingTimeoutSec: 60
  # Note: PROXY protocol support varies by load balancer type
  # Consult GCP documentation for current support
```

### Azure Load Balancer

Azure load balancers have limited native PROXY protocol support. You often need to use an additional proxy layer like NGINX or HAProxy within the cluster that terminates the load balancer connection and adds PROXY headers.

## Configuring Ingress Controllers for PROXY Protocol

Popular ingress controllers support receiving and sending PROXY protocol headers.

### NGINX Ingress Controller

Configure NGINX to accept PROXY protocol from upstream load balancers:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-configuration
  namespace: ingress-nginx
data:
  # Accept PROXY protocol from load balancer
  use-proxy-protocol: "true"
  # Define trusted proxy CIDRs
  proxy-real-ip-cidr: "10.0.0.0/8,172.16.0.0/12"
  # Set the real IP from PROXY protocol header
  real-ip-header: "proxy_protocol"
```

Apply this configuration to your NGINX ingress deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-ingress-controller
  namespace: ingress-nginx
spec:
  template:
    spec:
      containers:
      - name: nginx-ingress-controller
        image: k8s.gcr.io/ingress-nginx/controller:v1.8.0
        args:
        - /nginx-ingress-controller
        - --configmap=$(POD_NAMESPACE)/nginx-configuration
        - --enable-ssl-passthrough
```

Now your backend services will see the real client IP in the `X-Forwarded-For` header.

### HAProxy Ingress

HAProxy has excellent PROXY protocol support:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: haproxy-ingress
data:
  # Accept PROXY protocol on frontend
  accept-proxy: "true"
  # Send PROXY protocol to backends
  backend-proxy-protocol: "v2"
  # Which IPs to trust for PROXY headers
  proxy-protocol-trusted-ips: "10.0.0.0/8"
```

### Traefik

Traefik supports PROXY protocol through its entrypoint configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: traefik-config
data:
  traefik.yaml: |
    entryPoints:
      web:
        address: ":80"
        proxyProtocol:
          trustedIPs:
          - "10.0.0.0/8"
      websecure:
        address: ":443"
        proxyProtocol:
          trustedIPs:
          - "10.0.0.0/8"
```

## Application-Level PROXY Protocol Support

Some applications need to parse PROXY protocol headers directly. Here's how to handle it in common scenarios.

### Go Application

Use the `pires/go-proxyproto` library:

```go
package main

import (
    "fmt"
    "log"
    "net"
    "net/http"

    proxyproto "github.com/pires/go-proxyproto"
)

func handler(w http.ResponseWriter, r *http.Request) {
    // The real client IP is now available
    fmt.Fprintf(w, "Client IP: %s\n", r.RemoteAddr)
}

func main() {
    listener, err := net.Listen("tcp", ":8080")
    if err != nil {
        log.Fatal(err)
    }

    // Wrap listener with PROXY protocol support
    proxyListener := &proxyproto.Listener{Listener: listener}
    defer proxyListener.Close()

    // Create HTTP server
    server := &http.Server{
        Handler: http.HandlerFunc(handler),
    }

    log.Println("Server listening on :8080 with PROXY protocol support")
    log.Fatal(server.Serve(proxyListener))
}
```

### Python Application

Use the `proxyprotocol` library:

```python
import socket
from proxyprotocol import ProxyProtocolSocket

# Create a socket that understands PROXY protocol
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
sock.bind(('0.0.0.0', 8080))
sock.listen(128)

while True:
    conn, addr = sock.accept()
    # Wrap connection with PROXY protocol parser
    proxy_conn = ProxyProtocolSocket(conn)

    # Get the real client address
    real_client = proxy_conn.get_proxy_data()
    print(f"Connection from: {real_client['src_addr']}:{real_client['src_port']}")

    # Handle the connection
    proxy_conn.close()
```

## Testing PROXY Protocol Configuration

Verify your setup works correctly by sending test traffic with PROXY headers.

### Using socat to Send PROXY Headers

```bash
# Send HTTP request with PROXY v1 header
echo -e "PROXY TCP4 203.0.113.42 10.0.0.5 54321 443\r\nGET / HTTP/1.1\r\nHost: example.com\r\n\r\n" | \
  socat - TCP:your-service.example.com:443

# Send with PROXY v2 (binary format)
# Use a proper PROXY protocol client tool
```

### Testing with curl Through a PROXY-Enabled Proxy

```bash
# Use HAProxy locally to add PROXY headers
cat > haproxy.cfg <<EOF
defaults
    mode tcp
    timeout connect 5s
    timeout client 30s
    timeout server 30s

frontend test
    bind :8080
    default_backend app

backend app
    # Send PROXY protocol to backend
    server app1 your-service:443 send-proxy-v2
EOF

haproxy -f haproxy.cfg

# Test through the local HAProxy
curl http://localhost:8080
```

## Security Considerations

PROXY protocol introduces security implications you must address:

### Trust Only Specific Sources

Configure your services to accept PROXY headers only from trusted load balancers:

```yaml
# NGINX ConfigMap
data:
  proxy-real-ip-cidr: "10.0.0.0/8"  # Only trust internal LB IPs
```

If you accept PROXY headers from untrusted sources, attackers can spoof client IPs.

### Network Policies

Restrict which pods can send traffic with PROXY headers:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-only-lb-proxy
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
  - Ingress
  ingress:
  - from:
    # Only allow from load balancer nodes
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 8443
```

### Validate PROXY Headers

Applications should validate that PROXY headers come from expected sources and reject malformed headers:

```go
// Configure allowed source IPs
proxyListener := &proxyproto.Listener{
    Listener: listener,
    Policy: func(upstream net.Addr) (proxyproto.Policy, error) {
        // Check if upstream is from trusted LB
        if isTrustedSource(upstream) {
            return proxyproto.USE, nil
        }
        return proxyproto.REJECT, nil
    },
}
```

## Troubleshooting Common Issues

### Backend Receives Malformed Requests

**Symptom**: Applications crash or reject connections when PROXY protocol is enabled.

**Solution**: Ensure the backend actually supports PROXY protocol parsing. If not, terminate PROXY headers at the ingress controller level instead of sending them to backends.

### Client IP Still Shows as Internal

**Symptom**: Logs show internal pod or node IPs instead of real client IPs.

**Solution**: Check these configuration points:
1. Load balancer has PROXY protocol enabled
2. Ingress controller accepts PROXY protocol
3. Trusted CIDR ranges include the load balancer IPs
4. Application properly extracts IP from `X-Forwarded-For` or PROXY headers

### Connection Timeouts After Enabling PROXY Protocol

**Symptom**: Connections hang or timeout after configuration changes.

**Solution**: Verify both ends of the connection are configured consistently. If the load balancer sends PROXY headers but the backend doesn't expect them, the backend will treat the header as application data and wait indefinitely.

## Best Practices

Follow these recommendations for production deployments:

1. **Use PROXY v2**: The binary format is more efficient and extensible
2. **Minimize proxy hops**: Each additional proxy layer adds latency
3. **Validate configurations in staging**: Misconfigurations can break all traffic
4. **Monitor header processing**: Track metrics for PROXY header parse failures
5. **Document trusted IP ranges**: Keep clear records of which IPs should send PROXY headers
6. **Use TLS in addition**: PROXY protocol doesn't encrypt data, use TLS for security

## Conclusion

The PROXY protocol provides a standardized way to preserve client IP addresses through multiple layers of proxies and load balancers. By configuring your Kubernetes load balancers, ingress controllers, and applications to use PROXY protocol, you maintain visibility into true client origins for security, compliance, and operational purposes.

Start with enabling PROXY protocol on your cloud load balancer, configure your ingress controller to accept and parse the headers, and verify your applications receive the correct client IP information. With proper configuration and security controls, you can maintain end-to-end client IP visibility across your entire infrastructure.
