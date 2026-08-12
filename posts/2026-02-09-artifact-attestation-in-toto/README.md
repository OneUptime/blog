# How to Set Up Artifact Attestation with In-Toto

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Supply Chain, In-Toto, Attestations

Description: Implement In-Toto artifact attestation to create verifiable supply chain metadata for Kubernetes deployments, tracking every step from source code to production with cryptographic proof.

---

In-Toto provides a framework for securing software supply chains by creating cryptographically signed attestations at each step of the CI/CD process. These attestations prove that specific actions were performed by authorized parties, creating an auditable chain of custody. This guide shows you how to implement In-Toto attestation for Kubernetes deployments, ensuring supply chain integrity from code to production.

## Understanding In-Toto

In-Toto creates a verifiable record of the software supply chain by requiring functionaries (CI/CD processes, developers) to create signed attestations (called link metadata) for each step. A layout defines the expected supply chain steps and rules. At deployment time, the complete chain is verified against this layout.

## Installing In-Toto Tools

Install In-Toto CLI:

```bash
# Install using pip

pip install in-toto

# Verify installation
in-toto-run --version
```

## Creating Signing Keys

Generate keys for functionaries:

```bash
# Create keys for build system
openssl genpkey -algorithm Ed25519 -out build-system

# Create public key
openssl pkey -in build-system -pubout -out build-system.pub

# Create keys for test system
openssl genpkey -algorithm Ed25519 -out test-runner
openssl pkey -in test-runner -pubout -out test-runner.pub

# Create keys for security scan
openssl genpkey -algorithm Ed25519 -out security-scanner
openssl pkey -in security-scanner -pubout -out security-scanner.pub

# Create project owner key for layout
openssl genpkey -algorithm Ed25519 -out project-owner
openssl pkey -in project-owner -pubout -out project-owner.pub
```

## Defining the Supply Chain Layout

Create a layout defining your supply chain:

```python
# create_layout.py
from in_toto.models.layout import Layout, Step
from in_toto.models.metadata import Metablock
from cryptography.hazmat.primitives.serialization import load_pem_public_key
from securesystemslib.signer import CryptoSigner, SSlibKey

def load_public_key(public_key_path):
    with open(public_key_path, "rb") as f:
        crypto_public_key = load_pem_public_key(f.read())
    key = SSlibKey.from_crypto(crypto_public_key)
    key_dict = key.to_dict()
    key_dict["keyid"] = key.keyid
    return key, key_dict

def load_signer(private_key_path, public_key_path):
    public_key, _ = load_public_key(public_key_path)
    return CryptoSigner.from_priv_key_uri(f"file2:{private_key_path}", public_key)

def add_functionary_key(layout, public_key_path):
    key, key_dict = load_public_key(public_key_path)
    layout.add_functionary_key(key_dict)
    return key.keyid

# Create layout
layout = Layout()
layout.set_relative_expiration(months=6)

build_keyid = add_functionary_key(layout, "build-system.pub")
test_keyid = add_functionary_key(layout, "test-runner.pub")
scan_keyid = add_functionary_key(layout, "security-scanner.pub")

# Define build step
build_step = Step(name="build")
build_step.set_expected_command_from_string("sh -c 'docker build -t myapp:latest . && docker save myapp:latest -o myapp.tar'")
build_step.pubkeys = [build_keyid]
build_step.add_material_rule_from_string("ALLOW src/*")
build_step.add_material_rule_from_string("ALLOW Dockerfile")
build_step.add_product_rule_from_string("CREATE myapp.tar")

# Define test step
test_step = Step(name="test")
test_step.pubkeys = [test_keyid]
test_step.set_expected_command_from_string("npm test")
test_step.add_material_rule_from_string("ALLOW src/*")
test_step.add_material_rule_from_string("ALLOW package.json")
test_step.expected_products = [["CREATE", "test-results.xml"]]

# Define scan step
scan_step = Step(name="security-scan")
scan_step.pubkeys = [scan_keyid]
scan_step.set_expected_command_from_string("trivy image --input myapp.tar")
scan_step.add_material_rule_from_string("ALLOW myapp.tar")
scan_step.expected_products = [["CREATE", "scan-report.json"]]

# Add steps to layout
layout.steps = [build_step, test_step, scan_step]

# Sign and save layout
metablock = Metablock(signed=layout)
metablock.create_signature(load_signer("project-owner", "project-owner.pub"))
metablock.dump("root.layout")
```

## Recording Build Attestations

Create attestations during CI/CD:

```bash
# In build step
in-toto-run \
  --step-name build \
  --signing-key build-system \
  --materials src/ Dockerfile \
  --products myapp.tar \
  -- sh -c 'docker build -t myapp:latest . && docker save myapp:latest -o myapp.tar'

# This creates: build.<keyid>.link
```

In GitHub Actions:

```yaml
name: Build with In-Toto
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Install In-Toto
        run: pip install in-toto

      - name: Load signing key
        run: echo "${{ secrets.IN_TOTO_BUILD_KEY }}" > build-system

      - name: Build with attestation
        run: |
          in-toto-run \
            --step-name build \
            --signing-key build-system \
            --materials src/ Dockerfile \
            --products myapp.tar \
            -- sh -c 'docker build -t registry.example.com/myapp:${{ github.sha }} . && docker save registry.example.com/myapp:${{ github.sha }} -o myapp.tar'

      - name: Upload attestation
        uses: actions/upload-artifact@v7
        with:
          name: build-attestation
          path: build.*.link

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - name: Download build attestation
        uses: actions/download-artifact@v7
        with:
          name: build-attestation

      - name: Load signing key
        run: echo "${{ secrets.IN_TOTO_TEST_KEY }}" > test-runner

      - name: Run tests with attestation
        run: |
          in-toto-run \
            --step-name test \
            --signing-key test-runner \
            --materials src/ package.json \
            --products test-results.xml \
            -- npm test

      - name: Upload test attestation
        uses: actions/upload-artifact@v7
        with:
          name: test-attestation
          path: test.*.link
```

## Integrating with Tekton

Create In-Toto Tekton tasks:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: in-toto-build
spec:
  params:
    - name: image-name
    - name: step-name
      default: "build"

  workspaces:
    - name: source
    - name: attestations

  steps:
    - name: build-with-attestation
      image: python:3.11
      script: |
        #!/bin/bash
        set -e

        # Install in-toto
        apt-get update && apt-get install -y docker.io
        pip install in-toto

        # Load signing key from secret
        cp /secrets/in-toto-key $(workspaces.source.path)/build-key

        # Run build with attestation
        cd $(workspaces.source.path)
        in-toto-run \
          --step-name $(params.step-name) \
          --signing-key build-key \
          --materials src/ Dockerfile \
          --products image.tar \
          -- docker build -t $(params.image-name) -o type=tar,dest=image.tar .

        # Copy attestation
        cp build.*.link $(workspaces.attestations.path)/

      volumeMounts:
        - name: in-toto-keys
          mountPath: /secrets
        - name: docker-socket
          mountPath: /var/run/docker.sock

  volumes:
    - name: in-toto-keys
      secret:
        secretName: in-toto-signing-keys
    - name: docker-socket
      hostPath:
        path: /var/run/docker.sock
```

## Creating Attestations for Multiple Steps

Record each CI/CD step:

```yaml
# In GitLab CI
stages:
  - build
  - test
  - scan
  - package

build:
  stage: build
  script:
    - pip install in-toto
    - |
      in-toto-run \
        --step-name build \
        --signing-key $IN_TOTO_BUILD_KEY_PATH \
        --materials src/ \
        --products dist/ \
        -- npm run build
  artifacts:
    paths:
      - build.*.link
      - dist/

test:
  stage: test
  script:
    - |
      in-toto-run \
        --step-name test \
        --signing-key $IN_TOTO_TEST_KEY_PATH \
        --materials dist/ test/ \
        --products coverage/ \
        -- npm test
  artifacts:
    paths:
      - test.*.link
      - coverage/

security-scan:
  stage: scan
  script:
    - |
      in-toto-run \
        --step-name security-scan \
        --signing-key $IN_TOTO_SCAN_KEY_PATH \
        --materials dist/ \
        --products scan-report.json \
        -- trivy fs dist/
  artifacts:
    paths:
      - security-scan.*.link
      - scan-report.json
```

## Verifying the Supply Chain

Verify attestations at deployment:

```bash
# Collect all link files and layout
# Verify the complete supply chain
in-toto-verify \
  --layout root.layout \
  --verification-keys project-owner.pub \
  --link-dir .

# If verification passes, proceed with deployment
```

Create a verification task:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: verify-supply-chain
spec:
  params:
    - name: layout-base-url
      description: Base URL containing root.layout and project-owner.pub

  workspaces:
    - name: attestations

  steps:
    - name: verify
      image: python:3.11
      script: |
        #!/bin/bash
        set -e

        pip install in-toto

        # Download layout
        curl -o /tmp/root.layout $(params.layout-base-url)/root.layout

        # Download public keys
        curl -o /tmp/project-owner.pub $(params.layout-base-url)/project-owner.pub

        # Verify
        cd $(workspaces.attestations.path)
        in-toto-verify \
          --layout /tmp/root.layout \
          --verification-keys /tmp/project-owner.pub \
          --link-dir .

        echo "✓ Supply chain verification passed"
```

## Storing Attestations

Store attestations with images:

```bash
# If you generated DSSE-formatted link metadata with --use-dsse,
# use cosign to attach those attestation envelopes
cosign attach attestation \
  --attestation build.*.link \
  registry.example.com/myapp:v1.0.0

# Retrieve attestations
cosign download attestation \
  registry.example.com/myapp:v1.0.0 > attestations.json
```

Store in artifact repository:

```bash
# Upload to registry
curl -X PUT https://attestations.example.com/myapp/v1.0.0/build.abcdef12.link \
  --data-binary @build.abcdef12.link

# Upload all attestations
for link in *.link; do
  curl -X PUT https://attestations.example.com/myapp/v1.0.0/$link \
    --data-binary @$link
done
```

## Integrating with Admission Controllers

Verify attestations before deployment:

```python
# admission_webhook.py
from in_toto.verifylib import in_toto_verify
from in_toto.models.metadata import Metadata
from cryptography.hazmat.primitives.serialization import load_pem_public_key
from securesystemslib.signer import SSlibKey
import requests
import tempfile
import os

def load_public_key(path):
    with open(path, "rb") as f:
        crypto_public_key = load_pem_public_key(f.read())
    key = SSlibKey.from_crypto(crypto_public_key)
    key_dict = key.to_dict()
    key_dict["keyid"] = key.keyid
    return key_dict

def verify_image_attestations(image):
    with tempfile.TemporaryDirectory() as attestations_dir:
        # Download layout and project owner public key
        layout_response = requests.get(f"https://layouts.example.com/{image}/root.layout")
        layout_response.raise_for_status()
        layout_path = os.path.join(attestations_dir, "root.layout")
        with open(layout_path, "wb") as f:
            f.write(layout_response.content)

        key_response = requests.get(f"https://layouts.example.com/{image}/project-owner.pub")
        key_response.raise_for_status()
        key_path = os.path.join(attestations_dir, "project-owner.pub")
        with open(key_path, "wb") as f:
            f.write(key_response.content)

        # Download attestations
        link_names = {
            "build": "build.abcdef12.link",
            "test": "test.12345678.link",
            "security-scan": "security-scan.90abcdef.link",
        }
        for link_name in link_names.values():
            link_response = requests.get(
                f"https://attestations.example.com/{image}/{link_name}"
            )
            link_response.raise_for_status()
            with open(os.path.join(attestations_dir, link_name), "wb") as f:
                f.write(link_response.content)

        # Verify
        try:
            in_toto_verify(
                Metadata.load(layout_path),
                {load_public_key(key_path)["keyid"]: load_public_key(key_path)},
                link_dir_path=attestations_dir
            )
            return True
        except Exception as e:
            print(f"Verification failed: {e}")
            return False

# Use in admission webhook to block unverified images
```

## Generating Reports

Create supply chain reports:

```python
# generate_report.py
from in_toto.models.metadata import Metablock
import json

def generate_supply_chain_report(link_files):
    report = {
        "steps": [],
        "verified": True
    }

    for link_file in link_files:
        metablock = Metablock.load(link_file)
        link = metablock.signed

        report["steps"].append({
            "name": link.name,
            "command": link.command,
            "materials": len(link.materials),
            "products": len(link.products),
            "signed_by": [signature.keyid for signature in metablock.signatures]
        })

    return report

# Generate and save report
report = generate_supply_chain_report([
    "build.abcdef12.link",
    "test.12345678.link",
    "security-scan.90abcdef.link"
])
with open("supply-chain-report.json", "w") as f:
    json.dump(report, f, indent=2)
```

## Monitoring and Auditing

Track supply chain compliance:

```bash
# Check all deployments have valid attestations
for deployment in $(kubectl get deployments -n production -o name); do
  IMAGE=$(kubectl get $deployment -n production -o jsonpath='{.spec.template.spec.containers[0].image}')

  echo "Checking $IMAGE..."

  if verify_attestations "$IMAGE"; then
    echo "✓ Valid attestations"
  else
    echo "✗ Missing or invalid attestations"
  fi
done
```

## Conclusion

In-Toto artifact attestation provides comprehensive supply chain security by creating verifiable records of every step in your CI/CD process. By requiring cryptographic signatures from authorized functionaries and verifying the complete chain before deployment, you prevent tampering and ensure only properly processed code reaches production. This approach provides audit trails, enforces process compliance, and significantly strengthens your Kubernetes supply chain security posture.
