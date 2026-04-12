# How to Implement SOC 2 Compliance with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, SOC 2, Compliance

Description: Configure MongoDB to meet SOC 2 Trust Service Criteria with access controls, encryption, availability monitoring, change management, and audit evidence.

---

## SOC 2 and MongoDB

SOC 2 audits evaluate an organization's controls against five Trust Service Criteria: Security, Availability, Processing Integrity, Confidentiality, and Privacy. For MongoDB-backed systems, the Security and Availability criteria require the most technical controls. This guide covers the key MongoDB configurations that generate audit evidence.

## Security - Access Controls (CC6)

SOC 2 requires unique credentials, least-privilege access, and regular access reviews. In MongoDB:

```javascript
// Create service-specific users with minimal privileges
db.createUser({
  user: "app_service",
  pwd: passwordPrompt(),
  roles: [
    { role: "readWrite", db: "appdb" }
  ],
  mechanisms: ["SCRAM-SHA-256"],
  passwordDigestor: "server",
})

// Create a monitoring user with read-only access
db.createUser({
  user: "monitoring",
  pwd: passwordPrompt(),
  roles: [
    { role: "clusterMonitor", db: "admin" },
    { role: "read", db: "local" },
  ],
})

// List users for quarterly access review
db.system.users.find({}, { user: 1, roles: 1, _id: 0 })
```

## Security - Encryption (CC6.7)

```yaml
# mongod.conf
net:
  tls:
    mode: requireTLS
    certificateKeyFile: /etc/ssl/mongod.pem
    CAFile: /etc/ssl/ca.pem

security:
  authorization: enabled
  # Enterprise: encryption at rest
  enableEncryption: true
  encryptionKeyFile: /etc/mongodb/keyfile
```

## Availability - Monitoring and Alerting (A1)

SOC 2 Availability requires documented uptime monitoring and incident response. Configure alerting:

```bash
# Prometheus alert for MongoDB availability
cat > /etc/prometheus/rules/mongodb_soc2.yml << 'EOF'
groups:
  - name: mongodb_availability
    rules:
      - alert: MongoDBDown
        expr: up{job="mongodb"} == 0
        for: 1m
        annotations:
          summary: "MongoDB instance is down"
      - alert: MongoDBReplicationLag
        expr: mongodb_mongod_replset_member_replication_lag > 30
        for: 5m
        annotations:
          summary: "Replication lag exceeds SLA threshold"
EOF
```

## Audit Logging (CC7)

SOC 2 auditors expect evidence of who accessed what and when:

```yaml
auditLog:
  destination: file
  format: JSON
  path: /var/log/mongodb/audit.json
  filter: '{
    atype: {
      $in: [
        "authenticate", "logout",
        "createCollection", "dropCollection",
        "createIndex", "dropIndex",
        "createUser", "dropUser", "updateUser",
        "authCheck"
      ]
    }
  }'
```

Query audit logs to generate evidence for auditors:

```bash
# All authentication events in the past 30 days
cat /var/log/mongodb/audit.json | \
  python3 -c "
import sys, json
from datetime import datetime, timedelta
cutoff = (datetime.utcnow() - timedelta(days=30)).isoformat()
for line in sys.stdin:
  doc = json.loads(line)
  if doc.get('atype') == 'authenticate' and doc['ts']['\$date'] > cutoff:
    print(json.dumps({'ts': doc['ts'], 'user': doc['users'], 'result': doc['result']}))
"
```

## Change Management Evidence (CC8)

Track all schema and configuration changes:

```javascript
// Log index creation and configuration changes
db.adminCommand({
  setParameter: 1,
  auditAuthorizationSuccess: true,
})

// Create a change log collection for application-level schema changes
db.schema_changes.insertOne({
  changedAt: new Date(),
  changedBy: 'eng-team',
  changeType: 'index_added',
  collection: 'users',
  details: 'Added index on email field for performance',
  jiraTicket: 'ENG-1234',
})
```

## Backup and Recovery (A1.2)

Document your backup procedures as evidence:

```bash
#!/bin/bash
# soc2_backup.sh - Run nightly, retain 30 days
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri "$MONGO_URI" --out "/backup/mongodb_$DATE" --gzip
echo "Backup completed: /backup/mongodb_$DATE" >> /var/log/mongodb/backup.log

# Test restore monthly
mongorestore --uri "$MONGO_URI_TEST" --drop "/backup/latest" --gzip
```

## Summary

SOC 2 compliance evidence for MongoDB centers on four areas: access control documentation (user creation with least-privilege roles, quarterly reviews), encryption in transit and at rest, continuous availability monitoring with alerts, and audit logs capturing authentication, data access, and configuration changes. Export and retain these artifacts for your auditors, and document your backup and recovery procedures with tested restore times.
