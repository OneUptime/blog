# How to Plan Your Ubuntu Server Upgrade Path for the Next 5 Years

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Planning, Upgrade, LTS

Description: A strategic guide to planning Ubuntu Server upgrade paths over a 5-year horizon, covering LTS timelines, testing strategies, and infrastructure considerations.

---

Running servers without a clear upgrade plan leads to scramble scenarios where you are forced to migrate on someone else's timeline - usually when a release hits EOL and you start receiving security vulnerability notices for unpatched systems. Planning 5 years out avoids that situation and gives you controlled migration windows aligned with your own schedule.

## Current LTS Release Landscape (As of 2026)

Understanding where current releases stand:

| Release | Codename | Released | Standard EOL | ESM EOL |
|---------|----------|----------|--------------|---------|
| 20.04 | Focal | April 2020 | April 2025 | April 2030 |
| 22.04 | Jammy | April 2022 | April 2027 | April 2032 |
| 24.04 | Noble | April 2024 | April 2029 | April 2034 |
| 26.04 | TBD | April 2026 | April 2031 | April 2036 |

As of March 2026:
- **20.04**: Past standard EOL. Needs ESM or immediate migration.
- **22.04**: 14 months of standard support remaining. Plan migration to 24.04.
- **24.04**: 3 years of standard support remaining. Good target for new deployments.

## Step 1: Audit Your Current State

Before planning, know what you have:

```bash
#!/bin/bash
# inventory-ubuntu-versions.sh
# Run on each server or via Ansible

echo "=== Server: $(hostname -f) ==="
echo "Ubuntu Version: $(lsb_release -rs)"
echo "Codename: $(lsb_release -cs)"
echo "Kernel: $(uname -r)"
echo "Support Status:"
ubuntu-support-status 2>/dev/null || echo "ubuntu-support-status not available"
echo "Pro Attached: $(pro status 2>/dev/null | grep -o 'attached\|not attached' | head -1)"
echo ""
```

Run across your fleet:

```bash
# With Ansible
ansible all -m shell -a "lsb_release -rs && ubuntu-support-status" -o

# With SSH in a loop
for host in $(cat servers.txt); do
    ssh "$host" "echo -n '$host: '; lsb_release -rs"
done
```

Output a simple summary:

```text
web-prod-01: 22.04
web-prod-02: 22.04
db-prod-01: 22.04
cache-01: 20.04    # ALERT: Past EOL
backup-server: 24.04
```

## Step 2: Classify Servers by Migration Priority

Not all servers are equal. Classify by:

**Urgency (based on EOL)**:
- Past EOL: Migrate within 90 days or attach ESM immediately
- Within 6 months of EOL: Begin migration now
- 1-2 years from EOL: Plan and test migration this year
- 2+ years from EOL: Schedule for next upgrade cycle

**Complexity**:
- Simple (stateless app servers): Lower risk, easier to migrate
- Medium (stateful services with some dependencies): Require more testing
- High (databases, legacy application stacks, custom kernel modules): Require extensive testing and may need application changes

**Business impact**:
- Tier 1: Customer-facing, regulated, or revenue-critical
- Tier 2: Internal tools, dev/staging environments
- Tier 3: Monitoring, backup, utility systems

Migrate in reverse order of complexity and in order of urgency.

## Step 3: Build a Timeline

A realistic 5-year migration plan for a fleet currently running 22.04:

**2026 (Now)**:
- Audit all servers for current Ubuntu version
- Attach Ubuntu Pro ESM to any 20.04 machines that cannot be migrated immediately
- Build 24.04 test images for your standard application stack
- Migrate Tier 3 (utility) servers to 24.04

**Q3-Q4 2026**:
- Validate all critical applications on 24.04 in staging
- Migrate Tier 2 (internal) servers to 24.04
- Begin Tier 1 (production) migration for simpler workloads

**Q1-Q2 2027**:
- Complete 22.04 to 24.04 migration for remaining production servers
- All servers should be on 24.04 by April 2027 (before 22.04 EOL)
- Begin evaluating 26.04 for new deployments

**2028**:
- New deployments standardize on 26.04
- Begin planning 24.04 to 26.04 migration

**2029**:
- Complete migration to 26.04 before 24.04 standard EOL (April 2029)
- Evaluate 28.04 for next cycle

## Step 4: Application Compatibility Testing

Upgrade failures usually come from application compatibility, not the OS itself. Test these areas:

### Language Runtime Changes

```bash
# Check current versions before upgrade
python3 --version
node --version
ruby --version
java -version
php --version

# After upgrade, verify same or acceptable new versions
# 22.04 ships Python 3.10
# 24.04 ships Python 3.12 - test your Python code

# Use pyenv, nvm, rbenv, or similar for version isolation
# This lets you pin a specific version regardless of OS version
```

### Database Major Versions

```bash
# PostgreSQL ships different major versions per Ubuntu release
# 22.04: PostgreSQL 14
# 24.04: PostgreSQL 16

# MariaDB
# 22.04: MariaDB 10.6
# 24.04: MariaDB 10.11

# Check your application's database compatibility requirements
# Major DB version upgrades require data migration
pg_dumpall > /backup/pre-upgrade-$(date +%Y%m%d).sql
```

### SSL/TLS Configuration

Ubuntu 24.04 uses OpenSSL 3.x which removed support for some legacy protocols:

```bash
# Test if your applications work with OpenSSL 3
# On a test 24.04 server:
openssl version

# Check for use of deprecated cipher suites or protocols
sudo grep -r "TLSv1\b\|TLSv1.1\b\|SSLv3" /etc/
sudo grep -r "DES\|RC4\|MD5" /etc/nginx/ /etc/apache2/ 2>/dev/null
```

### Custom Kernel Modules

If you build kernel modules (DKMS modules, custom drivers):

```bash
# Check which DKMS modules are installed
dpkg -l | grep dkms
dkms status

# Each module needs to be rebuilt for the new kernel version
# Verify the module is available for the target kernel version
```

## Step 5: Create Standard Golden Images

For cloud and VM environments, maintain golden images for each LTS release:

```bash
# Build process using Packer (example)
# Maintain separate templates for 22.04 and 24.04 during transition
# Template example: packer/ubuntu-24.04-base.pkr.hcl

# After building, validate:
packer build ubuntu-24.04-base.pkr.hcl

# Test the image
vagrant box add ubuntu-24.04-base ubuntu-24.04-base.box
vagrant up
# Run your test suite
```

Using immutable infrastructure means "upgrading" is replacing instances with new ones built from updated images, rather than in-place OS upgrades. This eliminates many upgrade risks.

## Step 6: Plan for Configuration Management

If you use Ansible, Chef, Puppet, or Salt, your configuration management code needs testing on the new OS version:

```bash
# Create a 24.04 test node
# Run your full playbook/cookbook/manifest against it
# Note what fails:

# Common issues:
# - Package names changed (libssl-dev vs libssl3-dev)
# - Service names changed
# - File paths moved
# - Module/plugin incompatibilities in the CM tool itself

# Fix in CM code before running against production
```

## Step 7: Document the Rollback Plan

For each migration, define the rollback:

**VM environments**:
- Take VM snapshot before OS upgrade
- Test that you can restore the snapshot
- Keep snapshot for 30 days post-migration

**Cloud instances**:
- For in-place upgrades: Create an AMI/image before starting
- For replacement deployments: Keep old instances running in parallel until new ones are validated

**Bare metal**:
- Keep the old partition around (set OS up on a separate disk if possible)
- Document the recovery steps to restore from backup
- Test the recovery procedure before the production migration window

## Step 8: Handling Persistent Services

Some services require special care during migration:

### Databases

```bash
# Never do an in-place OS upgrade on a running primary database
# Instead:
# 1. Promote a replica to primary
# 2. Upgrade the original primary (now a replica)
# 3. Verify the upgraded node
# 4. Promote it back or continue with the new arrangement

# For standalone databases: backup first, then upgrade
pg_dump mydb > mydb-backup-pre-upgrade.sql
```

### Message Queues

```bash
# For Kafka, RabbitMQ, Redis: drain queues before taking a node offline
# Check consumer group offsets before and after
kafka-consumer-groups.sh --bootstrap-server localhost:9092 --describe --all-groups
```

### Load Balancers

Remove the server from the load balancer before upgrading, upgrade, verify, then add it back:

```bash
# Example: AWS target group
aws elbv2 deregister-targets --target-group-arn arn:... --targets Id=i-xxx

# Upgrade the instance
sudo do-release-upgrade

# Verify services are working
curl -f http://localhost/health

# Re-register
aws elbv2 register-targets --target-group-arn arn:... --targets Id=i-xxx
```

## Communicating the Plan

A migration plan that only exists in one person's head is a liability. Document it:

```markdown
## Ubuntu Upgrade Plan: 22.04 to 24.04

**Target completion**: March 2027 (1 month before 22.04 EOL)
**Owner**: Infrastructure team

### Milestones
- [ ] Audit complete: [date]
- [ ] 24.04 golden image ready: [date]
- [ ] App compatibility testing: [date]
- [ ] Tier 3 migrations: [date]
- [ ] Tier 2 migrations: [date]
- [ ] Tier 1 staging: [date]
- [ ] Tier 1 production: [date]

### Rollback procedure
[Details]

### Contact during migration window
[Names and contact info]
```

The 5-year planning horizon does not mean you wait 5 years between upgrades. It means you always know exactly when each server needs to be migrated and have enough lead time to do it properly, without emergency migrations driven by EOL deadlines.
