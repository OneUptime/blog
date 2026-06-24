# How to Configure Typha TLS in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, TLS, Configuration, Hard Way

Description: A guide to configuring Typha TLS parameters including CN verification, cipher suites, and TLS version requirements in a manually installed Calico cluster.

---

## Introduction

After generating TLS certificates and creating Kubernetes Secrets, configuring how Typha validates client certificates provides additional security controls. Typha supports CN-based client verification (requiring Felix to present a certificate with a specific Common Name) and URI SAN-based verification. These controls harden the mTLS setup beyond the basic certificate exchange.

## Step 1: Configure Required Client CN

Typha can require that connecting Felix agents present a certificate with a specific CN. This adds an extra layer of verification beyond certificate validity.

```bash
kubectl set env deployment/calico-typha -n calico-system \
  TYPHA_CLIENTCN=calico-felix
```

Felix certificates generated with `CN=calico-felix` will be accepted. Certificates with any other CN will be rejected even if they are signed by the trusted CA.

Verify the CN on the Felix client certificate.

```bash
kubectl get secret calico-felix-typha-tls -n calico-system \
  -o jsonpath='{.data.tls\.crt}' | base64 -d | \
  openssl x509 -noout -subject | grep "CN ="
```

## Step 2: Confirm TLS Version and Cipher Policy

Calico Typha does not expose a `TYPHA_MINTLSVERSION` or cipher-suite configuration parameter for Felix-to-Typha connections. The supported Typha TLS controls are the CA file, server certificate and key, and the required Felix client identity (`TYPHA_CLIENTCN` or `TYPHA_CLIENTURISAN`).

```bash
kubectl get deployment/calico-typha -n calico-system -o yaml | \
  grep -E "TYPHA_CAFILE|TYPHA_SERVERCERTFILE|TYPHA_SERVERKEYFILE|TYPHA_CLIENTCN|TYPHA_CLIENTURISAN"
```

If your environment requires explicit TLS version or cipher-suite enforcement for this connection, enforce that outside of Typha with your platform's TLS policy controls.

## Step 3: Configure TLS on the Felix Side

Felix configuration parameters for TLS connections to Typha.

```bash
kubectl patch daemonset calico-node -n calico-system --type=strategic --patch '{
  "spec": {"template": {"spec": {
    "containers": [{
      "name": "calico-node",
      "env": [
        {"name": "FELIX_TYPHACAFILE", "value": "/felix-tls/ca.crt"},
        {"name": "FELIX_TYPHACERTFILE", "value": "/felix-tls/tls.crt"},
        {"name": "FELIX_TYPHAKEYFILE", "value": "/felix-tls/tls.key"},
        {"name": "FELIX_TYPHACN", "value": "calico-typha"}
      ],
      "volumeMounts": [{
        "name": "felix-typha-tls",
        "mountPath": "/felix-tls",
        "readOnly": true
      }]
    }],
    "volumes": [{
      "name": "felix-typha-tls",
      "secret": {"secretName": "calico-felix-typha-tls"}
    }]
  }}}
}'
```

The `FELIX_TYPHACN` setting specifies the expected Common Name that Felix uses when authenticating Typha. It must match the CN in Typha's server certificate. If you use URI SAN identities instead, set `FELIX_TYPHAURISAN` to the Typha URI SAN value.

## Step 4: Verify Certificate-to-Configuration Alignment

```bash
# Typha server certificate CN/SAN

kubectl get secret calico-typha-tls -n calico-system \
  -o jsonpath='{.data.tls\.crt}' | base64 -d | \
  openssl x509 -noout -text | grep -A5 "Subject:\|Subject Alternative"

# Felix TLS configuration
kubectl get daemonset/calico-node -n calico-system -o yaml | \
  grep -i "FELIX_TYPHACN\|FELIX_TYPHAURISAN\|FELIX_TYPHACERTFILE"
```

The Felix Typha identity setting must match the Typha server certificate: `FELIX_TYPHACN` for Common Name verification, or `FELIX_TYPHAURISAN` for URI SAN verification.

## Step 5: Configure Certificate Path for Binary Felix

For hard way installations where Felix runs as a binary (not a container), certificates are files on each node.

```bash
# Copy certificates to each worker node
for node in $(kubectl get nodes -o name | grep worker); do
  NODE_IP=$(kubectl get $node -o jsonpath='{.status.addresses[0].address}')
  scp /etc/calico/pki/typha-ca.crt ubuntu@$NODE_IP:/etc/calico/typha-ca.crt
  scp /etc/calico/pki/felix-client.crt ubuntu@$NODE_IP:/etc/calico/felix.crt
  scp /etc/calico/pki/felix-client.key ubuntu@$NODE_IP:/etc/calico/felix.key
done
```

Configure Felix on each node.

```ini
# /etc/calico/felix.cfg on each node
[global]
TyphaAddr = calico-typha.calico-system.svc.cluster.local:5473
TyphaCAFile = /etc/calico/typha-ca.crt
TyphaCertFile = /etc/calico/felix.crt
TyphaKeyFile = /etc/calico/felix.key
TyphaCN = calico-typha
```

## Step 6: Restart Components After TLS Configuration Changes

```bash
kubectl rollout restart deployment/calico-typha -n calico-system
kubectl rollout status deployment/calico-typha -n calico-system

# For container-based Felix
kubectl rollout restart daemonset/calico-node -n calico-system
kubectl rollout status daemonset/calico-node -n calico-system
```

## Step 7: Verify TLS Configuration Is Active

```bash
kubectl logs -n calico-system deployment/calico-typha | grep -i "tls\|certificate\|client" | tail -10
```

## Conclusion

Configuring Typha TLS beyond the basic certificate setup involves enforcing specific Felix client CN values and ensuring that the Typha identity in Felix's configuration matches the Typha server certificate. For binary-based Felix installations, certificates must be distributed to each node manually and referenced in the local Felix configuration file. Together these configurations create a hardened mTLS setup that meets security audit requirements for production Calico clusters.
