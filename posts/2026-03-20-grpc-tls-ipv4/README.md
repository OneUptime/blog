# How to Secure gRPC Connections with TLS over IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, TLS, IPv4, Security, Python, Go

Description: Learn how to secure gRPC connections with TLS over IPv4 in Python and Go, covering self-signed certificates, server-only TLS, mutual TLS (mTLS), and certificate rotation.

## Generate Self-Signed Certificates

```bash
# CA

openssl req -x509 -newkey rsa:4096 -days 3650 -noenc \
    -keyout ca.key -out ca.crt -subj "/CN=gRPC-CA"

# Server key and signed certificate for 192.168.1.10
openssl req -newkey rsa:4096 -noenc \
    -keyout server.key -out server.csr -subj "/CN=grpc-server" \
    -addext "subjectAltName = IP:192.168.1.10" \
    -addext "extendedKeyUsage = serverAuth"
openssl x509 -req -days 365 -in server.csr \
    -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt \
    -copy_extensions copy

# Client key and signed certificate (for mTLS)
openssl req -newkey rsa:4096 -noenc \
    -keyout client.key -out client.csr -subj "/CN=grpc-client" \
    -addext "extendedKeyUsage = clientAuth"
openssl x509 -req -days 365 -in client.csr \
    -CA ca.crt -CAkey ca.key -CAcreateserial -out client.crt \
    -copy_extensions copy
```

## Python: TLS Server (Server-Only Auth)

```python
import grpc
from concurrent import futures

def serve_tls():
    with open("server.key", "rb") as f: key  = f.read()
    with open("server.crt", "rb") as f: cert = f.read()

    credentials = grpc.ssl_server_credentials([(key, cert)])

    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    # add servicers ...
    server.add_secure_port("0.0.0.0:50051", credentials)
    server.start()
    server.wait_for_termination()
```

## Python: TLS Client

```python
import grpc
import hello_pb2
import hello_pb2_grpc

with open("ca.crt", "rb") as f:
    trusted = f.read()

creds  = grpc.ssl_channel_credentials(root_certificates=trusted)
channel = grpc.secure_channel("192.168.1.10:50051", creds)
stub = hello_pb2_grpc.GreeterStub(channel)
resp = stub.SayHello(hello_pb2.HelloRequest(name="world"), timeout=5.0)
print(resp.message)
```

## Python: mTLS Server + Client

```python
# Server - require client certificate
def serve_mtls():
    with open("server.key","rb") as f: key  = f.read()
    with open("server.crt","rb") as f: cert = f.read()
    with open("ca.crt","rb") as f:    ca   = f.read()

    creds = grpc.ssl_server_credentials(
        [(key, cert)],
        root_certificates=ca,
        require_client_auth=True,
    )
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    server.add_secure_port("0.0.0.0:50051", creds)
    server.start()
    server.wait_for_termination()

# Client - present its own certificate
def call_mtls():
    with open("ca.crt","rb") as f:     ca    = f.read()
    with open("client.key","rb") as f: key   = f.read()
    with open("client.crt","rb") as f: cert  = f.read()

    creds = grpc.ssl_channel_credentials(
        root_certificates=ca,
        private_key=key,
        certificate_chain=cert,
    )
    with grpc.secure_channel("192.168.1.10:50051", creds) as ch:
        stub = hello_pb2_grpc.GreeterStub(ch)
        resp = stub.SayHello(hello_pb2.HelloRequest(name="world"))
        print(resp.message)
```

## Go: TLS Client

```go
import (
    "crypto/tls"
    "crypto/x509"
    "fmt"
    "os"

    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials"
)

func tlsClient(addr string) (*grpc.ClientConn, error) {
    caCert, err := os.ReadFile("ca.crt")
    if err != nil {
        return nil, err
    }

    pool := x509.NewCertPool()
    if !pool.AppendCertsFromPEM(caCert) {
        return nil, fmt.Errorf("failed to append CA certificate")
    }

    tlsCfg := &tls.Config{RootCAs: pool}
    creds := credentials.NewTLS(tlsCfg)

    return grpc.NewClient(addr, grpc.WithTransportCredentials(creds))
}
```

## Conclusion

Use `grpc.ssl_server_credentials` on the Python server, `grpc.ssl_channel_credentials` on the Python client, and `credentials.NewTLS` in Go to enable TLS. For server-only TLS, the client verifies the server certificate with the CA bundle, and when you connect by IPv4 address the server certificate must include that IP address in `subjectAltName`. For mTLS, set `require_client_auth=True` (Python) or configure `ClientAuth: tls.RequireAndVerifyClientCert` (Go) and provide client certificates. In production, use a proper CA (Let's Encrypt, HashiCorp Vault PKI, or cert-manager in Kubernetes) rather than self-signed certificates, and automate rotation before certificates expire.
