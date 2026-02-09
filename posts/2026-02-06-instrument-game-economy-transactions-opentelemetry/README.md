# How to Instrument In-Game Economy Transaction Systems (Currency, Marketplace, Loot Drops) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Gaming, In-Game Economy, Transactions, Observability

Description: Instrument your in-game economy system with OpenTelemetry to trace currency flows, marketplace trades, and loot drop calculations.

In-game economies are surprisingly complex financial systems. Players earn currency, buy items, trade on marketplaces, and receive loot from randomized drop tables. When something goes wrong, like duplicate items, missing currency, or broken drop rates, the consequences range from player complaints to full-blown exploits that wreck the game's economy.

OpenTelemetry lets you trace every transaction through the economy pipeline and catch problems before they spiral.

## The Economy Stack

A typical game economy involves several services:

- **Currency Service**: handles wallet balances, deposits, and withdrawals
- **Inventory Service**: manages player item ownership
- **Marketplace Service**: facilitates player-to-player trades
- **Loot Service**: calculates drop tables and generates rewards
- **Audit Log**: records every transaction for compliance and debugging

Let's instrument each one.

## Setting Up the Tracer (Node.js/TypeScript)

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { trace, SpanStatusCode } from '@opentelemetry/api';

const sdk = new NodeSDK({
    resource: new Resource({
        'service.name': 'economy-service',
        'service.version': '3.1.0',
    }),
    traceExporter: new OTLPTraceExporter({
        url: 'grpc://otel-collector.yourgame.com:4317',
    }),
});
sdk.start();

const tracer = trace.getTracer('game-economy');
```

## Tracing Currency Transactions

Every currency operation should be traced with enough detail to reconstruct what happened:

```typescript
async function transferCurrency(
    fromPlayerId: string,
    toPlayerId: string,
    amount: number,
    currencyType: string,
    reason: string
) {
    return tracer.startActiveSpan('economy.currency.transfer', async (span) => {
        span.setAttributes({
            'economy.currency_type': currencyType,
            'economy.amount': amount,
            'economy.reason': reason,
            'player.from_id': fromPlayerId,
            'player.to_id': toPlayerId,
        });

        try {
            // Withdraw from sender
            await tracer.startActiveSpan('economy.currency.withdraw', async (withdrawSpan) => {
                const balanceBefore = await getBalance(fromPlayerId, currencyType);
                withdrawSpan.setAttribute('economy.balance_before', balanceBefore);

                if (balanceBefore < amount) {
                    withdrawSpan.setStatus({
                        code: SpanStatusCode.ERROR,
                        message: 'Insufficient funds',
                    });
                    throw new Error('Insufficient funds');
                }

                await deductBalance(fromPlayerId, currencyType, amount);
                withdrawSpan.setAttribute('economy.balance_after', balanceBefore - amount);
                withdrawSpan.end();
            });

            // Deposit to receiver
            await tracer.startActiveSpan('economy.currency.deposit', async (depositSpan) => {
                const balanceBefore = await getBalance(toPlayerId, currencyType);
                await addBalance(toPlayerId, currencyType, amount);
                depositSpan.setAttribute('economy.balance_before', balanceBefore);
                depositSpan.setAttribute('economy.balance_after', balanceBefore + amount);
                depositSpan.end();
            });

            span.setStatus({ code: SpanStatusCode.OK });
        } catch (err) {
            span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message });
            span.recordException(err as Error);
            throw err;
        } finally {
            span.end();
        }
    });
}
```

## Instrumenting Loot Drop Calculations

Loot drops involve random number generation and drop table lookups. When players claim the drop rates are rigged, you need data to verify:

```typescript
async function calculateLootDrop(
    playerId: string,
    lootTableId: string,
    context: { bossId: string; difficulty: string }
) {
    return tracer.startActiveSpan('economy.loot.calculate', async (span) => {
        span.setAttributes({
            'player.id': playerId,
            'loot.table_id': lootTableId,
            'loot.boss_id': context.bossId,
            'loot.difficulty': context.difficulty,
        });

        // Load the drop table
        const dropTable = await tracer.startActiveSpan('economy.loot.load_table', async (s) => {
            const table = await lootTableStore.get(lootTableId);
            s.setAttribute('loot.table_entries', table.entries.length);
            s.end();
            return table;
        });

        // Roll the dice
        const roll = Math.random();
        span.setAttribute('loot.roll_value', parseFloat(roll.toFixed(6)));

        // Walk the drop table to determine which item dropped
        let cumulativeProbability = 0;
        let droppedItem = null;

        for (const entry of dropTable.entries) {
            cumulativeProbability += entry.probability;
            if (roll <= cumulativeProbability) {
                droppedItem = entry;
                break;
            }
        }

        if (droppedItem) {
            span.setAttributes({
                'loot.dropped_item_id': droppedItem.itemId,
                'loot.dropped_item_rarity': droppedItem.rarity,
                'loot.dropped_item_probability': droppedItem.probability,
            });

            // Grant the item to the player's inventory
            await grantItem(playerId, droppedItem.itemId, span);
        } else {
            span.setAttribute('loot.result', 'no_drop');
        }

        span.end();
        return droppedItem;
    });
}
```

## Tracing Marketplace Transactions

Marketplace trades involve multiple players and need careful coordination:

```typescript
async function executeMarketplacePurchase(
    buyerId: string,
    listingId: string
) {
    return tracer.startActiveSpan('economy.marketplace.purchase', async (span) => {
        // Fetch the listing details
        const listing = await getMarketplaceListing(listingId);
        span.setAttributes({
            'marketplace.listing_id': listingId,
            'marketplace.seller_id': listing.sellerId,
            'marketplace.buyer_id': buyerId,
            'marketplace.item_id': listing.itemId,
            'marketplace.price': listing.price,
            'marketplace.currency_type': listing.currencyType,
        });

        // Transfer currency from buyer to seller (minus platform fee)
        const platformFee = Math.floor(listing.price * 0.05);
        const sellerReceives = listing.price - platformFee;
        span.setAttribute('marketplace.platform_fee', platformFee);

        await transferCurrency(buyerId, listing.sellerId, sellerReceives, listing.currencyType, 'marketplace_sale');

        // Transfer the item from seller inventory to buyer inventory
        await tracer.startActiveSpan('economy.marketplace.transfer_item', async (itemSpan) => {
            await removeItemFromInventory(listing.sellerId, listing.itemId);
            await addItemToInventory(buyerId, listing.itemId);
            itemSpan.end();
        });

        // Mark the listing as sold
        await closeMarketplaceListing(listingId, buyerId);

        span.setStatus({ code: SpanStatusCode.OK });
        span.end();
    });
}
```

## Key Metrics to Derive from Traces

Beyond traces, you should extract metrics from your economy spans:

- **Transaction volume** per currency type per minute. Sudden spikes could indicate an exploit.
- **Average marketplace listing price** per item type. If prices crash overnight, something has flooded the economy.
- **Loot drop rarity distribution** compared to the configured probabilities. This is your sanity check that the RNG and drop tables are working correctly.
- **Failed transaction rate** broken down by error type. Insufficient funds is normal. Timeout errors or deadlocks are not.

## Protecting Sensitive Economy Data

Be careful about what attributes you record. Do not log full player balances in production traces if your observability backend is accessible to a wide team. Use attribute redaction or sampling to keep sensitive financial data under control. Record enough to debug, but not so much that it becomes a privacy or security concern.

## Conclusion

Game economies are real economies, just with virtual currency. The same rigor you would apply to monitoring a payment processing system applies here. OpenTelemetry gives you the distributed tracing foundation to follow every coin, every item, and every trade through your system. When an exploit surfaces or a player claims they lost currency, the trace is your source of truth.
