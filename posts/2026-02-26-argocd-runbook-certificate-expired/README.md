# ArgoCD Runbook: Certificate Expired

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, TLS, Runbook

Description: A step-by-step operational runbook for diagnosing and fixing expired certificates in ArgoCD, covering TLS server certificates, Git repository certificates, cluster certificates.

---

Certificate expiry in ArgoCD can manifest in many different ways depending on which certificate expired. The ArgoCD UI might become inaccessible, Git repository connections might fail, managed cluster connections might drop, or SSO login might break. Each scenario requires a different fix. This runbook covers all common certificate expiry scenarios in ArgoCD.

## Symptoms

Depending on which certificate expired, you will see one or more of these.

- **UI/API certificate:** Browser shows "Your connection is not private" or "NET::ERR_CERT_DATE_INVALID"
- **Repository certificate:** Applications show "ComparisonError" with TLS handshake errors
- **Cluster certificate:** Applications on remote clusters show "Unknown" status
- **Dex/OIDC certificate:** SSO login fails with certificate verification errors
- **Webhook certificate:** Git providers report webhook delivery failures

## Impact Assessment

**Severity:** P1 (server cert) to P3 (individual repo cert)

**Impact:** Varies by certificate type. Server cert expiry blocks all UI/API access. Repo cert expiry blocks syncs for affected repositories. Cluster cert expiry disconnects entire clusters.

## Diagnostic Steps

### Step 1: Identify Which Certificate Expired

```bash
# Check the ArgoCD server's TLS certificate
echo | openssl s_client -connect argocd.example.com:443 -servername argocd.example.com 2>/dev/null | openssl x509 -noout -dates -subject
# Check "notAfter" date

# Check repository TLS certificates
kubectl get configmap argocd-tls-certs-cm -n argocd -o json | \
  jq -r '.data | to_entries[] | "\(.key): \(.value)"' | \
  while read line; do
    host=$(echo "$line" | cut -d: -f1)
    echo "=== $host ==="
    echo "$line" | cut -d: -f2- | openssl x509 -noout -dates 2>/dev/null
  done

# Check cluster certificates
kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=cluster -o json | \
  jq -r '.items[] | .data.config' | base64 -d | \
  jq -r '.tlsClientConfig.caData // empty' | \
  while read cert; do
    echo "$cert" | base64 -d | openssl x509 -noout -dates 2>/dev/null
  done

# Check Dex certificates
kubectl logs -n argocd deployment/argocd-dex-server --tail=100 | grep -i "certificate\|expired\|x509"
```

### Step 2: Check ArgoCD Component Logs

```bash
# Server certificate issues
kubectl logs -n argocd deployment/argocd-server --tail=200 | grep -i "tls\|cert\|x509"

# Repo server certificate issues
kubectl logs -n argocd deployment/argocd-repo-server --tail=200 | grep -i "tls\|cert\|x509"

# Controller cluster certificate issues
kubectl logs -n argocd deployment/argocd-application-controller --tail=200 | grep -i "tls\|cert\|x509"
```

## Resolution by Certificate Type

### Type 1: ArgoCD Server TLS Certificate

This is the certificate that secures the ArgoCD UI and API endpoint.

#### If Using cert-manager

```bash
# Check the Certificate resource
kubectl get certificate -n argocd

# Check if the certificate has failed to renew
kubectl describe certificate argocd-server-tls -n argocd

# Check the cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager --tail=100 | grep argocd

# Force a certificate renewal
kubectl delete secret argocd-server-tls -n argocd
# cert-manager will automatically create a new one

# Restart the API server to pick up the new cert
kubectl rollout restart deployment/argocd-server -n argocd
```

#### If Using a Manually Managed Certificate

```bash
# Generate or obtain a new certificate
# Then update the TLS secret

kubectl create secret tls argocd-server-tls -n argocd \
  --cert=/path/to/new/tls.crt \
  --key=/path/to/new/tls.key \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart the API server
kubectl rollout restart deployment/argocd-server -n argocd
```

#### If Using the Self-Signed Certificate

ArgoCD generates a self-signed certificate by default. To regenerate it.

```bash
# Delete the existing TLS secret
kubectl delete secret argocd-server-tls -n argocd

# Restart the API server - it will generate a new self-signed cert
kubectl rollout restart deployment/argocd-server -n argocd

# Note: browsers will still show a certificate warning for self-signed certs
```

### Type 2: Git Repository Certificate

When ArgoCD connects to a Git repository over HTTPS, it validates the server's TLS certificate.

```bash
# Check which repos have custom certificates
kubectl get configmap argocd-tls-certs-cm -n argocd -o json | jq 'keys'

# If the repo uses a custom/private CA, update the CA certificate
# Get the new CA cert from your Git server admin

# Update the certificate in the ConfigMap
kubectl create configmap argocd-tls-certs-cm -n argocd \
  --from-file=git.internal.example.com=/path/to/new-ca-cert.pem \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart the repo server
kubectl rollout restart deployment/argocd-repo-server -n argocd
```

If the repository uses a public CA (like GitHub, GitLab.com), the issue is likely that the ArgoCD container's CA bundle is outdated. Upgrade ArgoCD to a newer version that includes updated CA certificates.

### Type 3: Managed Cluster Certificate

When a remote cluster's API server certificate expires or rotates.

```bash
# Check the current certificate stored for the cluster
CLUSTER_SECRET=$(kubectl get secrets -n argocd -l argocd.argoproj.io/secret-type=cluster -o json | \
  jq -r '.items[] | select(.data.server | @base64d | contains("<cluster-api-url>")) | .metadata.name')

# Check certificate expiry
kubectl get secret $CLUSTER_SECRET -n argocd -o jsonpath='{.data.config}' | \
  base64 -d | jq -r '.tlsClientConfig.caData' | base64 -d | \
  openssl x509 -noout -dates

# Fix: re-register the cluster
argocd cluster rm <cluster-server-url>
argocd cluster add <context-name> --name <cluster-name>
```

For managed Kubernetes services (EKS, GKE, AKS), the cluster certificate rotation is handled by the cloud provider, but ArgoCD needs to be updated with the new CA.

```bash
# EKS: get updated CA
aws eks describe-cluster --name <cluster> --query 'cluster.certificateAuthority.data' --output text

# GKE: get updated CA
gcloud container clusters describe <cluster> --zone <zone> --format='value(masterAuth.clusterCaCertificate)'
```

### Type 4: Dex/OIDC Certificate

If the identity provider's TLS certificate expired or was rotated.

```bash
# Check if Dex can reach the identity provider
kubectl logs -n argocd deployment/argocd-dex-server --tail=200 | grep -i "x509\|certificate"

# If the IdP uses a custom CA, update it
kubectl get configmap argocd-cm -n argocd -o yaml | grep -A5 "dex.config"

# Update the CA in the Dex configuration
# Add rootCA or rootCAData to the connector config
```

```yaml
# argocd-cm ConfigMap
data:
  dex.config: |
    connectors:
    - type: ldap
      config:
        host: ldap.example.com:636
        # Update with the new CA certificate
        rootCA: /etc/ssl/certs/ldap-ca.pem
        # Or embed it directly
        rootCAData: <base64-encoded-ca-cert>
```

## Setting Up Certificate Monitoring

Prevent future expiry by monitoring certificates proactively.

```yaml
# Prometheus alert for certificate expiry
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cert-expiry-alerts
  namespace: argocd
spec:
  groups:
  - name: certificate-expiry
    rules:
    # Alert 30 days before expiry
    - alert: ArgoCDCertExpiringSoon
      expr: |
        (probe_ssl_earliest_cert_expiry{job="argocd-tls-probe"} - time()) / 86400 < 30
      labels:
        severity: warning
      annotations:
        summary: "ArgoCD certificate expiring in {{ $value | humanizeDuration }}"

    # Alert 7 days before expiry
    - alert: ArgoCDCertExpiringCritical
      expr: |
        (probe_ssl_earliest_cert_expiry{job="argocd-tls-probe"} - time()) / 86400 < 7
      labels:
        severity: critical
      annotations:
        summary: "ArgoCD certificate expiring in {{ $value | humanizeDuration }}"
```

You can also use a simple script to check certificates periodically.

```bash
#!/bin/bash
# check-argocd-certs.sh
# Run this as a CronJob

# Check server certificate
EXPIRY=$(echo | openssl s_client -connect argocd.example.com:443 -servername argocd.example.com 2>/dev/null | \
  openssl x509 -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXPIRY" +%s)
NOW=$(date +%s)
DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW) / 86400 ))

if [ $DAYS_LEFT -lt 30 ]; then
  echo "WARNING: ArgoCD server certificate expires in $DAYS_LEFT days"
  # Send alert to your monitoring system
fi
```

## Prevention

1. Use cert-manager with automatic renewal for the ArgoCD server certificate
2. Set up certificate expiry monitoring with alerts at 30 and 7 days before expiry
3. For managed clusters, automate credential refresh on a schedule
4. Document all certificates in the ArgoCD deployment with their expiry dates and renewal process
5. Include certificate checks in your quarterly maintenance tasks

## Escalation

If a certificate cannot be renewed:

- For the server certificate: use a self-signed certificate as a temporary workaround
- For repository certificates: temporarily set `insecure: true` on the repo (not recommended for production)
- For cluster certificates: re-register the cluster with `argocd cluster add`
- Contact the team that manages the PKI infrastructure for your organization
