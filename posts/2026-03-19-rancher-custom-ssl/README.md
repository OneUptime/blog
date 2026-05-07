# How to Install Rancher with Custom SSL Certificates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, SSL, Kubernetes, Helm, Docker, Installation

Description: A complete guide to installing Rancher with your own custom SSL/TLS certificates using both Docker and Helm deployment methods.

Many organizations use their own Certificate Authority (CA) or purchase SSL certificates from commercial providers. Using custom SSL certificates with Rancher ensures that your Kubernetes management platform integrates with your existing PKI infrastructure and meets organizational security requirements. This guide covers installing Rancher with custom SSL certificates using both Docker and Helm.

## Prerequisites

Before you begin, ensure you have:

- Your SSL/TLS certificate files:
  - Server certificate plus any intermediate certificates, combined as a full chain in `tls.crt`
  - Private key (`tls.key`)
  - CA certificate chain (`cacerts.pem`) if using a private CA or self-signed certificate
- A Linux server with Docker installed (for Docker method) or a Kubernetes cluster with Helm (for Helm method)
- A domain name matching the certificate's Common Name or Subject Alternative Name

## Preparing Your Certificates

Before installing Rancher, verify your certificates are in the correct format.

Check that the certificate and key match:

```bash
# Check the certificate modulus

openssl x509 -noout -modulus -in tls.crt | md5sum

# Check the key modulus
openssl rsa -noout -modulus -in tls.key | md5sum
```

Both commands should output the same MD5 hash.

If your certificate is in PKCS12 format, convert it to PEM:

```bash
# Extract the certificate
openssl pkcs12 -in certificate.pfx -clcerts -nokeys -out tls.crt

# Extract the private key
openssl pkcs12 -in certificate.pfx -nocerts -nodes -out tls.key

# Extract the CA chain
openssl pkcs12 -in certificate.pfx -cacerts -nokeys -out cacerts.pem
```

For Rancher, `tls.crt` should contain the server certificate first, followed by any intermediate certificates. If you are using a private CA, ensure the `cacerts.pem` file contains the CA chain in the correct order, with intermediates first and the root CA last:

```bash
cat intermediate-ca.crt root-ca.crt > cacerts.pem
```

## Method 1: Docker Installation with Custom SSL

Rancher's single-node Docker installation is intended for development and testing, not production.

### Step 1: Prepare Certificate Files

Create a directory for your certificates:

```bash
sudo mkdir -p /opt/rancher/ssl
sudo cp tls.crt /opt/rancher/ssl/cert.pem
sudo cp tls.key /opt/rancher/ssl/key.pem

# Only needed for a private CA or self-signed certificate
sudo cp cacerts.pem /opt/rancher/ssl/cacerts.pem
```

Set proper permissions:

```bash
sudo chmod 600 /opt/rancher/ssl/key.pem
sudo chmod 644 /opt/rancher/ssl/cert.pem

# Only needed for a private CA or self-signed certificate
sudo chmod 644 /opt/rancher/ssl/cacerts.pem
```

### Step 2: Run Rancher with Custom Certificates

If your certificate is signed by a private CA or is self-signed, mount `cacerts.pem` and do not use `--no-cacerts`:

```bash
docker run -d \
  --name rancher \
  --restart=unless-stopped \
  -p 80:80 \
  -p 443:443 \
  -v /opt/rancher/data:/var/lib/rancher \
  -v /opt/rancher/ssl/cert.pem:/etc/rancher/ssl/cert.pem \
  -v /opt/rancher/ssl/key.pem:/etc/rancher/ssl/key.pem \
  -v /opt/rancher/ssl/cacerts.pem:/etc/rancher/ssl/cacerts.pem \
  --privileged \
  rancher/rancher:latest
```

If your certificate is signed by a recognized public CA, omit `cacerts.pem` and use `--no-cacerts`:

```bash
docker run -d \
  --name rancher \
  --restart=unless-stopped \
  -p 80:80 \
  -p 443:443 \
  -v /opt/rancher/data:/var/lib/rancher \
  -v /opt/rancher/ssl/cert.pem:/etc/rancher/ssl/cert.pem \
  -v /opt/rancher/ssl/key.pem:/etc/rancher/ssl/key.pem \
  --privileged \
  rancher/rancher:latest \
  --no-cacerts
```

Use `--no-cacerts` only when the certificate is signed by a recognized public CA. When you provide `cacerts.pem` for a private or self-signed CA, omit that flag.

### Step 3: Verify the Certificate

```bash
echo | openssl s_client -connect localhost:443 -servername rancher.yourdomain.com 2>/dev/null | openssl x509 -noout -subject -issuer -dates
```

### Step 4: Get the Bootstrap Password and Access the UI

```bash
docker logs rancher 2>&1 | grep "Bootstrap Password:"
```

Navigate to `https://rancher.yourdomain.com` and you should see your custom certificate in the browser.

## Method 2: Helm Installation with Custom SSL

### Step 1: Create the TLS Secret

Create a Kubernetes TLS secret from your certificate and key:

```bash
kubectl create namespace cattle-system

kubectl -n cattle-system create secret tls tls-rancher-ingress \
  --cert=tls.crt \
  --key=tls.key
```

### Step 2: Create the CA Certificate Secret

If you are using a private CA, create a secret for the CA certificate:

```bash
kubectl -n cattle-system create secret generic tls-ca \
  --from-file=cacerts.pem
```

### Step 3: Install cert-manager (Optional)

Rancher does not require cert-manager when you are bringing your own certificate files with `ingress.tls.source=secret`. Skip this step unless you also need cert-manager for other workloads in the cluster.

```bash
helm install cert-manager oci://quay.io/jetstack/charts/cert-manager \
  --version v1.20.2 \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true
```

### Step 4: Add the Rancher Repository

```bash
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update
```

### Step 5: Install Rancher with Custom Certificates

```bash
helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --set hostname=rancher.yourdomain.com \
  --set bootstrapPassword=yourSecurePassword \
  --set replicas=3 \
  --set ingress.tls.source=secret
```

If your certificate is signed by a private CA, add `--set privateCA=true` to the command.

The key settings are:

- `ingress.tls.source=secret` tells Rancher to use the TLS secret you created
- `privateCA=true` is required only when the certificate is signed by a private CA and Rancher should use the `tls-ca` secret

### Step 6: Verify the Installation

```bash
kubectl rollout status deployment rancher -n cattle-system
kubectl get pods -n cattle-system
kubectl get ingress -n cattle-system
```

Check the certificate:

```bash
kubectl get secret tls-rancher-ingress -n cattle-system -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -subject -issuer -dates
```

## Certificate Renewal

Custom certificates must be renewed manually before they expire. Set a reminder based on your certificate's expiration date.

### Renewing Docker Installation Certificates

```bash
# Copy the renewed full-chain certificate and key
sudo cp new-tls.crt /opt/rancher/ssl/cert.pem
sudo cp new-tls.key /opt/rancher/ssl/key.pem

# Restart Rancher to pick up the new certificates
docker restart rancher
```

If your private CA chain changed, update `/opt/rancher/ssl/cacerts.pem` as well before restarting Rancher.

### Renewing Helm Installation Certificates

```bash
# Update the TLS secret
kubectl -n cattle-system delete secret tls-rancher-ingress
kubectl -n cattle-system create secret tls tls-rancher-ingress \
  --cert=new-tls.crt \
  --key=new-tls.key

# Restart the Rancher pods
kubectl rollout restart deployment rancher -n cattle-system
```

If your private CA chain also changes, update the `tls-ca` secret too. When downstream clusters already trust the old CA, follow Rancher's certificate rotation procedure so the agents trust the new CA.

## Using Certificates from a Windows CA

If your organization uses a Windows Certificate Authority, export the certificate in PFX format from the Windows CA, then convert:

```bash
# Convert PFX to PEM format
openssl pkcs12 -in rancher-cert.pfx -out tls.crt -clcerts -nokeys
openssl pkcs12 -in rancher-cert.pfx -out tls.key -nocerts -nodes
openssl pkcs12 -in rancher-cert.pfx -out cacerts.pem -cacerts -nokeys
```

## Troubleshooting

```bash
# Verify certificate chain for a private CA
openssl verify -CAfile cacerts.pem tls.crt

# Check certificate dates
openssl x509 -noout -dates -in tls.crt

# Check certificate SANs
openssl x509 -noout -text -in tls.crt | grep -A1 "Subject Alternative Name"

# For Docker: check Rancher logs for SSL errors
docker logs rancher 2>&1 | grep -i "ssl\|cert\|tls"

# For Helm: check pod logs
kubectl logs -l app=rancher -n cattle-system --tail=50

# Test SSL connection
openssl s_client -connect rancher.yourdomain.com:443 -servername rancher.yourdomain.com
```

Common issues:

- **Certificate chain incomplete**: Ensure `tls.crt` contains the server certificate followed by intermediates, and if you are using a private CA ensure `cacerts.pem` contains the CA chain
- **Key mismatch**: Verify the certificate and key match using the modulus check above
- **SAN mismatch**: The certificate must include the Rancher hostname as a SAN or CN
- **Permission errors**: Ensure the key file has correct permissions (600)

## Conclusion

You have successfully installed Rancher with custom SSL certificates. Using your own certificates ensures compliance with your organization's security policies and integrates Rancher into your existing PKI infrastructure. Remember to monitor certificate expiration dates and renew them before they expire to avoid service disruptions.
