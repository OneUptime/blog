# How to Fix Dapr mTLS Certificate Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, mTLS, Security, Certificate, Kubernetes

Description: Troubleshoot and resolve Dapr mTLS certificate errors including expired certificates, rotation failures, and trust chain mismatches in Kubernetes.

---

Dapr uses mutual TLS (mTLS) to encrypt and authenticate all traffic between sidecars. Certificate issues can cause sidecars to fail to start, services to be unable to communicate, or the entire Dapr control plane to become unavailable.

## How Dapr mTLS Works

Dapr's Sentry service acts as its certificate authority (CA). It issues short-lived workload certificates to each sidecar (default lifetime: 24 hours). The root and issuer certificates have longer lifetimes (1 year by default).

Check the current certificate expiry:

```bash
kubectl get secret dapr-trust-bundle -n dapr-system -o jsonpath='{.data.issuer\.crt}' | \
  base64 --decode | openssl x509 -noout -dates
```

## Diagnosing mTLS Errors

Common mTLS error messages in Dapr logs:

```text
failed to authenticate sidecar: certificate has expired
failed to verify certificate: x509: certificate signed by unknown authority
TLS handshake error: remote error: tls: bad certificate
```

Check Sentry logs for certificate issuance problems:

```bash
kubectl logs -l app=dapr-sentry -n dapr-system --tail=100
```

## Rotating Expired Certificates

If the root certificate has expired, generate new ones using the Dapr CLI:

```bash
# Generate new root and issuer certificates
dapr mtls export -o ./certs

# Check existing expiry
dapr mtls expiry
```

To rotate certificates automatically using the Dapr CLI:

```bash
dapr mtls renew-certificate -k --restart
```

This renews the certificates and restarts all Dapr control plane services (Sentry, Operator, Placement, Sidecar Injector, and Scheduler). After the control plane restarts, you must also restart all Dapr-enabled application pods to pick up the new trust bundle.

For a full root certificate rotation, follow the Dapr docs procedure and update the trust bundle secret:

```bash
kubectl create secret generic dapr-trust-bundle \
  --from-file=ca.crt=./certs/ca.crt \
  --from-file=issuer.crt=./certs/issuer.crt \
  --from-file=issuer.key=./certs/issuer.key \
  -n dapr-system --dry-run=client -o yaml | kubectl apply -f -
```

## Bringing Your Own CA

For production environments, use an external CA like cert-manager:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: dapr-ca
  namespace: dapr-system
spec:
  isCA: true
  commonName: dapr-ca
  secretName: dapr-trust-bundle
  issuerRef:
    name: selfsigned-issuer
    kind: ClusterIssuer
```

Configure Dapr Helm to use external certificates:

```bash
helm upgrade dapr dapr/dapr -n dapr-system \
  --set-file dapr_sentry.tls.root.certPEM=./certs/ca.crt \
  --set-file dapr_sentry.tls.issuer.certPEM=./certs/issuer.crt \
  --set-file dapr_sentry.tls.issuer.keyPEM=./certs/issuer.key \
  --reuse-values
```

## Disabling mTLS for Testing

In non-production environments only, you can disable mTLS:

```bash
kubectl patch configuration daprsystem -n dapr-system \
  --type merge \
  -p '{"spec":{"mtls":{"enabled":false}}}'
```

## Summary

Dapr mTLS certificate issues typically involve expired certificates or trust chain mismatches. Regularly check certificate expiry with `dapr mtls expiry`, rotate certificates using `dapr mtls renew-certificate -k --restart`, and consider using cert-manager for automated certificate lifecycle management in production environments.
