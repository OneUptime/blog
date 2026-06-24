# How to Set Up Image Signing and Verification in Portainer - Verification

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Image Signing, Docker Content Trust, Cosign, Container Security, Supply Chain

Description: Learn how to sign Docker images and verify signatures before deployment via Portainer using Docker Content Trust and Cosign.

---

Image signing ensures that only images from trusted sources are deployed. Without signing, anyone with registry access could push malicious images that get deployed automatically. This guide covers Docker Content Trust (DCT) for legacy Notary v1 workflows and Cosign for modern supply chain security.

## Option 1: Docker Content Trust (DCT)

Docker Content Trust uses Notary v1 to sign images at push time and verify them at pull time in the Docker CLI. It requires a registry with a Notary server attached.

### Enabling DCT in the Docker CLI

```bash
# Enable Content Trust for this shell

export DOCKER_CONTENT_TRUST=1

# Or persist it in your shell profile
echo 'export DOCKER_CONTENT_TRUST=1' >> ~/.profile
```

With DCT enabled:
- `docker pull` verifies the signature before allowing the image
- `docker push` signs the image during the push
- This is enforced by the Docker CLI; Portainer does not inherit this client-side setting from the Docker daemon

### Signing an Image

```bash
# Generate a key pair (interactive - sets a passphrase)
docker trust key generate my-signing-key

# Initialize signing for your repository
docker trust signer add --key my-signing-key.pub my-signer \
  myregistry.example.com/my-app

# Sign and push
DOCKER_CONTENT_TRUST=1 docker push myregistry.example.com/my-app:v1.5.0

# Inspect signatures
docker trust inspect --pretty myregistry.example.com/my-app:v1.5.0
```

## Option 2: Cosign (Sigstore)

Cosign is a modern, keyless signing tool using OIDC identity providers (GitHub Actions, GitLab CI, etc.). It's increasingly preferred over DCT.

### Installing Cosign

```bash
# Download Cosign
curl -O -L "https://github.com/sigstore/cosign/releases/latest/download/cosign-linux-amd64"
sudo mv cosign-linux-amd64 /usr/local/bin/cosign
sudo chmod +x /usr/local/bin/cosign

# Or via Docker
alias cosign='docker run --rm -it -v "$HOME/.config/cosign:/root/.config/cosign" -v "$PWD:/work" -w /work ghcr.io/sigstore/cosign/cosign:v3.0.6'
```

### Signing with a Key Pair

```bash
# Generate a key pair
cosign generate-key-pair

# Sign an image (after pushing to registry)
cosign sign --key cosign.key myregistry.example.com/my-app:v1.5.0

# Verify the signature
cosign verify --key cosign.pub myregistry.example.com/my-app:v1.5.0
```

### Keyless Signing in GitHub Actions

```yaml
# Requires job permissions: id-token: write, packages: write

- name: Sign image with Cosign
  uses: sigstore/cosign-installer@v4.1.1
  with:
    cosign-release: 'v3.0.6'

- name: Sign the container image
  # Assumes the image has already been pushed to GHCR in an earlier step
  run: |
    cosign sign --yes ghcr.io/${{ github.repository }}:${{ github.sha }}
```

## Verifying Signatures Before Deployment

Add a verification step to your CI/CD pipeline before triggering Portainer:

```bash
#!/bin/bash
# verify-and-deploy.sh

IMAGE="myregistry.example.com/my-app:$IMAGE_TAG"
COSIGN_PUBLIC_KEY="/etc/cosign/cosign.pub"

echo "Verifying signature for $IMAGE..."

if cosign verify --key "$COSIGN_PUBLIC_KEY" "$IMAGE" > /dev/null 2>&1; then
  echo "Signature verified - deploying"
  curl -X POST "$PORTAINER_WEBHOOK"
else
  echo "Signature verification FAILED - blocking deployment"
  exit 1
fi
```

## Enforcing Signature Verification with Connaisseur

Deploy Connaisseur as a Kubernetes admission webhook to block unsigned images:

```bash
helm repo add connaisseur https://sse-secure-systems.github.io/connaisseur/charts
helm install connaisseur connaisseur/connaisseur \
  --atomic --create-namespace --namespace connaisseur \
  --set application.validators[0].name=default \
  --set application.validators[0].type=cosign \
  --set application.validators[0].trustRoots[0].name=default \
  --set-file application.validators[0].trustRoots[0].key=cosign.pub
```

Once deployed, Kubernetes rejects any pod using an unsigned image - enforced at the cluster level, visible in Portainer's Kubernetes view.

## Summary of Approaches

| Approach | Best For | Complexity |
|----------|----------|------------|
| Docker Content Trust | Legacy Docker/Notary v1 deployments | Medium |
| Cosign with key pair | Teams with controlled key distribution | Medium |
| Cosign keyless | CI/CD with GitHub/GitLab identity | Low |
| Connaisseur (K8s) | Cluster-wide enforcement | High |
