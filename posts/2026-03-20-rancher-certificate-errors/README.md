# How to Troubleshoot Certificate Errors in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Troubleshooting, Certificate, TLS

Description: A comprehensive guide to diagnosing and resolving TLS certificate errors in Rancher, covering cert-manager, self-signed CAs, and certificate rotation.

## Introduction

Certificate errors are among the most disruptive issues in a Rancher deployment. They can prevent the UI from loading, block agent connections, and cause cascading failures across clusters. This guide covers how to identify, diagnose, and fix the most common certificate problems.

## Common Certificate Error Symptoms

- Browser shows "Your connection is not private" (ERR_CERT_AUTHORITY_INVALID)
- Rancher agents log `x509: certificate signed by unknown authority`
- `kubectl` commands fail with `certificate has expired or is not yet valid`
- Rancher UI shows clusters as "Unavailable"

## Step 1: Inspect the Current Certificate

```bash
# Check certificate details from the command line

echo | openssl s_client -connect <rancher-hostname>:443 -servername <rancher-hostname> 2>/dev/null \
  | openssl x509 -noout -text | grep -E "Subject:|Issuer:|Not Before:|Not After:"

# Check the Kubernetes TLS secret directly
kubectl get secret -n cattle-system tls-rancher-ingress -o json \
  | jq -r '.data["tls.crt"]' | base64 -d \
  | openssl x509 -noout -dates -subject -issuer
```

## Step 2: Check cert-manager Status

Rancher deployments using Rancher-generated or Let's Encrypt certificates use cert-manager to issue and renew certificates automatically.

```bash
# Check cert-manager pods
kubectl get pods -n cert-manager

# List all Certificate resources
kubectl get certificates -A

# Inspect the Rancher certificate
kubectl describe certificate -n cattle-system tls-rancher-ingress

# Check CertificateRequests for renewal status
kubectl get certificaterequest -n cattle-system
kubectl describe certificaterequest -n cattle-system <request-name>

# Check cert-manager logs for errors
kubectl logs -n cert-manager -l app.kubernetes.io/instance=cert-manager \
  --all-containers --tail=100
```

## Step 3: Force Certificate Renewal

```bash
# Manually trigger renewal
cmctl renew -n cattle-system tls-rancher-ingress

# Watch the renewal progress
kubectl get certificate -n cattle-system -w
```

## Step 4: Troubleshoot Let's Encrypt Issuance

```bash
# Check the Rancher Issuer configuration
kubectl get issuer -n cattle-system
kubectl describe issuer -n cattle-system <issuer-name>

# Check the ACME Order and Challenge resources
kubectl get orders,challenges -n cattle-system
kubectl describe challenge -n cattle-system <challenge-name>

# Rancher's Let's Encrypt integration uses HTTP-01
# Port 80 must be accessible from the internet
curl -I http://<rancher-hostname>
```

## Step 5: Troubleshoot Self-Signed or Private CA

```bash
# If using a private CA, check the CA secret
kubectl get secret -n cattle-system tls-ca -o json \
  | jq -r '.data["cacerts.pem"]' | base64 -d \
  | openssl x509 -noout -subject -issuer -dates

# Verify the CA cert matches the server cert's issuer
ISSUER=$(kubectl get secret -n cattle-system tls-rancher-ingress -o json \
  | jq -r '.data["tls.crt"]' | base64 -d \
  | openssl x509 -noout -issuer)
echo "Server cert issuer: $ISSUER"

# Distribute the private CA to client machines
# macOS:
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain ca.pem

# Ubuntu/Debian:
sudo cp ca.pem /usr/local/share/ca-certificates/rancher-ca.crt
sudo update-ca-certificates
```

## Step 6: Rotate Certificates Manually

For situations where you need to replace certificates with new ones:

```bash
# Create a new TLS secret with your updated certificates
kubectl create secret tls tls-rancher-ingress \
  --cert=new-cert.pem \
  --key=new-key.pem \
  -n cattle-system \
  --dry-run=client -o yaml | kubectl apply -f -

# If the certificate was signed by a different private CA, update tls-ca too
kubectl create secret generic tls-ca \
  --from-file=cacerts.pem \
  -n cattle-system \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart Rancher only when the tls-ca secret changed
kubectl rollout restart deployment/rancher -n cattle-system

# Watch the rollout
kubectl rollout status deployment/rancher -n cattle-system
```

## Step 7: Update the Cattle CA Checksum

When the CA certificate changes, agents must be updated with the new checksum:

```bash
# Calculate the new CA checksum from Rancher's published CA bundle
CA_CHECKSUM=$(curl -k -s -fL https://<rancher-hostname>/v3/settings/cacerts \
  | jq -r .value | sha256sum | awk '{print $1}')

# Using the kubeconfig for each downstream cluster, update both Rancher agents
kubectl set env deployment/cattle-cluster-agent -n cattle-system \
  CATTLE_CA_CHECKSUM="${CA_CHECKSUM}"
kubectl set env daemonset/cattle-node-agent -n cattle-system \
  CATTLE_CA_CHECKSUM="${CA_CHECKSUM}"
```

## Conclusion

Certificate errors in Rancher cascade quickly, impacting UI access, agent connectivity, and cluster availability. The key is to quickly determine whether the issue is expiry, trust, or issuance - then target the right solution. Keep cert-manager healthy, monitor certificate expiry proactively, and ensure all agents trust your CA to maintain a smooth-running environment.
