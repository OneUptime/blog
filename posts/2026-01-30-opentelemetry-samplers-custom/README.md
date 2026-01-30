# How to Build OpenTelemetry Samplers Custom

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTelemetry, Sampling, Tracing, Performance

Description: Create custom OpenTelemetry samplers for intelligent trace sampling based on attributes, error status, and business rules.

---

Sampling is one of the most critical decisions you will make when implementing distributed tracing. Sample too much and you drown in data costs. Sample too little and you miss the traces that matter. The built-in samplers in OpenTelemetry cover basic use cases, but production systems often need something more sophisticated.

This guide walks through building custom samplers from scratch. You will learn the sampler interface, implement several practical samplers, and combine them into a flexible sampling strategy.

## Understanding the Sampler Interface

Every OpenTelemetry sampler implements a simple interface. The SDK calls your sampler at the start of each span, and you return a decision.

Here is the core interface in TypeScript:

```typescript
// The Sampler interface that all custom samplers must implement
interface Sampler {
  shouldSample(
    context: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes,
    links: Link[]
  ): SamplingResult;

  toString(): string;
}
```

The method receives everything known about the span at creation time. Your job is to return a SamplingResult that tells the SDK what to do.

## The SamplingResult Object

The sampling result contains three pieces of information:

```typescript
// SamplingResult structure returned by every sampler
interface SamplingResult {
  // The sampling decision
  decision: SamplingDecision;

  // Optional attributes to add to the span
  attributes?: Attributes;

  // Optional trace state to propagate
  traceState?: TraceState;
}
```

The decision field uses one of three values:

| Decision | Meaning | Span Recorded | Span Exported |
|----------|---------|---------------|---------------|
| NOT_RECORD | Drop completely | No | No |
| RECORD | Record but do not export | Yes | No |
| RECORD_AND_SAMPLED | Full processing | Yes | Yes |

Here is a comparison of when to use each decision:

| Use Case | Recommended Decision |
|----------|---------------------|
| Health checks, metrics endpoints | NOT_RECORD |
| Debug traces for local analysis | RECORD |
| Production traces for export | RECORD_AND_SAMPLED |
| Error traces you want to keep | RECORD_AND_SAMPLED |

## Building Your First Custom Sampler

Let us start with a simple sampler that makes decisions based on span attributes. This sampler will always sample spans that have a specific attribute value.

```typescript
import {
  Sampler,
  SamplingDecision,
  SamplingResult,
  Context,
  SpanKind,
  Attributes,
  Link,
} from '@opentelemetry/sdk-trace-base';

// AttributeBasedSampler samples spans that match specific attribute values
// Use this when you want to guarantee sampling for certain types of operations
class AttributeBasedSampler implements Sampler {
  private attributeName: string;
  private targetValues: Set<string>;
  private fallbackSampler: Sampler;

  constructor(
    attributeName: string,
    targetValues: string[],
    fallbackSampler: Sampler
  ) {
    this.attributeName = attributeName;
    this.targetValues = new Set(targetValues);
    this.fallbackSampler = fallbackSampler;
  }

  shouldSample(
    context: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes,
    links: Link[]
  ): SamplingResult {
    // Check if the span has our target attribute
    const attributeValue = attributes[this.attributeName];

    if (attributeValue !== undefined) {
      const stringValue = String(attributeValue);

      // If the attribute matches one of our target values, always sample
      if (this.targetValues.has(stringValue)) {
        return {
          decision: SamplingDecision.RECORD_AND_SAMPLED,
          attributes: {
            'sampler.type': 'attribute-based',
            'sampler.matched_attribute': this.attributeName,
          },
        };
      }
    }

    // Otherwise, delegate to the fallback sampler
    return this.fallbackSampler.shouldSample(
      context,
      traceId,
      spanName,
      spanKind,
      attributes,
      links
    );
  }

  toString(): string {
    return `AttributeBasedSampler{attribute=${this.attributeName}, values=${[...this.targetValues].join(',')}}`;
  }
}
```

Usage example:

```typescript
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

// Create a sampler that always samples payment operations
// but uses 10% sampling for everything else
const sampler = new AttributeBasedSampler(
  'operation.type',
  ['payment', 'refund', 'chargeback'],
  new TraceIdRatioBasedSampler(0.1)
);
```

## Error-Based Sampler

One of the most useful custom samplers ensures you capture all traces that contain errors. The challenge is that errors often occur deep in a trace, after the sampling decision was already made at the root span.

This sampler uses a two-phase approach. It initially samples based on a ratio, but marks spans so that downstream processing can upgrade the decision if errors occur.

```typescript
import {
  Sampler,
  SamplingDecision,
  SamplingResult,
  Context,
  SpanKind,
  Attributes,
  Link,
} from '@opentelemetry/sdk-trace-base';

// ErrorAwareSampler always records spans so errors can trigger full sampling
// The span processor handles the actual export decision based on error status
class ErrorAwareSampler implements Sampler {
  private baseRatio: number;

  constructor(baseRatio: number) {
    if (baseRatio < 0 || baseRatio > 1) {
      throw new Error('Sampling ratio must be between 0 and 1');
    }
    this.baseRatio = baseRatio;
  }

  shouldSample(
    context: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes,
    links: Link[]
  ): SamplingResult {
    // Convert trace ID to a deterministic number between 0 and 1
    const hash = this.traceIdToRatio(traceId);

    if (hash < this.baseRatio) {
      // Within our sampling ratio, export as normal
      return {
        decision: SamplingDecision.RECORD_AND_SAMPLED,
        attributes: {
          'sampler.initial_decision': 'sampled',
        },
      };
    }

    // Outside ratio, but still record in case of errors
    // A custom span processor will check for errors and upgrade if needed
    return {
      decision: SamplingDecision.RECORD,
      attributes: {
        'sampler.initial_decision': 'record_only',
        'sampler.error_upgrade_eligible': 'true',
      },
    };
  }

  // Convert trace ID to a consistent ratio value
  private traceIdToRatio(traceId: string): number {
    // Use the last 8 characters of the trace ID for consistency
    const subset = traceId.slice(-8);
    const value = parseInt(subset, 16);
    return value / 0xffffffff;
  }

  toString(): string {
    return `ErrorAwareSampler{ratio=${this.baseRatio}}`;
  }
}
```

You need a companion span processor to upgrade the sampling decision when errors occur:

```typescript
import {
  SpanProcessor,
  ReadableSpan,
  Span,
} from '@opentelemetry/sdk-trace-base';
import { SpanStatusCode } from '@opentelemetry/api';

// ErrorUpgradeProcessor checks completed spans for errors
// and marks them for export if they were initially recorded but not sampled
class ErrorUpgradeProcessor implements SpanProcessor {
  private nextProcessor: SpanProcessor;

  constructor(nextProcessor: SpanProcessor) {
    this.nextProcessor = nextProcessor;
  }

  onStart(span: Span, parentContext: Context): void {
    this.nextProcessor.onStart(span, parentContext);
  }

  onEnd(span: ReadableSpan): void {
    // Check if this span had an error
    const hasError = span.status.code === SpanStatusCode.ERROR;

    // Check if this span is eligible for upgrade
    const isEligible = span.attributes['sampler.error_upgrade_eligible'] === 'true';

    if (hasError && isEligible) {
      // The span was recorded, so we have the data
      // Force export by passing to the next processor
      // Note: This requires the span to have been created with RECORD decision
      console.log(`Upgrading span ${span.name} due to error`);
    }

    this.nextProcessor.onEnd(span);
  }

  async shutdown(): Promise<void> {
    return this.nextProcessor.shutdown();
  }

  async forceFlush(): Promise<void> {
    return this.nextProcessor.forceFlush();
  }
}
```

## Rate Limiting Sampler

Sometimes you need to limit the absolute number of traces per second rather than using a percentage. This is useful when you have unpredictable traffic patterns.

```typescript
import {
  Sampler,
  SamplingDecision,
  SamplingResult,
  Context,
  SpanKind,
  Attributes,
  Link,
} from '@opentelemetry/sdk-trace-base';

// RateLimitingSampler caps the number of sampled traces per second
// Uses a token bucket algorithm for smooth rate limiting
class RateLimitingSampler implements Sampler {
  private maxTracesPerSecond: number;
  private tokens: number;
  private lastRefillTime: number;

  constructor(maxTracesPerSecond: number) {
    this.maxTracesPerSecond = maxTracesPerSecond;
    this.tokens = maxTracesPerSecond;
    this.lastRefillTime = Date.now();
  }

  shouldSample(
    context: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes,
    links: Link[]
  ): SamplingResult {
    // Only apply rate limiting to root spans
    // Child spans should follow their parent's decision
    const parentSpanContext = this.getParentSpanContext(context);

    if (parentSpanContext && parentSpanContext.isRemote === false) {
      // This is a child span, follow parent decision
      if (parentSpanContext.traceFlags & 0x01) {
        return { decision: SamplingDecision.RECORD_AND_SAMPLED };
      }
      return { decision: SamplingDecision.NOT_RECORD };
    }

    // Refill tokens based on elapsed time
    this.refillTokens();

    // Try to consume a token
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return {
        decision: SamplingDecision.RECORD_AND_SAMPLED,
        attributes: {
          'sampler.type': 'rate-limiting',
          'sampler.rate': String(this.maxTracesPerSecond),
        },
      };
    }

    // No tokens available, drop this trace
    return { decision: SamplingDecision.NOT_RECORD };
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTime) / 1000;

    // Add tokens based on elapsed time
    const newTokens = elapsedSeconds * this.maxTracesPerSecond;
    this.tokens = Math.min(this.maxTracesPerSecond, this.tokens + newTokens);
    this.lastRefillTime = now;
  }

  private getParentSpanContext(context: Context): any {
    // Implementation depends on your context propagation setup
    // This is a simplified version
    return context.getValue(Symbol.for('OpenTelemetry Context Key SPAN'));
  }

  toString(): string {
    return `RateLimitingSampler{maxPerSecond=${this.maxTracesPerSecond}}`;
  }
}
```

## Span Name Pattern Sampler

Sometimes you want different sampling rates for different types of operations. This sampler uses regex patterns to match span names and apply appropriate rates.

```typescript
import {
  Sampler,
  SamplingDecision,
  SamplingResult,
  Context,
  SpanKind,
  Attributes,
  Link,
} from '@opentelemetry/sdk-trace-base';

// Rule definition for pattern-based sampling
interface SamplingRule {
  pattern: RegExp;
  rate: number;
  name: string;
}

// PatternSampler applies different rates based on span name patterns
// Rules are evaluated in order, first match wins
class PatternSampler implements Sampler {
  private rules: SamplingRule[];
  private defaultRate: number;

  constructor(rules: SamplingRule[], defaultRate: number = 0.1) {
    this.rules = rules;
    this.defaultRate = defaultRate;
  }

  shouldSample(
    context: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes,
    links: Link[]
  ): SamplingResult {
    // Find the first matching rule
    for (const rule of this.rules) {
      if (rule.pattern.test(spanName)) {
        return this.makeDecision(traceId, rule.rate, rule.name);
      }
    }

    // No rule matched, use default rate
    return this.makeDecision(traceId, this.defaultRate, 'default');
  }

  private makeDecision(
    traceId: string,
    rate: number,
    ruleName: string
  ): SamplingResult {
    // Handle special cases
    if (rate >= 1) {
      return {
        decision: SamplingDecision.RECORD_AND_SAMPLED,
        attributes: { 'sampler.rule': ruleName },
      };
    }

    if (rate <= 0) {
      return { decision: SamplingDecision.NOT_RECORD };
    }

    // Use trace ID for deterministic sampling
    const hash = this.traceIdToRatio(traceId);

    if (hash < rate) {
      return {
        decision: SamplingDecision.RECORD_AND_SAMPLED,
        attributes: { 'sampler.rule': ruleName },
      };
    }

    return { decision: SamplingDecision.NOT_RECORD };
  }

  private traceIdToRatio(traceId: string): number {
    const subset = traceId.slice(-8);
    const value = parseInt(subset, 16);
    return value / 0xffffffff;
  }

  toString(): string {
    const ruleNames = this.rules.map(r => r.name).join(', ');
    return `PatternSampler{rules=[${ruleNames}], default=${this.defaultRate}}`;
  }
}
```

Usage example with common patterns:

```typescript
// Create a pattern sampler with rules for different operation types
const patternSampler = new PatternSampler(
  [
    // Always sample health checks at 0% (drop them)
    { pattern: /^(health|ready|live)/, rate: 0, name: 'health-checks' },

    // Sample authentication at 50%
    { pattern: /^auth\./, rate: 0.5, name: 'authentication' },

    // Always sample payment operations
    { pattern: /^payment\./, rate: 1.0, name: 'payments' },

    // Sample database operations at 20%
    { pattern: /^(SELECT|INSERT|UPDATE|DELETE)/, rate: 0.2, name: 'database' },

    // Sample HTTP endpoints at 10%
    { pattern: /^HTTP (GET|POST|PUT|DELETE)/, rate: 0.1, name: 'http' },
  ],
  0.05 // Default 5% for everything else
);
```

## Composite Sampler

Real-world systems often need multiple sampling strategies combined. This composite sampler lets you chain samplers together with different logic.

```typescript
import {
  Sampler,
  SamplingDecision,
  SamplingResult,
  Context,
  SpanKind,
  Attributes,
  Link,
} from '@opentelemetry/sdk-trace-base';

// Combination mode for multiple samplers
type CombineMode = 'AND' | 'OR' | 'FIRST_MATCH';

// CompositeSampler combines multiple samplers with configurable logic
class CompositeSampler implements Sampler {
  private samplers: Sampler[];
  private mode: CombineMode;

  constructor(samplers: Sampler[], mode: CombineMode = 'OR') {
    if (samplers.length === 0) {
      throw new Error('CompositeSampler requires at least one sampler');
    }
    this.samplers = samplers;
    this.mode = mode;
  }

  shouldSample(
    context: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes,
    links: Link[]
  ): SamplingResult {
    switch (this.mode) {
      case 'AND':
        return this.andLogic(context, traceId, spanName, spanKind, attributes, links);
      case 'OR':
        return this.orLogic(context, traceId, spanName, spanKind, attributes, links);
      case 'FIRST_MATCH':
        return this.firstMatchLogic(context, traceId, spanName, spanKind, attributes, links);
      default:
        throw new Error(`Unknown combine mode: ${this.mode}`);
    }
  }

  // AND logic: all samplers must agree to sample
  private andLogic(
    context: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes,
    links: Link[]
  ): SamplingResult {
    let combinedAttributes: Attributes = {};

    for (const sampler of this.samplers) {
      const result = sampler.shouldSample(
        context, traceId, spanName, spanKind, attributes, links
      );

      // If any sampler says no, return not record
      if (result.decision === SamplingDecision.NOT_RECORD) {
        return { decision: SamplingDecision.NOT_RECORD };
      }

      // Merge attributes
      if (result.attributes) {
        combinedAttributes = { ...combinedAttributes, ...result.attributes };
      }
    }

    return {
      decision: SamplingDecision.RECORD_AND_SAMPLED,
      attributes: combinedAttributes,
    };
  }

  // OR logic: any sampler saying yes is enough
  private orLogic(
    context: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes,
    links: Link[]
  ): SamplingResult {
    let combinedAttributes: Attributes = {};
    let anyRecorded = false;

    for (const sampler of this.samplers) {
      const result = sampler.shouldSample(
        context, traceId, spanName, spanKind, attributes, links
      );

      if (result.decision === SamplingDecision.RECORD_AND_SAMPLED) {
        // Found a sampler that wants to sample, return immediately
        return {
          decision: SamplingDecision.RECORD_AND_SAMPLED,
          attributes: result.attributes,
        };
      }

      if (result.decision === SamplingDecision.RECORD) {
        anyRecorded = true;
        if (result.attributes) {
          combinedAttributes = { ...combinedAttributes, ...result.attributes };
        }
      }
    }

    // No sampler wanted full sampling
    if (anyRecorded) {
      return {
        decision: SamplingDecision.RECORD,
        attributes: combinedAttributes,
      };
    }

    return { decision: SamplingDecision.NOT_RECORD };
  }

  // First match logic: use decision from first sampler that does not drop
  private firstMatchLogic(
    context: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes,
    links: Link[]
  ): SamplingResult {
    for (const sampler of this.samplers) {
      const result = sampler.shouldSample(
        context, traceId, spanName, spanKind, attributes, links
      );

      // Return the first non-drop decision
      if (result.decision !== SamplingDecision.NOT_RECORD) {
        return result;
      }
    }

    // All samplers said drop
    return { decision: SamplingDecision.NOT_RECORD };
  }

  toString(): string {
    const samplerNames = this.samplers.map(s => s.toString()).join(', ');
    return `CompositeSampler{mode=${this.mode}, samplers=[${samplerNames}]}`;
  }
}
```

## Priority-Based Sampler

This sampler assigns priorities to different types of traces and ensures high-priority traces are always sampled while managing the budget for lower priorities.

```typescript
import {
  Sampler,
  SamplingDecision,
  SamplingResult,
  Context,
  SpanKind,
  Attributes,
  Link,
} from '@opentelemetry/sdk-trace-base';

// Priority levels for different trace types
enum TracePriority {
  CRITICAL = 0,  // Always sample
  HIGH = 1,      // Sample at high rate
  MEDIUM = 2,    // Sample at medium rate
  LOW = 3,       // Sample at low rate
  DEBUG = 4,     // Sample only when debugging
}

// Configuration for each priority level
interface PriorityConfig {
  rate: number;
  maxPerSecond?: number;
}

// Function type for determining trace priority
type PriorityResolver = (
  spanName: string,
  spanKind: SpanKind,
  attributes: Attributes
) => TracePriority;

// PrioritySampler applies different sampling rates based on trace priority
class PrioritySampler implements Sampler {
  private priorityConfigs: Map<TracePriority, PriorityConfig>;
  private priorityResolver: PriorityResolver;
  private tokenBuckets: Map<TracePriority, { tokens: number; lastRefill: number }>;

  constructor(
    priorityConfigs: Map<TracePriority, PriorityConfig>,
    priorityResolver: PriorityResolver
  ) {
    this.priorityConfigs = priorityConfigs;
    this.priorityResolver = priorityResolver;
    this.tokenBuckets = new Map();

    // Initialize token buckets for rate-limited priorities
    for (const [priority, config] of priorityConfigs) {
      if (config.maxPerSecond !== undefined) {
        this.tokenBuckets.set(priority, {
          tokens: config.maxPerSecond,
          lastRefill: Date.now(),
        });
      }
    }
  }

  shouldSample(
    context: Context,
    traceId: string,
    spanName: string,
    spanKind: SpanKind,
    attributes: Attributes,
    links: Link[]
  ): SamplingResult {
    // Determine the priority of this trace
    const priority = this.priorityResolver(spanName, spanKind, attributes);
    const config = this.priorityConfigs.get(priority);

    if (!config) {
      // No config for this priority, drop
      return { decision: SamplingDecision.NOT_RECORD };
    }

    // Check rate limit if configured
    if (config.maxPerSecond !== undefined) {
      if (!this.tryConsumeToken(priority, config.maxPerSecond)) {
        return { decision: SamplingDecision.NOT_RECORD };
      }
    }

    // Apply probability-based sampling
    if (config.rate >= 1) {
      return {
        decision: SamplingDecision.RECORD_AND_SAMPLED,
        attributes: {
          'sampler.priority': TracePriority[priority],
        },
      };
    }

    if (config.rate <= 0) {
      return { decision: SamplingDecision.NOT_RECORD };
    }

    const hash = this.traceIdToRatio(traceId);
    if (hash < config.rate) {
      return {
        decision: SamplingDecision.RECORD_AND_SAMPLED,
        attributes: {
          'sampler.priority': TracePriority[priority],
        },
      };
    }

    return { decision: SamplingDecision.NOT_RECORD };
  }

  private tryConsumeToken(priority: TracePriority, maxPerSecond: number): boolean {
    const bucket = this.tokenBuckets.get(priority);
    if (!bucket) return true;

    // Refill tokens
    const now = Date.now();
    const elapsedSeconds = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(maxPerSecond, bucket.tokens + elapsedSeconds * maxPerSecond);
    bucket.lastRefill = now;

    // Try to consume
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }

  private traceIdToRatio(traceId: string): number {
    const subset = traceId.slice(-8);
    const value = parseInt(subset, 16);
    return value / 0xffffffff;
  }

  toString(): string {
    return `PrioritySampler{priorities=${this.priorityConfigs.size}}`;
  }
}
```

Example usage with a priority resolver:

```typescript
// Define sampling configuration for each priority level
const priorityConfigs = new Map<TracePriority, PriorityConfig>([
  [TracePriority.CRITICAL, { rate: 1.0 }],                    // Always sample
  [TracePriority.HIGH, { rate: 0.5, maxPerSecond: 100 }],     // 50%, max 100/s
  [TracePriority.MEDIUM, { rate: 0.1, maxPerSecond: 50 }],    // 10%, max 50/s
  [TracePriority.LOW, { rate: 0.01, maxPerSecond: 10 }],      // 1%, max 10/s
  [TracePriority.DEBUG, { rate: 0 }],                         // Never in production
]);

// Define how to determine priority from span properties
const priorityResolver: PriorityResolver = (spanName, spanKind, attributes) => {
  // Critical: errors and payments
  if (attributes['error'] === true) return TracePriority.CRITICAL;
  if (spanName.startsWith('payment.')) return TracePriority.CRITICAL;

  // High: user-facing operations
  if (spanKind === SpanKind.SERVER) return TracePriority.HIGH;

  // Medium: internal operations
  if (spanKind === SpanKind.INTERNAL) return TracePriority.MEDIUM;

  // Low: background jobs
  if (attributes['job.type'] !== undefined) return TracePriority.LOW;

  // Default to medium
  return TracePriority.MEDIUM;
};

const sampler = new PrioritySampler(priorityConfigs, priorityResolver);
```

## Putting It All Together

Here is a complete example that combines multiple samplers into a production-ready configuration:

```typescript
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import {
  TraceIdRatioBasedSampler,
  ParentBasedSampler,
} from '@opentelemetry/sdk-trace-base';

// Create individual samplers
const rateLimiter = new RateLimitingSampler(1000); // Max 1000 traces/second

const patternSampler = new PatternSampler([
  { pattern: /^health/, rate: 0, name: 'health-checks' },
  { pattern: /^payment\./, rate: 1.0, name: 'payments' },
  { pattern: /^auth\./, rate: 0.5, name: 'auth' },
], 0.1);

const attributeSampler = new AttributeBasedSampler(
  'user.type',
  ['premium', 'enterprise'],
  patternSampler
);

// Combine samplers: rate limit AND (attribute OR pattern matching)
const compositeSampler = new CompositeSampler(
  [rateLimiter, attributeSampler],
  'AND'
);

// Wrap in parent-based sampler to respect parent decisions
const finalSampler = new ParentBasedSampler({
  root: compositeSampler,
});

// Configure the provider
const provider = new NodeTracerProvider({
  sampler: finalSampler,
});

provider.register();

console.log('Tracer configured with custom sampling strategy');
```

## Testing Your Samplers

Always test your samplers before deploying. Here is a simple test harness:

```typescript
import { SpanKind } from '@opentelemetry/api';
import { ROOT_CONTEXT } from '@opentelemetry/api';

// Test harness for sampler validation
function testSampler(sampler: Sampler, testCases: TestCase[]): void {
  console.log(`Testing: ${sampler.toString()}\n`);

  for (const testCase of testCases) {
    const result = sampler.shouldSample(
      ROOT_CONTEXT,
      testCase.traceId,
      testCase.spanName,
      testCase.spanKind,
      testCase.attributes,
      []
    );

    const decisionName = SamplingDecision[result.decision];
    const passed = result.decision === testCase.expectedDecision;
    const status = passed ? 'PASS' : 'FAIL';

    console.log(`[${status}] ${testCase.name}`);
    console.log(`  Span: ${testCase.spanName}`);
    console.log(`  Expected: ${SamplingDecision[testCase.expectedDecision]}`);
    console.log(`  Actual: ${decisionName}`);
    console.log('');
  }
}

interface TestCase {
  name: string;
  traceId: string;
  spanName: string;
  spanKind: SpanKind;
  attributes: Attributes;
  expectedDecision: SamplingDecision;
}

// Example test cases
const testCases: TestCase[] = [
  {
    name: 'Health check should be dropped',
    traceId: '0123456789abcdef0123456789abcdef',
    spanName: 'health.check',
    spanKind: SpanKind.SERVER,
    attributes: {},
    expectedDecision: SamplingDecision.NOT_RECORD,
  },
  {
    name: 'Payment should always be sampled',
    traceId: 'fedcba9876543210fedcba9876543210',
    spanName: 'payment.process',
    spanKind: SpanKind.SERVER,
    attributes: { 'payment.amount': 100 },
    expectedDecision: SamplingDecision.RECORD_AND_SAMPLED,
  },
  {
    name: 'Premium user should be sampled',
    traceId: 'aaaabbbbccccddddeeeeffffaaaabbbb',
    spanName: 'api.request',
    spanKind: SpanKind.SERVER,
    attributes: { 'user.type': 'premium' },
    expectedDecision: SamplingDecision.RECORD_AND_SAMPLED,
  },
];

testSampler(patternSampler, testCases);
```

## Performance Considerations

Custom samplers run on every span creation. Keep these guidelines in mind:

| Guideline | Reason |
|-----------|--------|
| Avoid I/O in shouldSample | Blocks span creation |
| Cache compiled regexes | Regex compilation is expensive |
| Use efficient data structures | Sets for lookups, not arrays |
| Keep attribute checks simple | Complex logic adds latency |
| Profile your sampler | Measure actual overhead |

Here is an example of optimizing regex patterns:

```typescript
// Bad: compiles regex on every call
class SlowSampler implements Sampler {
  shouldSample(/* ... */): SamplingResult {
    if (/^payment\./.test(spanName)) {  // Compiled every time
      return { decision: SamplingDecision.RECORD_AND_SAMPLED };
    }
    return { decision: SamplingDecision.NOT_RECORD };
  }
}

// Good: pre-compiled regex
class FastSampler implements Sampler {
  private paymentPattern = /^payment\./;  // Compiled once

  shouldSample(/* ... */): SamplingResult {
    if (this.paymentPattern.test(spanName)) {
      return { decision: SamplingDecision.RECORD_AND_SAMPLED };
    }
    return { decision: SamplingDecision.NOT_RECORD };
  }
}
```

## Summary

Building custom samplers gives you precise control over which traces you collect. The key concepts covered:

1. **Sampler Interface** - Implement shouldSample to make decisions based on span properties
2. **SamplingResult** - Return decisions with optional attributes and trace state
3. **Attribute-Based Sampling** - Target specific operations by their attributes
4. **Error-Based Sampling** - Capture traces that contain failures
5. **Rate Limiting** - Cap absolute trace volume with token buckets
6. **Pattern Matching** - Apply different rates to different operation types
7. **Composite Samplers** - Combine multiple strategies with AND/OR logic
8. **Priority Sampling** - Allocate sampling budget by trace importance

Start with the simplest sampler that meets your needs and add complexity only when required. Monitor your sampling rates and adjust based on actual traffic patterns and costs.
