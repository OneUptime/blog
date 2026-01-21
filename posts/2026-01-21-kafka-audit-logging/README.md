# How to Audit Kafka Access and Operations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Kafka, Audit Logging, Compliance, Security, Monitoring, Access Control

Description: A comprehensive guide to implementing audit logging in Apache Kafka for compliance, security monitoring, and troubleshooting purposes.

---

Audit logging in Apache Kafka tracks who accessed what data and when, which is essential for security, compliance (SOX, HIPAA, GDPR), and troubleshooting. This guide covers how to implement comprehensive audit logging for your Kafka cluster.

## Understanding Kafka Audit Requirements

Audit logging should capture:

- Authentication events (successful and failed logins)
- Authorization decisions (ACL checks)
- Topic operations (create, delete, alter)
- Message production and consumption
- Administrative operations

## Enabling Kafka Authorizer Logging

### Configure Log4j for Audit

```properties
# log4j.properties

# Authorizer audit logger
log4j.logger.kafka.authorizer.logger=INFO, authorizerAppender
log4j.additivity.kafka.authorizer.logger=false

log4j.appender.authorizerAppender=org.apache.log4j.RollingFileAppender
log4j.appender.authorizerAppender.File=/var/log/kafka/kafka-authorizer.log
log4j.appender.authorizerAppender.MaxFileSize=100MB
log4j.appender.authorizerAppender.MaxBackupIndex=10
log4j.appender.authorizerAppender.layout=org.apache.log4j.PatternLayout
log4j.appender.authorizerAppender.layout.ConversionPattern=[%d] %p %m (%c)%n

# Request logger for detailed access logging
log4j.logger.kafka.request.logger=WARN, requestAppender
log4j.additivity.kafka.request.logger=false

log4j.appender.requestAppender=org.apache.log4j.RollingFileAppender
log4j.appender.requestAppender.File=/var/log/kafka/kafka-request.log
log4j.appender.requestAppender.MaxFileSize=100MB
log4j.appender.requestAppender.MaxBackupIndex=10
log4j.appender.requestAppender.layout=org.apache.log4j.PatternLayout
log4j.appender.requestAppender.layout.ConversionPattern=[%d] %p %m (%c)%n
```

### Broker Configuration

```properties
# server.properties

# Enable authorizer logging
authorizer.class.name=kafka.security.authorizer.AclAuthorizer

# Log all authorization decisions
log4j.logger.kafka.authorizer.logger=DEBUG
```

## Custom Audit Interceptor

### Java Producer Interceptor

```java
import org.apache.kafka.clients.producer.ProducerInterceptor;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.clients.producer.RecordMetadata;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.util.Map;

public class AuditProducerInterceptor implements ProducerInterceptor<String, String> {

    private static final Logger auditLogger =
        LoggerFactory.getLogger("kafka.audit.producer");

    private String clientId;
    private String applicationName;

    @Override
    public void configure(Map<String, ?> configs) {
        this.clientId = (String) configs.get("client.id");
        this.applicationName = (String) configs.getOrDefault(
            "audit.application.name", "unknown");
    }

    @Override
    public ProducerRecord<String, String> onSend(ProducerRecord<String, String> record) {
        // Log before send
        AuditEvent event = new AuditEvent();
        event.setTimestamp(Instant.now().toString());
        event.setEventType("PRODUCE_ATTEMPT");
        event.setClientId(clientId);
        event.setApplication(applicationName);
        event.setTopic(record.topic());
        event.setPartition(record.partition());
        event.setKeySize(record.key() != null ? record.key().length() : 0);
        event.setValueSize(record.value() != null ? record.value().length() : 0);

        auditLogger.info(event.toJson());

        return record;
    }

    @Override
    public void onAcknowledgement(RecordMetadata metadata, Exception exception) {
        AuditEvent event = new AuditEvent();
        event.setTimestamp(Instant.now().toString());
        event.setClientId(clientId);
        event.setApplication(applicationName);

        if (exception == null) {
            event.setEventType("PRODUCE_SUCCESS");
            event.setTopic(metadata.topic());
            event.setPartition(metadata.partition());
            event.setOffset(metadata.offset());
        } else {
            event.setEventType("PRODUCE_FAILURE");
            event.setError(exception.getMessage());
        }

        auditLogger.info(event.toJson());
    }

    @Override
    public void close() {
    }

    static class AuditEvent {
        private String timestamp;
        private String eventType;
        private String clientId;
        private String application;
        private String topic;
        private Integer partition;
        private Long offset;
        private int keySize;
        private int valueSize;
        private String error;

        // Setters
        public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
        public void setEventType(String eventType) { this.eventType = eventType; }
        public void setClientId(String clientId) { this.clientId = clientId; }
        public void setApplication(String application) { this.application = application; }
        public void setTopic(String topic) { this.topic = topic; }
        public void setPartition(Integer partition) { this.partition = partition; }
        public void setOffset(Long offset) { this.offset = offset; }
        public void setKeySize(int keySize) { this.keySize = keySize; }
        public void setValueSize(int valueSize) { this.valueSize = valueSize; }
        public void setError(String error) { this.error = error; }

        public String toJson() {
            StringBuilder sb = new StringBuilder();
            sb.append("{");
            sb.append("\"timestamp\":\"").append(timestamp).append("\",");
            sb.append("\"eventType\":\"").append(eventType).append("\",");
            sb.append("\"clientId\":\"").append(clientId).append("\",");
            sb.append("\"application\":\"").append(application).append("\",");
            if (topic != null) sb.append("\"topic\":\"").append(topic).append("\",");
            if (partition != null) sb.append("\"partition\":").append(partition).append(",");
            if (offset != null) sb.append("\"offset\":").append(offset).append(",");
            sb.append("\"keySize\":").append(keySize).append(",");
            sb.append("\"valueSize\":").append(valueSize);
            if (error != null) sb.append(",\"error\":\"").append(error).append("\"");
            sb.append("}");
            return sb.toString();
        }
    }
}
```

### Java Consumer Interceptor

```java
import org.apache.kafka.clients.consumer.ConsumerInterceptor;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.OffsetAndMetadata;
import org.apache.kafka.common.TopicPartition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.util.Map;

public class AuditConsumerInterceptor implements ConsumerInterceptor<String, String> {

    private static final Logger auditLogger =
        LoggerFactory.getLogger("kafka.audit.consumer");

    private String clientId;
    private String groupId;
    private String applicationName;

    @Override
    public void configure(Map<String, ?> configs) {
        this.clientId = (String) configs.get("client.id");
        this.groupId = (String) configs.get("group.id");
        this.applicationName = (String) configs.getOrDefault(
            "audit.application.name", "unknown");
    }

    @Override
    public ConsumerRecords<String, String> onConsume(ConsumerRecords<String, String> records) {
        if (!records.isEmpty()) {
            StringBuilder sb = new StringBuilder();
            sb.append("{");
            sb.append("\"timestamp\":\"").append(Instant.now().toString()).append("\",");
            sb.append("\"eventType\":\"CONSUME\",");
            sb.append("\"clientId\":\"").append(clientId).append("\",");
            sb.append("\"groupId\":\"").append(groupId).append("\",");
            sb.append("\"application\":\"").append(applicationName).append("\",");
            sb.append("\"recordCount\":").append(records.count()).append(",");
            sb.append("\"partitions\":[");

            boolean first = true;
            for (TopicPartition tp : records.partitions()) {
                if (!first) sb.append(",");
                sb.append("{\"topic\":\"").append(tp.topic()).append("\",");
                sb.append("\"partition\":").append(tp.partition()).append("}");
                first = false;
            }
            sb.append("]}");

            auditLogger.info(sb.toString());
        }
        return records;
    }

    @Override
    public void onCommit(Map<TopicPartition, OffsetAndMetadata> offsets) {
        StringBuilder sb = new StringBuilder();
        sb.append("{");
        sb.append("\"timestamp\":\"").append(Instant.now().toString()).append("\",");
        sb.append("\"eventType\":\"COMMIT\",");
        sb.append("\"clientId\":\"").append(clientId).append("\",");
        sb.append("\"groupId\":\"").append(groupId).append("\",");
        sb.append("\"offsets\":[");

        boolean first = true;
        for (Map.Entry<TopicPartition, OffsetAndMetadata> entry : offsets.entrySet()) {
            if (!first) sb.append(",");
            sb.append("{\"topic\":\"").append(entry.getKey().topic()).append("\",");
            sb.append("\"partition\":").append(entry.getKey().partition()).append(",");
            sb.append("\"offset\":").append(entry.getValue().offset()).append("}");
            first = false;
        }
        sb.append("]}");

        auditLogger.info(sb.toString());
    }

    @Override
    public void close() {
    }
}
```

### Using Interceptors

```java
Properties props = new Properties();
props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
props.put(ProducerConfig.INTERCEPTOR_CLASSES_CONFIG,
    "com.example.AuditProducerInterceptor");
props.put("audit.application.name", "order-service");

KafkaProducer<String, String> producer = new KafkaProducer<>(props);
```

## Python Audit Logger

```python
from confluent_kafka import Producer, Consumer
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from functools import wraps

# Configure audit logger
audit_logger = logging.getLogger('kafka.audit')
audit_handler = logging.FileHandler('/var/log/kafka/audit.log')
audit_handler.setFormatter(logging.Formatter('%(message)s'))
audit_logger.addHandler(audit_handler)
audit_logger.setLevel(logging.INFO)


class AuditEvent:
    def __init__(self, event_type: str, **kwargs):
        self.data = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'eventType': event_type,
            **kwargs
        }

    def log(self):
        audit_logger.info(json.dumps(self.data))


class AuditedProducer:
    def __init__(self, config: Dict[str, Any], application_name: str):
        self.producer = Producer(config)
        self.application_name = application_name
        self.client_id = config.get('client.id', 'unknown')

    def produce(self, topic: str, key: Optional[str] = None,
                value: Optional[str] = None, **kwargs):
        # Log attempt
        AuditEvent('PRODUCE_ATTEMPT',
            clientId=self.client_id,
            application=self.application_name,
            topic=topic,
            keySize=len(key) if key else 0,
            valueSize=len(value) if value else 0
        ).log()

        # Wrap callback to add audit logging
        original_callback = kwargs.pop('callback', None)

        def audit_callback(err, msg):
            if err:
                AuditEvent('PRODUCE_FAILURE',
                    clientId=self.client_id,
                    application=self.application_name,
                    topic=topic,
                    error=str(err)
                ).log()
            else:
                AuditEvent('PRODUCE_SUCCESS',
                    clientId=self.client_id,
                    application=self.application_name,
                    topic=msg.topic(),
                    partition=msg.partition(),
                    offset=msg.offset()
                ).log()

            if original_callback:
                original_callback(err, msg)

        self.producer.produce(topic, key=key, value=value,
                             callback=audit_callback, **kwargs)

    def flush(self, timeout: float = -1):
        self.producer.flush(timeout)

    def poll(self, timeout: float = 0):
        return self.producer.poll(timeout)


class AuditedConsumer:
    def __init__(self, config: Dict[str, Any], application_name: str):
        self.consumer = Consumer(config)
        self.application_name = application_name
        self.client_id = config.get('client.id', 'unknown')
        self.group_id = config.get('group.id', 'unknown')

    def subscribe(self, topics: list):
        AuditEvent('SUBSCRIBE',
            clientId=self.client_id,
            application=self.application_name,
            groupId=self.group_id,
            topics=topics
        ).log()
        self.consumer.subscribe(topics)

    def poll(self, timeout: float = 1.0):
        msg = self.consumer.poll(timeout)

        if msg and not msg.error():
            AuditEvent('CONSUME',
                clientId=self.client_id,
                application=self.application_name,
                groupId=self.group_id,
                topic=msg.topic(),
                partition=msg.partition(),
                offset=msg.offset()
            ).log()

        return msg

    def commit(self, **kwargs):
        AuditEvent('COMMIT',
            clientId=self.client_id,
            application=self.application_name,
            groupId=self.group_id
        ).log()
        return self.consumer.commit(**kwargs)

    def close(self):
        AuditEvent('CLOSE',
            clientId=self.client_id,
            application=self.application_name,
            groupId=self.group_id
        ).log()
        self.consumer.close()


def main():
    # Producer example
    producer = AuditedProducer({
        'bootstrap.servers': 'localhost:9092',
        'client.id': 'order-producer'
    }, application_name='order-service')

    producer.produce('orders', key='order-123', value='{"amount": 100}')
    producer.flush()

    # Consumer example
    consumer = AuditedConsumer({
        'bootstrap.servers': 'localhost:9092',
        'group.id': 'order-processors',
        'client.id': 'order-consumer',
        'auto.offset.reset': 'earliest'
    }, application_name='order-processor')

    consumer.subscribe(['orders'])

    for _ in range(10):
        msg = consumer.poll(1.0)
        if msg and not msg.error():
            print(f"Received: {msg.value()}")

    consumer.close()


if __name__ == '__main__':
    main()
```

## Centralized Audit Collection

### Ship Audit Logs to Elasticsearch

```yaml
# filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/kafka/kafka-authorizer.log
      - /var/log/kafka/audit.log
    json.keys_under_root: true
    json.add_error_key: true
    fields:
      log_type: kafka_audit

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "kafka-audit-%{+yyyy.MM.dd}"
```

### Kafka Audit Topic

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.StringSerializer;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.*;

public class AuditTopicPublisher {

    private final KafkaProducer<String, String> producer;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final String AUDIT_TOPIC = "_kafka_audit";

    public AuditTopicPublisher(String bootstrapServers) {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG,
            StringSerializer.class.getName());
        props.put(ProducerConfig.ACKS_CONFIG, "all");

        this.producer = new KafkaProducer<>(props);
    }

    public void publishAuditEvent(AuditEvent event) {
        try {
            String value = objectMapper.writeValueAsString(event);
            String key = event.getClientId() + "-" + event.getTimestamp();

            producer.send(new ProducerRecord<>(AUDIT_TOPIC, key, value));
        } catch (Exception e) {
            // Log locally if audit publishing fails
            System.err.println("Failed to publish audit event: " + e.getMessage());
        }
    }

    public void close() {
        producer.close();
    }

    public static class AuditEvent {
        private String timestamp;
        private String eventType;
        private String clientId;
        private String principal;
        private String topic;
        private String operation;
        private boolean allowed;

        // Getters and setters
        public String getTimestamp() { return timestamp; }
        public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
        public String getEventType() { return eventType; }
        public void setEventType(String eventType) { this.eventType = eventType; }
        public String getClientId() { return clientId; }
        public void setClientId(String clientId) { this.clientId = clientId; }
        public String getPrincipal() { return principal; }
        public void setPrincipal(String principal) { this.principal = principal; }
        public String getTopic() { return topic; }
        public void setTopic(String topic) { this.topic = topic; }
        public String getOperation() { return operation; }
        public void setOperation(String operation) { this.operation = operation; }
        public boolean isAllowed() { return allowed; }
        public void setAllowed(boolean allowed) { this.allowed = allowed; }
    }
}
```

## Compliance Reporting

```python
from datetime import datetime, timedelta
from elasticsearch import Elasticsearch
from typing import List, Dict

class KafkaAuditReporter:
    def __init__(self, es_hosts: List[str]):
        self.es = Elasticsearch(es_hosts)
        self.index_pattern = "kafka-audit-*"

    def generate_access_report(self, start_date: datetime,
                               end_date: datetime) -> Dict:
        """Generate access report for compliance."""
        query = {
            "bool": {
                "filter": [
                    {
                        "range": {
                            "timestamp": {
                                "gte": start_date.isoformat(),
                                "lte": end_date.isoformat()
                            }
                        }
                    }
                ]
            }
        }

        # Get unique users
        users_agg = self.es.search(
            index=self.index_pattern,
            body={
                "query": query,
                "size": 0,
                "aggs": {
                    "unique_users": {
                        "terms": {"field": "principal.keyword", "size": 1000}
                    }
                }
            }
        )

        # Get operations by type
        ops_agg = self.es.search(
            index=self.index_pattern,
            body={
                "query": query,
                "size": 0,
                "aggs": {
                    "operations": {
                        "terms": {"field": "eventType.keyword", "size": 100}
                    }
                }
            }
        )

        # Get denied access attempts
        denied_query = {
            "bool": {
                "filter": [
                    {"range": {"timestamp": {"gte": start_date.isoformat(), "lte": end_date.isoformat()}}},
                    {"term": {"allowed": False}}
                ]
            }
        }

        denied_count = self.es.count(
            index=self.index_pattern,
            body={"query": denied_query}
        )['count']

        return {
            'report_period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'unique_users': [b['key'] for b in
                users_agg['aggregations']['unique_users']['buckets']],
            'operations': {b['key']: b['doc_count'] for b in
                ops_agg['aggregations']['operations']['buckets']},
            'denied_access_attempts': denied_count
        }

    def get_user_activity(self, principal: str,
                         days: int = 30) -> List[Dict]:
        """Get detailed activity for a specific user."""
        query = {
            "bool": {
                "filter": [
                    {"term": {"principal.keyword": principal}},
                    {"range": {"timestamp": {"gte": f"now-{days}d"}}}
                ]
            }
        }

        result = self.es.search(
            index=self.index_pattern,
            body={
                "query": query,
                "size": 1000,
                "sort": [{"timestamp": "desc"}]
            }
        )

        return [hit['_source'] for hit in result['hits']['hits']]


def main():
    reporter = KafkaAuditReporter(['localhost:9200'])

    # Generate monthly compliance report
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)

    report = reporter.generate_access_report(start_date, end_date)

    print("=== Kafka Access Compliance Report ===")
    print(f"Period: {report['report_period']['start']} to {report['report_period']['end']}")
    print(f"\nUnique Users: {len(report['unique_users'])}")
    print("\nOperations:")
    for op, count in report['operations'].items():
        print(f"  {op}: {count}")
    print(f"\nDenied Access Attempts: {report['denied_access_attempts']}")


if __name__ == '__main__':
    main()
```

## Best Practices

1. **Log all security-relevant events**: Authentication, authorization, topic operations
2. **Include sufficient context**: Timestamp, user, client ID, operation, outcome
3. **Protect audit logs**: Separate storage, restricted access, immutable storage
4. **Retain logs appropriately**: Based on compliance requirements (often 1-7 years)
5. **Monitor audit logs**: Alert on suspicious patterns
6. **Test audit logging**: Regularly verify logs are being captured correctly

## Conclusion

Comprehensive audit logging is essential for Kafka security, compliance, and operational visibility. By implementing authorizer logging, custom interceptors, and centralized log collection, you can maintain a complete audit trail of all Kafka operations. Regular compliance reporting and monitoring of audit logs helps identify security issues and demonstrates regulatory compliance.
