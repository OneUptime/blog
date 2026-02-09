# How to Configure Fluent Bit Multiline Parsers for Java and Python Exception Logs in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fluent Bit, Kubernetes, Logging

Description: Set up Fluent Bit multiline parsers to correctly capture Java and Python exceptions and stack traces in Kubernetes container logs for effective debugging.

---

Exception handling in log aggregation is challenging because exceptions span multiple lines with indentation, making them difficult to parse and correlate. Java and Python applications generate particularly complex stack traces that need careful parsing to maintain their structure and context. When these logs are fragmented across multiple log entries, debugging becomes nearly impossible.

This guide provides production-ready Fluent Bit configurations for parsing Java and Python exceptions in Kubernetes environments.

## Understanding Multiline Log Patterns

Java and Python exceptions follow distinct patterns:

**Java Exception**:
```
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
```
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
  parsers.conf: |
    [PARSER]
        Name        java_log_start
        Format      regex
        Regex       /^(?<time>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}[.,]\d{3})\s+(?<level>\w+)\s+(?<logger>[\w.$]+)\s+-\s+(?<message>.*)/
        Time_Key    time
        Time_Format %Y-%m-%d %H:%M:%S,%L

    [PARSER]
        Name        java_exception
        Format      regex
        Regex       /^(?<exception>[\w.$]+Exception|[\w.$]+Error):\s+(?<exception_message>.*)/

    [PARSER]
        Name        java_stacktrace
        Format      regex
        Regex       /^\s+at\s+(?<class>[\w.$]+)\.(?<method>[\w$]+)\((?<location>.*)\)/

    [PARSER]
        Name        java_caused_by
        Format      regex
        Regex       /^Caused\s+by:\s+(?<caused_by_exception>[\w.$]+):\s+(?<caused_by_message>.*)/

    [PARSER]
        Name        java_suppressed
        Format      regex
        Regex       /^\s+Suppressed:\s+(?<suppressed_exception>[\w.$]+):\s+(?<suppressed_message>.*)/

    [PARSER]
        Name        java_more_frames
        Format      regex
        Regex       /^\s+\.\.\.\s+(?<more_frames>\d+)\s+more/
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
        Parsers_File    /fluent-bit/etc/parsers.conf

    [INPUT]
        Name                tail
        Path                /var/log/containers/*java*.log
        Parser              docker
        Tag                 java.*
        Refresh_Interval    5
        Mem_Buf_Limit       10MB
        Skip_Long_Lines     Off
        DB                  /var/log/flb-java.db

        # Multiline configuration for Java
        Multiline           On
        Multiline_Flush     4
        Parser_Firstline    java_log_start
        Parser_1            java_exception
        Parser_2            java_stacktrace
        Parser_3            java_caused_by
        Parser_4            java_suppressed
        Parser_5            java_more_frames

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
  parsers.conf: |
    [PARSER]
        Name        python_log_start
        Format      regex
        Regex       /^(?<time>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d{3})\s+-\s+(?<logger>\S+)\s+-\s+(?<level>\w+)\s+-\s+(?<message>.*)/
        Time_Key    time
        Time_Format %Y-%m-%d %H:%M:%S,%L

    [PARSER]
        Name        python_traceback_start
        Format      regex
        Regex       /^Traceback\s+\(most\s+recent\s+call\s+last\):/

    [PARSER]
        Name        python_traceback_file
        Format      regex
        Regex       /^\s+File\s+"(?<file>[^"]+)",\s+line\s+(?<line>\d+),\s+in\s+(?<function>\w+)/

    [PARSER]
        Name        python_traceback_code
        Format      regex
        Regex       /^\s+(?<code>.*)/

    [PARSER]
        Name        python_exception
        Format      regex
        Regex       /^(?<exception_type>\w+Error|Exception):\s+(?<exception_message>.*)/

    [PARSER]
        Name        python_django_log
        Format      regex
        Regex       /^\[(?<time>[^\]]+)\]\s+(?<level>\w+)\s+\[(?<logger>[^\]]+)\]\s+(?<message>.*)/
        Time_Key    time
        Time_Format %d/%b/%Y %H:%M:%S

    [PARSER]
        Name        python_flask_log
        Format      regex
        Regex       /^\[(?<time>[^\]]+)\]\s+(?<level>\w+)\s+in\s+(?<module>\w+):\s+(?<message>.*)/
        Time_Key    time
        Time_Format %Y-%m-%d %H:%M:%S,%L
```

## Configuring Fluent Bit Input for Python Logs

Set up Python-specific multiline handling:

```yaml
[INPUT]
    Name                tail
    Path                /var/log/containers/*python*.log
    Parser              docker
    Tag                 python.*
    Refresh_Interval    5
    Mem_Buf_Limit       10MB
    Skip_Long_Lines     Off
    DB                  /var/log/flb-python.db

    # Multiline configuration for Python
    Multiline           On
    Multiline_Flush     3
    Parser_Firstline    python_log_start
    Parser_1            python_traceback_start
    Parser_2            python_traceback_file
    Parser_3            python_traceback_code
    Parser_4            python_exception

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

Some applications produce logs in different formats. Handle this with conditional parsing:

```yaml
[FILTER]
    Name    lua
    Match   java.*
    script  /fluent-bit/scripts/multi-format.lua
    call    detect_and_parse

[FILTER]
    Name    modify
    Match   java.*
    Add     multiline true
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
        record["multiline_start"] = true

    -- Detect stack trace continuation
    elseif string.match(log, "^%s+at ") then
        record["is_stacktrace"] = true
        record["multiline_continuation"] = true

    -- Detect caused by
    elseif string.match(log, "^Caused by:") then
        record["is_caused_by"] = true
        record["multiline_continuation"] = true
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
        image: fluent/fluent-bit:2.2
        volumeMounts:
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
        - name: fluent-bit-config
          mountPath: /fluent-bit/etc/
        - name: parsers
          mountPath: /fluent-bit/etc/parsers.conf
          subPath: parsers.conf
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
import java.util.logging.*;

public class ExceptionGenerator {
    private static final Logger logger = Logger.getLogger(ExceptionGenerator.class.getName());

    public static void main(String[] args) throws InterruptedException {
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
{job="java-apps", level="SEVERE"}

# View Python exceptions
{job="python-apps", level="ERROR"}

# Check for fragmented stack traces (should be empty)
{job=~"java-apps|python-apps"}
  | line_format "{{.log}}"
  |= "at "
  | logfmt
  | level!="ERROR" and level!="SEVERE"
```

## Tuning Multiline Performance

Adjust timeouts based on application behavior:

```yaml
# For applications with long stack traces
Multiline_Flush     10

# For fast-paced applications
Multiline_Flush     2

# Increase memory for large exceptions
Mem_Buf_Limit       20MB
```

## Handling Edge Cases

Address common edge cases in multiline parsing:

```yaml
# Handle truncated stack traces
[PARSER]
    Name        truncation_marker
    Format      regex
    Regex       /^\s+\.\.\.\s+\d+\s+more/

# Handle nested exceptions
[PARSER]
    Name        nested_exception
    Format      regex
    Regex       /^\s+Suppressed:\s+/

# Handle async stack traces (Java)
[PARSER]
    Name        async_stacktrace
    Format      regex
    Regex       /^\s+at\s+java\.base\/java\.util\.concurrent/
```

## Common Issues and Solutions

**Issue**: Stack traces still appearing as separate log entries.

**Solution**: Verify `Parser_Firstline` regex matches your log format exactly. Test with actual log samples.

**Issue**: High memory consumption in Fluent Bit.

**Solution**: Reduce `Multiline_Flush` timeout and increase `Mem_Buf_Limit` gradually. Consider filtering debug logs.

**Issue**: Missing parts of very long stack traces.

**Solution**: Increase `Multiline_Flush` and ensure `Skip_Long_Lines` is Off.

## Conclusion

Properly configured multiline parsing in Fluent Bit is essential for capturing complete exception information from Java and Python applications in Kubernetes. Test your parser configurations with real exceptions from your applications, and monitor Fluent Bit resource usage to ensure it can handle your log volume. With correctly parsed exceptions, debugging production issues becomes significantly faster and more effective.
