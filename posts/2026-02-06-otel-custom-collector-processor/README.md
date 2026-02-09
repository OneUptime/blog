# How to Build a Custom Collector Processor That Transforms Telemetry with Your Domain Logic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Custom Processor, Go, Domain Logic, Collector

Description: Build a custom OpenTelemetry Collector processor in Go that applies your domain-specific transformation logic to traces, metrics, and logs.

The built-in processors cover common transformations like batching, filtering, and attribute manipulation. But when you need domain-specific logic, such as PII redaction based on your data classification rules, cost estimation, or custom aggregation, you need a custom processor. This post walks through building one in Go.

## What a Processor Does

A processor sits between receivers and exporters. It receives telemetry data, transforms it, and passes it to the next component. Processors can add, modify, or remove attributes; drop telemetry; split or merge data; or do any transformation you need.

## Project Structure

```
piiprocessor/
    factory.go      # Creates processor instances
    config.go       # Configuration struct
    processor.go    # Transformation logic
    go.mod
```

## Step 1: Configuration

```go
// config.go
package piiprocessor

import (
    "fmt"
)

type Config struct {
    // Attribute keys that contain PII and should be redacted
    PIIAttributes []string `mapstructure:"pii_attributes"`

    // Regex patterns for PII detection in log bodies
    PIIPatterns []string `mapstructure:"pii_patterns"`

    // What to replace PII with
    RedactionText string `mapstructure:"redaction_text"`

    // Whether to hash PII instead of replacing
    // Hashing preserves cardinality for analytics
    HashInsteadOfRedact bool `mapstructure:"hash_instead_of_redact"`
}

func (c *Config) Validate() error {
    if len(c.PIIAttributes) == 0 && len(c.PIIPatterns) == 0 {
        return fmt.Errorf("at least one of pii_attributes or pii_patterns must be set")
    }
    return nil
}
```

## Step 2: Factory

```go
// factory.go
package piiprocessor

import (
    "context"

    "go.opentelemetry.io/collector/component"
    "go.opentelemetry.io/collector/consumer"
    "go.opentelemetry.io/collector/processor"
)

const (
    typeStr   = "pii_redactor"
    stability = component.StabilityLevelBeta
)

func NewFactory() processor.Factory {
    return processor.NewFactory(
        component.MustNewType(typeStr),
        createDefaultConfig,
        processor.WithTraces(createTracesProcessor, stability),
        processor.WithLogs(createLogsProcessor, stability),
    )
}

func createDefaultConfig() component.Config {
    return &Config{
        PIIAttributes: []string{
            "user.email",
            "user.phone",
            "user.ssn",
            "user.credit_card",
        },
        PIIPatterns: []string{
            `\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b`,  // Email
            `\b\d{3}-\d{2}-\d{4}\b`,                                    // SSN
            `\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b`,            // Credit card
        },
        RedactionText:       "[REDACTED]",
        HashInsteadOfRedact: false,
    }
}

func createTracesProcessor(
    ctx context.Context,
    settings processor.Settings,
    cfg component.Config,
    next consumer.Traces,
) (processor.Traces, error) {
    pCfg := cfg.(*Config)
    return newPIIProcessor(settings, pCfg, next, nil)
}

func createLogsProcessor(
    ctx context.Context,
    settings processor.Settings,
    cfg component.Config,
    next consumer.Logs,
) (processor.Logs, error) {
    pCfg := cfg.(*Config)
    return newPIIProcessor(settings, pCfg, nil, next)
}
```

## Step 3: Processor Implementation

```go
// processor.go
package piiprocessor

import (
    "context"
    "crypto/sha256"
    "encoding/hex"
    "regexp"

    "go.opentelemetry.io/collector/component"
    "go.opentelemetry.io/collector/consumer"
    "go.opentelemetry.io/collector/pdata/pcommon"
    "go.opentelemetry.io/collector/pdata/plog"
    "go.opentelemetry.io/collector/pdata/ptrace"
    "go.opentelemetry.io/collector/processor"
    "go.uber.org/zap"
)

type piiProcessor struct {
    config        *Config
    logger        *zap.Logger
    traceConsumer consumer.Traces
    logConsumer   consumer.Logs
    patterns      []*regexp.Regexp
    piiKeySet     map[string]bool
}

func newPIIProcessor(
    settings processor.Settings,
    cfg *Config,
    traceConsumer consumer.Traces,
    logConsumer consumer.Logs,
) (*piiProcessor, error) {
    // Pre-compile regex patterns for performance
    patterns := make([]*regexp.Regexp, 0, len(cfg.PIIPatterns))
    for _, p := range cfg.PIIPatterns {
        compiled, err := regexp.Compile(p)
        if err != nil {
            return nil, fmt.Errorf("invalid PII pattern %q: %w", p, err)
        }
        patterns = append(patterns, compiled)
    }

    // Build a set for quick attribute key lookups
    keySet := make(map[string]bool, len(cfg.PIIAttributes))
    for _, key := range cfg.PIIAttributes {
        keySet[key] = true
    }

    return &piiProcessor{
        config:        cfg,
        logger:        settings.Logger,
        traceConsumer: traceConsumer,
        logConsumer:   logConsumer,
        patterns:      patterns,
        piiKeySet:     keySet,
    }, nil
}

func (p *piiProcessor) Start(ctx context.Context, host component.Host) error {
    p.logger.Info("PII redactor processor started",
        zap.Int("pii_attributes", len(p.config.PIIAttributes)),
        zap.Int("pii_patterns", len(p.config.PIIPatterns)),
    )
    return nil
}

func (p *piiProcessor) Shutdown(ctx context.Context) error {
    return nil
}

// Capabilities tells the collector we mutate data
func (p *piiProcessor) Capabilities() consumer.Capabilities {
    return consumer.Capabilities{MutatesData: true}
}

// ConsumeTraces processes trace data
func (p *piiProcessor) ConsumeTraces(ctx context.Context, td ptrace.Traces) error {
    // Iterate through all spans and redact PII
    rss := td.ResourceSpans()
    for i := 0; i < rss.Len(); i++ {
        rs := rss.At(i)
        p.redactAttributes(rs.Resource().Attributes())

        ilss := rs.ScopeSpans()
        for j := 0; j < ilss.Len(); j++ {
            spans := ilss.At(j).Spans()
            for k := 0; k < spans.Len(); k++ {
                span := spans.At(k)
                p.redactAttributes(span.Attributes())

                // Also redact event attributes
                events := span.Events()
                for e := 0; e < events.Len(); e++ {
                    p.redactAttributes(events.At(e).Attributes())
                }
            }
        }
    }

    return p.traceConsumer.ConsumeTraces(ctx, td)
}

// ConsumeLogs processes log data
func (p *piiProcessor) ConsumeLogs(ctx context.Context, ld plog.Logs) error {
    rls := ld.ResourceLogs()
    for i := 0; i < rls.Len(); i++ {
        rl := rls.At(i)
        p.redactAttributes(rl.Resource().Attributes())

        slls := rl.ScopeLogs()
        for j := 0; j < slls.Len(); j++ {
            logs := slls.At(j).LogRecords()
            for k := 0; k < logs.Len(); k++ {
                log := logs.At(k)
                p.redactAttributes(log.Attributes())
                // Redact PII patterns in log body
                p.redactLogBody(log)
            }
        }
    }

    return p.logConsumer.ConsumeLogs(ctx, ld)
}

func (p *piiProcessor) redactAttributes(attrs pcommon.Map) {
    attrs.Range(func(key string, value pcommon.Value) bool {
        if p.piiKeySet[key] {
            if p.config.HashInsteadOfRedact {
                hash := sha256.Sum256([]byte(value.AsString()))
                attrs.PutStr(key, hex.EncodeToString(hash[:]))
            } else {
                attrs.PutStr(key, p.config.RedactionText)
            }
        }
        return true
    })
}

func (p *piiProcessor) redactLogBody(log plog.LogRecord) {
    body := log.Body().AsString()
    for _, pattern := range p.patterns {
        body = pattern.ReplaceAllString(body, p.config.RedactionText)
    }
    log.Body().SetStr(body)
}
```

## Using the Processor

```yaml
# otel-collector-config.yaml
processors:
  pii_redactor:
    pii_attributes:
      - user.email
      - user.phone
      - http.request.header.authorization
      - db.statement
    pii_patterns:
      - '\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
      - '\b\d{3}-\d{2}-\d{4}\b'
    redaction_text: "[PII_REDACTED]"
    hash_instead_of_redact: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [pii_redactor, batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [pii_redactor, batch]
      exporters: [otlp]
```

## Testing

```go
func TestRedactsPIIAttributes(t *testing.T) {
    proc, _ := newPIIProcessor(processortest.NewNopSettings(), &Config{
        PIIAttributes: []string{"user.email"},
        RedactionText: "[REDACTED]",
    }, consumertest.NewNop(), nil)

    traces := ptrace.NewTraces()
    span := traces.ResourceSpans().AppendEmpty().
        ScopeSpans().AppendEmpty().Spans().AppendEmpty()
    span.Attributes().PutStr("user.email", "alice@example.com")
    span.Attributes().PutStr("http.method", "GET")

    err := proc.ConsumeTraces(context.Background(), traces)
    require.NoError(t, err)

    email, _ := span.Attributes().Get("user.email")
    assert.Equal(t, "[REDACTED]", email.AsString())

    method, _ := span.Attributes().Get("http.method")
    assert.Equal(t, "GET", method.AsString())
}
```

## Wrapping Up

Custom processors let you apply any transformation logic the built-in processors cannot handle. The pattern is always the same: define config, build a factory, implement the consumer interface, and transform the pdata structures. PII redaction is one of the most common use cases, but the same approach works for cost tagging, data classification, custom aggregation, or any domain-specific transformation.
