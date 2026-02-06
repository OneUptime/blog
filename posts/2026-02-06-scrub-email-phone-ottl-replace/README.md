# How to Scrub Email Addresses and Phone Numbers from Log Bodies Using OTTL replace_pattern Function

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Data Scrubbing, PII, Logs

Description: Use the OTTL replace_pattern function in the OpenTelemetry Collector to scrub email addresses and phone numbers from log bodies.

Log messages often contain personally identifiable information (PII) that should not end up in your observability platform. Email addresses and phone numbers are two of the most common offenders. An error log like "Failed to send notification to john.doe@example.com at +1-555-123-4567" is useful for debugging but a compliance headache if it reaches your log storage.

The OTTL `replace_pattern` function in the OpenTelemetry Collector's transform processor lets you clean these up in-flight.

## Understanding OTTL replace_pattern

The `replace_pattern` function works like a regex find-and-replace on telemetry fields. It takes a target field, a regex pattern, and a replacement string. Unlike the redaction processor which works at the attribute level, OTTL can operate on the log body itself.

## Basic Configuration

Here is how to scrub emails and phone numbers from log bodies:

```yaml
processors:
  transform/scrub-pii:
    log_statements:
      - context: log
        statements:
          # Replace email addresses with [EMAIL_REDACTED]
          - replace_pattern(body, "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b", "[EMAIL_REDACTED]")
          # Replace US phone numbers in various formats
          # Matches: +1-555-123-4567, (555) 123-4567, 555-123-4567, 5551234567
          - replace_pattern(body, "\\+?1?[\\s.-]?\\(?[0-9]{3}\\)?[\\s.-]?[0-9]{3}[\\s.-]?[0-9]{4}\\b", "[PHONE_REDACTED]")
```

## Complete Collector Configuration

```yaml
receivers:
  filelog:
    include:
      - /var/log/app/*.log
    start_at: beginning

processors:
  transform/scrub-pii:
    log_statements:
      - context: log
        statements:
          # Scrub email addresses from the log body
          - replace_pattern(body, "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b", "[EMAIL_REDACTED]")
          # Scrub US/international phone numbers
          - replace_pattern(body, "\\+?[0-9]{1,3}[\\s.-]?\\(?[0-9]{3}\\)?[\\s.-]?[0-9]{3}[\\s.-]?[0-9]{4}", "[PHONE_REDACTED]")
          # Also scrub from log attributes if they exist
          - replace_pattern(attributes["user.email"], ".*", "[EMAIL_REDACTED]") where attributes["user.email"] != nil
          - replace_pattern(attributes["user.phone"], ".*", "[PHONE_REDACTED]") where attributes["user.phone"] != nil

  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    logs:
      receivers: [filelog]
      processors: [transform/scrub-pii, batch]
      exporters: [otlp]
```

## Handling Different Phone Number Formats

Phone numbers come in many shapes. Here are patterns for different regional formats:

```yaml
processors:
  transform/scrub-phones:
    log_statements:
      - context: log
        statements:
          # US/Canada: +1 (555) 123-4567 or variants
          - replace_pattern(body, "\\+?1?[\\s.-]?\\(?[0-9]{3}\\)?[\\s.-]?[0-9]{3}[\\s.-]?[0-9]{4}", "[PHONE_US]")
          # UK: +44 7911 123456
          - replace_pattern(body, "\\+44[\\s]?[0-9]{4}[\\s]?[0-9]{6}", "[PHONE_UK]")
          # Generic international: +XX XXXXXXXXXX (10-14 digits)
          - replace_pattern(body, "\\+[0-9]{1,3}[\\s.-]?[0-9]{6,14}", "[PHONE_INTL]")
```

## Scrubbing Structured Log Fields

If your logs are JSON-structured and parsed into attributes, you need to scrub those fields too:

```yaml
processors:
  transform/scrub-structured:
    log_statements:
      - context: log
        statements:
          # Scrub email from body (for unstructured logs)
          - replace_pattern(body, "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b", "[EMAIL_REDACTED]")

          # Scrub specific structured fields
          - replace_pattern(attributes["customer_email"], ".*", "[REDACTED]") where attributes["customer_email"] != nil
          - replace_pattern(attributes["contact_phone"], ".*", "[REDACTED]") where attributes["contact_phone"] != nil
          - replace_pattern(attributes["notification_recipient"], "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b", "[EMAIL_REDACTED]") where attributes["notification_recipient"] != nil
```

## Testing the Scrubbing Pipeline

Use the debug exporter to verify your patterns work correctly:

```yaml
exporters:
  debug:
    verbosity: detailed

service:
  pipelines:
    logs/test:
      receivers: [filelog]
      processors: [transform/scrub-pii]
      exporters: [debug]
```

Create a test log file with known PII:

```bash
# Write test log entries
echo '2024-01-15 ERROR Failed to send email to jane.doe@company.com' >> /var/log/app/test.log
echo '2024-01-15 WARN User +1-555-987-6543 exceeded rate limit' >> /var/log/app/test.log
echo '2024-01-15 INFO Contact support@example.com or call (800) 555-0199' >> /var/log/app/test.log
```

Check the debug output to confirm the scrubbed results look like:

```
2024-01-15 ERROR Failed to send email to [EMAIL_REDACTED]
2024-01-15 WARN User [PHONE_REDACTED] exceeded rate limit
2024-01-15 INFO Contact [EMAIL_REDACTED] or call [PHONE_REDACTED]
```

## Performance Tips

Each `replace_pattern` call evaluates a regex against the field value. For high-volume log pipelines, keep these tips in mind:

1. Order your statements from most common to least common patterns
2. Use the `where` clause to skip processing when the field does not exist
3. Place the transform processor after any filtering that drops unwanted logs
4. Consider batching your regex patterns if you have many similar patterns

```yaml
# Efficient: only process logs from specific sources
- replace_pattern(body, "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b", "[EMAIL_REDACTED]") where resource.attributes["service.name"] == "user-service"
```

## Edge Cases to Watch For

Some edge cases to be aware of: email-like strings in URLs (user@host in JDBC connection strings), phone-like strings in order IDs or reference numbers, and email addresses with unusual TLDs. Test thoroughly with real production log samples before deploying. You do not want to accidentally redact something important that is not actually PII.

The OTTL approach gives you fine-grained control over what gets scrubbed and where. Combined with the redaction processor for span attributes, you can build a comprehensive PII scrubbing pipeline that covers all three signal types.
