# How to Implement Log Search and Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Log Search, Log Analysis, Elasticsearch, Query Optimization, Full-Text Search, Analytics, Observability

Description: Learn how to implement effective log search and analysis capabilities. This guide covers search query optimization, aggregations, pattern detection, and building powerful analysis workflows for troubleshooting and insights.

---

> The value of collecting logs comes from being able to search and analyze them effectively. A mountain of logs is useless if you cannot find the needle in the haystack when debugging a production issue at 3 AM.

Good log search goes beyond simple text matching. It enables filtering by structured fields, aggregating metrics over time, detecting patterns, and correlating events across services.

---

## Search Query Fundamentals

Build effective queries for different use cases:

```typescript
// search/query-builder.ts
// Log search query builder

interface LogQuery {
  // Time range (required for performance)
  timeRange: {
    start: Date;
    end: Date;
  };

  // Full-text search
  text?: string;

  // Structured filters
  filters?: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'regex';
    value: unknown;
  }[];

  // Aggregations
  aggregations?: AggregationConfig[];

  // Sorting
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };

  // Pagination
  limit?: number;
  offset?: number;
}

class LogQueryBuilder {
  private query: LogQuery;

  constructor(start: Date, end: Date) {
    this.query = {
      timeRange: { start, end },
      filters: [],
      aggregations: []
    };
  }

  // Full-text search across message field
  search(text: string): this {
    this.query.text = text;
    return this;
  }

  // Filter by field value
  where(field: string, operator: string, value: unknown): this {
    this.query.filters!.push({ field, operator: operator as any, value });
    return this;
  }

  // Convenience methods for common filters
  service(name: string): this {
    return this.where('service', 'eq', name);
  }

  level(levels: string | string[]): this {
    const lvls = Array.isArray(levels) ? levels : [levels];
    return this.where('level', 'in', lvls);
  }

  traceId(id: string): this {
    return this.where('trace_id', 'eq', id);
  }

  // Add aggregation
  aggregate(config: AggregationConfig): this {
    this.query.aggregations!.push(config);
    return this;
  }

  // Count by field
  countBy(field: string): this {
    return this.aggregate({
      type: 'terms',
      field,
      name: `count_by_${field}`
    });
  }

  // Time histogram
  histogram(interval: string): this {
    return this.aggregate({
      type: 'date_histogram',
      field: '@timestamp',
      interval,
      name: 'time_histogram'
    });
  }

  // Sort results
  orderBy(field: string, order: 'asc' | 'desc' = 'desc'): this {
    this.query.sort = { field, order };
    return this;
  }

  // Limit results
  take(limit: number): this {
    this.query.limit = limit;
    return this;
  }

  skip(offset: number): this {
    this.query.offset = offset;
    return this;
  }

  build(): LogQuery {
    return this.query;
  }
}

// Usage examples
const lastHour = new Date(Date.now() - 3600000);
const now = new Date();

// Find errors in a specific service
const errorQuery = new LogQueryBuilder(lastHour, now)
  .service('payment-service')
  .level(['error', 'fatal'])
  .search('payment failed')
  .orderBy('@timestamp', 'desc')
  .take(100)
  .build();

// Aggregate errors by type
const errorStatsQuery = new LogQueryBuilder(lastHour, now)
  .level('error')
  .countBy('error.type')
  .countBy('service')
  .histogram('5m')
  .build();

// Find all logs for a trace
const traceQuery = new LogQueryBuilder(lastHour, now)
  .traceId('abc123def456')
  .orderBy('@timestamp', 'asc')
  .build();
```

---

## Elasticsearch Query Translation

Convert queries to Elasticsearch DSL:

```typescript
// search/elasticsearch-translator.ts
// Translate queries to Elasticsearch DSL

class ElasticsearchQueryTranslator {
  translate(query: LogQuery): object {
    const must: object[] = [];
    const filter: object[] = [];

    // Time range filter (always required)
    filter.push({
      range: {
        '@timestamp': {
          gte: query.timeRange.start.toISOString(),
          lte: query.timeRange.end.toISOString()
        }
      }
    });

    // Full-text search
    if (query.text) {
      must.push({
        multi_match: {
          query: query.text,
          fields: ['message', 'error.message', 'http.path'],
          type: 'phrase_prefix',
          operator: 'and'
        }
      });
    }

    // Structured filters
    for (const f of query.filters || []) {
      filter.push(this.translateFilter(f));
    }

    // Build query
    const esQuery: any = {
      query: {
        bool: {
          must: must.length > 0 ? must : undefined,
          filter
        }
      }
    };

    // Sorting
    if (query.sort) {
      esQuery.sort = [{ [query.sort.field]: query.sort.order }];
    } else {
      esQuery.sort = [{ '@timestamp': 'desc' }];
    }

    // Pagination
    if (query.limit) {
      esQuery.size = query.limit;
    }
    if (query.offset) {
      esQuery.from = query.offset;
    }

    // Aggregations
    if (query.aggregations && query.aggregations.length > 0) {
      esQuery.aggs = {};

      for (const agg of query.aggregations) {
        esQuery.aggs[agg.name] = this.translateAggregation(agg);
      }

      // Don't return documents if only aggregating
      if (!query.limit) {
        esQuery.size = 0;
      }
    }

    return esQuery;
  }

  private translateFilter(filter: LogQuery['filters'][0]): object {
    switch (filter.operator) {
      case 'eq':
        return { term: { [filter.field]: filter.value } };
      case 'ne':
        return { bool: { must_not: { term: { [filter.field]: filter.value } } } };
      case 'gt':
        return { range: { [filter.field]: { gt: filter.value } } };
      case 'gte':
        return { range: { [filter.field]: { gte: filter.value } } };
      case 'lt':
        return { range: { [filter.field]: { lt: filter.value } } };
      case 'lte':
        return { range: { [filter.field]: { lte: filter.value } } };
      case 'in':
        return { terms: { [filter.field]: filter.value } };
      case 'contains':
        return { wildcard: { [filter.field]: `*${filter.value}*` } };
      case 'regex':
        return { regexp: { [filter.field]: filter.value } };
      default:
        throw new Error(`Unknown operator: ${filter.operator}`);
    }
  }

  private translateAggregation(agg: AggregationConfig): object {
    switch (agg.type) {
      case 'terms':
        return {
          terms: {
            field: agg.field,
            size: agg.size || 10
          }
        };
      case 'date_histogram':
        return {
          date_histogram: {
            field: agg.field,
            fixed_interval: agg.interval,
            min_doc_count: 0
          }
        };
      case 'avg':
        return { avg: { field: agg.field } };
      case 'sum':
        return { sum: { field: agg.field } };
      case 'min':
        return { min: { field: agg.field } };
      case 'max':
        return { max: { field: agg.field } };
      case 'percentiles':
        return {
          percentiles: {
            field: agg.field,
            percents: agg.percentiles || [50, 90, 95, 99]
          }
        };
      default:
        throw new Error(`Unknown aggregation type: ${agg.type}`);
    }
  }
}
```

---

## Pattern Detection

Find patterns in log data:

```typescript
// analysis/pattern-detection.ts
// Log pattern detection and clustering

interface LogPattern {
  pattern: string;
  count: number;
  examples: string[];
  firstSeen: Date;
  lastSeen: Date;
}

class LogPatternDetector {
  private patterns: Map<string, LogPattern> = new Map();

  // Extract pattern from log message
  extractPattern(message: string): string {
    let pattern = message;

    // Replace common variable parts with placeholders
    const replacements = [
      // UUIDs
      { pattern: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, replacement: '<UUID>' },
      // Timestamps
      { pattern: /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/g, replacement: '<TIMESTAMP>' },
      // IP addresses
      { pattern: /\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, replacement: '<IP>' },
      // Numbers
      { pattern: /\b\d+\b/g, replacement: '<NUM>' },
      // Hex strings
      { pattern: /\b[0-9a-f]{16,}\b/gi, replacement: '<HEX>' },
      // Email addresses
      { pattern: /[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}/g, replacement: '<EMAIL>' },
      // URLs
      { pattern: /https?:\/\/[^\s]+/g, replacement: '<URL>' },
      // File paths
      { pattern: /\/[\w./-]+/g, replacement: '<PATH>' }
    ];

    for (const { pattern: regex, replacement } of replacements) {
      pattern = pattern.replace(regex, replacement);
    }

    // Normalize whitespace
    pattern = pattern.replace(/\s+/g, ' ').trim();

    return pattern;
  }

  // Record a log message and update patterns
  record(log: LogEntry): void {
    const pattern = this.extractPattern(log.message || '');
    const timestamp = new Date(log.timestamp);

    const existing = this.patterns.get(pattern);

    if (existing) {
      existing.count++;
      existing.lastSeen = timestamp;

      // Keep up to 5 examples
      if (existing.examples.length < 5) {
        existing.examples.push(log.message);
      }
    } else {
      this.patterns.set(pattern, {
        pattern,
        count: 1,
        examples: [log.message],
        firstSeen: timestamp,
        lastSeen: timestamp
      });
    }
  }

  // Get top patterns by count
  getTopPatterns(limit: number = 20): LogPattern[] {
    return [...this.patterns.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  // Find new patterns (appeared recently)
  getNewPatterns(since: Date): LogPattern[] {
    return [...this.patterns.values()]
      .filter(p => p.firstSeen >= since)
      .sort((a, b) => b.count - a.count);
  }

  // Find patterns that have increased in frequency
  getSpikingPatterns(baselineStart: Date, baselineEnd: Date, currentStart: Date, currentEnd: Date): PatternSpike[] {
    // This requires historical data - simplified implementation
    return [];
  }
}

// Usage for pattern analysis
async function analyzeLogPatterns(logs: LogEntry[]): Promise<PatternAnalysis> {
  const detector = new LogPatternDetector();

  for (const log of logs) {
    detector.record(log);
  }

  const topPatterns = detector.getTopPatterns(20);
  const newPatterns = detector.getNewPatterns(new Date(Date.now() - 3600000));

  return {
    totalLogs: logs.length,
    uniquePatterns: topPatterns.length,
    topPatterns,
    newPatterns,
    patternCoverage: topPatterns.reduce((sum, p) => sum + p.count, 0) / logs.length
  };
}
```

---

## Aggregation and Analytics

Build analytics dashboards from log data:

```typescript
// analysis/analytics.ts
// Log analytics and metrics

interface LogAnalytics {
  // Compute error rate over time
  computeErrorRate(logs: LogEntry[], intervalMinutes: number): TimeSeriesData[];

  // Compute latency percentiles
  computeLatencyPercentiles(logs: LogEntry[]): PercentileData;

  // Find top error types
  findTopErrors(logs: LogEntry[], limit: number): ErrorCount[];

  // Compute service-level stats
  computeServiceStats(logs: LogEntry[]): ServiceStats[];
}

class LogAnalyticsEngine implements LogAnalytics {
  computeErrorRate(logs: LogEntry[], intervalMinutes: number): TimeSeriesData[] {
    const buckets: Map<number, { total: number; errors: number }> = new Map();
    const intervalMs = intervalMinutes * 60 * 1000;

    for (const log of logs) {
      const timestamp = new Date(log.timestamp).getTime();
      const bucketKey = Math.floor(timestamp / intervalMs) * intervalMs;

      const bucket = buckets.get(bucketKey) || { total: 0, errors: 0 };
      bucket.total++;

      if (log.level === 'error' || log.level === 'fatal') {
        bucket.errors++;
      }

      buckets.set(bucketKey, bucket);
    }

    return [...buckets.entries()]
      .sort(([a], [b]) => a - b)
      .map(([timestamp, { total, errors }]) => ({
        timestamp: new Date(timestamp),
        value: total > 0 ? (errors / total) * 100 : 0,
        metadata: { total, errors }
      }));
  }

  computeLatencyPercentiles(logs: LogEntry[]): PercentileData {
    const latencies = logs
      .map(log => log.http?.duration_ms || log.duration_ms)
      .filter((lat): lat is number => typeof lat === 'number')
      .sort((a, b) => a - b);

    if (latencies.length === 0) {
      return { p50: 0, p90: 0, p95: 0, p99: 0, count: 0 };
    }

    const percentile = (p: number): number => {
      const index = Math.ceil((p / 100) * latencies.length) - 1;
      return latencies[Math.max(0, index)];
    };

    return {
      p50: percentile(50),
      p90: percentile(90),
      p95: percentile(95),
      p99: percentile(99),
      count: latencies.length
    };
  }

  findTopErrors(logs: LogEntry[], limit: number): ErrorCount[] {
    const errorCounts: Map<string, ErrorCount> = new Map();

    for (const log of logs) {
      if (log.level !== 'error' && log.level !== 'fatal') continue;

      const errorKey = log.error?.type || log.error?.message || log.message || 'Unknown';
      const existing = errorCounts.get(errorKey) || {
        errorType: errorKey,
        count: 0,
        services: new Set<string>(),
        lastSeen: log.timestamp,
        example: log
      };

      existing.count++;
      existing.services.add(log.service);
      if (new Date(log.timestamp) > new Date(existing.lastSeen)) {
        existing.lastSeen = log.timestamp;
        existing.example = log;
      }

      errorCounts.set(errorKey, existing);
    }

    return [...errorCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(e => ({
        ...e,
        services: [...e.services]
      }));
  }

  computeServiceStats(logs: LogEntry[]): ServiceStats[] {
    const stats: Map<string, ServiceStats> = new Map();

    for (const log of logs) {
      const service = log.service || 'unknown';
      const existing = stats.get(service) || {
        service,
        totalLogs: 0,
        errorCount: 0,
        warnCount: 0,
        latencies: [],
        statusCodes: new Map<number, number>()
      };

      existing.totalLogs++;

      if (log.level === 'error' || log.level === 'fatal') {
        existing.errorCount++;
      } else if (log.level === 'warn') {
        existing.warnCount++;
      }

      if (log.http?.duration_ms) {
        existing.latencies.push(log.http.duration_ms);
      }

      if (log.http?.status) {
        const current = existing.statusCodes.get(log.http.status) || 0;
        existing.statusCodes.set(log.http.status, current + 1);
      }

      stats.set(service, existing);
    }

    return [...stats.values()].map(s => ({
      service: s.service,
      totalLogs: s.totalLogs,
      errorCount: s.errorCount,
      errorRate: (s.errorCount / s.totalLogs) * 100,
      warnCount: s.warnCount,
      avgLatency: s.latencies.length > 0
        ? s.latencies.reduce((a, b) => a + b, 0) / s.latencies.length
        : null,
      statusCodes: Object.fromEntries(s.statusCodes)
    }));
  }
}

// Dashboard data generator
async function generateDashboardData(
  searchClient: LogSearchClient,
  timeRange: TimeRange
): Promise<DashboardData> {
  const analytics = new LogAnalyticsEngine();

  // Fetch logs for time range
  const logs = await searchClient.search({
    timeRange,
    limit: 100000
  });

  return {
    timeRange,
    totalLogs: logs.length,
    errorRate: analytics.computeErrorRate(logs, 5),
    latencyPercentiles: analytics.computeLatencyPercentiles(logs),
    topErrors: analytics.findTopErrors(logs, 10),
    serviceStats: analytics.computeServiceStats(logs),
    generatedAt: new Date()
  };
}
```

---

## Search Performance Optimization

Optimize queries for better performance:

```typescript
// search/optimization.ts
// Search performance optimization strategies

class SearchOptimizer {
  // Optimize query before execution
  optimize(query: LogQuery): LogQuery {
    const optimized = { ...query };

    // Ensure time range is bounded
    if (!optimized.timeRange.start || !optimized.timeRange.end) {
      throw new Error('Time range is required for log searches');
    }

    // Limit time range to reasonable window
    const maxRangeMs = 7 * 24 * 60 * 60 * 1000; // 7 days
    const rangeMs = optimized.timeRange.end.getTime() - optimized.timeRange.start.getTime();

    if (rangeMs > maxRangeMs) {
      console.warn(`Time range too large (${rangeMs}ms), limiting to ${maxRangeMs}ms`);
      optimized.timeRange.start = new Date(optimized.timeRange.end.getTime() - maxRangeMs);
    }

    // Add default limit if not specified
    if (!optimized.limit) {
      optimized.limit = 1000;
    }

    // Cap maximum limit
    if (optimized.limit > 10000) {
      console.warn(`Limit ${optimized.limit} too high, capping at 10000`);
      optimized.limit = 10000;
    }

    // Optimize filters order (most selective first)
    if (optimized.filters) {
      optimized.filters = this.orderFilters(optimized.filters);
    }

    return optimized;
  }

  private orderFilters(filters: LogQuery['filters']): LogQuery['filters'] {
    // Order: exact matches first, then ranges, then text searches
    const priority: Record<string, number> = {
      eq: 1,
      in: 2,
      ne: 3,
      gt: 4, gte: 4, lt: 4, lte: 4,
      contains: 5,
      regex: 6
    };

    return [...filters].sort((a, b) => {
      const aPriority = priority[a.operator] || 99;
      const bPriority = priority[b.operator] || 99;
      return aPriority - bPriority;
    });
  }

  // Suggest index optimizations based on query patterns
  analyzeQueryPatterns(queries: LogQuery[]): IndexSuggestion[] {
    const fieldUsage: Map<string, { filterCount: number; sortCount: number }> = new Map();

    for (const query of queries) {
      // Track filter fields
      for (const filter of query.filters || []) {
        const existing = fieldUsage.get(filter.field) || { filterCount: 0, sortCount: 0 };
        existing.filterCount++;
        fieldUsage.set(filter.field, existing);
      }

      // Track sort fields
      if (query.sort) {
        const existing = fieldUsage.get(query.sort.field) || { filterCount: 0, sortCount: 0 };
        existing.sortCount++;
        fieldUsage.set(query.sort.field, existing);
      }
    }

    // Suggest indices for frequently used fields
    return [...fieldUsage.entries()]
      .filter(([_, usage]) => usage.filterCount > 10 || usage.sortCount > 5)
      .map(([field, usage]) => ({
        field,
        reason: `Used in ${usage.filterCount} filters and ${usage.sortCount} sorts`,
        suggestedType: this.suggestFieldType(field)
      }));
  }

  private suggestFieldType(field: string): string {
    if (field.includes('time') || field.includes('date')) return 'date';
    if (field.includes('ip')) return 'ip';
    if (field.includes('duration') || field.includes('count')) return 'long';
    if (field.includes('message') || field.includes('description')) return 'text';
    return 'keyword';
  }
}
```

---

## Summary

Effective log search and analysis requires:

1. **Well-designed queries**: Use time bounds, appropriate filters, and pagination
2. **Query optimization**: Order filters by selectivity, limit result sizes
3. **Pattern detection**: Find common patterns to reduce noise
4. **Aggregations**: Build metrics and dashboards from log data
5. **Performance tuning**: Index frequently queried fields, optimize query patterns

The goal is to turn raw log data into actionable insights quickly. When you can search and analyze logs effectively, debugging becomes faster and understanding your system becomes easier.

---

*Want powerful log search without the infrastructure complexity? [OneUptime](https://oneuptime.com) provides fast full-text search, structured filtering, and built-in analytics for your log data, with automatic query optimization and no maintenance required.*
