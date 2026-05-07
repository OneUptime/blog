# How to Plan a Rancher Upgrade Strategy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Upgrade

Description: A comprehensive guide to planning and documenting a Rancher upgrade strategy for your organization.

Upgrading Rancher without a plan leads to surprises, extended downtime, and stressful rollbacks. A well-defined upgrade strategy ensures your team knows what to do before, during, and after the upgrade. This guide helps you build a repeatable upgrade strategy for your Rancher environment.

## Why You Need an Upgrade Strategy

A Rancher upgrade affects not just the management server but also every downstream cluster agent, webhook, and integration. Without a strategy, you risk:

- Breaking downstream cluster connectivity
- Introducing incompatible Kubernetes versions
- Losing configuration during migration
- Extended outages while troubleshooting
- Team confusion about roles and responsibilities

## Step 1: Define Your Upgrade Policy

Establish organizational rules about how and when to upgrade Rancher.

### Version Policy

Decide how far behind the latest release you are willing to be:

- **Latest stable**: Upgrade to each new stable release within 30 days
- **N-1 policy**: Stay one minor version behind the latest
- **LTS only**: Only upgrade when a new long-term support version is released

### Frequency

Set a regular upgrade cadence:

- **Monthly**: Review and apply patch releases
- **Quarterly**: Apply minor version upgrades
- **Semi-annually**: Apply major version upgrades

### Approval Process

Define who approves upgrades:

- Infrastructure team reviews the release notes
- Security team reviews CVE fixes
- Change advisory board approves the maintenance window
- Stakeholders are notified of the timeline

## Step 2: Inventory Your Environment

Document everything that the upgrade touches:

```text
Environment Inventory
=====================
Management Cluster:
  - Kubernetes distribution: RKE2
  - Kubernetes version: v1.28.x
  - Node count: 3 server, 2 worker
  - OS: Ubuntu 22.04
  - Rancher version: v2.8.x
  - cert-manager version: v1.14.x
  - Ingress: nginx-ingress v1.9.x

Downstream Clusters:
  - Production (EKS, v1.28, 50 nodes)
  - Staging (RKE2, v1.27, 10 nodes)
  - Dev (K3s, v1.28, 3 nodes)

Integrations:
  - LDAP authentication
  - Monitoring stack (Prometheus/Grafana)
  - Logging (Fluentd to Elasticsearch)
  - OPA Gatekeeper policies
  - CI/CD pipelines (ArgoCD)
```

## Step 3: Establish a Pre-Upgrade Checklist

Create a checklist to run before every upgrade:

```plaintext
Pre-Upgrade Checklist
=====================
[ ] Review release notes for target version
[ ] Check support matrix for compatibility
[ ] Verify the supported upgrade path for the target version
[ ] Update cert-manager if required
[ ] Take etcd snapshot of management cluster
[ ] Create a Rancher Backup custom resource
[ ] Export Helm values
[ ] Notify stakeholders of maintenance window
[ ] Verify staging environment matches production
[ ] Complete staging upgrade successfully
[ ] Confirm rollback procedure is documented
[ ] Verify monitoring and alerting is active
```

## Step 4: Design the Upgrade Process

### Phase 1: Preparation (1-2 weeks before)

- Review release notes and changelog
- Check version compatibility
- Update the staging environment to match production
- Schedule the maintenance window
- Notify all teams

### Phase 2: Staging Upgrade (1 week before)

- Perform the upgrade in staging
- Run integration tests
- Verify downstream cluster connectivity
- Test application deployments
- Document any issues encountered

### Phase 3: Production Backup (day of)

```bash
# Take etcd snapshot

rke2 etcd-snapshot save --name pre-upgrade-$(date +%Y%m%d)

# Create Rancher Backup custom resource
kubectl apply -f backup.yaml

# Export Helm values
helm get values rancher -n cattle-system -o yaml > pre-upgrade-values.yaml
```

### Phase 4: Production Upgrade

```bash
# Update Helm repo
helm repo update

# Run the upgrade
helm upgrade rancher rancher-stable/rancher \
  --namespace cattle-system \
  --values pre-upgrade-values.yaml \
  --version <TARGET_VERSION> \
  --wait \
  --timeout 10m
```

### Phase 5: Verification

```bash
# Check version
kubectl get settings.management.cattle.io server-version -o jsonpath='{.value}'

# Check pods
kubectl get pods -n cattle-system

# Check managed clusters
kubectl get clusters.management.cattle.io
```

### Phase 6: Post-Upgrade Monitoring (24-48 hours)

- Monitor cluster agent connectivity
- Watch for webhook errors
- Check application health across downstream clusters
- Monitor resource usage
- Review logs for warnings or errors

## Step 5: Define Rollback Criteria

Establish clear criteria for when to roll back:

- Rancher UI is inaccessible for more than 15 minutes
- More than 2 downstream clusters lose connectivity
- Critical webhook failures blocking deployments
- Authentication system (LDAP/AD) is non-functional
- Data loss detected

### Rollback Procedure

```bash
# Restore Rancher state from a backup created with rancher-backup
kubectl create -f restore.yaml

# Roll back the Rancher Helm release
helm rollback rancher -n cattle-system

# If you must restore the RKE2 management cluster from an etcd snapshot,
# stop rke2-server first and follow the full RKE2 restore procedure.
rke2 server --cluster-reset \
  --cluster-reset-restore-path=/var/lib/rancher/rke2/server/db/snapshots/pre-upgrade-<date>
```

## Step 6: Assign Roles and Responsibilities

Define who does what during the upgrade:

| Role | Responsibility |
|------|---------------|
| Upgrade Lead | Executes the upgrade commands |
| Monitoring Lead | Watches dashboards and alerts |
| Communication Lead | Updates stakeholders on progress |
| Rollback Lead | Executes rollback if needed |
| Testing Lead | Verifies post-upgrade functionality |

## Step 7: Create a Communication Plan

### Before the Upgrade

- Send maintenance window notification 1 week ahead
- Send reminder 24 hours before
- Share the upgrade runbook with the team

### During the Upgrade

- Post status updates every 15 minutes in the designated channel
- Announce when the upgrade starts, completes, or if rollback is initiated

### After the Upgrade

- Send completion notification with version details
- Report any issues encountered
- Share the post-upgrade monitoring report after 48 hours

## Step 8: Document Lessons Learned

After each upgrade, record:

- What went well
- What went wrong
- How long each phase took
- Any unexpected issues
- Changes needed for the next upgrade

Keep these in a shared document that the team references before the next upgrade.

## Step 9: Automate Where Possible

Over time, automate repeatable parts of the strategy:

- Automated compatibility checks using scripts that compare versions
- Automated backup before upgrade
- CI/CD pipeline for staging upgrades
- Automated post-upgrade health checks
- Automated notification system

Example health check script:

```bash
#!/bin/bash
echo "Checking Rancher version..."
kubectl get settings.management.cattle.io server-version -o jsonpath='{.value}'

echo "Checking pod health..."
kubectl get pods -n cattle-system --no-headers | grep -v Running

echo "Checking managed clusters..."
kubectl get clusters.management.cattle.io -o custom-columns=NAME:.metadata.name,STATUS:.status.conditions

echo "Checking Rancher health endpoint..."
curl -sk https://rancher.yourdomain.com/healthz
```

## Conclusion

A Rancher upgrade strategy turns a potentially risky operation into a routine procedure. By defining your upgrade policy, maintaining an environment inventory, following a structured process, and having clear rollback criteria, you reduce risk and build confidence in your upgrade process. Document everything, test in staging, and improve the strategy after each upgrade cycle.
