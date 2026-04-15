# How to Bring Your Own CA Certificate for Dapr Sentry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Sentry, Certificate, Security, PKI

Description: Learn how to configure Dapr Sentry to use your own CA certificate and private key instead of the auto-generated self-signed certificate.

---

By default, Dapr Sentry generates a self-signed root certificate at startup. For enterprise environments, you may want to use your own Certificate Authority to ensure all Dapr workload certificates chain to your organization's PKI. This guide walks through providing a custom CA certificate and key to Dapr Sentry.

## Why Use Your Own CA Certificate

Using your own CA allows you to:
- Chain Dapr certificates to your organization's root CA
- Meet compliance requirements that prohibit self-signed CAs
- Integrate Dapr mTLS with existing certificate management tooling
- Set custom validity periods for the issuing CA

## Generating a CA Certificate and Key

If you need to create a CA certificate, use step-cli or openssl:

```bash
# Using step-cli
step certificate create \
  "Dapr Root CA" \
  ca.crt ca.key \
  --profile root-ca \
  --no-password \
  --insecure \
  --not-after 87600h
```

Or using openssl:

```bash
openssl genrsa -out ca.key 4096

openssl req -new -x509 \
  -key ca.key \
  -out ca.crt \
  -days 3650 \
  -subj "/CN=Dapr Root CA/O=MyOrg"
```

## Creating the Kubernetes Secret

Dapr Sentry reads the CA from a Kubernetes secret named `dapr-trust-bundle` in the `dapr-system` namespace:

```bash
kubectl create secret generic dapr-trust-bundle \
  --from-file=ca.crt=ca.crt \
  --from-file=issuer.crt=ca.crt \
  --from-file=issuer.key=ca.key \
  -n dapr-system
```

Note: for a two-tier PKI, replace `issuer.crt` and `issuer.key` with an intermediate certificate signed by your root CA.

## Configuring Sentry via Helm

Set Sentry to use the existing secret rather than auto-generating:

```yaml
dapr_sentry:
  tls:
    issuer:
      certPEM: ""
      keyPEM: ""
    root:
      certPEM: ""
global:
  mtls:
    allowedClockSkew: 15m
    workloadCertTTL: 24h
```

When the secret already exists before Dapr is installed, Sentry picks it up automatically:

```bash
helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system \
  --create-namespace \
  --reuse-values
```

## Verifying Sentry Uses Your CA

After installation, confirm Sentry loaded the correct certificate:

```bash
kubectl logs -n dapr-system \
  -l app=dapr-sentry \
  --tail=50 | grep -i "trust bundle\|root cert\|issuer"
```

Check that a workload certificate chains to your CA:

```bash
kubectl exec -n default deploy/my-app \
  -c daprd -- \
  openssl s_client \
  -connect localhost:50001 \
  -showcerts 2>/dev/null | \
  openssl x509 -noout -issuer -subject
```

## Rotating the CA Certificate

To rotate your custom CA, update the secret and restart Sentry:

```bash
kubectl create secret generic dapr-trust-bundle \
  --from-file=ca.crt=new-ca.crt \
  --from-file=issuer.crt=new-ca.crt \
  --from-file=issuer.key=new-ca.key \
  -n dapr-system \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl rollout restart deployment/dapr-sentry -n dapr-system
```

Sidecars will automatically receive new workload certificates as they are renewed.

## Summary

To bring your own CA to Dapr Sentry, generate your CA certificate and key, store them in the `dapr-trust-bundle` Kubernetes secret, and let Sentry load them on startup. Verify the certificate chain after installation to confirm workload certs trace back to your organization's CA. Rotate by updating the secret and restarting Sentry.
