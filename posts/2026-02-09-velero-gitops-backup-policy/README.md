# How to Build Velero Integration with GitOps Workflows for Backup Policy Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Velero, GitOps, Automation, ArgoCD

Description: Learn how to build Velero integration with GitOps workflows for backup policy management, enabling version-controlled, auditable, and automated disaster recovery configurations through declarative infrastructure.

---

Managing Velero backup configurations through kubectl commands and manual updates creates inconsistency and makes it difficult to track changes over time. GitOps workflows bring version control, peer review, and automation to disaster recovery policies, ensuring your backup strategy evolves in a controlled, auditable manner.

## Why GitOps for Disaster Recovery

GitOps provides critical benefits for DR management:

- Version control for all backup policies
- Peer review before changes take effect
- Audit trail of who changed what and when
- Automated deployment of backup configurations
- Consistency across multiple clusters
- Disaster recovery for your disaster recovery (policies in Git)

When your backup configurations live in Git, you can treat disaster recovery policies like application code.

## Setting Up GitOps Repository

Create a repository structure for Velero configurations:

```bash
velero-gitops/
├── base/
│   ├── kustomization.yaml
│   ├── velero-install.yaml
│   └── backup-storage-location.yaml
├── overlays/
│   ├── production/
│   │   ├── kustomization.yaml
│   │   ├── backup-schedules.yaml
│   │   └── backup-policies.yaml
│   ├── staging/
│   │   ├── kustomization.yaml
│   │   └── backup-schedules.yaml
│   └── development/
│       ├── kustomization.yaml
│       └── backup-schedules.yaml
└── README.md
```

Base configuration:

```yaml
# base/backup-storage-location.yaml
apiVersion: velero.io/v1
kind: BackupStorageLocation
metadata:
  name: default
  namespace: velero
spec:
  provider: aws
  objectStorage:
    bucket: velero-backups
  config:
    region: us-east-1
    kmsKeyId: alias/velero-backups
---
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - backup-storage-location.yaml
```

Production overlay:

```yaml
# overlays/production/backup-schedules.yaml
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: production-hourly
  namespace: velero
spec:
  schedule: "0 * * * *"
  template:
    includedNamespaces:
    - production
    ttl: 72h0m0s
    labelSelector:
      matchLabels:
        tier: critical
---
apiVersion: velero.io/v1
kind: Schedule
metadata:
  name: production-daily
  namespace: velero
spec:
  schedule: "0 2 * * *"
  template:
    includedNamespaces:
    - production
    ttl: 720h0m0s
---
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: velero
bases:
  - ../../base
resources:
  - backup-schedules.yaml
```

## Integrating with ArgoCD

Deploy Velero configurations using ArgoCD:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: velero-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/velero-gitops
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: velero
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

ArgoCD automatically applies changes when you update the Git repository.

## Managing Multi-Cluster Backups

Use ApplicationSets for multi-cluster deployments:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: velero-multi-cluster
  namespace: argocd
spec:
  generators:
  - list:
      elements:
      - cluster: production-us-east
        url: https://prod-us-east.k8s.local
        bucket: velero-backups-us-east
        schedule: "0 * * * *"
      - cluster: production-eu-west
        url: https://prod-eu-west.k8s.local
        bucket: velero-backups-eu-west
        schedule: "0 * * * *"
      - cluster: staging
        url: https://staging.k8s.local
        bucket: velero-backups-staging
        schedule: "0 */4 * * *"
  template:
    metadata:
      name: 'velero-{{cluster}}'
    spec:
      project: default
      source:
        repoURL: https://github.com/your-org/velero-gitops
        targetRevision: main
        path: overlays/{{cluster}}
        helm:
          parameters:
          - name: backupStorageLocation.bucket
            value: '{{bucket}}'
          - name: schedule.schedule
            value: '{{schedule}}'
      destination:
        server: '{{url}}'
        namespace: velero
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

## Implementing Backup Policy as Code

Define backup policies declaratively:

```yaml
# backup-policy.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: backup-policy
  namespace: velero
data:
  policy.yaml: |
    # Backup Policy Definition
    version: v1

    tiers:
      critical:
        schedule: "*/15 * * * *"  # Every 15 minutes
        retention: 72h
        namespaces:
          - production
        labels:
          tier: critical

      standard:
        schedule: "0 */4 * * *"  # Every 4 hours
        retention: 168h
        namespaces:
          - production
        labels:
          tier: standard

      low:
        schedule: "0 2 * * *"  # Daily
        retention: 720h
        namespaces:
          - production
        labels:
          tier: low

    exclusions:
      namespaces:
        - kube-system
        - kube-public
        - kube-node-lease
      resources:
        - events
        - events.events.k8s.io
        - pods
```

Generate Velero schedules from policy:

```python
#!/usr/bin/env python3
# generate-schedules.py

import yaml
import sys

def generate_schedules(policy_file):
    """Generate Velero Schedule resources from policy."""

    with open(policy_file, 'r') as f:
        policy = yaml.safe_load(f)['data']['policy.yaml']
        policy_data = yaml.safe_load(policy)

    schedules = []

    for tier_name, tier_config in policy_data['tiers'].items():
        schedule = {
            'apiVersion': 'velero.io/v1',
            'kind': 'Schedule',
            'metadata': {
                'name': f'auto-{tier_name}',
                'namespace': 'velero',
                'labels': {
                    'managed-by': 'backup-policy',
                    'tier': tier_name
                }
            },
            'spec': {
                'schedule': tier_config['schedule'],
                'template': {
                    'ttl': tier_config['retention'],
                    'includedNamespaces': tier_config['namespaces'],
                    'excludedNamespaces': policy_data['exclusions']['namespaces'],
                    'excludedResources': policy_data['exclusions']['resources'],
                    'labelSelector': {
                        'matchLabels': tier_config['labels']
                    }
                }
            }
        }
        schedules.append(schedule)

    return schedules

if __name__ == '__main__':
    schedules = generate_schedules('backup-policy.yaml')

    for schedule in schedules:
        print('---')
        print(yaml.dump(schedule, default_flow_style=False))
```

## Implementing Pull Request Workflow

Add validation to pull requests:

```yaml
# .github/workflows/validate-velero.yaml
name: Validate Velero Configuration

on:
  pull_request:
    paths:
      - 'overlays/**'
      - 'base/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2

    - name: Install tools
      run: |
        # Install kustomize
        curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
        sudo mv kustomize /usr/local/bin/

        # Install kubeval
        wget https://github.com/instrumenta/kubeval/releases/latest/download/kubeval-linux-amd64.tar.gz
        tar xf kubeval-linux-amd64.tar.gz
        sudo mv kubeval /usr/local/bin/

    - name: Validate YAML
      run: |
        for overlay in overlays/*; do
          echo "Validating $overlay"
          kustomize build $overlay | kubeval --strict
        done

    - name: Check schedule syntax
      run: |
        python3 scripts/validate-schedules.py overlays/*/backup-schedules.yaml

    - name: Verify backup policies
      run: |
        # Check for required fields
        grep -r "ttl:" overlays/*/backup-schedules.yaml
        grep -r "includedNamespaces:" overlays/*/backup-schedules.yaml

    - name: Generate preview
      run: |
        echo "## Configuration Preview" >> $GITHUB_STEP_SUMMARY
        echo '```yaml' >> $GITHUB_STEP_SUMMARY
        kustomize build overlays/production >> $GITHUB_STEP_SUMMARY
        echo '```' >> $GITHUB_STEP_SUMMARY
```

## Automating Backup Validation

Add post-sync hooks to validate backups:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: validate-backup-config
  namespace: velero
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      serviceAccountName: velero
      containers:
      - name: validate
        image: velero/velero:latest
        command:
        - /bin/bash
        - -c
        - |
          # Verify schedules exist
          echo "Checking backup schedules..."
          SCHEDULES=$(velero schedule get -o json | jq -r '.items | length')

          if [ "$SCHEDULES" -lt 1 ]; then
            echo "ERROR: No backup schedules found"
            exit 1
          fi

          echo "Found $SCHEDULES schedules"

          # Verify backup storage location
          echo "Checking backup storage location..."
          velero backup-location get default

          # Test backup creation
          echo "Testing backup creation..."
          velero backup create validation-test \
            --include-namespaces default \
            --wait

          velero backup delete validation-test --confirm

          echo "Validation complete"
      restartPolicy: Never
```

## Implementing Change Approval Workflow

Require approval for production changes:

```yaml
# .github/workflows/deploy-production.yaml
name: Deploy to Production

on:
  push:
    branches:
      - main
    paths:
      - 'overlays/production/**'

jobs:
  require-approval:
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://argocd.example.com
    steps:
    - name: Wait for Approval
      run: echo "Approval required via GitHub environment protection"

  deploy:
    needs: require-approval
    runs-on: ubuntu-latest
    steps:
    - name: Trigger ArgoCD Sync
      run: |
        argocd app sync velero-production --force
```

## Monitoring GitOps Sync Status

Track sync status and drift:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-velero-alerts
  namespace: monitoring
spec:
  groups:
  - name: argocd.velero
    interval: 30s
    rules:
    - alert: VeleroConfigOutOfSync
      expr: |
        argocd_app_info{name="velero-production",sync_status!="Synced"} == 1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Velero configuration out of sync"
        description: "ArgoCD reports Velero config is not synced with Git"

    - alert: VeleroConfigSyncFailed
      expr: |
        argocd_app_info{name="velero-production",health_status="Degraded"} == 1
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Velero configuration sync failed"
```

## Managing Secrets with GitOps

Handle sensitive data securely:

```yaml
# Use sealed-secrets for cloud credentials
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: cloud-credentials
  namespace: velero
spec:
  encryptedData:
    cloud: AgBhT5...encrypted-data...
---
# Or use external-secrets
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: cloud-credentials
  namespace: velero
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: SecretStore
  target:
    name: cloud-credentials
  data:
  - secretKey: cloud
    remoteRef:
      key: velero/cloud-credentials
```

## Implementing Rollback Procedures

Rollback to previous backup configurations:

```bash
#!/bin/bash
# rollback-backup-config.sh

PREVIOUS_COMMIT=$1

if [ -z "$PREVIOUS_COMMIT" ]; then
  echo "Usage: $0 <previous-commit-sha>"
  exit 1
fi

echo "Rolling back Velero configuration to $PREVIOUS_COMMIT"

# Revert Git repository
git revert $PREVIOUS_COMMIT --no-edit
git push

# Trigger ArgoCD sync
argocd app sync velero-production --force

echo "Rollback initiated. Monitor ArgoCD for sync status."
```

## Documentation as Code

Store runbooks in the same repository:

```markdown
# overlays/production/RUNBOOK.md

# Production Velero Disaster Recovery Runbook

## Backup Configuration
- **Schedule**: Hourly for critical workloads, daily for standard
- **Retention**: 3 days for hourly, 30 days for daily
- **Storage**: S3 bucket `velero-backups-us-east`

## Making Changes
1. Create branch from `main`
2. Edit configurations in `overlays/production/`
3. Run `kustomize build overlays/production | kubeval`
4. Create pull request
5. Request review from DR team
6. Merge after approval
7. ArgoCD automatically applies changes

## Emergency Procedures
If GitOps is unavailable, apply directly:
```bash
kubectl apply -k overlays/production/
```
```

## Conclusion

GitOps workflows transform Velero backup management from ad-hoc commands to version-controlled, auditable infrastructure. By storing backup policies in Git, you gain change tracking, peer review, automated deployment, and consistency across environments.

Start with a simple Git repository structure, integrate with ArgoCD for automated deployment, and build validation into your pull request workflow. As your confidence grows, add policy-as-code generators, multi-cluster management, and automated testing.

Remember that your disaster recovery strategy is only as reliable as your backup configurations. GitOps ensures those configurations are version controlled, tested, and consistently applied across all your clusters.
