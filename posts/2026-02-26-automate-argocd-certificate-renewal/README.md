# Automate ArgoCD Certificate Renewal

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Security, TLS

Description: Learn how to automate ArgoCD TLS certificate renewal using cert-manager, shell scripts, and Kubernetes CronJobs to prevent expired certificates from breaking your GitOps pipeline.

---

An expired TLS certificate on your ArgoCD server means broken UI access, failed CLI connections, and potentially stalled deployments. Certificate renewal is one of those tasks that is easy to forget until it causes an outage. This guide covers several approaches to automating ArgoCD certificate renewal so you never deal with an expired cert again.

## ArgoCD Certificate Architecture

ArgoCD uses TLS certificates in several places:

- **ArgoCD Server TLS** - the certificate for the ArgoCD API and UI (argocd-server)
- **Repository Server TLS** - internal communication between ArgoCD components
- **Dex Server TLS** - if using Dex for SSO authentication
- **Redis TLS** - if TLS is enabled for the Redis cache
- **Repository TLS certificates** - CA certs for trusting private Git servers, stored in argocd-tls-certs-cm

Each has different renewal requirements and automation approaches.

## Using cert-manager for Automatic Renewal

The most robust approach is using cert-manager, which handles certificate lifecycle automatically.

First, install a Certificate resource for ArgoCD:

```yaml
# argocd-certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: argocd-server-tls
  namespace: argocd
spec:
  secretName: argocd-server-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - argocd.example.com
    - argocd-grpc.example.com
  duration: 2160h      # 90 days
  renewBefore: 360h    # Renew 15 days before expiry
  privateKey:
    algorithm: ECDSA
    size: 256
  usages:
    - server auth
    - digital signature
    - key encipherment
```

Configure ArgoCD to use the cert-manager-managed secret:

```yaml
# argocd-server deployment patch
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-server
          args:
            - /usr/local/bin/argocd-server
            - --tls-cert-file=/tls/tls.crt
            - --tls-key-file=/tls/tls.key
          volumeMounts:
            - name: tls
              mountPath: /tls
              readOnly: true
      volumes:
        - name: tls
          secret:
            secretName: argocd-server-tls
```

With this setup, cert-manager automatically renews the certificate before expiry.

## Ingress-Based TLS with cert-manager

If you expose ArgoCD through an Ingress controller, the certificate management is even simpler:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server
  namespace: argocd
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/backend-protocol: HTTPS
    nginx.ingress.kubernetes.io/ssl-passthrough: "false"
spec:
  tls:
    - hosts:
        - argocd.example.com
      secretName: argocd-ingress-tls
  rules:
    - host: argocd.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 443
```

In this case, ArgoCD itself can run with `--insecure` flag and let the Ingress controller handle TLS termination:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  server.insecure: "true"
```

## Script-Based Certificate Renewal

For environments without cert-manager, here is a script-based approach:

```bash
#!/bin/bash
# renew-argocd-certs.sh - Renew ArgoCD TLS certificates
set -euo pipefail

NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"
DOMAIN="${ARGOCD_DOMAIN:?Set ARGOCD_DOMAIN}"
CERT_DIR="/tmp/argocd-certs"
BACKUP_DIR="/backups/certs"

mkdir -p "${CERT_DIR}" "${BACKUP_DIR}"

echo "Renewing ArgoCD TLS certificates for ${DOMAIN}"

# Step 1: Check current certificate expiry
echo "Checking current certificate..."
CURRENT_EXPIRY=$(kubectl get secret argocd-server-tls -n "${NAMESPACE}" -o jsonpath='{.data.tls\.crt}' 2>/dev/null | \
  base64 -d | openssl x509 -enddate -noout 2>/dev/null | cut -d= -f2 || echo "not found")
echo "Current certificate expires: ${CURRENT_EXPIRY}"

# Step 2: Backup existing certificate
echo "Backing up current certificate..."
kubectl get secret argocd-server-tls -n "${NAMESPACE}" -o yaml > \
  "${BACKUP_DIR}/argocd-server-tls-$(date +%Y%m%d).yaml" 2>/dev/null || true

# Step 3: Generate new certificate using ACME (certbot)
echo "Requesting new certificate..."
if command -v certbot &>/dev/null; then
  certbot certonly \
    --dns-route53 \
    --domain "${DOMAIN}" \
    --non-interactive \
    --agree-tos \
    --email "platform@example.com" \
    --cert-path "${CERT_DIR}/tls.crt" \
    --key-path "${CERT_DIR}/tls.key" \
    --fullchain-path "${CERT_DIR}/fullchain.pem"

  CERT_FILE="${CERT_DIR}/fullchain.pem"
  KEY_FILE="${CERT_DIR}/tls.key"
elif command -v acme.sh &>/dev/null; then
  acme.sh --issue --dns dns_aws -d "${DOMAIN}" \
    --cert-file "${CERT_DIR}/tls.crt" \
    --key-file "${CERT_DIR}/tls.key" \
    --fullchain-file "${CERT_DIR}/fullchain.pem"

  CERT_FILE="${CERT_DIR}/fullchain.pem"
  KEY_FILE="${CERT_DIR}/tls.key"
else
  echo "ERROR: Neither certbot nor acme.sh found"
  exit 1
fi

# Step 4: Update the Kubernetes secret
echo "Updating Kubernetes secret..."
kubectl create secret tls argocd-server-tls \
  -n "${NAMESPACE}" \
  --cert="${CERT_FILE}" \
  --key="${KEY_FILE}" \
  --dry-run=client -o yaml | kubectl apply -f -

# Step 5: Restart ArgoCD server to pick up new cert
echo "Restarting ArgoCD server..."
kubectl rollout restart deployment argocd-server -n "${NAMESPACE}"
kubectl rollout status deployment argocd-server -n "${NAMESPACE}" --timeout=120s

# Step 6: Verify the new certificate
echo "Verifying new certificate..."
sleep 10
NEW_EXPIRY=$(echo | openssl s_client -connect "${DOMAIN}:443" -servername "${DOMAIN}" 2>/dev/null | \
  openssl x509 -enddate -noout | cut -d= -f2)
echo "New certificate expires: ${NEW_EXPIRY}"

# Cleanup
rm -rf "${CERT_DIR}"

echo "Certificate renewal complete"
```

## Internal CA Certificate Rotation

For internal certificates used between ArgoCD components:

```bash
#!/bin/bash
# rotate-internal-certs.sh - Rotate ArgoCD internal component certificates
set -euo pipefail

NAMESPACE="${ARGOCD_NAMESPACE:-argocd}"
CERT_VALIDITY_DAYS=365
CA_DIR="/tmp/argocd-ca"

mkdir -p "${CA_DIR}"

echo "Generating new internal CA and component certificates..."

# Generate a new CA
openssl req -x509 -newkey rsa:4096 -sha256 -days ${CERT_VALIDITY_DAYS} \
  -nodes -keyout "${CA_DIR}/ca.key" -out "${CA_DIR}/ca.crt" \
  -subj "/CN=ArgoCD Internal CA/O=ArgoCD"

# Generate repo-server certificate
openssl req -newkey rsa:4096 -nodes \
  -keyout "${CA_DIR}/repo-server.key" \
  -out "${CA_DIR}/repo-server.csr" \
  -subj "/CN=argocd-repo-server/O=ArgoCD"

openssl x509 -req -in "${CA_DIR}/repo-server.csr" \
  -CA "${CA_DIR}/ca.crt" -CAkey "${CA_DIR}/ca.key" \
  -CAcreateserial -out "${CA_DIR}/repo-server.crt" \
  -days ${CERT_VALIDITY_DAYS} \
  -extfile <(printf "subjectAltName=DNS:argocd-repo-server,DNS:argocd-repo-server.${NAMESPACE}.svc")

# Update secrets
kubectl create secret tls argocd-repo-server-tls \
  -n "${NAMESPACE}" \
  --cert="${CA_DIR}/repo-server.crt" \
  --key="${CA_DIR}/repo-server.key" \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart affected components
kubectl rollout restart deployment argocd-repo-server -n "${NAMESPACE}"
kubectl rollout restart deployment argocd-server -n "${NAMESPACE}"
kubectl rollout restart deployment argocd-application-controller -n "${NAMESPACE}" 2>/dev/null || \
  kubectl rollout restart statefulset argocd-application-controller -n "${NAMESPACE}"

echo "Waiting for rollouts to complete..."
kubectl rollout status deployment argocd-repo-server -n "${NAMESPACE}" --timeout=120s
kubectl rollout status deployment argocd-server -n "${NAMESPACE}" --timeout=120s

rm -rf "${CA_DIR}"
echo "Internal certificate rotation complete"
```

## Certificate Expiry Monitoring

Set up a CronJob to check certificate expiry and alert before it is too late:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: argocd-cert-check
  namespace: argocd
spec:
  schedule: "0 8 * * *"    # Daily at 8 AM
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: argocd-cert-checker
          restartPolicy: OnFailure
          containers:
            - name: checker
              image: bitnami/kubectl:1.28
              command:
                - /bin/bash
                - -c
                - |
                  WARN_DAYS=30
                  NAMESPACE=argocd

                  # Check all TLS secrets in argocd namespace
                  kubectl get secrets -n ${NAMESPACE} -o json | \
                    jq -r '.items[] | select(.type == "kubernetes.io/tls") | .metadata.name' | \
                    while read secret; do
                      EXPIRY=$(kubectl get secret ${secret} -n ${NAMESPACE} \
                        -o jsonpath='{.data.tls\.crt}' | base64 -d | \
                        openssl x509 -enddate -noout 2>/dev/null | cut -d= -f2)

                      if [[ -n "${EXPIRY}" ]]; then
                        EXPIRY_EPOCH=$(date -d "${EXPIRY}" +%s 2>/dev/null || echo 0)
                        NOW_EPOCH=$(date +%s)
                        DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

                        if [[ ${DAYS_LEFT} -lt ${WARN_DAYS} ]]; then
                          echo "WARNING: ${secret} expires in ${DAYS_LEFT} days (${EXPIRY})"
                        else
                          echo "OK: ${secret} expires in ${DAYS_LEFT} days"
                        fi
                      fi
                    done
```

## Summary

Automating ArgoCD certificate renewal eliminates one of the most preventable causes of GitOps pipeline failures. The best approach depends on your environment: use cert-manager for fully automated Let's Encrypt certificates, Ingress-based TLS for simple setups, or script-based renewal for custom CA environments. Regardless of the method, always monitor certificate expiry dates and set up alerts well before expiration. Pair certificate monitoring with [OneUptime](https://oneuptime.com) to get notified about expiring certificates across your entire infrastructure, not just ArgoCD.
