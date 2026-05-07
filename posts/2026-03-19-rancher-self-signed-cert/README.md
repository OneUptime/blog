# How to Install Rancher with a Self-Signed Certificate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, SSL, Installation

Description: A step-by-step guide to installing Rancher using a self-signed TLS certificate for development and testing environments.

Rancher is one of the most popular open-source platforms for managing Kubernetes clusters. While production deployments typically use certificates from a trusted Certificate Authority, development and testing environments often benefit from using self-signed certificates. This guide walks you through the entire process of installing Rancher with a self-signed TLS certificate.

## Prerequisites

Before you begin, make sure you have the following in place:

- A Linux server (Ubuntu 22.04 or later recommended) with at least 4 GB of RAM and 2 CPU cores
- Helm 3 installed on your local machine or the server
- kubectl installed and configured
- A DNS hostname for accessing Rancher

## Step 1: Install K3s as the Underlying Kubernetes Cluster

Rancher needs a Kubernetes cluster to run on. K3s is a lightweight distribution that works perfectly for this purpose.

```bash
curl -sfL https://get.k3s.io | sh -s - --write-kubeconfig-mode 644
```

Wait for K3s to start and verify it is running:

```bash
sudo k3s kubectl get nodes
```

Export the kubeconfig so Helm and kubectl can use it:

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
```

## Step 2: Generate Self-Signed Certificates

Create a directory to store your certificates:

```bash
mkdir -p ~/rancher-certs && cd ~/rancher-certs
```

Generate a CA private key and certificate:

```bash
openssl genrsa -out ca.key 4096

openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 \
  -out ca.crt \
  -subj "/C=US/ST=State/L=City/O=MyOrg/CN=rancher-ca"
```

Generate the server private key and certificate signing request:

```bash
openssl genrsa -out tls.key 4096

openssl req -new -key tls.key -out tls.csr \
  -subj "/C=US/ST=State/L=City/O=MyOrg/CN=rancher.example.com"
```

Create a configuration file for the certificate extensions:

```bash
cat > extfile.cnf <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = rancher.example.com
DNS.2 = rancher.local
IP.1 = 192.168.1.100
EOF
```

Replace `rancher.example.com` with the DNS hostname you will use for Rancher and `192.168.1.100` with your server IP address if you want to include an IP SAN.

Sign the server certificate with your CA:

```bash
openssl x509 -req -in tls.csr -CA ca.crt -CAkey ca.key \
  -CAcreateserial -out tls.crt -days 3650 -sha256 \
  -extfile extfile.cnf
```

## Step 3: cert-manager Is Not Required for This Setup

When you install Rancher with your own certificate files by setting `ingress.tls.source=secret`, Rancher does not require cert-manager. cert-manager is only needed when Rancher is configured to generate its own certificates or request Let's Encrypt certificates.

## Step 4: Create the TLS Secret

Create the cattle-system namespace and add your certificates as a Kubernetes secret:

```bash
kubectl create namespace cattle-system

kubectl -n cattle-system create secret tls tls-rancher-ingress \
  --cert=tls.crt \
  --key=tls.key

kubectl -n cattle-system create secret generic tls-ca \
  --from-file=cacerts.pem=ca.crt
```

## Step 5: Install Rancher with Helm

Add the Rancher Helm repository:

```bash
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update
```

Install Rancher with the self-signed certificate configuration:

```bash
helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --set hostname=rancher.example.com \
  --set bootstrapPassword=admin \
  --set ingress.tls.source=secret \
  --set privateCA=true
```

Replace `rancher.example.com` with your actual DNS hostname.

## Step 6: Verify the Installation

Wait for Rancher to finish deploying:

```bash
kubectl -n cattle-system rollout status deploy/rancher
```

Check that all pods are running:

```bash
kubectl -n cattle-system get pods
```

You should see the Rancher pods in a Running state.

## Step 7: Access the Rancher UI

If you are using a custom domain, add a DNS record or edit your local hosts file:

```bash
echo "192.168.1.100 rancher.example.com" | sudo tee -a /etc/hosts
```

Open your browser and navigate to `https://rancher.example.com`. Since you are using a self-signed certificate, your browser will show a security warning. Accept the warning to proceed.

Log in with the bootstrap password you set during installation (`admin` in this example) and follow the prompts to set a new admin password.

## Step 8: Trust the CA Certificate on Client Machines

To avoid browser warnings on machines that need to access Rancher, install the CA certificate.

On Ubuntu or Debian:

```bash
sudo cp ca.crt /usr/local/share/ca-certificates/rancher-ca.crt
sudo update-ca-certificates
```

On macOS:

```bash
sudo security add-trusted-cert -d -r trustRoot \
  -k /Library/Keychains/System.keychain ca.crt
```

## Troubleshooting

If you encounter issues, check the Rancher pod logs:

```bash
kubectl -n cattle-system logs -l app=rancher --tail=100
```

Common issues include incorrect hostnames in the certificate SAN fields and missing or incorrect private CA settings. Make sure your certificate CN or SAN entries match the hostname you configured in the Helm values, and if your certificate is signed by your own CA, confirm that the `tls-ca` secret exists and `privateCA=true` is set.

## Summary

You have successfully installed Rancher with a self-signed certificate. This setup is ideal for development, testing, and internal environments where a trusted CA certificate is not required. For production use, consider switching to a certificate issued by a public Certificate Authority or using Let's Encrypt through cert-manager.
