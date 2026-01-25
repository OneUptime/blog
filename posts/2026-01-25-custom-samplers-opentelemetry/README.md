# How to Implement Custom Samplers in OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Sampling, Custom Sampler, Tracing, Performance, Cost Optimization, Observability

Description: Learn how to implement custom samplers in OpenTelemetry for fine-grained control over which traces to keep, including priority-based, rule-based, and adaptive sampling strategies.

---

Built-in samplers handle common scenarios: sample a percentage of traces, always sample, or never sample. But production systems often need more sophisticated logic: sample based on user tier, operation type, error presence, or current system load. Custom samplers give you complete control over sampling decisions.

## Understanding the Sampler Interface

A sampler receives information about a span at creation time and returns a sampling decision. The decision affects whether the span is recorded and whether child spans should be sampled.

The sampler receives:
- Parent context (including parent sampling decision)
- Trace ID
- Span name
- Span kind
- Initial attributes
- Links

The sampler returns:
- Decision: `DROP`, `RECORD_ONLY`, or `RECORD_AND_SAMPLE`
- Attributes to add to sampled spans
- Trace state modifications

## Implementing Custom Samplers

### Node.js Custom Sampler

```javascript
const { SamplingDecision, SpanKind } = require('@opentelemetry/api');
const { Sampler } = require('@opentelemetry/sdk-trace-base');

// Priority-based sampler that always samples high-priority operations
class PriorityBasedSampler {
  constructor(options = {}) {
    this.baseSamplingRate = options.baseSamplingRate || 0.1;
    this.highPriorityOperations = new Set(options.highPriorityOperations || [
      'checkout',
      'payment',
      'login',
      'registration',
    ]);
    this.highPriorityUserTiers = new Set(options.highPriorityUserTiers || [
      'enterprise',
      'premium',
    ]);
  }

  shouldSample(context, traceId, spanName, spanKind, attributes, links) {
    // Always sample errors (if we can detect them from attributes)
    if (attributes?.['error'] === true || attributes?.['http.status_code'] >= 500) {
      return {
        decision: SamplingDecision.RECORD_AND_SAMPLE,
        attributes: { 'sampling.reason': 'error' },
      };
    }

    // Always sample high-priority operations
    const operationName = this._extractOperationName(spanName);
    if (this.highPriorityOperations.has(operationName)) {
      return {
        decision: SamplingDecision.RECORD_AND_SAMPLE,
        attributes: { 'sampling.reason': 'high_priority_operation' },
      };
    }

    // Always sample high-priority user tiers
    const userTier = attributes?.['user.tier'];
    if (userTier && this.highPriorityUserTiers.has(userTier)) {
      return {
        decision: SamplingDecision.RECORD_AND_SAMPLE,
        attributes: { 'sampling.reason': 'high_priority_user' },
      };
    }

    // Probabilistic sampling for everything else
    if (this._shouldSampleProbabilistically(traceId)) {
      return {
        decision: SamplingDecision.RECORD_AND_SAMPLE,
        attributes: { 'sampling.reason': 'probabilistic' },
      };
    }

    return { decision: SamplingDecision.NOT_RECORD };
  }

  _extractOperationName(spanName) {
    // Extract operation from span name like "POST /api/checkout"
    const parts = spanName.split(' ');
    if (parts.length > 1) {
      const path = parts[1];
      const segments = path.split('/').filter(Boolean);
      return segments[segments.length - 1];
    }
    return spanName.toLowerCase();
  }

  _shouldSampleProbabilistically(traceId) {
    // Use trace ID for consistent sampling decisions
    const hash = parseInt(traceId.slice(-8), 16);
    const threshold = this.baseSamplingRate * 0xffffffff;
    return hash < threshold;
  }

  toString() {
    return `PriorityBasedSampler{rate=${this.baseSamplingRate}}`;
  }
}

// Usage
const { NodeSDK } = require('@opentelemetry/sdk-node');

const sdk = new NodeSDK({
  sampler: new PriorityBasedSampler({
    baseSamplingRate: 0.05,
    highPriorityOperations: ['checkout', 'payment', 'refund'],
    highPriorityUserTiers: ['enterprise', 'premium'],
  }),
});

sdk.start();
```

### Python Custom Sampler

```python
from opentelemetry.sdk.trace.sampling import Sampler, SamplingResult, Decision
from opentelemetry.trace import SpanKind, Link
from opentelemetry.context import Context
from opentelemetry.util.types import Attributes
from typing import Optional, Sequence

class PriorityBasedSampler(Sampler):
    def __init__(
        self,
        base_sampling_rate: float = 0.1,
        high_priority_operations: Optional[set] = None,
        high_priority_user_tiers: Optional[set] = None,
    ):
        self.base_sampling_rate = base_sampling_rate
        self.high_priority_operations = high_priority_operations or {
            'checkout', 'payment', 'login', 'registration'
        }
        self.high_priority_user_tiers = high_priority_user_tiers or {
            'enterprise', 'premium'
        }

    def should_sample(
        self,
        parent_context: Optional[Context],
        trace_id: int,
        name: str,
        kind: SpanKind = None,
        attributes: Attributes = None,
        links: Sequence[Link] = None,
        trace_state: "TraceState" = None,
    ) -> SamplingResult:
        attributes = attributes or {}

        # Always sample errors
        if attributes.get('error') or attributes.get('http.status_code', 0) >= 500:
            return SamplingResult(
                Decision.RECORD_AND_SAMPLE,
                {'sampling.reason': 'error'},
            )

        # Always sample high-priority operations
        operation_name = self._extract_operation_name(name)
        if operation_name in self.high_priority_operations:
            return SamplingResult(
                Decision.RECORD_AND_SAMPLE,
                {'sampling.reason': 'high_priority_operation'},
            )

        # Always sample high-priority user tiers
        user_tier = attributes.get('user.tier')
        if user_tier in self.high_priority_user_tiers:
            return SamplingResult(
                Decision.RECORD_AND_SAMPLE,
                {'sampling.reason': 'high_priority_user'},
            )

        # Probabilistic sampling
        if self._should_sample_probabilistically(trace_id):
            return SamplingResult(
                Decision.RECORD_AND_SAMPLE,
                {'sampling.reason': 'probabilistic'},
            )

        return SamplingResult(Decision.DROP)

    def _extract_operation_name(self, span_name: str) -> str:
        parts = span_name.split(' ')
        if len(parts) > 1:
            path = parts[1]
            segments = [s for s in path.split('/') if s]
            if segments:
                return segments[-1]
        return span_name.lower()

    def _should_sample_probabilistically(self, trace_id: int) -> bool:
        # Use lower bits of trace ID for consistent sampling
        threshold = int(self.base_sampling_rate * (2**64 - 1))
        return (trace_id & 0xFFFFFFFFFFFFFFFF) < threshold

    def get_description(self) -> str:
        return f"PriorityBasedSampler{{rate={self.base_sampling_rate}}}"


# Usage
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider

provider = TracerProvider(
    sampler=PriorityBasedSampler(
        base_sampling_rate=0.05,
        high_priority_operations={'checkout', 'payment', 'refund'},
        high_priority_user_tiers={'enterprise', 'premium'},
    )
)
trace.set_tracer_provider(provider)
```

### Go Custom Sampler

```go
package sampler

import (
    "strings"

    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/sdk/trace"
    oteltrace "go.opentelemetry.io/otel/trace"
)

type PriorityBasedSampler struct {
    baseSamplingRate       float64
    highPriorityOperations map[string]bool
    highPriorityUserTiers  map[string]bool
}

func NewPriorityBasedSampler(
    baseSamplingRate float64,
    highPriorityOperations []string,
    highPriorityUserTiers []string,
) *PriorityBasedSampler {
    ops := make(map[string]bool)
    for _, op := range highPriorityOperations {
        ops[op] = true
    }

    tiers := make(map[string]bool)
    for _, tier := range highPriorityUserTiers {
        tiers[tier] = true
    }

    return &PriorityBasedSampler{
        baseSamplingRate:       baseSamplingRate,
        highPriorityOperations: ops,
        highPriorityUserTiers:  tiers,
    }
}

func (s *PriorityBasedSampler) ShouldSample(p trace.SamplingParameters) trace.SamplingResult {
    // Check for errors in attributes
    for _, attr := range p.Attributes {
        if attr.Key == "error" && attr.Value.AsBool() {
            return trace.SamplingResult{
                Decision:   trace.RecordAndSample,
                Attributes: []attribute.KeyValue{attribute.String("sampling.reason", "error")},
            }
        }
        if attr.Key == "http.status_code" && attr.Value.AsInt64() >= 500 {
            return trace.SamplingResult{
                Decision:   trace.RecordAndSample,
                Attributes: []attribute.KeyValue{attribute.String("sampling.reason", "error")},
            }
        }
    }

    // Check for high-priority operations
    operationName := s.extractOperationName(p.Name)
    if s.highPriorityOperations[operationName] {
        return trace.SamplingResult{
            Decision:   trace.RecordAndSample,
            Attributes: []attribute.KeyValue{attribute.String("sampling.reason", "high_priority_operation")},
        }
    }

    // Check for high-priority user tiers
    for _, attr := range p.Attributes {
        if attr.Key == "user.tier" && s.highPriorityUserTiers[attr.Value.AsString()] {
            return trace.SamplingResult{
                Decision:   trace.RecordAndSample,
                Attributes: []attribute.KeyValue{attribute.String("sampling.reason", "high_priority_user")},
            }
        }
    }

    // Probabilistic sampling
    if s.shouldSampleProbabilistically(p.TraceID) {
        return trace.SamplingResult{
            Decision:   trace.RecordAndSample,
            Attributes: []attribute.KeyValue{attribute.String("sampling.reason", "probabilistic")},
        }
    }

    return trace.SamplingResult{Decision: trace.Drop}
}

func (s *PriorityBasedSampler) extractOperationName(spanName string) string {
    parts := strings.Split(spanName, " ")
    if len(parts) > 1 {
        path := parts[1]
        segments := strings.Split(strings.Trim(path, "/"), "/")
        if len(segments) > 0 {
            return segments[len(segments)-1]
        }
    }
    return strings.ToLower(spanName)
}

func (s *PriorityBasedSampler) shouldSampleProbabilistically(traceID oteltrace.TraceID) bool {
    // Use last 8 bytes of trace ID
    x := uint64(traceID[8])<<56 | uint64(traceID[9])<<48 |
        uint64(traceID[10])<<40 | uint64(traceID[11])<<32 |
        uint64(traceID[12])<<24 | uint64(traceID[13])<<16 |
        uint64(traceID[14])<<8 | uint64(traceID[15])

    threshold := uint64(s.baseSamplingRate * float64(^uint64(0)))
    return x < threshold
}

func (s *PriorityBasedSampler) Description() string {
    return "PriorityBasedSampler"
}
```

## Advanced Sampling Strategies

### Adaptive Rate Sampler

Adjust sampling rate based on traffic volume:

```javascript
class AdaptiveRateSampler {
  constructor(options = {}) {
    this.targetSpansPerSecond = options.targetSpansPerSecond || 100;
    this.windowSize = options.windowSize || 60000; // 1 minute
    this.minRate = options.minRate || 0.001;
    this.maxRate = options.maxRate || 1.0;

    this.spanCounts = [];
    this.currentRate = 0.1;

    // Recalculate rate periodically
    setInterval(() => this._adjustRate(), 10000);
  }

  shouldSample(context, traceId, spanName, spanKind, attributes, links) {
    // Record this sample attempt
    this.spanCounts.push({ timestamp: Date.now(), sampled: true });

    if (this._shouldSampleProbabilistically(traceId, this.currentRate)) {
      return {
        decision: SamplingDecision.RECORD_AND_SAMPLE,
        attributes: {
          'sampling.reason': 'adaptive',
          'sampling.rate': this.currentRate,
        },
      };
    }

    return { decision: SamplingDecision.NOT_RECORD };
  }

  _adjustRate() {
    const now = Date.now();
    // Remove old entries
    this.spanCounts = this.spanCounts.filter(
      s => now - s.timestamp < this.windowSize
    );

    if (this.spanCounts.length === 0) return;

    // Calculate actual spans per second
    const windowSeconds = this.windowSize / 1000;
    const spansPerSecond = this.spanCounts.length / windowSeconds;

    // Adjust rate to hit target
    if (spansPerSecond > 0) {
      this.currentRate = Math.min(
        this.maxRate,
        Math.max(
          this.minRate,
          (this.targetSpansPerSecond / spansPerSecond) * this.currentRate
        )
      );
    }

    console.log(`Adaptive sampler: rate=${this.currentRate.toFixed(4)}, spans/s=${spansPerSecond.toFixed(2)}`);
  }

  _shouldSampleProbabilistically(traceId, rate) {
    const hash = parseInt(traceId.slice(-8), 16);
    const threshold = rate * 0xffffffff;
    return hash < threshold;
  }
}
```

### Rule-Based Sampler

Apply different rates to different routes or services:

```javascript
class RuleBasedSampler {
  constructor(rules, defaultRate = 0.1) {
    this.rules = rules;
    this.defaultRate = defaultRate;
  }

  shouldSample(context, traceId, spanName, spanKind, attributes, links) {
    // Find matching rule
    for (const rule of this.rules) {
      if (this._matchesRule(rule, spanName, attributes)) {
        if (this._shouldSampleProbabilistically(traceId, rule.rate)) {
          return {
            decision: SamplingDecision.RECORD_AND_SAMPLE,
            attributes: {
              'sampling.rule': rule.name,
              'sampling.rate': rule.rate,
            },
          };
        }
        return { decision: SamplingDecision.NOT_RECORD };
      }
    }

    // Default sampling
    if (this._shouldSampleProbabilistically(traceId, this.defaultRate)) {
      return {
        decision: SamplingDecision.RECORD_AND_SAMPLE,
        attributes: {
          'sampling.rule': 'default',
          'sampling.rate': this.defaultRate,
        },
      };
    }

    return { decision: SamplingDecision.NOT_RECORD };
  }

  _matchesRule(rule, spanName, attributes) {
    if (rule.spanNamePattern && !spanName.match(rule.spanNamePattern)) {
      return false;
    }
    if (rule.attributes) {
      for (const [key, value] of Object.entries(rule.attributes)) {
        if (attributes?.[key] !== value) {
          return false;
        }
      }
    }
    return true;
  }

  _shouldSampleProbabilistically(traceId, rate) {
    const hash = parseInt(traceId.slice(-8), 16);
    return hash < rate * 0xffffffff;
  }
}

// Usage
const sampler = new RuleBasedSampler([
  {
    name: 'health-checks',
    spanNamePattern: /\/(health|ready|live)/,
    rate: 0.001,  // Sample 0.1% of health checks
  },
  {
    name: 'static-assets',
    spanNamePattern: /\.(css|js|png|jpg|ico)/,
    rate: 0.0,  // Never sample static assets
  },
  {
    name: 'payment-flows',
    spanNamePattern: /\/payment/,
    rate: 1.0,  // Always sample payment flows
  },
  {
    name: 'enterprise-users',
    attributes: { 'user.tier': 'enterprise' },
    rate: 1.0,  // Always sample enterprise users
  },
], 0.05);  // Default: 5% sampling
```

## Parent-Based Sampling

Wrap your sampler with parent-based logic to maintain trace coherence:

```javascript
const { ParentBasedSampler } = require('@opentelemetry/sdk-trace-base');

const customSampler = new PriorityBasedSampler({
  baseSamplingRate: 0.1,
});

// Respect parent sampling decisions, use custom sampler for root spans
const sampler = new ParentBasedSampler({
  root: customSampler,
  // Optionally override for remote parent scenarios
  remoteParentSampled: customSampler,
  remoteParentNotSampled: customSampler,
});
```

## Testing Custom Samplers

Verify your sampler behaves correctly:

```javascript
describe('PriorityBasedSampler', () => {
  const sampler = new PriorityBasedSampler({
    baseSamplingRate: 0.1,
    highPriorityOperations: ['checkout'],
  });

  it('should always sample errors', () => {
    const result = sampler.shouldSample(
      {},
      '0af7651916cd43dd8448eb211c80319c',
      'GET /api/users',
      SpanKind.SERVER,
      { 'http.status_code': 500 },
      []
    );

    expect(result.decision).toBe(SamplingDecision.RECORD_AND_SAMPLE);
    expect(result.attributes['sampling.reason']).toBe('error');
  });

  it('should always sample high-priority operations', () => {
    const result = sampler.shouldSample(
      {},
      '0af7651916cd43dd8448eb211c80319c',
      'POST /api/checkout',
      SpanKind.SERVER,
      {},
      []
    );

    expect(result.decision).toBe(SamplingDecision.RECORD_AND_SAMPLE);
    expect(result.attributes['sampling.reason']).toBe('high_priority_operation');
  });

  it('should probabilistically sample normal operations', () => {
    let sampled = 0;
    const iterations = 10000;

    for (let i = 0; i < iterations; i++) {
      const traceId = generateRandomTraceId();
      const result = sampler.shouldSample(
        {},
        traceId,
        'GET /api/users',
        SpanKind.SERVER,
        {},
        []
      );
      if (result.decision === SamplingDecision.RECORD_AND_SAMPLE) {
        sampled++;
      }
    }

    const actualRate = sampled / iterations;
    expect(actualRate).toBeCloseTo(0.1, 1); // Within 10% of target
  });
});
```

## Conclusion

Custom samplers give you precise control over which traces to capture. Implement priority-based sampling to always capture important operations, adaptive sampling to handle variable traffic, and rule-based sampling for fine-grained control per endpoint or user segment. Always wrap custom samplers with parent-based logic to maintain trace coherence, and thoroughly test your sampling logic to ensure it behaves as expected under various conditions.
