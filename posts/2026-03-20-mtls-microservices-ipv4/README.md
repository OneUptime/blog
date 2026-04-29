# How to Configure mTLS Between Microservices over IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: mTLS, Microservice, IPv4, TLS, Security, Python

Description: Learn how to configure mutual TLS (mTLS) authentication between microservices communicating over IPv4, including certificate generation, server and client configuration in Python, and Nginx...

## What Is mTLS?

In standard TLS the server presents a certificate to the client. In mutual TLS (mTLS) both sides present certificates - the server authenticates the client and the client authenticates the server. This provides strong identity verification between microservices.

```text
Client Microservice ←- verify server cert --→ Server Microservice
Client Microservice ←- verify client cert --→ Server Microservice
```

## Generate Certificates with OpenSSL

```bash
# 1. Create CA key and certificate

openssl req -x509 -newkey rsa:4096 -days 3650 -nodes \
    -keyout ca.key -out ca.crt \
    -subj "/CN=MyCA"

# 2. Create server key and CSR (SAN is required so clients can
#    verify the hostname/IP they connect to)
openssl req -newkey rsa:4096 -nodes \
    -keyout server.key -out server.csr \
    -subj "/CN=server.internal" \
    -addext "subjectAltName=DNS:server.internal,IP:192.168.1.10"

# 3. Sign server certificate with CA (copy SAN from the CSR)
openssl x509 -req -days 365 -in server.csr \
    -CA ca.crt -CAkey ca.key -CAcreateserial \
    -out server.crt -copy_extensions copy

# 4. Create client key and certificate (same process)
openssl req -newkey rsa:4096 -nodes \
    -keyout client.key -out client.csr \
    -subj "/CN=client-service"
openssl x509 -req -days 365 -in client.csr \
    -CA ca.crt -CAkey ca.key -CAcreateserial \
    -out client.crt
```

## Python: mTLS Server

```python
import ssl
import http.server

class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        # The client cert subject is available via the SSL object
        cert = self.connection.getpeercert()
        cn   = dict(x[0] for x in cert.get("subject", []))
        self.send_response(200)
        self.end_headers()
        self.wfile.write(f"Hello, {cn.get('commonName', 'unknown')}".encode())

    def log_message(self, *args): pass

ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain("server.crt", "server.key")

# Require and verify the client certificate
ctx.verify_mode = ssl.CERT_REQUIRED
ctx.load_verify_locations("ca.crt")

server = http.server.HTTPServer(("0.0.0.0", 8443), Handler)
server.socket = ctx.wrap_socket(server.socket, server_side=True)

print("mTLS server on 0.0.0.0:8443")
server.serve_forever()
```

## Python: mTLS Client

```python
import ssl
import urllib.request

ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)

# Load our client certificate (proves our identity to the server)
ctx.load_cert_chain("client.crt", "client.key")

# Trust the CA that signed the server certificate
ctx.load_verify_locations("ca.crt")
ctx.verify_mode = ssl.CERT_REQUIRED

req  = urllib.request.urlopen("https://192.168.1.10:8443/api/data", context=ctx)
data = req.read()
print(data.decode())
```

## Nginx: mTLS Passthrough / Termination

```nginx
server {
    listen 443 ssl;
    server_name service.internal;

    ssl_certificate     /etc/certs/server.crt;
    ssl_certificate_key /etc/certs/server.key;

    # Require client certificate signed by our CA
    ssl_client_certificate /etc/certs/ca.crt;
    ssl_verify_client      on;

    location / {
        # Forward client CN to the backend
        proxy_set_header X-Client-CN $ssl_client_s_dn;
        proxy_pass http://127.0.0.1:8080;
    }
}
```

## Conclusion

mTLS provides cryptographic identity for both sides of every service-to-service call, eliminating the need for shared secrets or API keys between microservices. Generate a private CA for your cluster, issue per-service leaf certificates, and configure servers to require `CERT_REQUIRED` verification against the CA bundle. Nginx can terminate mTLS and forward the client CN as a header to backends that need identity information. In Kubernetes, service meshes (Istio, Linkerd) automate mTLS certificate rotation and enforcement.
