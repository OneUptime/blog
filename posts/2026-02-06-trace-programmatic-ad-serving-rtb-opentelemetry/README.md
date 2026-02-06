# How to Trace Programmatic Ad Serving and Real-Time Bidding (RTB) Auction Latency with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Ad Tech, Real-Time Bidding, Latency

Description: Trace the full lifecycle of programmatic ad auctions and real-time bidding using OpenTelemetry distributed tracing.

Programmatic ad serving operates under brutal latency constraints. An RTB auction needs to complete in under 100 milliseconds. The ad request arrives, bid requests fan out to multiple demand-side platforms, bids come back, a winner is selected, and the creative is returned to the publisher page. If any step is slow, you lose revenue. OpenTelemetry tracing gives you the visibility to find and fix these bottlenecks.

## The RTB Auction Flow

A simplified RTB flow looks like this:

1. User loads a page with an ad slot
2. Publisher's ad server sends a bid request to the supply-side platform (SSP)
3. SSP fans out bid requests to multiple demand-side platforms (DSPs)
4. DSPs evaluate the impression and return bids
5. SSP runs the auction, picks a winner
6. Winning creative URL is returned to the page
7. Creative is rendered in the user's browser

Every millisecond in this chain matters.

## Instrumenting the SSP Auction Handler

```go
package auction

import (
    "context"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/metric"
    "go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("ssp.auction")
var meter = otel.Meter("ssp.auction")

// Define auction metrics
var (
    auctionDuration, _ = meter.Float64Histogram(
        "rtb.auction.duration",
        metric.WithDescription("Total auction duration from bid request to winner selection"),
        metric.WithUnit("ms"),
    )
    bidResponseTime, _ = meter.Float64Histogram(
        "rtb.bid.response_time",
        metric.WithDescription("Time for a DSP to respond to a bid request"),
        metric.WithUnit("ms"),
    )
    bidTimeouts, _ = meter.Int64Counter(
        "rtb.bid.timeouts",
        metric.WithDescription("Number of DSP bid requests that timed out"),
    )
    auctionRevenue, _ = meter.Float64Histogram(
        "rtb.auction.winning_bid",
        metric.WithDescription("Winning bid amount in CPM"),
        metric.WithUnit("USD"),
    )
)

func RunAuction(ctx context.Context, req *BidRequest) (*AuctionResult, error) {
    ctx, span := tracer.Start(ctx, "rtb.auction",
        trace.WithAttributes(
            attribute.String("publisher.id", req.PublisherID),
            attribute.String("ad.slot.size", req.SlotSize),
            attribute.String("ad.slot.position", req.Position),
            attribute.String("user.geo.country", req.GeoCountry),
        ),
    )
    defer span.End()

    auctionStart := time.Now()

    // Fan out bid requests to all eligible DSPs
    bidResponses := fanOutBidRequests(ctx, req)

    // Run the auction logic
    winner := selectWinner(ctx, bidResponses)

    durationMs := float64(time.Since(auctionStart).Milliseconds())
    auctionDuration.Record(ctx, durationMs, metric.WithAttributes(
        attribute.String("publisher.id", req.PublisherID),
        attribute.Bool("auction.had_winner", winner != nil),
    ))

    if winner != nil {
        span.SetAttributes(
            attribute.String("auction.winner.dsp", winner.DSPID),
            attribute.Float64("auction.winning_bid_cpm", winner.BidCPM),
        )
        auctionRevenue.Record(ctx, winner.BidCPM)
        return &AuctionResult{Winner: winner}, nil
    }

    span.SetAttributes(attribute.Bool("auction.no_fill", true))
    return &AuctionResult{NoFill: true}, nil
}
```

## Fan-Out Bid Requests with Per-DSP Tracing

The fan-out is the most latency-sensitive part. You send bid requests to multiple DSPs in parallel and wait for responses up to a timeout.

```go
func fanOutBidRequests(ctx context.Context, req *BidRequest) []*BidResponse {
    ctx, span := tracer.Start(ctx, "rtb.bid.fanout",
        trace.WithAttributes(
            attribute.Int("dsp.count", len(req.EligibleDSPs)),
        ),
    )
    defer span.End()

    type result struct {
        response *BidResponse
        dspID    string
        duration time.Duration
        err      error
    }

    results := make(chan result, len(req.EligibleDSPs))
    timeout := 80 * time.Millisecond // Strict timeout for DSP responses

    for _, dsp := range req.EligibleDSPs {
        go func(dspID string, endpoint string) {
            // Each DSP call gets its own child span
            dspCtx, dspSpan := tracer.Start(ctx, "rtb.bid.request",
                trace.WithAttributes(
                    attribute.String("dsp.id", dspID),
                    attribute.String("dsp.endpoint", endpoint),
                ),
            )

            start := time.Now()
            resp, err := sendBidRequest(dspCtx, endpoint, req, timeout)
            elapsed := time.Since(start)

            dspSpan.SetAttributes(
                attribute.Float64("dsp.response_time_ms", float64(elapsed.Milliseconds())),
            )

            if err != nil {
                dspSpan.SetAttributes(attribute.String("dsp.error", err.Error()))
            } else if resp != nil {
                dspSpan.SetAttributes(
                    attribute.Float64("dsp.bid_cpm", resp.BidCPM),
                    attribute.String("dsp.creative_id", resp.CreativeID),
                )
            }

            dspSpan.End()
            results <- result{resp, dspID, elapsed, err}
        }(dsp.ID, dsp.Endpoint)
    }

    // Collect responses
    var responses []*BidResponse
    for i := 0; i < len(req.EligibleDSPs); i++ {
        r := <-results

        // Record per-DSP metrics
        attrs := metric.WithAttributes(attribute.String("dsp.id", r.dspID))
        bidResponseTime.Record(ctx, float64(r.duration.Milliseconds()), attrs)

        if r.err != nil {
            bidTimeouts.Add(ctx, 1, attrs)
            continue
        }
        if r.response != nil && r.response.BidCPM > 0 {
            responses = append(responses, r.response)
        }
    }

    span.SetAttributes(attribute.Int("bids.received", len(responses)))
    return responses
}
```

## Winner Selection Tracing

The auction logic itself should also be traced, especially if you use second-price auction mechanics or floor price validation.

```go
func selectWinner(ctx context.Context, bids []*BidResponse) *BidResponse {
    _, span := tracer.Start(ctx, "rtb.auction.select_winner",
        trace.WithAttributes(
            attribute.Int("bids.count", len(bids)),
        ),
    )
    defer span.End()

    if len(bids) == 0 {
        return nil
    }

    // Sort bids by CPM descending
    sortBidsByCPM(bids)

    winner := bids[0]

    // Apply second-price auction: winner pays second-highest bid + $0.01
    if len(bids) > 1 {
        winner.ClearingPrice = bids[1].BidCPM + 0.01
    } else {
        winner.ClearingPrice = winner.BidCPM
    }

    span.SetAttributes(
        attribute.Float64("auction.clearing_price", winner.ClearingPrice),
        attribute.String("auction.winner.dsp", winner.DSPID),
    )

    return winner
}
```

## Key Dashboards for RTB Monitoring

With this instrumentation, build dashboards covering:

- **Auction duration distribution**: The p50, p95, and p99 of `rtb.auction.duration`. If p99 is above 100ms, you are losing auctions.
- **DSP response time per partner**: Compare how quickly each DSP responds. Slow DSPs may need tighter timeouts or exclusion from latency-sensitive auctions.
- **Timeout rate by DSP**: High timeout rates indicate a DSP endpoint that is overloaded or has network issues.
- **Fill rate**: Percentage of auctions that produce a winner. Low fill rates might mean your floor prices are too high or you need more demand partners.
- **Revenue per auction**: Track winning bid CPMs over time to spot revenue anomalies early.

## Optimization Insights from Traces

Looking at individual traces reveals patterns that aggregate metrics miss. For example, you might see that auctions for a specific ad slot size consistently take longer because one particular DSP is slow and always bids on that size. The trace fan-out view makes this obvious, since you can see each DSP's response time as a parallel span.

Setting strict timeouts based on observed p95 DSP response times, and excluding consistently slow partners from real-time auctions, can shave 20-30ms off your auction latency. That translates directly into higher fill rates and more revenue.
