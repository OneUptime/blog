# How to Configure Fluent Bit Multiline Parsers for Java and Python Exception Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fluent Bit, Kubernetes, Logging

Description: Set up Fluent Bit multiline parsers to correctly capture Java and Python exceptions and stack traces in Kubernetes container logs for effective debugging.

---

Exception handling in log aggregation is challenging because exceptions span multiple lines with indentation, making them difficult to parse and correlate. Java and Python applications generate particularly complex stack traces that need careful parsing to maintain their structure and context. When these logs are fragmented across multiple log entries, debugging becomes nearly impossible.

This guide provides production-ready Fluent Bit configurations for parsing Java and Python exceptions in Kubernetes environments.

## Understanding Multiline Log Patterns

Java and Python exceptions follow distinct patterns:

**Java Exception**:
```text
2026-02-09 10:15:32 ERROR com.example.Service - Database connection failed
java.sql.SQLException: Connection refused
    at com.mysql.jdbc.SQLError.createSQLException(SQLError.java:1084)
    at com.mysql.jdbc.MysqlIO.checkErrorPacket(MysqlIO.java:4237)
    at com.example.Service.connect(Service.java:145)
Caused by: java.net.ConnectException: Connection refused
    at java.net.PlainSocketImpl.socketConnect(Native Method)
    at com.mysql.jdbc.StandardSocketFactory.connect(StandardSocketFactory.java:211)
```

**Python Exception**:
```text
2026-02-09 10:15:32 ERROR root - Request processing failed
Traceback (most recent call last):
  File "/app/service.py", line 45, in process_request
    result = database.query(sql)
  File "/app/database.py", line 89, in query
    cursor.execute(query)
ValueError: Invalid query parameter
```

The challenge is detecting where one exception ends and the next log entry begins.

## Configuring Java Multiline Parsers

Create a comprehensive parser configuration for Java applications:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-java-parsers
  namespace: logging
data:
  parsers_multiline.conf: |
    [MULTILINE_PARSER]
        Name          multiline_java_exception
        Type          regex
        Flush_Timeout 4000
        Rule          "start_state" "/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:[.,]\d{3})?\s+(?:ERROR|WARN|WARNING|SEVERE)\b.*/" "cont"
        Rule          "cont"        "/^(?:[\w.$]+(?:Exception|Error|Throwable):.*|\s+at\s+.*|Caused by:.*|\s+Suppressed:.*|\s+\.\.\.\s+\d+\s+more).*/" "cont"
```

## Configuring Fluent Bit Input for Java Logs

Set up the Fluent Bit input configuration with multiline support:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush           5
        Daemon          off
        Log_Level       info
        Parsers_File    /fluent-bit/etc/parsers_multiline.conf

    [INPUT]
        Name                tail
        Path                /var/log/containers/*java*.log
        Tag                 java.*
        Refresh_Interval    5
        Mem_Buf_Limit       10MB
        Skip_Long_Lines     Off
        DB                  /var/log/flb-java.db

        # Reassemble container-runtime log fragments first.
        Multiline.Parser    docker, cri

    [FILTER]
        Name                  multiline
        Match                 java.*
        multiline.key_content log
        multiline.parser      multiline_java_exception

    [FILTER]
        Name                kubernetes
        Match               java.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
        Merge_Log           On
        Keep_Log            Off
        K8S-Logging.Parser  On
        K8S-Logging.Exclude On

    [OUTPUT]
        Name                loki
        Match               java.*
        Host                loki.logging.svc.cluster.local
        Port                3100
        Labels              job=java-apps, language=java
```

## Configuring Python Multiline Parsers

Create parsers for Python exception formats:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-python-parsers
  namespace: logging
data:
  parsers_multiline.conf: |
    [MULTILINE_PARSER]
        Name          multiline_python_exception
        Type          regex
        Flush_Timeout 3000
        Rule          "start_state" "/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:,\d{3})?\s+-\s+\S+\s+-\s+(?:ERROR|WARNING|CRITICAL)\s+-\s+.*/" "cont"
        Rule          "cont"        "/^(?:Traceback \(most recent call last\):|\s+File\s+\"[^\"]+\",\s+line\s+\d+,\s+in\s+.*|\s+.*|[\w.]+(?:Error|Exception):.*).*/" "cont"
```

## Configuring Fluent Bit Input for Python Logs

Set up Python-specific multiline handling:

```yaml
[INPUT]
    Name                tail
    Path                /var/log/containers/*python*.log
    Tag                 python.*
    Refresh_Interval    5
    Mem_Buf_Limit       10MB
    Skip_Long_Lines     Off
    DB                  /var/log/flb-python.db

    # Reassemble container-runtime log fragments first.
    Multiline.Parser    docker, cri

[FILTER]
    Name                  multiline
    Match                 python.*
    multiline.key_content log
    multiline.parser      multiline_python_exception

[FILTER]
    Name                kubernetes
    Match               python.*
    Kube_URL            https://kubernetes.default.svc:443
    Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
    Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
    Merge_Log           On
    Keep_Log            Off

[OUTPUT]
    Name                loki
    Match               python.*
    Host                loki.logging.svc.cluster.local
    Port                3100
    Labels              job=python-apps, language=python
```

## Handling Multiple Log Formats from the Same Application

Some applications produce logs in different formats. Tag the detected format for downstream routing:

```yaml
[FILTER]
    Name    lua
    Match   java.*
    script  /fluent-bit/scripts/multi-format.lua
    call    detect_and_parse

[FILTER]
    Name    modify
    Match   java.*
    Add     inspected_by_lua true
```

Create the Lua script:

```lua
-- multi-format.lua
function detect_and_parse(tag, timestamp, record)
    local log = record["log"] or ""

    -- Detect log4j format
    if string.match(log, "^%d%d%d%d%-%d%d%-%d%d %d%d:%d%d:%d%d") then
        record["log_format"] = "log4j"

    -- Detect logback format
    elseif string.match(log, "^%[.*%]") then
        record["log_format"] = "logback"

    -- Detect SLF4J simple format
    elseif string.match(log, "^%d+ %[.*%]") then
        record["log_format"] = "slf4j-simple"

    -- Detect exception start
    elseif string.match(log, "^%w+Exception:") or string.match(log, "^%w+Error:") then
        record["is_exception"] = true

    -- Detect stack trace continuation
    elseif string.match(log, "^%s+at ") then
        record["is_stacktrace"] = true

    -- Detect caused by
    elseif string.match(log, "^Caused by:") then
        record["is_caused_by"] = true
    end

    return 2, timestamp, record
end
```

## Deploying Fluent Bit with Both Parsers

Create a unified DaemonSet that handles both Java and Python logs:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: logging
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      serviceAccountName: fluent-bit
      containers:
      - name: fluent-bit
        image: fluent/fluent-bit:5.0
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
        - name: fluent-bit-config
          mountPath: /fluent-bit/etc/
        - name: parsers
          mountPath: /fluent-bit/etc/parsers_multiline.conf
          subPath: parsers_multiline.conf
        - name: lua-scripts
          mountPath: /fluent-bit/scripts/
        resources:
          limits:
            memory: 300Mi
          requests:
            cpu: 100m
            memory: 150Mi
      volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
      - name: fluent-bit-config
        configMap:
          name: fluent-bit-config
      - name: parsers
        configMap:
          name: fluent-bit-parsers
      - name: lua-scripts
        configMap:
          name: fluent-bit-lua-scripts
```

## Testing Multiline Parsing

Deploy test applications that generate exceptions:

**Java Test Application**:
```java
// ExceptionGenerator.java
import java.io.*;
import java.util.logging.*;

public class ExceptionGenerator {
    private static final Logger logger = Logger.getLogger(ExceptionGenerator.class.getName());

    public static void main(String[] args) throws InterruptedException {
        logger.setUseParentHandlers(false);
        ConsoleHandler handler = new ConsoleHandler();
        handler.setFormatter(new Formatter() {
            @Override
            public String format(LogRecord record) {
                return String.format("%1$tF %1$tT %2$s %3$s - %4$s%n%5$s",
                    new java.util.Date(record.getMillis()),
                    record.getLevel().getName(),
                    record.getLoggerName(),
                    record.getMessage(),
                    formatThrowable(record.getThrown()));
            }

            private String formatThrowable(Throwable throwable) {
                if (throwable == null) {
                    return "";
                }
                StringWriter writer = new StringWriter();
                throwable.printStackTrace(new PrintWriter(writer));
                return writer.toString();
            }
        });
        logger.addHandler(handler);

        while (true) {
            try {
                logger.info("Processing request");
                Thread.sleep(30000);
                simulateException();
            } catch (Exception e) {
                logger.log(Level.SEVERE, "Failed to process request", e);
            }
        }
    }

    private static void simulateException() throws Exception {
        throw new RuntimeException("Simulated exception for testing",
            new IllegalStateException("Invalid application state"));
    }
}
```

**Python Test Application**:
```python
# exception_generator.py

import logging
import time
import traceback

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def cause_exception():
    raise ValueError("Simulated exception for testing")

def main():
    while True:
        try:
            logger.info("Processing request")
            time.sleep(30)
            cause_exception()
        except Exception as e:
            logger.exception("Failed to process request")

if __name__ == "__main__":
    main()
```

## Verifying Multiline Parsing

Query Loki to verify complete exception capture:

```logql
# View Java exceptions
{job="java-apps"} |= "SEVERE"

# View Python exceptions
{job="python-apps"} |= "Traceback (most recent call last):"

# Check for fragmented stack traces (should be empty)
{job=~"java-apps|python-apps"} |~ "^\\s+(at\\s+|File\\s+)"
```

## Tuning Multiline Performance

Adjust timeouts based on application behavior:

```yaml
# For applications with long stack traces
Flush_Timeout 10000

# For fast-paced applications
Flush_Timeout 2000

# Increase memory for large exceptions
multiline_buffer_limit 20MB
```

## Handling Edge Cases

Address common edge cases in multiline parsing:

```yaml
# Handle truncated stack traces
Rule "cont" "/^\s+\.\.\.\s+\d+\s+more/" "cont"

# Handle nested exceptions
Rule "cont" "/^\s+Suppressed:\s+.*/" "cont"

# Handle async stack traces (Java)
Rule "cont" "/^\s+at\s+java\.base\/java\.util\.concurrent.*/" "cont"
```

## Common Issues and Solutions

**Issue**: Stack traces still appearing as separate log entries.

**Solution**: Verify the `start_state` rule matches your log format exactly. Test with actual log samples.

**Issue**: High memory consumption in Fluent Bit.

**Solution**: Reduce `Flush_Timeout` and set `multiline_buffer_limit` to a size that fits your workload. Consider filtering debug logs.

**Issue**: Missing parts of very long stack traces.

**Solution**: Increase `Flush_Timeout` and `multiline_buffer_limit` for the multiline parser.

## Conclusion

Properly configured multiline parsing in Fluent Bit is essential for capturing complete exception information from Java and Python applications in Kubernetes. Test your parser configurations with real exceptions from your applications, and monitor Fluent Bit resource usage to ensure it can handle your log volume. With correctly parsed exceptions, debugging production issues becomes significantly faster and more effective.
