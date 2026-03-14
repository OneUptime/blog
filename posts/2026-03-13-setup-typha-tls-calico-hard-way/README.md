# How to Set Up Typha TLS in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, TLS, Security, Hard Way

Description: A step-by-step guide to generating TLS certificates, creating Kubernetes secrets, and configuring mTLS between Felix and Typha in a manually installed Calico cluster.

---

## Introduction

Setting up TLS for Typha in a hard way installation involves generating a certificate authority (CA), issuing server certificates for Typha and client certificates for Felix, storing those certificates as Kubernetes Secrets, and configuring both Typha and Felix to use them. All steps must be completed before Typha can accept Felix connections securely.

## Prerequisites

- `openssl` installed on the control plane node
- `kubectl` access to the cluster
- Calico namespace `calico-system` exists

## Step 1: Generate the Typha Certificate Authority

The CA is the root of trust. All certificates must be signed by this CA.

```bash
cd /etc/calico/pki
mkdir -p /etc/calico/pki

# Generate CA private key and self-signed certificate
openssl req -x509 -newkey rsa:4096 \
  -keyout /etc/calico/pki/typha-ca.key \
  -out /etc/calico/pki/typha-ca.crt \
  -days 3650 \
  -nodes \
  -subj "/CN=calico-typha-ca/O=Calico"
```

Secure the CA private key - it should not leave the control plane.

```bash
chmod 600 /etc/calico/pki/typha-ca.key
```

## Step 2: Generate the Typha Server Certificate

```bash
# Generate private key and CSR for Typha server
openssl req -newkey rsa:4096 \
  -keyout /etc/calico/pki/typha-server.key \
  -out /etc/calico/pki/typha-server.csr \
  -nodes \
  -subj "/CN=calico-typha/O=Calico"

# Create a SAN extension file
cat > /etc/calico/pki/typha-server.ext << EOF
subjectAltName = DNS:calico-typha.calico-system.svc,DNS:calico-typha.calico-system.svc.cluster.local,IP:127.0.0.1
EOF

# Sign the server certificate with the CA
openssl x509 -req \
  -in /etc/calico/pki/typha-server.csr \
  -CA /etc/calico/pki/typha-ca.crt \
  -CAkey /etc/calico/pki/typha-ca.key \
  -CAcreateserial \
  -out /etc/calico/pki/typha-server.crt \
  -days 365 \
  -extfile /etc/calico/pki/typha-server.ext
```

## Step 3: Generate the Felix Client Certificate

```bash
# Generate private key and CSR for Felix client
openssl req -newkey rsa:4096 \
  -keyout /etc/calico/pki/felix-client.key \
  -out /etc/calico/pki/felix-client.csr \
  -nodes \
  -subj "/CN=calico-felix/O=Calico"

# Sign the Felix client certificate with the CA
openssl x509 -req \
  -in /etc/calico/pki/felix-client.csr \
  -CA /etc/calico/pki/typha-ca.crt \
  -CAkey /etc/calico/pki/typha-ca.key \
  -CAcreateserial \
  -out /etc/calico/pki/felix-client.crt \
  -days 365
```

## Step 4: Create Kubernetes Secrets

```bash
# Typha server TLS secret
kubectl create secret generic calico-typha-tls \
  --from-file=ca.crt=/etc/calico/pki/typha-ca.crt \
  --from-file=tls.crt=/etc/calico/pki/typha-server.crt \
  --from-file=tls.key=/etc/calico/pki/typha-server.key \
  -n calico-system

# Felix client TLS secret (for Kubernetes DaemonSet deployments)
kubectl create secret generic calico-felix-typha-tls \
  --from-file=ca.crt=/etc/calico/pki/typha-ca.crt \
  --from-file=tls.crt=/etc/calico/pki/felix-client.crt \
  --from-file=tls.key=/etc/calico/pki/felix-client.key \
  -n calico-system
```

## Step 5: Configure Typha to Use TLS

Update the Typha Deployment to mount and use the TLS secret.

```bash
kubectl patch deployment calico-typha -n calico-system --patch '{
  "spec": {"template": {"spec": {
    "containers": [{"name": "calico-typha", "env": [
      {"name": "TYPHA_CAFILE", "value": "/typha-tls/ca.crt"},
      {"name": "TYPHA_SERVERCERTFILE", "value": "/typha-tls/tls.crt"},
      {"name": "TYPHA_SERVERKEYFILE", "value": "/typha-tls/tls.key"}
    ], "volumeMounts": [
      {"name": "typha-tls", "mountPath": "/typha-tls", "readOnly": true}
    ]}],
    "volumes": [{"name": "typha-tls", "secret": {"secretName": "calico-typha-tls"}}]
  }}}
}'
```

## Step 6: Configure Felix to Use the Client Certificate

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "typhaCAFile": "/felix-tls/ca.crt",
    "tymphaCertFile": "/felix-tls/tls.crt",
    "typhaKeyFile": "/felix-tls/tls.key"
  }}'
```

## Step 7: Verify TLS Is Active

```bash
# Check Typha accepted a TLS-authenticated connection
kubectl logs -n calico-system deployment/calico-typha | grep -i "tls\|connected" | tail -10
```

## Conclusion

Setting up Typha TLS in a hard way installation requires generating a CA, signing server and client certificates, storing them as Kubernetes Secrets, and configuring both Typha and Felix to use the certificates. The SAN extension in the server certificate ensures that Felix can verify Typha's hostname when it connects via the Kubernetes Service DNS name.
