# How to Implement Scatter-Gather with Dapr Service Invocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Scatter-Gather, Service Invocation, Pattern, Aggregation

Description: Learn how to implement the scatter-gather pattern with Dapr service invocation to fan out requests to multiple services and aggregate their responses.

---

## Overview

The scatter-gather pattern sends the same request to multiple services (scatter), waits for their responses, and combines them (gather). Common use cases include price comparison, search result aggregation, and product catalog federation. Dapr service invocation makes it straightforward to implement this pattern.

## Basic Scatter-Gather

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "sync"
    dapr "github.com/dapr/go-sdk/client"
)

type PriceQuote struct {
    Vendor   string  `json:"vendor"`
    Price    float64 `json:"price"`
    Currency string  `json:"currency"`
    Delivery int     `json:"deliveryDays"`
}

type ProductSearch struct {
    ProductID string `json:"productId"`
    Quantity  int    `json:"quantity"`
}

func scatterGatherPrices(ctx context.Context, client dapr.Client, search ProductSearch) ([]PriceQuote, error) {
    vendors := []string{"vendor-a", "vendor-b", "vendor-c", "vendor-d"}

    type result struct {
        quote PriceQuote
        err   error
    }

    results := make(chan result, len(vendors))
    var wg sync.WaitGroup

    // Scatter: invoke all vendors in parallel
    for _, vendor := range vendors {
        wg.Add(1)
        go func(vendorID string) {
            defer wg.Done()

            data, err := client.InvokeMethodWithContent(
                ctx,
                vendorID,
                "/quote",
                "POST",
                &dapr.DataContent{
                    ContentType: "application/json",
                    Data:        marshalSearch(search),
                },
            )

            if err != nil {
                results <- result{err: fmt.Errorf("vendor %s: %w", vendorID, err)}
                return
            }

            var quote PriceQuote
            json.Unmarshal(data, &quote)
            quote.Vendor = vendorID
            results <- result{quote: quote}
        }(vendor)
    }

    // Close results channel when all goroutines finish
    go func() {
        wg.Wait()
        close(results)
    }()

    // Gather: collect all responses
    var quotes []PriceQuote
    for r := range results {
        if r.err != nil {
            fmt.Printf("Warning: %v\n", r.err)
            continue
        }
        quotes = append(quotes, r.quote)
    }

    return quotes, nil
}

func marshalSearch(s ProductSearch) []byte {
    data, _ := json.Marshal(s)
    return data
}
```

## Scatter-Gather with Timeout

```go
func scatterGatherWithTimeout(
    ctx context.Context,
    client dapr.Client,
    search ProductSearch,
    timeout time.Duration,
) []PriceQuote {
    ctx, cancel := context.WithTimeout(ctx, timeout)
    defer cancel()

    vendors := []string{"vendor-a", "vendor-b", "vendor-c", "vendor-d"}
    quoteCh := make(chan PriceQuote, len(vendors))

    for _, vendor := range vendors {
        go func(v string) {
            data, err := client.InvokeMethod(ctx, v, "/quote", "POST")
            if err != nil {
                return // Timed out or failed - skip
            }
            var q PriceQuote
            json.Unmarshal(data, &q)
            q.Vendor = v
            select {
            case quoteCh <- q:
            case <-ctx.Done():
            }
        }(vendor)
    }

    // Wait for timeout or all vendors to respond
    <-ctx.Done()

    // Drain buffered results without closing the channel to avoid
    // a race with goroutines that may still be sending
    var quotes []PriceQuote
    for {
        select {
        case q := <-quoteCh:
            quotes = append(quotes, q)
        default:
            return quotes
        }
    }
}
```

## Aggregation Logic

```go
type AggregatedResult struct {
    BestPrice   PriceQuote   `json:"bestPrice"`
    AllQuotes   []PriceQuote `json:"allQuotes"`
    AveragePrice float64     `json:"averagePrice"`
    RespondedVendors int     `json:"respondedVendors"`
}

func aggregate(quotes []PriceQuote) AggregatedResult {
    if len(quotes) == 0 {
        return AggregatedResult{}
    }

    best := quotes[0]
    var total float64
    for _, q := range quotes {
        total += q.Price
        if q.Price < best.Price {
            best = q
        }
    }

    return AggregatedResult{
        BestPrice:        best,
        AllQuotes:        quotes,
        AveragePrice:     total / float64(len(quotes)),
        RespondedVendors: len(quotes),
    }
}
```

## HTTP Handler

```go
func handlePriceSearch(w http.ResponseWriter, r *http.Request) {
    var search ProductSearch
    json.NewDecoder(r.Body).Decode(&search)

    quotes := scatterGatherWithTimeout(
        r.Context(),
        daprClient,
        search,
        2*time.Second,  // Gather responses within 2 seconds
    )

    result := aggregate(quotes)
    json.NewEncoder(w).Encode(result)
}
```

## Summary

Dapr service invocation enables the scatter-gather pattern by providing reliable, authenticated calls to multiple backend services. Concurrent goroutines scatter the request to all vendors simultaneously, and a gathering step collects and aggregates responses within a configurable timeout. This pattern enables responsive multi-source queries where partial results are acceptable when some services are slow to respond.
