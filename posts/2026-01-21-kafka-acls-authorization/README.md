# How to Set Up Kafka ACLs for Authorization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Apache Kafka, ACLs, Authorization, Security, Access Control, RBAC

Description: Learn how to configure Kafka Access Control Lists (ACLs) for fine-grained authorization, including topic permissions, consumer group access, and cluster operations.

---

Kafka ACLs (Access Control Lists) provide fine-grained authorization for securing your Kafka cluster. This guide covers ACL configuration for topics, consumer groups, and administrative operations.

## Prerequisites

Enable ACL authorizer in server.properties:

```properties
# Enable authorization
authorizer.class.name=kafka.security.authorizer.AclAuthorizer

# Super users (bypass ACLs)
super.users=User:admin

# Allow all if no ACLs (development only)
allow.everyone.if.no.acl.found=false
```

## ACL Basics

### ACL Structure

```
Principal + Permission + Operation + Resource + Host
```

- **Principal**: User identity (User:alice, User:CN=service)
- **Permission**: Allow or Deny
- **Operation**: Read, Write, Create, Delete, etc.
- **Resource**: Topic, Group, Cluster, TransactionalId
- **Host**: IP address or wildcard (*)

### Resource Types and Operations

| Resource | Valid Operations |
|----------|-----------------|
| Topic | Read, Write, Create, Delete, Describe, Alter, DescribeConfigs, AlterConfigs |
| Group | Read, Describe, Delete |
| Cluster | Create, ClusterAction, Describe, Alter, DescribeConfigs, AlterConfigs, IdempotentWrite |
| TransactionalId | Describe, Write |

## Managing ACLs

### Topic Permissions

```bash
# Grant read access to a topic
kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --add --allow-principal User:alice \
  --operation Read \
  --topic orders

# Grant write access to a topic
kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --add --allow-principal User:producer-service \
  --operation Write \
  --topic orders

# Grant full access to topic pattern
kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --add --allow-principal User:analytics \
  --operation All \
  --topic "events-" --resource-pattern-type prefixed
```

### Consumer Group Permissions

```bash
# Grant read access to consumer group
kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --add --allow-principal User:alice \
  --operation Read \
  --group order-processor

# Grant access to consumer group pattern
kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --add --allow-principal User:analytics-service \
  --operation Read \
  --group "analytics-" --resource-pattern-type prefixed
```

### Cluster Operations

```bash
# Grant topic creation permission
kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --add --allow-principal User:admin-service \
  --operation Create \
  --cluster

# Grant describe cluster permission
kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --add --allow-principal User:monitoring \
  --operation Describe \
  --cluster
```

### Transactional Producer

```bash
# Grant transactional write permission
kafka-acls.sh --bootstrap-server admin:9092 \
  --command-config admin.properties \
  --add --allow-principal User:transactional-producer \
  --operation Write \
  --transactional-id "tx-" --resource-pattern-type prefixed

# Grant idempotent write permission
kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --add --allow-principal User:transactional-producer \
  --operation IdempotentWrite \
  --cluster
```

## Listing and Removing ACLs

### List ACLs

```bash
# List all ACLs
kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --list

# List ACLs for specific topic
kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --list --topic orders

# List ACLs for specific principal
kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --list --principal User:alice
```

### Remove ACLs

```bash
# Remove specific ACL
kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --remove --allow-principal User:alice \
  --operation Read \
  --topic orders

# Remove all ACLs for a principal
kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --remove --principal User:old-service
```

## Java Admin Client

```java
import org.apache.kafka.clients.admin.*;
import org.apache.kafka.common.acl.*;
import org.apache.kafka.common.resource.*;

import java.util.*;

public class KafkaAclManager {
    private final AdminClient admin;

    public KafkaAclManager(String bootstrapServers) {
        Properties props = new Properties();
        props.put(AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put("security.protocol", "SASL_SSL");
        props.put("sasl.mechanism", "PLAIN");
        props.put("sasl.jaas.config",
            "org.apache.kafka.common.security.plain.PlainLoginModule required " +
            "username=\"admin\" password=\"admin-secret\";");

        this.admin = AdminClient.create(props);
    }

    public void grantTopicReadAccess(String principal, String topic) throws Exception {
        ResourcePattern resource = new ResourcePattern(
            ResourceType.TOPIC, topic, PatternType.LITERAL);

        AccessControlEntry ace = new AccessControlEntry(
            principal, "*", AclOperation.READ, AclPermissionType.ALLOW);

        AclBinding binding = new AclBinding(resource, ace);

        admin.createAcls(Collections.singleton(binding)).all().get();
        System.out.println("Granted READ on " + topic + " to " + principal);
    }

    public void grantConsumerGroupAccess(String principal, String group) throws Exception {
        // Topic read
        ResourcePattern topicResource = new ResourcePattern(
            ResourceType.TOPIC, "*", PatternType.LITERAL);
        AccessControlEntry topicAce = new AccessControlEntry(
            principal, "*", AclOperation.READ, AclPermissionType.ALLOW);

        // Group read
        ResourcePattern groupResource = new ResourcePattern(
            ResourceType.GROUP, group, PatternType.LITERAL);
        AccessControlEntry groupAce = new AccessControlEntry(
            principal, "*", AclOperation.READ, AclPermissionType.ALLOW);

        Collection<AclBinding> bindings = Arrays.asList(
            new AclBinding(topicResource, topicAce),
            new AclBinding(groupResource, groupAce)
        );

        admin.createAcls(bindings).all().get();
    }

    public void listAcls() throws Exception {
        Collection<AclBinding> acls = admin.describeAcls(AclBindingFilter.ANY)
            .values().get();

        for (AclBinding acl : acls) {
            System.out.printf("Resource: %s, Principal: %s, Operation: %s, Permission: %s%n",
                acl.pattern(),
                acl.entry().principal(),
                acl.entry().operation(),
                acl.entry().permissionType());
        }
    }

    public void removeAcl(String principal, String topic, AclOperation operation) throws Exception {
        ResourcePatternFilter resourceFilter = new ResourcePatternFilter(
            ResourceType.TOPIC, topic, PatternType.LITERAL);

        AccessControlEntryFilter aceFilter = new AccessControlEntryFilter(
            principal, "*", operation, AclPermissionType.ALLOW);

        AclBindingFilter filter = new AclBindingFilter(resourceFilter, aceFilter);

        admin.deleteAcls(Collections.singleton(filter)).all().get();
    }

    public void close() {
        admin.close();
    }
}
```

## Common ACL Patterns

### Producer Service

```bash
# Minimal producer permissions
kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --add --allow-principal User:order-producer \
  --operation Write \
  --operation Describe \
  --topic orders

# Idempotent producer
kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --add --allow-principal User:order-producer \
  --operation IdempotentWrite \
  --cluster
```

### Consumer Service

```bash
# Consumer with specific group
kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --add --allow-principal User:order-consumer \
  --operation Read \
  --operation Describe \
  --topic orders

kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --add --allow-principal User:order-consumer \
  --operation Read \
  --group order-processing-group
```

### Kafka Streams Application

```bash
# Streams app needs multiple permissions
PRINCIPAL="User:streams-app"
APP_ID="order-processing"

# Read from input topics
kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --add --allow-principal $PRINCIPAL \
  --operation Read \
  --topic orders

# Write to output topics
kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --add --allow-principal $PRINCIPAL \
  --operation Write \
  --topic processed-orders

# Internal topics (repartition, changelog)
kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --add --allow-principal $PRINCIPAL \
  --operation All \
  --topic "${APP_ID}-" --resource-pattern-type prefixed

# Consumer group for streams
kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --add --allow-principal $PRINCIPAL \
  --operation All \
  --group "${APP_ID}-" --resource-pattern-type prefixed
```

### Kafka Connect

```bash
PRINCIPAL="User:kafka-connect"

# Connect internal topics
kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --add --allow-principal $PRINCIPAL \
  --operation All \
  --topic connect-configs

kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --add --allow-principal $PRINCIPAL \
  --operation All \
  --topic connect-offsets

kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --add --allow-principal $PRINCIPAL \
  --operation All \
  --topic connect-status

# Consumer group for Connect
kafka-acls.sh --bootstrap-server localhost:9092 \
  --command-config admin.properties \
  --add --allow-principal $PRINCIPAL \
  --operation All \
  --group connect-cluster
```

## Best Practices

| Practice | Description |
|----------|-------------|
| Least privilege | Grant only required permissions |
| Use prefixed patterns | Group related resources |
| Document ACLs | Maintain ACL inventory |
| Regular audits | Review and clean up ACLs |
| Separate admin users | Different users for different operations |

## Troubleshooting

### Check Authorization Logs

```properties
# Enable authorization logging
log4j.logger.kafka.authorizer.logger=INFO
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| TopicAuthorizationException | No read/write permission | Grant topic ACL |
| GroupAuthorizationException | No consumer group permission | Grant group ACL |
| ClusterAuthorizationException | No cluster permission | Grant cluster ACL |

Properly configured ACLs are essential for securing multi-tenant Kafka deployments and meeting compliance requirements.
