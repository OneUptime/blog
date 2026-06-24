# How to Use $accumulator for Custom Group Logic in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, $accumulator, Custom Aggregation, $group, JavaScript

Description: Learn how to use MongoDB's $accumulator operator to define custom group logic in aggregation pipelines using JavaScript init, accumulate, and finalize functions.

---

## Overview

MongoDB's built-in accumulators (`$sum`, `$avg`, `$max`, etc.) cover most grouping needs. When they do not, `$accumulator` allows you to define fully custom group logic using JavaScript functions. It is available in MongoDB 4.4+ and requires server-side JavaScript to be enabled. Note that server-side JavaScript (including `$accumulator` and `$function`) is deprecated as of MongoDB 8.0.

## $accumulator Structure

`$accumulator` requires three JavaScript functions (`init`, `accumulate`, `merge`) and supports an optional fourth (`finalize`):

```javascript
{
  $accumulator: {
    init: function() { ... },             // initialize state for each group
    accumulate: function(state, value) { ... },  // process each document
    accumulateArgs: ["$field"],           // fields passed to accumulate
    merge: function(state1, state2) { ... },  // merge states from shards
    finalize: function(state) { ... },    // optional: compute final result
    lang: "js"
  }
}
```

## Basic Example: Weighted Average

The built-in `$avg` does not support weights. Use `$accumulator` for a weighted average:

```javascript
db.products.aggregate([
  {
    $group: {
      _id: "$category",
      weightedAvgPrice: {
        $accumulator: {
          init: function() {
            return { totalWeightedValue: 0, totalWeight: 0 };
          },
          accumulate: function(state, price, weight) {
            return {
              totalWeightedValue: state.totalWeightedValue + (price * weight),
              totalWeight: state.totalWeight + weight
            };
          },
          accumulateArgs: ["$price", "$unitsInStock"],
          merge: function(state1, state2) {
            return {
              totalWeightedValue: state1.totalWeightedValue + state2.totalWeightedValue,
              totalWeight: state1.totalWeight + state2.totalWeight
            };
          },
          finalize: function(state) {
            if (state.totalWeight === 0) return 0;
            return state.totalWeightedValue / state.totalWeight;
          },
          lang: "js"
        }
      }
    }
  }
]);
```

## Example: Mode (Most Frequent Value)

Find the most common value in a group:

```javascript
db.orders.aggregate([
  {
    $group: {
      _id: "$customerId",
      mostCommonStatus: {
        $accumulator: {
          init: function() { return {}; },
          accumulate: function(state, status) {
            state[status] = (state[status] || 0) + 1;
            return state;
          },
          accumulateArgs: ["$status"],
          merge: function(s1, s2) {
            const merged = Object.assign({}, s1);
            Object.keys(s2).forEach(k => {
              merged[k] = (merged[k] || 0) + s2[k];
            });
            return merged;
          },
          finalize: function(state) {
            return Object.keys(state).reduce((a, b) =>
              state[a] > state[b] ? a : b
            );
          },
          lang: "js"
        }
      }
    }
  }
]);
```

## Example: Collect Top 3 Values Without Sorting

```javascript
db.sales.aggregate([
  {
    $group: {
      _id: "$region",
      top3Revenue: {
        $accumulator: {
          init: function() { return []; },
          accumulate: function(state, revenue) {
            state.push(revenue);
            state.sort((a, b) => b - a);
            return state.slice(0, 3);
          },
          accumulateArgs: ["$revenue"],
          merge: function(s1, s2) {
            return s1.concat(s2).sort((a, b) => b - a).slice(0, 3);
          },
          finalize: function(state) { return state; },
          lang: "js"
        }
      }
    }
  }
]);
```

## Enabling Server-Side JavaScript

`$accumulator` requires `security.javascriptEnabled: true` in `mongod.conf`:

```yaml
security:
  javascriptEnabled: true
```

Or check current status:

```javascript
db.adminCommand({ getParameter: 1, javascriptEnabled: 1 });
```

## Performance Considerations

`$accumulator` is significantly slower than built-in accumulators because each document call crosses the JavaScript engine boundary. Use it only when built-in operators cannot express the logic:

```javascript
// Prefer built-in operators where possible
// BAD: using $accumulator for a simple sum
{ $accumulator: { init: () => 0, accumulate: (s, v) => s + v, ... } }

// GOOD: use built-in $sum
{ $sum: "$amount" }
```

## Using $function for Expression-Level Custom Logic

For simpler custom logic that does not span multiple documents, use `$function` in `$project` instead:

```javascript
db.orders.aggregate([
  {
    $project: {
      discountedTotal: {
        $function: {
          body: function(amount, tier) {
            const discount = tier === "premium" ? 0.15 : tier === "gold" ? 0.10 : 0;
            return amount * (1 - discount);
          },
          args: ["$amount", "$customerTier"],
          lang: "js"
        }
      }
    }
  }
]);
```

## Summary

`$accumulator` enables fully custom aggregation logic in MongoDB by letting you define JavaScript `init`, `accumulate`, `merge`, and `finalize` functions. It is ideal for non-standard statistical calculations like weighted averages, mode detection, or custom top-N selection within groups. Use it sparingly - built-in accumulators are always faster. Ensure `security.javascriptEnabled: true` is set on the server, and consider `$function` for document-level (not group-level) custom logic.
