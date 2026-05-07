# How to Test Rancher Upgrades in a Staging Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Upgrade

Description: Learn how to set up a staging environment and test Rancher upgrades before applying them to production.

Testing Rancher upgrades in a staging environment catches issues before they affect production workloads. This guide shows you how to build a staging environment that mirrors your production Rancher setup, perform a test upgrade, and validate the results.

## Why Test in Staging

Production Rancher upgrades can fail due to:

- Incompatible Kubernetes versions
- Breaking API changes
- Custom webhook conflicts
- Third-party integration issues
- Resource constraints

A staging environment lets you discover and resolve these problems without impacting real users.

## Step 1: Build the Staging Management Cluster

Create a Kubernetes cluster that mirrors your production management cluster. Match the same distribution, version, and node configuration.

### Example with RKE2

```bash
# On the first staging server node

curl -sfL https://get.rke2.io | INSTALL_RKE2_VERSION=<SAME_AS_PROD> sh -

mkdir -p /etc/rancher/rke2

cat > /etc/rancher/rke2/config.yaml <<EOF
token: <SHARED_CLUSTER_TOKEN>
tls-san:
  - <RKE2_REGISTRATION_ADDRESS>
write-kubeconfig-mode: "0644"
EOF

systemctl enable rke2-server
systemctl start rke2-server

# On each additional staging server node

curl -sfL https://get.rke2.io | INSTALL_RKE2_VERSION=<SAME_AS_PROD> sh -

mkdir -p /etc/rancher/rke2

cat > /etc/rancher/rke2/config.yaml <<EOF
server: https://<RKE2_REGISTRATION_ADDRESS>:9345
token: <SHARED_CLUSTER_TOKEN>
tls-san:
  - <RKE2_REGISTRATION_ADDRESS>
write-kubeconfig-mode: "0644"
EOF

systemctl enable rke2-server
systemctl start rke2-server
```

For a minimal staging setup, you can use fewer nodes than production, but use at least 3 server nodes if production runs in HA mode.

Configure kubectl:

```bash
mkdir -p ~/.kube
cp /etc/rancher/rke2/rke2.yaml ~/.kube/config
chmod 600 ~/.kube/config
```

## Step 2: Install the Same Rancher Version as Production

Install cert-manager and Rancher matching your production versions exactly:

```bash
# cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/<CERT_MANAGER_VERSION>/cert-manager.crds.yaml
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --version <CERT_MANAGER_VERSION>

# Rancher
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update

helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --create-namespace \
  --set hostname=rancher-staging.yourdomain.com \
  --set replicas=<CURRENT_PROD_REPLICA_COUNT> \
  --set bootstrapPassword=stagingadmin \
  --version <CURRENT_PROD_VERSION>
```

Wait for Rancher to be ready:

```bash
kubectl rollout status deployment rancher -n cattle-system
```

## Step 3: Replicate Your Production Configuration

To make the staging test meaningful, replicate key production configurations:

### Import or Create Test Clusters

Create downstream clusters that represent your production workloads:

```bash
# Create a K3s test cluster to simulate downstream clusters
curl -sfL https://get.k3s.io | sh -
```

Import it into staging Rancher from the UI, or use the CLI:

```bash
# Get the exact registration command from Rancher UI and run it on the test cluster.
# If Rancher uses a self-signed certificate, use the curl-based command shown in the UI instead.
kubectl apply -f https://rancher-staging.yourdomain.com/v3/import/<token>.yaml
```

### Replicate Authentication Settings

If production uses LDAP, Active Directory, or SAML authentication, configure the same settings in staging. Use a test directory service if available.

### Install the Same Apps and Integrations

Install the Rancher apps that are running in production:

- Monitoring (Prometheus/Grafana)
- Logging
- OPA Gatekeeper or similar policies
- Backup operator

## Step 4: Take a Baseline

Before upgrading, record the current state:

```bash
# Record pod states
kubectl get pods -A > pre-upgrade-pods.txt

# Record cluster statuses
kubectl get clusters.management.cattle.io > pre-upgrade-clusters.txt

# Record Helm releases
helm list -A > pre-upgrade-helm.txt

# Health check
curl -sk https://rancher-staging.yourdomain.com/healthz
```

## Step 5: Perform the Staging Upgrade

Follow the exact same upgrade process you plan to use in production, including your normal backup procedure:

```bash
# Export current Helm values
helm get values rancher -n cattle-system -o yaml > staging-values.yaml

# Update repo
helm repo update

# Upgrade
helm upgrade rancher rancher-stable/rancher \
  --namespace cattle-system \
  --values staging-values.yaml \
  --version <TARGET_VERSION> \
  --wait \
  --timeout 10m
```

Monitor the upgrade:

```bash
kubectl rollout status deployment rancher -n cattle-system
kubectl get pods -n cattle-system -w
```

## Step 6: Run Validation Tests

After the upgrade completes, run a comprehensive validation.

### Basic Health Checks

```bash
# Version check
kubectl get settings.management.cattle.io server-version -o jsonpath='{.value}'

# Pod health
kubectl get pods -n cattle-system
kubectl get pods -n cattle-fleet-system

# API health
curl -sk https://rancher-staging.yourdomain.com/healthz

# Managed clusters
kubectl get clusters.management.cattle.io
```

### Functional Tests

Test these operations through the Rancher UI:

1. **Authentication**: Log in and out, verify user permissions
2. **Cluster management**: View cluster details, check node status
3. **Workload deployment**: Deploy a test application to a managed cluster
4. **Scaling**: Scale a deployment up and down
5. **Logging and monitoring**: Verify dashboards load and show data
6. **Catalog apps**: Install and uninstall a catalog application
7. **RBAC**: Verify role-based access control is enforced
8. **kubectl shell**: Open a kubectl shell to a managed cluster

### API Tests

Test the Rancher API endpoints:

```bash
# Create an API key in Rancher UI and export the access and secret keys
ACCESS_KEY="<ACCESS_KEY>"
SECRET_KEY="<SECRET_KEY>"

# List clusters via API
curl -sku "${ACCESS_KEY}:${SECRET_KEY}" "https://rancher-staging.yourdomain.com/v3/clusters" \
  | jq '.data[].name'

# List projects
curl -sku "${ACCESS_KEY}:${SECRET_KEY}" "https://rancher-staging.yourdomain.com/v3/projects" \
  | jq '.data[].name'
```

### Agent Connectivity

Verify downstream cluster agents updated successfully:

```bash
# On each downstream cluster
kubectl get deployments cattle-cluster-agent -n cattle-system -o jsonpath='{.spec.template.spec.containers[0].image}'
```

## Step 7: Test the Rollback Procedure

While in staging, also test your rollback procedure:

```bash
helm rollback rancher -n cattle-system
kubectl rollout status deployment rancher -n cattle-system
```

Verify the rollback works correctly, then re-upgrade to the target version:

```bash
helm upgrade rancher rancher-stable/rancher \
  --namespace cattle-system \
  --values staging-values.yaml \
  --version <TARGET_VERSION>
```

## Step 8: Document Results

Create a staging upgrade report:

```plaintext
Staging Upgrade Report
======================
Date: YYYY-MM-DD
Source version: v2.X.X
Target version: v2.Y.Y

Results:
  Upgrade duration: X minutes
  Rollout completed: Yes/No
  All pods healthy: Yes/No
  Managed clusters active: Yes/No
  Agent update successful: Yes/No

Issues Found:
  1. [Description of any issues]
  2. [Workarounds applied]

Rollback Tested: Yes/No
Rollback Duration: X minutes

Recommendation: Proceed / Do Not Proceed with production upgrade
```

## Step 9: Keep Staging Updated

Maintain your staging environment by:

- Running staging upgrades at least 1 week before production
- Keeping the staging configuration in sync with production
- Automating the staging upgrade and validation process where possible
- Preserving staging upgrade reports for historical reference

## Conclusion

Testing Rancher upgrades in staging is the single most effective way to reduce upgrade risk. Build a staging environment that mirrors production, follow the same upgrade procedure, run thorough validation tests, and document the results. The time invested in staging testing pays for itself by preventing production incidents and giving your team confidence in the upgrade process.
