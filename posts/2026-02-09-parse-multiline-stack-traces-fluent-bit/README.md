# How to Parse Multi-Line Stack Traces in Kubernetes Logs with Fluent Bit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Logging, Fluent Bit

Description: Learn how to configure Fluent Bit multiline parsers to correctly capture and parse multi-line stack traces from application logs in Kubernetes environments.

---

Stack traces are critical for debugging application errors, but they present a unique challenge in log collection. Unlike single-line log entries, stack traces span multiple lines, and traditional line-based log collectors treat each line as a separate log entry. This fragmentation makes stack traces difficult to search, analyze, and correlate with other events.

Fluent Bit provides robust multiline parsing capabilities that can reassemble stack traces into single log records. This guide shows you how to configure Fluent Bit to handle multi-line stack traces from various programming languages in Kubernetes.

## Understanding the Multiline Problem

When an application writes a stack trace, it typically looks like this:

```
2026-02-09 10:15:32 ERROR Exception in thread "main"
java.lang.NullPointerException: Cannot invoke method on null object
    at com.example.MyService.processRequest(MyService.java:45)
    at com.example.Controller.handleRequest(Controller.java:89)
    at com.example.Main.main(Main.java:23)
```

Without multiline parsing, Fluent Bit treats each line as a separate log entry, breaking the context and making the stack trace unusable. The multiline parser consolidates these lines into a single structured log entry.

## Configuring Fluent Bit Multiline Parsers

Fluent Bit uses regular expressions to detect the start of a new log entry and continuation lines. You define these patterns in the parsers configuration.

Create a ConfigMap for multiline parsers:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-parsers
  namespace: logging
data:
  parsers.conf: |
    [PARSER]
        Name        java_multiline
        Format      regex
        Regex       /^(?<time>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(?<level>\w+)\s+(?<message>.*)/
        Time_Key    time
        Time_Format %Y-%m-%d %H:%M:%S

    [PARSER]
        Name        python_multiline
        Format      regex
        Regex       /^(?<time>\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2},\d{3})\s+-\s+(?<logger>\S+)\s+-\s+(?<level>\w+)\s+-\s+(?<message>.*)/
        Time_Key    time
        Time_Format %Y-%m-%d %H:%M:%S,%L

    [PARSER]
        Name        go_multiline
        Format      regex
        Regex       /^(?<time>\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})\s+(?<message>.*)/
        Time_Key    time
        Time_Format %Y/%m/%d %H:%M:%S
```

## Configuring Multiline Input in Fluent Bit

The Fluent Bit input configuration specifies how to detect multiline patterns. Update your Fluent Bit ConfigMap:

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
        Path                /var/log/containers/*.log
        Parser              docker
        Tag                 kube.*
        Refresh_Interval    5
        Mem_Buf_Limit       5MB
        Skip_Long_Lines     Off

        # Multiline configuration for Java stack traces
        Multiline           On
        Multiline_Flush     5
        Parser_Firstline    java_multiline
        Parser_1            java_continuation

    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
        Kube_Tag_Prefix     kube.var.log.containers.
        Merge_Log           On
        Keep_Log            Off
        K8S-Logging.Parser  On
        K8S-Logging.Exclude On

    [OUTPUT]
        Name                stdout
        Match               *
        Format              json_lines
```

## Defining Continuation Line Parsers

Continuation lines (indented stack trace lines) need their own parser. Add this to your parsers ConfigMap:

```yaml
[PARSER]
    Name        java_continuation
    Format      regex
    Regex       /^\s+at\s+(?<stacktrace>.*)/

[PARSER]
    Name        python_continuation
    Format      regex
    Regex       /^\s+(?<stacktrace>(File|.*Error).*)/

[PARSER]
    Name        generic_continuation
    Format      regex
    Regex       /^\s+(?<stacktrace>.*)/
```

## Language-Specific Multiline Configurations

### Java Stack Traces

Java exceptions typically start with a timestamp and exception type:

```yaml
[INPUT]
    Name                tail
    Path                /var/log/containers/*java*.log
    Parser              docker
    Tag                 java.*
    Multiline           On
    Multiline_Flush     2
    Parser_Firstline    java_multiline
    Parser_1            java_continuation
```

### Python Stack Traces

Python tracebacks have a distinct format with "Traceback" as the start marker:

```yaml
[PARSER]
    Name        python_traceback_start
    Format      regex
    Regex       /^Traceback\s+\(most\s+recent\s+call\s+last\):/

[INPUT]
    Name                tail
    Path                /var/log/containers/*python*.log
    Parser              docker
    Tag                 python.*
    Multiline           On
    Multiline_Flush     3
    Parser_Firstline    python_traceback_start
    Parser_1            python_continuation
```

### Go Panic Stack Traces

Go panics start with "panic:" and include goroutine information:

```yaml
[PARSER]
    Name        go_panic_start
    Format      regex
    Regex       /^panic:\s+(?<message>.*)/

[INPUT]
    Name                tail
    Path                /var/log/containers/*go*.log
    Parser              docker
    Tag                 go.*
    Multiline           On
    Multiline_Flush     2
    Parser_Firstline    go_panic_start
    Parser_1            generic_continuation
```

## Deploying Fluent Bit with Multiline Support

Create a DaemonSet that mounts both ConfigMaps:

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
        - name: fluent-bit-parsers
          mountPath: /fluent-bit/etc/parsers.conf
          subPath: parsers.conf
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
      - name: fluent-bit-parsers
        configMap:
          name: fluent-bit-parsers
```

## Testing Multiline Parsing

Deploy a test application that generates stack traces:

```python
# test-app.py
import logging
import time

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def cause_error():
    raise ValueError("This is a test exception")

def main():
    while True:
        try:
            logger.info("Application running normally")
            time.sleep(30)
            cause_error()
        except Exception as e:
            logger.exception("An error occurred")
            time.sleep(30)

if __name__ == "__main__":
    main()
```

Deploy this application to Kubernetes and verify that Fluent Bit captures the complete stack trace as a single log entry.

## Tuning Multiline Performance

The `Multiline_Flush` setting controls how long Fluent Bit waits before flushing a multiline buffer. Set this based on your application's behavior:

- Short flush times (1-2 seconds) work for fast-paced applications
- Longer flush times (5-10 seconds) suit batch processing applications
- Balance between log freshness and parsing accuracy

Monitor memory usage when handling large stack traces. Increase `Mem_Buf_Limit` if you see buffer overflow warnings.

## Common Pitfalls and Solutions

**Problem**: Stack traces are still fragmented despite multiline configuration.

**Solution**: Ensure your `Parser_Firstline` regex accurately matches the beginning of new log entries. Test your regex against actual log samples.

**Problem**: High memory consumption in Fluent Bit pods.

**Solution**: Reduce `Multiline_Flush` timeout and increase `Mem_Buf_Limit` incrementally. Consider filtering out verbose debug logs.

**Problem**: Logs from different containers mixing together.

**Solution**: Use more specific path patterns in the INPUT configuration to separate different application types.

## Conclusion

Properly configured multiline parsing in Fluent Bit transforms fragmented stack traces into coherent, searchable log entries. This configuration is essential for effective debugging in Kubernetes environments. Test your parser configurations thoroughly with representative log samples from your applications, and adjust the multiline flush settings based on your specific requirements. With proper multiline handling, your logging pipeline becomes a powerful tool for troubleshooting production issues.
