# Validation Summary: How to Trace Programmatic Ad Serving and Real-Time Bidding Auction Latency

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Go API
- Go
- Real-time bidding
- Programmatic ad serving
- Distributed tracing
- Metrics

## Sources Consulted
- OpenTelemetry Go metrics API: https://pkg.go.dev/go.opentelemetry.io/otel/metric
- OpenTelemetry Go trace API: https://pkg.go.dev/go.opentelemetry.io/otel/trace
- OpenTelemetry Go getting started and manual instrumentation documentation: https://opentelemetry.io/docs/languages/go/getting-started/
- OpenTelemetry metric semantic conventions and unit guidance: https://opentelemetry.io/docs/specs/semconv/general/metrics/
- Google Authorized Buyers Real-time Bidding documentation: https://developers.google.com/authorized-buyers/rtb/get-started/start
- IAB Tech Lab OpenRTB overview: https://iabtechlab.com/standards/openrtb/

## Issues Found
- The post stated that an RTB auction needs to complete in under 100 milliseconds. Google Authorized Buyers documents response deadlines varying from 80 to 1000 ms depending on format and auction type, with the exact deadline in `BidRequest.tmax`. Changed the wording to say many RTB auctions need to complete around 100 ms and that exact deadlines vary.
- The `rtb.bid.timeouts` counter counted every DSP request error as a timeout. Renamed it to `rtb.bid.failures`, updated the variable name to `bidFailures`, and changed the description and dashboard bullet to cover failures or timeouts.
- The `rtb.auction.winning_bid` histogram used `metric.WithUnit("USD")` while recording CPM values. OpenTelemetry unit guidance expects instrument units to follow UCUM conventions, and CPM is not a plain USD amount. Renamed the metric to `rtb.auction.winning_bid_cpm` and removed the misleading unit.
- The dashboard note said p99 above 100 ms means auctions are being lost. Updated it to say auctions may be lost on exchanges with tight response deadlines.

## Review Notes
The OpenTelemetry Go APIs used in the examples, including `otel.Tracer`, `otel.Meter`, `trace.WithAttributes`, `Float64Histogram`, `Int64Counter`, `metric.WithDescription`, `metric.WithUnit`, and `metric.WithAttributes`, are current and valid. The code remains illustrative because domain types such as `BidRequest`, `BidResponse`, `AuctionResult`, `sendBidRequest`, and `sortBidsByCPM` are not defined in the post.
