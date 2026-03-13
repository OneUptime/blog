# How to Configure Flux with Workload Identity for Cloud KMS on GKE

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, GCP, GKE, Workload Identity, Cloud KMS, SOPS, Secrets Management, Encryption

Description: Learn how to configure Flux to decrypt SOPS-encrypted secrets using Google Cloud KMS with GKE Workload Identity for keyless, secure secret management.

---

Managing secrets in a GitOps workflow requires encrypting them before they are committed to a Git repository. Flux integrates with Mozilla SOPS to decrypt secrets at apply time, and SOPS supports Google Cloud KMS as an encryption backend. By combining this with GKE Workload Identity, the Flux kustomize-controller can decrypt secrets using Cloud KMS without any static credentials. This guide walks through the complete setup.

## Prerequisites

Before you begin, ensure you have the following:

- A GKE cluster with Workload Identity enabled
- Flux installed on the cluster (v2.0 or later)
- Google Cloud CLI (`gcloud`) configured with appropriate permissions
- Mozilla SOPS CLI installed locally (v3.7 or later)
- `kubectl` configured to access your GKE cluster

Install SOPS if needed:

```bash
# macOS
brew install sops

# Linux
curl -sSL https://github.com/getsops/sops/releases/latest/download/sops-v3.9.0.linux.amd64 -o /usr/local/bin/sops
chmod +x /usr/local/bin/sops
```

## Step 1: Create a Cloud KMS Key Ring and Key

Create a KMS key ring and a symmetric encryption key for SOPS:

```bash
gcloud kms keyrings create flux-sops \
  --location=global

gcloud kms keys create sops-key \
  --location=global \
  --keyring=flux-sops \
  --purpose=encryption
```

Note the full resource name of the key, which you will need for SOPS configuration:

```bash
projects/my-project/locations/global/keyRings/flux-sops/cryptoKeys/sops-key
```

## Step 2: Create a Google Cloud Service Account

Create a service account that Flux will use to access the KMS key:

```bash
gcloud iam service-accounts create flux-kms-decrypter \
  --display-name="Flux Cloud KMS Decrypter"
```

Grant the service account permission to decrypt using the key:

```bash
gcloud kms keys add-iam-policy-binding sops-key \
  --location=global \
  --keyring=flux-sops \
  --member="serviceAccount:flux-kms-decrypter@my-project.iam.gserviceaccount.com" \
  --role="roles/cloudkms.cryptoKeyDecrypter"
```

If your developers also need to encrypt secrets locally, grant them the encrypter role on the same key.

## Step 3: Bind the Kubernetes Service Account to the GCP Service Account

Create the Workload Identity binding for the kustomize-controller, since it is the component responsible for decrypting SOPS secrets:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  flux-kms-decrypter@my-project.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:my-project.svc.id.goog[flux-system/kustomize-controller]"
```

## Step 4: Annotate the Flux Kubernetes Service Account

Annotate the kustomize-controller service account with the GCP service account:

```bash
kubectl annotate serviceaccount kustomize-controller \
  --namespace=flux-system \
  iam.gke.io/gcp-service-account=flux-kms-decrypter@my-project.iam.gserviceaccount.com
```

Restart the kustomize-controller to pick up the new identity:

```bash
kubectl rollout restart deployment/kustomize-controller -n flux-system
```

## Step 5: Create a SOPS Configuration File

In the root of your Git repository, create a `.sops.yaml` configuration file that tells SOPS which KMS key to use:

```yaml
creation_rules:
  - path_regex: .*\.sops\.yaml$
    gcp_kms: projects/my-project/locations/global/keyRings/flux-sops/cryptoKeys/sops-key
  - path_regex: .*secret.*\.yaml$
    gcp_kms: projects/my-project/locations/global/keyRings/flux-sops/cryptoKeys/sops-key
```

This configuration encrypts any file matching the specified patterns using your Cloud KMS key.

## Step 6: Encrypt a Secret with SOPS

Create a Kubernetes secret manifest and encrypt it with SOPS:

```bash
cat <<EOF > secret.sops.yaml
apiVersion: v1
kind: Secret
metadata:
  name: my-app-secret
  namespace: default
type: Opaque
stringData:
  database-url: "postgresql://user:password@db-host:5432/mydb"
  api-key: "my-secret-api-key"
EOF

sops --encrypt --in-place secret.sops.yaml
```

After encryption, the file will contain encrypted values and SOPS metadata including the KMS key reference. You can safely commit this file to Git.

## Step 7: Configure the Flux Kustomization for Decryption

Update your Flux `Kustomization` resource to enable SOPS decryption:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  path: ./clusters/production
  prune: true
  decryption:
    provider: sops
```

The `decryption.provider: sops` field tells the kustomize-controller to decrypt any SOPS-encrypted files it finds in the specified path. Since Workload Identity provides the credentials, no secret reference is needed.

## Step 8: Include the Encrypted Secret in Your Kustomization

In your `clusters/production/kustomization.yaml`, reference the encrypted secret:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - secret.sops.yaml
```

## Step 9: Apply and Verify

Commit and push the encrypted secret and Kustomization to your Git repository. Flux will pick up the changes, decrypt the secret using Cloud KMS via Workload Identity, and apply the resulting Kubernetes secret.

Check the Kustomization status:

```bash
kubectl get kustomization my-app -n flux-system
```

Verify the secret was created and decrypted:

```bash
kubectl get secret my-app-secret -n default
```

Check the kustomize-controller logs if decryption fails:

```bash
kubectl logs deployment/kustomize-controller -n flux-system | grep -i "sops\|decrypt\|kms\|error"
```

## Troubleshooting

### Common Issues

**Error: failed to decrypt data key**: Verify the kustomize-controller service account has the Workload Identity annotation and that the GCP service account has the `cloudkms.cryptoKeyDecrypter` role on the correct key.

**Error: could not get default credentials**: The Workload Identity setup may not be complete. Verify the binding:

```bash
gcloud iam service-accounts get-iam-policy \
  flux-kms-decrypter@my-project.iam.gserviceaccount.com
```

**Locally encrypted files not decrypting in cluster**: Ensure the `.sops.yaml` creation rules match the file paths in your repository and that the KMS key resource name is identical in both the SOPS config and the actual GCP resource.

**Wrong controller annotated**: Remember that for SOPS decryption, you must annotate the `kustomize-controller` service account, not the `source-controller`.

## Summary

By integrating SOPS with Google Cloud KMS and GKE Workload Identity, you can manage encrypted secrets in Git repositories without exposing any credentials in your cluster. The kustomize-controller handles decryption transparently during reconciliation, and Workload Identity eliminates the need for static service account keys. This provides a secure, auditable, and fully GitOps-compatible secret management workflow.
