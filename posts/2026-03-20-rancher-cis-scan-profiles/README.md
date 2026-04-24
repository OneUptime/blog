# How to Configure CIS Scan Profiles in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, CIS, Security, Compliance, Scan Profiles

Description: Learn how to create and customize CIS scan profiles in Rancher to tailor security benchmark scans to your organization's specific requirements.

In Rancher v2.12 and later, Rancher's Compliance feature supports custom CIS scan profiles that allow you to enable or disable specific benchmark checks based on your environment's requirements. This is essential when certain checks don't apply to your infrastructure or when you need to focus on specific compliance areas. This guide covers how to configure and manage CIS scan profiles.

## Prerequisites

- Rancher v2.12 or later with the Rancher Compliance app installed
- Cluster Owner or Rancher global administrator permissions
- Understanding of CIS Kubernetes Benchmark checks
- `kubectl` access to the cluster

## Understanding CIS Scan Profiles

Rancher Compliance installs built-in `ClusterScanProfile` resources such as:

| Profile Name | Description |
|---|---|
| cis-1.10-profile | Generic CIS 1.10 benchmark |
| rke2-cis-1.10-profile | RKE2 CIS 1.10 benchmark |
| k3s-cis-1.10-profile | K3s CIS 1.10 benchmark |
| aks-profile-1.7 | AKS benchmark |
| eks-profile-1.5.0 | EKS benchmark |
| gke-profile-1.6.0 | GKE benchmark |

## Step 1: View Existing Scan Profiles

```bash
# List all available scan profiles
kubectl get clusterscanprofiles.compliance.cattle.io

# View details of a specific profile
kubectl describe clusterscanprofile rke2-cis-1.10-profile

# Get the profile YAML for review
kubectl get clusterscanprofile rke2-cis-1.10-profile -o yaml
```

## Step 2: Create a Custom Scan Profile

Create a custom profile for an existing benchmark version:

```yaml
# custom-cis-profile.yaml - Custom profile with specific checks skipped
apiVersion: compliance.cattle.io/v1
kind: ClusterScanProfile
metadata:
  name: my-custom-profile
spec:
  # Use the RKE2 CIS 1.10 benchmark
  benchmarkVersion: rke2-cis-1.10
  skipTests:
  # Skip checks that don't apply to your environment.
  # Test IDs must match the selected benchmark version.
  - "2.1"
  - "2.2"
  - "5.1.1"
  - "5.1.2"
```

```bash
kubectl apply -f custom-cis-profile.yaml

# Verify the profile was created
kubectl get clusterscanprofile my-custom-profile
```

## Step 3: Create a Profile for PCI DSS Compliance

If your security team has already mapped specific CIS controls to a PCI DSS exception list, encode only those approved skips in a dedicated profile:

```yaml
# pci-dss-profile.yaml - Profile containing approved PCI DSS exception IDs
apiVersion: compliance.cattle.io/v1
kind: ClusterScanProfile
metadata:
  name: pci-dss-focused
spec:
  benchmarkVersion: rke2-cis-1.10
  skipTests:
  # Example only: use the exact control IDs approved by your assessor or security team.
  - "5.1.1"
  - "5.1.2"
  - "5.2.1"
  - "5.2.2"
  - "5.2.3"
```

## Step 4: Create a Minimal Profile for Development

For development clusters where strict compliance is less critical, you can create a more permissive profile, but the IDs still need to match the selected benchmark version:

```yaml
# dev-profile.yaml - Minimal profile for development environments
apiVersion: compliance.cattle.io/v1
kind: ClusterScanProfile
metadata:
  name: development-minimal
spec:
  benchmarkVersion: rke2-cis-1.10
  skipTests:
  # Skip checks not applicable to development
  - "1.1.1"   # API server pod specification file permissions
  - "1.1.2"   # API server pod specification file ownership
  - "2.1"     # etcd cert-file and key-file settings
  - "2.2"     # etcd client certificate authentication
  - "3.1.1"   # Client certificate authentication for users
  - "4.1.1"   # Kubelet service file permissions
  - "4.1.2"   # Kubelet service file ownership
```

## Step 5: Use Custom Profile in a Scan

```bash
# Run a scan using the custom profile
kubectl apply -f - <<EOF
apiVersion: compliance.cattle.io/v1
kind: ClusterScan
metadata:
  name: custom-profile-scan
spec:
  # Reference your custom profile
  scanProfileName: my-custom-profile
EOF

# Monitor the scan
kubectl get clusterscan custom-profile-scan -w
```

## Step 6: Update a Profile Based on Scan Results

After reviewing scan results, update your profile to exclude new false positives:

```bash
# Get the current profile configuration
kubectl get clusterscanprofile my-custom-profile -o yaml > my-custom-profile.yaml

# Edit the profile to add additional skips
# Then apply the update
kubectl apply -f my-custom-profile.yaml
```

## Step 7: Profile Management Best Practices

```bash
# Document profile changes by adding annotations
kubectl annotate clusterscanprofile my-custom-profile \
  "compliance.example.com/reason"="Approved exception list for this cluster profile" \
  "compliance.example.com/reviewer"="security-team" \
  "compliance.example.com/review-date"="2026-03-20"

# Create different profiles for different cluster types
# - production-hardened-profile: Strictest settings
# - staging-profile: Close to production but with some exceptions
# - development-profile: Permissive for development velocity
# - external-facing-profile: Extra strict for internet-facing clusters
```

## Conclusion

Custom CIS scan profiles allow you to tailor security benchmark scans to your organization's specific environment and requirements. By documenting the reason for each skipped check and getting approval from your security team, you maintain compliance while acknowledging the practical constraints of your infrastructure. Regularly reviewing and updating your profiles as your environment evolves ensures your scans remain relevant and meaningful.
