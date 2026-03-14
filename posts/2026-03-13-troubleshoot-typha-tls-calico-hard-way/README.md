# How to Troubleshoot Typha TLS in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, TLS, Troubleshooting, Hard Way

Description: A guide to diagnosing and resolving Typha TLS failures including certificate mismatch, expired certificates, CN verification failures, and secret misconfiguration.

---

## Introduction

Typha TLS failures are the most common cause of Felix-to-Typha connectivity issues in hard way installations. The failures are often silent — Felix logs show connection errors but may not clearly indicate TLS as the root cause. A systematic diagnostic approach starting from the certificate content and working outward to the runtime connection resolves the majority of TLS issues.

## Diagnostic Decision Tree

```
Felix cannot connect to Typha
  ├─ Is Typha pod running? → kubectl get pods -n calico-system -l k8s-app=calico-typha
  ├─ Is the Typha service endpoint populated? → kubectl get endpoints calico-typha -n calico-system
  └─ TLS investigation:
       ├─ Are certificates expired?
       ├─ Do CA certs match on both sides?
       ├─ Is the server CN/SAN valid for the service hostname?
       └─ Is the client CN matching TYPHA_CLIENTCN?
```

## Issue 1: Expired Certificates

**Symptom:** Typha logs show `certificate has expired` or Felix logs show `TLS handshake error`.

```bash
# Check expiry
for secret in calico-typha-tls calico-felix-typha-tls; do
  echo "=== $secret ==="
  kubectl get secret $secret -n calico-system \
    -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -enddate -noout
done
```

**Resolution:**

```bash
# Regenerate expired certificates
openssl req -newkey rsa:4096 -keyout /etc/calico/pki/typha-server-new.key \
  -out /etc/calico/pki/typha-server-new.csr -nodes -subj "/CN=calico-typha"
openssl x509 -req -in /etc/calico/pki/typha-server-new.csr \
  -CA /etc/calico/pki/typha-ca.crt -CAkey /etc/calico/pki/typha-ca.key \
  -CAcreateserial -out /etc/calico/pki/typha-server-new.crt -days 365

kubectl create secret generic calico-typha-tls \
  --from-file=ca.crt=/etc/calico/pki/typha-ca.crt \
  --from-file=tls.crt=/etc/calico/pki/typha-server-new.crt \
  --from-file=tls.key=/etc/calico/pki/typha-server-new.key \
  -n calico-system --dry-run=client -o yaml | kubectl apply -f -

kubectl rollout restart deployment/calico-typha -n calico-system
```

## Issue 2: CA Certificate Mismatch

**Symptom:** `certificate signed by unknown authority` in Typha or Felix logs.

```bash
TYPHA_CA=$(kubectl get secret calico-typha-tls -n calico-system -o jsonpath='{.data.ca\.crt}')
FELIX_CA=$(kubectl get secret calico-felix-typha-tls -n calico-system -o jsonpath='{.data.ca\.crt}')
[ "$TYPHA_CA" = "$FELIX_CA" ] && echo "MATCH" || echo "MISMATCH — update Felix CA to match Typha CA"
```

**Resolution:** Copy the CA cert from the Typha Secret to the Felix Secret.

```bash
CA_DATA=$(kubectl get secret calico-typha-tls -n calico-system -o jsonpath='{.data.ca\.crt}')
kubectl patch secret calico-felix-typha-tls -n calico-system \
  --patch "{\"data\":{\"ca.crt\":\"$CA_DATA\"}}"
kubectl rollout restart daemonset/calico-node -n calico-system
```

## Issue 3: Server Certificate CN/SAN Mismatch

**Symptom:** Felix connects to Typha via the Service DNS name but the server certificate does not include that DNS name.

```bash
# Check SANs in Typha server cert
kubectl get secret calico-typha-tls -n calico-system \
  -o jsonpath='{.data.tls\.crt}' | base64 -d | \
  openssl x509 -noout -text | grep -A3 "Subject Alternative"
```

Expected SANs: `calico-typha.calico-system.svc`, `calico-typha.calico-system.svc.cluster.local`

**Resolution:** Regenerate the server certificate with the correct SANs.

## Issue 4: Client CN Not Matching TYPHA_CLIENTCN

**Symptom:** Typha log shows `client CN 'X' does not match required CN 'calico-felix'`.

```bash
# Check what CN is in the Felix client certificate
kubectl get secret calico-felix-typha-tls -n calico-system \
  -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -subject

# Check what CN Typha requires
kubectl get deployment calico-typha -n calico-system -o yaml | grep TYPHA_CLIENTCN
```

**Resolution:** Either regenerate the Felix certificate with the matching CN, or update `TYPHA_CLIENTCN` to match the current certificate CN.

## Issue 5: Secret Not Mounted in Typha Pod

**Symptom:** Typha starts but logs show it is using a self-generated certificate.

```bash
kubectl describe pod -n calico-system -l k8s-app=calico-typha | grep -A10 "Volumes:"
```

If `calico-typha-tls` is not listed in volumes, update the Deployment to mount the Secret.

## Issue 6: Felix Configuration Points to Wrong Typha Service

```bash
calicoctl get felixconfiguration default -o yaml | grep -i typha
```

Verify `typhak8sServiceName` and `typhak8sNamespace` match the actual Service name and namespace.

## Conclusion

Troubleshooting Typha TLS follows a systematic path from certificate content (expiry, CA match, SAN coverage) through runtime behavior (CN verification, Secret mounting, Felix configuration). The most frequent issues are CA certificate mismatches between the Typha and Felix Secrets, and missing SANs in the Typha server certificate. Resolving these requires regenerating the affected certificates and updating the corresponding Kubernetes Secrets.
