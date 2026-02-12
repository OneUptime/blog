# How to Configure OpenSearch Index Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, OpenSearch, Index Management, DevOps

Description: Step-by-step guide to creating and managing OpenSearch Index State Management (ISM) policies for automated index lifecycle management including rollover, shrink, and deletion.

---

If you're running OpenSearch for logging or analytics, your indices will pile up fast. Without lifecycle management, you'll eventually run into storage limits, degraded performance, or a surprise AWS bill. OpenSearch Index State Management (ISM) policies automate the lifecycle of your indices - from creation to deletion - so you don't have to think about it.

ISM policies define states and transitions. An index starts in one state, and based on conditions like age or size, it moves to the next. Each state can trigger actions like rollover, force merge, shrink, or delete. It's simple in concept but incredibly powerful in practice.

## Understanding ISM Policy Structure

An ISM policy has three main components: states, actions within those states, and transitions between states. Here's the conceptual flow for a typical log index lifecycle.

```mermaid
graph LR
    A[Hot State] -->|Age > 1 day| B[Warm State]
    B -->|Age > 30 days| C[Cold State]
    C -->|Age > 90 days| D[Delete State]
```

## Creating a Basic ISM Policy

Let's build a practical ISM policy for application logs. This policy will manage indices through hot, warm, cold, and delete phases.

```bash
# Create an ISM policy via the OpenSearch API
curl -X PUT "https://my-domain.us-east-1.es.amazonaws.com/_plugins/_ism/policies/app-logs-policy" \
  -H 'Content-Type: application/json' -d '{
  "policy": {
    "description": "Lifecycle policy for application log indices",
    "default_state": "hot",
    "states": [
      {
        "name": "hot",
        "actions": [
          {
            "rollover": {
              "min_size": "30gb",
              "min_index_age": "1d",
              "min_doc_count": 10000000
            }
          }
        ],
        "transitions": [
          {
            "state_name": "warm",
            "conditions": {
              "min_index_age": "2d"
            }
          }
        ]
      },
      {
        "name": "warm",
        "actions": [
          {
            "replica_count": {
              "number_of_replicas": 1
            }
          },
          {
            "force_merge": {
              "max_num_segments": 1
            }
          }
        ],
        "transitions": [
          {
            "state_name": "cold",
            "conditions": {
              "min_index_age": "30d"
            }
          }
        ]
      },
      {
        "name": "cold",
        "actions": [
          {
            "replica_count": {
              "number_of_replicas": 0
            }
          },
          {
            "read_only": {}
          }
        ],
        "transitions": [
          {
            "state_name": "delete",
            "conditions": {
              "min_index_age": "90d"
            }
          }
        ]
      },
      {
        "name": "delete",
        "actions": [
          {
            "notification": {
              "destination": {
                "sns": {
                  "topic_arn": "arn:aws:sns:us-east-1:123456789012:index-deletion-alerts"
                }
              },
              "message_template": {
                "source": "Index {{ctx.index}} is being deleted per retention policy."
              }
            }
          },
          {
            "delete": {}
          }
        ],
        "transitions": []
      }
    ],
    "ism_template": [
      {
        "index_patterns": ["app-logs-*"],
        "priority": 100
      }
    ]
  }
}'
```

The `ism_template` section at the bottom is important. It automatically attaches this policy to any new index matching the pattern `app-logs-*`. Without it, you'd need to manually attach the policy to each index.

## Setting Up Index Templates for Rollover

For the rollover action to work, you need an index template and an initial write alias. The rollover action creates new indices when size or age thresholds are met.

```bash
# Create an index template with rollover alias
curl -X PUT "https://my-domain.us-east-1.es.amazonaws.com/_index_template/app-logs-template" \
  -H 'Content-Type: application/json' -d '{
  "index_patterns": ["app-logs-*"],
  "template": {
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 2,
      "plugins.index_state_management.rollover_alias": "app-logs-write"
    },
    "mappings": {
      "properties": {
        "@timestamp": { "type": "date" },
        "level": { "type": "keyword" },
        "message": { "type": "text" },
        "service": { "type": "keyword" },
        "trace_id": { "type": "keyword" }
      }
    }
  }
}'

# Create the initial index with the write alias
curl -X PUT "https://my-domain.us-east-1.es.amazonaws.com/app-logs-000001" \
  -H 'Content-Type: application/json' -d '{
  "aliases": {
    "app-logs-write": {
      "is_write_index": true
    },
    "app-logs-read": {}
  }
}'
```

Now when your application writes to the `app-logs-write` alias, ISM will automatically create `app-logs-000002`, `app-logs-000003`, etc. as rollover conditions are met.

## Shrink Policy for Reducing Shard Count

If your hot indices use many shards for write performance but don't need them after they stop receiving data, a shrink action can reduce resource usage.

```bash
# ISM policy with shrink action
curl -X PUT "https://my-domain.us-east-1.es.amazonaws.com/_plugins/_ism/policies/shrink-policy" \
  -H 'Content-Type: application/json' -d '{
  "policy": {
    "description": "Shrink indices after rollover to reduce shard count",
    "default_state": "active",
    "states": [
      {
        "name": "active",
        "actions": [],
        "transitions": [
          {
            "state_name": "shrink",
            "conditions": {
              "min_index_age": "3d"
            }
          }
        ]
      },
      {
        "name": "shrink",
        "actions": [
          {
            "shrink": {
              "num_new_shards": 1,
              "target_alias": "shrunk-indices",
              "max_shard_size": "50gb",
              "force_unsafe": false
            }
          }
        ],
        "transitions": [
          {
            "state_name": "readonly",
            "conditions": {
              "min_index_age": "4d"
            }
          }
        ]
      },
      {
        "name": "readonly",
        "actions": [
          {
            "read_only": {}
          }
        ],
        "transitions": []
      }
    ]
  }
}'
```

## Monitoring ISM Policy Execution

Policies don't always execute cleanly. An index might fail to shrink because of shard allocation issues, or a force merge might time out. Always monitor your ISM execution.

```bash
# Check ISM policy status for a specific index
curl -s "https://my-domain.us-east-1.es.amazonaws.com/_plugins/_ism/explain/app-logs-000001" | jq '.'

# List all managed indices and their current states
curl -s "https://my-domain.us-east-1.es.amazonaws.com/_plugins/_ism/explain/*" | jq '.[] | {index: .index, state: .state, action: .action, step: .step}'

# Retry a failed policy execution
curl -X POST "https://my-domain.us-east-1.es.amazonaws.com/_plugins/_ism/retry/app-logs-000003" \
  -H 'Content-Type: application/json' -d '{
  "state": "warm"
}'
```

## Attaching Policies to Existing Indices

If you already have indices that aren't managed by ISM, you can attach a policy retroactively.

```bash
# Attach policy to a specific index
curl -X POST "https://my-domain.us-east-1.es.amazonaws.com/_plugins/_ism/add/old-logs-2025-*" \
  -H 'Content-Type: application/json' -d '{
  "policy_id": "app-logs-policy"
}'

# Change the policy on a managed index
curl -X POST "https://my-domain.us-east-1.es.amazonaws.com/_plugins/_ism/change_policy/app-logs-*" \
  -H 'Content-Type: application/json' -d '{
  "policy_id": "app-logs-policy-v2",
  "state": "warm"
}'
```

## Updating Policies Without Disruption

When you update a policy, existing managed indices continue using the old version. You need to explicitly tell them to pick up the new policy.

```bash
# Update the policy
curl -X PUT "https://my-domain.us-east-1.es.amazonaws.com/_plugins/_ism/policies/app-logs-policy" \
  -H 'Content-Type: application/json' -d '{
  "policy": {
    "description": "Updated - 60 day cold retention",
    ...
  }
}'

# Apply updated policy to all existing managed indices
curl -X POST "https://my-domain.us-east-1.es.amazonaws.com/_plugins/_ism/change_policy/app-logs-*" \
  -H 'Content-Type: application/json' -d '{
  "policy_id": "app-logs-policy",
  "state": "hot",
  "include": [{"state": "hot"}, {"state": "warm"}]
}'
```

## Tips for Production

A few lessons learned from running ISM policies at scale:

- **Start conservative with rollover thresholds.** A 30 GB rollover size is a good starting point. Too small means too many indices; too large means slow force merges.
- **Always set up notifications for the delete state.** You don't want to find out an index was deleted when someone asks for last quarter's data.
- **Test policies on non-production first.** A bad policy can trigger mass deletions or overwhelm your cluster with simultaneous force merges.
- **Monitor shard count.** Each state transition can affect shard counts, and OpenSearch has limits on total shards per node. Keep an eye on `_cat/shards` regularly.

For monitoring your OpenSearch cluster health alongside your ISM policies, check out how to set up [comprehensive monitoring](https://oneuptime.com/blog/post/set-up-opensearch-ingestion-pipelines/view) that covers both infrastructure and application layers.

ISM policies are one of those "set it and forget it" features - but only if you set them up correctly. Take the time to model your data lifecycle, test your policies, and monitor the transitions. Your cluster will run leaner and your storage costs will stay predictable.
