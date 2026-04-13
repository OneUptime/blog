# How to Use $accumulator for Custom Accumulation Logic in MongoDB Aggregation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Aggregation, $accumulator, Custom Accumulators, JavaScript

Description: Learn how to define custom group accumulators using $accumulator in MongoDB aggregation for logic that built-in accumulators cannot express.

---

## Overview

`$accumulator` is a MongoDB aggregation operator that lets you define custom accumulation logic using JavaScript functions. It is used in `$group` stages when built-in accumulators like `$sum`, `$avg`, `$min`, and `$max` cannot express the required computation.

Note: `$accumulator` requires JavaScript execution to be enabled on the `mongod` process (it is enabled by default; ensure `security.javascriptEnabled` is not set to `false`). It is available in MongoDB 4.4+.

## Basic $accumulator Structure

`$accumulator` accepts three required functions and additional required and optional parameters:

```javascript
{
  $accumulator: {
    init: <function>,          // Initializes the accumulator state
    accumulate: <function>,    // Updates state for each document
    accumulateArgs: [<exprs>], // Arguments passed to accumulate
    merge: <function>,         // Merges two states (for sharded clusters)
    finalize: <function>,      // (Optional) Transforms final state to result
    lang: "js"                 // Language (must be "js")
  }
}
```

## Simple Example - Custom Sum

```javascript
db.sales.aggregate([
  {
    $group: {
      _id: "$product",
      customTotal: {
        $accumulator: {
          init: function() { return 0; },
          accumulate: function(state, amount) { return state + amount; },
          accumulateArgs: ["$amount"],
          merge: function(state1, state2) { return state1 + state2; },
          lang: "js"
        }
      }
    }
  }
])
```

## Practical Example - Median Calculation

Built-in accumulators cannot compute median. Use `$accumulator` to collect all values and compute it in `finalize`:

```javascript
db.salaries.aggregate([
  {
    $group: {
      _id: "$department",
      medianSalary: {
        $accumulator: {
          init: function() { return []; },
          accumulate: function(state, salary) {
            state.push(salary);
            return state;
          },
          accumulateArgs: ["$salary"],
          merge: function(state1, state2) {
            return state1.concat(state2);
          },
          finalize: function(state) {
            state.sort(function(a, b) { return a - b; });
            const mid = Math.floor(state.length / 2);
            if (state.length % 2 === 0) {
              return (state[mid - 1] + state[mid]) / 2;
            }
            return state[mid];
          },
          lang: "js"
        }
      }
    }
  }
])
```

## Mode Calculation (Most Frequent Value)

```javascript
db.responses.aggregate([
  {
    $group: {
      _id: "$surveyId",
      mostCommonAnswer: {
        $accumulator: {
          init: function() { return {}; },
          accumulate: function(state, answer) {
            state[answer] = (state[answer] || 0) + 1;
            return state;
          },
          accumulateArgs: ["$answer"],
          merge: function(s1, s2) {
            Object.keys(s2).forEach(function(k) {
              s1[k] = (s1[k] || 0) + s2[k];
            });
            return s1;
          },
          finalize: function(state) {
            let maxCount = 0, mode = null;
            Object.keys(state).forEach(function(k) {
              if (state[k] > maxCount) {
                maxCount = state[k];
                mode = k;
              }
            });
            return mode;
          },
          lang: "js"
        }
      }
    }
  }
])
```

## Collecting Unique Values

While `$addToSet` exists, `$accumulator` gives more control over uniqueness logic:

```javascript
db.events.aggregate([
  {
    $group: {
      _id: "$sessionId",
      uniquePages: {
        $accumulator: {
          init: function() { return { pages: [] }; },
          accumulate: function(state, page) {
            if (state.pages.indexOf(page) === -1) {
              state.pages.push(page);
            }
            return state;
          },
          accumulateArgs: ["$page"],
          merge: function(s1, s2) {
            s2.pages.forEach(function(p) {
              if (s1.pages.indexOf(p) === -1) {
                s1.pages.push(p);
              }
            });
            return s1;
          },
          finalize: function(state) {
            return state.pages;
          },
          lang: "js"
        }
      }
    }
  }
])
```

## Performance Considerations

```text
- $accumulator uses JavaScript execution which is slower than native operators
- Prefer built-in accumulators ($sum, $avg, $push, $addToSet) when possible
- $accumulator is ideal for: median, mode, custom statistical functions
- On sharded clusters, merge() must be associative and commutative
- Use initArgs to pass initialization parameters to the init function
```

## Using initArgs for Parameterized Accumulators

```javascript
db.scores.aggregate([
  {
    $group: {
      _id: "$subject",
      percentile90: {
        $accumulator: {
          init: function(percentile) { return { values: [], p: percentile }; },
          initArgs: [0.9],
          accumulate: function(state, score) {
            state.values.push(score);
            return state;
          },
          accumulateArgs: ["$score"],
          merge: function(s1, s2) {
            s1.values = s1.values.concat(s2.values);
            return s1;
          },
          finalize: function(state) {
            state.values.sort(function(a, b) { return a - b; });
            const idx = Math.ceil(state.p * state.values.length) - 1;
            return state.values[Math.max(0, idx)];
          },
          lang: "js"
        }
      }
    }
  }
])
```

## Summary

`$accumulator` enables fully custom group accumulation logic using JavaScript, making it possible to compute statistical measures like median, mode, and percentiles that built-in accumulators cannot express. The four core functions - `init`, `accumulate`, `merge`, and `finalize` - cover the full accumulation lifecycle including support for sharded clusters. Because it uses JavaScript execution, it is slower than native operators and should be used only when built-in accumulators are insufficient.
