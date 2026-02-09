# How to Set Up Artifact Attestation with In-Toto for Kubernetes Supply Chain Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Supply Chain, In-Toto, Attestation

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

# Or use container image
docker pull in-toto/in-toto:latest
```

## Creating Signing Keys

Generate keys for functionaries:

```bash
# Create keys for build system
in-toto-keygen build-system

# Creates: build-system (private), build-system.pub (public)

# Create keys for test system
in-toto-keygen test-runner

# Create keys for security scan
in-toto-keygen security-scanner

# Create project owner key for layout
in-toto-keygen project-owner
```

## Defining the Supply Chain Layout

Create a layout defining your supply chain:

```python
# create_layout.py
from in_toto.models.layout import Layout, Step
from in_toto.models.metadata import Metablock
import json

# Create layout
layout = Layout()

# Define build step
build_step = Step(name="build")
build_step.set_expected_command_from_string("docker build -t myapp:latest .")
build_step.pubkeys = ["<build-system-key-id>"]
build_step.expected_materials = [["MATCH", "src/*", "WITH", "PRODUCTS", "FROM", "clone"]]
build_step.expected_products = [["CREATE", "Dockerfile"], ["CREATE", "*.tar"]]

# Define test step
test_step = Step(name="test")
test_step.pubkeys = ["<test-runner-key-id>"]
test_step.expected_command_from_string("npm test")
test_step.expected_materials = [["MATCH", "*", "WITH", "PRODUCTS", "FROM", "build"]]
test_step.expected_products = [["CREATE", "test-results.xml"]]

# Define scan step
scan_step = Step(name="security-scan")
scan_step.pubkeys = ["<security-scanner-key-id>"]
scan_step.expected_command_from_string("trivy image myapp:latest")
scan_step.expected_materials = [["MATCH", "*", "WITH", "PRODUCTS", "FROM", "build"]]
scan_step.expected_products = [["CREATE", "scan-report.json"]]

# Add steps to layout
layout.steps = [build_step, test_step, scan_step]

# Sign and save layout
metablock = Metablock(signed=layout)
metablock.sign("project-owner")
metablock.dump("root.layout")
```

## Recording Build Attestations

Create attestations during CI/CD:

```bash
# In build step
in-toto-run \
  --step-name build \
  --key build-system \
  --materials src/ Dockerfile \
  --products myapp.tar \
  -- docker build -t myapp:latest .

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
      - uses: actions/checkout@v3

      - name: Install In-Toto
        run: pip install in-toto

      - name: Load signing key
        run: echo "${{ secrets.IN_TOTO_BUILD_KEY }}" > build-system

      - name: Build with attestation
        run: |
          in-toto-run \
            --step-name build \
            --key build-system \
            --materials src/ Dockerfile \
            --products myapp.tar \
            -- docker build -t registry.example.com/myapp:${{ github.sha }} .

      - name: Upload attestation
        uses: actions/upload-artifact@v3
        with:
          name: build-attestation
          path: build.*.link

  test:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Download build attestation
        uses: actions/download-artifact@v3
        with:
          name: build-attestation

      - name: Run tests with attestation
        run: |
          in-toto-run \
            --step-name test \
            --key test-runner \
            --materials src/ package.json \
            --products test-results.xml \
            -- npm test

      - name: Upload test attestation
        uses: actions/upload-artifact@v3
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
        pip install in-toto

        # Load signing key from secret
        cp /secrets/in-toto-key $(workspaces.source.path)/build-key

        # Run build with attestation
        cd $(workspaces.source.path)
        in-toto-run \
          --step-name $(params.step-name) \
          --key build-key \
          --materials src/ Dockerfile \
          --products image.tar \
          -- docker build -t $(params.image-name) -o type=tar,dest=image.tar .

        # Copy attestation
        cp build.*.link $(workspaces.attestations.path)/

      volumeMounts:
        - name: in-toto-keys
          mountPath: /secrets

  volumes:
    - name: in-toto-keys
      secret:
        secretName: in-toto-signing-keys
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
        --key $IN_TOTO_BUILD_KEY \
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
        --key $IN_TOTO_TEST_KEY \
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
        --key $IN_TOTO_SCAN_KEY \
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
  --layout-key project-owner.pub \
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
    - name: layout-url
      description: URL to root.layout file

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
        curl -o root.layout $(params.layout-url)

        # Download public keys
        curl -o project-owner.pub $(params.layout-url)/project-owner.pub

        # Verify
        cd $(workspaces.attestations.path)
        in-toto-verify \
          --layout root.layout \
          --layout-key project-owner.pub \
          --link-dir .

        echo "✓ Supply chain verification passed"
```

## Storing Attestations

Store attestations with images:

```bash
# Using cosign to attach attestations
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
curl -X PUT https://attestations.example.com/myapp/v1.0.0/build.link \
  --data-binary @build.*.link

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
import requests

def verify_image_attestations(image):
    # Download layout
    layout = requests.get(f"https://layouts.example.com/{image}/root.layout")

    # Download attestations
    attestations = requests.get(f"https://attestations.example.com/{image}/")

    # Verify
    try:
        in_toto_verify(
            layout.content,
            layout_keys=["project-owner.pub"],
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
            "signed_by": list(metablock.signatures.keys())
        })

    return report

# Generate and save report
report = generate_supply_chain_report(["build.link", "test.link", "scan.link"])
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
