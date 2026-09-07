# How to Compare Colocation Bandwidth Billing Models

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Center, Bandwidth, Cost Analysis, Networking, Capacity Planning

Description: Compare 95th-percentile, committed, and unmetered bandwidth using the same traffic history, burst needs, port limits, and contract terms.

---

Bandwidth labels describe billing, not necessarily performance. A 10 Gbps port with a 500 Mbps commit, a 1 Gbps unmetered service, and a usage-billed circuit can all behave and cost differently under the same workload.

## Start with a traffic trace

Export at least one representative month of inbound and outbound interface counters. Five-minute samples are useful for quote modeling, but retain finer data if short bursts matter operationally. Include releases, backups, replication, attacks, and end-of-month jobs.

Calculate separately for each direction:

- average Mbps and transferred bytes
- P50, P95, P99, and maximum Mbps
- duration above candidate commits
- busiest-hour and busiest-day volume
- expected annual growth

Do not derive peak Mbps from monthly transferred bytes. The same byte total can be a flat stream or a few very large bursts.

## Decode 95th-percentile billing

A common method samples traffic on a fixed interval, sorts samples from highest to lowest, discards the highest 5 percent, and uses the next sample as billable demand. Contract details still matter: the provider may use the higher direction, sum directions, or calculate them separately.

Equinix documents an example with 8,640 five-minute samples in a 30-day month. It discards the highest 432 and uses the remaining highest value. Under its burst model, demand above the purchased commit creates an additional charge.

Reproduce the bidder's exact rule with your samples. This example uses zero-based indexing and rounds the discarded count down:

```text
sorted = samples ordered highest to lowest
discarded count = floor(sample count x 0.05)
billable Mbps = sorted[discarded count]
overage Mbps = max(0, billable Mbps - committed Mbps)
```

Indexing conventions differ in software, so verify the result against a provider invoice. Missing samples, partial months, and separate ingress and egress series need explicit treatment.

Short bursts totaling less than about 5 percent of sampled time may not affect the percentile, but repeated long peaks will. Never shape traffic around that observation without confirming the contract and application impact.

## Decode committed bandwidth

The committed information rate is the capacity purchased every month. Ask whether it is:

- a hard policer that drops excess traffic or a shaper that queues and delays it
- a minimum charge with burstable overage
- paired with a port whose speed is the absolute ceiling
- measured per circuit, aggregate, or billing account

For a burstable commit, model `base charge + overage quantity x overage rate`. Also determine whether overage moves the service into a pricing tier rather than multiplying one rate.

A commitment near sustained demand suits predictable traffic. A low commit on an expensive burst rate can be worse for regular peaks than buying a larger commit.

## Decode unmetered bandwidth

Unmetered usually means the provider does not bill transferred bytes or percentile overage up to a stated service rate. It does not mean unlimited capacity. Record port speed, policer, acceptable-use provisions, denial-of-service handling, congestion policy, and whether inbound and outbound rates are symmetric.

Confirm whether the circuit is dedicated or shares an oversubscribed aggregation layer. Only measured testing and an enforceable service objective can establish delivered performance.

## Model all offers on one basis

Replay the same trace through each pricing rule. Add port, IP address, cross-connect, setup, denial-of-service protection, and redundant-circuit fees:

```text
annual network cost = fixed charges
                    + modeled usage or percentile overage
                    + expected operational charges
```

Run base, growth, and incident cases. An incident case should include a traffic flood or unusually large recovery transfer, along with any protection or overage terms. Calculate cost per month, effective cost per sustained Mbps, and the highest usable burst rate.

## Validate performance separately

A billing plan does not guarantee latency, loss, routing quality, or capacity to important destinations. Require a test period and measure both directions at different times. Capture the provider's demarcation, maintenance terms, packet-loss and latency objectives, credit process, and evidence deadline.

Choose the model that fits application behavior and budget risk, then monitor it. Alert before sustained traffic reaches the commit and recalculate the model as demand changes.

## Conclusion

Compare bandwidth models by replaying real bidirectional traffic through their exact contract formulas. Treat port speed, commit, percentile overage, and unmetered service rate as separate quantities, and evaluate routing and packet delivery outside the price model.

## Official Documentation

- [Equinix Internet Access pricing and billing](https://docs.equinix.com/internet-access/eia-billing/)
- [Equinix Internet Exchange port documentation](https://docs.equinix.com/internet-exchange/)
- [ESnet iperf3 documentation](https://software.es.net/iperf/invoking.html)
- [RIPE Atlas measurements documentation](https://atlas.ripe.net/docs/apis/rest-api-reference/measurements/)
