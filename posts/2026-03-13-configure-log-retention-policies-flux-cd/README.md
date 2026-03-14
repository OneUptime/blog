# How to Configure Log Retention Policies with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Logging, Elasticsearch, OpenSearch, Index Lifecycle Management, Retention

Description: Manage log retention policies for Elasticsearch and OpenSearch using Flux CD GitOps to automate index lifecycle and cost control.

---

## Introduction

Log data grows rapidly and without lifecycle management it consumes ever-increasing storage and degrades query performance. Elasticsearch and OpenSearch both provide Index Lifecycle Management (ILM) — a policy engine that automatically rolls over, shrinks, and deletes indices as they age. Configuring ILM through Flux CD brings the same GitOps discipline to data governance that you apply to application deployments.

When retention policies live in Git, your team has an auditable record of what data you commit to keeping and for how long. Compliance teams can review and approve retention policies through pull requests. Changes to retention windows — from 30 days to 90 days for a new regulatory requirement — are tracked with the same rigor as code changes.

This post covers configuring ILM policies in Elasticsearch and ISM policies in OpenSearch using Kubernetes Jobs and ConfigMaps managed by Flux CD.

## Prerequisites

- Elasticsearch 7.x+ or OpenSearch deployed via Flux CD
- `kubectl` and `flux` CLIs installed
- Kubernetes v1.26+ with Flux CD bootstrapped

## Step 1: Define the ILM Policy as a ConfigMap

Store the policy JSON in a ConfigMap so it is version-controlled and diffable in Git.

```yaml
# infrastructure/logging/ilm-policy-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ilm-policies
  namespace: logging
data:
  # 30-day hot-warm-delete policy for application logs
  app-logs-policy.json: |
    {
      "policy": {
        "phases": {
          "hot": {
            "min_age": "0ms",
            "actions": {
              "rollover": {
                "max_size": "20gb",
                "max_age": "1d"
              },
              "set_priority": { "priority": 100 }
            }
          },
          "warm": {
            "min_age": "7d",
            "actions": {
              "shrink": { "number_of_shards": 1 },
              "forcemerge": { "max_num_segments": 1 },
              "set_priority": { "priority": 50 }
            }
          },
          "delete": {
            "min_age": "30d",
            "actions": {
              "delete": {}
            }
          }
        }
      }
    }

  # 90-day policy for compliance/audit logs
  audit-logs-policy.json: |
    {
      "policy": {
        "phases": {
          "hot": {
            "actions": {
              "rollover": { "max_age": "7d", "max_size": "50gb" }
            }
          },
          "warm": {
            "min_age": "30d",
            "actions": {
              "shrink": { "number_of_shards": 1 },
              "forcemerge": { "max_num_segments": 1 }
            }
          },
          "cold": {
            "min_age": "60d",
            "actions": {
              "freeze": {}
            }
          },
          "delete": {
            "min_age": "90d",
            "actions": { "delete": {} }
          }
        }
      }
    }
```

## Step 2: Create a Job to Apply ILM Policies

Use a Kubernetes Job triggered by a Flux Kustomization to apply policies on startup and after any config change.

```yaml
# infrastructure/logging/apply-ilm-policies-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: apply-ilm-policies
  namespace: logging
  annotations:
    # Recreate the Job when the ConfigMap changes (use a hash annotation in practice)
    checksum/config: "{{ include (print $.Template.BasePath \"/ilm-policy-configmap.yaml\") . | sha256sum }}"
spec:
  ttlSecondsAfterFinished: 600
  template:
    spec:
      restartPolicy: OnFailure
      volumes:
        - name: policies
          configMap:
            name: ilm-policies
      containers:
        - name: apply-policies
          image: curlimages/curl:8.7.1
          volumeMounts:
            - name: policies
              mountPath: /policies
          env:
            - name: ES_HOST
              value: "http://elasticsearch-master.logging.svc.cluster.local:9200"
            - name: ES_USER
              valueFrom:
                secretKeyRef:
                  name: elasticsearch-credentials
                  key: username
            - name: ES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: elasticsearch-credentials
                  key: password
          command:
            - /bin/sh
            - -c
            - |
              set -e
              # Wait for Elasticsearch
              until curl -s -u "${ES_USER}:${ES_PASSWORD}" "${ES_HOST}/_cluster/health" | grep -q '"status"'; do
                echo "Waiting for Elasticsearch..."; sleep 10
              done

              echo "Applying app-logs ILM policy..."
              curl -s -XPUT \
                -u "${ES_USER}:${ES_PASSWORD}" \
                -H "Content-Type: application/json" \
                "${ES_HOST}/_ilm/policy/app-logs-30day" \
                -d @/policies/app-logs-policy.json

              echo "Applying audit-logs ILM policy..."
              curl -s -XPUT \
                -u "${ES_USER}:${ES_PASSWORD}" \
                -H "Content-Type: application/json" \
                "${ES_HOST}/_ilm/policy/audit-logs-90day" \
                -d @/policies/audit-logs-policy.json

              echo "Creating index template linking to ILM policy..."
              curl -s -XPUT \
                -u "${ES_USER}:${ES_PASSWORD}" \
                -H "Content-Type: application/json" \
                "${ES_HOST}/_index_template/app-logs-template" \
                -d '{
                  "index_patterns": ["app-logs-*"],
                  "template": {
                    "settings": {
                      "index.lifecycle.name": "app-logs-30day",
                      "index.lifecycle.rollover_alias": "app-logs"
                    }
                  }
                }'

              echo "All policies applied successfully."
```

## Step 3: Configure OpenSearch ISM Policy (Alternative)

For OpenSearch clusters, use ISM policies instead of ILM:

```yaml
# infrastructure/search/ism-policy-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: ism-policies
  namespace: search
data:
  app-logs-ism.json: |
    {
      "policy": {
        "description": "30-day retention for application logs",
        "default_state": "hot",
        "states": [
          {
            "name": "hot",
            "actions": [
              { "rollover": { "min_index_age": "1d", "min_size": "20gb" } }
            ],
            "transitions": [
              { "state_name": "warm", "conditions": { "min_index_age": "7d" } }
            ]
          },
          {
            "name": "warm",
            "actions": [
              { "force_merge": { "max_num_segments": 1 } },
              { "replica_count": { "number_of_replicas": 0 } }
            ],
            "transitions": [
              { "state_name": "delete", "conditions": { "min_index_age": "30d" } }
            ]
          },
          {
            "name": "delete",
            "actions": [{ "delete": {} }],
            "transitions": []
          }
        ],
        "ism_template": [
          { "index_patterns": ["app-logs-*"], "priority": 100 }
        ]
      }
    }
```

## Step 4: Organize with Flux Kustomization

```yaml
# clusters/production/logging-retention-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: log-retention-policies
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/logging/retention
  prune: true
  dependsOn:
    - name: elasticsearch
```

## Step 5: Verify Policies Are Applied

```bash
# Check ILM policies in Elasticsearch
kubectl exec -n logging elasticsearch-master-0 -- \
  curl -s -u elastic:password http://localhost:9200/_ilm/policy | jq .

# Check index lifecycle status
kubectl exec -n logging elasticsearch-master-0 -- \
  curl -s -u elastic:password "http://localhost:9200/app-logs-*/_ilm/explain" | jq .

# View index ages
kubectl exec -n logging elasticsearch-master-0 -- \
  curl -s -u elastic:password "http://localhost:9200/_cat/indices/app-logs-*?v&s=creation.date.string"
```

## Best Practices

- Always link index templates to ILM/ISM policies so new indices automatically inherit the lifecycle policy.
- Use rollover aliases rather than pointing directly at index names so clients continue working across rollovers.
- Store the policy JSON in a ConfigMap with a content hash annotation on the Job to trigger re-application when policies change.
- Test retention policies in a development cluster with accelerated time (set `index.lifecycle.poll_interval` to `1m`) before applying to production.
- Document your retention periods in comments within the policy JSON for compliance auditability.

## Conclusion

Log retention policies managed through Flux CD ensure that data governance is as well-controlled as your application deployments. By storing ILM and ISM policies in Git and applying them via Kubernetes Jobs, you get an auditable record of retention decisions, easy environment promotion, and automatic application on cluster bootstrap. Compliance teams can review and approve policy changes through standard pull requests, turning log retention from an afterthought into a first-class part of your platform governance.
