# How to Set Up cert-manager Standalone on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSL, Cert-Manager, Kubernetes, Certificate Management

Description: Install and configure cert-manager as a standalone tool on Ubuntu to automate certificate issuance and renewal from Let's Encrypt and other ACME CAs.

---

cert-manager is widely known as a Kubernetes operator for certificate management. It is implemented as a set of Kubernetes controllers and CRDs, so it requires a Kubernetes API server to run - there is no fully standalone mode that operates without Kubernetes. However, you can still get a "single-Ubuntu-server" cert-manager deployment by running a lightweight Kubernetes distribution like [k3s](https://k3s.io/) on the same host. Running cert-manager this way makes sense when you want to manage certificates using the same tooling across Kubernetes clusters and traditional servers, or when you're building infrastructure that will eventually move to Kubernetes and want consistent workflows.

This guide covers installing k3s and cert-manager on a single Ubuntu host, installing the `cmctl` CLI for interacting with cert-manager, and configuring an ACME issuer that obtains certificates from Let's Encrypt.

## Understanding cert-manager on a Single Host

In this setup the cert-manager controllers run as pods inside a single-node k3s cluster. They watch cert-manager CRDs (`Issuer`, `ClusterIssuer`, `Certificate`, `CertificateRequest`, `Order`, `Challenge`) and reconcile them by talking to ACME servers and storing issued certificates in Kubernetes `Secret` objects. To make the certificates available to other services on the host (nginx, HAProxy, application processes), you extract them from the secrets to files on disk.

The main CLI for working with cert-manager is `cmctl`. It is a Kubernetes-aware tool - it talks to a Kubernetes API server through your kubeconfig and is useful for inspecting cert-manager resources and triggering manual renewals.

## Installing cmctl

Download the latest `cmctl` binary:

```bash
# Get latest version
CMCTL_VERSION=$(curl -s https://api.github.com/repos/cert-manager/cmctl/releases/latest \
    | grep '"tag_name"' | cut -d'"' -f4)

ARCH=$(dpkg --print-architecture)

# Download the raw binary asset
curl -fsSL \
    "https://github.com/cert-manager/cmctl/releases/download/${CMCTL_VERSION}/cmctl_linux_${ARCH}" \
    -o /tmp/cmctl

sudo install -o root -g root -m 0755 /tmp/cmctl /usr/local/bin/cmctl

# Verify
cmctl version --client
```

Point `cmctl` at the k3s cluster once k3s is installed (see below) by exporting `KUBECONFIG`:

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
```

## Installing k3s and cert-manager

Install k3s and the cert-manager Helm chart on a single Ubuntu host:

```bash
# Install k3s (lightweight Kubernetes)
curl -sfL https://get.k3s.io | sh -

# Wait for k3s to be ready
sudo k3s kubectl get nodes

# Install Helm (not in the default Ubuntu apt repositories)
curl -fsSL https://baltocdn.com/helm/signing.asc \
    | sudo gpg --dearmor -o /usr/share/keyrings/helm.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/helm.gpg] \
https://baltocdn.com/helm/stable/debian/ all main" \
    | sudo tee /etc/apt/sources.list.d/helm-stable-debian.list
sudo apt update
sudo apt install -y helm

# Install cert-manager via Helm
helm repo add jetstack https://charts.jetstack.io
helm repo update

sudo k3s kubectl create namespace cert-manager

helm install cert-manager jetstack/cert-manager \
    --namespace cert-manager \
    --set crds.enabled=true \
    --kubeconfig /etc/rancher/k3s/k3s.yaml

# Verify cert-manager pods
sudo k3s kubectl get pods -n cert-manager
```

This gives you the full cert-manager feature set on a single Ubuntu server.

## Configuring a ClusterIssuer for Let's Encrypt

With cert-manager running in k3s, configure a ClusterIssuer:

```bash
# Create the issuer configuration
sudo nano /etc/cert-manager/clusterissuer-prod.yaml
```

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    # Let's Encrypt production server
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    # Store ACME account key in a Kubernetes secret
    privateKeySecretRef:
      name: letsencrypt-prod-key
    solvers:
      # HTTP-01 solver
      - http01:
          ingress:
            class: traefik
```

Apply it:

```bash
sudo k3s kubectl apply -f /etc/cert-manager/clusterissuer-prod.yaml

# Verify the issuer is ready
sudo k3s kubectl get clusterissuer letsencrypt-prod -o wide
```

### DNS-01 ClusterIssuer for Wildcard Certificates

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-dns
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-dns-key
    solvers:
      - dns01:
          cloudflare:
            apiTokenSecretRef:
              name: cloudflare-api-token
              key: api-token
```

Create the Cloudflare API token secret:

```bash
sudo k3s kubectl create secret generic cloudflare-api-token \
    --from-literal=api-token=your-cloudflare-api-token
```

Apply the issuer:

```bash
sudo k3s kubectl apply -f /etc/cert-manager/clusterissuer-dns.yaml
```

## Issuing a Certificate

Create a Certificate resource:

```bash
sudo nano /etc/cert-manager/certificate-example.yaml
```

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: example-com-tls
  namespace: default
spec:
  secretName: example-com-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  commonName: example.com
  dnsNames:
    - example.com
    - www.example.com
  # Certificate duration and renewal window
  duration: 2160h     # 90 days
  renewBefore: 360h   # Renew 15 days before expiry
```

For wildcard certificates using DNS-01:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-example-com
  namespace: default
spec:
  secretName: wildcard-example-com-tls
  issuerRef:
    name: letsencrypt-dns
    kind: ClusterIssuer
  commonName: "*.example.com"
  dnsNames:
    - "*.example.com"
    - "example.com"
  duration: 2160h
  renewBefore: 360h
```

Apply and monitor:

```bash
sudo k3s kubectl apply -f /etc/cert-manager/certificate-example.yaml

# Watch certificate status
sudo k3s kubectl describe certificate example-com-tls
sudo k3s kubectl get certificaterequest
sudo k3s kubectl get order
sudo k3s kubectl get challenge
```

## Extracting Certificates for Use by External Services

Once cert-manager stores the certificate in a Kubernetes secret, extract it for use by nginx or other services:

```bash
# Extract certificate from the secret
sudo k3s kubectl get secret example-com-tls-secret \
    -o jsonpath='{.data.tls\.crt}' | base64 -d > /etc/ssl/certs/example.com.crt

sudo k3s kubectl get secret example-com-tls-secret \
    -o jsonpath='{.data.tls\.key}' | base64 -d > /etc/ssl/private/example.com.key

# Set permissions
chmod 644 /etc/ssl/certs/example.com.crt
chmod 600 /etc/ssl/private/example.com.key
```

### Automating Certificate Extraction

Create a script that runs after cert-manager renews:

```bash
sudo nano /usr/local/bin/extract-certs.sh
```

```bash
#!/bin/bash
# Extract certificates from cert-manager secrets to filesystem

KUBECONFIG="/etc/rancher/k3s/k3s.yaml"
export KUBECONFIG

CERTS=(
    "example-com-tls-secret:example.com"
    "wildcard-example-com-tls:wildcard.example.com"
)

NGINX_RELOADED=false

for CERT_PAIR in "${CERTS[@]}"; do
    SECRET="${CERT_PAIR%%:*}"
    DOMAIN="${CERT_PAIR##*:}"

    mkdir -p "/etc/ssl/acme/$DOMAIN"

    # Extract certificate and key
    kubectl get secret "$SECRET" \
        -o jsonpath='{.data.tls\.crt}' 2>/dev/null | \
        base64 -d > "/etc/ssl/acme/$DOMAIN/fullchain.pem"

    kubectl get secret "$SECRET" \
        -o jsonpath='{.data.tls\.key}' 2>/dev/null | \
        base64 -d > "/etc/ssl/acme/$DOMAIN/privkey.pem"

    chmod 644 "/etc/ssl/acme/$DOMAIN/fullchain.pem"
    chmod 600 "/etc/ssl/acme/$DOMAIN/privkey.pem"

    echo "Extracted certificate for $DOMAIN"
done

# Reload nginx once after all certificates are updated
if systemctl is-active --quiet nginx; then
    systemctl reload nginx
    echo "Nginx reloaded"
fi
```

```bash
sudo chmod +x /usr/local/bin/extract-certs.sh
```

Set up a timer to check and extract certificates periodically:

```bash
sudo nano /etc/systemd/system/cert-extract.service
```

```ini
[Unit]
Description=Extract cert-manager certificates to filesystem
After=k3s.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/extract-certs.sh
```

```bash
sudo nano /etc/systemd/system/cert-extract.timer
```

```ini
[Unit]
Description=Periodic certificate extraction from cert-manager

[Timer]
OnCalendar=*-*-* *:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl enable --now cert-extract.timer
```

## Troubleshooting cert-manager

### Certificate Not Issuing

```bash
# Check certificate status
sudo k3s kubectl describe certificate example-com-tls

# Check the certificate request
sudo k3s kubectl get certificaterequest
sudo k3s kubectl describe certificaterequest example-com-tls-XXXX

# Check the ACME order
sudo k3s kubectl get order
sudo k3s kubectl describe order example-com-XXXX

# Check the ACME challenge
sudo k3s kubectl get challenge
sudo k3s kubectl describe challenge example-com-XXXX
```

### Check cert-manager Logs

```bash
# cert-manager controller logs
sudo k3s kubectl logs -n cert-manager \
    -l app.kubernetes.io/component=controller \
    --tail=100

# Webhook logs (if issues with resource validation)
sudo k3s kubectl logs -n cert-manager \
    -l app.kubernetes.io/component=webhook \
    --tail=50
```

### Verify DNS-01 Challenge

```bash
# Check that the TXT record was created
dig +short TXT _acme-challenge.example.com @8.8.8.8
```

### Force Certificate Renewal

```bash
# Use cmctl to trigger a manual renewal
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
cmctl renew example-com-tls

# Or delete the certificate request to trigger re-issuance
sudo k3s kubectl delete certificaterequest example-com-tls-XXXX
```

## Summary

cert-manager standalone (via k3s) brings the full cert-manager ecosystem to a single Ubuntu server. The CRD-based configuration is declarative and version-controllable, automatic renewal is built-in, and the same configuration files work identically when you move to a full Kubernetes cluster. The main trade-off compared to acme.sh or Certbot is the complexity of running Kubernetes, but k3s keeps that overhead manageable. For teams already using Kubernetes in production, using cert-manager everywhere creates consistent tooling across environments.
