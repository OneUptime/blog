# How to Use Portainer in Government and Compliance Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Government, FedRAMP, FISMA, Compliance

Description: Deploy and manage container infrastructure that meets government compliance requirements including FedRAMP, FISMA, and NIST 800-53 using Portainer.

## Introduction

Government agencies and contractors must comply with stringent frameworks including FedRAMP, FISMA, NIST SP 800-53, and STIG guidelines when deploying software systems. Container technology is increasingly adopted in government, but every component must meet compliance requirements. Portainer's audit capabilities, access controls, and deployment controls provide the foundation for compliant container operations.

## Compliance Framework Overview

| Framework | Key Controls | Portainer Feature |
|-----------|-------------|-------------------|
| NIST 800-53 AC-2 | Account management | LDAP/AD integration, user lifecycle |
| NIST 800-53 AC-3 | Access enforcement | RBAC, team namespace isolation |
| NIST 800-53 AU-2 | Audit events | Comprehensive activity logging |
| NIST 800-53 CM-7 | Least functionality | Read-only containers, restricted ports |
| STIG CAT I | No default passwords | 12-character minimum initial admin password, password policy |

## Step 1: Air-Gapped Installation

Government environments often have no internet access:

```bash
# Download required images on an internet-connected system

docker pull portainer/portainer-ee:sts

# Pull the Agent image as well if you will add remote Docker environments via Agent
docker pull portainer/agent:sts

# Save images to tar files
docker save portainer/portainer-ee:sts | gzip > portainer-ee-sts.tar.gz
docker save portainer/agent:sts | gzip > portainer-agent-sts.tar.gz

# Transfer to air-gapped environment (USB, classified transfer mechanism)
# On the air-gapped system:
docker load < portainer-ee-sts.tar.gz
docker load < portainer-agent-sts.tar.gz

docker volume create portainer_data

# Run the pre-loaded image
docker run -d \
  --name portainer \
  --restart=always \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ee:sts
```

## Step 2: STIG-Compliant Docker Configuration

```bash
# /etc/docker/daemon.json - STIG hardening
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "icc": false,
  "no-new-privileges": true,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "userland-proxy": false,
  "live-restore": true,
  "userns-remap": "default"
}
EOF

sudo systemctl restart docker
```

## Step 3: Configure FIPS-Compliant TLS

Government systems require approved algorithms and validated cryptographic modules; obtain certificates from your agency PKI and run on a FIPS-configured host where required:

```bash
# Generate a private key and CSR for issuance by your agency PKI
openssl req -new -newkey rsa:4096 \
  -keyout portainer.key \
  -out portainer.csr \
  -nodes \
  -subj "/CN=portainer.agency.gov" \
  -addext "subjectAltName = DNS:portainer.agency.gov"

# After your CA returns portainer.crt, configure Portainer with HTTPS only
docker run -d \
  --name portainer \
  --restart=always \
  -p 9443:9443 \
  -v /certs:/certs:ro \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ee:sts \
  --tlscert /certs/portainer.crt \
  --tlskey /certs/portainer.key \
  --http-disabled
```

## Step 4: Configure CAC/PIV Authentication

Government users often authenticate with Common Access Cards (CAC) through an external identity provider:

```bash
# Configure OAuth with an agency IdP that already enforces CAC/PIV
# In Portainer: Settings > Authentication > OAuth
# Provider: Custom
# Authorization URL: https://idp.agency.gov/oauth2/authorize
# Access token URL: https://idp.agency.gov/oauth2/token
# Resource URL: https://idp.agency.gov/oauth2/userinfo
# Redirect URL: https://portainer.agency.gov
# User identifier: email

# For certificate-based access control in front of Portainer, configure nginx with client cert validation.
# This gates access to the UI; Portainer authentication should still use LDAP, AD, or OAuth.
sudo tee /etc/nginx/conf.d/portainer.conf > /dev/null << 'EOF'
server {
    listen 443 ssl;
    server_name portainer.agency.gov;

    ssl_certificate /certs/server.crt;
    ssl_certificate_key /certs/server.key;
    ssl_client_certificate /certs/dod-root-ca.crt;
    ssl_verify_client on;
    ssl_verify_depth 10;

    location / {
        proxy_pass https://127.0.0.1:9443;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF
```

## Step 5: Implement NIST 800-53 Audit Controls

```bash
# Stream Portainer authentication and activity logs to a SIEM over syslog.
# Portainer documents this as an experimental feature.
docker run -d \
  --name portainer \
  --restart=always \
  -p 9443:9443 \
  -v /certs:/certs:ro \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ee:sts \
  --tlscert /certs/portainer.crt \
  --tlskey /certs/portainer.key \
  --syslog-addr=siem.agency.gov \
  --syslog-port=6514 \
  --syslog-protocol=tcp+tls \
  --syslog-ca-cert=/certs/siem-ca.pem \
  --syslog-cert=/certs/portainer-syslog.crt \
  --syslog-key=/certs/portainer-syslog.key \
  --syslog-source-hostname=portainer-agency-gov
```

## Step 6: Container STIG Compliance Scanning

```bash
#!/bin/bash
# stig-scan.sh - Check containers against STIG requirements
PORTAINER_URL="https://portainer.agency.gov"
API_KEY="scanner-api-key"
ENDPOINT_ID="1"

echo "=== Container STIG Compliance Scan ==="
echo "Date: $(date -u)"
echo ""

export PORTAINER_URL API_KEY ENDPOINT_ID

python3 << 'PYTHON'
import json
import os
import urllib.request

headers = {"X-API-Key": os.environ["API_KEY"]}

list_request = urllib.request.Request(
    f"{os.environ['PORTAINER_URL']}/api/endpoints/{os.environ['ENDPOINT_ID']}/docker/containers/json?all=true",
    headers=headers,
)
with urllib.request.urlopen(list_request) as response:
    containers = json.load(response)

passed = 0
failed = 0

for container in containers:
    container_id = container["Id"]
    name = container["Names"][0].lstrip("/") if container.get("Names") else container_id[:12]

    inspect_request = urllib.request.Request(
        f"{os.environ['PORTAINER_URL']}/api/endpoints/{os.environ['ENDPOINT_ID']}/docker/containers/{container_id}/json",
        headers=headers,
    )
    with urllib.request.urlopen(inspect_request) as response:
        details = json.load(response)

    host_config = details.get("HostConfig", {})

    # STIG Check: No privileged containers
    if host_config.get("Privileged", False):
        print(f"CAT I FAIL: Privileged container: {name}")
        failed += 1
    else:
        passed += 1

    # STIG Check: No host network mode
    if host_config.get("NetworkMode") == "host":
        print(f"CAT II FAIL: Host network mode: {name}")
        failed += 1

print(f"\nResults: {passed} passed, {failed} failed")
PYTHON
```

## Step 7: Change Management and Configuration Control

```yaml
# Use GitOps with protected branches and manual approvals for change control
# .gitlab-ci.yml
stages:
  - security-scan
  - review
  - deploy

security-scan:
  stage: security-scan
  script:
    - trivy image --exit-code 1 --severity CRITICAL "$IMAGE_NAME"

deployment-review:
  stage: review
  script:
    - echo "Manual review required for government deployment"
  when: manual
  allow_failure: false

approved-deploy:
  stage: deploy
  script:
    - curl -X POST "$PORTAINER_WEBHOOK_URL"
  when: manual
  allow_failure: false
  needs: [deployment-review]
  only:
    - main
```

## Conclusion

Government container deployments require air-gapped installation capability, use of FIPS-validated cryptographic modules where required, CAC/PIV integration through enterprise identity providers, comprehensive STIG-compliant configurations, and audit log forwarding to SIEM systems. Portainer Business Edition provides the access control, activity logging, and team management that help satisfy NIST 800-53 requirements. Combined with STIG-hardened Docker configurations and change management workflows, Portainer enables government agencies to leverage container technology within the bounds of their security frameworks.
