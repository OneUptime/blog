# Understanding ArgoCD argocd-tls-certs-cm Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, TLS, Security

Description: A detailed guide to the ArgoCD argocd-tls-certs-cm ConfigMap, covering custom CA certificates, private Git server TLS trust, and troubleshooting certificate verification errors.

---

The `argocd-tls-certs-cm` ConfigMap stores custom TLS CA certificates that ArgoCD trusts when connecting to HTTPS Git repositories and Helm chart registries. If your organization uses a private CA, self-signed certificates, or an internal certificate authority for Git servers, this ConfigMap is how you tell ArgoCD to trust those certificates.

## Why You Need Custom TLS Certificates

ArgoCD, like most software, ships with a set of trusted public CA certificates (the Mozilla CA bundle). This covers public services like GitHub, GitLab.com, and Bitbucket Cloud. However, it does not cover:

- Self-hosted Git servers with self-signed certificates
- Git servers behind corporate proxies with TLS inspection
- Internal Git servers using certificates from a private CA
- Helm chart registries with custom certificates

Without the proper CA certificate in this ConfigMap, ArgoCD shows the dreaded `x509: certificate signed by unknown authority` error.

## ConfigMap Structure

The ConfigMap uses the Git server hostname as the key and the PEM-encoded CA certificate as the value:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-tls-certs-cm
  namespace: argocd
  labels:
    app.kubernetes.io/name: argocd-tls-certs-cm
    app.kubernetes.io/part-of: argocd
data:
  # Key = server hostname, Value = PEM certificate
  git.internal.example.com: |
    -----BEGIN CERTIFICATE-----
    MIIDkzCCAnugAwIBAgIUB...
    -----END CERTIFICATE-----
  registry.internal.example.com: |
    -----BEGIN CERTIFICATE-----
    MIIDpTCCAo2gAwIBAgIUX...
    -----END CERTIFICATE-----
```

## Adding a Custom CA Certificate

### Step 1: Get the CA Certificate

Obtain the CA certificate from your infrastructure team, or extract it from the server:

```bash
# Extract the CA certificate from a server
openssl s_client -connect git.internal.example.com:443 -showcerts </dev/null 2>/dev/null | \
  openssl x509 -outform PEM > ca-cert.pem

# If the server uses a certificate chain, get the root CA
openssl s_client -connect git.internal.example.com:443 -showcerts </dev/null 2>/dev/null | \
  awk '/-----BEGIN CERTIFICATE-----/{found=1} found{print} /-----END CERTIFICATE-----/{found=0}' | \
  tail -n +$(grep -n "BEGIN CERTIFICATE" /dev/stdin | tail -1 | cut -d: -f1) > root-ca.pem

# Verify the certificate
openssl x509 -in ca-cert.pem -text -noout | head -20
```

### Step 2: Add to the ConfigMap

```bash
# Using kubectl patch
CA_CERT=$(cat ca-cert.pem)
kubectl patch configmap argocd-tls-certs-cm -n argocd --type merge -p "{
  \"data\": {
    \"git.internal.example.com\": $(echo "${CA_CERT}" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
  }
}"
```

Or apply declaratively:

```bash
# Using kubectl create from file
kubectl create configmap argocd-tls-certs-cm \
  -n argocd \
  --from-file=git.internal.example.com=ca-cert.pem \
  --dry-run=client -o yaml | kubectl apply -f -
```

### Step 3: Verify

No restart is needed. ArgoCD picks up the new certificates automatically. Test the connection:

```bash
argocd repo add https://git.internal.example.com/org/repo.git \
  --username admin \
  --password secret

argocd repo list
```

## Using the ArgoCD CLI

ArgoCD provides CLI commands for managing TLS certificates:

```bash
# List all custom TLS certificates
argocd cert list --cert-type https

# Add a certificate from a file
argocd cert add-tls git.internal.example.com --from ca-cert.pem

# Remove a certificate
argocd cert rm-tls git.internal.example.com
```

## Certificate Chain Configuration

If your Git server uses an intermediate CA, you may need to include the full certificate chain:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-tls-certs-cm
  namespace: argocd
data:
  git.internal.example.com: |
    -----BEGIN CERTIFICATE-----
    <Intermediate CA Certificate>
    -----END CERTIFICATE-----
    -----BEGIN CERTIFICATE-----
    <Root CA Certificate>
    -----END CERTIFICATE-----
```

The order matters: include the intermediate CA first, then the root CA.

## Multiple Servers with the Same CA

If multiple Git servers share the same CA, you need a separate entry for each hostname:

```yaml
data:
  git.internal.example.com: |
    -----BEGIN CERTIFICATE-----
    <same CA cert>
    -----END CERTIFICATE-----
  gitlab.internal.example.com: |
    -----BEGIN CERTIFICATE-----
    <same CA cert>
    -----END CERTIFICATE-----
  registry.internal.example.com: |
    -----BEGIN CERTIFICATE-----
    <same CA cert>
    -----END CERTIFICATE-----
```

To simplify this with a script:

```bash
#!/bin/bash
# add-ca-to-hosts.sh - Add the same CA cert for multiple hosts
CA_CERT_FILE="${1:?Usage: $0 <ca-cert.pem> <host1> <host2> ...}"
shift
HOSTS=("$@")
NAMESPACE="argocd"

CA_CERT=$(cat "${CA_CERT_FILE}")

for host in "${HOSTS[@]}"; do
  echo "Adding CA certificate for: ${host}"
  kubectl patch configmap argocd-tls-certs-cm -n "${NAMESPACE}" --type merge -p "{
    \"data\": {
      \"${host}\": $(echo "${CA_CERT}" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
    }
  }"
done

echo "Done. Added CA cert for ${#HOSTS[@]} hosts."
```

Usage:

```bash
./add-ca-to-hosts.sh internal-ca.pem git.example.com gitlab.example.com registry.example.com
```

## Troubleshooting Certificate Issues

### x509: certificate signed by unknown authority

This is the most common error. The CA that signed the server's certificate is not trusted:

```bash
# Step 1: Get the server's certificate details
openssl s_client -connect git.internal.example.com:443 </dev/null 2>/dev/null | \
  openssl x509 -text -noout | grep -A2 "Issuer:"

# Step 2: Check what ArgoCD currently trusts
kubectl get configmap argocd-tls-certs-cm -n argocd -o yaml

# Step 3: Add the missing CA certificate
```

### x509: certificate has expired

The CA certificate in the ConfigMap may have expired:

```bash
# Check certificate expiry
kubectl get configmap argocd-tls-certs-cm -n argocd -o jsonpath='{.data}' | \
  python3 -c "
import json, sys, subprocess
data = json.load(sys.stdin)
for host, cert in data.items():
    result = subprocess.run(['openssl', 'x509', '-enddate', '-noout'],
                          input=cert, capture_output=True, text=True)
    print(f'{host}: {result.stdout.strip()}')"
```

### Certificate for Wrong Hostname

If the certificate in the ConfigMap does not match the hostname ArgoCD is connecting to:

```bash
# Check the certificate's Subject Alternative Names
openssl s_client -connect git.internal.example.com:443 </dev/null 2>/dev/null | \
  openssl x509 -text -noout | grep -A1 "Subject Alternative Name"
```

### Testing from the Repo Server Pod

For advanced debugging, test directly from the ArgoCD repo server:

```bash
kubectl exec -it -n argocd deployment/argocd-repo-server -- bash

# Check the mounted certificates
ls /app/config/tls/

# Test HTTPS connectivity
curl -v https://git.internal.example.com/api/v4/projects 2>&1 | head -30

# If that fails, try with the CA cert explicitly
curl --cacert /app/config/tls/git.internal.example.com https://git.internal.example.com/api/v4/projects
```

## Skipping TLS Verification

As a last resort (not recommended for production), you can skip TLS verification for a specific repository:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: repo-internal-git
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  url: "https://git.internal.example.com/org/repo.git"
  username: "admin"
  password: "token"
  insecure: "true"    # Skips TLS verification - NOT recommended
```

Or via CLI:

```bash
argocd repo add https://git.internal.example.com/org/repo.git \
  --username admin \
  --password token \
  --insecure-skip-server-verification
```

## Automating Certificate Updates

Set up a CronJob to check and update CA certificates automatically:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: argocd-cert-updater
  namespace: argocd
spec:
  schedule: "0 0 * * 0"    # Weekly on Sunday
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: argocd-cert-updater
          restartPolicy: OnFailure
          containers:
            - name: updater
              image: bitnami/kubectl:1.28
              command:
                - /bin/bash
                - -c
                - |
                  HOSTS="git.internal.example.com gitlab.internal.example.com"
                  for host in ${HOSTS}; do
                    echo "Checking certificate for ${host}..."
                    CERT=$(echo | openssl s_client -connect ${host}:443 -showcerts 2>/dev/null | \
                      openssl x509 -outform PEM)
                    if [[ -n "${CERT}" ]]; then
                      kubectl patch configmap argocd-tls-certs-cm -n argocd --type merge \
                        -p "{\"data\":{\"${host}\": \"${CERT}\"}}"
                      echo "Updated certificate for ${host}"
                    fi
                  done
```

## Summary

The `argocd-tls-certs-cm` ConfigMap is your gateway to connecting ArgoCD with Git servers and registries that use custom or private TLS certificates. The key structure is simple - hostname as the key, PEM certificate as the value - but getting it right is critical for avoiding frustrating `x509` errors. Always prefer adding the correct CA certificate over disabling TLS verification, and automate certificate updates to prevent unexpected connectivity failures when certificates rotate.
