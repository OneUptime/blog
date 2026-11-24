# Configure Kafka Consumer CRC Checks for YDB Compatibility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Database, Kafka, Java, Troubleshooting

Description: Apply YDB's documented check.crcs=false consumer setting, verify the effective Java configuration, and keep TLS and payload validation separate.

A Kafka consumer reaches YDB, receives metadata, and then fails when it starts reading records. Successful connectivity does not prove compatibility with every part of the Kafka record format.

YDB's [Kafka API constraints](https://ydb.tech/docs/en/reference/kafka-api/constraints) document that CRC checks are unsupported. Its [release 26.2.1.16 reader examples](https://github.com/ydb-platform/ydb/blob/26.2.1.16/ydb/docs/en/core/reference/kafka-api/examples.md) explicitly require `check.crcs=false` in the reader configuration.

Apply that setting to the consumer that reads YDB. Verify it reaches the actual client, and keep this compatibility choice separate from TLS verification, authentication, and application-level validation.

## Know which check is changing

CRC means cyclic redundancy check: a calculation used to detect accidental corruption in a record's bytes. Apache Kafka's [consumer reference](https://kafka.apache.org/39/configuration/consumer-configs/) documents `check.crcs` and its default of `true` for the Java client.

This setting is not a certificate check. It does not authenticate the broker, authorize topic access, or validate the meaning of your event. Setting it to false changes one consumer record-validation behavior; it is not a reason to weaken encryption or hostname verification.

```mermaid
flowchart LR
    Settings[YDB-specific consumer settings] --> Client[Kafka consumer instance]
    Client --> TLS[Connection and TLS checks]
    TLS --> Auth[Authentication and topic authorization]
    Auth --> Fetch[Fetch records]
    Fetch --> CRC[Apply configured CRC policy]
    CRC --> Decode[Deserialize and validate event]
    Decode --> Process[Apply event and commit progress]
```

The stages help classify a failure. A bad certificate occurs before record processing. An unknown topic is not repaired by changing CRC policy. A malformed application payload can still fail after CRC checking is disabled.

## Put the setting in the consumer configuration

For a properties file consumed directly by the Java client, the required entry is:

```properties
check.crcs=false
```

Place it in the configuration used to construct the YDB consumer. Adding it to a producer, an administrator client, or a broker configuration does not configure that consumer.

Keep the rest of the approved consumer configuration intact: bootstrap servers, group identity where needed, key/value deserializers, security protocol, credentials, certificate trust, and offset policy. This article does not replace those settings with a generic working configuration.

If a framework creates Kafka consumers, identify its documented consumer-property forwarding mechanism. A property in the wrong configuration section may be ignored even though the application starts. For connectors or stream-processing libraries, inspect their supported configuration path instead of assuming that every Kafka-related property is automatically passed through.

## Scope the override to YDB

Suppose one service talks to both YDB and a conventional Kafka deployment. Mutating a shared properties map can unintentionally change both clients. Create a dedicated copy for the YDB reader.

The following helper compiles against `org.apache.kafka:kafka-clients:3.9.1`:

```java
import java.util.HashMap;
import java.util.Map;
import org.apache.kafka.clients.consumer.ConsumerConfig;

public final class YdbConsumerConfig {
    private YdbConsumerConfig() {}

    public static Map<String, Object> forYdb(Map<String, Object> base) {
        Map<String, Object> result = new HashMap<>(base);
        result.put(ConsumerConfig.CHECK_CRCS_CONFIG, false);
        return result;
    }
}
```

Use the returned map when constructing the intended Kafka consumer. The helper intentionally changes only the CRC setting. It does not select authentication, change a group, reset offsets, or infer which endpoint belongs to YDB.

The [Kafka 3.9.1 source](https://github.com/apache/kafka/blob/3.9.1/clients/src/main/java/org/apache/kafka/clients/consumer/ConsumerConfig.java) defines `CHECK_CRCS_CONFIG` as `check.crcs`, parses it as a Boolean, and defaults it to true. The helper is included as [YdbConsumerConfig.java](./YdbConsumerConfig.java).

Pinning a client dependency makes the configuration example reproducible. It is not proof that every protocol feature of that client release is implemented by YDB; continue using YDB's compatibility documentation for the operations your application needs.

## Verify the effective setting without printing secrets

A configuration file can be overridden by environment-specific values or a framework's defaults. Check the final configuration after those layers have been applied, close to consumer construction.

The included [ConfigCheck.java](./ConfigCheck.java) uses Kafka's own `ConsumerConfig.configDef().parse(...)` schema to verify the default, the override, and preservation of the original input map. It also checks that an existing `SASL_SSL` setting remains unchanged.

This test was compiled and executed with JDK 17 and the real Kafka 3.9.1 client dependency. It passed without creating a KafkaConsumer or making a network connection. That is evidence about configuration parsing, not a successful read from YDB.

In an application, expose only the non-secret settings needed for this check, such as the effective CRC flag and client identifier. Do not dump the entire properties map: it may contain authentication information or sensitive paths.

## Run a bounded staging read

Once the listener, authentication, permissions, and staging topic are ready, Kafka 3.9.1 console tools support a scoped read like this:

```bash
bin/kafka-console-consumer.sh \
  --bootstrap-server kafka.internal.example:9093 \
  --consumer.config ./protected-consumer.properties \
  --consumer-property check.crcs=false \
  --topic crc-fixture \
  --group crc-review \
  --max-messages 1 \
  --timeout-ms 10000
```

Replace the endpoint, topic, and group with approved staging values. The properties file must contain the required security and deserializer configuration. Use a dedicated consumer/group configured for this exercise, with no conflicting group identifier in the file. Arrange for an identifiable test event to be available according to the consumer's offset policy.

The command can read and advance consumer progress; do not aim it at a production worker's group. `--max-messages` bounds successful consumption, while `--timeout-ms` is an inactivity timeout, not a complete hard deadline for every stage of the process.

These flags and the precedence of `--consumer-property` over the file were checked against [Kafka 3.9.1 console-consumer source](https://github.com/apache/kafka/blob/3.9.1/tools/src/main/java/org/apache/kafka/tools/consumer/ConsoleConsumerOptions.java). The command itself was not executed against a broker.

## Keep the rest of the integrity checks

After the compatibility change, verify the event identifier, key, payload fields, and expected downstream effect. A consumer that returns bytes successfully may still use the wrong deserializer or interpret an unexpected schema.

Retain TLS trust and hostname verification for the network connection. Use application schema checks and replay protection where the workflow requires them. Those mechanisms solve different problems; none should be described as restoring the specific Kafka CRC validation that was disabled.

If reading still fails, capture the precise error and its stage. Investigate authentication, topic naming, consumer registration, offsets, deserialization, and other documented API limitations as separate hypotheses. Do not keep changing unrelated settings after the effective CRC value has been verified.

The local review proved configuration behavior and shell syntax only. A complete acceptance test still needs a real YDB read, a controlled restart, and verification that the expected event is processed according to the application's delivery and checkpoint rules.
