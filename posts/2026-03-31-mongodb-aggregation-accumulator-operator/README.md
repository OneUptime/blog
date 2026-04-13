# What Is the MongoDB Aggregation $accumulator Operator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Accumulator, Aggregation, JavaScript, Custom

Description: The $accumulator operator in MongoDB lets you define custom accumulation logic in JavaScript for use within $group stages, handling cases where built-in operators fall short.

---

## Overview

MongoDB's aggregation pipeline includes many built-in accumulator operators like `$sum`, `$avg`, `$min`, `$max`, and `$push`. But sometimes your accumulation logic is too complex to express with these built-ins. The `$accumulator` operator lets you define a custom accumulator using JavaScript functions, giving you full control over how documents are combined within a `$group` stage.

`$accumulator` is available in MongoDB 4.4+ and requires server-side JavaScript to be enabled (the default setting; controlled by the `security.javascriptEnabled` configuration option).

## How $accumulator Works

An accumulator collects values from documents in a group and maintains a running state. `$accumulator` requires you to define:

- `init` - A function that returns the initial state for each group
- `accumulate` - A function called for each document in the group to update the state
- `accumulateArgs` - The field values passed to `accumulate`
- `merge` - A function that combines two partial states (needed for sharded clusters)
- `finalize` - An optional function that transforms the final state into the output value
- `lang` - Must be `"js"`

## Syntax

```javascript
{
  $accumulator: {
    init: <function>,
    initArgs: <array>,         // optional
    accumulate: <function>,
    accumulateArgs: <array>,   // fields to pass to accumulate
    merge: <function>,
    finalize: <function>,      // optional
    lang: "js"
  }
}
```

## Example: Weighted Average

Compute a weighted average of scores where each score has a different weight:

```javascript
db.studentScores.aggregate([
  {
    $group: {
      _id: "$studentId",
      weightedAvg: {
        $accumulator: {
          init: function() {
            return { totalWeight: 0, weightedSum: 0 };
          },
          accumulate: function(state, score, weight) {
            return {
              totalWeight: state.totalWeight + weight,
              weightedSum: state.weightedSum + (score * weight)
            };
          },
          accumulateArgs: ["$score", "$weight"],
          merge: function(state1, state2) {
            return {
              totalWeight: state1.totalWeight + state2.totalWeight,
              weightedSum: state1.weightedSum + state2.weightedSum
            };
          },
          finalize: function(state) {
            return state.totalWeight === 0
              ? 0
              : state.weightedSum / state.totalWeight;
          },
          lang: "js"
        }
      }
    }
  }
])
```

## Example: Collect Unique Values with a Limit

Collect at most 5 unique values per group (not natively possible with `$addToSet` + limit):

```javascript
db.events.aggregate([
  {
    $group: {
      _id: "$userId",
      topEvents: {
        $accumulator: {
          init: function() { return []; },
          accumulate: function(state, eventType) {
            if (state.indexOf(eventType) === -1 && state.length < 5) {
              state.push(eventType);
            }
            return state;
          },
          accumulateArgs: ["$eventType"],
          merge: function(state1, state2) {
            const combined = state1.slice();
            for (const e of state2) {
              if (combined.indexOf(e) === -1 && combined.length < 5) {
                combined.push(e);
              }
            }
            return combined;
          },
          lang: "js"
        }
      }
    }
  }
])
```

## Performance Considerations

`$accumulator` executes JavaScript in the MongoDB process, which is significantly slower than native accumulator operators. Use it only when:
- No combination of built-in operators achieves the desired logic
- The collection is not extremely large
- The aggregation is not on a critical latency path

For high-volume workloads, consider pre-processing data in your application layer instead.

## $accumulator vs. $function

`$function` is a related operator that lets you run JavaScript in any aggregation expression (not just `$group`). Use `$accumulator` for group-level accumulation and `$function` for per-document field transformations.

## Requirements

- MongoDB 4.4+
- JavaScript must be enabled on the server
- Not available in Atlas Serverless instances

## Summary

The `$accumulator` operator enables fully custom accumulation logic in MongoDB aggregation `$group` stages using JavaScript functions. It is the escape hatch for complex aggregations that cannot be expressed with built-in operators like `$sum`, `$avg`, or `$push`. Use it sparingly due to its JavaScript execution overhead.
