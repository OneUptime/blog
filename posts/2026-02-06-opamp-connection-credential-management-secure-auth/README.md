# How to Configure OpAMP Connection Credential Management for Secure Agent Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpAMP, Security, Authentication

Description: Configure secure credential management for OpAMP agent-to-server connections including mTLS, token-based auth, and certificate rotation strategies.

When you run an OpAMP server that controls hundreds of collectors, securing the communication channel is not optional. A compromised OpAMP connection means an attacker could push malicious configurations to your entire collector fleet, exfiltrate telemetry data, or disable observability across your infrastructure. This post covers how to properly secure OpAMP connections.

## Authentication Options in OpAMP

OpAMP supports several authentication mechanisms:

- **Mutual TLS (mTLS)**: Both client and server present certificates
- **Bearer token authentication**: Agents include a token in the connection headers
- **Custom header-based authentication**: Any custom authentication scheme via HTTP headers

For production environments, mTLS is the recommended approach. It provides both authentication and encryption in a single mechanism.

## Setting Up mTLS Authentication

### Generate the Certificate Authority

Start by creating a CA that will sign both server and client certificates:

```bash
# Generate the CA private key
openssl genrsa -out ca-key.pem 4096

# Generate the CA certificate (valid for 5 years)
openssl req -new -x509 -key ca-key.pem -sha256 \
  -subj "/CN=OpAMP CA/O=YourOrg" \
  -days 1825 -out ca-cert.pem
```

### Generate the Server Certificate

```bash
# Generate server private key
openssl genrsa -out server-key.pem 4096

# Create a certificate signing request
openssl req -new -key server-key.pem \
  -subj "/CN=opamp-server.internal" \
  -out server.csr

# Sign the server certificate with our CA
openssl x509 -req -in server.csr \
  -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial \
  -days 365 -sha256 \
  -extfile <(printf "subjectAltName=DNS:opamp-server.internal,DNS:localhost") \
  -out server-cert.pem
```

### Generate Client Certificates for Agents

Each agent (or group of agents) gets its own client certificate:

```bash
# Generate agent private key
openssl genrsa -out agent-key.pem 4096

# Create a CSR with agent identification in the subject
openssl req -new -key agent-key.pem \
  -subj "/CN=collector-prod-east/O=YourOrg/OU=production" \
  -out agent.csr

# Sign with the CA
openssl x509 -req -in agent.csr \
  -CA ca-cert.pem -CAkey ca-key.pem -CAcreateserial \
  -days 365 -sha256 \
  -out agent-cert.pem
```

## Configuring the Server with mTLS

Set up the OpAMP server to require client certificates:

```go
func configureTLS() *tls.Config {
    // Load the CA certificate for verifying client certs
    caCert, err := os.ReadFile("/etc/opamp/tls/ca-cert.pem")
    if err != nil {
        log.Fatalf("Failed to read CA cert: %v", err)
    }
    caCertPool := x509.NewCertPool()
    caCertPool.AppendCertsFromPEM(caCert)

    // Load the server certificate and key
    serverCert, err := tls.LoadX509KeyPair(
        "/etc/opamp/tls/server-cert.pem",
        "/etc/opamp/tls/server-key.pem",
    )
    if err != nil {
        log.Fatalf("Failed to load server cert: %v", err)
    }

    return &tls.Config{
        Certificates: []tls.Certificate{serverCert},
        ClientAuth:   tls.RequireAndVerifyClientCert,
        ClientCAs:    caCertPool,
        MinVersion:   tls.VersionTLS12,
    }
}

func main() {
    srv := server.New(&stdLogger{})

    settings := server.StartSettings{
        ListenEndpoint: "0.0.0.0:4320",
        TLSConfig:      configureTLS(),
        Settings: server.Settings{
            Callbacks: server.CallbacksStruct{
                OnConnectingFunc: func(r *http.Request) types.ConnectionResponse {
                    // Extract the client certificate CN for identification
                    if r.TLS != nil && len(r.TLS.PeerCertificates) > 0 {
                        clientCN := r.TLS.PeerCertificates[0].Subject.CommonName
                        clientOU := r.TLS.PeerCertificates[0].Subject.OrganizationalUnit

                        log.Printf("Authenticated agent: CN=%s, OU=%v",
                            clientCN, clientOU)

                        // Verify the agent is in an allowed OU
                        if !isAllowedOU(clientOU) {
                            log.Printf("Rejected agent %s: unauthorized OU", clientCN)
                            return types.ConnectionResponse{Accept: false}
                        }
                    }

                    return types.ConnectionResponse{Accept: true}
                },
            },
        },
    }

    if err := srv.Start(settings); err != nil {
        log.Fatalf("Server start failed: %v", err)
    }

    select {}
}
```

## Agent-Side mTLS Configuration

Configure the supervisor with client certificates:

```yaml
# supervisor.yaml
server:
  endpoint: wss://opamp-server.internal:4320/v1/opamp
  tls:
    # CA certificate to verify the server
    ca_file: /etc/opamp/tls/ca-cert.pem
    # Client certificate for authentication
    cert_file: /etc/opamp/tls/agent-cert.pem
    key_file: /etc/opamp/tls/agent-key.pem

agent:
  executable: /usr/local/bin/otelcol-contrib
  storage_dir: /var/lib/opamp-supervisor
```

## Token-Based Authentication

If mTLS is too complex for your environment, use bearer tokens:

```yaml
# supervisor.yaml with token auth
server:
  endpoint: wss://opamp-server.internal:4320/v1/opamp
  headers:
    Authorization: "Bearer ${OPAMP_TOKEN}"
  tls:
    ca_file: /etc/opamp/tls/ca-cert.pem
```

Validate the token on the server:

```go
OnConnectingFunc: func(r *http.Request) types.ConnectionResponse {
    token := r.Header.Get("Authorization")
    if token == "" {
        return types.ConnectionResponse{Accept: false}
    }

    // Strip "Bearer " prefix
    token = strings.TrimPrefix(token, "Bearer ")

    // Validate against your token store
    if !tokenStore.IsValid(token) {
        log.Printf("Rejected connection: invalid token")
        return types.ConnectionResponse{Accept: false}
    }

    return types.ConnectionResponse{Accept: true}
},
```

## Certificate Rotation

Certificates expire. Plan for rotation by using OpAMP's own connection offer mechanism, or set up a sidecar process that handles certificate renewal:

```bash
#!/bin/bash
# cert-renew.sh - Run periodically via cron
# Checks certificate expiration and renews if needed

CERT_FILE="/etc/opamp/tls/agent-cert.pem"
DAYS_BEFORE_EXPIRY=30

# Check remaining validity
expiry=$(openssl x509 -enddate -noout -in "$CERT_FILE" | cut -d= -f2)
expiry_epoch=$(date -d "$expiry" +%s)
now_epoch=$(date +%s)
days_remaining=$(( (expiry_epoch - now_epoch) / 86400 ))

if [ "$days_remaining" -lt "$DAYS_BEFORE_EXPIRY" ]; then
    echo "Certificate expires in $days_remaining days, renewing..."

    # Request new certificate from your PKI
    # (Replace with your actual certificate renewal process)
    openssl req -new -key /etc/opamp/tls/agent-key.pem \
      -subj "/CN=$(hostname)/O=YourOrg/OU=production" \
      -out /tmp/agent-renewal.csr

    # Submit CSR to your CA and get the new cert
    # Then restart the supervisor to pick up the new cert
    systemctl restart opamp-supervisor
fi
```

Securing your OpAMP connections protects the integrity of your entire observability pipeline. Start with mTLS for the strongest security posture, and make sure you have a plan for certificate rotation before they expire.
