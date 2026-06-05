# How to Monitor High-Frequency Trading System Latency at Microsecond Granularity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, High-Frequency Trading, Latency Monitoring, Custom Exporter

Description: Learn how to build custom OpenTelemetry exporters that capture and report HFT system latency at microsecond precision.

In high-frequency trading, every microsecond matters. A delay of just 10 microseconds can mean the difference between a profitable trade and a missed opportunity. Standard observability tools typically operate at millisecond granularity, which is far too coarse for HFT systems. This post walks through building custom OpenTelemetry exporters that capture latency at microsecond precision.

## Why Standard OpenTelemetry Isn't Enough for HFT

OpenTelemetry can represent timestamps with nanosecond precision, but typical SDK instrumentation, batching, exporting, and backend dashboards are not designed for deterministic measurement on an HFT hot path. HFT systems process orders in single-digit microseconds, and the overhead of standard instrumentation can actually introduce more latency than the operations you are trying to measure.

The solution is to build a custom exporter that uses high-resolution clocks and exports timing data in a format suitable for microsecond analysis.

## Setting Up the High-Resolution Timer

First, let's create a utility that reads from the system's high-resolution clock. In C++, we can use `std::chrono::high_resolution_clock`, but for even finer control on Linux, we go straight to `clock_gettime`.

```cpp
// hrt_clock.h - High-resolution timer for HFT latency measurement
#pragma once
#include <cstdint>
#include <time.h>

struct HRTimestamp {
    uint64_t monotonic_micros;
    uint64_t nanos_remainder;
};

// Returns current time with nanosecond precision
inline HRTimestamp get_hr_timestamp() {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC_RAW, &ts);

    uint64_t total_nanos = (uint64_t)ts.tv_sec * 1000000000ULL + ts.tv_nsec;
    return {total_nanos / 1000, total_nanos % 1000};
}
```

We use `CLOCK_MONOTONIC_RAW` here because it avoids NTP adjustments that could skew our measurements. For wall-clock correlation, we capture a `CLOCK_REALTIME` reference at startup and compute offsets.

## Building the Custom Span Processor

The default `BatchSpanProcessor` introduces buffering delays. For HFT, we want a processor that captures spans with minimal overhead and exports them to a lock-free ring buffer.

```cpp
// hft_span_processor.cpp
#include <opentelemetry/sdk/trace/span_processor.h>
#include <opentelemetry/sdk/trace/span_data.h>
#include <atomic>
#include <condition_variable>
#include <string>

class HFTSpanProcessor : public opentelemetry::sdk::trace::SpanProcessor {
private:
    // Lock-free ring buffer to avoid mutex contention
    static constexpr size_t BUFFER_SIZE = 65536; // Power of 2 for fast modulo
    SpanRecord buffer_[BUFFER_SIZE];
    std::atomic<uint64_t> write_pos_{0};
    std::atomic<uint64_t> read_pos_{0};
    std::condition_variable export_signal_;

public:
    std::unique_ptr<opentelemetry::sdk::trace::Recordable> MakeRecordable() noexcept override {
        return std::unique_ptr<opentelemetry::sdk::trace::Recordable>(
            new opentelemetry::sdk::trace::SpanData());
    }

    void OnEnd(std::unique_ptr<opentelemetry::sdk::trace::Recordable> &&span) noexcept override {
        auto* span_data = static_cast<opentelemetry::sdk::trace::SpanData*>(span.get());

        // Record the span with microsecond timestamp
        uint64_t pos = write_pos_.fetch_add(1, std::memory_order_relaxed) % BUFFER_SIZE;

        buffer_[pos].timestamp = get_hr_timestamp();
        buffer_[pos].span_name = std::string(span_data->GetName());
        buffer_[pos].duration_micros = span_data->GetDuration().count() / 1000;
        buffer_[pos].trace_id = span_data->GetTraceId();

        // Signal the exporter thread (non-blocking)
        export_signal_.notify_one();
    }

    void OnStart(opentelemetry::sdk::trace::Recordable &span,
                 const opentelemetry::trace::SpanContext &parent) noexcept override {
        // Attach high-resolution start time as span attribute
        span.SetAttribute("hft.start_micros", get_hr_timestamp().monotonic_micros);
    }

    bool ForceFlush(std::chrono::microseconds timeout = std::chrono::microseconds::max()) noexcept override {
        return true;
    }

    bool Shutdown(std::chrono::microseconds timeout = std::chrono::microseconds::max()) noexcept override {
        return true;
    }
};
```

## The Custom Exporter

Now we need an exporter that writes these microsecond-precision records to a time-series store. For HFT, many teams use a combination of shared memory segments and a dedicated collector process.

```cpp
// hft_exporter.cpp
#include <opentelemetry/sdk/trace/exporter.h>
#include <opentelemetry/sdk/trace/span_data.h>
#include <fstream>

class HFTMicrosecondExporter : public opentelemetry::sdk::trace::SpanExporter {
private:
    // Shared memory segment for zero-copy export to collector
    void* shm_ptr_;
    int shm_fd_;

public:
    std::unique_ptr<opentelemetry::sdk::trace::Recordable> MakeRecordable() noexcept override {
        return std::unique_ptr<opentelemetry::sdk::trace::Recordable>(
            new opentelemetry::sdk::trace::SpanData());
    }

    opentelemetry::sdk::common::ExportResult Export(
        const opentelemetry::nostd::span<std::unique_ptr<opentelemetry::sdk::trace::Recordable>>& spans
    ) noexcept override {
        for (auto& recordable : spans) {
            auto* span = static_cast<opentelemetry::sdk::trace::SpanData*>(recordable.get());

            MicrosecondRecord record;
            record.operation = std::string(span->GetName());
            record.latency_us = extract_microsecond_duration(span);
            record.attributes = span->GetAttributes();

            // Write directly to shared memory - the collector picks it up
            write_to_shm(record);
        }
        return opentelemetry::sdk::common::ExportResult::kSuccess;
    }

    uint64_t extract_microsecond_duration(const opentelemetry::sdk::trace::SpanData* span) {
        return span->GetDuration().count() / 1000;
    }

    bool Shutdown(std::chrono::microseconds timeout = std::chrono::microseconds::max()) noexcept override {
        return true;
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
        {"hft.start_micros", get_hr_timestamp().monotonic_micros}
    });

    // Market data lookup - typically 1-3 microseconds
    uint64_t md_start = get_hr_timestamp().monotonic_micros;
    auto md_span = tracer->StartSpan("order.market_data_lookup");
    auto price = get_market_data(order.symbol);
    md_span->SetAttribute("hft.duration_micros",
        get_hr_timestamp().monotonic_micros - md_start);
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

The instrumentation itself needs to be fast. A lock-free ring buffer approach can keep per-span overhead low, but you should benchmark the exact implementation on your production CPU, compiler, and kernel configuration before putting it on the trading hot path. If even that is too much, consider sampling strategies that instrument every Nth order or only record detailed telemetry when latency exceeds a threshold.

You can set up threshold-based instrumentation by measuring elapsed time with the high-resolution timer first, then creating a span or event only when the operation crosses a configurable threshold. This way, the fast path through your system remains nearly untouched, and you only pay the full instrumentation cost when something interesting happens.

## Wrapping Up

Monitoring HFT latency at microsecond granularity requires going beyond standard OpenTelemetry defaults. By building custom span processors with lock-free buffers, using high-resolution system clocks, and exporting through shared memory, you can get the observability you need without sacrificing the performance your trading system demands. The OpenTelemetry SDK's extensible architecture makes this possible while keeping your instrumentation code consistent with the rest of your observability stack.
