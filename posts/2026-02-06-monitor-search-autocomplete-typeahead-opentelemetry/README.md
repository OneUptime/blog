# How to Monitor E-Commerce Search Autocomplete and Typeahead Performance with OpenTelemetry Histograms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Search Performance, Autocomplete, Histograms

Description: Monitor e-commerce search autocomplete and typeahead performance using OpenTelemetry histograms to ensure fast and relevant suggestions.

Autocomplete is one of the most latency-sensitive features in e-commerce. Users expect suggestions to appear within 100-200 milliseconds of typing. Anything slower feels broken. Anything irrelevant feels useless. The challenge is that behind a simple dropdown, you have query parsing, typo correction, product catalog search, popularity ranking, and personalization all running against the clock. OpenTelemetry histograms are the right tool for measuring this because you need to understand the distribution of response times, not just averages.

## Why Histograms Instead of Averages

An average autocomplete latency of 120ms sounds fine. But if your p99 is 800ms, one in a hundred keystrokes results in a terrible experience, and power users who type fast will hit that regularly. Histograms capture the full distribution so you can set meaningful SLOs on percentiles.

## Backend Instrumentation

Let's instrument the autocomplete service that handles typeahead requests.

```python
from opentelemetry import trace, metrics
import time

tracer = trace.get_tracer("search.autocomplete")
meter = metrics.get_meter("search.autocomplete")

# Core latency histogram with buckets tuned for autocomplete
autocomplete_latency = meter.create_histogram(
    "search.autocomplete.latency",
    unit="ms",
    description="End-to-end autocomplete response time",
    advice={
        "explicit_bucket_boundaries": [10, 25, 50, 75, 100, 150, 200, 300, 500, 1000]
    }
)

# Histogram for result count (are we returning enough suggestions?)
autocomplete_result_count = meter.create_histogram(
    "search.autocomplete.result_count",
    description="Number of suggestions returned"
)

# Per-stage latency breakdown
stage_latency = meter.create_histogram(
    "search.autocomplete.stage_latency",
    unit="ms",
    description="Latency of individual autocomplete stages"
)

# Track which stages contribute most to slow responses
query_counter = meter.create_counter(
    "search.autocomplete.queries",
    description="Total autocomplete queries"
)

class AutocompleteService:
    def suggest(self, query: str, user_id: str = None, max_results: int = 8):
        start = time.time()

        with tracer.start_as_current_span("autocomplete.suggest") as span:
            span.set_attribute("search.query", query)
            span.set_attribute("search.query_length", len(query))
            span.set_attribute("search.max_results", max_results)

            query_counter.add(1, {
                "search.query_length_bucket": self._length_bucket(len(query))
            })

            # Stage 1: Query parsing and normalization
            parsed = self._timed_stage("parse", self._parse_query, query)

            # Stage 2: Typo correction / fuzzy matching
            corrected = self._timed_stage("typo_correct",
                                           self._typo_correction, parsed)
            if corrected != parsed:
                span.set_attribute("search.typo_corrected", True)
                span.set_attribute("search.corrected_query", corrected)

            # Stage 3: Fetch candidates from search index
            candidates = self._timed_stage("index_search",
                                            self._search_index, corrected, max_results * 3)

            # Stage 4: Apply personalization boost if user is known
            if user_id:
                candidates = self._timed_stage("personalize",
                                                self._personalize, candidates, user_id)

            # Stage 5: Rank and trim results
            results = self._timed_stage("rank",
                                         self._rank_results, candidates, max_results)

            # Record overall metrics
            total_ms = (time.time() - start) * 1000
            autocomplete_latency.record(total_ms, {
                "search.has_typo_correction": str(corrected != parsed),
                "search.personalized": str(user_id is not None)
            })

            autocomplete_result_count.record(len(results), {
                "search.query_length_bucket": self._length_bucket(len(query))
            })

            span.set_attribute("search.result_count", len(results))
            span.set_attribute("search.total_latency_ms", round(total_ms, 1))

            return results

    def _timed_stage(self, stage_name: str, func, *args):
        """Run a pipeline stage and record its duration."""
        with tracer.start_as_current_span(f"autocomplete.{stage_name}") as span:
            start = time.time()
            result = func(*args)
            duration_ms = (time.time() - start) * 1000

            stage_latency.record(duration_ms, {"stage": stage_name})
            span.set_attribute("stage.duration_ms", round(duration_ms, 2))

            return result

    def _length_bucket(self, length: int) -> str:
        if length <= 2:
            return "1-2"
        elif length <= 4:
            return "3-4"
        elif length <= 7:
            return "5-7"
        else:
            return "8+"
```

## Frontend Instrumentation

The backend latency is only part of the picture. You also need to measure the perceived latency from the user's perspective, which includes network time and rendering.

```javascript
// autocomplete-metrics.js
import { meter } from './otel-init.js';

const perceivedLatency = meter.createHistogram('search.autocomplete.perceived_latency', {
  description: 'Time from keypress to suggestions visible in the dropdown',
  unit: 'ms',
  advice: {
    explicitBucketBoundaries: [50, 100, 150, 200, 300, 500, 800, 1500]
  }
});

const keystrokeToRequest = meter.createHistogram('search.autocomplete.debounce_wait', {
  description: 'Time from keypress to API request (includes debounce)',
  unit: 'ms'
});

const suggestionClicks = meter.createCounter('search.autocomplete.suggestion_clicks', {
  description: 'Clicks on autocomplete suggestions'
});

class AutocompleteTracker {
  constructor(inputElement, dropdownElement) {
    this.input = inputElement;
    this.dropdown = dropdownElement;
    this.lastKeypressTime = null;
    this.pendingQuery = null;

    this.input.addEventListener('input', (e) => this.onInput(e));
  }

  onInput(event) {
    this.lastKeypressTime = performance.now();
    const query = event.target.value;

    // Clear the debounce timer
    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    // Debounce: wait 150ms after last keystroke
    this.debounceTimer = setTimeout(() => {
      this.fetchSuggestions(query);
    }, 150);
  }

  async fetchSuggestions(query) {
    if (query.length < 2) return;

    const requestTime = performance.now();
    const debounceWait = requestTime - this.lastKeypressTime;

    keystrokeToRequest.record(debounceWait, {
      'search.query_length': query.length.toString()
    });

    try {
      const response = await fetch(`/api/autocomplete?q=${encodeURIComponent(query)}`);
      const suggestions = await response.json();

      // Render suggestions
      this.renderSuggestions(suggestions);

      // Measure perceived latency (keypress to render complete)
      const renderComplete = performance.now();
      const totalPerceivedMs = renderComplete - this.lastKeypressTime;

      perceivedLatency.record(totalPerceivedMs, {
        'search.result_count': suggestions.length.toString(),
        'search.query_length': query.length.toString()
      });

    } catch (error) {
      // Track failed autocomplete requests
      perceivedLatency.record(performance.now() - this.lastKeypressTime, {
        'search.error': 'true',
        'search.result_count': '0'
      });
    }
  }

  renderSuggestions(suggestions) {
    // ... rendering logic ...

    // Track clicks on suggestions
    suggestions.forEach((suggestion, index) => {
      const el = this.dropdown.children[index];
      el.addEventListener('click', () => {
        suggestionClicks.add(1, {
          'suggestion.position': index.toString(),
          'suggestion.type': suggestion.type // product, category, brand
        });
      }, { once: true });
    });
  }
}
```

## Setting Up Alerts

With histograms in place, define alerts based on percentiles rather than averages:

- **Backend p95 above 150ms**: Your autocomplete is getting sluggish. Look at which stage is the bottleneck using the `stage_latency` histogram.
- **Perceived p95 above 300ms**: The user-facing experience is degraded. This includes network time, so check if the issue is backend latency or network conditions.
- **Result count p10 is 0**: More than 10% of queries are returning zero results, which means your search index coverage might have gaps.
- **Suggestion click rate dropping below 20%**: If users are not clicking suggestions, the results are probably not relevant.

The histogram bucket boundaries are deliberately tight in the 50-200ms range because that is where the user experience difference is most noticeable. A jump from 100ms to 200ms feels sluggish, while a jump from 800ms to 900ms is already terrible either way.
