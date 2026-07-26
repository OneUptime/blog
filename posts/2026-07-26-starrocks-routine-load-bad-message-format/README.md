# Why Does StarRocks Routine Load Say “Bad Message Format”?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: StarRocks, Kafka, Routine Load, DNS, Data Ingestion

Description: Resolve StarRocks Routine Load "Bad message format" errors by checking Kafka-advertised hostnames before changing payload parsers.

---

In StarRocks' Routine Load FAQ, the specific error `Bad message format` is associated with Kafka hostname resolution. That wording is misleading: it can send operators toward JSON paths and CSV delimiters even when StarRocks has not successfully reached the broker that owns the partition.

Start with Kafka metadata and network identity. Investigate payload parsing only after every Routine Load coordinator can resolve and connect to every address Kafka advertises.

## Preserve the Failing Job State

```sql
SHOW ROUTINE LOAD FOR ingestion.kafka_orders\G
SHOW ROUTINE LOAD TASK WHERE JobName = 'kafka_orders';
```

Record:

- `ReasonOfStateChanged`
- `OtherMsg`
- `ErrorLogUrls` and `TrackingSQL`
- broker list and topic
- the BE identified by each task
- partition progress and latest source positions

This distinguishes a broker-protocol or metadata failure from rejected rows. Payload errors normally produce rejected-row details and increase error-row statistics. A metadata connection failure may occur before any message body is parsed.

## Understand the Kafka Connection Path

The `kafka_broker_list` is a bootstrap list, not necessarily the complete set of endpoints used for consumption.

The path is:

```text
StarRocks coordinator BE
        |
        | connects to bootstrap address
        v
Kafka cluster metadata
        |
        | returns each broker's advertised listener
        v
StarRocks connects to partition leader by advertised hostname and port
```

A bootstrap IP can work while the job still fails because the metadata response contains `kafka-2.internal.example`, which a BE cannot resolve. Kafka's `advertised.listeners` setting controls the addresses published to clients.

## Test from Every Eligible StarRocks Node

Run these checks on each BE or CN that can coordinate a Routine Load task:

```bash
getent hosts kafka-0.internal.example
getent hosts kafka-1.internal.example
getent hosts kafka-2.internal.example

nc -vz kafka-0.internal.example 9092
nc -vz kafka-1.internal.example 9092
nc -vz kafka-2.internal.example 9092
```

`getent` checks the host's configured resolver path, including DNS and `/etc/hosts`. A successful `ping` is not required and is not sufficient; Kafka needs the configured TCP listener.

Use a Kafka-aware client with the same security protocol to display returned metadata:

```bash
kcat -b kafka-bootstrap.internal.example:9092 \
  -L \
  -X security.protocol=SSL \
  -X ssl.ca.location=/etc/kafka/ca.pem
```

Do not put SASL passwords directly in a shared shell history. Use a protected client configuration file or your platform's secret mechanism.

The important output is the complete broker list. Resolve and reach every advertised name, not only the bootstrap name.

## Fix the Naming Layer

The StarRocks FAQ recommends adding Kafka hostname mappings to `/etc/hosts` on every server hosting a StarRocks node. That can restore service:

```text
10.20.0.11 kafka-0.internal.example
10.20.0.12 kafka-1.internal.example
10.20.0.13 kafka-2.internal.example
```

Use unique, correct addresses and deploy the same managed file to all relevant nodes. Hand-editing one current coordinator is fragile because the next task may run elsewhere.

For a durable production fix, prefer one of:

- Publish the broker names in DNS visible from the StarRocks network.
- Correct Kafka `advertised.listeners` to addresses clients can resolve and route to.
- Provide separate Kafka listeners for internal and external client networks.
- Fix container or Kubernetes DNS so advertised service names are valid from StarRocks.

Do not replace advertised names with arbitrary IP addresses if TLS certificates identify DNS names. The network fix must preserve certificate hostname verification and match the intended listener.

For TLS listeners, inspect the certificate presented from a BE:

```bash
openssl s_client \
  -connect kafka-0.internal.example:9093 \
  -servername kafka-0.internal.example \
  -CAfile /etc/kafka/ca.pem \
  </dev/null
```

For SASL, also verify mechanism, username, ACLs, and whether the topic can be described. A DNS fix can reveal the next authentication error, which is progress but not completion.

## Resume and Verify Consumption

After fixing resolution and reachability:

```sql
RESUME ROUTINE LOAD FOR ingestion.kafka_orders;
```

The job should move through `NEED_SCHEDULE` to `RUNNING`. Confirm:

```sql
SHOW ROUTINE LOAD FOR ingestion.kafka_orders\G
SHOW ROUTINE LOAD TASK WHERE JobName = 'kafka_orders';
```

Check that every configured partition advances. A job can appear healthy while one advertised broker remains inaccessible and its partitions lag.

## Only Then Inspect the Payload Format

If connectivity is healthy but the job now reports rejected rows, diagnose the format as a separate problem.

For JSON:

- Confirm `"format" = "json"`.
- Compare `jsonpaths`, `json_root`, and `strip_outer_array` with the exact Kafka message bytes.
- Keep each JSON object for a row within one Kafka message.
- For Avro, confirm the Schema Registry URL, credentials, and compatible schema.

For CSV:

- Confirm `COLUMNS TERMINATED BY` and enclosure/escape settings.
- Remember that `\N` represents null; an empty field is an empty string.
- Verify source and destination column order or use an explicit `COLUMNS` mapping.

Capture a message at the reported partition and offset using an approved Kafka consumer. Do not infer its shape from producer source code, because serializers, converters, and schema evolution may have changed the bytes on the topic.

## Prevent the Error from Returning

Add a deployment check that runs from the StarRocks data-plane network:

1. Fetch Kafka metadata using the production security settings.
2. Extract every advertised broker address.
3. Resolve each hostname.
4. Open its TCP port.
5. Validate TLS identity when applicable.
6. Alert when a new broker advertises an unreachable name.

The central lesson is that `Bad message format` in this Routine Load context can describe Kafka communication, not malformed business data. Prove the complete metadata path before modifying a parser or accepting bad rows.

## Official Documentation

- [StarRocks Routine Load FAQ](https://docs.starrocks.io/docs/faq/loading/Routine_load_faq/)
- [Load data using Routine Load](https://docs.starrocks.io/docs/loading/RoutineLoad/)
- [CREATE ROUTINE LOAD](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/CREATE_ROUTINE_LOAD/)
- [SHOW ROUTINE LOAD](https://docs.starrocks.io/docs/sql-reference/sql-statements/loading_unloading/routine_load/SHOW_ROUTINE_LOAD/)
- [Apache Kafka broker configuration](https://kafka.apache.org/43/configuration/broker-configs/)
