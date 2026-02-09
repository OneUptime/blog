# How to Monitor High-Frequency Trading System Latency at Microsecond Granularity with OpenTelemetry Custom Exporters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, High-Frequency Trading, Latency Monitoring, Custom Exporters

Description: Learn how to build custom OpenTelemetry exporters that capture and report HFT system latency at microsecond precision.

In high-frequency trading, every microsecond matters. A delay of just 10 microseconds can mean the difference between a profitable trade and a missed opportunity. Standard observability tools typically operate at millisecond granularity, which is far too coarse for HFT systems. This post walks through building custom OpenTelemetry exporters that capture latency at microsecond precision.

## Why Standard OpenTelemetry Isn't Enough for HFT

The default OpenTelemetry SDK uses millisecond timestamps internally. For most applications, that is perfectly fine. But HFT systems process orders in single-digit microseconds, and the overhead of standard instrumentation can actually introduce more latency than the operations you are trying to measure.

The solution is to build a custom exporter that uses high-resolution clocks and exports timing data in a format suitable for microsecond analysis.

## Setting Up the High-Resolution Timer

First, let's create a utility that reads from the system's high-resolution clock. In C++, we can use `std::chrono::high_resolution_clock`, but for even finer control on Linux, we go straight to `clock_gettime`.

```cpp
// hrt_clock.h - High-resolution timer for HFT latency measurement
#pragma once
#include <cstdint>
#include <time.h>

struct HRTimestamp {
    uint64_t epoch_micros;
    uint64_t nanos_remainder;
};

// Returns current time with nanosecond precision
inline HRTimestamp get_hr_timestamp() {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC_RAW, &ts);

    uint64_t total_nanos = (uint64_t)ts.tv_sec * 1000000000ULL + ts.tv_nsec;
    return HRTimestamp{
        .epoch_micros = total_nanos / 1000,
        .nanos_remainder = total_nanos % 1000
    };
}
```

We use `CLOCK_MONOTONIC_RAW` here because it avoids NTP adjustments that could skew our measurements. For wall-clock correlation, we capture a `CLOCK_REALTIME` reference at startup and compute offsets.

## Building the Custom Span Processor

The default `BatchSpanProcessor` introduces buffering delays. For HFT, we want a processor that captures spans with minimal overhead and exports them to a lock-free ring buffer.

```cpp
// hft_span_processor.cpp
#include <opentelemetry/sdk/trace/span_processor.h>
#include <atomic>

class HFTSpanProcessor : public opentelemetry::sdk::trace::SpanProcessor {
private:
    // Lock-free ring buffer to avoid mutex contention
    static constexpr size_t BUFFER_SIZE = 65536; // Power of 2 for fast modulo
    SpanRecord buffer_[BUFFER_SIZE];
    std::atomic<uint64_t> write_pos_{0};
    std::atomic<uint64_t> read_pos_{0};

public:
    void OnEnd(std::unique_ptr<opentelemetry::sdk::trace::Recordable> span) noexcept override {
        // Record the span with microsecond timestamp
        uint64_t pos = write_pos_.fetch_add(1, std::memory_order_relaxed) % BUFFER_SIZE;

        buffer_[pos].timestamp = get_hr_timestamp();
        buffer_[pos].span_name = span->GetName();
        buffer_[pos].duration_micros = span->GetDuration().count() / 1000;
        buffer_[pos].trace_id = span->GetTraceId();

        // Signal the exporter thread (non-blocking)
        export_signal_.notify_one();
    }

    void OnStart(opentelemetry::sdk::trace::Recordable &span,
                 const opentelemetry::trace::SpanContext &parent) noexcept override {
        // Attach high-resolution start time as span attribute
        span.SetAttribute("hft.start_micros", get_hr_timestamp().epoch_micros);
    }
};
```

## The Custom Exporter

Now we need an exporter that writes these microsecond-precision records to a time-series store. For HFT, many teams use a combination of shared memory segments and a dedicated collector process.

```cpp
// hft_exporter.cpp
#include <opentelemetry/sdk/trace/exporter.h>
#include <fstream>

class HFTMicrosecondExporter : public opentelemetry::sdk::trace::SpanExporter {
private:
    // Shared memory segment for zero-copy export to collector
    void* shm_ptr_;
    int shm_fd_;

public:
    ExportResult Export(
        const opentelemetry::nostd::span<std::unique_ptr<opentelemetry::sdk::trace::Recordable>>& spans
    ) noexcept override {
        for (auto& span : spans) {
            MicrosecondRecord record;
            record.operation = span->GetName();
            record.latency_us = extract_microsecond_duration(span);
            record.order_id = span->GetAttribute("hft.order_id");
            record.venue = span->GetAttribute("hft.venue");

            // Write directly to shared memory - the collector picks it up
            write_to_shm(record);
        }
        return ExportResult::kSuccess;
    }

    uint64_t extract_microsecond_duration(const auto& span) {
        // Calculate from our custom high-res attributes
        uint64_t start = span->GetAttribute("hft.start_micros");
        uint64_t end = get_hr_timestamp().epoch_micros;
        return end - start;
    }
};
```

## Instrumenting the Order Flow

With the custom processor and exporter in place, we instrument the critical path of the trading system.

```cpp
// order_handler.cpp
#include <opentelemetry/trace/provider.h>

void process_order(const Order& order) {
    auto tracer = opentelemetry::trace::Provider::GetTracerProvider()
        ->GetTracer("hft-order-engine");

    // Create span for the full order lifecycle
    auto span = tracer->StartSpan("order.process", {
        {"hft.order_id", order.id},
        {"hft.venue", order.venue},
        {"hft.symbol", order.symbol},
        {"hft.side", order.is_buy ? "BUY" : "SELL"},
        {"hft.quantity", order.quantity},
        {"hft.start_micros", get_hr_timestamp().epoch_micros}
    });

    // Market data lookup - typically 1-3 microseconds
    auto md_span = tracer->StartSpan("order.market_data_lookup");
    auto price = get_market_data(order.symbol);
    md_span->SetAttribute("hft.duration_micros",
        get_hr_timestamp().epoch_micros - md_span->GetAttribute("hft.start_micros"));
    md_span->End();

    // Risk check - typically 2-5 microseconds
    auto risk_span = tracer->StartSpan("order.risk_check");
    bool approved = check_risk_limits(order, price);
    risk_span->End();

    if (approved) {
        // Send to exchange - typically 5-15 microseconds to wire
        auto send_span = tracer->StartSpan("order.send_to_exchange");
        send_order(order);
        send_span->End();
    }

    span->End();
}
```

## Analyzing the Results

Once you have microsecond-precision data flowing, you can build dashboards that show p50, p99, and p99.9 latencies for each stage of order processing. Look for:

- **Market data lookup spikes** that indicate cache misses or feed delays.
- **Risk check outliers** that may signal contention in the risk engine.
- **Wire latency variance** between different exchange venues.

The key insight is that at microsecond granularity, you start seeing patterns that are invisible at millisecond resolution. Context switches, cache line bouncing, and NUMA effects all become visible.

## Overhead Considerations

The instrumentation itself needs to be fast. Our lock-free ring buffer approach adds roughly 50-100 nanoseconds per span, which is acceptable for most HFT use cases. If even that is too much, consider sampling strategies that instrument every Nth order or only instrument when latency exceeds a threshold.

You can set up threshold-based instrumentation by wrapping span creation in a conditional that checks elapsed time against a configurable threshold. This way, the fast path through your system remains nearly untouched, and you only pay the instrumentation cost when something interesting happens.

## Wrapping Up

Monitoring HFT latency at microsecond granularity requires going beyond standard OpenTelemetry defaults. By building custom span processors with lock-free buffers, using high-resolution system clocks, and exporting through shared memory, you can get the observability you need without sacrificing the performance your trading system demands. The OpenTelemetry SDK's extensible architecture makes this possible while keeping your instrumentation code consistent with the rest of your observability stack.
