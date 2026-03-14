# How to Validate Istio Certificate Management for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Certificates, mTLS, Security, Production

Description: How to validate Istio certificate management for production including CA configuration, certificate rotation, expiration monitoring, and custom CA integration.

---

Certificates are the foundation of Istio's mTLS. Every sidecar proxy gets a certificate that identifies the workload, and these certificates are used to encrypt and authenticate all mesh traffic. If certificate management breaks, your mesh breaks. Expired certificates, failed rotations, or a compromised CA can take down communication between all your services.

Here is how to make sure your certificate management is production ready.

## Check the Current CA Configuration

First, figure out what CA Istio is using. By default, Istio uses a self-signed CA, which is fine for development but needs careful management in production.

```bash
# Check if a custom CA is installed
kubectl get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | base64 -d | openssl x509 -text -noout
```

Look at the Issuer field. If it says something like `O = cluster.local`, you are using the default self-signed CA.

For production, you typically want to plug in your own CA or use an intermediate CA signed by your organization's root CA:

```bash
# Check the CA cert chain
kubectl get secret istio-ca-secret -n istio-system -o jsonpath='{.data.cert-chain\.pem}' | base64 -d | openssl crl2pkcs7 -nocrl -certfile /dev/stdin | openssl pkcs7 -print_certs -noout
```

## Validate CA Certificate Expiration

The single most common certificate issue is expiration. Check when your CA certificate expires:

```bash
kubectl get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | base64 -d | openssl x509 -noout -dates
```

If the CA cert is expiring within the next 90 days, plan a rotation immediately. When the CA expires, new workload certificates cannot be issued, and existing ones cannot be renewed.

Set up monitoring for CA certificate expiration:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-cert-alerts
  namespace: monitoring
spec:
  groups:
    - name: istio-certs
      rules:
        - alert: IstioCACertExpiringSoon
          expr: |
            citadel_server_root_cert_expiry_timestamp - time() < 86400 * 30
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "Istio CA certificate expires in less than 30 days"
```

## Validate Workload Certificate Rotation

Istio automatically rotates workload certificates. Verify this is working by checking a proxy's current certificate:

```bash
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15000/certs | python3 -m json.tool
```

This shows the certificate chain, validity period, and serial number. The default workload certificate lifetime is 24 hours.

You can check the certificate details more specifically:

```bash
kubectl exec deploy/my-service -c istio-proxy -- openssl s_client -connect localhost:15021 2>/dev/null | openssl x509 -noout -text | grep -A2 "Validity"
```

To verify rotation is happening, check the certificate twice with some time between:

```bash
# Get serial number now
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15000/certs | python3 -c "import sys, json; certs=json.load(sys.stdin); print(certs['certificates'][0]['cert_chain'][0]['serial_number'])"

# Wait and check again (certificates rotate at roughly 50% of their lifetime)
# The serial number should change
```

## Configure Custom CA Integration

For production, integrate with your organization's PKI. Here is how to use a custom CA:

```bash
# Create the cacerts secret with your own certificates
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem=ca-cert.pem \
  --from-file=ca-key.pem=ca-key.pem \
  --from-file=root-cert.pem=root-cert.pem \
  --from-file=cert-chain.pem=cert-chain.pem
```

Verify the secret was created correctly:

```bash
kubectl get secret cacerts -n istio-system -o jsonpath='{.data}' | jq 'keys'
```

You should see four keys: `ca-cert.pem`, `ca-key.pem`, `cert-chain.pem`, and `root-cert.pem`.

## Validate cert-manager Integration

If you are using cert-manager to manage Istio's CA certificate, verify the integration:

```bash
kubectl get certificate -n istio-system
kubectl get certificaterequest -n istio-system
```

A cert-manager Issuer for Istio:

```yaml
apiVersion: cert-manager.io/v1
kind: Issuer
metadata:
  name: istio-ca
  namespace: istio-system
spec:
  ca:
    secretName: istio-ca-key-pair
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: istio-ca
  namespace: istio-system
spec:
  isCA: true
  duration: 8760h    # 1 year
  renewBefore: 720h  # 30 days before expiry
  secretName: cacerts
  commonName: istio-ca
  issuerRef:
    name: istio-ca
    kind: Issuer
  privateKey:
    algorithm: ECDSA
    size: 256
```

Verify cert-manager is renewing the certificate:

```bash
kubectl describe certificate istio-ca -n istio-system | grep -A5 "Status"
```

## Check SAN (Subject Alternative Name) Configuration

Istio uses SPIFFE IDs as SANs in workload certificates. Verify the SAN format:

```bash
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15000/certs | python3 -c "
import sys, json
certs = json.load(sys.stdin)
for cert in certs.get('certificates', []):
    for c in cert.get('cert_chain', []):
        print('Subject:', c.get('subject', ''))
        for san in c.get('subject_alt_names', []):
            print('SAN:', san.get('uri', ''))
"
```

The SAN should follow the format: `spiffe://cluster.local/ns/<namespace>/sa/<service-account>`

If the SAN is incorrect, check that the service account is properly assigned to the workload.

## Validate Gateway TLS Certificates

Gateway certificates are separate from mesh certificates. Verify each gateway certificate:

```bash
# List all gateway TLS secrets
for gw in $(kubectl get gateway -A -o jsonpath='{range .items[*]}{.spec.servers[*].tls.credentialName}{"\n"}{end}' | sort -u); do
  echo "Gateway secret: $gw"
  kubectl get secret "$gw" -n istio-system -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -subject -dates
  echo "---"
done
```

Make sure gateway certificates:
- Are not self-signed (for public-facing services)
- Have the correct domain names in the SAN
- Are not expiring within the next 30 days
- Include the full certificate chain

## Test Certificate Rotation Under Load

Certificate rotation should be seamless with zero downtime. Test this under load:

```bash
# Start a continuous load test
kubectl exec deploy/sleep -- sh -c 'while true; do curl -s -o /dev/null -w "%{http_code}\n" http://my-service:8080/health; sleep 0.1; done' &

# Force a certificate rotation by restarting istiod
kubectl rollout restart deployment istiod -n istio-system

# Watch the load test output for any non-200 responses
```

All requests should continue returning 200 during the rotation. If you see connection failures, there might be a timing issue with certificate distribution.

## Monitoring Certificate Health

Set up ongoing monitoring for certificate issues:

```bash
# Check for expired workload certificates
istioctl proxy-config secret deploy/my-service -o json | python3 -c "
import sys, json, datetime
data = json.load(sys.stdin)
for item in data.get('dynamicActiveSecrets', []):
    name = item.get('name', '')
    # Check for certificate validity
    print(f'Secret: {name}')
"
```

Key metrics to monitor:

- `citadel_server_root_cert_expiry_timestamp` - CA cert expiration
- `istio_agent_cert_expiry_seconds` - workload cert expiration (available in proxy metrics)
- Certificate rotation failures in istiod logs

```bash
kubectl logs deploy/istiod -n istio-system | grep -i "cert\|certificate\|rotation" | tail -20
```

Certificate management is one of those things where a small misconfiguration can have catastrophic consequences. Validate everything listed above before going to production, and set up automated monitoring so you know about certificate issues days before they become outages.
