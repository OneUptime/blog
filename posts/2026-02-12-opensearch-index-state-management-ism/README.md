# How to Set Up OpenSearch Index State Management (ISM)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, OpenSearch, Index Management, DevOps

Description: Learn how to configure Index State Management policies in Amazon OpenSearch to automate index lifecycle operations like rollover, shrink, and deletion.

---

If you're running OpenSearch for log analytics or any time-series data, your index count is going to grow. Fast. Without automation, you'll end up with thousands of indexes eating up storage and degrading performance. OpenSearch's Index State Management (ISM) solves this by letting you define policies that automatically transition indexes through different states - from hot to warm to cold to deleted.

Think of ISM as a lifecycle manager for your indexes. You define the states, the transitions, and the actions, and OpenSearch handles the rest.

## How ISM Works

An ISM policy is a state machine. Each state can have:
- **Actions** - Things to do when entering the state (rollover, snapshot, shrink, etc.)
- **Transitions** - Conditions that trigger moving to the next state (age, size, document count)

The ISM engine checks your indexes periodically (every 5 minutes by default) and applies transitions when conditions are met.

## A Practical ISM Policy

Here's a complete policy for a log analytics use case. Indexes start hot, move to warm after 7 days, become read-only after 30 days, and get deleted after 90 days:

```bash
# Create an ISM policy for log index lifecycle management
curl -XPUT "https://search-domain.us-east-1.es.amazonaws.com/_plugins/_ism/policies/log-lifecycle" \
    -H "Content-Type: application/json" \
    -d '{
    "policy": {
        "description": "Lifecycle policy for application log indexes",
        "default_state": "hot",
        "states": [
            {
                "name": "hot",
                "actions": [
                    {
                        "rollover": {
                            "min_size": "50gb",
                            "min_index_age": "1d",
                            "min_doc_count": 50000000
                        }
                    }
                ],
                "transitions": [
                    {
                        "state_name": "warm",
                        "conditions": {
                            "min_index_age": "7d"
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
                        "read_only": {}
                    },
                    {
                        "replica_count": {
                            "number_of_replicas": 0
                        }
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
                                "custom_webhook": {
                                    "url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
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
                "index_patterns": ["logs-*"],
                "priority": 100
            }
        ]
    }
}'
```

The `ism_template` at the bottom is important - it automatically attaches this policy to any new index matching `logs-*`. Without it, you'd have to manually attach the policy to each index.

## Understanding Rollover

The rollover action in the hot state is particularly important. Instead of creating one massive index that grows forever, rollover automatically creates a new index when the current one hits a size, age, or document count threshold.

For rollover to work, you need an index alias and a naming convention. Here's the setup:

```bash
# Create an index template with an alias for rollover
curl -XPUT "https://search-domain.us-east-1.es.amazonaws.com/_index_template/logs-template" \
    -H "Content-Type: application/json" \
    -d '{
    "index_patterns": ["logs-*"],
    "template": {
        "settings": {
            "number_of_shards": 3,
            "number_of_replicas": 2,
            "plugins.index_state_management.rollover_alias": "logs-write"
        },
        "mappings": {
            "properties": {
                "timestamp": {"type": "date"},
                "level": {"type": "keyword"},
                "service": {"type": "keyword"},
                "message": {"type": "text"},
                "host": {"type": "keyword"}
            }
        }
    }
}'

# Create the initial index with the write alias
curl -XPUT "https://search-domain.us-east-1.es.amazonaws.com/logs-000001" \
    -H "Content-Type: application/json" \
    -d '{
    "aliases": {
        "logs-write": {
            "is_write_index": true
        },
        "logs-read": {}
    }
}'
```

When the rollover triggers, OpenSearch creates `logs-000002`, moves the write alias to it, and your ingestion pipeline doesn't need to change anything since it writes to the `logs-write` alias.

## ISM with UltraWarm and Cold Storage

If your OpenSearch domain has UltraWarm or cold storage enabled, ISM can migrate indexes between storage tiers:

```bash
# ISM policy that uses UltraWarm and cold storage tiers
curl -XPUT "https://search-domain.us-east-1.es.amazonaws.com/_plugins/_ism/policies/tiered-storage" \
    -H "Content-Type: application/json" \
    -d '{
    "policy": {
        "description": "Move indexes through storage tiers",
        "default_state": "hot",
        "states": [
            {
                "name": "hot",
                "actions": [],
                "transitions": [
                    {
                        "state_name": "warm",
                        "conditions": {
                            "min_index_age": "3d"
                        }
                    }
                ]
            },
            {
                "name": "warm",
                "actions": [
                    {
                        "warm_migration": {}
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
                        "cold_migration": {
                            "timestamp_field": "timestamp"
                        }
                    }
                ],
                "transitions": [
                    {
                        "state_name": "delete",
                        "conditions": {
                            "min_index_age": "365d"
                        }
                    }
                ]
            },
            {
                "name": "delete",
                "actions": [
                    {"cold_delete": {}}
                ],
                "transitions": []
            }
        ]
    }
}'
```

UltraWarm uses S3-backed storage that's much cheaper than standard SSD storage. Cold storage is even cheaper but indexes must be detached and reattached to query them.

## Snapshot Before Delete

It's a good practice to take a snapshot of an index before deleting it. That way you can restore it if needed:

```bash
# Modified delete state that snapshots before deleting
# Requires a registered snapshot repository
curl -XPUT "https://search-domain.us-east-1.es.amazonaws.com/_plugins/_ism/policies/safe-delete" \
    -H "Content-Type: application/json" \
    -d '{
    "policy": {
        "description": "Snapshot then delete policy",
        "default_state": "active",
        "states": [
            {
                "name": "active",
                "actions": [],
                "transitions": [
                    {
                        "state_name": "pre_delete",
                        "conditions": {"min_index_age": "90d"}
                    }
                ]
            },
            {
                "name": "pre_delete",
                "actions": [
                    {
                        "snapshot": {
                            "repository": "s3-backup-repo",
                            "snapshot": "{{ctx.index}}-{{ctx.index_uuid}}"
                        }
                    }
                ],
                "transitions": [
                    {
                        "state_name": "delete",
                        "conditions": {"min_index_age": "91d"}
                    }
                ]
            },
            {
                "name": "delete",
                "actions": [{"delete": {}}],
                "transitions": []
            }
        ]
    }
}'
```

## Monitoring ISM Operations

Check the status of ISM on your indexes:

```bash
# See the current ISM state and policy for all managed indexes
curl -XGET "https://search-domain.us-east-1.es.amazonaws.com/_plugins/_ism/explain/logs-*"

# Check for failed ISM executions
curl -XGET "https://search-domain.us-east-1.es.amazonaws.com/_plugins/_ism/explain/logs-*" | \
    python3 -c "import sys,json; d=json.load(sys.stdin); [print(k,v.get('info',{}).get('message','OK')) for k,v in d.items() if isinstance(v,dict)]"
```

If an ISM operation fails (like a force merge running out of disk space), the policy retries automatically. You can also manually retry:

```bash
# Retry a failed ISM operation on a specific index
curl -XPOST "https://search-domain.us-east-1.es.amazonaws.com/_plugins/_ism/retry/logs-000042"
```

## Best Practices

**Size your shards right.** Each shard should be between 10-50 GB. If your daily log volume is 10 GB, you probably only need 1 shard per index. Too many tiny shards waste resources.

**Use force merge in warm state.** Merging segments down to 1 reduces overhead and improves search performance on older data.

**Set realistic retention periods.** Don't keep data longer than you actually need it. Storage costs add up, and searching across too many indexes slows everything down.

**Test policies on non-production first.** ISM operations like shrink and force merge can temporarily impact cluster performance.

ISM is essential for any OpenSearch deployment handling time-series data. For setting up alerts on the data flowing through these managed indexes, see [OpenSearch alerting](https://oneuptime.com/blog/post/2026-02-12-opensearch-alerting/view).
