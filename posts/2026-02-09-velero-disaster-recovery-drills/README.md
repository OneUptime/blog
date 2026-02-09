# How to Implement Velero Disaster Recovery Drills and Runbook Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Velero, Disaster Recovery, Automation

Description: Learn how to implement Velero disaster recovery drills and runbook automation to regularly test your backup strategy, validate recovery procedures, and ensure your team can respond effectively to real disasters.

---

Untested disaster recovery plans fail when you need them most. Velero backups are only useful if you can successfully restore from them under pressure. Regular disaster recovery drills validate your backup strategy, train your team, and uncover issues before real disasters strike.

## Why Disaster Recovery Drills Matter

DR drills provide critical validation:

- Verify backups actually contain recoverable data
- Measure actual RTO against targets
- Train team members on recovery procedures
- Identify missing documentation
- Test dependencies and assumptions
- Build confidence in disaster recovery capability

Organizations that skip DR drills often discover their backups don't work during actual disasters.

## Basic Manual DR Drill

Start with a simple manual drill:

```bash
#!/bin/bash
# manual-dr-drill.sh

echo "=== Disaster Recovery Drill Started ==="
echo "Date: $(date)"
echo "Operator: $USER"

# Step 1: Verify latest backup exists
echo ""
echo "Step 1: Checking latest backup..."
LATEST_BACKUP=$(velero backup get -o json | jq -r '.items | sort_by(.metadata.creationTimestamp) | last | .metadata.name')

if [ -z "$LATEST_BACKUP" ]; then
  echo "ERROR: No backups found"
  exit 1
fi

echo "Latest backup: $LATEST_BACKUP"

# Step 2: Create test namespace
echo ""
echo "Step 2: Creating test namespace..."
TEST_NS="dr-drill-$(date +%Y%m%d-%H%M%S)"
kubectl create namespace $TEST_NS

# Step 3: Perform restore
echo ""
echo "Step 3: Restoring to test namespace..."
START_TIME=$(date +%s)

velero restore create ${TEST_NS}-restore \
  --from-backup $LATEST_BACKUP \
  --namespace-mappings production:${TEST_NS} \
  --wait

END_TIME=$(date +%s)
RTO=$((END_TIME - START_TIME))

echo "Restore completed in ${RTO} seconds"

# Step 4: Verify restoration
echo ""
echo "Step 4: Verifying restored resources..."
POD_COUNT=$(kubectl get pods -n $TEST_NS --no-headers | wc -l)
echo "Restored pods: $POD_COUNT"

# Step 5: Test application functionality
echo ""
echo "Step 5: Testing application health..."
kubectl wait --for=condition=ready pod --all -n $TEST_NS --timeout=300s

# Step 6: Cleanup
echo ""
echo "Step 6: Cleaning up test namespace..."
kubectl delete namespace $TEST_NS

# Step 7: Report
echo ""
echo "=== Disaster Recovery Drill Complete ==="
echo "RTO Achieved: ${RTO} seconds"
echo "Status: SUCCESS"
```

Run this drill monthly to maintain readiness.

## Automated DR Drills

Automate drills using Kubernetes CronJobs:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: weekly-dr-drill
  namespace: velero
spec:
  schedule: "0 3 * * 0"  # Sunday 3 AM
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            app: dr-drill
        spec:
          serviceAccountName: velero
          containers:
          - name: dr-drill
            image: velero/velero:latest
            command:
            - /bin/bash
            - -c
            - |
              set -e

              # Get latest production backup
              BACKUP=$(velero backup get -l environment=production -o json | \
                jq -r '.items | sort_by(.metadata.creationTimestamp) | last | .metadata.name')

              echo "Testing backup: $BACKUP"

              # Create drill namespace
              DRILL_NS="dr-drill-$(date +%s)"
              kubectl create namespace $DRILL_NS

              # Restore with namespace mapping
              velero restore create drill-${DRILL_NS} \
                --from-backup $BACKUP \
                --namespace-mappings production:${DRILL_NS} \
                --wait

              # Verify pods become ready
              kubectl wait --for=condition=ready pod \
                --all -n $DRILL_NS \
                --timeout=600s

              # Check application health
              UNHEALTHY=$(kubectl get pods -n $DRILL_NS --field-selector=status.phase!=Running --no-headers | wc -l)

              if [ "$UNHEALTHY" -gt 0 ]; then
                echo "WARNING: $UNHEALTHY pods not running"
              fi

              # Cleanup
              kubectl delete namespace $DRILL_NS

              # Report metrics
              echo "DR drill completed successfully"
          restartPolicy: OnFailure
```

## Comprehensive DR Drill Framework

Build a complete drill framework with validation steps:

```python
#!/usr/bin/env python3
# dr-drill-framework.py

import subprocess
import json
import time
from datetime import datetime

class DRDrill:
    def __init__(self, backup_name, source_ns, test_ns):
        self.backup_name = backup_name
        self.source_ns = source_ns
        self.test_ns = test_ns
        self.start_time = None
        self.end_time = None
        self.results = {}

    def run(self):
        """Execute complete DR drill."""
        print(f"Starting DR Drill: {datetime.now()}")
        print(f"Backup: {self.backup_name}")
        print(f"Source: {self.source_ns} → Test: {self.test_ns}")
        print("=" * 60)

        try:
            self.verify_backup_exists()
            self.create_test_namespace()
            self.perform_restore()
            self.verify_resources()
            self.test_application_health()
            self.measure_rto()
            self.generate_report()
            return True
        except Exception as e:
            print(f"DR Drill FAILED: {e}")
            return False
        finally:
            self.cleanup()

    def verify_backup_exists(self):
        """Verify backup is available."""
        print("\n[1/7] Verifying backup exists...")
        result = subprocess.run(
            ['velero', 'backup', 'describe', self.backup_name, '-o', 'json'],
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            raise Exception(f"Backup {self.backup_name} not found")

        backup_data = json.loads(result.stdout)
        phase = backup_data['status']['phase']

        if phase != 'Completed':
            raise Exception(f"Backup status is {phase}, not Completed")

        self.results['backup_items'] = backup_data['status']['totalItems']
        print(f"✓ Backup verified: {self.results['backup_items']} items")

    def create_test_namespace(self):
        """Create test namespace."""
        print("\n[2/7] Creating test namespace...")
        subprocess.run(
            ['kubectl', 'create', 'namespace', self.test_ns],
            check=True
        )
        print(f"✓ Created namespace: {self.test_ns}")

    def perform_restore(self):
        """Perform Velero restore."""
        print("\n[3/7] Performing restore...")
        self.start_time = time.time()

        subprocess.run([
            'velero', 'restore', 'create', f'drill-{self.test_ns}',
            '--from-backup', self.backup_name,
            '--namespace-mappings', f'{self.source_ns}:{self.test_ns}',
            '--wait'
        ], check=True)

        self.end_time = time.time()
        self.results['restore_duration'] = self.end_time - self.start_time
        print(f"✓ Restore completed in {self.results['restore_duration']:.0f}s")

    def verify_resources(self):
        """Verify resources were restored."""
        print("\n[4/7] Verifying restored resources...")

        # Count pods
        result = subprocess.run(
            ['kubectl', 'get', 'pods', '-n', self.test_ns, '-o', 'json'],
            capture_output=True,
            text=True
        )
        pods = json.loads(result.stdout)['items']
        self.results['pod_count'] = len(pods)

        # Count services
        result = subprocess.run(
            ['kubectl', 'get', 'svc', '-n', self.test_ns, '-o', 'json'],
            capture_output=True,
            text=True
        )
        services = json.loads(result.stdout)['items']
        self.results['service_count'] = len(services)

        print(f"✓ Restored {self.results['pod_count']} pods, {self.results['service_count']} services")

    def test_application_health(self):
        """Test if applications are healthy."""
        print("\n[5/7] Testing application health...")

        # Wait for pods to be ready
        result = subprocess.run([
            'kubectl', 'wait', '--for=condition=ready', 'pod',
            '--all', '-n', self.test_ns,
            '--timeout=600s'
        ], capture_output=True, text=True)

        if result.returncode == 0:
            print("✓ All pods are ready")
            self.results['health_check'] = 'PASSED'
        else:
            print("⚠ Some pods failed to become ready")
            self.results['health_check'] = 'FAILED'

    def measure_rto(self):
        """Measure actual RTO."""
        print("\n[6/7] Measuring RTO...")
        rto_seconds = self.end_time - self.start_time
        rto_minutes = rto_seconds / 60

        self.results['rto_seconds'] = rto_seconds
        self.results['rto_minutes'] = rto_minutes

        print(f"✓ RTO: {rto_minutes:.1f} minutes ({rto_seconds:.0f} seconds)")

    def generate_report(self):
        """Generate drill report."""
        print("\n[7/7] Generating report...")

        report = f"""
Disaster Recovery Drill Report
{'=' * 60}
Date: {datetime.now()}
Backup: {self.backup_name}
Source Namespace: {self.source_ns}
Test Namespace: {self.test_ns}

Results:
--------
Backup Items: {self.results.get('backup_items', 'N/A')}
Pods Restored: {self.results.get('pod_count', 'N/A')}
Services Restored: {self.results.get('service_count', 'N/A')}
Health Check: {self.results.get('health_check', 'N/A')}
RTO Achieved: {self.results.get('rto_minutes', 'N/A'):.1f} minutes

Status: {'SUCCESS' if self.results.get('health_check') == 'PASSED' else 'FAILED'}
"""
        print(report)

        # Save report
        with open(f'/tmp/dr-drill-{self.test_ns}.txt', 'w') as f:
            f.write(report)

    def cleanup(self):
        """Cleanup test resources."""
        print("\nCleaning up...")
        subprocess.run(
            ['kubectl', 'delete', 'namespace', self.test_ns],
            stderr=subprocess.DEVNULL
        )
        print("✓ Cleanup complete")

if __name__ == '__main__':
    import sys

    if len(sys.argv) < 4:
        print("Usage: dr-drill-framework.py <backup-name> <source-ns> <test-ns>")
        sys.exit(1)

    drill = DRDrill(sys.argv[1], sys.argv[2], sys.argv[3])
    success = drill.run()
    sys.exit(0 if success else 1)
```

## Creating DR Runbooks

Document recovery procedures in executable runbooks:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dr-runbook-production
  namespace: velero
data:
  runbook.yaml: |
    name: Production Environment Recovery
    description: Complete recovery procedure for production workloads
    rto_target: 30 minutes
    rpo_target: 4 hours

    prerequisites:
      - Standby cluster is available
      - Network connectivity to backup storage
      - Access credentials are valid
      - DNS is available for failover

    steps:
      - name: Verify backup availability
        command: velero backup get production-latest
        expected: Status Completed
        critical: true

      - name: Create namespace
        command: kubectl create namespace production
        expected: namespace/production created

      - name: Restore configuration
        command: |
          velero restore create production-config \
            --from-backup production-latest \
            --include-resources configmaps,secrets \
            --wait
        expected: Restore completed
        critical: true

      - name: Restore applications
        command: |
          velero restore create production-apps \
            --from-backup production-latest \
            --include-resources deployments,statefulsets,services \
            --wait
        expected: Restore completed
        critical: true

      - name: Verify pods running
        command: kubectl get pods -n production
        expected: All pods Running

      - name: Test application endpoints
        command: curl -f https://api.example.com/health
        expected: HTTP 200

      - name: Update DNS
        command: aws route53 change-resource-record-sets ...
        manual: true
        expected: DNS updated to point to recovered cluster

    validation:
      - Check all critical services are running
      - Verify database connectivity
      - Test user-facing endpoints
      - Confirm monitoring is operational

    rollback:
      - If recovery fails, revert DNS to original cluster
      - Investigate backup or restore issues
      - Notify stakeholders
```

## Tabletop Exercises

Conduct tabletop exercises to prepare teams:

```markdown
# Disaster Recovery Tabletop Exercise

## Scenario
At 2:00 AM, the production cluster suffers a catastrophic failure.
All nodes are unavailable. You must recover to the standby cluster.

## Timeline

### T+0 minutes (2:00 AM)
- **Event**: Monitoring alerts fire for production cluster
- **Question**: Who gets paged? What's the escalation path?
- **Action**: Team assembles on incident call

### T+5 minutes
- **Assessment**: Cluster is completely unresponsive
- **Question**: How do you verify backup availability?
- **Action**: Check Velero backup status from another cluster

### T+10 minutes
- **Decision**: Begin recovery to standby cluster
- **Question**: What's the recovery procedure? Where's the runbook?
- **Action**: Execute DR runbook

### T+15 minutes
- **Restore**: Velero restore is running
- **Question**: How do you monitor restore progress?
- **Action**: Watch restore status and logs

### T+25 minutes
- **Validation**: Applications are restored
- **Question**: How do you verify functionality?
- **Action**: Run health checks and smoke tests

### T+30 minutes
- **Failover**: Ready to switch traffic
- **Question**: How do you update DNS/load balancers?
- **Action**: Execute DNS failover

### T+40 minutes
- **Operational**: Production is recovered
- **Question**: What about monitoring, logging, alerting?
- **Action**: Verify all supporting systems

## Discussion Points
1. What went well?
2. What could be improved?
3. What was unclear or missing?
4. What additional automation would help?
5. Did we meet RTO targets?

## Action Items
- [ ] Document gaps found during exercise
- [ ] Update runbooks based on feedback
- [ ] Implement missing automation
- [ ] Schedule next drill
```

## Measuring DR Drill Success

Define success criteria for drills:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dr-drill-criteria
  namespace: velero
data:
  criteria.yaml: |
    success_criteria:
      rto:
        target: 1800  # 30 minutes
        critical: true

      completeness:
        minimum_pods_restored: 10
        minimum_services_restored: 5
        critical: true

      health:
        pods_ready_percentage: 90
        critical: true

      functionality:
        health_checks_passed: true
        critical: true

    grading:
      excellent: All critical criteria met, RTO under target
      good: All critical criteria met, RTO within 20% of target
      acceptable: All critical criteria met, RTO within 50% of target
      failing: Any critical criteria not met
```

## Integrating Drills with CI/CD

Automate drill validation in pipelines:

```yaml
# .github/workflows/dr-drill.yaml
name: Disaster Recovery Drill

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly
  workflow_dispatch:

jobs:
  dr-drill:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2

    - name: Configure kubectl
      run: |
        echo "${{ secrets.KUBECONFIG }}" > kubeconfig
        export KUBECONFIG=kubeconfig

    - name: Install Velero CLI
      run: |
        wget https://github.com/vmware-tanzu/velero/releases/latest/download/velero-linux-amd64.tar.gz
        tar -xvf velero-linux-amd64.tar.gz
        sudo mv velero-linux-amd64/velero /usr/local/bin/

    - name: Run DR Drill
      run: |
        ./scripts/dr-drill.sh production dr-test-$(date +%s)

    - name: Upload Drill Report
      uses: actions/upload-artifact@v2
      with:
        name: dr-drill-report
        path: /tmp/dr-drill-*.txt

    - name: Notify Results
      if: failure()
      run: |
        curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
          -d '{"text": "DR Drill Failed! Check workflow logs."}'
```

## Conclusion

Regular disaster recovery drills transform theoretical backup strategies into proven recovery capabilities. Automate drills to run regularly, document procedures in executable runbooks, and measure actual RTO against targets. Conduct tabletop exercises to prepare your team for high-pressure recovery scenarios.

Start with simple monthly manual drills, then build automation as your confidence grows. Every drill should result in improvements to your backup strategy, runbooks, or team training. The goal is not just to have backups, but to have confidence that you can recover when it matters.

Remember: a disaster recovery plan you haven't tested is just documentation. Make DR drills a routine part of your operations, and you'll be ready when real disasters occur.
