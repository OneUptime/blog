# How to Configure F5 BIG-IP iRules to Inject W3C traceparent Headers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, F5 BIG-IP, IRules, Trace Context

Description: Create F5 BIG-IP iRules that inject W3C traceparent headers into HTTP requests for integrating with OpenTelemetry distributed tracing.

F5 BIG-IP load balancers often sit at the edge of your network, handling traffic before it reaches application servers. To include BIG-IP in your distributed tracing pipeline, you can use iRules to inject or propagate W3C `traceparent` headers. When combined with logged timing data, this gives you visibility into the time requests spend at the load balancer level.

## Understanding the traceparent Header

The W3C `traceparent` header format:

```text
traceparent: {version}-{trace-id}-{parent-id}-{trace-flags}
```

- **version**: Always `00` for the current spec
- **trace-id**: 32 lowercase hex characters (16 bytes), not all zeroes
- **parent-id**: 16 lowercase hex characters (8 bytes), not all zeroes
- **trace-flags**: 2 lowercase hex characters (01 = sampled)

Example: `00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`

## Basic iRule for traceparent Injection

This iRule checks if a `traceparent` header exists. If not, it generates one:

```tcl
# iRule: otel_traceparent_inject

when HTTP_REQUEST {
    set valid_traceparent 0

    # Check if a valid traceparent header already exists
    if { [HTTP::header exists "traceparent"] } {
        set existing_traceparent [HTTP::header value "traceparent"]
        set parts [split $existing_traceparent "-"]

        if { [llength $parts] == 4 } {
            set version [lindex $parts 0]
            set trace_id [lindex $parts 1]
            set parent_id [lindex $parts 2]
            set trace_flags [lindex $parts 3]

            if { $version eq "00" && [regexp {^[0-9a-f]{32}$} $trace_id] && [regexp {^[0-9a-f]{16}$} $parent_id] && [regexp {^[0-9a-f]{2}$} $trace_flags] && $trace_id ne "00000000000000000000000000000000" && $parent_id ne "0000000000000000" } {
                set valid_traceparent 1
                log local0. "Existing traceparent: $existing_traceparent"
            }
        }
    }

    if { $valid_traceparent == 0 } {
        # Generate a new trace ID (32 hex chars, not all zeroes)
        set trace_id "00000000000000000000000000000000"
        while { $trace_id eq "00000000000000000000000000000000" } {
            set trace_id ""
            for { set i 0 } { $i < 32 } { incr i } {
                append trace_id [format "%x" [expr {int(rand() * 16)}]]
            }
        }

        # Generate a new span ID (16 hex chars, not all zeroes)
        set span_id "0000000000000000"
        while { $span_id eq "0000000000000000" } {
            set span_id ""
            for { set j 0 } { $j < 16 } { incr j } {
                append span_id [format "%x" [expr {int(rand() * 16)}]]
            }
        }

        # Construct the traceparent header
        # version=00, flags=01 (sampled)
        set traceparent "00-${trace_id}-${span_id}-01"

        # Inject the header
        HTTP::header replace "traceparent" $traceparent

        log local0. "Injected traceparent: $traceparent"
    }

    # Record the time the request entered BIG-IP
    set request_start [clock clicks -milliseconds]
}

when HTTP_RESPONSE {
    # Calculate time spent in BIG-IP
    set duration [expr {[clock clicks -milliseconds] - $request_start}]

    # Add the duration as a response header for debugging
    HTTP::header insert "X-BIGIP-Duration-Ms" $duration
}
```

## Propagation iRule with a BIG-IP Span ID

This more advanced iRule creates a new span ID for the BIG-IP hop and makes that ID the `parent-id` seen by the upstream service. To create an actual BIG-IP span in your backend, also log or export a record that uses the incoming `parent-id` as its parent:

```tcl
# iRule: otel_traceparent_propagate
when HTTP_REQUEST {
    set propagated_trace 0

    if { [HTTP::header exists "traceparent"] } {
        # Parse the incoming traceparent
        set incoming [HTTP::header value "traceparent"]
        set parts [split $incoming "-"]

        if { [llength $parts] == 4 } {
            set version [lindex $parts 0]
            set trace_id [lindex $parts 1]
            set parent_span_id [lindex $parts 2]
            set trace_flags [lindex $parts 3]

            if { $version eq "00" && [regexp {^[0-9a-f]{32}$} $trace_id] && [regexp {^[0-9a-f]{16}$} $parent_span_id] && [regexp {^[0-9a-f]{2}$} $trace_flags] && $trace_id ne "00000000000000000000000000000000" && $parent_span_id ne "0000000000000000" } {
                # Generate a new span ID for the BIG-IP hop
                set bigip_span_id "0000000000000000"
                while { $bigip_span_id eq "0000000000000000" } {
                    set bigip_span_id ""
                    for { set i 0 } { $i < 16 } { incr i } {
                        append bigip_span_id [format "%x" [expr {int(rand() * 16)}]]
                    }
                }

                # Create a new traceparent with BIG-IP's span as the parent
                set new_traceparent "${version}-${trace_id}-${bigip_span_id}-${trace_flags}"

                # Replace the header for the upstream
                HTTP::header replace "traceparent" $new_traceparent

                # Store the original parent span for potential logging
                set parent_span $parent_span_id
                set span_id $bigip_span_id
                set propagated_trace 1
            }
        }
    }

    if { $propagated_trace == 0 } {
        # No valid incoming trace - generate fresh IDs
        set trace_id "00000000000000000000000000000000"
        while { $trace_id eq "00000000000000000000000000000000" } {
            set trace_id ""
            for { set i 0 } { $i < 32 } { incr i } {
                append trace_id [format "%x" [expr {int(rand() * 16)}]]
            }
        }
        set span_id "0000000000000000"
        while { $span_id eq "0000000000000000" } {
            set span_id ""
            for { set j 0 } { $j < 16 } { incr j } {
                append span_id [format "%x" [expr {int(rand() * 16)}]]
            }
        }
        HTTP::header replace "traceparent" "00-${trace_id}-${span_id}-01"
    }

    # Also forward tracestate if present
    # tracestate passes through unchanged
}
```

## Applying the iRule to a Virtual Server

Apply the iRule to your BIG-IP virtual server:

```bash
# Using tmsh
tmsh modify ltm virtual my_virtual_server rules { otel_traceparent_inject }
```

Or through the BIG-IP GUI: Local Traffic > Virtual Servers > select your VS > Resources tab > iRules section.

## Forwarding to the Collector via Syslog

Since iRules do not natively emit OTLP trace spans, you can send correlated log data to the Collector via syslog:

```tcl
# In the iRule, open an HSL handle and log structured data
when CLIENT_ACCEPTED {
    set hsl [HSL::open -proto UDP -pool syslog_pool]
}

when HTTP_REQUEST {
    # ... traceparent logic above ...
    set log_data "trace_id=$trace_id span_id=$span_id trace_flags=01 method=[HTTP::method] uri=[HTTP::uri] vs=[virtual name]"
    HSL::send $hsl "$log_data\n"
}
```

Configure a syslog pool in BIG-IP and point the Collector's syslog receiver at it:

```yaml
# Collector config
receivers:
  syslog:
    udp:
      listen_address: "0.0.0.0:514"
      one_log_per_packet: true
    protocol: none
    operators:
      - type: regex_parser
        regex: 'trace_id=(?P<trace_id>\S+) span_id=(?P<span_id>\S+) trace_flags=(?P<trace_flags>\S+) method=(?P<method>\S+) uri=(?P<uri>\S+) vs=(?P<virtual_server>\S+)'
      - type: trace_parser
        trace_id:
          parse_from: attributes.trace_id
        span_id:
          parse_from: attributes.span_id
        trace_flags:
          parse_from: attributes.trace_flags

processors:
  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    logs:
      receivers: [syslog]
      processors: [batch]
      exporters: [otlp]
```

## Sampling in iRules

For high-traffic virtual servers, sample a percentage of requests:

```tcl
when HTTP_REQUEST {
    # Sample 5% of requests
    if { rand() < 0.05 } {
        # Generate and inject traceparent (sampled flag = 01)
        # ... generation logic ...
        HTTP::header insert "traceparent" "00-${trace_id}-${span_id}-01"
    } else {
        # Not sampled (flag = 00)
        # ... generation logic ...
        HTTP::header insert "traceparent" "00-${trace_id}-${span_id}-00"
    }
}
```

## Summary

F5 BIG-IP iRules can inject and propagate W3C `traceparent` headers to integrate load balancers into your OpenTelemetry tracing pipeline. Generate trace and span IDs in the iRule, forward them to backend services, and optionally send correlated log data to the Collector via syslog. This can give you visibility into the load balancer hop, helping diagnose latency issues at the network edge.
