# How to Set Up Rancher on AWS GovCloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, AWS, GovCloud, Compliance

Description: Deploy Rancher on AWS GovCloud to manage Kubernetes clusters in air-gapped, FedRAMP, and government-compliant environments.

## Introduction

AWS GovCloud is AWS's isolated region designed for US government workloads that need FedRAMP High, DoD SRG Impact Level 5, or ITAR-related controls. Deploying Rancher on GovCloud often means handling air-gapped image pulling, using GovCloud-specific endpoints and ARNs, and ensuring all components meet compliance requirements. This guide covers the complete deployment process.

## Key Differences in GovCloud

- EC2 endpoint: `ec2.us-gov-west-1.amazonaws.com`
- ECR endpoints: `api.ecr.us-gov-west-1.amazonaws.com` and `ACCOUNT.dkr.ecr.us-gov-west-1.amazonaws.com`
- Private subnets do not have internet access unless you add an egress path such as NAT, PrivateLink, VPN, or Direct Connect
- Air-gapped Rancher installs use a private container registry reachable from the cluster
- IAM requires GovCloud-specific ARNs (`arn:aws-us-gov:...`)

## Step 1: Prepare a Private Container Registry

Use a registry that the RKE2 nodes can pull from directly for Rancher's `systemDefaultRegistry`. GovCloud ECR is still useful as a connected-side staging registry, but the registry Rancher uses inside the air-gapped environment should not rely on short-lived credentials.

```bash
# Optional: log in to GovCloud ECR if you use it as a staging registry
aws ecr get-login-password \
  --region us-gov-west-1 \
  | docker login \
  --username AWS \
  --password-stdin \
  <account-id>.dkr.ecr.us-gov-west-1.amazonaws.com

# Log in to the private registry that Rancher and the cluster nodes can reach
docker login registry.govcloud.internal:5000
```

## Step 2: Mirror Rancher Images to Your Private Registry

```bash
# Download the Rancher air-gap assets for the target version
VERSION="v2.9.12"
curl -LO "https://github.com/rancher/rancher/releases/download/${VERSION}/rancher-images.txt"
curl -LO "https://github.com/rancher/rancher/releases/download/${VERSION}/rancher-save-images.sh"
curl -LO "https://github.com/rancher/rancher/releases/download/${VERSION}/rancher-load-images.sh"

chmod +x rancher-save-images.sh rancher-load-images.sh

# Save the required images from a connected bastion, then load them into the
# registry Rancher will use inside GovCloud
./rancher-save-images.sh --image-list ./rancher-images.txt
./rancher-load-images.sh \
  --image-list ./rancher-images.txt \
  --registry registry.govcloud.internal:5000
```

## Step 3: Create the RKE2 Cluster on GovCloud EC2

```bash
# Create EC2 instances in a private subnet and copy the matching RKE2 air-gap
# artifacts (`install.sh`, `rke2.linux-amd64.tar.gz`,
# `rke2-images.linux-amd64.tar.zst`, and `sha256sum-amd64.txt`) into
# /root/rke2-artifacts on each server first.
# Launch template (cloud-init):
cat << 'EOF' > govcloud-userdata.sh
#!/bin/bash
mkdir -p /etc/rancher/rke2

cat > /etc/rancher/rke2/config.yaml << 'CONFEOF'
token: <rke2-shared-token>
# On additional server nodes, also set:
# server: https://<first-server-private-ip>:9345
tls-san:
  - <api-server-lb-dns>
cloud-provider-name: aws
CONFEOF

# Install RKE2 from the pre-downloaded air-gap artifacts
INSTALL_RKE2_ARTIFACT_PATH=/root/rke2-artifacts sh /root/rke2-artifacts/install.sh

systemctl enable --now rke2-server
EOF
```

## Step 4: Configure AWS GovCloud Endpoints

In public GovCloud regions, `cloud-provider-name: aws` is usually sufficient. Only add explicit endpoint overrides if you are using private AWS endpoints or custom endpoint routing:

```ini
# /etc/rancher/rke2/cloud.conf
[Global]

[ServiceOverride "ec2"]
Service=ec2
Region=us-gov-west-1
URL=https://ec2.us-gov-west-1.amazonaws.com
SigningRegion=us-gov-west-1

[ServiceOverride "elasticloadbalancing"]
Service=elasticloadbalancing
Region=us-gov-west-1
URL=https://elasticloadbalancing.us-gov-west-1.amazonaws.com
SigningRegion=us-gov-west-1
```

```yaml
# /etc/rancher/rke2/config.yaml
cloud-provider-config: /etc/rancher/rke2/cloud.conf
```

## Step 5: Install Rancher in Air-Gapped Mode

```bash
# Add the Rancher chart repo and unpack the chart locally
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update
helm pull rancher-stable/rancher \
  --version 2.9.12 \
  --untar \
  --untardir /tmp/rancher-chart

# Install with private registry
helm install rancher /tmp/rancher-chart/rancher \
  --namespace cattle-system \
  --create-namespace \
  --set hostname=rancher.govcloud.internal \
  --set bootstrapPassword=ChangeMeNow! \
  --set rancherImage=registry.govcloud.internal:5000/rancher/rancher \
  --set rancherImageTag=v2.9.12 \
  --set systemDefaultRegistry=registry.govcloud.internal:5000 \
  --set useBundledSystemChart=true \
  --set ingress.tls.source=secret \
  --set replicas=3
```

## Step 6: Configure FIPS Mode (DoD/IL Compliance)

For DoD IL4/IL5 requirements, run RKE2 on a FIPS-enabled OS and keep the default `aescbc` secrets encryption provider. RKE2's FIPS-compliant components do not require a separate `fips: true` setting in `config.yaml`.

```yaml
# /etc/rancher/rke2/config.yaml
secrets-encryption-provider: aescbc
```

```bash
# Verify FIPS mode on the OS (RHEL/FIPS-enabled AMIs)
sudo fips-mode-setup --check
# Expected: FIPS mode is enabled
```

## Step 7: Configure Compliance Audit Logging

```yaml
# Ensure `/var/log/kube-audit` exists on every server before restarting RKE2.
# /etc/rancher/rke2/config.yaml
kube-apiserver-arg:
  - "audit-log-path=/var/log/kube-audit/audit.log"
  - "audit-log-maxage=90"       # Example retention; align with your policy
  - "audit-log-maxbackup=10"
  - "audit-log-maxsize=100"
  - "audit-policy-file=/etc/rancher/rke2/audit-policy.yaml"
```

## Conclusion

Deploying Rancher on AWS GovCloud requires careful attention to air-gapped image mirroring, GovCloud-specific service endpoints, FIPS compliance, and IAM ARN formatting. Once deployed, Rancher provides the same powerful multi-cluster management capabilities in the GovCloud isolated environment as in commercial AWS, enabling government agencies to adopt modern Kubernetes workflows while meeting stringent compliance requirements.
