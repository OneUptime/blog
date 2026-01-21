# How to Mask Sensitive Data in Loki

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Promtail, PII Masking, Data Privacy, GDPR, Compliance, Security

Description: A comprehensive guide to masking sensitive data in Grafana Loki logs, covering PII redaction, credit card masking, email anonymization, and compliance-ready data protection strategies.

---

Logs often contain sensitive information like personal identifiable information (PII), credit card numbers, passwords, and API keys. Properly masking this data before it reaches Loki is essential for security and compliance. This guide covers techniques for redacting sensitive data in your logging pipeline.

## Prerequisites

Before starting, ensure you have:

- Promtail configured for log collection
- Understanding of data privacy requirements
- Knowledge of sensitive data patterns in your logs
- Access to modify Promtail configuration

## Why Mask Sensitive Data

### Compliance Requirements

- **GDPR**: Right to data protection and privacy
- **PCI DSS**: Credit card data must be protected
- **HIPAA**: Healthcare data must be secured
- **SOC 2**: Security controls for customer data

### Security Best Practices

- Reduce data breach impact
- Limit exposure of credentials
- Prevent unauthorized data access
- Minimize attack surface

## Replace Stage for Masking

### Basic Replace

```yaml
pipeline_stages:
  - replace:
      expression: 'password=\S+'
      replace: 'password=REDACTED'
```

### Multiple Replacements

```yaml
pipeline_stages:
  - replace:
      expression: 'password=\S+'
      replace: 'password=[REDACTED]'

  - replace:
      expression: 'api_key=\S+'
      replace: 'api_key=[REDACTED]'

  - replace:
      expression: 'secret=\S+'
      replace: 'secret=[REDACTED]'
```

## Common Masking Patterns

### Email Addresses

```yaml
pipeline_stages:
  # Full email masking
  - replace:
      expression: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
      replace: '[EMAIL_REDACTED]'

  # Partial masking (keep domain)
  - replace:
      expression: '([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})'
      replace: '***@$2'
```

### Credit Card Numbers

```yaml
pipeline_stages:
  # Mask credit card numbers (keep last 4)
  - replace:
      expression: '\b(\d{4})[- ]?(\d{4})[- ]?(\d{4})[- ]?(\d{4})\b'
      replace: '****-****-****-$4'

  # Full redaction
  - replace:
      expression: '\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b'
      replace: '[CARD_REDACTED]'
```

### Social Security Numbers

```yaml
pipeline_stages:
  # US SSN format
  - replace:
      expression: '\b\d{3}-\d{2}-\d{4}\b'
      replace: '***-**-****'

  # Full redaction
  - replace:
      expression: '\b\d{3}[- ]?\d{2}[- ]?\d{4}\b'
      replace: '[SSN_REDACTED]'
```

### Phone Numbers

```yaml
pipeline_stages:
  # US phone numbers
  - replace:
      expression: '\b(\+?1?[- ]?)?\(?(\d{3})\)?[- ]?(\d{3})[- ]?(\d{4})\b'
      replace: '[PHONE_REDACTED]'

  # International format
  - replace:
      expression: '\+\d{1,3}[- ]?\d{3,14}'
      replace: '[PHONE_REDACTED]'
```

### IP Addresses

```yaml
pipeline_stages:
  # Full IP masking
  - replace:
      expression: '\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b'
      replace: '[IP_REDACTED]'

  # Partial masking (keep first octet)
  - replace:
      expression: '\b(\d{1,3})\.\d{1,3}\.\d{1,3}\.\d{1,3}\b'
      replace: '$1.xxx.xxx.xxx'
```

### API Keys and Tokens

```yaml
pipeline_stages:
  # Bearer tokens
  - replace:
      expression: 'Bearer\s+[A-Za-z0-9\-_=]+'
      replace: 'Bearer [TOKEN_REDACTED]'

  # API keys (common formats)
  - replace:
      expression: '(api[_-]?key|apikey|api_secret)[\s:=]+["\']?[A-Za-z0-9\-_]{20,}["\']?'
      replace: '$1=[KEY_REDACTED]'

  # AWS access keys
  - replace:
      expression: 'AKIA[0-9A-Z]{16}'
      replace: '[AWS_KEY_REDACTED]'

  # AWS secret keys
  - replace:
      expression: '(?i)(aws[_-]?secret[_-]?access[_-]?key|secret[_-]?key)[\s:=]+["\']?[A-Za-z0-9/+=]{40}["\']?'
      replace: '$1=[AWS_SECRET_REDACTED]'
```

### Passwords

```yaml
pipeline_stages:
  # Password in URL
  - replace:
      expression: '(://[^:]+:)[^@]+(@)'
      replace: '$1[PASSWORD]$2'

  # Password parameter
  - replace:
      expression: '(password|passwd|pwd)[\s:=]+["\']?[^\s"'']+["\']?'
      replace: '$1=[REDACTED]'

  # JSON password field
  - replace:
      expression: '"(password|passwd|pwd)":\s*"[^"]+"'
      replace: '"$1":"[REDACTED]"'
```

### Names (PII)

```yaml
pipeline_stages:
  # Common name patterns in JSON
  - replace:
      expression: '"(first_?name|last_?name|full_?name|name)":\s*"[^"]+"'
      replace: '"$1":"[NAME_REDACTED]"'

  # User fields
  - replace:
      expression: '"(user_?name|username)":\s*"[^"]+"'
      replace: '"$1":"[USERNAME_REDACTED]"'
```

### Addresses

```yaml
pipeline_stages:
  # Street address
  - replace:
      expression: '"(address|street|street_?address)":\s*"[^"]+"'
      replace: '"$1":"[ADDRESS_REDACTED]"'

  # Zip/Postal codes
  - replace:
      expression: '"(zip|zip_?code|postal_?code)":\s*"[0-9A-Z\s-]+"'
      replace: '"$1":"[REDACTED]"'
```

## JSON Field Masking

### Specific Field Masking

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level
        message: message
        user_email: user.email
        user_ssn: user.ssn

  # Mask specific fields
  - replace:
      source: user_email
      expression: '.*'
      replace: '[EMAIL_REDACTED]'

  - replace:
      source: user_ssn
      expression: '.*'
      replace: '[SSN_REDACTED]'
```

### Template-Based Masking

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level
        message: message
        email: email
        card_number: payment.card

  - template:
      source: masked_output
      template: |
        level={{ .level }} message={{ .message }} email=[REDACTED] card=[REDACTED]

  - output:
      source: masked_output
```

## Comprehensive Masking Configuration

```yaml
scrape_configs:
  - job_name: application
    static_configs:
      - targets: [localhost]
        labels:
          job: app
          __path__: /var/log/app/*.log
    pipeline_stages:
      # Credentials and secrets
      - replace:
          expression: '(password|passwd|pwd|secret|api[_-]?key|apikey|token|auth)[\s:=]+["\']?[\w\-/+=]{8,}["\']?'
          replace: '$1=[REDACTED]'

      # Bearer tokens
      - replace:
          expression: 'Bearer\s+[A-Za-z0-9\-_.~+/]+=*'
          replace: 'Bearer [TOKEN_REDACTED]'

      # Basic auth in URLs
      - replace:
          expression: '(https?://[^:]+:)[^@]+(@)'
          replace: '$1[PASSWORD]$2'

      # Email addresses
      - replace:
          expression: '\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b'
          replace: '[EMAIL_REDACTED]'

      # Credit card numbers
      - replace:
          expression: '\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b'
          replace: '[CARD_REDACTED]'

      # SSN
      - replace:
          expression: '\b\d{3}[- ]?\d{2}[- ]?\d{4}\b'
          replace: '[SSN_REDACTED]'

      # Phone numbers
      - replace:
          expression: '\b(\+?1?[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b'
          replace: '[PHONE_REDACTED]'

      # IP addresses (optional - may want to keep for debugging)
      # - replace:
      #     expression: '\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b'
      #     replace: '[IP_REDACTED]'

      # AWS credentials
      - replace:
          expression: 'AKIA[0-9A-Z]{16}'
          replace: '[AWS_ACCESS_KEY_REDACTED]'

      - replace:
          expression: '(?i)aws[_-]?secret[_-]?access[_-]?key[\s:=]+["\']?[A-Za-z0-9/+=]{40}["\']?'
          replace: 'aws_secret_access_key=[AWS_SECRET_REDACTED]'

      # JSON string fields containing PII
      - replace:
          expression: '"(ssn|social_security|tax_id)":\s*"[^"]+"'
          replace: '"$1":"[REDACTED]"'

      # Parse and add labels
      - json:
          expressions:
            level: level
            message: message
      - labels:
          level:
```

## Conditional Masking

### Mask Only in Production

```yaml
pipeline_stages:
  - match:
      selector: '{env="production"}'
      stages:
        - replace:
            expression: 'email=\S+'
            replace: 'email=[REDACTED]'
```

### Mask Based on Log Level

```yaml
pipeline_stages:
  - json:
      expressions:
        level: level

  - labels:
      level:

  # More aggressive masking for debug logs
  - match:
      selector: '{level="debug"}'
      stages:
        - replace:
            expression: '(user_id|session_id)=\S+'
            replace: '$1=[REDACTED]'
```

## Testing Masking Rules

### Validation Script

```bash
#!/bin/bash
# test-masking.sh

# Test patterns
test_patterns=(
  "user email: john@example.com should be masked"
  "credit card: 4111-1111-1111-1111 needs masking"
  "password=secretpassword123 must be redacted"
  "api_key=sk-1234567890abcdef should be hidden"
  "phone: (555) 123-4567 is PII"
  "SSN: 123-45-6789 is sensitive"
)

# Run through Promtail dry-run
for pattern in "${test_patterns[@]}"; do
  echo "$pattern" | promtail -config.file=/etc/promtail/config.yaml -stdin -dry-run
done
```

### LogQL Verification

```logql
# Check for potential unmasked emails
{job="app"} |~ "@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"

# Check for potential credit card numbers
{job="app"} |~ "\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}"

# Check for potential SSNs
{job="app"} |~ "\\d{3}-\\d{2}-\\d{4}"
```

## Monitoring Masking Effectiveness

### Alerting on Unmasked Data

```yaml
groups:
  - name: pii-alerts
    rules:
      - alert: PotentialUnmaskedEmail
        expr: |
          count_over_time(
            {job="app"} |~ "@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"
            | __error__=""
            [5m]
          ) > 0
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Potential unmasked email detected"

      - alert: PotentialCreditCard
        expr: |
          count_over_time(
            {job="app"} |~ "\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}"
            | __error__=""
            [5m]
          ) > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Potential credit card number detected"
```

## Best Practices

### Defense in Depth

1. **Application Level**: Sanitize before logging
2. **Promtail Level**: Mask in pipeline
3. **Access Control**: Restrict Loki access
4. **Retention**: Limit how long logs are kept

### Pattern Maintenance

```yaml
# Document your patterns
# patterns.yaml - reference file
email_pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
credit_card_pattern: '\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}'
ssn_pattern: '\d{3}[- ]?\d{2}[- ]?\d{4}'
phone_pattern: '(\+?1?[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}'
```

### Regular Audits

1. Review masked data regularly
2. Test patterns against new log formats
3. Update patterns for new PII types
4. Monitor for masking failures

### Avoid Over-Masking

```yaml
# Bad - masks too much
- replace:
    expression: '\d+'
    replace: '[NUMBER]'

# Good - specific patterns
- replace:
    expression: '\b\d{3}-\d{2}-\d{4}\b'  # SSN format only
    replace: '[SSN_REDACTED]'
```

## Conclusion

Masking sensitive data in logs is essential for security and compliance. Key takeaways:

- Use replace stage for pattern-based masking
- Cover all PII types: emails, cards, SSNs, phones
- Mask credentials and API keys
- Test masking rules thoroughly
- Monitor for masking failures
- Implement defense in depth

With proper data masking, your Loki deployment can meet compliance requirements while maintaining log utility for debugging and analysis.
