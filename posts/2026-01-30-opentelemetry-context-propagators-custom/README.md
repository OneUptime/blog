# How to Create OpenTelemetry Context Propagators Custom

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTelemetry, Tracing, Context, Distributed Systems

Description: Build custom OpenTelemetry context propagators for non-standard header formats and legacy system integration.

---

Context propagation is the backbone of distributed tracing. When a request travels across service boundaries, the trace context must travel with it. OpenTelemetry provides built-in propagators like W3C TraceContext and B3, but real-world systems often require custom solutions. Legacy systems, proprietary protocols, and non-standard header formats all demand custom propagators.

This guide walks through building custom context propagators from scratch. You will learn the propagator interface, implement inject and extract methods, handle custom header formats, create composite propagators, and integrate with legacy trace systems.

## Understanding Context Propagation

Before writing code, let's understand what propagators actually do. A propagator has two jobs:

1. **Inject**: Serialize trace context into a carrier (usually HTTP headers) on outgoing requests
2. **Extract**: Deserialize trace context from a carrier on incoming requests

The carrier is typically a map-like structure that holds headers. The context contains the span context with trace ID, span ID, and trace flags.

Here is a visual representation of the flow:

```
Service A                          Service B
┌─────────────────┐               ┌─────────────────┐
│                 │               │                 │
│  Create Span    │               │  Extract        │
│       │         │    HTTP       │  Context        │
│       ▼         │  ──────────►  │       │         │
│  Inject into    │   Headers     │       ▼         │
│  Headers        │               │  Continue       │
│                 │               │  Trace          │
└─────────────────┘               └─────────────────┘
```

## The TextMapPropagator Interface

OpenTelemetry defines the `TextMapPropagator` interface that all propagators must implement. Here is the interface in TypeScript:

```typescript
// The core interface that every custom propagator must implement
// This defines the contract for context propagation

import {
  Context,
  TextMapGetter,
  TextMapSetter,
  TextMapPropagator,
} from '@opentelemetry/api';

interface TextMapPropagator {
  // Injects context into a carrier for outgoing requests
  inject(
    context: Context,
    carrier: unknown,
    setter: TextMapSetter
  ): void;

  // Extracts context from a carrier for incoming requests
  extract(
    context: Context,
    carrier: unknown,
    getter: TextMapGetter
  ): Context;

  // Returns the header names this propagator uses
  fields(): string[];
}
```

The same interface in Python:

```python
# Python implementation of the TextMapPropagator interface
# All custom propagators inherit from this base class

from abc import ABC, abstractmethod
from typing import Optional, Sequence
from opentelemetry.context import Context
from opentelemetry.propagators import textmap

class TextMapPropagator(ABC):
    @abstractmethod
    def extract(
        self,
        carrier: textmap.CarrierT,
        context: Optional[Context] = None,
        getter: textmap.Getter = textmap.default_getter,
    ) -> Context:
        """Extract context from carrier"""
        pass

    @abstractmethod
    def inject(
        self,
        carrier: textmap.CarrierT,
        context: Optional[Context] = None,
        setter: textmap.Setter = textmap.default_setter,
    ) -> None:
        """Inject context into carrier"""
        pass

    @abstractmethod
    def fields(self) -> Sequence[str]:
        """Return list of header names used by this propagator"""
        pass
```

## Building Your First Custom Propagator

Let's build a custom propagator that uses a proprietary header format. Imagine your company has a legacy tracing system that uses a single header called `X-Custom-Trace` with the format:

```
X-Custom-Trace: {trace_id}:{span_id}:{sampled}
```

Here is the complete TypeScript implementation:

```typescript
// custom-trace-propagator.ts
// A custom propagator for the X-Custom-Trace header format

import {
  Context,
  TextMapGetter,
  TextMapSetter,
  TextMapPropagator,
  SpanContext,
  TraceFlags,
  trace,
  isSpanContextValid,
} from '@opentelemetry/api';

// Header name constant - change this to match your system
const CUSTOM_TRACE_HEADER = 'x-custom-trace';

export class CustomTracePropagator implements TextMapPropagator {

  // Inject the current span context into outgoing request headers
  inject(
    context: Context,
    carrier: unknown,
    setter: TextMapSetter
  ): void {
    // Get the span from the current context
    const span = trace.getSpan(context);
    if (!span) {
      return; // No active span, nothing to inject
    }

    const spanContext = span.spanContext();

    // Validate the span context before injection
    if (!isSpanContextValid(spanContext)) {
      return;
    }

    // Format: {trace_id}:{span_id}:{sampled}
    // sampled is 1 for sampled, 0 for not sampled
    const sampled = (spanContext.traceFlags & TraceFlags.SAMPLED) === TraceFlags.SAMPLED ? '1' : '0';
    const headerValue = `${spanContext.traceId}:${spanContext.spanId}:${sampled}`;

    // Use the setter to write the header
    // This abstraction allows the propagator to work with different carrier types
    setter.set(carrier, CUSTOM_TRACE_HEADER, headerValue);
  }

  // Extract span context from incoming request headers
  extract(
    context: Context,
    carrier: unknown,
    getter: TextMapGetter
  ): Context {
    // Read the header value using the getter abstraction
    const headerValue = getter.get(carrier, CUSTOM_TRACE_HEADER);

    if (!headerValue) {
      return context; // No trace header found, return original context
    }

    // Handle both string and array values
    const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    // Parse the header format: {trace_id}:{span_id}:{sampled}
    const parts = value.split(':');

    if (parts.length !== 3) {
      return context; // Invalid format, return original context
    }

    const [traceId, spanId, sampled] = parts;

    // Validate trace ID (must be 32 hex characters)
    if (!/^[0-9a-f]{32}$/.test(traceId)) {
      return context;
    }

    // Validate span ID (must be 16 hex characters)
    if (!/^[0-9a-f]{16}$/.test(spanId)) {
      return context;
    }

    // Create the span context from extracted values
    const spanContext: SpanContext = {
      traceId,
      spanId,
      traceFlags: sampled === '1' ? TraceFlags.SAMPLED : TraceFlags.NONE,
      isRemote: true, // Mark as remote since it came from another service
    };

    // Validate and return context with the extracted span
    if (!isSpanContextValid(spanContext)) {
      return context;
    }

    // Wrap the span context and set it on the context
    return trace.setSpanContext(context, spanContext);
  }

  // Return the list of headers this propagator uses
  // Used by the SDK for header access control lists
  fields(): string[] {
    return [CUSTOM_TRACE_HEADER];
  }
}
```

## Python Implementation

Here is the same propagator in Python:

```python
# custom_trace_propagator.py
# Python implementation of the custom X-Custom-Trace propagator

import re
from typing import Optional, Sequence, Set
from opentelemetry import trace
from opentelemetry.context import Context
from opentelemetry.propagators import textmap
from opentelemetry.trace import SpanContext, TraceFlags
from opentelemetry.trace.span import NonRecordingSpan

CUSTOM_TRACE_HEADER = "x-custom-trace"

# Regex patterns for validation
TRACE_ID_REGEX = re.compile(r"^[0-9a-f]{32}$")
SPAN_ID_REGEX = re.compile(r"^[0-9a-f]{16}$")


class CustomTracePropagator(textmap.TextMapPropagator):
    """
    Custom propagator for the X-Custom-Trace header format.
    Format: {trace_id}:{span_id}:{sampled}
    """

    def extract(
        self,
        carrier: textmap.CarrierT,
        context: Optional[Context] = None,
        getter: textmap.Getter = textmap.default_getter,
    ) -> Context:
        """
        Extract span context from the carrier.
        Returns a new context with the extracted span, or the original context
        if extraction fails.
        """
        if context is None:
            context = Context()

        # Get the header value
        header_value = getter.get(carrier, CUSTOM_TRACE_HEADER)

        if not header_value:
            return context

        # Handle list values (some frameworks return lists)
        if isinstance(header_value, list):
            header_value = header_value[0]

        # Parse the header: trace_id:span_id:sampled
        parts = header_value.split(":")

        if len(parts) != 3:
            return context

        trace_id, span_id, sampled = parts

        # Validate trace ID format
        if not TRACE_ID_REGEX.match(trace_id):
            return context

        # Validate span ID format
        if not SPAN_ID_REGEX.match(span_id):
            return context

        # Determine trace flags
        trace_flags = TraceFlags.SAMPLED if sampled == "1" else TraceFlags.DEFAULT

        # Create span context
        span_context = SpanContext(
            trace_id=int(trace_id, 16),
            span_id=int(span_id, 16),
            is_remote=True,
            trace_flags=trace_flags,
        )

        # Return context with the extracted span
        return trace.set_span_in_context(
            NonRecordingSpan(span_context), context
        )

    def inject(
        self,
        carrier: textmap.CarrierT,
        context: Optional[Context] = None,
        setter: textmap.Setter = textmap.default_setter,
    ) -> None:
        """
        Inject the current span context into the carrier.
        """
        span = trace.get_current_span(context)
        span_context = span.get_span_context()

        # Skip if span context is invalid
        if not span_context.is_valid:
            return

        # Format the trace ID as 32 hex characters
        trace_id = format(span_context.trace_id, "032x")

        # Format the span ID as 16 hex characters
        span_id = format(span_context.span_id, "016x")

        # Determine sampled flag
        sampled = "1" if span_context.trace_flags & TraceFlags.SAMPLED else "0"

        # Create header value
        header_value = f"{trace_id}:{span_id}:{sampled}"

        # Set the header
        setter.set(carrier, CUSTOM_TRACE_HEADER, header_value)

    @property
    def fields(self) -> Set[str]:
        """Return the set of header fields used by this propagator."""
        return {CUSTOM_TRACE_HEADER}
```

## Handling Complex Header Formats

Many legacy systems use more complex header formats. Let's look at a propagator that handles multiple headers with additional metadata:

```typescript
// multi-header-propagator.ts
// Propagator that handles multiple custom headers with metadata

import {
  Context,
  TextMapGetter,
  TextMapSetter,
  TextMapPropagator,
  SpanContext,
  TraceFlags,
  trace,
  isSpanContextValid,
} from '@opentelemetry/api';

// Header definitions for the legacy system
const HEADERS = {
  TRACE_ID: 'x-legacy-trace-id',
  SPAN_ID: 'x-legacy-span-id',
  PARENT_SPAN_ID: 'x-legacy-parent-span-id',
  SAMPLED: 'x-legacy-sampled',
  TENANT_ID: 'x-legacy-tenant-id',
  REQUEST_SOURCE: 'x-legacy-request-source',
} as const;

// Interface for additional context we want to propagate
interface LegacyTraceContext {
  tenantId?: string;
  requestSource?: string;
}

// Symbol for storing legacy context in the OpenTelemetry context
const LEGACY_CONTEXT_KEY = Symbol('legacy-trace-context');

export class MultiHeaderPropagator implements TextMapPropagator {

  inject(
    context: Context,
    carrier: unknown,
    setter: TextMapSetter
  ): void {
    const span = trace.getSpan(context);
    if (!span) {
      return;
    }

    const spanContext = span.spanContext();

    if (!isSpanContextValid(spanContext)) {
      return;
    }

    // Inject trace ID and span ID as separate headers
    setter.set(carrier, HEADERS.TRACE_ID, spanContext.traceId);
    setter.set(carrier, HEADERS.SPAN_ID, spanContext.spanId);

    // Inject sampled flag as a boolean string
    const sampled = (spanContext.traceFlags & TraceFlags.SAMPLED) === TraceFlags.SAMPLED;
    setter.set(carrier, HEADERS.SAMPLED, sampled ? 'true' : 'false');

    // Inject additional legacy context if present
    const legacyContext = context.getValue(LEGACY_CONTEXT_KEY) as LegacyTraceContext | undefined;

    if (legacyContext?.tenantId) {
      setter.set(carrier, HEADERS.TENANT_ID, legacyContext.tenantId);
    }

    if (legacyContext?.requestSource) {
      setter.set(carrier, HEADERS.REQUEST_SOURCE, legacyContext.requestSource);
    }
  }

  extract(
    context: Context,
    carrier: unknown,
    getter: TextMapGetter
  ): Context {
    // Extract trace ID
    const traceId = this.getHeaderValue(getter, carrier, HEADERS.TRACE_ID);
    if (!traceId || !/^[0-9a-f]{32}$/.test(traceId)) {
      return context;
    }

    // Extract span ID
    const spanId = this.getHeaderValue(getter, carrier, HEADERS.SPAN_ID);
    if (!spanId || !/^[0-9a-f]{16}$/.test(spanId)) {
      return context;
    }

    // Extract sampled flag
    const sampledStr = this.getHeaderValue(getter, carrier, HEADERS.SAMPLED);
    const sampled = sampledStr === 'true' || sampledStr === '1';

    // Create span context
    const spanContext: SpanContext = {
      traceId,
      spanId,
      traceFlags: sampled ? TraceFlags.SAMPLED : TraceFlags.NONE,
      isRemote: true,
    };

    // Start with the span context
    let newContext = trace.setSpanContext(context, spanContext);

    // Extract additional legacy context
    const legacyContext: LegacyTraceContext = {};

    const tenantId = this.getHeaderValue(getter, carrier, HEADERS.TENANT_ID);
    if (tenantId) {
      legacyContext.tenantId = tenantId;
    }

    const requestSource = this.getHeaderValue(getter, carrier, HEADERS.REQUEST_SOURCE);
    if (requestSource) {
      legacyContext.requestSource = requestSource;
    }

    // Store legacy context if any values were found
    if (Object.keys(legacyContext).length > 0) {
      newContext = newContext.setValue(LEGACY_CONTEXT_KEY, legacyContext);
    }

    return newContext;
  }

  // Helper method to handle both string and array header values
  private getHeaderValue(
    getter: TextMapGetter,
    carrier: unknown,
    header: string
  ): string | undefined {
    const value = getter.get(carrier, header);
    if (!value) {
      return undefined;
    }
    return Array.isArray(value) ? value[0] : value;
  }

  fields(): string[] {
    return Object.values(HEADERS);
  }
}
```

## Creating Composite Propagators

Real-world systems often need to support multiple propagation formats simultaneously. A composite propagator combines multiple propagators into one.

Here is a comparison of when to use different approaches:

| Approach | Use Case | Pros | Cons |
|----------|----------|------|------|
| Single Propagator | Greenfield projects | Simple, minimal overhead | Limited compatibility |
| Composite Propagator | Migration scenarios | Backward compatible | Slightly more overhead |
| Priority Propagator | Mixed environments | Control over precedence | Complex configuration |

Here is a composite propagator implementation:

```typescript
// composite-propagator.ts
// Combines multiple propagators with priority handling

import {
  Context,
  TextMapGetter,
  TextMapSetter,
  TextMapPropagator,
  trace,
} from '@opentelemetry/api';

interface PropagatorConfig {
  propagator: TextMapPropagator;
  priority: number; // Higher number = higher priority for extraction
  enabled: boolean;
}

export class PriorityCompositePropagator implements TextMapPropagator {
  private readonly propagators: PropagatorConfig[];

  constructor(propagators: PropagatorConfig[]) {
    // Sort by priority for extraction (highest first)
    this.propagators = [...propagators].sort((a, b) => b.priority - a.priority);
  }

  inject(
    context: Context,
    carrier: unknown,
    setter: TextMapSetter
  ): void {
    // Inject using all enabled propagators
    // This ensures downstream services using any supported format can read the context
    for (const config of this.propagators) {
      if (config.enabled) {
        try {
          config.propagator.inject(context, carrier, setter);
        } catch (error) {
          // Log error but continue with other propagators
          console.warn(`Propagator injection failed: ${error}`);
        }
      }
    }
  }

  extract(
    context: Context,
    carrier: unknown,
    getter: TextMapGetter
  ): Context {
    // Try propagators in priority order
    // First successful extraction wins
    for (const config of this.propagators) {
      if (!config.enabled) {
        continue;
      }

      try {
        const extractedContext = config.propagator.extract(context, carrier, getter);

        // Check if extraction was successful by comparing span contexts
        const originalSpan = trace.getSpan(context);
        const extractedSpan = trace.getSpan(extractedContext);

        // If we got a new valid span, use this extraction
        if (extractedSpan && extractedSpan !== originalSpan) {
          const spanContext = extractedSpan.spanContext();
          if (spanContext.traceId !== '00000000000000000000000000000000') {
            return extractedContext;
          }
        }
      } catch (error) {
        // Log error but continue with other propagators
        console.warn(`Propagator extraction failed: ${error}`);
      }
    }

    // No successful extraction, return original context
    return context;
  }

  fields(): string[] {
    // Combine fields from all propagators
    const allFields = new Set<string>();

    for (const config of this.propagators) {
      if (config.enabled) {
        for (const field of config.propagator.fields()) {
          allFields.add(field);
        }
      }
    }

    return Array.from(allFields);
  }
}
```

Using the composite propagator:

```typescript
// usage-example.ts
// Setting up a composite propagator with multiple formats

import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { B3Propagator } from '@opentelemetry/propagator-b3';
import { CustomTracePropagator } from './custom-trace-propagator';
import { PriorityCompositePropagator } from './composite-propagator';
import { propagation } from '@opentelemetry/api';

// Create the composite propagator with priority settings
const compositePropagator = new PriorityCompositePropagator([
  {
    propagator: new W3CTraceContextPropagator(),
    priority: 100, // Highest priority - prefer W3C format
    enabled: true,
  },
  {
    propagator: new B3Propagator(),
    priority: 50, // Medium priority - B3 for Zipkin compatibility
    enabled: true,
  },
  {
    propagator: new CustomTracePropagator(),
    priority: 10, // Lowest priority - legacy format as fallback
    enabled: true,
  },
]);

// Register the composite propagator globally
propagation.setGlobalPropagator(compositePropagator);
```

## Integrating with Legacy Trace Systems

When integrating with legacy trace systems, you often need to translate between different ID formats. Here is a propagator that handles a legacy system using 64-bit trace IDs:

```typescript
// legacy-integration-propagator.ts
// Bridges between OpenTelemetry 128-bit and legacy 64-bit trace IDs

import {
  Context,
  TextMapGetter,
  TextMapSetter,
  TextMapPropagator,
  SpanContext,
  TraceFlags,
  trace,
  isSpanContextValid,
} from '@opentelemetry/api';

const LEGACY_TRACE_HEADER = 'x-legacy-trace';
const LEGACY_SPAN_HEADER = 'x-legacy-span';
const LEGACY_SAMPLED_HEADER = 'x-legacy-sampled';

export class LegacyIntegrationPropagator implements TextMapPropagator {

  inject(
    context: Context,
    carrier: unknown,
    setter: TextMapSetter
  ): void {
    const span = trace.getSpan(context);
    if (!span) {
      return;
    }

    const spanContext = span.spanContext();

    if (!isSpanContextValid(spanContext)) {
      return;
    }

    // Convert 128-bit trace ID to 64-bit by taking the lower 64 bits
    // This maintains compatibility with legacy systems while preserving uniqueness
    const legacyTraceId = this.convert128To64BitId(spanContext.traceId);

    setter.set(carrier, LEGACY_TRACE_HEADER, legacyTraceId);
    setter.set(carrier, LEGACY_SPAN_HEADER, spanContext.spanId);

    const sampled = (spanContext.traceFlags & TraceFlags.SAMPLED) === TraceFlags.SAMPLED;
    setter.set(carrier, LEGACY_SAMPLED_HEADER, sampled ? '1' : '0');
  }

  extract(
    context: Context,
    carrier: unknown,
    getter: TextMapGetter
  ): Context {
    const legacyTraceId = this.getHeaderValue(getter, carrier, LEGACY_TRACE_HEADER);
    const spanId = this.getHeaderValue(getter, carrier, LEGACY_SPAN_HEADER);
    const sampled = this.getHeaderValue(getter, carrier, LEGACY_SAMPLED_HEADER);

    if (!legacyTraceId || !spanId) {
      return context;
    }

    // Validate legacy trace ID (64-bit = 16 hex chars)
    if (!/^[0-9a-f]{16}$/.test(legacyTraceId)) {
      return context;
    }

    // Validate span ID
    if (!/^[0-9a-f]{16}$/.test(spanId)) {
      return context;
    }

    // Convert 64-bit trace ID to 128-bit by padding with zeros
    const fullTraceId = this.convert64To128BitId(legacyTraceId);

    const spanContext: SpanContext = {
      traceId: fullTraceId,
      spanId,
      traceFlags: sampled === '1' ? TraceFlags.SAMPLED : TraceFlags.NONE,
      isRemote: true,
    };

    return trace.setSpanContext(context, spanContext);
  }

  // Convert 128-bit trace ID to 64-bit (take lower 64 bits)
  private convert128To64BitId(traceId: string): string {
    // Take the last 16 characters (lower 64 bits)
    return traceId.slice(-16);
  }

  // Convert 64-bit trace ID to 128-bit (pad with zeros)
  private convert64To128BitId(legacyId: string): string {
    // Pad with zeros on the left to make 32 characters
    return '0'.repeat(16) + legacyId;
  }

  private getHeaderValue(
    getter: TextMapGetter,
    carrier: unknown,
    header: string
  ): string | undefined {
    const value = getter.get(carrier, header);
    if (!value) {
      return undefined;
    }
    return Array.isArray(value) ? value[0] : value;
  }

  fields(): string[] {
    return [LEGACY_TRACE_HEADER, LEGACY_SPAN_HEADER, LEGACY_SAMPLED_HEADER];
  }
}
```

## Testing Custom Propagators

Testing is critical for propagators since bugs can break distributed tracing across your entire system. Here is a comprehensive test suite:

```typescript
// custom-trace-propagator.test.ts
// Unit tests for the custom propagator

import { CustomTracePropagator } from './custom-trace-propagator';
import {
  Context,
  ROOT_CONTEXT,
  SpanContext,
  TraceFlags,
  trace,
} from '@opentelemetry/api';

describe('CustomTracePropagator', () => {
  let propagator: CustomTracePropagator;
  let carrier: Record<string, string>;

  // Simple getter and setter implementations for testing
  const getter = {
    get(carrier: Record<string, string>, key: string): string | undefined {
      return carrier[key.toLowerCase()];
    },
    keys(carrier: Record<string, string>): string[] {
      return Object.keys(carrier);
    },
  };

  const setter = {
    set(carrier: Record<string, string>, key: string, value: string): void {
      carrier[key.toLowerCase()] = value;
    },
  };

  beforeEach(() => {
    propagator = new CustomTracePropagator();
    carrier = {};
  });

  describe('inject', () => {
    it('should inject valid span context into carrier', () => {
      const spanContext: SpanContext = {
        traceId: '0af7651916cd43dd8448eb211c80319c',
        spanId: 'b7ad6b7169203331',
        traceFlags: TraceFlags.SAMPLED,
        isRemote: false,
      };

      const context = trace.setSpanContext(ROOT_CONTEXT, spanContext);
      propagator.inject(context, carrier, setter);

      expect(carrier['x-custom-trace']).toBe(
        '0af7651916cd43dd8448eb211c80319c:b7ad6b7169203331:1'
      );
    });

    it('should inject non-sampled flag correctly', () => {
      const spanContext: SpanContext = {
        traceId: '0af7651916cd43dd8448eb211c80319c',
        spanId: 'b7ad6b7169203331',
        traceFlags: TraceFlags.NONE,
        isRemote: false,
      };

      const context = trace.setSpanContext(ROOT_CONTEXT, spanContext);
      propagator.inject(context, carrier, setter);

      expect(carrier['x-custom-trace']).toBe(
        '0af7651916cd43dd8448eb211c80319c:b7ad6b7169203331:0'
      );
    });

    it('should not inject when no span in context', () => {
      propagator.inject(ROOT_CONTEXT, carrier, setter);
      expect(carrier['x-custom-trace']).toBeUndefined();
    });
  });

  describe('extract', () => {
    it('should extract valid trace header', () => {
      carrier['x-custom-trace'] = '0af7651916cd43dd8448eb211c80319c:b7ad6b7169203331:1';

      const context = propagator.extract(ROOT_CONTEXT, carrier, getter);
      const spanContext = trace.getSpanContext(context);

      expect(spanContext).toBeDefined();
      expect(spanContext?.traceId).toBe('0af7651916cd43dd8448eb211c80319c');
      expect(spanContext?.spanId).toBe('b7ad6b7169203331');
      expect(spanContext?.traceFlags).toBe(TraceFlags.SAMPLED);
      expect(spanContext?.isRemote).toBe(true);
    });

    it('should return original context for invalid trace ID', () => {
      carrier['x-custom-trace'] = 'invalid:b7ad6b7169203331:1';

      const context = propagator.extract(ROOT_CONTEXT, carrier, getter);
      const spanContext = trace.getSpanContext(context);

      expect(spanContext).toBeUndefined();
    });

    it('should return original context for missing header', () => {
      const context = propagator.extract(ROOT_CONTEXT, carrier, getter);
      const spanContext = trace.getSpanContext(context);

      expect(spanContext).toBeUndefined();
    });

    it('should handle non-sampled flag', () => {
      carrier['x-custom-trace'] = '0af7651916cd43dd8448eb211c80319c:b7ad6b7169203331:0';

      const context = propagator.extract(ROOT_CONTEXT, carrier, getter);
      const spanContext = trace.getSpanContext(context);

      expect(spanContext?.traceFlags).toBe(TraceFlags.NONE);
    });
  });

  describe('fields', () => {
    it('should return the custom header name', () => {
      expect(propagator.fields()).toEqual(['x-custom-trace']);
    });
  });

  describe('round-trip', () => {
    it('should correctly round-trip span context', () => {
      const originalSpanContext: SpanContext = {
        traceId: '0af7651916cd43dd8448eb211c80319c',
        spanId: 'b7ad6b7169203331',
        traceFlags: TraceFlags.SAMPLED,
        isRemote: false,
      };

      // Inject
      const originalContext = trace.setSpanContext(ROOT_CONTEXT, originalSpanContext);
      propagator.inject(originalContext, carrier, setter);

      // Extract
      const extractedContext = propagator.extract(ROOT_CONTEXT, carrier, getter);
      const extractedSpanContext = trace.getSpanContext(extractedContext);

      // Verify round-trip
      expect(extractedSpanContext?.traceId).toBe(originalSpanContext.traceId);
      expect(extractedSpanContext?.spanId).toBe(originalSpanContext.spanId);
      expect(extractedSpanContext?.traceFlags).toBe(originalSpanContext.traceFlags);
      expect(extractedSpanContext?.isRemote).toBe(true); // Always true for extracted
    });
  });
});
```

## Registering Custom Propagators

After building your propagator, you need to register it with the OpenTelemetry SDK:

```typescript
// register-propagator.ts
// Complete example of registering a custom propagator

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { propagation } from '@opentelemetry/api';
import { CustomTracePropagator } from './custom-trace-propagator';
import { PriorityCompositePropagator } from './composite-propagator';
import { W3CTraceContextPropagator } from '@opentelemetry/core';

// Option 1: Register a single custom propagator
propagation.setGlobalPropagator(new CustomTracePropagator());

// Option 2: Use a composite propagator for migration scenarios
const compositePropagator = new PriorityCompositePropagator([
  {
    propagator: new W3CTraceContextPropagator(),
    priority: 100,
    enabled: true,
  },
  {
    propagator: new CustomTracePropagator(),
    priority: 50,
    enabled: true,
  },
]);

propagation.setGlobalPropagator(compositePropagator);

// Initialize the SDK with the custom propagator
const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
  // Note: The SDK uses the global propagator set above
});

sdk.start();

console.log('OpenTelemetry SDK initialized with custom propagator');

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('SDK shut down successfully'))
    .catch((error) => console.error('Error shutting down SDK', error))
    .finally(() => process.exit(0));
});
```

## Python Registration Example

Here is how to register the custom propagator in Python:

```python
# register_propagator.py
# Python example of registering a custom propagator

from opentelemetry import trace, propagate
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from custom_trace_propagator import CustomTracePropagator

# Set up the tracer provider
provider = TracerProvider()
processor = BatchSpanProcessor(OTLPSpanExporter(endpoint="localhost:4317"))
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

# Option 1: Use only the custom propagator
propagate.set_global_textmap(CustomTracePropagator())

# Option 2: Use a composite propagator
composite_propagator = CompositePropagator([
    TraceContextTextMapPropagator(),  # W3C format (priority)
    CustomTracePropagator(),           # Custom format (fallback)
])

propagate.set_global_textmap(composite_propagator)

# Now use the tracer
tracer = trace.get_tracer(__name__)

with tracer.start_as_current_span("example-span") as span:
    # Your application code here
    print(f"Trace ID: {span.get_span_context().trace_id:032x}")
```

## Best Practices and Common Pitfalls

When building custom propagators, keep these guidelines in mind:

### Validation

Always validate extracted values before using them. Invalid trace IDs or span IDs can cause unexpected behavior downstream.

```typescript
// Always validate ID formats before creating span context
function isValidTraceId(traceId: string): boolean {
  return /^[0-9a-f]{32}$/.test(traceId) &&
         traceId !== '00000000000000000000000000000000';
}

function isValidSpanId(spanId: string): boolean {
  return /^[0-9a-f]{16}$/.test(spanId) &&
         spanId !== '0000000000000000';
}
```

### Error Handling

Never throw exceptions from propagator methods. Return the original context on any error.

```typescript
extract(context: Context, carrier: unknown, getter: TextMapGetter): Context {
  try {
    // Extraction logic
  } catch (error) {
    // Log the error for debugging but don't throw
    console.warn('Propagator extraction error:', error);
    return context; // Return original context
  }
}
```

### Header Case Sensitivity

HTTP headers are case-insensitive. Always normalize header names when comparing or storing.

```typescript
// Good: Case-insensitive header access
const value = getter.get(carrier, headerName.toLowerCase());

// Bad: Assuming specific case
const value = getter.get(carrier, 'X-Custom-Trace'); // May not match x-custom-trace
```

### Thread Safety

Propagators should be stateless and thread-safe. Avoid storing mutable state in instance variables.

```typescript
// Good: Stateless propagator
class GoodPropagator implements TextMapPropagator {
  private readonly headerName = 'x-trace'; // Immutable
  // ...
}

// Bad: Mutable state
class BadPropagator implements TextMapPropagator {
  private lastTraceId: string; // Dangerous in concurrent environments
  // ...
}
```

## Debugging Propagation Issues

When traces are not connecting across services, use these debugging techniques:

```typescript
// debug-propagator.ts
// Wrapper that logs all propagation activity

import {
  Context,
  TextMapGetter,
  TextMapSetter,
  TextMapPropagator,
  trace,
} from '@opentelemetry/api';

export class DebugPropagator implements TextMapPropagator {
  constructor(private readonly wrapped: TextMapPropagator) {}

  inject(context: Context, carrier: unknown, setter: TextMapSetter): void {
    const span = trace.getSpan(context);
    console.log('[Propagator:Inject] Span context:', span?.spanContext());

    // Log headers before injection
    console.log('[Propagator:Inject] Carrier before:', JSON.stringify(carrier));

    this.wrapped.inject(context, carrier, setter);

    // Log headers after injection
    console.log('[Propagator:Inject] Carrier after:', JSON.stringify(carrier));
  }

  extract(context: Context, carrier: unknown, getter: TextMapGetter): Context {
    console.log('[Propagator:Extract] Carrier:', JSON.stringify(carrier));

    // Log which headers we're looking for
    for (const field of this.wrapped.fields()) {
      const value = getter.get(carrier, field);
      console.log(`[Propagator:Extract] Header "${field}":`, value);
    }

    const extractedContext = this.wrapped.extract(context, carrier, getter);

    const extractedSpan = trace.getSpan(extractedContext);
    console.log('[Propagator:Extract] Extracted span context:', extractedSpan?.spanContext());

    return extractedContext;
  }

  fields(): string[] {
    return this.wrapped.fields();
  }
}

// Usage: Wrap your propagator during debugging
// propagation.setGlobalPropagator(new DebugPropagator(new CustomTracePropagator()));
```

## Summary

Custom context propagators give you full control over how trace context travels between services. The key points to remember:

1. Implement the `TextMapPropagator` interface with `inject`, `extract`, and `fields` methods
2. Always validate extracted trace and span IDs before creating span contexts
3. Use composite propagators when migrating between tracing formats
4. Handle legacy 64-bit trace IDs by padding or truncating appropriately
5. Write comprehensive tests including round-trip scenarios
6. Use debug wrappers to troubleshoot propagation issues

With these techniques, you can integrate OpenTelemetry with any tracing system, no matter how unusual the header format.
