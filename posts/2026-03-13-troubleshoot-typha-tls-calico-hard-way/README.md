# How to Troubleshoot Typha TLS in a Calico Hard Way Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Typha, Kubernetes, Networking, TLS, Troubleshooting, Hard Way

Description: A guide to diagnosing and resolving Typha TLS failures including certificate mismatch, expired certificates, CN verification failures, and secret misconfiguration.

---

## Introduction

Typha TLS failures are the most common cause of Felix-to-Typha connectivity issues in hard way installations. The failures are often silent - Felix logs show connection errors but may not clearly indicate TLS as the root cause. A systematic diagnostic approach starting from the certificate content and working outward to the runtime connection resolves the majority of TLS issues.

## Diagnostic Decision Tree

```plaintext
Felix cannot connect to Typha
  ├─ Is Typha pod running? → kubectl get pods -n kube-system -l k8s-app=calico-typha
  ├─ Is the Typha service endpoint populated? → kubectl get endpoints calico-typha -n kube-system
  └─ TLS investigation:
       ├─ Are certificates expired?
       ├─ Are both certificates signed by the CA in calico-typha-ca?
       ├─ Does the server CN match FELIX_TYPHACN?
       └─ Is the client CN matching TYPHA_CLIENTCN?
```

## Issue 1: Expired Certificates

**Symptom:** Typha logs show `certificate has expired` or Felix logs show `TLS handshake error`.

```bash
# Check expiry

kubectl get secret calico-typha-certs -n kube-system \
  -o jsonpath='{.data.typha\.crt}' | base64 -d | openssl x509 -enddate -noout

kubectl get secret calico-node-certs -n kube-system \
  -o jsonpath='{.data.calico-node\.crt}' | base64 -d | openssl x509 -enddate -noout
```

**Resolution:**

```bash
# Regenerate expired certificates
openssl req -newkey rsa:4096 -keyout /etc/calico/pki/typha-server-new.key \
  -out /etc/calico/pki/typha-server-new.csr -nodes -subj "/CN=calico-typha"
openssl x509 -req -in /etc/calico/pki/typha-server-new.csr \
  -CA /etc/calico/pki/typha-ca.crt -CAkey /etc/calico/pki/typha-ca.key \
  -CAcreateserial -out /etc/calico/pki/typha-server-new.crt -days 365

kubectl create secret generic calico-typha-certs -n kube-system \
  --from-file=typha.crt=/etc/calico/pki/typha-server-new.crt \
  --from-file=typha.key=/etc/calico/pki/typha-server-new.key \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl rollout restart deployment/calico-typha -n kube-system
```

## Issue 2: CA Certificate Mismatch

**Symptom:** `certificate signed by unknown authority` in Typha or Felix logs.

```bash
kubectl get configmap calico-typha-ca -n kube-system \
  -o jsonpath='{.data.typhaca\.crt}' > /tmp/typhaca.crt

kubectl get secret calico-typha-certs -n kube-system \
  -o jsonpath='{.data.typha\.crt}' | base64 -d > /tmp/typha.crt

kubectl get secret calico-node-certs -n kube-system \
  -o jsonpath='{.data.calico-node\.crt}' | base64 -d > /tmp/calico-node.crt

openssl verify -CAfile /tmp/typhaca.crt /tmp/typha.crt /tmp/calico-node.crt
```

**Resolution:** Update the shared CA ConfigMap and regenerate any Typha or `calico/node` certificate that was not signed by that CA.

```bash
kubectl create configmap calico-typha-ca -n kube-system \
  --from-file=typhaca.crt=/etc/calico/pki/typha-ca.crt \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl rollout restart deployment/calico-typha -n kube-system
kubectl rollout restart daemonset/calico-node -n kube-system
```

## Issue 3: Server Certificate CN Mismatch

**Symptom:** Felix connects to Typha but rejects the server certificate because its Common Name does not match `FELIX_TYPHACN`.

```bash
# Check the CN in the Typha server cert
kubectl get secret calico-typha-certs -n kube-system \
  -o jsonpath='{.data.typha\.crt}' | base64 -d | openssl x509 -noout -subject

# Check the CN Felix requires
kubectl get daemonset calico-node -n kube-system -o yaml | grep FELIX_TYPHACN
```

Expected CN in the hard way installation: `calico-typha`

**Resolution:** Regenerate the server certificate with the correct CN, or update `FELIX_TYPHACN` to match the current certificate CN.

## Issue 4: Client CN Not Matching TYPHA_CLIENTCN

**Symptom:** Typha log shows the client CN does not match the configured `TYPHA_CLIENTCN`.

```bash
# Check what CN is in the calico/node client certificate
kubectl get secret calico-node-certs -n kube-system \
  -o jsonpath='{.data.calico-node\.crt}' | base64 -d | openssl x509 -noout -subject

# Check what CN Typha requires
kubectl get deployment calico-typha -n kube-system -o yaml | grep TYPHA_CLIENTCN
```

Expected CN in the hard way installation: `calico-node`

**Resolution:** Either regenerate the `calico/node` certificate with the matching CN, or update `TYPHA_CLIENTCN` to match the current certificate CN.

## Issue 5: Secret Not Mounted in Typha Pod

**Symptom:** Typha cannot load the certificate or key configured by `TYPHA_SERVERCERTFILE` and `TYPHA_SERVERKEYFILE`.

```bash
kubectl describe pod -n kube-system -l k8s-app=calico-typha | grep -A10 "Volumes:"
```

If `calico-typha-certs` is not listed in volumes, update the Deployment to mount the Secret.

## Issue 6: Felix Configuration Points to Wrong Typha Service

```bash
calicoctl get felixconfig default -o yaml | grep -i typha
kubectl get daemonset calico-node -n kube-system -o yaml | grep FELIX_TYPHAK8S
```

Verify `TyphaK8sServiceName` or `FELIX_TYPHAK8SSERVICENAME`, and `TyphaK8sNamespace` or `FELIX_TYPHAK8SNAMESPACE`, match the actual Service name and namespace.

## Conclusion

Troubleshooting Typha TLS follows a systematic path from certificate content (expiry, CA trust, CN verification) through runtime behavior (Secret mounting and Felix configuration). The most frequent issues are CA certificate mismatches between the shared CA and the Typha or `calico/node` certificates, and CN mismatches in the Typha or `calico/node` certificates. Resolving these requires regenerating the affected certificates and updating the corresponding Kubernetes Secret or ConfigMap.
