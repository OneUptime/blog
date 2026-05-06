# How to Configure Certificate Chains and Intermediate Certs in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, SSL, Certificate Chain, TLS, Security

Description: Learn how to properly configure SSL certificate chains including intermediate CA certificates in Portainer to avoid trust validation errors.

---

Many commercial SSL certificates require intermediate certificates to establish a complete chain of trust to a root CA. Portainer must present the full chain to clients, or browsers and API clients will report trust errors.

## Understanding Certificate Chains

A complete certificate chain includes:

```text
Root CA Certificate (trusted by OS/browser)
    └── Intermediate CA Certificate
        └── Your Server Certificate (portainer.example.com)
```

The `fullchain.pem` file from Let's Encrypt already contains the complete chain. For commercial certificates, you must assemble it manually.

## Assembling the Certificate Chain

Combine your server certificate with intermediate certificates in the correct order:

```bash
# Use PEM-encoded certificate files. Order is important: your cert FIRST, then intermediates in order

# DO NOT include the root CA (it's pre-trusted by clients)

cat your_domain.crt > /opt/portainer/certs/portainer.crt
cat intermediate1.crt >> /opt/portainer/certs/portainer.crt
cat intermediate2.crt >> /opt/portainer/certs/portainer.crt   # If there's a second intermediate

# Your private key stays separate
cp your_domain.key /opt/portainer/certs/portainer.key
chmod 600 /opt/portainer/certs/portainer.key
```

## Verify the Certificate Chain

Always verify the chain before deploying:

```bash
# Verify the leaf certificate against the system trust store using the assembled chain
openssl verify -show_chain -purpose sslserver \
  -CAfile /etc/ssl/certs/ca-certificates.crt \
  -untrusted /opt/portainer/certs/portainer.crt \
  your_domain.crt

# Check the chain contents
openssl crl2pkcs7 -nocrl -certfile /opt/portainer/certs/portainer.crt | \
  openssl pkcs7 -print_certs -noout

# Check what domains the cert covers
openssl x509 -in /opt/portainer/certs/portainer.crt -noout -text | \
  grep -A1 "Subject Alternative Name"
```

## Deploy Portainer with the Full Chain

```bash
# Start Portainer with the assembled certificate chain
# /certs/portainer.crt must contain the full chain
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /opt/portainer/certs:/certs:ro \
  portainer/portainer-ce:sts \
  --sslcert /certs/portainer.crt \
  --sslkey /certs/portainer.key
```

## Test the Chain from a Client

```bash
# Test the full chain is presented correctly
openssl s_client -connect portainer.example.com:9443 \
  -servername portainer.example.com -showcerts </dev/null 2>/dev/null

# Check for chain validation errors
curl https://portainer.example.com:9443/api/status
# If no SSL error is shown, the chain is correctly configured
```

## Common Chain Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `unable to verify the first certificate` | Missing intermediate | Add intermediates to the chain file |
| `certificate verify failed` | Wrong order in chain | Reorder: server cert first, then intermediates |
| `self signed certificate in chain` | Included root CA | Remove root CA from the chain file |
| `certificate has expired` | Outdated intermediate | Get updated intermediate from your CA |

## Download Missing Intermediates

If you don't have the intermediate certificate:

```bash
# Download the intermediate CA cert from the URL in your certificate's AIA extension
AIA_URL=$(openssl x509 -in your_domain.crt -noout -text | \
  awk -F'URI:' '/CA Issuers/ {print $2}')

curl -L -o intermediate.cer "$AIA_URL"

# Convert to PEM if the CA serves the intermediate in DER format
openssl x509 -in intermediate.cer -out intermediate.crt 2>/dev/null || \
  openssl x509 -inform DER -in intermediate.cer -out intermediate.crt
```

---

*Monitor your Portainer SSL configuration and get alerted on cert errors with [OneUptime](https://oneuptime.com).*
