# How to Instrument Apollo GraphQL Server with OpenTelemetry for Federated Graph Trace Visibility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Apollo GraphQL, Federation, Distributed Tracing

Description: Set up OpenTelemetry tracing in Apollo GraphQL Server with federation to get full visibility across your distributed graph.

Apollo Federation splits a single GraphQL schema across multiple subgraph services. The Apollo Router (or Gateway) composes the schema and routes queries to the right subgraphs. This architecture is powerful but creates a distributed tracing challenge: a single client query might fan out to three or four subgraphs, and you need to see the full picture.

OpenTelemetry gives you end-to-end trace visibility across the router and all subgraphs.

## Instrumenting the Apollo Router

The Apollo Router has built-in OpenTelemetry support. Configure it in your `router.yaml`:

```yaml
# router.yaml
telemetry:
  exporters:
    tracing:
      otlp:
        enabled: true
        endpoint: http://otel-collector:4317
        protocol: grpc
  instrumentation:
    spans:
      mode: spec_compliant
      router:
        attributes:
          # Include the full GraphQL operation in the span
          graphql.document:
            request_header: false
      supergraph:
        attributes:
          graphql.operation.name:
            operation_name: string
          graphql.operation.type:
            operation_name: string
      subgraph:
        attributes:
          subgraph.name:
            subgraph_name: true
```

This gives you spans for the router-level processing, supergraph query planning, and individual subgraph fetches.

## Instrumenting Apollo Server Subgraphs

Each subgraph runs as an Apollo Server instance. Add OpenTelemetry instrumentation:

```typescript
// subgraph-tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';

const sdk = new NodeSDK({
  serviceName: 'subgraph-users', // Name each subgraph uniquely
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector:4317',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

Then add a custom plugin to capture GraphQL-specific details:

```typescript
// graphql-tracing-plugin.ts
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('apollo-subgraph');

export const subgraphTracingPlugin = {
  async requestDidStart({ request, contextValue }: any) {
    const operationSpan = tracer.startSpan('graphql.operation', {
      attributes: {
        'graphql.operation.name': request.operationName || 'anonymous',
        'graphql.source': request.query?.substring(0, 500),
      },
    });

    return {
      async executionDidStart() {
        return {
          willResolveField({ info }: any) {
            // Only trace fields that actually do work (skip scalar fields)
            const isScalar = info.returnType.toString().startsWith('String')
              || info.returnType.toString().startsWith('Int')
              || info.returnType.toString().startsWith('Boolean');

            if (isScalar && info.parentType.name !== 'Query' && info.parentType.name !== 'Mutation') {
              return;
            }

            const fieldSpan = tracer.startSpan(
              `resolve: ${info.parentType.name}.${info.fieldName}`,
              {
                attributes: {
                  'graphql.field.name': info.fieldName,
                  'graphql.parent.type': info.parentType.name,
                  'graphql.return.type': info.returnType.toString(),
                },
              }
            );

            return (error: any) => {
              if (error) {
                fieldSpan.setStatus({ code: SpanStatusCode.ERROR });
                fieldSpan.recordException(error);
              }
              fieldSpan.end();
            };
          },
        };
      },

      async willSendResponse({ response }: any) {
        const errors = response.body?.singleResult?.errors;
        if (errors?.length > 0) {
          operationSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: `${errors.length} error(s)`,
          });
        }
        operationSpan.end();
      },
    };
  },
};
```

## Tracing Entity Resolution (the __resolveReference Pattern)

In federation, entity resolution is how subgraphs look up data by reference. This is where performance issues often hide:

```typescript
// user-subgraph-resolvers.ts
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('user-subgraph');

const resolvers = {
  User: {
    __resolveReference: async (reference: { id: string }) => {
      return tracer.startActiveSpan('federation.resolveReference', async (span) => {
        span.setAttribute('federation.entity.type', 'User');
        span.setAttribute('federation.entity.id', reference.id);

        const user = await db.users.findById(reference.id);

        if (!user) {
          span.setAttribute('federation.entity.found', false);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: 'Entity not found',
          });
        } else {
          span.setAttribute('federation.entity.found', true);
        }

        span.end();
        return user;
      });
    },
  },
};
```

## Tracking Query Plan Execution

The Router creates a query plan that describes how to split the operation across subgraphs. Record it as a span event:

```yaml
# In router.yaml, enable query plan logging in traces
telemetry:
  instrumentation:
    events:
      supergraph:
        # Log the query plan as a span event
        QUERY_PLANNING:
          message: "Query plan generated"
          on: response
          level: info
          attributes:
            query_plan:
              query_plan: true
```

## Measuring Federation Overhead

The gateway/router adds latency from query planning and response merging. Track this overhead:

```typescript
// federation-overhead-metrics.ts
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('federation-overhead');

const queryPlanDuration = meter.createHistogram('federation.query_plan.duration', {
  description: 'Time spent generating the query plan',
  unit: 'ms',
});

const subgraphFetchCount = meter.createHistogram('federation.subgraph.fetch_count', {
  description: 'Number of subgraph fetches per operation',
});

const responseMergeDuration = meter.createHistogram('federation.response_merge.duration', {
  description: 'Time spent merging subgraph responses',
  unit: 'ms',
});
```

## What Your Traces Should Look Like

A well-instrumented federated query produces a trace like this:

```
Router: POST /graphql                           [=====================================]
  Query Planning                                [===]
  Subgraph Fetch: users                         [==========]
    resolve: Query.users                          [========]
      resolve: User.__resolveReference              [===]
      resolve: User.__resolveReference              [===]
  Subgraph Fetch: orders                        [===============]
    resolve: Query.ordersByUser                   [=============]
  Response Merge                                                              [==]
```

You can see the query planning overhead at the start, parallel subgraph fetches in the middle, and response merging at the end. If subgraph fetches are sequential when they should be parallel, the trace makes that immediately obvious.

For federation, the trace waterfall is the single most valuable debugging tool. It shows you where time is spent across the distributed graph and highlights exactly which subgraph is the bottleneck.
